# Earnings Approval System

## Overview

The PlanetTalk Agent Portal implements a **pending earnings approval system** where all referral commissions start as `PENDING` and require admin approval before being credited to agent balances.

## Flow Diagram

```
Customer Uses Referral Code
           ↓
    Creates PENDING Earning
           ↓
   Admin Reviews & Decides
           ↓
    ┌─────────────────┐
    ▼                 ▼
APPROVE              REJECT
    ↓                 ↓
CONFIRMED         CANCELLED
    ↓                 ↓
Added to Balance   No Payment
```

## Earning Statuses

| Status | Description | Action Required |
|--------|-------------|-----------------|
| `PENDING` | New referral commission awaiting approval | Admin review needed |
| `CONFIRMED` | Approved by admin, added to agent balance | None - payment eligible |
| `CANCELLED` | Rejected by admin with reason | None - no payment |

---

## API Endpoints

### 1. Get Pending Earnings

**Endpoint:** `GET /admin/earnings/pending`

**Description:** Retrieve all pending earnings for admin review

**Authentication:** Required (Admin/PT_Admin only)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20) |
| `agentId` | string | No | Filter by specific agent |

**Request:**
```http
GET /admin/earnings/pending?page=1&limit=10&agentId=uuid-here
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Response (200):**
```json
{
  "earnings": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "amount": 3.75,
      "currency": "USD",
      "description": "PlanetTalk referral commission - Takudzwa Bvungidzire (+263783441993)",
      "earnedAt": "2025-09-24T16:12:03.828Z",
      "commissionRate": 15.00,
      "referenceId": "AGT-AGT97902-2025-001",
      "agent": {
        "id": "agent-uuid-here",
        "agentCode": "AGT97902",
        "firstName": "John",
        "lastName": "Doe",
        "fullName": "John Doe",
        "tier": "bronze"
      },
      "metadata": {
        "agentCode": "AGT97902",
        "referralMethod": "agent_code",
        "customerInfo": {
          "name": "Takudzwa Bvungidzire",
          "phone": "+263783441993"
        },
        "serviceDetails": {
          "serviceType": "PlanetTalk Airtime Service",
          "signupAmount": 25.00
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 2. Approve Individual Earning

**Endpoint:** `POST /admin/earnings/{earningId}/approve`

**Description:** Approve a specific pending earning

**Authentication:** Required (Admin/PT_Admin only)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `earningId` | string | Yes | UUID of the earning to approve |

**Request:**
```http
POST /admin/earnings/550e8400-e29b-41d4-a716-446655440000/approve
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "notes": "Commission approved for verified referral. Customer confirmed active usage."
}
```

**Response (200):**
```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 3.75,
  "status": "confirmed",
  "message": "Earning of $3.75 approved for agent John Doe"
}
```

**Error Responses:**
```json
// 404 - Earning not found
{
  "message": "Earning not found",
  "error": "Not Found",
  "statusCode": 404
}

// 400 - Not in pending status
{
  "message": "Earning is not in pending status",
  "error": "Bad Request", 
  "statusCode": 400
}
```

---

### 3. Reject Individual Earning

**Endpoint:** `POST /admin/earnings/{earningId}/reject`

**Description:** Reject a specific pending earning

**Authentication:** Required (Admin/PT_Admin only)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `earningId` | string | Yes | UUID of the earning to reject |

**Request:**
```http
POST /admin/earnings/550e8400-e29b-41d4-a716-446655440000/reject
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reason": "Invalid referral",
  "notes": "Customer account shows no actual airtime purchases. Suspected fake referral."
}
```

**Response (200):**
```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 3.75,
  "status": "cancelled",
  "reason": "Invalid referral",
  "message": "Earning of $3.75 rejected for agent John Doe"
}
```

---

### 4. Bulk Approve Earnings

**Endpoint:** `POST /admin/earnings/bulk-approve`

**Description:** Approve multiple pending earnings at once

**Authentication:** Required (Admin/PT_Admin only)

**Request:**
```http
POST /admin/earnings/bulk-approve
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "earningIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001", 
    "550e8400-e29b-41d4-a716-446655440002"
  ],
  "notes": "Batch approval for verified referrals - weekly review completed"
}
```

**Response (200):**
```json
{
  "success": true,
  "summary": "3 earnings approved, 0 failed",
  "approved": 3,
  "failed": 0,
  "errors": []
}
```

**Response with Partial Failures:**
```json
{
  "success": true,
  "summary": "2 earnings approved, 1 failed",
  "approved": 2,
  "failed": 1,
  "errors": [
    {
      "earningId": "550e8400-e29b-41d4-a716-446655440002",
      "error": "Earning is not in pending status"
    }
  ]
}
```

---

### 5. Bulk Reject Earnings

**Endpoint:** `POST /admin/earnings/bulk-reject`

**Description:** Reject multiple pending earnings at once

**Authentication:** Required (Admin/PT_Admin only)

**Request:**
```http
POST /admin/earnings/bulk-reject
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "earningIds": [
    "550e8400-e29b-41d4-a716-446655440003",
    "550e8400-e29b-41d4-a716-446655440004"
  ],
  "reason": "Duplicate referrals",
  "notes": "Same customers found referred by multiple agents - keeping first referral only"
}
```

**Response (200):**
```json
{
  "success": true,
  "summary": "2 earnings rejected, 0 failed",
  "rejected": 2,
  "failed": 0,
  "errors": []
}
```

---

## Usage Examples

### Admin Workflow

#### 1. **Daily Review Process**
```bash
# Get all pending earnings
curl -X GET "http://localhost:3000/admin/earnings/pending?limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Review and approve legitimate referrals
curl -X POST "http://localhost:3000/admin/earnings/earning-123/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Customer verified via phone call"}'

# Reject suspicious referrals
curl -X POST "http://localhost:3000/admin/earnings/earning-456/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "No customer activity", "notes": "No airtime purchases after 30 days"}'
```

#### 2. **Weekly Bulk Approval**
```bash
# Get all pending earnings for review
curl -X GET "http://localhost:3000/admin/earnings/pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Bulk approve verified earnings
curl -X POST "http://localhost:3000/admin/earnings/bulk-approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "earningIds": ["id1", "id2", "id3"],
    "notes": "Weekly batch approval - all customers verified"
  }'
```

#### 3. **Specific Agent Review**
```bash
# Get pending earnings for specific agent
curl -X GET "http://localhost:3000/admin/earnings/pending?agentId=agent-uuid" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Database Changes

### Earning Status Flow
```sql
-- Default status is now PENDING
INSERT INTO agent_earnings (status, ...) VALUES ('pending', ...);

-- After approval
UPDATE agent_earnings 
SET status = 'confirmed', confirmed_at = NOW(), 
    metadata = metadata || '{"approvedBy": "admin", "approvedAt": "2025-09-24T16:30:00Z"}'
WHERE id = 'earning-id';

-- After rejection  
UPDATE agent_earnings 
SET status = 'cancelled',
    metadata = metadata || '{"rejectedBy": "admin", "rejectionReason": "Invalid referral"}'
WHERE id = 'earning-id';
```

---

## Security & Permissions

### Role-Based Access
| Role | Get Pending | Approve | Reject | Bulk Operations |
|------|-------------|---------|--------|-----------------|
| `ADMIN` | ✅ | ✅ | ✅ | ✅ |
| `PT_ADMIN` | ✅ | ✅ | ✅ | ✅ |
| `AGENT` | ❌ | ❌ | ❌ | ❌ |

### Audit Trail
All approval/rejection actions are logged with:
- **Who**: Admin user ID who performed action
- **When**: Timestamp of action  
- **Why**: Reason and notes provided
- **What**: Earning ID and amount affected

### Data Validation
- Earning must exist and be in `PENDING` status
- Admin must be authenticated with appropriate role
- Bulk operations validate all earning IDs before processing
- Rejection requires a reason field

---

## Integration Notes

### Frontend Implementation
```javascript
// Get pending earnings for admin dashboard
const pendingEarnings = await fetch('/admin/earnings/pending', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});

// Approve earning with confirmation
const approveEarning = async (earningId, notes) => {
  return await fetch(`/admin/earnings/${earningId}/approve`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ notes })
  });
};
```

### Webhook Integration
Consider adding webhooks for:
- New pending earnings created
- Earnings approved/rejected
- Bulk operations completed

This enables real-time notifications to external systems or admin dashboards.
