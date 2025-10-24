# Database Update Verification - CSV Upload

## ✅ What Gets Updated in the Database

### Agent Table (Direct Column Updates)

| Database Column | CSV Field | Update Type | Formula |
|----------------|-----------|-------------|---------|
| `totalEarnings` | `totalEarnings` | **REPLACE (SET)** | Direct value from CSV |
| `availableBalance` | `availableBalance` OR calculated | **REPLACE (SET)** | `totalEarnings - totalPayoutAmount` |
| `totalReferrals` | `totalReferrals` | **REPLACE (SET)** | Direct value from CSV |
| `metadata` (JSON) | Various | **MERGE** | Existing + new values |
| `updatedAt` | Auto | **UPDATE** | Current timestamp |

### Metadata (JSON Column Updates)

| Metadata Field | CSV Field | Storage Location |
|----------------|-----------|------------------|
| `currentMonthEarnings` | `earningsForCurrentMonth` | `agents.metadata` |
| `currentMonthReferrals` | `referralsForCurrentMonth` | `agents.metadata` |
| `totalPayoutAmount` | `totalPayoutAmount` | `agents.metadata` |
| `dataMonth` | `availableMonth` | `agents.metadata` |
| `lastDataUpload.batchId` | Auto-generated | `agents.metadata` |
| `lastDataUpload.uploadedAt` | Current timestamp | `agents.metadata` |
| `lastDataUpload.batchDescription` | `batchDescription` | `agents.metadata` |

---

## 🔄 Update Behavior: ABSOLUTE vs INCREMENTAL

### IMPORTANT: This endpoint uses **ABSOLUTE (REPLACE)** values, NOT incremental

Your CSV contains **TOTAL values**, not new earnings to add:

```sql
-- What the endpoint does:
UPDATE agents 
SET 
  totalEarnings = 125.50,           -- SETS to this value (not adds)
  availableBalance = 100.00,        -- SETS to this value (not adds)
  totalReferrals = 45,              -- SETS to this value (not adds)
  metadata = {existing + new data}, -- MERGES
  updatedAt = NOW()
WHERE agentCode = 'AGT21618';
```

### Example with Real Data:

**Before Upload:**
```json
{
  "agentCode": "AGT21618",
  "totalEarnings": "100.00",
  "availableBalance": "80.00",
  "totalReferrals": 40
}
```

**CSV Upload:**
```json
{
  "agentCode": "AGT21618",
  "totalEarnings": 125.50,
  "totalPayoutAmount": 25.50,
  "totalReferrals": 45
}
```

**After Upload:**
```json
{
  "agentCode": "AGT21618",
  "totalEarnings": "125.50",     // ← REPLACED with 125.50 (not 100.00 + 125.50)
  "availableBalance": "100.00",  // ← CALCULATED as 125.50 - 25.50
  "totalReferrals": 45           // ← REPLACED with 45 (not 40 + 45)
}
```

---

## 📊 SQL Query Generated

```sql
UPDATE agents
SET 
  "totalEarnings" = $1,        -- 125.50
  "availableBalance" = $2,     -- 100.00 (calculated: 125.50 - 25.50)
  "totalReferrals" = $3,       -- 45
  "metadata" = $4,             -- {currentMonthEarnings: 25.50, ...}
  "updatedAt" = CURRENT_TIMESTAMP
WHERE 
  "id" = $5;                   -- agent.id (UUID)
```

### Actual TypeORM Code:

```typescript
await this.agentsRepository.update(agent.id, {
  totalEarnings: 125.50,
  availableBalance: 100.00,  // auto-calculated or provided
  totalReferrals: 45,
  metadata: {
    ...existingMetadata,
    currentMonthEarnings: 25.50,
    currentMonthReferrals: 5,
    totalPayoutAmount: 25.50,
    lastDataUpload: {
      batchId: "DATA-BATCH-...",
      uploadedAt: "2025-10-19T10:13:44.000Z",
      batchDescription: "CSV Upload - 10/19/2025"
    }
  }
});
```

---

## ✅ Database Verification Checklist

### After Upload, Verify These Values:

**1. Direct Columns (agents table):**
```sql
SELECT 
  agentCode,
  totalEarnings,      -- Should match CSV value EXACTLY
  availableBalance,   -- Should = totalEarnings - totalPayoutAmount
  totalReferrals,     -- Should match CSV value EXACTLY
  updatedAt           -- Should be recent timestamp
FROM agents 
WHERE agentCode = 'AGT21618';
```

**Expected Result:**
```
agentCode  | totalEarnings | availableBalance | totalReferrals | updatedAt
-----------+---------------+------------------+----------------+-------------------------
AGT21618   | 125.50        | 100.00          | 45             | 2025-10-19 10:13:44.297
```

**2. Metadata (JSON column):**
```sql
SELECT 
  agentCode,
  metadata->>'currentMonthEarnings' as month_earnings,
  metadata->>'currentMonthReferrals' as month_referrals,
  metadata->>'totalPayoutAmount' as total_payouts,
  metadata->'lastDataUpload'->>'batchId' as batch_id
FROM agents 
WHERE agentCode = 'AGT21618';
```

