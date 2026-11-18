/**
 * ALL partner lifecycle email copy lives in this file.
 *
 * To change an email: edit its subject / previewText / paragraphs below and set
 * `draft: false`. Nothing else needs touching. Text is Handlebars, so {{firstName}},
 * {{agentCode}}, {{referralLink}}, {{amount}}, {{month}}, {{milestone}} and
 * {{period}} are filled in at send time (see LifecycleTemplateData).
 *
 * The subjects are the client's titles. The bodies are PLACEHOLDER copy, written
 * only so the emails can be tested end to end; every template is `draft: true`
 * and the scheduler refuses to send draft copy unless LIFECYCLE_ALLOW_DRAFT_COPY=true.
 *
 * Keys are stable identifiers: they are stored in the send log and used as
 * Mailgun tags, so renaming a key resets its stats and its once-only guard.
 */

export type LifecycleSegment =
  | 'onboarding'
  | 'referral_milestone'
  | 'earnings'
  | 'previously_active'
  | 'active'
  | 'inactive'
  | 'internal';

export type CtaTarget = 'portal' | 'referral' | 'dashboard' | 'earnings' | 'support';

export interface LifecycleTemplate {
  key: string;
  segment: LifecycleSegment;
  subject: string;
  previewText: string;
  paragraphs: string[];
  cta?: { text: string; target: CtaTarget };
  /** True while the body is placeholder copy awaiting the client's final text. */
  draft: boolean;
  /** Set when an existing flow already sends this email, so the scheduler never does. */
  managedElsewhere?: string;
  /** Internal emails go to the partner team, not the partner. */
  internal?: boolean;
}

export interface LifecycleTemplateData {
  firstName: string;
  agentCode: string;
  referralLink: string;
  portalUrl: string;
  amount?: string;
  month?: string;
  milestone?: number;
  period?: string;
  partnerName?: string;
  partnerEmail?: string;
}

const DRAFT = true;

