import { calculateUploadedAvailableBalance, findUploadedEarningsProblem } from './agents.constants';

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

describe('findUploadedEarningsProblem', () => {
  it('accepts a normal row', () => {
    expect(
      findUploadedEarningsProblem({ totalEarnings: 44.05, earningsForCurrentMonth: 5.36 }, 38.69),
    ).toBeNull();
  });

  it('rejects a total lower than the same row\'s current-month earnings', () => {
    // PTA0019 in the 4 Nov 2026 batch: month 5.36, total arrived as 0
    expect(
      findUploadedEarningsProblem({ totalEarnings: 0, earningsForCurrentMonth: 5.36 }, 0),
    ).toMatch(/less than/i);
  });

  it('rejects a zero total that would wipe an existing non-zero total', () => {
    expect(
      findUploadedEarningsProblem({ totalEarnings: 0, earningsForCurrentMonth: 0 }, 33.47),
    ).toMatch(/would reset/i);
  });

  it('accepts an all-zero row for a partner who has never earned', () => {
    expect(
      findUploadedEarningsProblem({ totalEarnings: 0, earningsForCurrentMonth: 0 }, 0),
    ).toBeNull();
  });

  it('accepts a downward correction that is not a reset to zero', () => {
    expect(
      findUploadedEarningsProblem({ totalEarnings: 19.93, earningsForCurrentMonth: 1.34 }, 28.57),
    ).toBeNull();
  });

  it('treats numeric strings from the database the same as numbers', () => {
    expect(
      findUploadedEarningsProblem({ totalEarnings: 0, earningsForCurrentMonth: 0 }, '33.47'),
    ).toMatch(/would reset/i);
  });
});
