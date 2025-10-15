# Payout Approval Flow & Balance Management

## Complete Payout Lifecycle

### 1. **Payout Request Created** (Agent initiates)

**Endpoint:** `POST /payouts`

**Process:**
```typescript
// src/modules/agents/agents.service.ts - requestPayout()

1. Check: availableBalance >= amount
2. Create payout with status: PENDING
3. Update balances:
   - availableBalance -= amount  // Money moves out of available
   - pendingBalance += amount     // Track money in pending payouts
4. Save agent balances
5. Send payout request email ✅
```

**Balance State After Request:**
- Agent has $100 available
- Requests $50 payout
- **availableBalance: $50** (deducted)
- **pendingBalance: $50** (tracked)
- **totalEarnings: $100** (unchanged)

---

### 2. **Payout Approved** (Admin approves)

**Endpoint:** `PATCH /admin/payouts/:id/approve`

**Process:**
```typescript
// Individual: approvePayout() → updatePayoutStatus()
// Bulk: bulkProcessPayouts() → approvePayout() → updatePayoutStatus()

1. Update payout status to APPROVED
2. Set approvedAt timestamp
3. updateAgentBalancesOnPayoutStatusChange():
   - pendingBalance -= amount  // Remove from pending tracking
4. Save agent balances
5. sendPayoutStatusNotification():
   - Create in-app notification ✅
   - Send approval email ✅
```

**Balance State After Approval:**
- **availableBalance: $50** (unchanged - already deducted at request)
- **pendingBalance: $0** (removed from pending)
- **totalEarnings: $100** (unchanged)

---

## Balance Calculation Logic

### When Recalculation Runs:
```typescript
// recalculateAgentBalances()

totalEarnings = SUM(confirmed earnings)
availableBalance = totalEarnings - SUM(approved payouts)
pendingBalance = SUM(pending earnings) + SUM(pending payouts)
```

**Example:**
- Confirmed earnings: $100
- Approved payouts: $50
- **Result: availableBalance = $50** ✅

---

## Email Notifications

### Individual Approval:
```typescript
approvePayout()
  → updatePayoutStatus()
    → sendPayoutStatusNotification()
      → sendPayoutApprovedEmail() ✅
```

### Bulk Approval:
```typescript
bulkProcessPayouts()
  → for each payout:
      → approvePayout()
        → updatePayoutStatus()
          → sendPayoutStatusNotification()
            → sendPayoutApprovedEmail() ✅
```

**Both individual and bulk approvals send the same email!** ✅

---

## Current Status: ✅ WORKING

### Individual Payout Approval:
- ✅ Status updated to APPROVED
- ✅ approvedAt timestamp set
- ✅ pendingBalance deducted
- ✅ In-app notification created
- ✅ Email sent to agent
- ✅ Balance logic correct

### Bulk Payout Approval:
- ✅ Calls individual approvePayout for each
- ✅ All above logic applied to each payout
- ✅ Emails sent for each approved payout
- ✅ Returns summary of results

---

## Testing

### Test Individual Approval:
```bash
# 1. Create payout request (as agent)
POST /payouts
{
  "amount": 50,
  "method": "bank_transfer",
  "paymentDetails": { ... }
}

# Check balances:
# availableBalance: decreased by 50
# pendingBalance: increased by 50

# 2. Approve payout (as admin)
PATCH /admin/payouts/:id/approve
{
  "adminNotes": "Approved for processing"
}

# Check balances:
# availableBalance: same (already deducted)
# pendingBalance: decreased by 50
# Email: sent to agent ✅
```

### Test Bulk Approval:
```bash
POST /admin/payouts/bulk-process
{
  "payoutIds": ["id1", "id2", "id3"],
  "action": "approve",
  "adminNotes": "Batch approval"
}

# Each payout:
# - Status → APPROVED
# - pendingBalance -= amount
# - Email sent ✅
```

---

## Balance Flow Diagram

```
EARNINGS CONFIRMED
        ↓
totalEarnings += amount
availableBalance += amount
        ↓
PAYOUT REQUESTED
        ↓
availableBalance -= amount
pendingBalance += amount
        ↓
PAYOUT APPROVED
        ↓
pendingBalance -= amount
(availableBalance unchanged)
        ↓
FINAL STATE:
totalEarnings: original
availableBalance: totalEarnings - approved payouts
pendingBalance: 0
```

---

## Summary

✅ **Individual payout approval IS working correctly:**
- Balances are updated properly
- Emails are sent
- Logic is identical to bulk approval

✅ **Bulk payout approval IS working correctly:**
- Calls individual approval for each payout
- Each payout gets email notification
- Balances updated for each

✅ **Balance deduction happens at REQUEST time, not APPROVAL time:**
- This is correct by design
- Approval just removes from pending tracking
- Prevents double-deduction

🎉 **Everything is working as expected!**

