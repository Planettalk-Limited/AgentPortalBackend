# CSV Earnings Upload Guide

## Quick Reference

**Use This Endpoint**: `POST /admin/earnings/bulk-upload-data`

This endpoint is designed specifically for CSV uploads with simplified agent data.

---

## CSV Structure

Your CSV should have these columns:

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| Agent Code | Unique agent identifier | ✅ Yes | AGT21618 |
| Total Earnings | All-time total earnings | ✅ Yes | 125.50 |
| Earnings for Current Month | This month's earnings | ✅ Yes | 25.50 |
| Total Referrals | All-time referral count | ✅ Yes | 45 |
| Referrals for Current Month | This month's referrals | ✅ Yes | 5 |
| Available Balance | Current available balance | ✅ Yes | 100.00 |
| Total Payout Amount | All-time payouts | ✅ Yes | 25.50 |
| Available Month | Month for data (YYYY-MM) | ⚪ Optional | 2025-10 |

---

## Request Format

### Endpoint
```
POST /admin/earnings/bulk-upload-data
```

### Headers
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

### Request Body

```json
{
  "agentsData": [
    {
      "agentCode": "AGT21618",
      "totalEarnings": 125.50,
      "earningsForCurrentMonth": 25.50,
      "totalReferrals": 45,
      "referralsForCurrentMonth": 5,
      "availableBalance": 100.00,
      "totalPayoutAmount": 25.50,
      "availableMonth": "2025-10"
    },
    {
      "agentCode": "AGT92654",
      "totalEarnings": 250.00,
      "earningsForCurrentMonth": 50.00,
      "totalReferrals": 80,
      "referralsForCurrentMonth": 10,
      "availableBalance": 200.00,
      "totalPayoutAmount": 50.00
    }
  ],
  "batchDescription": "CSV Upload - 10/19/2025, 11:46:33 AM",
  "autoUpdate": true,
  "metadata": {
    "filename": "earnings_import_sample.csv",
    "uploadSource": "Admin Panel CSV"
  }
}
```

---

## Complete Example with Your Data

```bash
POST /admin/earnings/bulk-upload-data
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "agentsData": [
    {
      "agentCode": "AGT21618",
      "totalEarnings": 125.50,
      "earningsForCurrentMonth": 25.50,
      "totalReferrals": 45,
      "referralsForCurrentMonth": 5,
      "availableBalance": 100.00,
      "totalPayoutAmount": 25.50
    },
    {
      "agentCode": "AGT92654",
      "totalEarnings": 250.00,
      "earningsForCurrentMonth": 50.00,
      "totalReferrals": 80,
      "referralsForCurrentMonth": 10,
      "availableBalance": 200.00,
      "totalPayoutAmount": 50.00
    },
    {
      "agentCode": "AGT24157",
      "totalEarnings": 175.75,
      "earningsForCurrentMonth": 15.75,
      "totalReferrals": 60,
      "referralsForCurrentMonth": 3,
      "availableBalance": 160.00,
      "totalPayoutAmount": 15.75
    },
    {
      "agentCode": "AGT15616",
      "totalEarnings": 110.00,
      "earningsForCurrentMonth": 10.00,
      "totalReferrals": 38,
      "referralsForCurrentMonth": 2,
      "availableBalance": 100.00,
      "totalPayoutAmount": 10.00
    },
    {
      "agentCode": "AGT59116",
      "totalEarnings": 221.00,
      "earningsForCurrentMonth": 21.00,
      "totalReferrals": 72,
      "referralsForCurrentMonth": 4,
      "availableBalance": 200.00,
      "totalPayoutAmount": 21.00
    },
    {
      "agentCode": "AGT89302",
      "totalEarnings": 53.00,
      "earningsForCurrentMonth": 3.00,
      "totalReferrals": 18,
      "referralsForCurrentMonth": 1,
      "availableBalance": 50.00,
      "totalPayoutAmount": 3.00
    },
    {
      "agentCode": "AGT68581",
      "totalEarnings": 64.00,
      "earningsForCurrentMonth": 4.00,
      "totalReferrals": 22,
      "referralsForCurrentMonth": 1,
      "availableBalance": 60.00,
      "totalPayoutAmount": 4.00
    },
    {
      "agentCode": "AGT02440",
      "totalEarnings": 109.00,
      "earningsForCurrentMonth": 9.00,
      "totalReferrals": 35,
      "referralsForCurrentMonth": 2,
      "availableBalance": 100.00,
      "totalPayoutAmount": 9.00
    },
    {
      "agentCode": "AGT94118",
      "totalEarnings": 53.00,
      "earningsForCurrentMonth": 3.00,
      "totalReferrals": 18,
      "referralsForCurrentMonth": 1,
      "availableBalance": 50.00,
      "totalPayoutAmount": 3.00
    }
  ],
  "batchDescription": "CSV Upload - 10/19/2025, 11:46:33 AM",
  "autoUpdate": true,
  "metadata": {
    "filename": "earnings_import_sample.csv",
    "uploadSource": "Admin Panel CSV"
  }
}
```

