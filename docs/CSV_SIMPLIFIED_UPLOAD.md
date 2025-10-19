# Simplified CSV Upload - Auto-Calculated Available Balance

## What Changed?

✅ **`availableBalance` is now OPTIONAL**  
✅ **Automatically calculated** if you provide `totalEarnings` and `totalPayoutAmount`  
✅ **Formula**: `availableBalance = totalEarnings - totalPayoutAmount`

---

## Before (Required 7 Fields)

```json
{
  "agentsData": [
    {
      "agentCode": "AGT21618",
      "totalEarnings": 125.50,
      "earningsForCurrentMonth": 25.50,
      "totalReferrals": 45,
      "referralsForCurrentMonth": 5,
      "availableBalance": 100.00,        ❌ Had to calculate manually
      "totalPayoutAmount": 25.50
    }
  ]
}
```

---

## Now (6 Required Fields + 1 Auto-Calculated)

```json
{
  "agentsData": [
    {
      "agentCode": "AGT21618",
      "totalEarnings": 125.50,
      "earningsForCurrentMonth": 25.50,
      "totalReferrals": 45,
      "referralsForCurrentMonth": 5,
      // "availableBalance": 100.00,     ✅ OPTIONAL - Calculated automatically!
      "totalPayoutAmount": 25.50
    }
  ]
}

// Backend calculates: availableBalance = 125.50 - 25.50 = 100.00
```

---

## Simplified CSV Structure

### Before (7 columns):
```csv
Agent Code,Total Earnings,Earnings Current Month,Total Referrals,Referrals Current Month,Available Balance,Total Payout
AGT21618,125.50,25.50,45,5,100.00,25.50
```

### Now (6 columns):
```csv
Agent Code,Total Earnings,Earnings Current Month,Total Referrals,Referrals Current Month,Total Payout
AGT21618,125.50,25.50,45,5,25.50
```

**Available Balance calculated automatically as**: `125.50 - 25.50 = 100.00` ✅

---

## How It Works

### Auto-Calculation Logic:

```typescript
if (totalEarnings && totalPayoutAmount provided) {
  availableBalance = totalEarnings - totalPayoutAmount
}

// Example:
totalEarnings: 125.50
totalPayoutAmount: 25.50
→ availableBalance: 100.00 (calculated automatically)
```

### Still Want to Provide It Manually?

You can still provide `availableBalance` if you want:

```json
{
  "agentCode": "AGT21618",
  "totalEarnings": 125.50,
  "availableBalance": 100.00,  // Manual override
  "totalPayoutAmount": 25.50
}
```

If provided, it will use your value instead of calculating.

---

## Updated Field Requirements

| Field | Required | Auto-Calculated | Notes |
|-------|----------|-----------------|-------|
| `agentCode` | ✅ Yes | No | Unique agent identifier |
| `totalEarnings` | ✅ Yes | No | All-time total earnings |
| `earningsForCurrentMonth` | ✅ Yes | No | This month's earnings |
| `totalReferrals` | ✅ Yes | No | All-time referrals |
| `referralsForCurrentMonth` | ✅ Yes | No | This month's referrals |
| `totalPayoutAmount` | ✅ Yes | No | All-time payouts |
| `availableBalance` | ⚪ Optional | ✅ **Yes** | Calculated as `totalEarnings - totalPayoutAmount` |
| `availableMonth` | ⚪ Optional | No | Month for data (YYYY-MM) |

---

## Complete Example

### Request (Simplified - No availableBalance)

