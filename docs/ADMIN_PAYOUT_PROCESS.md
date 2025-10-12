# Admin Payout Management Process

## Overview

This document outlines the complete administrative process for managing agent payouts in the PlanetTalk Agent Portal system. The process has been streamlined to use only 3 statuses and 2 payment methods for maximum efficiency.

## Admin Dashboard Access

### Required Permissions
- **Role**: `admin` or `pt_admin`
- **Authentication**: Valid JWT token
- **Access Level**: Full payout management capabilities

### Login Process
1. Navigate to admin portal
2. Login with admin credentials
3. Access payout management section

## Payout Status Management

### Status Overview
The system uses a simplified 3-status workflow:

```
┌─────────┐    approve    ┌──────────┐
│ PENDING │──────────────▶│ APPROVED │ (FINAL)
│         │               └──────────┘
└────┬────┘                     ▲
     │                          │
     │ review                   │ approve
     ▼                          │
┌─────────┐                     │
│ REVIEW  │─────────────────────┘
│         │ back to pending
└────┬────┘
     │
     ▼
┌─────────┐
│ PENDING │
└─────────┘
```

### Status Definitions

| Status | Description | Admin Actions Available |
|--------|-------------|------------------------|
| **PENDING** | Initial status when agent requests payout | Approve, Review |
| **REVIEW** | Requires additional verification | Approve, Back to Pending |
| **APPROVED** | Final status - ready for external processing | None (final) |

## Individual Payout Management

### 1. View Pending Payouts

**Endpoint**: `GET /admin/payouts?status=pending`

**Response Example**:
```json
{
  "data": [
    {
      "id": "payout-uuid-1",
      "status": "pending",
      "method": "bank_transfer",
      "amount": 150.00,
      "requestedAt": "2025-10-11T08:00:00.000Z",
      "agent": {
        "agentCode": "AGT15616",
        "user": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        }
      },
      "paymentDetails": {
        "bankAccount": {
          "accountNumber": "****7890",
          "bankName": "Chase Bank"
        }
      }
    }
  ]
}
```

### 2. Approve Individual Payout

**Endpoint**: `PATCH /admin/payouts/:id/approve`

**Process**:
1. Review payout details
2. Verify agent information
3. Check payment method details
4. Add admin notes (optional)
5. Submit approval

**Request**:
```json
{
  "adminNotes": "Verified bank details and agent identity. Approved for processing."
}
```

**Result**:
- Status changes to `APPROVED`
- Email sent to agent
- Funds moved from pending to processing queue
- Admin action logged

### 3. Set Payout to Review

**Endpoint**: `PATCH /admin/payouts/:id/review`

**When to Use**:
- Large amounts requiring manager approval
- Suspicious activity patterns
- Incomplete documentation
- Policy compliance checks

**Request**:
```json
{
  "reviewMessage": "This payout exceeds the monthly limit of $500. Please provide manager approval before processing.",
  "adminNotes": "Flagged by automated compliance system - amount: $750"
}
```

**Result**:
- Status changes to `REVIEW`
- Email sent to agent with review message
- Funds remain in pending balance
- Review message logged for tracking

### 4. Process Review Status

From review status, admin can:

#### Option A: Approve After Review
```bash
PATCH /admin/payouts/:id/approve
{
  "adminNotes": "Manager approval received. Proceeding with payout."
}
```

#### Option B: Send Back to Pending
```bash
PATCH /admin/payouts/:id/review
{
  "reviewMessage": "Please resubmit with corrected bank details",
  "adminNotes": "Invalid routing number detected"
}
```

## Bulk Payout Operations

### Bulk Approve Multiple Payouts

**Endpoint**: `POST /admin/payouts/bulk-process`

**Use Case**: Approve multiple verified payouts at once

**Request**:
```json
{
  "payoutIds": [
    "payout-uuid-1",
    "payout-uuid-2", 
    "payout-uuid-3"
  ],
  "action": "approve",
  "adminNotes": "Batch approval for verified payouts under $200"
}
```

**Response**:
```json
{
  "success": 3,
  "failed": 0,
  "errors": []
}
```

**Response**:
```json
{
  "success": 3,
  "failed": 0,
  "errors": [],
  "successfulPayouts": [
    {
      "payoutId": "payout-uuid-1",
      "agentCode": "AGT15616", 
      "amount": 100.00,
      "message": "Payout approved successfully"
    },
    {
      "payoutId": "payout-uuid-2",
      "agentCode": "AGT20001",
      "amount": 150.00, 
      "message": "Payout approved successfully"
    },
    {
      "payoutId": "payout-uuid-3",
      "agentCode": "AGT30002",
      "amount": 75.00,
      "message": "Payout approved successfully"
    }
  ],
  "failedPayouts": []
}
```

**Result**:
- All selected payouts move to `APPROVED`
- Individual emails sent to each agent
- Detailed success/failure tracking

### Bulk Review Multiple Payouts

**Endpoint**: `POST /admin/payouts/bulk-process`

**Use Case**: Flag multiple payouts for additional review