---

## Success Response

```json
{
  "totalProcessed": 9,
  "successful": 9,
  "failed": 0,
  "details": [
    {
      "agentCode": "AGT21618",
      "status": "success",
      "message": "Agent data updated successfully",
      "updatedFields": ["totalEarnings", "availableBalance", "totalReferrals"]
    },
    {
      "agentCode": "AGT92654",
      "status": "success",
      "message": "Agent data updated successfully",
      "updatedFields": ["totalEarnings", "availableBalance", "totalReferrals"]
    }
    // ... more results
  ],
  "batchId": "DATA-BATCH-1729338393000-abc123xyz",
  "uploadedAt": "2025-10-19T10:46:33.000Z"
}
```

---

## Field Descriptions

### Required Fields

**`agentCode`** (string, max 20 chars)
- The unique agent identifier
- Must exist in the database
- Example: "AGT21618"

**`totalEarnings`** (number, 2 decimals, min 0)
- All-time total earnings for the agent
- Example: 125.50

**`earningsForCurrentMonth`** (number, 2 decimals, min 0)
- Earnings for the current/specified month
- Example: 25.50

**`totalReferrals`** (integer, min 0)
- All-time total number of referrals
- Example: 45

**`referralsForCurrentMonth`** (integer, min 0)
- Number of referrals for current/specified month
- Example: 5

**`availableBalance`** (number, 2 decimals, min 0)
- Current available balance for payout
- Example: 100.00

**`totalPayoutAmount`** (number, 2 decimals, min 0)
- All-time total amount paid out
- Example: 25.50

### Optional Fields

**`availableMonth`** (string, format: YYYY-MM)
- Month for which the data applies
- Example: "2025-10"
- Stored in agent metadata

---

## What Gets Updated

When you upload data, the system updates:

1. **Direct Agent Fields**:
   - `totalEarnings`
   - `availableBalance`
   - `totalReferrals`

2. **Agent Metadata** (stored in JSON):
   - `monthlyEarnings` (current month earnings)
   - `monthlyReferrals` (current month referrals)
   - `totalPayouts` (total payout amount)
   - `dataMonth` (month of data)
   - `lastDataUpload` (timestamp)
   - `uploadSource` (from metadata)

---

## Request Parameters

### `agentsData` (required)
Array of agent data objects. Minimum 1 agent.

### `batchDescription` (optional)
Description for tracking this batch upload.
Example: "CSV Upload - 10/19/2025, 11:46:33 AM"

### `autoUpdate` (optional, default: true)
Whether to immediately update agent balances.
- `true`: Updates applied immediately
- `false`: Data validated but not applied

### `metadata` (optional)
Additional tracking information.
Example:
```json
{
  "filename": "earnings_import_sample.csv",
  "uploadSource": "Admin Panel CSV",
  "uploadedBy": "admin@example.com"
}
```

---

## Error Handling

