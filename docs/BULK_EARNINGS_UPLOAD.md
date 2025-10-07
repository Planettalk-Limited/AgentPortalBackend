# Bulk Earnings Upload API

This document describes how to use the bulk earnings upload endpoint to upload agent codes and earnings data to update agent balances.

## Endpoint

```
POST /admin/earnings/bulk-upload
```

**Authentication Required:** JWT Bearer Token (Admin only)

## Request Body

The endpoint accepts a JSON payload with the following structure:

```typescript
{
  "earnings": [
    {
      "agentCode": "string",      // Agent code to identify the agent
      "amount": number,           // Earning amount (positive for credits)
      "type": "referral_commission" | "bonus" | "penalty" | "adjustment" | "promotion_bonus",
      "description": "string",    // Description of the earning
      "referenceId": "string",    // Optional: External reference ID
      "commissionRate": number,   // Optional: Commission rate used (percentage)
      "earnedAt": "ISO string",   // Optional: Date when earned (defaults to now)
      "currency": "string"        // Optional: Currency code (defaults to USD)
    }
  ],
  "batchDescription": "string",   // Optional: Batch description for tracking
  "autoConfirm": boolean,         // Optional: Auto-confirm earnings (default: false)
  "metadata": {}                  // Optional: Additional metadata
}
```

## Example Request

```json
{
  "earnings": [
    {
      "agentCode": "AG123456",
      "amount": 25.50,
      "type": "referral_commission",
      "description": "Commission for customer referral - Transaction #12345",
      "referenceId": "TXN-12345-ABC",
      "commissionRate": 10.5,
      "earnedAt": "2025-01-15T10:30:00Z"
    },
    {
      "agentCode": "AG789012",
      "amount": 50.00,
      "type": "bonus",
      "description": "Monthly performance bonus",
      "referenceId": "BONUS-JAN-2025"
    },
    {
      "agentCode": "AG345678",
      "amount": 15.75,
      "type": "referral_commission",
      "description": "Commission for mobile top-up referral",
      "commissionRate": 12.0
    }
  ],
  "batchDescription": "Monthly commission upload - January 2025",
  "autoConfirm": true,
  "metadata": {
    "uploadSource": "PlanetTalk API",
    "batchId": "BATCH-2025-001"
  }
}
```

## Response

The endpoint returns a detailed result object:

```json
{
  "totalProcessed": 3,
  "successful": 2,
  "failed": 1,
  "skipped": 0,
  "totalAmount": 75.50,
  "updatedAgents": ["AG123456", "AG789012"],
  "details": [
    {
      "agentCode": "AG123456",
      "status": "success",
      "earningId": "uuid-string",
      "amount": 25.50,
      "message": "Earning created and confirmed"
    },
    {
      "agentCode": "AG789012",
      "status": "success",
      "earningId": "uuid-string",
      "amount": 50.00,
      "message": "Earning created and confirmed"
    },
    {
      "agentCode": "AG345678",
      "status": "failed",
      "amount": 15.75,
      "error": "Agent code not found"
    }
  ],
  "errorSummary": {
    "invalidAgentCodes": ["AG345678"],
    "duplicateReferences": [],
    "validationErrors": [],
    "otherErrors": []
  },
  "batchInfo": {
    "batchId": "BATCH-1737037200000-abc123def",
    "processedAt": "2025-01-15T10:30:00.000Z",
    "processingTimeMs": 1250,
    "uploadedBy": "admin"
  }
}
```

## Features

### 1. **Agent Code Validation**
- Validates that all agent codes exist in the system
- Returns detailed error information for invalid codes

### 2. **Duplicate Prevention**
- Checks for duplicate reference IDs within the batch
- Checks for existing reference IDs in the database
- Skips duplicate entries with appropriate messages

### 3. **Balance Updates**
- Automatically updates agent balances when `autoConfirm: true`
- Updates both `totalEarnings` and `availableBalance` fields
- Only confirmed earnings affect balances

### 4. **Notifications**
- Sends notifications to agents about new earnings (when auto-confirmed)
- Groups multiple earnings per agent into a single notification

### 5. **Comprehensive Reporting**
- Detailed success/failure status for each entry
- Processing time and batch metadata
- Error categorization and summaries

### 6. **Batch Processing**
- Supports up to 1,000 entries per batch
- Generates unique batch IDs for tracking
- Atomic processing with rollback on critical errors

## Earning Types

- `referral_commission`: Standard commission from referrals
- `bonus`: Performance or promotional bonuses
- `penalty`: Deductions or penalties
- `adjustment`: Manual adjustments (positive or negative)
- `promotion_bonus`: Special promotional bonuses

## Auto-Confirm vs Pending

### Auto-Confirm (autoConfirm: true)
- Earnings are immediately confirmed
- Agent balances are updated immediately
- Agents receive notifications
- Earnings appear as available for payout

### Pending (autoConfirm: false - default)
- Earnings are created in pending status
- Agent balances are NOT updated
- Requires manual approval via admin panel
- Balances updated only after approval

## Error Handling

The system handles various error scenarios:

1. **Invalid Agent Codes**: Non-existent agent codes are reported
2. **Duplicate References**: Duplicate reference IDs are skipped
3. **Validation Errors**: Invalid amounts, types, etc.
4. **Database Errors**: Connection or constraint issues
5. **Processing Errors**: Unexpected errors during processing

## Usage Examples

### Uploading Monthly Commissions
```bash
curl -X POST "https://your-api.com/admin/earnings/bulk-upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "earnings": [
      {
        "agentCode": "AG123456",
        "amount": 125.50,
        "type": "referral_commission",
        "description": "January 2025 monthly commissions",
        "referenceId": "MONTHLY-JAN-2025-AG123456"
      }
    ],
    "batchDescription": "January 2025 monthly commission payout",
    "autoConfirm": true
  }'
```

### Uploading Performance Bonuses
```bash
curl -X POST "https://your-api.com/admin/earnings/bulk-upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "earnings": [
      {
        "agentCode": "AG123456",
        "amount": 100.00,
        "type": "bonus",
        "description": "Q4 2024 performance bonus",
        "referenceId": "PERF-BONUS-Q4-2024-AG123456"
      }
    ],
    "batchDescription": "Q4 2024 performance bonuses",
    "autoConfirm": false
  }'
```

## Best Practices

1. **Always use unique reference IDs** to prevent duplicates
2. **Start with small batches** to test the integration
3. **Use autoConfirm: false** for initial testing
4. **Monitor the response** for any failed or skipped entries
5. **Keep batch descriptions meaningful** for audit trails
6. **Validate agent codes** before uploading large batches

## Rate Limits

- Maximum 1,000 entries per batch
- No specific rate limiting on requests
- Consider system performance for large batches

## Security

- Requires admin-level JWT authentication
- All uploads are logged with batch IDs
- Audit trail maintained for all earnings
- Reference ID uniqueness enforced
