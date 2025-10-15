# Payout System API Documentation

## Overview

The PlanetTalk Agent Portal payout system has been refined to provide a streamlined experience with simplified statuses, two payment methods, and comprehensive admin controls.

## Payout Statuses

The system now uses only **3 statuses** for a simplified workflow:

| Status | Description | Final State | Next Possible States |
|--------|-------------|-------------|---------------------|
| `PENDING` | Initial status when payout is requested | No | `APPROVED`, `REVIEW` |
| `APPROVED` | Payout approved and being processed externally | Yes | None |
| `REVIEW` | Requires additional admin review | No | `APPROVED`, `PENDING` |

### Status Flow
```
PENDING → APPROVED (final)
   ↓
REVIEW → APPROVED (final)
   ↓
PENDING (can return from review)
```

## Payment Methods

Only **2 payment methods** are supported:

| Method | Code | Description | Required Fields |
|--------|------|-------------|----------------|
| Bank Transfer | `bank_transfer` | Traditional bank transfer | `bankName`, `accountName`, `accountNumberOrIban`, `currency`, `bankCountry` |
| PlanetTalk Credit | `planettalk_credit` | Airtime/credit to PlanetTalk mobile number | `planettalkMobile`, `accountName` (optional) |

## Agent Endpoints

### Request Payout
**POST** `/agents/:agentId/payouts`

Create a new payout request for an agent.

#### Request Body
```json
{
  "amount": 100.00,
  "method": "bank_transfer",
  "description": "Monthly commission payout",
  "paymentDetails": {
    "bankAccount": {
      "bankName": "Standard Bank",
      "branchNameOrCode": "Main Branch / 001234",
      "accountName": "John Doe",
      "accountNumberOrIban": "1234567890",
      "swiftBicCode": "SBZAZAJJ",
      "currency": "USD",
      "bankCountry": "United States",
      "additionalNotes": "Savings account"
    }
  },
  "metadata": {
    "source": "agent_portal"
  }
}
```

#### Response
```json
{
  "id": "payout-uuid",
  "status": "pending",
  "method": "bank_transfer",
  "amount": 100.00,
  "netAmount": 100.00,
  "currency": "USD",
  "description": "Monthly commission payout",
  "requestedAt": "2025-10-11T08:00:00.000Z",
  "agentId": "agent-uuid",
  "paymentDetails": {
    "bankAccount": {
      "accountNumber": "1234567890",
      "routingNumber": "123456789",
      "accountName": "John Doe",
      "bankName": "Chase Bank"
    }
  }
}
```

### PlanetTalk Credit Payout Example
```json
{
  "amount": 50.00,
  "method": "planettalk_credit",
  "description": "Weekly airtime allowance",
  "paymentDetails": {
    "planettalkCredit": {
      "planettalkMobile": "+263771234567",
      "accountName": "John Doe"
    }
  }
}
```

### Get Agent Payouts
**GET** `/agents/:agentId/payouts?status=pending`

Retrieve payout history for an agent with optional status filtering.

#### Query Parameters
- `status` (optional): Filter by payout status (`pending`, `approved`, `review`)

#### Response
```json
[
  {
    "id": "payout-uuid",
    "status": "approved",
    "method": "planettalk_credit",
    "amount": 50.00,
    "netAmount": 50.00,
    "requestedAt": "2025-10-11T08:00:00.000Z",
    "approvedAt": "2025-10-11T10:30:00.000Z",
    "paymentDetails": {
      "planettalkCredit": {
        "planettalkMobile": "+263771234567",
        "accountName": "John Doe"
      }
    }
  }
]
```

### Get Payout by ID
**GET** `/agents/payouts/:id`

Retrieve detailed information about a specific payout.

## Admin Endpoints

### Get All Payouts
**GET** `/admin/payouts`

Retrieve all payout requests with filtering options.

### Export Pending Payouts
**GET** `/admin/payouts/export`

Export pending payout data to CSV format with filtering and pagination options. **Defaults to pending status only**.

#### Query Parameters
- `status` (optional): Filter by status
- `method` (optional): Filter by payment method
- `page` (optional): Page number for pagination
- `limit` (optional): Number of results per page

#### Export Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 20)
- `format` (optional): Export format - `csv` or `json` (default: csv)
- `status` (optional): Filter by payout status
- `method` (optional): Filter by payment method
- `startDate` (optional): Filter from date (ISO format)
- `endDate` (optional): Filter to date (ISO format)

#### Export Examples

**Basic CSV Export (Pending Only):**
```
GET /admin/payouts/export?page=1&limit=20&format=csv
# Returns only pending payouts by default
```

