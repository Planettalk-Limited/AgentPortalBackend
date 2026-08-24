import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { Agent, AgentStatus } from '../modules/agents/entities/agent.entity';
import { AgentsService } from '../modules/agents/agents.service';

/**
 * Activate agent profiles that email verification left behind.
 *
 * ROOT CAUSE: registration created the profile as pending_application, and verifying
 * the email promoted only the USER to active - nothing promoted the agent. Since
 * validateReferralCode() refuses any code whose agent is not active, those partners
 * were emailed a code that silently failed for everyone who tried to use it.
 * auth.service.ts now activates the profile at verification; this repairs the
 * profiles created before that fix.
 *
 * Scope is deliberately narrow - only self-registered individual partners whose user
 * account is active AND whose email is verified, sitting at pending_application. It
 * uses the same AgentsService transition production now uses, which by construction
 * never touches a suspended or inactive profile an admin switched off.
 *
 * Usage (dry run - prints the status distribution and the plan, writes nothing):
 *   npx ts-node src/scripts/activate-verified-partner-agents.ts
 * Apply:
 *   npx ts-node src/scripts/activate-verified-partner-agents.ts --apply
 *
 * Sends no email: these partners already received their welcome email, carrying the
 * code, when they verified. This only makes that code work.
 */
async function activateVerifiedPartnerAgents() {
  const apply = process.argv.includes('--apply');

  console.log(
    apply
      ? 'APPLY mode - agent profiles WILL be activated. No emails are sent.'
      : 'DRY RUN - nothing will be written. Add --apply to commit.',
  );

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const agentsRepository = app.get<Repository<Agent>>(getRepositoryToken(Agent));
    const agentsService = app.get(AgentsService);

    // Print the whole distribution first: it shows at a glance whether pending
    // profiles are the norm (the bug) or the exception.
    const distribution = await agentsRepository
      .createQueryBuilder('agent')
      .select('agent.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('agent.status')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    console.log('\nAgent status distribution:');
    for (const row of distribution) {
      console.log(`  ${String(row.status).padEnd(22)} ${row.count}`);
    }

    // Self-registered individuals who verified their email but whose profile was
    // never promoted out of pending_application.
    const stuck = await usersRepository
      .createQueryBuilder('user')
      .innerJoin(Agent, 'agent', 'agent.userId = user.id')
      .where('user.role = :role', { role: UserRole.AGENT })
      .andWhere('user.status = :userStatus', { userStatus: 'active' })
      .andWhere('user.emailVerifiedAt IS NOT NULL')
      .andWhere('agent.status = :agentStatus', {
        agentStatus: AgentStatus.PENDING_APPLICATION,
      })
      // "user" must stay quoted: it is a reserved word in Postgres, and TypeORM does
      // not rewrite identifiers inside a raw fragment like this one.
      .andWhere(
        `COALESCE("user"."metadata"->>'registrationMethod', '') <> :business`,
        { business: 'self_registration_business' },
      )
      .orderBy('user.createdAt', 'ASC')
      .getMany();

    console.log(
      `\n${stuck.length} verified individual partner(s) with a profile stuck at pending_application\n`,
    );

    let changed = 0;
    let failed = 0;

    for (const user of stuck) {
      if (!apply) {
        console.log(`  WOULD ACTIVATE  ${user.email}`);
        changed++;
        continue;
      }

      try {
        const agent = await agentsService.activateAgentAfterEmailVerification(user.id);
        if (agent?.status === AgentStatus.ACTIVE) {
          console.log(`  ACTIVATED       ${user.email}  -> ${agent.agentCode}`);
          changed++;
        } else {
          // The shared transition declined it - a status it refuses to overwrite.
          console.log(`  LEFT ALONE      ${user.email}  (status ${agent?.status ?? 'no profile'})`);
        }
      } catch (err: any) {
        console.error(`  FAILED          ${user.email}: ${err?.message ?? err}`);
        failed++;
      }
    }

    console.log('\n' + '-'.repeat(72));
    console.log(`${apply ? 'Activated' : 'Would activate'}: ${changed}   Failed: ${failed}`);

    if (!apply && changed > 0) {
      console.log('\nRe-run with --apply to commit.');
    }
  } catch (error) {
    console.error('Error activating verified partner agents:', error);
    throw error;
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  activateVerifiedPartnerAgents()
    .then(() => {
      console.log('Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
