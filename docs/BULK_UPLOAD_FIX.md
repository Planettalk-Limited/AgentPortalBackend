# Bulk Earnings Upload Fix - Duplicate Upload Issue

## Problem Description

When using the `POST /api/v1/admin/earnings/bulk-upload-data` endpoint, subsequent uploads for the same agent would not create or update earning records properly. This resulted in:

1. Only the first upload creating an earning record
2. Subsequent uploads with updated data not reflecting in the earnings list
3. Metrics showing stale data (e.g., always showing "1 confirmed earning" even after multiple uploads)
4. Other endpoints relying on earnings data showing incorrect/outdated information

### Root Cause

The original implementation calculated earnings based on the **delta** between the new `totalEarnings` and the agent's current `totalEarnings`:

```typescript
const earningsDelta = newTotalEarnings - previousTotalEarnings;

if (earningsDelta !== 0) {
  // Create earning record
}
```

**Issue**: If you uploaded the same `totalEarnings` value twice:
- First upload: agent has $0, upload $0.50 → delta = $0.50 → creates record ✓
- Second upload: agent has $0.50, upload $0.50 → delta = $0 → no record created ✗

This meant duplicate uploads or re-uploads of corrected data would not be properly tracked.

## Solution Implemented

### Key Changes

1. **Use `earningsForCurrentMonth` instead of delta**: The earning record now stores the earnings for the specific period (`earningsForCurrentMonth`), not the delta from previous uploads.

2. **Period-based deduplication**: Check if an earning record already exists for this agent + period combination before creating a new one.

3. **Update existing records**: If a record exists for the period, update it with the new amount instead of skipping or creating duplicates.

4. **Audit trail**: Even when amounts don't change, update metadata to track that the data was verified/re-uploaded.

### New Logic Flow

```
For each agent in bulk upload:
  1. Update agent's totalEarnings, availableBalance, metadata
  2. Determine period earning amount:
     - Use earningsForCurrentMonth if provided
     - Otherwise calculate delta from totalEarnings
  3. Check if earning record exists for this agent + period
  4. If exists:
     - If amount changed: Update record with new amount
     - If amount same: Update metadata for audit trail
  5. If doesn't exist:
     - Create new record (only if amount > 0)
```

### Code Changes

**File**: `src/modules/agents/agents.service.ts`

**Method**: `bulkUploadEarningsData()` (lines ~2897-3070)

Key improvements:
- Uses `earningsForCurrentMonth` from upload data as the earning amount
- Queries for existing records by `agentId + metadata.availableMonth + source='bulk-data-upload'`
- Updates existing records when found, including metadata like:
  - `batchId`: Updated to track which upload last touched this record
  - `updatedAt`: Timestamp of last update
  - `previousAmount`: For audit trail
  - `updateCount`/`verifyCount`: Track how many times updated/verified
- Creates new records only when no existing record found AND amount > 0

## Testing the Fix

### Test Case 1: Initial Upload

**Request**:
```json
POST /api/v1/admin/earnings/bulk-upload-data
{
  "agentsData": [
    {
      "agentCode": "PTA0001",
      "totalEarnings": 0.50,
      "earningsForCurrentMonth": 0.50,
      "totalReferrals": 5,
      "referralsForCurrentMonth": 5,
      "availableBalance": 0.50,
      "totalPayoutAmount": 0,
      "availableMonth": "2026-01"
    }
  ]
}
```

**Expected Result**:
- Agent record updated with totalEarnings = 0.50
- New earning record created with amount = 0.50
- Status: "earningRecordCreated"

### Test Case 2: Duplicate Upload (Same Data)

**Request**: Same as Test Case 1

**Expected Result**:
- Agent record updated (no changes to amounts)
- Existing earning record found and metadata updated
- Status: "earningRecordVerified (no change)"
- No duplicate earning record created

### Test Case 3: Corrected Upload (Updated Data)

**Request**:
```json
POST /api/v1/admin/earnings/bulk-upload-data
{
  "agentsData": [
    {
      "agentCode": "PTA0001",
      "totalEarnings": 1.00,
      "earningsForCurrentMonth": 1.00,
      "totalReferrals": 10,
      "referralsForCurrentMonth": 10,
      "availableBalance": 1.00,
      "totalPayoutAmount": 0,
      "availableMonth": "2026-01"
    }
  ]
}
```

**Expected Result**:
- Agent record updated with totalEarnings = 1.00
- Existing earning record for 2026-01 updated from 0.50 to 1.00
- Status: "earningRecordUpdated (0.5 -> 1)"
- Metrics now show correct total: 1.00

### Test Case 4: New Period Upload

**Request**:
```json
POST /api/v1/admin/earnings/bulk-upload-data
{
  "agentsData": [
    {
      "agentCode": "PTA0001",
      "totalEarnings": 1.50,
      "earningsForCurrentMonth": 0.50,
      "totalReferrals": 15,
      "referralsForCurrentMonth": 5,
      "availableBalance": 1.50,
      "totalPayoutAmount": 0,
      "availableMonth": "2026-02"
    }
  ]
}
```

**Expected Result**:
- Agent record updated with totalEarnings = 1.50
- New earning record created for 2026-02 with amount = 0.50
- Old record for 2026-01 remains unchanged
- Status: "earningRecordCreated"
- Total earnings in metrics: 2 records (1.00 for Jan + 0.50 for Feb)

## Verification

After the fix, check:

1. **Earnings List** (`GET /api/v1/admin/earnings`):
   - Should show all earning records with correct amounts
   - Duplicate uploads should not create duplicate records
   - Updated uploads should reflect new amounts

2. **Earnings Metrics**:
   - `totalEarnings`: Should match sum of all earning records
   - `confirmedEarnings`: Should reflect actual number of earning records
   - Should update properly after each upload

3. **Agent Details**:
   - `totalEarnings`: Should match latest upload
   - `availableBalance`: Should be calculated correctly
   - Metadata should contain `lastDataUpload` info

## Best Practices Going Forward

1. **Always include `availableMonth`**: This enables period-based tracking and prevents duplicates
2. **Use `earningsForCurrentMonth`**: This represents the actual earnings for the period
3. **Don't manually set `availableBalance`**: Let the system calculate it as `totalEarnings - totalPayoutAmount`
4. **Check upload results**: Review the `updatedFields` in the response to understand what happened

## Related Files

- `src/modules/agents/agents.service.ts` - Main service with bulk upload logic
- `src/modules/agents/admin-earnings.controller.ts` - Controller endpoint
- `src/modules/agents/dto/earnings-data-upload.dto.ts` - DTO definitions
- `docs/CSV_EARNINGS_UPLOAD_GUIDE.md` - User guide for CSV uploads
- `docs/ENDPOINT_QUICK_REFERENCE.md` - API endpoint reference

## Migration Notes

No database migration required. The fix is backward compatible and will work with existing earning records. The metadata fields (`updateCount`, `verifyCount`, etc.) will be added to records as they are updated through new uploads.

