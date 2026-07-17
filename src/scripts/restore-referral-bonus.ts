import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Agent } from '../modules/agents/entities/agent.entity';
import * as fs from 'fs';

/**
 * Restore referral bonus income that was wiped by a CSV upload whose export
 * omitted the bonus columns (batch DATA-BATCH-1783958614749-sozf5y7po and any
 * other upload missing those columns before the parser fix).
 *
 * This is SURGICAL: it updates ONLY totalReferralBonusIncome and
 * referralBonusIncomeCurrentMonth, then recalculates availableBalance using the
 * exact same formula as the bulk upload (agents.service.ts):
 *     availableBalance = totalEarnings + totalReferralBonusIncome - totalPayoutAmount
 * It creates NO agent_earnings records, so there is no risk of duplicates.
 *
 * Input: a CSV exported from the source spreadsheet containing at least:
 *   Agent Code, Total Referral Bonus Income, Referral Bonus Income for Current Month
 * (extra columns are ignored). Agents absent from the CSV are left untouched.
 *
 * Usage (dry run — prints what WOULD change, writes nothing):
 *   npx ts-node src/scripts/restore-referral-bonus.ts <path-to-corrected.csv>
 * Apply for real:
 *   npx ts-node src/scripts/restore-referral-bonus.ts <path-to-corrected.csv> --apply
 */

interface BonusRow {
  agentCode: string;
  totalReferralBonusIncome?: number;
  referralBonusIncomeCurrentMonth?: number;
}

function parseCsv(path: string): BonusRow[] {
  const text = fs.readFileSync(path, 'utf8');
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) {
    throw new Error('CSV appears to be empty or has no data rows');
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/ /g, '_'));
  const agentCodeIndex = headers.findIndex((h) => h.includes('agent'));
  // Match the same way the admin UI parser does, so column detection is identical.
  const totalBonusIndex = headers.findIndex(
    (h) => h.includes('referral') && h.includes('bonus') && !(h.includes('current') && h.includes('month')),
  );
  const currentMonthBonusIndex = headers.findIndex(
    (h) => h.includes('current') && h.includes('month') && h.includes('referral') && h.includes('bonus'),
  );

  if (agentCodeIndex === -1) {
    throw new Error('CSV must contain an "Agent Code" column');
  }
  if (totalBonusIndex === -1 && currentMonthBonusIndex === -1) {
    throw new Error(
      'CSV must contain at least one bonus column: "Total Referral Bonus Income" or "Referral Bonus Income for Current Month"',
    );
  }

  const rows: BonusRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const agentCode = cols[agentCodeIndex];
    if (!agentCode) continue;

    const row: BonusRow = { agentCode };
    if (totalBonusIndex !== -1 && cols[totalBonusIndex] !== undefined && cols[totalBonusIndex] !== '') {
      row.totalReferralBonusIncome = parseFloat(cols[totalBonusIndex]) || 0;
    }
    if (
      currentMonthBonusIndex !== -1 &&
      cols[currentMonthBonusIndex] !== undefined &&
      cols[currentMonthBonusIndex] !== ''
    ) {
      row.referralBonusIncomeCurrentMonth = parseFloat(cols[currentMonthBonusIndex]) || 0;
    }
    rows.push(row);
  }
  return rows;
}

async function restoreReferralBonus() {
  const csvPath = process.argv[2];
  const apply = process.argv.includes('--apply');

  if (!csvPath) {
    console.error('❌ Usage: npx ts-node src/scripts/restore-referral-bonus.ts <path-to-corrected.csv> [--apply]');
    process.exit(1);
  }

  const rows = parseCsv(csvPath);
  console.log(`📄 Parsed ${rows.length} rows from ${csvPath}`);
  console.log(apply ? '⚠️  APPLY mode — changes WILL be written.' : '🔍 DRY RUN — no changes will be written. Add --apply to commit.');

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const agentsRepository = app.get<Repository<Agent>>(getRepositoryToken(Agent));

    let updated = 0;
    let unchanged = 0;
    let notFound = 0;

    for (const row of rows) {
      const agent = await agentsRepository.findOne({ where: { agentCode: row.agentCode } });
      if (!agent) {
        console.log(`  ⚠️  ${row.agentCode}: not found — skipped`);
        notFound++;
        continue;
      }

      const currentTotalBonus = Number(agent.totalReferralBonusIncome) || 0;
      const currentMonthBonus = Number(agent.referralBonusIncomeCurrentMonth) || 0;

      const newTotalBonus = row.totalReferralBonusIncome ?? currentTotalBonus;
      const newMonthBonus = row.referralBonusIncomeCurrentMonth ?? currentMonthBonus;

      // Same availableBalance formula as the bulk upload path.
      const totalEarnings = Number(agent.totalEarnings) || 0;
      const totalPayout = Number(agent.metadata?.totalPayoutAmount) || 0;
      const newAvailableBalance = totalEarnings + newTotalBonus - totalPayout;
      const currentAvailableBalance = Number(agent.availableBalance) || 0;

      const bonusChanged = newTotalBonus !== currentTotalBonus || newMonthBonus !== currentMonthBonus;
      const balanceChanged = newAvailableBalance !== currentAvailableBalance;

      if (!bonusChanged && !balanceChanged) {
        unchanged++;
        continue;
      }

      console.log(
        `  ${row.agentCode}: bonus ${currentTotalBonus} → ${newTotalBonus}` +
          ` | month ${currentMonthBonus} → ${newMonthBonus}` +
          ` | available ${currentAvailableBalance} → ${newAvailableBalance.toFixed(2)}`,
      );

      if (apply) {
        await agentsRepository.update(agent.id, {
          totalReferralBonusIncome: newTotalBonus,
          referralBonusIncomeCurrentMonth: newMonthBonus,
          availableBalance: newAvailableBalance,
        });
      }
      updated++;
    }

    console.log(`\n📋 Summary: ${updated} ${apply ? 'updated' : 'would update'}, ${unchanged} unchanged, ${notFound} not found`);
    if (!apply && updated > 0) {
      console.log('➡️  Re-run with --apply to write these changes.');
    }
  } catch (error) {
    console.error('❌ Error restoring referral bonus:', error);
    throw error;
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  restoreReferralBonus()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}
