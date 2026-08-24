import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { Agent, AgentStatus } from '../modules/agents/entities/agent.entity';
import { AgentsService } from '../modules/agents/agents.service';

/**
 * Backfill agent profiles for users who registered successfully but never got an
 * agent record - and therefore never got an agent code.
 *
 * ROOT CAUSE: registration in users.service.ts saves the user row first, then calls
 * createPendingAgentWithReferralData(). There is no transaction. While the PTA code
 * pool was capped at PTA0205 (raised to PTA9999 in 8fdd41e), generateAgentCode()
 * threw once the range filled, so the user row committed and the agent row never
 * existed. Those users can log in but /agents/me 404s, so the portal shows
 * "Unable to Load Dashboard" and no code is ever issued.
 * Affected window: 2026-07-24 to 2026-08-13.
 *
 * This script replays the normal flow for those users:
 *   1. create the agent profile (allocating the next free PTA code)
 *   2. if the user is already ACTIVE (verified + logged in), activate the agent too,
 *      exactly as activateAgentOnFirstLogin would have
 *   3. send the individual partner welcome email containing the code
 *
 * Business partners (registrationMethod = self_registration_business) are ALWAYS
 * skipped: they legitimately have no agent row until an admin approves them and
 * assigns a custom partner code.
 *
 * It is idempotent - a user who already has an agent row is skipped - and safe to
 * re-run after a partial failure.
 *
 * Usage (dry run - prints the plan, writes nothing, sends nothing):
 *   npx ts-node src/scripts/backfill-missing-agent-profiles.ts
 *
 * Canary one user first, then the rest:
 *   npx ts-node src/scripts/backfill-missing-agent-profiles.ts --only=a.h.diariess@gmail.com --apply
 *
 * Apply to all ACTIVE affected users:
 *   npx ts-node src/scripts/backfill-missing-agent-profiles.ts --apply
 *
 * Flags:
 *   --apply            write changes and send emails (default: dry run)
 *   --only=a@b,c@d     restrict to these emails (bypasses the test-account filter)
 *   --include-pending  also fix users who have not verified their email yet
 *   --include-test     do not filter out QA/pentest accounts
 *   --no-email         create the profiles but send no welcome emails
 */

// QA and penetration-test accounts seen in the affected window. Matched against the
// full email, case-insensitively, as substrings.
const TEST_ACCOUNT_PATTERNS = [
  'harrtnm',
  '@test.com',
  '@example.com',
  '@yopmail.com',
  'osasumwen.osemwota+2@planettalk.com',
];

function isTestAccount(email: string): boolean {
  const lower = email.toLowerCase();
  return TEST_ACCOUNT_PATTERNS.some((p) => lower.includes(p));
}

export interface ClassifyOptions {
  only: string[] | null;
  includeTest: boolean;
  includePending: boolean;
}

export type Classification =
  | { action: 'fix'; activate: boolean }
  | { action: 'ignore' }
  | { action: 'skip'; reason: string };

/**
 * Decide what to do with one orphaned user. Pure and side-effect free so the
 * selection rules — the part that decides whose production account gets written
 * to — can be tested directly. 'ignore' means "not in scope, say nothing".
 */
export function classifyOrphan(
  user: { email: string; status: string; metadata?: Record<string, any> | null },
  opts: ClassifyOptions,
): Classification {
  const targeted = opts.only ? opts.only.includes(user.email.toLowerCase()) : false;

  if (opts.only && !targeted) {
    return { action: 'ignore' };
  }

  // Business partners get their code at admin approval - never auto-assign one.
  // This holds even for --only, so an explicit flag can never mint a code that is
  // supposed to be chosen by an administrator.
  if (user.metadata?.registrationMethod === 'self_registration_business') {
    return { action: 'skip', reason: 'business partner - code assigned at approval' };
  }

  // --only is an explicit instruction, so it overrides the filters below.
  if (!opts.only) {
    if (!opts.includeTest && isTestAccount(user.email)) {
      return { action: 'skip', reason: 'test/QA account' };
    }
    if (!opts.includePending && user.status !== 'active') {
      return { action: 'skip', reason: `status ${user.status} - needs --include-pending` };
    }
  }

  // An ACTIVE user has verified their email and logged in, so their agent profile
  // should be activated too, exactly as activateAgentOnFirstLogin would have.
  return { action: 'fix', activate: user.status === 'active' };
}

function parseOnlyList(): string[] | null {
  const arg = process.argv.find((a) => a.startsWith('--only='));
  if (!arg) return null;
  const emails = arg
    .slice('--only='.length)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return emails.length ? emails : null;
}

interface Outcome {
  email: string;
  agentCode?: string;
  agentStatus?: string;
  emailSent?: boolean;
  skipped?: string;
  error?: string;
}

