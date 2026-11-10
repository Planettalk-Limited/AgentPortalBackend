/** Preloaded into every newly verified partner's wallet (USD). */
export const WELCOME_CREDIT_AMOUNT = 3;

/**
 * Payout balance as the external stats upload defines it, plus the welcome credit.
 * The upload's figures come from the billing system, which has never heard of the
 * credit, so without adding it back every upload would silently erase the $3.
 */
export function calculateUploadedAvailableBalance(input: {
  totalEarnings: number | string;
  totalReferralBonusIncome: number | string;
  totalPayoutAmount: number | string;
  welcomeCreditAmount?: number | string;
}): number {
  return (
    Number(input.totalEarnings) +
    Number(input.totalReferralBonusIncome) +
    Number(input.welcomeCreditAmount ?? 0) -
    Number(input.totalPayoutAmount)
  );
}

/**
 * Sanity-checks one row of a bulk earnings upload before it overwrites the stored total.
 * Returns a human-readable reason to reject the row, or null when it is safe to apply.
 *
 * The 4 Nov 2026 upload sent totalEarnings = 0 for 24 of 25 partners (blank column in
 * the source sheet) and every row reported "success", wiping their totals. Both checks
 * below would have caught that.
 */
export function findUploadedEarningsProblem(
  row: { totalEarnings: number | string; earningsForCurrentMonth: number | string },
  storedTotalEarnings: number | string | null | undefined,
): string | null {
  const total = Number(row.totalEarnings);
  const month = Number(row.earningsForCurrentMonth);
  const stored = Number(storedTotalEarnings ?? 0);

  if (total < month) {
    return `Total earnings (${total.toFixed(2)}) is less than earnings for the current month (${month.toFixed(2)}). Check the Total Earnings column in the file.`;
  }
  if (total === 0 && stored > 0) {
    return `Total earnings of 0 would reset this partner's existing total of ${stored.toFixed(2)}. Check the Total Earnings column in the file.`;
  }
  return null;
}
