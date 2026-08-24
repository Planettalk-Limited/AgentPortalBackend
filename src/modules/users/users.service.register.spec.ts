import { UsersService } from './users.service';
import { PartnerRegistrationType } from '../auth/dto/register.dto';

/**
 * Regression guard for the "registered but never got a code" bug.
 *
 * register() used to save the user row and THEN create the agent profile as a
 * separate, unprotected call. When generateAgentCode() threw — the PTA pool was
 * capped at PTA0205 and had filled up — the user row stayed committed and no agent
 * row was ever created. Those users could log in, but /agents/me 404s, so the portal
 * showed "Unable to Load Dashboard" and no agent code ever reached them.
 * 14 real partners were orphaned this way between 2026-07-24 and 2026-08-13.
 *
 * The guarantees these tests lock in:
 *   1. a user account and its agent profile are created atomically
 *   2. losing an agent code race is retried rather than failing the signup
 */
describe('UsersService.register atomicity', () => {
  let service: UsersService;

  // Rows that survived a committed transaction.
  let persisted: any[];
  let rollbacks: number;
  // The manager handed to the transaction callback, so we can prove the agent
  // profile is created through it rather than on a separate connection.
  let managerSeenByAgentsService: any;
  let sentEmails: string[];

  let agentCreationAttempts: number;
  let userEntitiesBuilt: number;
  let failuresBeforeSuccess: number;
  let failureToThrow: any;

  // What Postgres reports when a concurrent registration took the code first.
  const codeCollision = () => ({
    code: '23505',
    detail: 'Key ("agentCode")=(PTA0219) already exists.',
    message: 'duplicate key value violates unique constraint "UQ_agents_agentCode"',
  });

  const poolExhausted = () =>
    new Error(
      'All agent codes in the range PTA0001 to PTA0205 have been assigned. Please contact system administrator.',
    );

  const registerData = {
    firstName: 'Test',
    lastName: 'Partner',
    country: 'NG',
    email: 'partner@example.com',
    password: 'Sup3rSecret!',
  };

  beforeEach(() => {
    persisted = [];
    rollbacks = 0;
    managerSeenByAgentsService = undefined;
    sentEmails = [];
    agentCreationAttempts = 0;
    userEntitiesBuilt = 0;
    failuresBeforeSuccess = 0;
    failureToThrow = new Error('unexpected failure');

    service = Object.create(UsersService.prototype);

    (service as any).usersRepository = {
      findOne: async () => null,
      create: (data: any) => {
        userEntitiesBuilt++;
        return { ...data };
      },
      save: async (entity: any) => {
        // Any save that bypasses the transaction is a bug — record it as committed
        // immediately so a non-atomic implementation fails these tests.
        const row = { ...entity, id: 'user-uuid', createdAt: new Date() };
        persisted.push(row);
        return row;
      },
    };

    (service as any).configService = {
      get: (key: string, fallback?: string) => {
        if (key === 'BCRYPT_ROUNDS') return '4'; // keep bcrypt fast in tests
        if (key === 'PARTNER_MEETING_BOOKING_URL') return 'https://book.example.com';
        return fallback;
      },
    };

    // Models a real transaction: staged writes only become visible once the
    // callback resolves. If it throws, they are discarded.
    (service as any).dataSource = {
      transaction: async (cb: (manager: any) => Promise<any>) => {
        const staged: any[] = [];
        const manager = {
          save: async (entity: any) => {
            const row = { ...entity, id: 'user-uuid', createdAt: new Date() };
            staged.push(row);
            return row;
          },
          getRepository: () => ({}),
        };

        try {
          const result = await cb(manager);
          persisted.push(...staged);
          return result;
        } catch (err) {
          rollbacks++;
          throw err;
        }
      },
    };

    (service as any).agentsService = {
      createPendingAgentWithReferralData: async (_user: any, manager?: any) => {
        agentCreationAttempts++;
        managerSeenByAgentsService = manager;

        if (agentCreationAttempts <= failuresBeforeSuccess) {
          throw failureToThrow;
        }

        return {
          agent: {
            id: 'agent-uuid',
            agentCode: 'PTA0219',
            tier: 'bronze',
            commissionRate: 10,
            status: 'pending_application',
          },
          agentCode: 'PTA0219',
          status: 'pending_verification',
        };
      },
    };

    (service as any).emailService = {
      getPartnerPortalBaseUrl: () => 'https://portal.planettalk.com/en',
      sendIndividualPartnerRegistrationAcknowledgement: async () => {
        sentEmails.push('individual-acknowledgement');
        return true;
      },
      sendBusinessPartnerRegistrationAcknowledgement: async () => {
        sentEmails.push('business-acknowledgement');
        return true;
      },
      sendBusinessApplicationAdminNotification: async () => {
        sentEmails.push('business-admin-notification');
        return true;
      },
      sendEmailVerificationOTP: async () => {
        sentEmails.push('verification-otp');
        return true;
      },
    };

    // Called by the OTP block after the account exists.
    (service as any).findById = async (id: string) => ({
      id,
      email: registerData.email,
      firstName: registerData.firstName,
      metadata: {},
    });
    (service as any).update = async () => ({});
  });

  describe('when the agent profile cannot be created', () => {
    beforeEach(() => {
      failuresBeforeSuccess = Infinity;
      failureToThrow = poolExhausted();
    });

    it('does not leave a user account behind', async () => {
      await expect(service.register(registerData)).rejects.toThrow();

      expect(persisted).toEqual([]);
      expect(rollbacks).toBe(1);
    });

    it('surfaces the failure to the caller instead of reporting success', async () => {
      await expect(service.register(registerData)).rejects.toThrow(/PTA0205/);
    });

    it('sends no acknowledgement or verification email for an account that does not exist', async () => {
      await expect(service.register(registerData)).rejects.toThrow();

      expect(sentEmails).toEqual([]);
    });

    it('does not retry a failure that is not a code collision', async () => {
      await expect(service.register(registerData)).rejects.toThrow();

      expect(agentCreationAttempts).toBe(1);
    });
  });

  describe('when a concurrent registration takes the code first', () => {
    it('retries and completes the signup', async () => {
      failuresBeforeSuccess = 1;
      failureToThrow = codeCollision();

      const result = await service.register(registerData);

      expect(agentCreationAttempts).toBe(2);
      expect(result.success).toBe(true);
      expect(result.agent.agentCode).toBe('PTA0219');
    });

    it('commits exactly one user account, not one per attempt', async () => {
      failuresBeforeSuccess = 1;
      failureToThrow = codeCollision();

      await service.register(registerData);

      expect(persisted).toHaveLength(1);
      expect(rollbacks).toBe(1);
    });

    it('builds a fresh user entity per attempt, so no stale id survives a rollback', async () => {
      failuresBeforeSuccess = 1;
      failureToThrow = codeCollision();

      await service.register(registerData);

      expect(userEntitiesBuilt).toBe(2);
    });

    it('gives up after three attempts rather than looping', async () => {
      failuresBeforeSuccess = Infinity;
      failureToThrow = codeCollision();

      await expect(service.register(registerData)).rejects.toMatchObject({ code: '23505' });

      expect(agentCreationAttempts).toBe(3);
      expect(persisted).toEqual([]);
    });

    it('does not retry a duplicate email, which is also a 23505', async () => {
      failuresBeforeSuccess = Infinity;
      failureToThrow = {
        code: '23505',
        detail: 'Key (email)=(partner@example.com) already exists.',
        message: 'duplicate key value violates unique constraint "UQ_users_email"',
      };

      await expect(service.register(registerData)).rejects.toMatchObject({ code: '23505' });

      expect(agentCreationAttempts).toBe(1);
    });
  });

  describe('when registration succeeds', () => {
    it('creates the agent profile through the same transaction as the user', async () => {
      await service.register(registerData);

      expect(managerSeenByAgentsService).toBeDefined();
      expect(typeof managerSeenByAgentsService.save).toBe('function');
    });

    it('persists the user and returns the assigned agent code', async () => {
      const result = await service.register(registerData);

      expect(persisted).toHaveLength(1);
      expect(result.success).toBe(true);
      expect(result.agent.agentCode).toBe('PTA0219');
    });

    it('still sends the acknowledgement and verification emails', async () => {
      await service.register(registerData);

      expect(sentEmails).toContain('individual-acknowledgement');
      expect(sentEmails).toContain('verification-otp');
    });
  });

  describe('business partners', () => {
    const businessData = {
      ...registerData,
      partnerType: PartnerRegistrationType.BUSINESS,
      companyName: 'Example Ltd',
    };

    it('creates no agent profile, since the code is assigned at approval', async () => {
      await service.register(businessData);

      expect(agentCreationAttempts).toBe(0);
      expect(persisted).toHaveLength(1);
    });

    it('reports the business partner path to the caller', async () => {
      const result = await service.register(businessData);

      expect(result.partnerType).toBe('business');
      expect(result.agent).toBeUndefined();
    });
  });
});
