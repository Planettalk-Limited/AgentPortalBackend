import { calculateUploadedAvailableBalance } from './agents.constants';

describe('calculateUploadedAvailableBalance', () => {
  const upload = { totalEarnings: '10.00', totalReferralBonusIncome: 6, totalPayoutAmount: 5 };

  it('matches the billing-system formula for a partner with no welcome credit', () => {
    expect(calculateUploadedAvailableBalance(upload)).toBe(11);
  });

  it('keeps the welcome credit through an upload that does not know about it', () => {
    expect(calculateUploadedAvailableBalance({ ...upload, welcomeCreditAmount: 3 })).toBe(14);
  });

  it('a brand new partner with an all-zero upload still shows the $3', () => {
    expect(
      calculateUploadedAvailableBalance({
        totalEarnings: 0,
        totalReferralBonusIncome: 0,
        totalPayoutAmount: 0,
        welcomeCreditAmount: 3,
      }),
    ).toBe(3);
  });
});