**Export Approved Payouts:**
```
GET /admin/payouts/export?format=csv&status=approved&method=bank_transfer&startDate=2025-10-01&endDate=2025-10-31
```

**JSON Export:**
```
GET /admin/payouts/export?format=json&page=1&limit=50
```

#### CSV Output Format
The CSV export includes the following columns:
- Payout ID
- Agent Code  
- Agent Name
- Agent Email
- Status
- Method
- Amount
- Net Amount
- Fees
- Currency
- Description
- Requested Date
- Approved Date
- Transaction ID
- Payment Details
- Admin Notes
- Review Message

#### CSV Sample Output
```csv
Payout ID,Agent Code,Agent Name,Agent Email,Status,Method,Amount,Net Amount,Fees,Currency,Description,Requested Date,Approved Date,Transaction ID,Payment Details,Admin Notes,Review Message
payout-uuid-1,AGT15616,John Doe,john@example.com,approved,Bank Transfer,100.00,100.00,0.00,USD,Monthly commission,2025-10-11T08:00:00.000Z,2025-10-11T10:30:00.000Z,,Bank: Chase Bank | Account: ****7890 | Name: John Doe,Verified and approved,
payout-uuid-2,AGT20001,Jane Smith,jane@example.com,pending,PlanetTalk Credit,50.00,50.00,0.00,USD,Weekly allowance,2025-10-11T09:15:00.000Z,,,PlanetTalk: +263771234567 | Name: Jane Smith,,
```