### Agent Not Found
```json
{
  "totalProcessed": 2,
  "successful": 1,
  "failed": 1,
  "details": [
    {
      "agentCode": "AGT99999",
      "status": "error",
      "error": "Agent not found with code: AGT99999"
    },
    {
      "agentCode": "AGT21618",
      "status": "success",
      "message": "Agent data updated successfully"
    }
  ]
}
```

### Validation Errors
```json
{
  "statusCode": 400,
  "message": [
    "totalEarnings must not be less than 0",
    "agentCode should not be empty"
  ],
  "error": "Bad Request"
}
```

---

## Comparison: Two Endpoints

### ❌ DON'T USE: `/admin/earnings/bulk-upload`
**Purpose**: Create detailed earning records with full transaction history

**Use When**: You need to track individual transactions with:
- Transaction types (commission, bonus, penalty)
- Reference IDs
- Commission rates per transaction
- Specific earned dates
- Individual descriptions

**Example**: Recording each individual customer referral as a separate earning

### ✅ USE THIS: `/admin/earnings/bulk-upload-data`
**Purpose**: Update agent summary data from CSV exports

**Use When**: You have CSV data with:
- Aggregated totals
- Monthly summaries
- Balance snapshots
- Payout totals

**Example**: Monthly CSV export from external system with agent totals

---

## CSV to JSON Conversion

If your CSV looks like this:

```csv
Agent Code,Total Earnings,Earnings for Current Month,Total Referrals,Referrals for Current Month,Available Balance,Total Payout Amount
AGT21618,125.50,25.50,45,5,100.00,25.50
AGT92654,250.00,50.00,80,10,200.00,50.00
AGT24157,175.75,15.75,60,3,160.00,15.75
```

Convert to JSON:

```json
{
  "agentsData": [
    {
      "agentCode": "AGT21618",
      "totalEarnings": 125.50,
      "earningsForCurrentMonth": 25.50,
      "totalReferrals": 45,
      "referralsForCurrentMonth": 5,
      "availableBalance": 100.00,
      "totalPayoutAmount": 25.50
    },
    {
      "agentCode": "AGT92654",
      "totalEarnings": 250.00,
      "earningsForCurrentMonth": 50.00,
      "totalReferrals": 80,
      "referralsForCurrentMonth": 10,
      "availableBalance": 200.00,
      "totalPayoutAmount": 50.00
    },
    {
      "agentCode": "AGT24157",
      "totalEarnings": 175.75,
      "earningsForCurrentMonth": 15.75,
      "totalReferrals": 60,
      "referralsForCurrentMonth": 3,
      "availableBalance": 160.00,
      "totalPayoutAmount": 15.75
    }
  ],
  "batchDescription": "CSV Upload - 10/19/2025",
  "autoUpdate": true
}
```

---

## Best Practices

1. **Validate CSV First**: Ensure all agent codes exist before uploading
2. **Use Batch Description**: Include date and source for tracking
3. **Check Response**: Review the `details` array for any failures
4. **Backup Data**: Keep CSV backups before uploading
5. **Test Small Batches**: Start with a few agents to verify format
6. **Use Metadata**: Track upload source and filename

---

## Testing

### Test with Single Agent

```bash
curl -X POST http://localhost:3000/admin/earnings/bulk-upload-data \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentsData": [
      {
        "agentCode": "AGT21618",
        "totalEarnings": 125.50,
        "earningsForCurrentMonth": 25.50,
        "totalReferrals": 45,
        "referralsForCurrentMonth": 5,
        "availableBalance": 100.00,
        "totalPayoutAmount": 25.50
      }
    ],
    "batchDescription": "Test upload",
    "autoUpdate": true
  }'
```

---

## Summary

✅ **Correct Endpoint**: `POST /admin/earnings/bulk-upload-data`  
✅ **Simple Structure**: Matches your CSV columns exactly  
✅ **Batch Processing**: Upload multiple agents at once  
✅ **Error Reporting**: Detailed status for each agent  
✅ **Flexible**: Optional fields and metadata support  

**Your original data structure is perfect - just use the right endpoint!**

