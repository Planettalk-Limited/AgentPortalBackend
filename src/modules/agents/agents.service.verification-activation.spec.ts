import { AgentsService } from './agents.service';

/**
 * Guards the agent activation that email verification was missing.
 *
 * Registration creates the profile as pending_application, and verifying the email
 * promoted only the USER to active — the agent row was left pending. Since
 * validateReferralCode() refuses any code whose agent is not active, partners were
 * handed a code (in the welcome email sent at that very moment) that silently failed
 * for everyone who tried to use it.
 */
describe('AgentsService.activateAgentAfterEmailVerification', () => {
  let service: AgentsService;
  let stored: any;
  let saved: any;

  beforeEach(() => {
    stored = null;
    saved = undefined;

    service = Object.create(AgentsService.prototype);
    (service as any).agentsRepository = {
      findOne: async () => stored,
      save: async (agent: any) => {
        saved = agent;
        return agent;
      },
    };
  });

  it('activates a profile left pending after registration', async () => {
    stored = {
      id: 'agent-uuid',
      userId: 'user-uuid',
      agentCode: 'PTA0219',
      status: 'pending_application',
      activatedAt: null,
      metadata: { pendingVerification: true },
    };

    const result = await service.activateAgentAfterEmailVerification('user-uuid');

    expect(result!.status).toBe('active');
    expect(result!.activatedAt).toBeInstanceOf(Date);
    expect(result!.metadata.pendingVerification).toBe(false);
    expect(result!.metadata.activatedBy).toBe('email_verification');
    expect(saved).toBeDefined();
  });

  it('returns null when the user has no profile, as business partners do not', async () => {
    stored = null;

    await expect(service.activateAgentAfterEmailVerification('user-uuid')).resolves.toBeNull();
    expect(saved).toBeUndefined();
  });

  it('leaves an already active profile untouched', async () => {
    const activatedAt = new Date('2026-07-01T00:00:00.000Z');
    stored = { id: 'agent-uuid', status: 'active', activatedAt, metadata: {} };

    const result = await service.activateAgentAfterEmailVerification('user-uuid');

    expect(result!.status).toBe('active');
    expect(result!.activatedAt).toBe(activatedAt);
    expect(saved).toBeUndefined();
  });

  it.each(['suspended', 'inactive'])(
    'never resurrects a %s profile an admin switched off',
    async (status) => {
      stored = { id: 'agent-uuid', status, activatedAt: null, metadata: {} };

      const result = await service.activateAgentAfterEmailVerification('user-uuid');

      expect(result!.status).toBe(status);
      expect(saved).toBeUndefined();
    },
  );

  it('preserves an existing activation date rather than overwriting it', async () => {
    const activatedAt = new Date('2026-07-01T00:00:00.000Z');
    stored = {
      id: 'agent-uuid',
      status: 'credentials_sent',
      activatedAt,
      metadata: {},
    };

    const result = await service.activateAgentAfterEmailVerification('user-uuid');

    expect(result!.status).toBe('active');
    expect(result!.activatedAt).toBe(activatedAt);
  });
});