const TEMPLATES: LifecycleTemplate[] = [
  // ── Onboarding (new partner) ────────────────────────────────────────────────
  {
    key: 'onboarding_welcome',
    segment: 'onboarding',
    subject: 'Welcome to the PlanetTalk Partner Programme',
    previewText: '',
    paragraphs: [],
    draft: false,
    managedElsewhere:
      'Sent immediately on email verification by AuthService.verifyEmailOTP (individual-partner-welcome / business-partner-welcome templates). The scheduler never sends it.',
  },
  {
    key: 'onboarding_day3',
    segment: 'onboarding',
    subject: 'Your customers could be an extra income stream',
    previewText: 'The people you already talk to every day could be earning you commission.',
    paragraphs: [
      'Hi {{firstName}},',
      'Many of your customers call family abroad. Every one who signs up with your code {{agentCode}} earns you a reward plus commission on their top-ups.',
      'Your referral link is ready whenever you are.',
    ],
    cta: { text: 'Get my referral link', target: 'referral' },
    draft: DRAFT,
  },
  {
    key: 'onboarding_day6',
    segment: 'onboarding',
    subject: 'Have you got your referral link yet?',
    previewText: 'Log in to your partner portal to find your link and code.',
    paragraphs: [
      'Hi {{firstName}},',
      "We noticed you haven't logged in to your partner portal yet. Your referral link and materials are waiting there.",
      'Your partner code is {{agentCode}}.',
    ],
    cta: { text: 'Open my partner portal', target: 'portal' },
    draft: DRAFT,
  },
  {
    key: 'onboarding_day10',
    segment: 'onboarding',
    subject: 'Your first referral could start with one conversation',
    previewText: 'One conversation is all it takes to get your first referral.',
    paragraphs: [
      'Hi {{firstName}},',
      'Think of one person who calls home regularly and tell them about PlanetTalk today. That one conversation could be your first referral.',
    ],
    cta: { text: 'Share my link', target: 'referral' },
    draft: DRAFT,
  },
  {
    key: 'onboarding_day14',
    segment: 'onboarding',
    subject: 'Who in your shop could benefit from PlanetTalk?',
    previewText: 'Your regular customers are your best referrals.',
    paragraphs: [
      'Hi {{firstName}},',
      'Your regular customers already trust you. Mention PlanetTalk at the till and share your code {{agentCode}}.',
    ],
    cta: { text: 'Share my link', target: 'referral' },
    draft: DRAFT,
  },
  {
    key: 'onboarding_day21',
    segment: 'onboarding',
    subject: 'Make PlanetTalk part of your daily customer conversation',
    previewText: 'A small habit that can add up to regular income.',
    paragraphs: [
      'Hi {{firstName}},',
      'Partners who mention PlanetTalk every day see the best results. A sign by the till or a WhatsApp status post can do a lot of the work for you.',
    ],
    cta: { text: 'Open my partner portal', target: 'portal' },
    draft: DRAFT,
  },

  // ── Referral milestones ─────────────────────────────────────────────────────
  {
    key: 'referrals_1',
    segment: 'referral_milestone',
    subject: 'Your first referral is in!',
    previewText: "Congratulations, you've made your first referral.",
    paragraphs: ['Hi {{firstName}},', 'Your first referral has been recorded. Well done, and keep sharing your code {{agentCode}}.'],
    cta: { text: 'See my referrals', target: 'dashboard' },
    draft: DRAFT,
  },
  {
    key: 'referrals_5',
    segment: 'referral_milestone',
    subject: "5 referrals! You're building momentum",
    previewText: "Five referrals and counting.",
    paragraphs: ['Hi {{firstName}},', "You've reached 5 referrals. You're building real momentum."],
    cta: { text: 'See my referrals', target: 'dashboard' },
    draft: DRAFT,
  },
  {
    key: 'referrals_10',
    segment: 'referral_milestone',
    subject: "10 referrals: you're a Partner to watch",
    previewText: "Ten referrals puts you among our most active partners.",
    paragraphs: ['Hi {{firstName}},', "10 referrals! You're a Partner to watch."],
    cta: { text: 'See my referrals', target: 'dashboard' },
    draft: DRAFT,
  },
  {
    key: 'referrals_25',
    segment: 'referral_milestone',
    subject: '25 referrals and counting',
    previewText: 'Twenty-five referrals. Thank you.',
    paragraphs: ['Hi {{firstName}},', "You've now referred 25 customers to PlanetTalk."],
    cta: { text: 'See my referrals', target: 'dashboard' },
    draft: DRAFT,
  },
  {
    key: 'referrals_50',
    segment: 'referral_milestone',
    subject: '50 referrals: thank you for building with us',
    previewText: 'Fifty referrals. Thank you for building with us.',
    paragraphs: ['Hi {{firstName}},', '50 referrals is a big achievement. Thank you for building with us.'],
    cta: { text: 'See my referrals', target: 'dashboard' },
    draft: DRAFT,
  },
  {
    key: 'referrals_100',
    segment: 'referral_milestone',
    subject: "100 referrals: let's talk about what's next",
    previewText: 'A member of our partner team will be in touch.',
    paragraphs: [
      'Hi {{firstName}},',
      "You've reached 100 referrals. A member of our partner team will be in touch personally to talk about what's next.",
    ],
    cta: { text: 'See my referrals', target: 'dashboard' },
    draft: DRAFT,
  },
  {
    // Not sent to the partner: tells the partner team to follow up personally within 48h.
    key: 'referrals_100_team',
    segment: 'internal',
    subject: '[Partner Portal] {{partnerName}} has reached 100 referrals: personal follow-up due within 48h',
    previewText: 'Please send a personal message within 48 hours.',
    paragraphs: [
      'Partner {{partnerName}} ({{partnerEmail}}, code {{agentCode}}) has just reached 100 referrals.',
      'They have been sent the automated "100 referrals" email. Please contact them personally within 48 hours.',
    ],
    draft: false,
    internal: true,
  },

  // ── Earnings ────────────────────────────────────────────────────────────────
  {
    key: 'earnings_first',
    segment: 'earnings',
    subject: 'Your first commission has landed',
    previewText: 'Your first PlanetTalk commission is in your partner wallet.',
    paragraphs: ['Hi {{firstName}},', 'Your first commission has been credited to your partner account.'],
    cta: { text: 'View my earnings', target: 'earnings' },
    draft: DRAFT,
  },
  {
    // Shared by every configured threshold: earnings_50, earnings_100, earnings_250, ...
    key: 'earnings_threshold',
    segment: 'earnings',
    subject: "You've earned ${{amount}} with PlanetTalk",
    previewText: 'Your lifetime partner earnings have passed ${{amount}}.',
    paragraphs: ['Hi {{firstName}},', 'Your total PlanetTalk partner earnings have now reached ${{amount}}. Thank you for sharing PlanetTalk.'],
    cta: { text: 'View my earnings', target: 'earnings' },
    draft: DRAFT,
  },
  {
    key: 'earnings_summary',
    segment: 'earnings',
    subject: 'Your {{month}} Partner earnings summary',
    previewText: 'You earned ${{amount}} in {{month}}.',
    paragraphs: ['Hi {{firstName}},', 'In {{month}} you earned ${{amount}} as a PlanetTalk Partner.'],
    cta: { text: 'View my earnings', target: 'earnings' },
    draft: DRAFT,
  },

  // ── Previously active (≥1 referral, then quiet) ─────────────────────────────
  {
    key: 'lapsed_21',
    segment: 'previously_active',
    subject: "It's been a while",
    previewText: "We haven't seen a new referral from you in a few weeks.",
    paragraphs: ['Hi {{firstName}},', "It's been a few weeks since your last referral. Your code {{agentCode}} is still ready to share."],
    cta: { text: 'Share my link', target: 'referral' },
    draft: DRAFT,
  },
  {
    key: 'lapsed_60',
    segment: 'previously_active',
    subject: 'Ready to get referring again?',
    previewText: 'Pick up where you left off.',
    paragraphs: ['Hi {{firstName}},', 'Ready to get referring again? Your customers can still sign up with your code {{agentCode}}.'],
    cta: { text: 'Share my link', target: 'referral' },
    draft: DRAFT,
  },

  // ── Active ──────────────────────────────────────────────────────────────────
  {
    key: 'active_monthly',
    segment: 'active',
    subject: 'Your referrals are keeping things moving',
    previewText: 'Your referred customers are still topping up.',
    paragraphs: ['Hi {{firstName}},', 'Your referred customers have been topping up this month, and that keeps your commission growing.'],
    cta: { text: 'View my earnings', target: 'earnings' },
    draft: DRAFT,
  },
  {
    key: 'anniversary_6m',
    segment: 'active',
    subject: 'Your 6 months with PlanetTalk',
    previewText: "It's been six months since you joined.",
    paragraphs: ['Hi {{firstName}},', "It's six months since you became a PlanetTalk Partner. Thank you."],
    cta: { text: 'Open my partner portal', target: 'portal' },
    draft: DRAFT,
  },
  {
    key: 'anniversary_12m',
    segment: 'active',
    subject: 'Your year with PlanetTalk',
    previewText: "It's been a year since you joined.",
    paragraphs: ['Hi {{firstName}},', "It's a year since you became a PlanetTalk Partner. Thank you."],
    cta: { text: 'Open my partner portal', target: 'portal' },
    draft: DRAFT,
  },

  // ── Inactive re-engagement (no login AND no new referral) ───────────────────
  {
    key: 'inactive_30',
    segment: 'inactive',
    subject: 'Still keeping your referral link handy?',
    previewText: 'Your referral link is still ready to share.',
    paragraphs: ['Hi {{firstName}},', 'Your referral link is still active. Here it is again in case you need it: {{referralLink}}'],
    cta: { text: 'Share my link', target: 'referral' },
    draft: DRAFT,
  },
  {
    key: 'inactive_60',
    segment: 'inactive',
    subject: "Need a hand getting started? We're here to help",
    previewText: 'Our partner team can help you get your first referrals.',
    paragraphs: ['Hi {{firstName}},', "If you're not sure where to start, reply to partners@planettalk.com and our team will help."],
    cta: { text: 'Contact the partner team', target: 'support' },
    draft: DRAFT,
  },
  {
    key: 'inactive_90',
    segment: 'inactive',
    subject: 'Should we keep you in the loop?',
    previewText: "We'll stop sending these emails unless we hear from you.",
    paragraphs: [
      'Hi {{firstName}},',
      "We haven't seen you in a while. If you'd still like to hear from us, just log in to your partner portal in the next 10 days.",
    ],
    cta: { text: 'Keep me in the loop', target: 'portal' },
    draft: DRAFT,
  },
  {
    key: 'welcome_back',
    segment: 'inactive',
    subject: 'Welcome back, Partner!',
    previewText: 'Good to see you again.',
    paragraphs: ['Hi {{firstName}},', "Welcome back! It's great to see you active again."],
    cta: { text: 'Open my partner portal', target: 'portal' },
    draft: DRAFT,
  },
];

