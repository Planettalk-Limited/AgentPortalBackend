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
