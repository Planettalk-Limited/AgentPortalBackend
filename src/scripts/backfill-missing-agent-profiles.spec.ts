import { classifyOrphan, ClassifyOptions } from './backfill-missing-agent-profiles';

/**
 * Guards the selection rules of the orphaned-agent-profile backfill.
 *
 * This script writes to live partner accounts and sends real welcome emails, so
 * the rules deciding WHO gets touched matter more than the writes themselves.
 *
 * Business partners are now in scope: admin approval is gone, so they draw a
 * generic PTA code like everyone else. The script is also the migration path for
 * partners stranded in awaiting_partner_approval by the old flow.
 */
describe('classifyOrphan', () => {
  const defaults: ClassifyOptions = {
    only: null,
    includeTest: false,
    includePending: false,
  };

  const individual = (email: string, status: string) => ({
    email,
    status,
    metadata: { registrationMethod: 'self_registration', partnerType: 'individual' },
  });

  const business = (
    email: string,
    status: string,
    emailVerifiedAt: Date | null = null,
  ) => ({
    email,
    status,
    emailVerifiedAt,
    metadata: { registrationMethod: 'self_registration_business', partnerType: 'business' },
  });

  describe('the affected individual partners', () => {
    it('fixes and activates an active individual partner', () => {
      expect(classifyOrphan(individual('a.h.diariess@gmail.com', 'active'), defaults)).toEqual({
        action: 'fix',
        activate: true,
      });
    });

    it('skips an unverified individual partner unless --include-pending is given', () => {
      const user = individual('sineadphelan219@gmail.com', 'pending');

      expect(classifyOrphan(user, defaults)).toEqual({
        action: 'skip',
        reason: 'status pending - needs --include-pending',
      });
    });

    it('creates a pending profile without activating it under --include-pending', () => {
      const user = individual('sineadphelan219@gmail.com', 'pending');

      expect(classifyOrphan(user, { ...defaults, includePending: true })).toEqual({
        action: 'fix',
        activate: false,
      });
    });
  });

  describe('business partners', () => {
    it('assigns a code to an active business partner, now that approval is gone', () => {
      const user = business('ade@afrofoods.co.uk', 'active');

      expect(classifyOrphan(user, defaults)).toEqual({
        action: 'fix',
        activate: true,
      });
    });

    it('activates a partner stranded in awaiting_partner_approval', () => {
      // They verified their email - that is how they reached this status - so the
      // profile must be active or the code we email them will not resolve.
      const user = business(
        'kofi@accragrocers.co.uk',
        'awaiting_partner_approval',
        new Date('2026-09-01T10:00:00.000Z'),
      );

      expect(classifyOrphan(user, { ...defaults, includePending: true })).toEqual({
        action: 'fix',
        activate: true,
      });
    });

    it('leaves an awaiting partner alone without --include-pending', () => {
      const user = business(
        'kofi@accragrocers.co.uk',
        'awaiting_partner_approval',
        new Date('2026-09-01T10:00:00.000Z'),
      );

      expect(classifyOrphan(user, defaults)).toEqual({
        action: 'skip',
        reason: 'status awaiting_partner_approval - needs --include-pending',
      });
    });

    it('creates an unverified business partner deactivated', () => {
      const user = business('harrtnm+nophone@gmail.com', 'pending');
      const opts = { only: null, includeTest: true, includePending: true };

      expect(classifyOrphan(user, opts)).toEqual({
        action: 'fix',
        activate: false,
      });
    });
  });

  describe('QA and pentest accounts', () => {
    it.each([
      'harrtnm+xss3@gmail.com',
      'test@test.com',
      'john@test.com',
      'test@example.com',
      'harrtnm_pt_test@yopmail.com',
      'osasumwen.osemwota+2@planettalk.com',
    ])('skips %s by default', (email) => {
      expect(classifyOrphan(individual(email, 'active'), defaults)).toEqual({
        action: 'skip',
        reason: 'test/QA account',
      });
    });

    it('matches test patterns regardless of case', () => {
      expect(classifyOrphan(individual('HARRTNM+XSS3@Gmail.com', 'active'), defaults)).toEqual({
        action: 'skip',
        reason: 'test/QA account',
      });
    });

    it('includes them when --include-test is given', () => {
      expect(
        classifyOrphan(individual('test@test.com', 'active'), { ...defaults, includeTest: true }),
      ).toEqual({ action: 'fix', activate: true });
    });

    it('does not mistake a real address for a test account', () => {
      expect(classifyOrphan(individual('medhanieb26@icloud.com', 'active'), defaults)).toEqual({
        action: 'fix',
        activate: true,
      });
    });
  });

  describe('--only targeting', () => {
    const opts = { ...defaults, only: ['a.h.diariess@gmail.com'] };

    it('fixes the named user', () => {
      expect(classifyOrphan(individual('a.h.diariess@gmail.com', 'active'), opts)).toEqual({
        action: 'fix',
        activate: true,
      });
    });

    it('ignores everyone else silently', () => {
      expect(classifyOrphan(individual('medhanieb26@icloud.com', 'active'), opts)).toEqual({
        action: 'ignore',
      });
    });

    it('matches the named user case-insensitively', () => {
      expect(classifyOrphan(individual('A.H.Diariess@Gmail.com', 'active'), opts)).toEqual({
        action: 'fix',
        activate: true,
      });
    });

    it('reaches a pending user without needing --include-pending', () => {
      const pendingOpts = { ...defaults, only: ['pramod.mann@hotmail.com'] };

      expect(classifyOrphan(individual('pramod.mann@hotmail.com', 'pending'), pendingOpts)).toEqual({
        action: 'fix',
        activate: false,
      });
    });
  });

  describe('users with incomplete metadata', () => {
    it('treats a missing registrationMethod as an individual partner', () => {
      expect(classifyOrphan({ email: 'legacy@gmail.com', status: 'active' }, defaults)).toEqual({
        action: 'fix',
        activate: true,
      });
    });

    it('tolerates null metadata', () => {
      expect(
        classifyOrphan({ email: 'legacy@gmail.com', status: 'active', metadata: null }, defaults),
      ).toEqual({ action: 'fix', activate: true });
    });

    it('does not activate a suspended user', () => {
      expect(
        classifyOrphan(individual('suspended@gmail.com', 'suspended'), {
          ...defaults,
          includePending: true,
        }),
      ).toEqual({ action: 'fix', activate: false });
    });
  });
});