const BY_KEY = new Map(TEMPLATES.map((t) => [t.key, t]));

/** Fallback for a referral milestone configured via env that has no dedicated copy above. */
function genericReferralTemplate(milestone: number): LifecycleTemplate {
  return {
    key: `referrals_${milestone}`,
    segment: 'referral_milestone',
    subject: `${milestone} referrals and counting`,
    previewText: `You've reached ${milestone} referrals.`,
    paragraphs: ['Hi {{firstName}},', `You've now referred ${milestone} customers to PlanetTalk.`],
    cta: { text: 'See my referrals', target: 'dashboard' },
    draft: DRAFT,
  };
}

/**
 * Resolves a send-log template key to its copy. Earnings thresholds share one
 * template (earnings_50 -> earnings_threshold); referral milestones without their
 * own entry fall back to a generic one.
 */
export function getLifecycleTemplate(key: string): LifecycleTemplate | undefined {
  const exact = BY_KEY.get(key);
  if (exact) return exact;
  const earnings = /^earnings_(\d+(?:\.\d+)?)$/.exec(key);
  if (earnings) return { ...BY_KEY.get('earnings_threshold')!, key };
  const referrals = /^referrals_(\d+)$/.exec(key);
  if (referrals) return genericReferralTemplate(Number(referrals[1]));
  return undefined;
}

export function listLifecycleTemplates(): LifecycleTemplate[] {
  return [...TEMPLATES];
}
