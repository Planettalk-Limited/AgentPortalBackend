import { UsersService } from './users.service';
import { UserStatus } from './entities/user.entity';
import { UpdateBusinessPartnerApplicationDto } from './dto/update-business-partner-application.dto';

/**
 * Guards the two paths that touch a rejected business partner.
 *
 * Rejection was removed along with admin review, but accounts rejected under the
 * old flow still exist — locked out, and with no agent profile, because their
 * code was only ever minted at approval.
 *
 * The trap these tests exist for: AWAITING_PARTNER_APPROVAL is now a dead end.
 * Nothing transitions out of it, login refuses it and validateJwtPayload throws.
 * Any code path that writes it strands the account permanently.
 */
describe('UsersService — rejected business partners', () => {
  let service: UsersService;
  let stored: Record<string, any>;
  let updates: Array<{ id: string; patch: any }>;
  let agentsCreatedFor: string[];
  let activatedFor: string[];
  let welcomeEmailsTo: string[];

  const rejectedUser = (overrides: Record<string, any> = {}) => ({
    id: 'user-1',
    email: 'ade@afrofoods.co.uk',
    firstName: 'Ade',
    lastName: 'Johnson',
    status: UserStatus.REJECTED,
    emailVerifiedAt: new Date('2026-08-01T00:00:00.000Z'),
    agents: [],
    metadata: {
      partnerType: 'business',
      rejectedAt: '2026-08-02T00:00:00.000Z',
      rejectionReason: 'Did not meet criteria',
      business: { companyName: 'Afro Foods Ltd' },
    },
    ...overrides,
  });

  beforeEach(() => {
    updates = [];
    agentsCreatedFor = [];
    activatedFor = [];
    welcomeEmailsTo = [];
    stored = rejectedUser();

    service = Object.create(UsersService.prototype);

    (service as any).usersRepository = {
      save: async (entity: any) => {
        stored = { ...stored, ...entity };
        return stored;
      },
      update: async (id: string, patch: any) => {
        updates.push({ id, patch });
        stored = { ...stored, ...patch };
        return { affected: 1 };
      },
    };

    (service as any).agentsService = {
      createPendingAgentWithReferralData: async (user: any) => {
        agentsCreatedFor.push(user.id);
        const agent = { id: 'agent-1', agentCode: 'PTA0206', status: 'pending_application' };
        stored.agents = [agent];
        return { agent, agentCode: agent.agentCode };
      },
      activateAgentAfterEmailVerification: async (userId: string) => {
        activatedFor.push(userId);
        const agent = { ...(stored.agents?.[0] ?? {}), status: 'active' };
        stored.agents = [agent];
        return agent;
      },
      sendAgentWelcomeEmail: async (user: any) => {
        welcomeEmailsTo.push(user.email);
      },
    };

    (service as any).findById = async () => stored;
    (service as any).findByIdWithRelations = async () => stored;
  });

  describe('updateBusinessPartnerApplication', () => {
    const dto = { companyName: 'Afro Foods Manchester' } as UpdateBusinessPartnerApplicationDto;

    it('never writes the dead-end AWAITING_PARTNER_APPROVAL status', async () => {
      await service.updateBusinessPartnerApplication('user-1', dto);

      expect(stored.status).not.toBe(UserStatus.AWAITING_PARTNER_APPROVAL);
    });

    it('leaves status untouched — editing details is not a status change', async () => {
      await service.updateBusinessPartnerApplication('user-1', dto);

      expect(stored.status).toBe(UserStatus.REJECTED);
    });

    it('still saves the edited business details', async () => {
      await service.updateBusinessPartnerApplication('user-1', dto);

      expect(stored.metadata.business.companyName).toBe('Afro Foods Manchester');
    });
  });

  describe('restoreRejectedBusinessPartner', () => {
    it('mints the agent profile a rejected partner never received', async () => {
      const result = await service.restoreRejectedBusinessPartner('user-1');

      expect(agentsCreatedFor).toEqual(['user-1']);
      expect(result.agentCode).toBe('PTA0206');
    });

    it('activates a verified partner and emails them their code', async () => {
      const result = await service.restoreRejectedBusinessPartner('user-1');

      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(activatedFor).toEqual(['user-1']);
      expect(welcomeEmailsTo).toEqual(['ade@afrofoods.co.uk']);
    });

    it('clears the rejection so nothing downstream still reads it', async () => {
      await service.restoreRejectedBusinessPartner('user-1');

      expect(stored.metadata.rejectedAt).toBeNull();
      expect(stored.metadata.rejectionReason).toBeNull();
      expect(stored.metadata.pendingApproval).toBe(false);
    });

    it('sends an unverified partner back to PENDING, not ACTIVE', async () => {
      stored = rejectedUser({ emailVerifiedAt: null });

      const result = await service.restoreRejectedBusinessPartner('user-1');

      expect(result.status).toBe(UserStatus.PENDING);
      expect(activatedFor).toEqual([]);
      expect(welcomeEmailsTo).toEqual([]);
    });

    it('does not mint a second profile for a partner who already has one', async () => {
      stored = rejectedUser({
        agents: [{ id: 'agent-9', agentCode: 'PTA0100', status: 'inactive' }],
      });

      const result = await service.restoreRejectedBusinessPartner('user-1');

      expect(agentsCreatedFor).toEqual([]);
      expect(result.agentCode).toBe('PTA0100');
    });

    it('never leaves the partner in the dead-end status', async () => {
      const result = await service.restoreRejectedBusinessPartner('user-1');

      expect(result.status).not.toBe(UserStatus.AWAITING_PARTNER_APPROVAL);
      expect(stored.status).not.toBe(UserStatus.AWAITING_PARTNER_APPROVAL);
    });

    it('survives a welcome email failure without losing the restore', async () => {
      (service as any).agentsService.sendAgentWelcomeEmail = async () => {
        throw new Error('mailgun down');
      };

      const result = await service.restoreRejectedBusinessPartner('user-1');

      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(activatedFor).toEqual(['user-1']);
    });
  });
});
