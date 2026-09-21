import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AgentsService } from './agents.service';

/**
 * Guards the custom partner code endpoint.
 *
 * Every partner now self-serves a generic PTA code at registration, so this is the
 * only path to a business-branded one. It rewrites the referral identifier on a live
 * account: the previous code stops resolving immediately, so the rules about what is
 * accepted, and the history trail left behind, are the safety net.
 */
describe('AgentsService.changeAgentCode', () => {
  let service: AgentsService;
  let agents: Record<string, any>;
  let saved: any;

  beforeEach(() => {
    saved = undefined;
    agents = {
      'agent-1': {
        id: 'agent-1',
        agentCode: 'PTA0042',
        metadata: { registrationMethod: 'self_registration_business' },
      },
    };

    service = Object.create(AgentsService.prototype);
    (service as any).agentsRepository = {
      findOne: async ({ where }: any) => {
        if (where.id) return agents[where.id] ?? null;
        if (where.agentCode) {
          return (
            Object.values(agents).find((a: any) => a.agentCode === where.agentCode) ??
            null
          );
        }
        return null;
      },
      save: async (entity: any) => {
        saved = entity;
        return entity;
      },
    };
  });

  describe('accepting a valid code', () => {
    it('uppercases the code and writes it to the agent', async () => {
      const result = await service.changeAgentCode('agent-1', 'afro_foods_mcr');

      expect(result.agentCode).toBe('AFRO_FOODS_MCR');
      expect(saved.agentCode).toBe('AFRO_FOODS_MCR');
    });

    it('records the previous code so a dead referral can be traced', async () => {
      await service.changeAgentCode('agent-1', 'AFRO_FOODS_MCR');

      expect(saved.metadata.codeHistory).toHaveLength(1);
      expect(saved.metadata.codeHistory[0]).toMatchObject({
        from: 'PTA0042',
        to: 'AFRO_FOODS_MCR',
      });
    });

    it('appends to an existing history rather than replacing it', async () => {
      agents['agent-1'].metadata.codeHistory = [
        { from: 'PTA0001', to: 'PTA0042', changedAt: '2026-01-01T00:00:00.000Z' },
      ];

      await service.changeAgentCode('agent-1', 'AFRO_FOODS_MCR');

      expect(saved.metadata.codeHistory).toHaveLength(2);
      expect(saved.metadata.codeHistory[0].from).toBe('PTA0001');
    });

    it('preserves unrelated metadata', async () => {
      await service.changeAgentCode('agent-1', 'AFRO_FOODS_MCR');

      expect(saved.metadata.registrationMethod).toBe('self_registration_business');
    });

    it('is a no-op when the code is already the requested one', async () => {
      const result = await service.changeAgentCode('agent-1', 'pta0042');

      expect(result.agentCode).toBe('PTA0042');
      expect(saved).toBeUndefined();
    });
  });

  describe('rejecting a bad code', () => {
    it('refuses a code already held by another agent', async () => {
      agents['agent-2'] = { id: 'agent-2', agentCode: 'TAKEN_CODE', metadata: {} };

      await expect(service.changeAgentCode('agent-1', 'taken_code')).rejects.toThrow(
        BadRequestException,
      );
      expect(saved).toBeUndefined();
    });

    it.each([
      ['too short', 'AB'],
      ['too long', 'A'.repeat(41)],
    ])('refuses a code that is %s', async (_label, code) => {
      await expect(service.changeAgentCode('agent-1', code)).rejects.toThrow(
        BadRequestException,
      );
    });

    it.each([
      ['a leading underscore', '_AFRO'],
      ['a leading hyphen', '-AFRO'],
      ['a space', 'AFRO FOODS'],
      ['punctuation', 'AFRO.FOODS'],
    ])('refuses a code with %s', async (_label, code) => {
      await expect(service.changeAgentCode('agent-1', code)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('leaves the agent untouched when validation fails', async () => {
      await expect(service.changeAgentCode('agent-1', 'AB')).rejects.toThrow();

      expect(agents['agent-1'].agentCode).toBe('PTA0042');
      expect(saved).toBeUndefined();
    });
  });

  describe('when the agent does not exist', () => {
    it('reports not found rather than creating anything', async () => {
      await expect(
        service.changeAgentCode('missing', 'AFRO_FOODS_MCR'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