**Request (Global Message)**:
```json
{
  "payoutIds": [
    "payout-uuid-4",
    "payout-uuid-5"
  ],
  "action": "review",
  "reviewMessage": "These payouts require manager approval due to high amounts",
  "adminNotes": "Flagged for compliance review - amounts over $500"
}
```

**Request (Individual Messages)**:
```json
{
  "payoutIds": [
    "payout-uuid-6",
    "payout-uuid-7", 
    "payout-uuid-8"
  ],
  "action": "review",
  "adminNotes": "Individual review flags applied",
  "individualMessages": [
    {
      "payoutId": "payout-uuid-6",
      "reviewMessage": "Amount $750 exceeds daily limit - manager approval required"
    },
    {
      "payoutId": "payout-uuid-7",
      "reviewMessage": "New agent first payout - identity verification needed"
    },
    {
      "payoutId": "payout-uuid-8",
      "reviewMessage": "Unusual activity pattern - security review required"
    }
  ]
}
```

**Response**:
```json
{
  "success": 3,
  "failed": 0,
  "errors": [],
  "successfulPayouts": [
    {
      "payoutId": "payout-uuid-6",
      "agentCode": "AGT15616",
      "amount": 750.00,
      "message": "Payout set to review: Amount $750 exceeds daily limit - manager approval required"
    },
    {
      "payoutId": "payout-uuid-7", 
      "agentCode": "AGT20001",
      "amount": 200.00,
      "message": "Payout set to review: New agent first payout - identity verification needed"
    },
    {
      "payoutId": "payout-uuid-8",
      "agentCode": "AGT30002", 
      "amount": 300.00,
      "message": "Payout set to review: Unusual activity pattern - security review required"
    }
  ],
  "failedPayouts": []
}
```

**Result**:
- All selected payouts move to `REVIEW`
- Individual emails sent with specific review messages
- Detailed success/failure tracking

## Agent Statistics Management

### Individual Agent Stats Update

**Endpoint**: `POST /admin/agents/update-stats-by-code`

**Use Case**: Update single agent's earnings and referrals

**Request**:
```json
{
  "agentCode": "AGT15616",
  "amount": 125.50,
  "referralCount": 3,
  "description": "October 2025 monthly performance",
  "metadata": {
    "period": "2025-10",
    "source": "monthly_report",
    "verified_by": "admin_user"
  }
}
```

**Response**:
```json
{
  "success": true,
  "agentId": "agent-uuid",
  "agentCode": "AGT15616",
  "earningsUpdated": true,
  "referralsUpdated": true,
  "newBalance": 129.50,
  "newReferralTotal": 3,
  "message": "Agent stats updated: earnings: $125.50, referrals: 3"
}
```

### Bulk Agent Stats Update

**Endpoint**: `POST /admin/agents/bulk-update-stats-by-code`

**Use Case**: Monthly bulk update of all agent statistics

**Request**:
```json
{
  "updates": [
    {
      "agentCode": "AGT15616",
      "amount": 100.00,
      "referralCount": 2,
      "description": "October commission + referral bonus"
    },
    {
      "agentCode": "AGT20001",
      "amount": 75.50,
      "description": "October commission only"
    },
    {
      "agentCode": "AGT30002",
      "referralCount": 5,
      "description": "October referral bonus only"
    },
    {
      "agentCode": "AGT40003",
      "amount": -10.00,
      "description": "Correction for September overpayment"
    }
  ],
  "batchDescription": "October 2025 monthly statistics update"
}
```

**Response**:
```json
{
  "success": 4,
  "failed": 0,
  "errors": [],
  "totalEarningsUpdated": 165.50,
  "totalReferralsUpdated": 7
}
```

## Daily Admin Workflow

### Morning Routine (9:00 AM)
1. **Check Pending Payouts**
   ```bash
   GET /admin/payouts?status=pending
   ```

2. **Review Overnight Requests**
   - Verify amounts under $200: Bulk approve
   - Flag amounts over $200: Set to review

3. **Process Small Payouts** (Under $200)
   ```bash
   POST /admin/payouts/bulk-process
   {
     "payoutIds": ["small-payout-ids"],
     "action": "approve",
     "adminNotes": "Auto-approved - standard amounts"
   }
   ```

### Mid-Day Review (1:00 PM)
1. **Check Review Status Payouts**
   ```bash
   GET /admin/payouts?status=review
   ```

2. **Process Manager-Approved Reviews**
   ```bash
   POST /admin/payouts/bulk-process
   {
     "payoutIds": ["reviewed-payout-ids"],
     "action": "approve", 
     "adminNotes": "Manager approval received"
   }
   ```

### End of Day (5:00 PM)
1. **Final Pending Review**
2. **Generate Daily Report**
   ```bash
   GET /admin/payouts/export?format=csv&startDate=2025-10-11&endDate=2025-10-11
   ```
3. **Update Agent Statistics** (if monthly cycle)

## Monthly Admin Process

### Month-End Statistics Update

**Step 1: Prepare Data**
- Export agent performance data
- Calculate commissions and bonuses
- Verify referral counts