```json
POST /admin/earnings/bulk-upload-data

{
  "agentsData": [
    {
      "agentCode": "AGT21618",
      "totalEarnings": 125.50,
      "earningsForCurrentMonth": 25.50,
      "totalReferrals": 45,
      "referralsForCurrentMonth": 5,
      "totalPayoutAmount": 25.50
    },
    {
      "agentCode": "AGT92654",
      "totalEarnings": 250.00,
      "earningsForCurrentMonth": 50.00,
      "totalReferrals": 80,
      "referralsForCurrentMonth": 10,
      "totalPayoutAmount": 50.00
    },
    {
      "agentCode": "AGT88012",
      "totalEarnings": 95.25,
      "earningsForCurrentMonth": 20.25,
      "totalReferrals": 30,
      "referralsForCurrentMonth": 4,
      "totalPayoutAmount": 15.25
    }
  ],
  "batchDescription": "CSV Upload - 10/19/2025",
  "autoUpdate": true,
  "metadata": {
    "filename": "agent_earnings.csv",
    "uploadSource": "Admin Panel"
  }
}
```

### Backend Calculations

```
AGT21618: 125.50 - 25.50 = 100.00 ✅
AGT92654: 250.00 - 50.00 = 200.00 ✅
AGT88012: 95.25 - 15.25 = 80.00 ✅
```

### Response

```json
{
  "totalProcessed": 3,
  "successful": 3,
  "failed": 0,
  "details": [
    {
      "agentCode": "AGT21618",
      "status": "success",
      "message": "Agent data updated successfully",
      "updatedFields": [
        "totalEarnings",
        "availableBalance (calculated)",  // ← Shows it was calculated
        "totalReferrals",
        "currentMonthEarnings",
        "currentMonthReferrals",
        "totalPayoutAmount"
      ]
    },
    {
      "agentCode": "AGT92654",
      "status": "success",
      "message": "Agent data updated successfully",
      "updatedFields": [
        "totalEarnings",
        "availableBalance (calculated)",
        "totalReferrals",
        "currentMonthEarnings",
        "currentMonthReferrals",
        "totalPayoutAmount"
      ]
    },
    {
      "agentCode": "AGT88012",
      "status": "success",
      "message": "Agent data updated successfully",
      "updatedFields": [
        "totalEarnings",
        "availableBalance (calculated)",
        "totalReferrals",
        "currentMonthEarnings",
        "currentMonthReferrals",
        "totalPayoutAmount"
      ]
    }
  ],
  "batchId": "DATA-BATCH-1760868824252-abc123",
  "uploadedAt": "2025-10-19T10:13:44.252Z"
}
```

Notice the `"availableBalance (calculated)"` in `updatedFields` - this shows the balance was auto-calculated!

---

## Benefits

✅ **Simpler CSV** - One less column to manage  
✅ **No Manual Calculation** - Backend does the math  
✅ **Less Errors** - Can't have mismatched balances  
✅ **Still Flexible** - Can override if needed  
✅ **Clear Feedback** - Response shows when calculated  

---

## Migration Guide

### If You're Already Using This Endpoint:

**Option 1: Keep your current CSV (backwards compatible)**
- Your existing CSVs with `availableBalance` will still work
- No changes needed

**Option 2: Simplify your CSV (recommended)**
- Remove the `Available Balance` column from your CSV
- Backend will calculate it automatically
- Cleaner, simpler data entry

---

## Formula Reference

```
Available Balance = Total Earnings - Total Payout Amount
```

**Examples:**

| Total Earnings | Total Payouts | Available Balance (Calculated) |
|----------------|---------------|--------------------------------|
| $125.50 | $25.50 | $100.00 |
| $250.00 | $50.00 | $200.00 |
| $95.25 | $15.25 | $80.00 |
| $1000.00 | $0.00 | $1000.00 |
| $500.00 | $500.00 | $0.00 |

---

## Endpoint

```
POST /admin/earnings/bulk-upload-data
```

**Required Fields** (6):
1. agentCode
2. totalEarnings
3. earningsForCurrentMonth
4. totalReferrals
5. referralsForCurrentMonth
6. totalPayoutAmount

**Optional Fields** (2):
7. availableBalance (auto-calculated if not provided)
8. availableMonth

---

## Summary

🎉 **The math now happens automatically!**

You provide:
- ✅ Total Earnings
- ✅ Total Payout Amount

Backend calculates:
- ✅ Available Balance = Total Earnings - Total Payout Amount

**No more "THE MATHS IS NOT MATHING" - the backend handles it!** 🚀

