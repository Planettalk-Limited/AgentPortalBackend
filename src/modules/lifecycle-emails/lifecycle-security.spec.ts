import { createHmac } from 'crypto';
import { signUnsubscribeToken, verifyMailgunSignature, verifyUnsubscribeToken } from './lifecycle-security';
import { EmailService } from '../email/email.service';
import { LifecycleTrackingService } from './lifecycle-tracking.service';

describe('unsubscribe tokens', () => {
  it('verifies a token for its own agent only', () => {
    const token = signUnsubscribeToken('agent-a', 'secret');
    expect(verifyUnsubscribeToken('agent-a', token, 'secret')).toBe(true);
    expect(verifyUnsubscribeToken('agent-b', token, 'secret')).toBe(false);
    expect(verifyUnsubscribeToken('agent-a', token, 'other-secret')).toBe(false);
    expect(verifyUnsubscribeToken('agent-a', '', 'secret')).toBe(false);
  });
});

describe('Mailgun webhook signatures', () => {
  const key = 'whsec-test';
  const signed = (timestamp: string, token: string, k = key) => ({
    timestamp,
    token,
    signature: createHmac('sha256', k).update(timestamp + token).digest('hex'),
  });

  it('accepts a correctly signed payload', () => {
    expect(verifyMailgunSignature(signed('1731229200', 'abc'), key)).toBe(true);
  });

  it('rejects tampered, foreign-key, missing or unconfigured signatures', () => {
    expect(verifyMailgunSignature({ ...signed('1731229200', 'abc'), timestamp: '1731229201' }, key)).toBe(false);
    expect(verifyMailgunSignature(signed('1731229200', 'abc', 'someone-else'), key)).toBe(false);
    expect(verifyMailgunSignature(undefined, key)).toBe(false);
    expect(verifyMailgunSignature(signed('1731229200', 'abc'), '')).toBe(false);
  });
});

describe('EmailService.buildMailgunFields', () => {
  it('maps tags, tracking, variables and headers to Mailgun fields', () => {
    expect(
      EmailService.buildMailgunFields({
        tags: ['a', 'b', 'c', 'd'],
        trackOpens: true,
        trackClicks: true,
        variables: { lifecycle_email_id: 'e1' },
        headers: { 'List-Unsubscribe': '<https://x>' },
      }),
    ).toEqual({
      'o:tag': ['a', 'b', 'c'],
      'o:tracking': 'yes',
      'o:tracking-opens': 'yes',
      'o:tracking-clicks': 'htmlonly',
      'h:X-Mailgun-Variables': '{"lifecycle_email_id":"e1"}',
      'h:List-Unsubscribe': '<https://x>',
    });
    expect(EmailService.buildMailgunFields(undefined)).toEqual({});
  });
});

describe('LifecycleTrackingService.recordMailgunEvent', () => {
  function setup(existingEventIds: string[] = []) {
    const updates: any[] = [];
    const eventIds = new Set(existingEventIds);
    const updateBuilder = () => {
      const qb: any = {
        update: () => qb,
        where: () => qb,
        set: (v: any) => (updates.push(v), qb),
        setParameter: () => qb,
        execute: async () => ({ affected: 1 }),
      };
      return qb;
    };
    const emails = {
      findOne: jest.fn(async ({ where }: any) =>
        where.id === 'email-1' || where.mailgunMessageId === 'msg-1' ? { id: 'email-1', agentId: 'agent-1' } : null,
      ),
      createQueryBuilder: updateBuilder,
    };
    const events = {
      createQueryBuilder: () => {
        let id: string;
        const qb: any = {
          insert: () => qb,
          into: () => qb,
          values: (v: any) => ((id = v.mailgunEventId), qb),
          orIgnore: () => qb,
          returning: () => qb,
          execute: async () => {
            if (eventIds.has(id)) return { raw: [] };
            eventIds.add(id);
            return { raw: [{ id: 'row' }] };
          },
        };
        return qb;
      },
    };
    const states = { findOne: jest.fn(async () => ({ agentId: 'agent-1', unsubscribedAt: null })), update: jest.fn() };
    const service = new LifecycleTrackingService(emails as any, events as any, states as any, {} as any);
    return { service, updates, states };
  }

  const event = (overrides: Record<string, any> = {}) => ({
    'event-data': {
      id: 'evt-1',
      event: 'opened',
      timestamp: 1731229200,
      recipient: 'ada@example.com',
      message: { headers: { 'message-id': 'msg-1' } },
      'user-variables': { lifecycle_email_id: 'email-1' },
      ...overrides,
    },
  });

  it('records an open against the lifecycle email', async () => {
    const { service, updates } = setup();
    await expect(service.recordMailgunEvent(event())).resolves.toEqual({ recorded: true });
    expect(Object.keys(updates[0])).toEqual(['openCount', 'firstOpenedAt']);
  });

  it('ignores a retried (duplicate) event', async () => {
    const { service, updates } = setup(['evt-1']);
    await expect(service.recordMailgunEvent(event())).resolves.toEqual({ recorded: false, reason: 'duplicate event' });
    expect(updates).toEqual([]);
  });

  it('ignores events for emails that are not lifecycle emails', async () => {
    const { service } = setup();
    const result = await service.recordMailgunEvent(
      event({ 'user-variables': {}, message: { headers: { 'message-id': 'transactional' } } }),
    );
    expect(result).toEqual({ recorded: false, reason: 'not a lifecycle email' });
  });

  it('opts the partner out on an unsubscribe or spam complaint', async () => {
    const { service, states } = setup();
    await service.recordMailgunEvent(event({ id: 'evt-2', event: 'complained' }));
    expect(states.update).toHaveBeenCalledWith('agent-1', expect.objectContaining({ unsubscribeSource: 'mailgun_complained' }));
  });
});