**Step 2: Bulk Update**
```bash
POST /admin/agents/bulk-update-stats-by-code
{
  "updates": [
    // ... all agent updates for the month
  ],
  "batchDescription": "October 2025 monthly performance update"
}
```

**Step 3: Verify Updates**
- Check success/failure counts
- Review error messages
- Correct any failed updates

## Compliance and Audit

### Audit Trail Features
- **Payout History**: All status changes logged with timestamps
- **Admin Actions**: All admin operations include notes and user ID
- **Email Records**: All notifications tracked
- **Balance Changes**: All earnings adjustments create audit records

### Compliance Checks
1. **Amount Verification**: All payouts verified against earnings
2. **Identity Verification**: Agent details confirmed
3. **Payment Method Validation**: Bank details or mobile numbers verified
4. **Approval Chain**: Large amounts require additional review

### Monthly Reporting
- Total payouts approved
- Average processing time
- Error rates and common issues
- Agent performance statistics

## Export and Reporting

### CSV Export Functionality

**Endpoint**: `GET /admin/payouts/export`

The export feature allows admins to download payout data in CSV format for external analysis, reporting, and record-keeping.

#### Export Options

**Basic Export** (20 most recent pending payouts):
```bash
GET /admin/payouts/export?page=1&limit=20&format=csv
# Exports pending payouts by default
```

**Filtered Export by Status**:
```bash
GET /admin/payouts/export?status=approved&format=csv&limit=100
```

**Date Range Export**:
```bash
GET /admin/payouts/export?startDate=2025-10-01&endDate=2025-10-31&format=csv
```

**Method-Specific Export**:
```bash
GET /admin/payouts/export?method=planettalk_credit&format=csv
```

**Combined Filters**:
```bash
GET /admin/payouts/export?status=approved&method=bank_transfer&startDate=2025-10-01&format=csv&limit=500
```

#### Export Use Cases

1. **Daily Reports**: Export today's payouts for processing
2. **Monthly Reconciliation**: Export approved payouts for accounting
3. **Compliance Audits**: Export all payouts with admin notes
4. **Performance Analysis**: Export by agent or date range
5. **External Processing**: Export approved payouts for payment processor

#### CSV Column Descriptions

| Column | Description | Example |
|--------|-------------|---------|
| Payout ID | Unique payout identifier | `payout-uuid-123` |
| Agent Code | Human-readable agent code | `AGT15616` |
| Agent Name | Full agent name | `John Doe` |
| Agent Email | Agent email address | `john@example.com` |
| Status | Current payout status | `approved` |
| Method | Payment method | `Bank Transfer` |
| Amount | Requested amount | `100.00` |
| Net Amount | Amount after fees | `95.00` |
| Fees | Processing fees | `5.00` |
| Currency | Currency code | `USD` |
| Description | Payout description | `Monthly commission` |
| Requested Date | When payout was requested | `2025-10-11T08:00:00.000Z` |
| Approved Date | When payout was approved | `2025-10-11T10:30:00.000Z` |
| Transaction ID | External transaction ID | `TXN-2025-001` |
| Payment Details | Formatted payment info | `Bank: Chase \| Account: ****7890` |
| Admin Notes | Admin comments | `Verified and approved` |
| Review Message | Review status message | `Requires manager approval` |

#### Export Workflow Examples

**Daily Processing Export**:
```bash
# Export today's approved payouts for processing
GET /admin/payouts/export?status=approved&startDate=2025-10-11&format=csv
```

**Monthly Reconciliation**:
```bash
# Export all October payouts for accounting
GET /admin/payouts/export?startDate=2025-10-01&endDate=2025-10-31&format=csv&limit=1000
```

**Compliance Audit**:
```bash
# Export all payouts with review messages
GET /admin/payouts/export?status=review&format=csv
```

## Emergency Procedures

### High-Priority Payout
1. Manually verify agent and amount
2. Use individual approve endpoint with detailed notes
3. Monitor for successful processing
4. Follow up with agent if needed

### System Issues
1. Check database connectivity
2. Verify email service status
3. Review recent error logs
4. Contact technical support if needed

### Suspicious Activity
1. Set payout to `REVIEW` immediately
2. Add detailed review message
3. Escalate to security team
4. Document investigation results

## Best Practices

### For Individual Payouts
- ✅ Always add meaningful admin notes
- ✅ Verify payment details before approval
- ✅ Use review status for anything unusual
- ✅ Respond to agent questions promptly

### For Bulk Operations
- ✅ Test with small batch first
- ✅ Include descriptive batch notes
- ✅ Review error reports carefully
- ✅ Process failed items individually

### For Stats Updates
- ✅ Verify data before bulk upload
- ✅ Include period information in metadata
- ✅ Use consistent description format
- ✅ Monitor for negative balance warnings

## Contact Information

### Technical Support
- **Email**: tech-support@planettalk.com
- **Slack**: #payout-system-support
- **On-call**: +1-800-PLANET-TECH

### Business Questions
- **Email**: finance@planettalk.com
- **Manager**: finance-manager@planettalk.com

### Emergency Contact
- **24/7 Hotline**: +1-800-PLANET-EMERGENCY
- **Email**: emergency@planettalk.com
