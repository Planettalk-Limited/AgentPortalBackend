# Admin Agent Management API

## Overview

This document provides complete API reference for admin-level agent management operations in the PlanetTalk Agent Portal system.

## Authentication

All endpoints require admin authentication:

```http
Authorization: Bearer <jwt-token>
```

**Required Roles**: `admin` or `pt_admin`

## Agent CRUD Operations

### 1. Create Agent

**POST** `/admin/agents`

Create a new agent from the admin panel.

#### Request Body
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "US",
  "status": "pending_application",
  "commissionRate": 15.0,
  "notes": "New agent onboarding via admin panel",
  "userId": "existing-user-uuid-optional"
}
```

#### Required Fields
- `firstName` (string, 1-100 chars)
- `lastName` (string, 1-100 chars)
- `email` (valid email format, unique)

#### Optional Fields
- `phone` (string, international format)
- `address` (string)
- `city` (string)
- `state` (string)
- `zipCode` (string)
- `country` (string, 2-letter ISO code)
- `status` (AgentStatus enum, default: `pending_application`)
- `commissionRate` (number, 0-100, default: 10.0)
- `notes` (string, max 1000 chars)
- `userId` (UUID, links to existing user)

#### Admin Override & Auto-Verification
**Important**: Admin-created agents bypass all verification requirements:

**Auto-User Creation** (if `userId` not provided):
1. ✅ Creates new user account with provided details
2. ✅ Generates username from email (part before @)
3. ✅ Creates temporary password (stored in user metadata)
4. ✅ **Auto-verifies email** (sets `emailVerifiedAt`)
5. ✅ **Sets user status to active** (no pending verification)
6. ✅ **Skips first login flow** (ready to use immediately)

**Auto-Agent Activation**:
1. ✅ **Sets agent status to ACTIVE** (default, unless specified)
2. ✅ **Sets activation timestamp** (`activatedAt`)
3. ✅ **Marks as admin verified** in metadata
4. ✅ **Ready for earnings and payouts** immediately

#### Response
```json
{
  "id": "6a30122e-dc7d-420b-bc49-701968ba014d",
  "agentCode": "AGT15617",
  "status": "active",
  "tier": "bronze",
  "totalEarnings": 0.00,
  "availableBalance": 0.00,
  "pendingBalance": 0.00,
  "totalReferrals": 0,
  "activeReferrals": 0,
  "commissionRate": 15.0,
  "notes": "New agent onboarding via admin panel",
  "activatedAt": "2025-10-11T10:00:00.000Z",
  "lastActivityAt": "2025-10-11T10:00:00.000Z",
  "createdAt": "2025-10-11T10:00:00.000Z",
  "updatedAt": "2025-10-11T10:00:00.000Z",
  "userId": "auto-created-user-uuid",
  "user": {
    "id": "auto-created-user-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "username": "john.doe",
    "role": "agent",
    "status": "active",
    "phoneNumber": "+1234567890",
    "country": "US",
    "emailVerifiedAt": "2025-10-11T10:00:00.000Z",
    "isFirstLogin": false,
    "metadata": {
      "createdByAdmin": true,
      "adminVerified": true,
      "emailVerifiedByAdmin": true,
      "tempPassword": "TempPass123", // Temporary password for login
      "verifiedAt": "2025-10-11T10:00:00.000Z"
    }
  }
}
```

#### Auto-Created User Details
When a user is automatically created by admin:
- **Username**: Generated from email (e.g., `john.doe` from `john.doe@example.com`)
- **Password**: Random 12-character temporary password
- **Role**: Set to `agent`
- **Status**: Set to `active` (verified)
- **Email**: Auto-verified with timestamp
- **First Login**: Disabled (no onboarding flow required)
- **Metadata**: Includes admin verification flags and temp password

#### Admin Verification Benefits
✅ **Immediate Access**: Agent can log in and use system immediately
✅ **Skip Onboarding**: No email verification or application process
✅ **Ready for Business**: Can receive earnings and request payouts right away
✅ **Full Functionality**: All features available from day one

### 2. Get All Agents

**GET** `/admin/agents`

Retrieve all agents with optional filtering and pagination.

#### Query Parameters
- `status` (optional): Filter by agent status
- `tier` (optional): Filter by agent tier
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 20)

#### Request Examples
```bash
# Get all agents
GET /admin/agents

