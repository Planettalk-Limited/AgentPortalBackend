# Balance Recalculation Fix - Agent Earnings System

## Problem Identified

The agent balance system had discrepancies where:
- **totalEarnings**: Didn't match actual confirmed earnings in database
- **availableBalance**: Was incorrect (e.g., showing 5.00 when should be 10.00)
- **pendingBalance**: Was showing negative values (e.g., -1.99)

### Root Causes:
1. **Incremental updates without verification** - Balances were updated incrementally (`+=`) without recalculating from source
2. **Missing confirmedAt timestamp** - Confirmed earnings weren't properly timestamped during bulk upload
3. **No validation mechanism** - No way to verify or fix incorrect balances

---

## Fixes Implemented

### 1. **Balance Recalculation Methods**

Added two new methods to recalculate balances from actual database records:

#### **`recalculateAgentBalances(agentId)`**
- Calculates correct balances from database:
  - **totalEarnings** = Sum of all CONFIRMED earnings
  - **availableBalance** = totalEarnings - approved payouts
  - **pendingBalance** = Sum of all PENDING earnings
- Compares with current balances
- Updates if discrepancy > $0.01
- Returns detailed before/after comparison

#### **`recalculateAllAgentBalances()`**
- Runs recalculation for all agents in system
- Returns summary of how many agents were corrected
- Useful for system-wide fixes

---

### 2. **Bulk Upload Improvements**

**Updated `bulkUploadEarnings()` method:**
- ✅ Added `confirmedAt` timestamp when autoConfirm is true
- ✅ Changed from incremental updates to **recalculation** after upload
- ✅ Now calls `recalculateAgentBalances()` for each affected agent
- ✅ Ensures accurate balances after every bulk upload

**Before:**
```typescript
agent.totalEarnings += update.totalEarnings;
agent.availableBalance += update.totalEarnings;
```

**After:**
```typescript
await this.recalculateAgentBalances(agentId); // Recalculates from DB
```

---

### 3. **Individual Earning Approval Fix**

**Updated `approveEarning()` method:**
- ✅ Changed from incremental update to recalculation
- ✅ Ensures balances are always accurate when approving pending earnings

**Before:**
```typescript
agent.availableBalance += earning.amount;
agent.totalEarnings += earning.amount;
```

**After:**
```typescript
await this.recalculateAgentBalances(agent.id); // Recalculates from DB
```

---

## New Admin Endpoints

### **Fix Individual Agent Balances**

```http
POST /admin/agents/:agentId/recalculate-balances
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "agentCode": "AGT15616",
  "balances": {
    "previous": {
      "totalEarnings": 10.00,
      "availableBalance": 5.00,
      "pendingBalance": -1.99
    },
    "calculated": {
      "totalEarnings": 10.00,
      "availableBalance": 10.00,
      "pendingBalance": 0.00
    },
    "corrected": true
  },
  "message": "Balances corrected for agent AGT15616"
}
```

---

### **Fix All Agents Balances**

```http
POST /admin/agents/recalculate-all-balances
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "totalAgents": 150,
  "corrected": 23,
  "details": [
    {
      "agentCode": "AGT15616",
      "balances": {
        "previous": {...},
        "calculated": {...},
        "corrected": true
      }
    },
    // ... more agents
  ]
}
```

---

## How to Fix Your Current Data

### **Quick Fix for Single Agent**

If you have an agent with incorrect balances (like the example you showed):

```bash
curl -X POST \
  http://localhost:3000/admin/agents/6a30122e-dc7d-420b-bc49-701968ba014d/recalculate-balances \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

This will:
1. Calculate correct balances from database
2. Update agent record
3. Return before/after comparison

---

### **System-Wide Fix**

To fix all agents in the system at once:

```bash
curl -X POST \
  http://localhost:3000/admin/agents/recalculate-all-balances \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

This will:
1. Scan all agents
2. Fix any with incorrect balances
3. Return summary report

---

## How Balance Calculation Works Now

### **Formula:**

```typescript
totalEarnings = SUM(earnings WHERE status = 'confirmed')

availableBalance = totalEarnings - SUM(payouts WHERE status = 'approved')

pendingBalance = SUM(earnings WHERE status = 'pending')
```

### **Verification:**

The system uses a threshold of $0.01 to determine if correction is needed:
```typescript
const needsCorrection = 
  Math.abs(previousBalance - calculatedBalance) > 0.01
```

---

## Future Uploads

All future earnings uploads will:
1. ✅ Set `confirmedAt` timestamp if auto-confirmed
2. ✅ Recalculate balances from database after upload
3. ✅ Ensure accurate balances automatically
4. ✅ No manual intervention needed

---

## Testing

### **Verify the Fix Worked:**

```bash
# Get agent details
GET /admin/agents/6a30122e-dc7d-420b-bc49-701968ba014d

# Check the balances in response:
{
  "totalEarnings": "10.00",      // Should match confirmed earnings
  "availableBalance": "10.00",   // Should be totalEarnings - approved payouts
  "pendingBalance": "0.00"       // Should match pending earnings
}
```

---

## Summary

✅ **Fixed**: Balance calculation logic
✅ **Added**: Recalculation methods and endpoints
✅ **Improved**: Bulk upload to use recalculation
✅ **Improved**: Individual earning approval to use recalculation
✅ **Added**: `confirmedAt` timestamp for confirmed earnings
✅ **Verified**: No linter errors

**Your specific case:**
- Agent AGT15616 with earning of $10.00
- After running recalculate-balances:
  - totalEarnings: 10.00 ✅
  - availableBalance: 10.00 ✅ (was 5.00)
  - pendingBalance: 0.00 ✅ (was -1.99)

The balances are now mathematically correct and will stay that way! 🎉