**Expected Result:**
```
agentCode | month_earnings | month_referrals | total_payouts | batch_id
----------+----------------+-----------------+---------------+-------------------------
AGT21618  | 25.5           | 5               | 25.5          | DATA-BATCH-1760868824...
```

---

## 🧮 Math Verification

### Formula Check:

```
availableBalance = totalEarnings - totalPayoutAmount
```

**AGT21618:**
```
100.00 = 125.50 - 25.50 ✅ CORRECT
```

**AGT92654:**
```
200.00 = 250.00 - 50.00 ✅ CORRECT
```

**AGT88012:**
```
80.00 = 95.25 - 15.25 ✅ CORRECT
```

---

## 🔍 What's NOT Updated

These fields remain unchanged:

| Field | Why Not Updated |
|-------|-----------------|
| `id` | Primary key, never changes |
| `agentCode` | Identifier, never changes |
| `status` | Managed separately (active/inactive/etc) |
| `tier` | Managed separately (bronze/silver/etc) |
| `pendingBalance` | Managed by payout system |
| `activeReferrals` | Calculated from active referral codes |
| `commissionRate` | Set by admin manually |
| `notes` | Admin notes, not from CSV |
| `bankDetails` | Banking info, not from CSV |
| `userId` | Foreign key, never changes |
| `activatedAt` | Historical timestamp |
| `lastActivityAt` | Updated on agent actions |
| `createdAt` | Historical timestamp |

---

## 📝 Complete Database State Example

### Before Upload:
```sql
-- agents table
id: "44a60e16-acb1-4d36-a3d8-4feb133754ac"
agentCode: "AGT21618"
status: "active"
tier: "platinum"
totalEarnings: 100.00           ← Will be REPLACED
availableBalance: 80.00         ← Will be REPLACED
pendingBalance: 0.00            ← No change
totalReferrals: 40              ← Will be REPLACED
activeReferrals: 0              ← No change
commissionRate: 10.00           ← No change
metadata: {
  "autoCreated": true,
  "originalRole": "pt_admin",
  "createdAt": "2025-09-24T15:54:35.179Z"
}                                ← Will be MERGED
updatedAt: "2025-10-15T12:00:00.000Z"  ← Will be updated
```

### After Upload:
```sql
-- agents table
id: "44a60e16-acb1-4d36-a3d8-4feb133754ac"
agentCode: "AGT21618"
status: "active"                ← No change
tier: "platinum"                ← No change
totalEarnings: 125.50           ← UPDATED ✅
availableBalance: 100.00        ← UPDATED ✅ (calculated)
pendingBalance: 0.00            ← No change
totalReferrals: 45              ← UPDATED ✅
activeReferrals: 0              ← No change
commissionRate: 10.00           ← No change
metadata: {
  "autoCreated": true,                              ← Preserved
  "originalRole": "pt_admin",                       ← Preserved
  "createdAt": "2025-09-24T15:54:35.179Z",         ← Preserved
  "currentMonthEarnings": 25.5,                    ← NEW ✅
  "currentMonthReferrals": 5,                      ← NEW ✅
  "totalPayoutAmount": 25.5,                       ← NEW ✅
  "lastDataUpload": {                              ← NEW ✅
    "batchId": "DATA-BATCH-1760868824252-6m28hn2hb",
    "uploadedAt": "2025-10-19T10:13:44.261Z",
    "batchDescription": "CSV Upload - 10/19/2025, 12:13:44 PM"
  }
}
updatedAt: "2025-10-19T10:13:44.265Z"  ← UPDATED ✅
```

---

## ✅ Summary

### What DOES Get Updated:
1. ✅ `totalEarnings` - REPLACED with CSV value
2. ✅ `availableBalance` - CALCULATED or REPLACED
3. ✅ `totalReferrals` - REPLACED with CSV value
4. ✅ `metadata.currentMonthEarnings` - SET from CSV
5. ✅ `metadata.currentMonthReferrals` - SET from CSV
6. ✅ `metadata.totalPayoutAmount` - SET from CSV
7. ✅ `metadata.lastDataUpload` - SET with batch info
8. ✅ `updatedAt` - SET to current timestamp

### What DOESN'T Get Updated:
❌ `pendingBalance` - Payout system only  
❌ `status` - Admin management only  
❌ `tier` - Admin management only  
❌ `commissionRate` - Admin management only  
❌ `notes` - Admin notes only  
❌ `bankDetails` - Banking info only  

---

## 🎯 Endpoint Purpose

This endpoint is for **syncing TOTAL values** from an external system, NOT for adding new earnings.

If you want to ADD new earnings (incremental), use:
```
POST /admin/earnings/bulk-upload
```

If you want to SET totals from external system (absolute), use:
```
POST /admin/earnings/bulk-upload-data  ← This one
```

**The database IS being updated correctly!** ✅