#### Response
```json
{
  "data": [
    {
      "id": "payout-uuid",
      "status": "pending",
      "method": "bank_transfer",
      "amount": 100.00,
      "requestedAt": "2025-10-11T08:00:00.000Z",
      "agent": {
        "agentCode": "AGT15616",
        "user": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        }
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

### Individual Payout Operations

#### Approve Payout
**PATCH** `/admin/payouts/:id/approve`

Approve a payout request. Sends email notification to agent.

```json
{
  "adminNotes": "Verified and approved for processing"
}
```

#### Set Payout to Review
**PATCH** `/admin/payouts/:id/review`

Set payout to review status with custom message.

```json
{
  "reviewMessage": "Please provide additional documentation for this large payout request",
  "adminNotes": "Flagged for manual verification due to amount"
}
```

### Bulk Payout Operations

#### Bulk Process Payouts
**POST** `/admin/payouts/bulk-process`

Process multiple payouts with a single action.

#### Bulk Approve
```json
{
  "payoutIds": ["payout-1", "payout-2", "payout-3"],
  "action": "approve",
  "adminNotes": "Batch approval for verified payouts"
}
```

#### Bulk Review (Global Message)
```json
{
  "payoutIds": ["payout-4", "payout-5"],
  "action": "review",
  "reviewMessage": "These payouts exceed monthly limits and require manager approval",
  "adminNotes": "Flagged by automated compliance system"
}
```

#### Bulk Review (Individual Messages)
```json
{
  "payoutIds": ["payout-6", "payout-7", "payout-8"],
  "action": "review",
  "adminNotes": "Individual review required",
  "individualMessages": [
    {
      "payoutId": "payout-6",
      "reviewMessage": "Large amount requires manager approval"
    },
    {
      "payoutId": "payout-7", 
      "reviewMessage": "Suspicious activity detected - verify agent identity"
    },
    {
      "payoutId": "payout-8",
      "reviewMessage": "New agent - first payout requires verification"
    }
  ]
}
```

#### Response
```json
{
  "success": 3,
  "failed": 0,
  "errors": [],
  "successfulPayouts": [
    {
      "payoutId": "payout-6",
      "agentCode": "AGT15616",
      "amount": 100.00,
      "message": "Payout set to review: Large amount requires manager approval"
    },
    {
      "payoutId": "payout-7",
      "agentCode": "AGT20001", 
      "amount": 150.00,
      "message": "Payout set to review: New agent - identity verification needed"
    },
    {
      "payoutId": "payout-8",
      "agentCode": "AGT30002",
      "amount": 75.00,
      "message": "Payout set to review: Unusual activity pattern - security review required"
    }
  ],
  "failedPayouts": []
}
```

#### Response with Failures
```json
{
  "success": 2,
  "failed": 1,
  "errors": [
    {
      "id": "invalid-payout-id",
      "error": "Payout not found"
    }
  ],
  "successfulPayouts": [
    {
      "payoutId": "payout-1",
      "agentCode": "AGT15616",
      "amount": 100.00,
      "message": "Payout approved successfully"
    },
    {
      "payoutId": "payout-2",
      "agentCode": "AGT20001",
      "amount": 50.00,
      "message": "Payout approved successfully"
    }
  ],
  "failedPayouts": [
    {
      "payoutId": "invalid-payout-id",
      "error": "Payout not found"
    }
  ]
}
```

## Agent Stats Update Endpoints

### Update Stats by Agent ID
**POST** `/admin/agents/update-stats`

Update agent earnings and/or referrals by agent UUID.

```json
{
  "agentId": "6a30122e-dc7d-420b-bc49-701968ba014d",
  "amount": 125.50,
  "referralCount": 3,
  "description": "October 2025 performance update"
}
```

### Update Stats by Agent Code
**POST** `/admin/agents/update-stats-by-code`

Update agent earnings and/or referrals by agent code (more convenient for external systems).

```json
{
  "agentCode": "AGT15616",
  "amount": 125.50,
  "referralCount": 3,
  "description": "October 2025 performance update"
}
```

#### Response
```json
{
  "success": true,
  "agentId": "6a30122e-dc7d-420b-bc49-701968ba014d",
  "agentCode": "AGT15616",
  "earningsUpdated": true,
  "referralsUpdated": true,
  "newBalance": 129.50,
  "newReferralTotal": 3,
  "message": "Agent stats updated: earnings: $125.50, referrals: 3"
}
```

### Bulk Update Stats by Agent Codes
**POST** `/admin/agents/bulk-update-stats-by-code`

Update multiple agents' stats using agent codes.

```json
{
  "updates": [
    {
      "agentCode": "AGT15616",
      "amount": 100.00,
      "referralCount": 2,
      "description": "October performance"
    },
    {
      "agentCode": "AGT20001", 
      "amount": 75.50,
      "description": "Monthly commission"
    },
    {
      "agentCode": "AGT30002",
      "referralCount": 3,
      "description": "Referral bonus"
    }
  ],
  "batchDescription": "October 2025 stats update"
}
```

#### Response
```json
{
  "success": 3,
  "failed": 0,
  "errors": [],
  "totalEarningsUpdated": 175.50,
  "totalReferralsUpdated": 5
}
```

## Email Notifications

### Automatic Email Notifications

The system automatically sends email notifications for:

| Status Change | Template | Subject | Recipient |
|---------------|----------|---------|-----------|
| `PENDING` → `APPROVED` | `payout-approved.hbs` | 🎉 Payout Approved - PlanetTalk | Agent |
| `PENDING` → `REVIEW` | `payout-notification.hbs` | 🔍 Payout Under Review - PlanetTalk | Agent |
| `REVIEW` → `APPROVED` | `payout-approved.hbs` | 🎉 Payout Approved - PlanetTalk | Agent |

### Email Template Data

All email templates have access to:
- `agentName` - Full agent name
- `payoutId` - Payout UUID
- `amount` - Payout amount
- `status` - Current status
- `requestedDate` - When payout was requested
- `approvalDate` - When payout was approved (if applicable)
- `reviewMessage` - Custom review message (if applicable)
- `adminNotes` - Admin notes (if applicable)
- `paymentDetails` - Payment method details
- `dashboardUrl` - Link to agent dashboard

## Validation Rules

### Payout Amounts
- **Minimum**: $3.00
- **Maximum**: $100,000.00
- **Precision**: 2 decimal places

### Agent Code Format
- **Pattern**: `AGT` + 5 digits (e.g., `AGT15616`)
- **Length**: Exactly 8 characters
- **Case**: Uppercase

### Phone Numbers (for PlanetTalk Credit)
- **Format**: International format with country code
- **Pattern**: `+[country code][number]`
- **Example**: `+263771234567`
- **Length**: 10-15 digits after country code

### Status Transitions

| From Status | To Status | Allowed |
|-------------|-----------|---------|
| `PENDING` | `APPROVED` | ✅ |
| `PENDING` | `REVIEW` | ✅ |
| `REVIEW` | `APPROVED` | ✅ |
| `REVIEW` | `PENDING` | ✅ |
| `APPROVED` | Any | ❌ (Final state) |

## Error Responses

### Common Error Codes

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | `Insufficient available balance` | Agent doesn't have enough funds |
| 400 | `Invalid payout status transition` | Attempted invalid status change |
| 404 | `Agent not found` | Agent ID/code doesn't exist |
| 404 | `Payout not found` | Payout ID doesn't exist |

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Insufficient available balance for payout request",
  "error": "Bad Request"
}
```

