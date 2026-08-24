import { AgentsService } from './agents.service';
import { User } from '../users/entities/user.entity';

/**
 * Companion to users.service.register.spec.ts.
 *
 * Registration keeps the user row and the agent profile atomic by passing its
 * transaction manager down to createPendingAgentWithReferralData. That only works if
 * BOTH the code lookup and the agent insert go through the manager — if either falls
 * back to the injected repository it runs on a separate connection, outside the
 * transaction, and the atomicity guarantee is silently lost.
 */
describe('AgentsService.createPendingAgentWithReferralData', () => {
  let service: AgentsService;

  let injectedRepoUsedFor: string[];
  let managerRepoUsedFor: string[];
  let existingCodes: string[];
  let savedAgent: any;

  const user = { id: 'user-uuid', firstName: 'Test', lastName: 'Partner' } as User;

  const buildRepo = (log: string[]) => ({
    createQueryBuilder: () => {
      log.push('createQueryBuilder');
      const qb: any = {
        select: () => qb,
        where: () => qb,
        andWhere: () => qb,
        getMany: async () => existingCodes.map((agentCode) => ({ agentCode })),
      };
      return qb;
    },
    create: (data: any) => {
      log.push('create');
      return { ...data };
    },
    save: async (entity: any) => {
      log.push('save');
      savedAgent = { ...entity, id: 'agent-uuid' };
      return savedAgent;
    },
  });

  beforeEach(() => {
    injectedRepoUsedFor = [];
    managerRepoUsedFor = [];
    existingCodes = [];
    savedAgent = undefined;

    service = Object.create(AgentsService.prototype);
    (service as any).agentsRepository = buildRepo(injectedRepoUsedFor);
  });

  const manager = () => ({ getRepository: () => buildRepo(managerRepoUsedFor) });

  describe('when a transaction manager is supplied', () => {
    it('reads existing codes and inserts the agent through the manager only', async () => {
      await service.createPendingAgentWithReferralData(user, manager() as any);

      expect(managerRepoUsedFor).toEqual(['createQueryBuilder', 'create', 'save']);
      expect(injectedRepoUsedFor).toEqual([]);
    });

    it('returns the allocated code', async () => {
      existingCodes = ['PTA0001', 'PTA0002'];

      const result = await service.createPendingAgentWithReferralData(user, manager() as any);

      expect(result.agentCode).toBe('PTA0003');
      expect(result.agent.id).toBe('agent-uuid');
    });

    it('creates the profile as pending, awaiting email verification', async () => {
      await service.createPendingAgentWithReferralData(user, manager() as any);

      expect(savedAgent.status).toBe('pending_application');
      expect(savedAgent.activatedAt).toBeNull();
      expect(savedAgent.userId).toBe('user-uuid');
    });

    it('fills the first gap rather than appending after the highest code', async () => {
      existingCodes = ['PTA0001', 'PTA0003', 'PTA0004'];

      const result = await service.createPendingAgentWithReferralData(user, manager() as any);

      expect(result.agentCode).toBe('PTA0002');
    });
  });

  describe('when no manager is supplied', () => {
    it('falls back to the injected repository', async () => {
      await service.createPendingAgentWithReferralData(user);

      expect(injectedRepoUsedFor).toEqual(['createQueryBuilder', 'create', 'save']);
      expect(managerRepoUsedFor).toEqual([]);
    });
  });

  describe('when the code range is exhausted', () => {
    it('throws instead of creating a profile with no code', async () => {
      // Fill PTA0001-PTA9999 so no code is available.
      existingCodes = Array.from(
        { length: 9999 },
        (_, i) => `PTA${(i + 1).toString().padStart(4, '0')}`,
      );

      await expect(
        service.createPendingAgentWithReferralData(user, manager() as any),
      ).rejects.toThrow(/have been assigned/);

      expect(savedAgent).toBeUndefined();
      expect(managerRepoUsedFor).not.toContain('save');
    });
  });
});
