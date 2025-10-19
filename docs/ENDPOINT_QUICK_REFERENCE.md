# Earnings Upload Endpoints - Quick Reference

## 🎯 Which Endpoint Should I Use?

### For CSV Uploads (Simple) ✅
**Endpoint**: `POST /admin/earnings/bulk-upload-data`

**Use When**: Uploading CSV data with agent totals/summaries

**Data Format**:
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
    }
  ]
}
```

**See**: `CSV_EARNINGS_UPLOAD_GUIDE.md` for full details

---

### For Detailed Transactions (Complex)
**Endpoint**: `POST /admin/earnings/bulk-upload`

**Use When**: Creating individual earning records with full transaction details

**Data Format**:
```json
{
  "earnings": [
    {
      "agentCode": "AGT21618",
      "amount": 25.50,
      "type": "referral_commission",
      "description": "Commission for customer referral",
      "referenceId": "PEN-2025-0011",
      "commissionRate": 5,
      "currency": "USD",
      "earnedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**See**: `BULK_EARNINGS_UPLOAD.md` for full details

---

## CSV Upload - Quick Example

```bash
# Your CSV has these columns:
# Agent Code, Total Earnings, Earnings for Current Month, Total Referrals, 
# Referrals for Current Month, Available Balance, Total Payout Amount

# Use this endpoint:
POST /admin/earnings/bulk-upload-data

# With this structure:
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
    }
  ],
  "batchDescription": "CSV Upload - 10/19/2025",
  "autoUpdate": true,
  "metadata": {
    "filename": "earnings_import.csv",
    "uploadSource": "Admin Panel"
  }
}
```

---

## Key Differences

| Feature | bulk-upload-data (CSV) | bulk-upload (Detailed) |
|---------|------------------------|------------------------|
| **Purpose** | Update agent totals | Create earning records |
| **Complexity** | Simple | Complex |
| **Fields** | 7 required | 4 required + 5 optional |
| **Use Case** | Monthly CSV imports | Transaction tracking |
| **Creates Records** | No | Yes (in earnings table) |
| **Updates Balances** | Yes | Yes (if autoConfirm) |

---

## CSV Structure Reference

```
Agent Code | Total Earnings | Earnings Current Month | Total Referrals | Referrals Current Month | Available Balance | Total Payout Amount
AGT21618   | 125.50        | 25.50                  | 45              | 5                       | 100.00           | 25.50
AGT92654   | 250.00        | 50.00                  | 80              | 10                      | 200.00           | 50.00
```

Maps to:

```json
{
  "agentCode": "AGT21618",
  "totalEarnings": 125.50,
  "earningsForCurrentMonth": 25.50,
  "totalReferrals": 45,
  "referralsForCurrentMonth": 5,
  "availableBalance": 100.00,
  "totalPayoutAmount": 25.50
}
```

---

## All Admin Earnings Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/earnings/bulk-upload-data` | POST | Upload CSV data (simple) |
| `/admin/earnings/bulk-upload` | POST | Upload earnings records (detailed) |
| `/admin/earnings/bulk-approve` | POST | Approve multiple earnings |
| `/admin/earnings/bulk-reject` | POST | Reject multiple earnings |
| `/admin/earnings/agents/:id` | GET | Get agent's earnings |
| `/admin/earnings/agents/:id/adjust` | POST | Adjust agent balance |

---

## Need Help?

- **CSV Uploads**: See `CSV_EARNINGS_UPLOAD_GUIDE.md`
- **Detailed Uploads**: See `BULK_EARNINGS_UPLOAD.md`
- **General Earnings**: See `BANK_DETAILS_AND_EARNINGS_UPLOAD.md`