# Get active agents only
GET /admin/agents?status=active

# Get bronze tier agents
GET /admin/agents?tier=bronze

# Paginated results
GET /admin/agents?page=2&limit=50

# Combined filters
GET /admin/agents?status=active&tier=gold&page=1&limit=10
```

#### Response
```json
{
  "agents": [
    {
      "id": "agent-uuid-1",
      "agentCode": "AGT15616",
      "status": "active",
      "tier": "bronze",
      "totalEarnings": 150.00,
      "availableBalance": 50.00,
      "totalReferrals": 5,
      "user": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "summary": {
    "totalAgents": 45,
    "activeAgents": 38,
    "totalEarnings": 15420.50
  }
}
```

### 3. Get Single Agent

**GET** `/admin/agents/:id`

Retrieve detailed information about a specific agent.

#### Request
```bash
GET /admin/agents/6a30122e-dc7d-420b-bc49-701968ba014d
```

#### Response
```json
{
  "id": "6a30122e-dc7d-420b-bc49-701968ba014d",
  "agentCode": "AGT15616",
  "status": "active",
  "tier": "bronze",
  "totalEarnings": 250.00,
  "availableBalance": 75.00,
  "pendingBalance": 100.00,
  "totalReferrals": 8,
  "activeReferrals": 6,
  "commissionRate": 15.0,
  "activatedAt": "2025-10-08T07:16:14.438Z",
  "lastActivityAt": "2025-10-11T09:30:00.000Z",
  "notes": "Top performer this month",
  "metadata": {
    "registrationMethod": "admin_created",
    "createdBy": "admin-user-id"
  },
  "user": {
    "id": "user-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "country": "US",
    "phoneNumber": "+1234567890",
    "status": "active"
  },
  "earningsThisMonth": 125.50,
  "referralsThisMonth": 3
}
```

### 4. Update Agent

**PATCH** `/admin/agents/:id`

Update agent information and settings.

#### Request Body
```json
{
  "status": "active",
  "tier": "silver",
  "commissionRate": 18.0,
  "notes": "Promoted to silver tier due to excellent performance",
  "metadata": {
    "promotedBy": "admin-user-id",
    "promotionDate": "2025-10-11T10:00:00.000Z"
  }
}
```

#### Response
```json
{
  "id": "6a30122e-dc7d-420b-bc49-701968ba014d",
  "agentCode": "AGT15616",
  "status": "active",
  "tier": "silver",
  "commissionRate": 18.0,
  "notes": "Promoted to silver tier due to excellent performance",
  "updatedAt": "2025-10-11T10:00:00.000Z"
}
```

### 5. Delete Agent

**DELETE** `/admin/agents/:id`

Remove an agent from the system.

#### Request
```bash
DELETE /admin/agents/6a30122e-dc7d-420b-bc49-701968ba014d
```

#### Response
```json
{
  "success": true,
  "message": "Agent AGT15616 has been deleted successfully"
}
```

## Agent Statistics Management

### 6. Get Agent Statistics

**GET** `/admin/agents/stats`

Get system-wide agent statistics.

#### Response
```json
{
  "totalAgents": 150,
  "activeAgents": 125,
  "byStatus": {
    "active": 125,
    "inactive": 15,
    "suspended": 5,
    "pending_application": 5
  },
  "byTier": {
    "bronze": 80,
    "silver": 45,
    "gold": 20,
    "platinum": 5
  },
  "totalEarnings": 125420.50,
  "totalPayouts": 98650.00,
  "averageEarnings": 836.14
}
```

### 7. Update Agent Earnings (Individual)

**POST** `/admin/agents/update-earnings`

Add earnings to a specific agent.

#### Request Body
```json
{
  "agentId": "6a30122e-dc7d-420b-bc49-701968ba014d",
  "amount": 125.50,
  "description": "October 2025 commission",
  "metadata": {
    "source": "monthly_calculation",
    "period": "2025-10"
  }
}
```

#### Response
```json
{
  "success": true,
  "newBalance": 200.50,
  "message": "Agent earnings updated by $125.50"
}
```

### 8. Update Agent Referrals (Individual)

**POST** `/admin/agents/update-referrals`

Add referrals to a specific agent.

#### Request Body
```json
{
  "agentId": "6a30122e-dc7d-420b-bc49-701968ba014d",
  "referralCount": 3,
  "description": "October 2025 confirmed referrals",
  "metadata": {
    "source": "referral_system",
    "period": "2025-10"
  }
}
```

#### Response
```json
{
  "success": true,
  "newTotal": 11,
  "message": "Agent referrals updated by 3"
}
```

### 9. Update Agent Stats (Combined)

**POST** `/admin/agents/update-stats`

Update both earnings and referrals in a single request.

#### Request Body
```json
{
  "agentId": "6a30122e-dc7d-420b-bc49-701968ba014d",
  "amount": 150.00,
  "referralCount": 2,
  "description": "October 2025 performance update",
  "metadata": {
    "source": "monthly_report",
    "period": "2025-10"
  }
}
```

#### Response
```json
{
  "success": true,
  "earningsUpdated": true,
  "referralsUpdated": true,
  "newBalance": 225.00,
  "newReferralTotal": 10,
  "message": "Agent stats updated: earnings: $150.00, referrals: 2"
}
```

### 10. Update Agent Stats by Code

**POST** `/admin/agents/update-stats-by-code`

Update agent stats using agent code instead of UUID (more convenient for external systems).

#### Request Body
```json
{
  "agentCode": "AGT15616",
  "amount": 75.50,
  "referralCount": 1,
  "description": "Weekly performance bonus",
  "metadata": {
    "source": "weekly_calculation"
  }
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
  "newBalance": 300.50,
  "newReferralTotal": 11,
  "message": "Agent stats updated: earnings: $75.50, referrals: 1"
}
```

## Bulk Operations

### 11. Bulk Update Earnings

**POST** `/admin/agents/bulk-update-earnings`

Update earnings for multiple agents at once.

#### Request Body
```json
{
  "updates": [
    {
      "agentId": "agent-1-uuid",
      "amount": 100.00,
      "description": "October commission"
    },
    {
      "agentId": "agent-2-uuid",
      "amount": 150.00,
      "description": "October commission + bonus"
    },
    {
      "agentId": "agent-3-uuid",
      "amount": -25.00,
      "description": "Correction for September overpayment"
    }
  ],
  "batchDescription": "October 2025 monthly earnings update"
}
```

#### Response
```json
{
  "success": 3,
  "failed": 0,
  "errors": [],
  "totalAmount": 225.00
}
```

### 12. Bulk Update Referrals

**POST** `/admin/agents/bulk-update-referrals`

Update referrals for multiple agents at once.

#### Request Body
```json
{
  "updates": [
    {
      "agentId": "agent-1-uuid",
      "referralCount": 2,
      "description": "October confirmed referrals"
    },
    {
      "agentId": "agent-2-uuid", 
      "referralCount": 5,
      "description": "October referral bonus"
    }
  ],
  "batchDescription": "October 2025 referral updates"
}
```

#### Response
```json
{
  "success": 2,
  "failed": 0,
  "errors": [],
  "totalReferrals": 7
}
```

### 13. Bulk Update Agent Stats

**POST** `/admin/agents/bulk-update-stats`

Update both earnings and referrals for multiple agents.

#### Request Body
```json
{
  "updates": [
    {
      "agentId": "agent-1-uuid",
      "amount": 125.00,
      "referralCount": 2,
      "description": "October performance"
    },
    {
      "agentId": "agent-2-uuid",
      "amount": 200.00,
      "description": "October commission only"
    },
    {
      "agentId": "agent-3-uuid",
      "referralCount": 3,
      "description": "October referrals only"
    }
  ],
  "batchDescription": "October 2025 comprehensive update"
}
```

#### Response
```json
{
  "success": 3,
  "failed": 0,
  "errors": [],
  "totalEarningsUpdated": 325.00,
  "totalReferralsUpdated": 5
}
```

### 14. Bulk Update Stats by Agent Codes

**POST** `/admin/agents/bulk-update-stats-by-code`

Update multiple agents using agent codes (recommended for external systems).

#### Request Body
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
      "description": "October commission"
    },
    {
      "agentCode": "AGT30002",
      "referralCount": 4,
      "description": "October referral bonus"
    },
    {
      "agentCode": "AGT40003",
      "amount": -10.00,
      "description": "Correction for duplicate payment"
    }
  ],
  "batchDescription": "October 2025 monthly stats update"
}
```

#### Response
```json
{
  "success": 4,
  "failed": 0,
  "errors": [],
  "totalEarningsUpdated": 165.50,
  "totalReferralsUpdated": 6
}
```

#### Response with Errors
```json
{
  "success": 3,
  "failed": 1,
  "errors": [
    {
      "agentCode": "AGT99999",
      "amount": 100.00,
      "error": "Agent with code AGT99999 not found"
    }
  ],
  "totalEarningsUpdated": 265.50,
  "totalReferralsUpdated": 6
}
```

## Agent Status Management

### 15. Activate Agent

**PATCH** `/admin/agents/:id/activate`

Activate an agent account.

#### Request
```bash
PATCH /admin/agents/6a30122e-dc7d-420b-bc49-701968ba014d/activate
```

#### Request Body
```json
{
  "adminNotes": "Agent verification completed, activating account"
}
```

#### Response
```json
{
  "success": true,
  "agentCode": "AGT15616",
  "previousStatus": "pending_application",
  "newStatus": "active",
  "activatedAt": "2025-10-11T10:00:00.000Z",
  "message": "Agent AGT15616 activated successfully"
}
```

### 16. Suspend Agent

**PATCH** `/admin/agents/:id/suspend`

Suspend an agent account.

#### Request Body
```json
{
  "reason": "Policy violation - multiple account creation",
  "adminNotes": "Suspended pending investigation"
}
```

#### Response
```json
{
  "success": true,
  "agentCode": "AGT15616",
  "previousStatus": "active",
  "newStatus": "suspended",
  "suspendedAt": "2025-10-11T10:00:00.000Z",
  "reason": "Policy violation - multiple account creation",
  "message": "Agent AGT15616 suspended successfully"
}
```

### 17. Update Agent Tier

**PATCH** `/admin/agents/:id/tier`

Update agent tier level.

#### Request Body
```json
{
  "tier": "silver",
  "reason": "Performance milestone reached",
  "adminNotes": "Promoted due to consistent high performance"
}
```

#### Response
```json
{
  "success": true,
  "agentCode": "AGT15616",
  "previousTier": "bronze",
  "newTier": "silver",
  "updatedAt": "2025-10-11T10:00:00.000Z",
  "message": "Agent AGT15616 promoted to silver tier"
}
```

## Agent Earnings Management

### 18. Suspend Agent Earnings

**PATCH** `/admin/agents/:id/suspend-earnings`

Temporarily suspend earnings for an agent.

#### Request Body
```json
{
  "reason": "Under investigation for suspicious activity",
  "adminNotes": "Earnings suspended pending compliance review"
}
```

#### Response
```json
{
  "success": true,
  "agentCode": "AGT15616",
  "earningsSuspended": true,
  "suspendedAt": "2025-10-11T10:00:00.000Z",
  "reason": "Under investigation for suspicious activity",
  "message": "Earnings suspended for agent AGT15616"
}
```

### 19. Resume Agent Earnings

**PATCH** `/admin/agents/:id/resume-earnings`

Resume earnings for a previously suspended agent.

#### Request Body
```json
{
  "adminNotes": "Investigation completed, no violations found"
}
```

#### Response
```json
{
  "success": true,
  "agentCode": "AGT15616",
  "earningsResumed": true,
  "resumedAt": "2025-10-11T10:00:00.000Z",
  "message": "Earnings resumed for agent AGT15616"
}
```

## Agent Status Enums

### AgentStatus Values
- `pending_application` - Initial status when created
- `application_approved` - Application has been reviewed and approved
- `code_generated` - Agent code has been generated
- `credentials_sent` - Login credentials have been sent
- `active` - Agent is active and earning
- `inactive` - Agent is temporarily inactive
- `suspended` - Agent is suspended

### AgentTier Values
- `bronze` - Entry level (default)
- `silver` - Mid-level performer
- `gold` - High performer
- `platinum` - Top performer
- `diamond` - Elite performer

## Error Responses

### Common Error Codes

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | `Invalid agent data` | Validation failed on input data |
| 400 | `User with email X already exists` | Email is already registered |
| 400 | `User with phone number X already exists` | Phone number is already registered |
| 400 | `User already has an agent account with code X` | User ID already linked to another agent |
| 404 | `Agent not found` | Agent ID/code doesn't exist |
| 409 | `Agent code already exists` | Generated code collision (rare) |

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Email already exists for another agent",
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

## Validation Rules

### Agent Creation
- **Email**: Must be valid email format, unique across entire system
- **Phone**: International format with country code (e.g., `+1234567890`), must be unique
- **Username**: Auto-generated from email, made unique with timestamp if needed
- **Commission Rate**: 0-100 (percentage)
- **Names**: 1-100 characters, no special characters
- **Country**: 2-letter ISO code (e.g., `US`, `ZA`, `KE`)
- **User Linking**: Each user can only have one agent account

### Stats Updates
- **Earnings**: -$100,000 to +$100,000 per update
- **Referrals**: -1000 to +1000 per update
- **Negative Protection**: Balances/counts can't go below 0
- **Description**: Max 500 characters

## Best Practices

### Agent Creation
- ✅ Always include phone number for communication
- ✅ Set appropriate commission rate based on agreement
- ✅ Add meaningful notes for tracking
- ✅ Link to existing user if available

### Bulk Operations
- ✅ Process in smaller batches (50-100 agents max)
- ✅ Include descriptive batch descriptions
- ✅ Review error responses carefully
- ✅ Retry failed operations individually

### Stats Updates
- ✅ Include period information in metadata
- ✅ Use consistent description formats
- ✅ Verify data before bulk uploads
- ✅ Monitor for negative balance warnings

## Integration Examples

### Monthly Agent Stats Update
```bash
# 1. Export current agent list
GET /admin/agents?status=active&limit=1000

# 2. Calculate earnings and referrals externally

# 3. Bulk update using agent codes
POST /admin/agents/bulk-update-stats-by-code
{
  "updates": [
    // ... calculated updates for all agents
  ],
  "batchDescription": "October 2025 monthly performance update"
}
```

### New Agent Onboarding
```bash
# 1. Create agent
POST /admin/agents
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "commissionRate": 15.0
}

# 2. Activate agent
PATCH /admin/agents/:id/activate

# 3. Set initial stats (if applicable)
POST /admin/agents/update-stats
{
  "agentId": "new-agent-uuid",
  "amount": 0.00,
  "referralCount": 0,
  "description": "Initial agent setup"
}
```

## Security Considerations

### Access Control
- All endpoints require admin JWT token
- Agent creation logs admin user who created the agent
- All modifications include audit trail
- Sensitive operations require additional notes

### Data Protection
- Email addresses are validated and unique
- Phone numbers stored in international format
- Financial data includes audit trail
- All changes are timestamped and tracked

### Rate Limiting
- Bulk operations: 5 requests per minute
- Individual operations: 100 requests per minute
- Stats updates: 50 requests per minute

## Support

For technical questions about agent management:
- **Email**: tech-support@planettalk.com
- **Documentation**: API documentation and this guide
- **Emergency**: +1-800-PLANET-EMERGENCY