async function backfillMissingAgentProfiles() {
  const apply = process.argv.includes('--apply');
  const includePending = process.argv.includes('--include-pending');
  const includeTest = process.argv.includes('--include-test');
  const sendEmails = !process.argv.includes('--no-email');
  const only = parseOnlyList();

  console.log(
    apply
      ? 'APPLY mode - agent profiles WILL be created' +
          (sendEmails ? ' and welcome emails WILL be sent.' : ' (emails suppressed).')
      : 'DRY RUN - nothing will be written and no email will be sent. Add --apply to commit.',
  );

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const agentsRepository = app.get<Repository<Agent>>(getRepositoryToken(Agent));
    const agentsService = app.get(AgentsService);

    // Every agent-role user with no agent row.
    const orphans = await usersRepository
      .createQueryBuilder('user')
      .leftJoin(Agent, 'agent', 'agent.userId = user.id')
      .where('user.role = :role', { role: UserRole.AGENT })
      .andWhere('agent.id IS NULL')
      .orderBy('user.createdAt', 'DESC')
      .getMany();

    console.log(`\nFound ${orphans.length} agent-role users with no agent profile\n`);

    const outcomes: Outcome[] = [];

    for (const user of orphans) {
      const email = user.email;

      const decision = classifyOrphan(user, { only, includeTest, includePending });
      if (decision.action === 'ignore') continue;
      if (decision.action === 'skip') {
        outcomes.push({ email, skipped: decision.reason });
        continue;
      }

      // Idempotency guard: re-check immediately before writing, in case a live
      // registration or an earlier run already created the row.
      const existing = await agentsRepository.findOne({ where: { userId: user.id } });
      if (existing) {
        outcomes.push({
          email,
          agentCode: existing.agentCode,
          skipped: 'already has an agent profile',
        });
        continue;
      }

      const willActivate = decision.activate;

      if (!apply) {
        console.log(
          `  WOULD FIX  ${email}  (user ${user.status})` +
            ` -> create agent profile, status ${willActivate ? 'active' : 'pending_application'}` +
            (sendEmails && willActivate ? ', send welcome email' : ''),
        );
        outcomes.push({
          email,
          agentCode: '(next free PTA)',
          agentStatus: willActivate ? 'active' : 'pending_application',
        });
        continue;
      }

      try {
        // Step 1 - allocate the code and create the profile, the same call registration makes.
        const created = await agentsService.createPendingAgentWithReferralData(user);
        const agentId = created.agent.id;
        const agentCode = created.agentCode;

        // Step 2 - a user who is already ACTIVE has verified their email and logged in,
        // so mirror what activateAgentOnFirstLogin would have done for them.
        let agentStatus: string = AgentStatus.PENDING_APPLICATION;
        if (willActivate) {
          const now = new Date();
          await agentsRepository.update(agentId, {
            status: AgentStatus.ACTIVE,
            activatedAt: now,
            lastActivityAt: now,
            metadata: {
              ...created.agent.metadata,
              pendingVerification: false,
              activatedAt: now.toISOString(),
              activatedBy: 'backfill_missing_agent_profile',
              backfillReason: 'pta_pool_exhausted_no_transaction_on_registration',
              backfilledAt: now.toISOString(),
            },
          });
          agentStatus = AgentStatus.ACTIVE;
        }

        // Step 3 - deliver the code they never received.
        let emailSent = false;
        if (sendEmails && willActivate) {
          const agent = await agentsRepository.findOne({ where: { id: agentId } });
          try {
            await agentsService.sendAgentWelcomeEmail(user, agent!);
            emailSent = true;
          } catch (mailErr: any) {
            // The profile is the important part - never roll it back over a mail failure.
            console.error(
              `     welcome email FAILED for ${email}: ${mailErr?.message ?? mailErr}`,
            );
          }
        }

        console.log(
          `  FIXED      ${email}  -> ${agentCode}  (agent ${agentStatus})` +
            (sendEmails && willActivate ? `  email ${emailSent ? 'sent' : 'FAILED'}` : ''),
        );
        outcomes.push({ email, agentCode, agentStatus, emailSent });
      } catch (err: any) {
        console.error(`  FAILED     ${email}: ${err?.message ?? err}`);
        outcomes.push({ email, error: err?.message ?? String(err) });
      }
    }

    const fixed = outcomes.filter((o) => o.agentCode && !o.skipped && !o.error);
    const skipped = outcomes.filter((o) => o.skipped);
    const failed = outcomes.filter((o) => o.error);

    console.log('\n' + '-'.repeat(72));
    console.log(
      `${apply ? 'Fixed' : 'Would fix'}: ${fixed.length}   Skipped: ${skipped.length}   Failed: ${failed.length}`,
    );

    if (skipped.length) {
      console.log('\nSkipped:');
      const bySkipReason = new Map<string, string[]>();
      for (const s of skipped) {
        const list = bySkipReason.get(s.skipped!) ?? [];
        list.push(s.email);
        bySkipReason.set(s.skipped!, list);
      }
      for (const [reason, emails] of bySkipReason) {
        console.log(`  ${reason} (${emails.length}): ${emails.join(', ')}`);
      }
    }

    if (failed.length) {
      console.log('\nFailed - safe to re-run, the script is idempotent:');
      for (const f of failed) console.log(`  ${f.email}: ${f.error}`);
    }

    if (apply) {
      const pendingOnes = fixed.filter((f) => f.agentStatus === AgentStatus.PENDING_APPLICATION);
      if (pendingOnes.length) {
        console.log(
          `\nNote: ${pendingOnes.length} profile(s) created in pending_application with no email -` +
            ' those users still need to verify their address, and activate on first login.',
        );
      }
    }

    if (!apply && fixed.length > 0) {
      console.log('\nRe-run with --apply to commit. Consider a single --only=<email> canary first.');
    }
  } catch (error) {
    console.error('Error backfilling agent profiles:', error);
    throw error;
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  backfillMissingAgentProfiles()
    .then(() => {
      console.log('Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