### Bulk Operation Errors
```json
{
  "success": 2,
  "failed": 1,
  "errors": [
    {
      "agentCode": "AGT99999",
      "amount": 100.00,
      "error": "Agent with code AGT99999 not found"
    }
  ],
  "totalEarningsUpdated": 200.00,
  "totalReferralsUpdated": 3
}
```

## Authentication

All endpoints require JWT authentication with appropriate role permissions:

```http
Authorization: Bearer <jwt-token>
```

### Required Roles
- **Agent endpoints**: `agent` role
- **Admin endpoints**: `admin` or `pt_admin` role

## Rate Limiting

| Endpoint Type | Rate Limit |
|---------------|------------|
| Agent requests | 10 requests per minute |
| Admin operations | 100 requests per minute |
| Bulk operations | 5 requests per minute |

## Examples

### Complete Workflow Example

1. **Agent requests payout**:
```bash
POST /agents/6a30122e-dc7d-420b-bc49-701968ba014d/payouts
{
  "amount": 100.00,
  "method": "planettalk_credit",
  "paymentDetails": {
    "planettalkCredit": {
      "planettalkMobile": "+263771234567"
    }
  }
}
```

2. **Admin reviews and approves**:
```bash
PATCH /admin/payouts/payout-uuid/approve
{
  "adminNotes": "Verified and approved"
}
```

3. **Agent receives email notification** with approval details

4. **External system updates agent stats**:
```bash
POST /admin/agents/update-stats-by-code
{
  "agentCode": "AGT15616",
  "amount": 50.00,
  "referralCount": 2
}
```

### Bulk Operations Example

```bash
POST /admin/agents/bulk-update-stats-by-code
{
  "updates": [
    {
      "agentCode": "AGT15616",
      "amount": 100.00,
      "referralCount": 2
    },
    {
      "agentCode": "AGT20001",
      "amount": 150.00,
      "referralCount": 1
    }
  ],
  "batchDescription": "October 2025 monthly update"
}
```

## Testing

### Test Data

Use these test agent codes for development:
- `AGT15616` - Active agent with earnings
- `AGT20001` - Active agent for testing
- `AGT30002` - Test agent for bulk operations

### Sample Requests

#### Minimum Payout Request
```json
{
  "amount": 3.00,
  "method": "planettalk_credit",
  "paymentDetails": {
    "planettalkCredit": {
      "planettalkMobile": "+263771234567"
    }
  }
}
```

#### Maximum Payout Request
```json
{
  "amount": 100000.00,
  "method": "bank_transfer",
  "paymentDetails": {
    "bankAccount": {
      "accountNumber": "1234567890",
      "routingNumber": "123456789",
      "accountName": "John Doe",
      "bankName": "Test Bank"
    }
  }
}
```

## Migration Information

### Database Changes
- **Migration**: `RefinePayoutSystem1760167421270` and `RemoveRejectedStatus1760168885617`
- **New Fields**: `reviewMessage` column added to payouts table
- **Status Enum**: Updated to `['pending', 'approved', 'review']`
- **Method Enum**: Updated to `['bank_transfer', 'planettalk_credit']`

### Data Migration
- Old `requested`/`pending_review` → `pending`
- Old `processing`/`completed` → `approved`
- Old `airtime_topup` → `planettalk_credit`
- Old rejected/cancelled/failed records → `pending` (for review)

## Security Considerations

### Input Validation
- All amounts are validated with min/max limits
- Phone numbers must be in international format
- Agent codes must follow the AGT##### pattern
- All string inputs have length limits

### Access Control
- Agent endpoints: Only accessible by the agent owner
- Admin endpoints: Require admin or pt_admin role
- Bulk operations: Additional rate limiting applied

### Audit Trail
- All earnings updates create `AgentEarnings` records
- All payout status changes are logged with timestamps
- Admin actions include notes and metadata
- Email notifications provide paper trail

## Troubleshooting

### Common Issues

1. **"Insufficient available balance"**
   - Check agent's `availableBalance` vs requested amount
   - Ensure previous payouts aren't stuck in pending

2. **"Agent already has pending payout requests"**
   - Only one pending payout allowed per agent
   - Previous payout must be approved or reviewed first

3. **"Invalid phone number format"**
   - Must include country code (e.g., `+263771234567`)
   - No spaces or special characters except `+`

4. **"Agent with code AGT##### not found"**
   - Verify agent code exists and is active
   - Check for typos in agent code

### Support

For technical support with the payout system:
- **Email**: support@planettalk.com
- **Phone**: +1-800-PLANET-TALK
- **Documentation**: This file and API documentation
