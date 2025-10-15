# Bank Details and Earnings Data Upload

## Overview

This document describes the updated bank details structure and the new earnings data upload functionality for the Agent Portal.

## Bank Details Structure

### Required Fields (Mandatory)

The following fields are **mandatory** when capturing bank details:

1. **Bank Name** - The name of the bank
2. **Account Name** - Must match the Agent registration name
3. **Account Number/IBAN** - Account number or International Bank Account Number
4. **Currency** - The currency of the account (e.g., GBP, CAD, EUR, NGN, USD)
5. **Bank Country** - The country where the bank is located

### Optional Fields

The following fields are optional but recommended for international payments:

- **Branch Name/Branch Code** - Branch name or code
- **SWIFT/BIC Code** - Required for international payments
- **Additional Notes** - Any additional information about the bank account

### Supported Currencies

- **GBP** - British Pound Sterling
- **CAD** - Canadian Dollar
- **EUR** - Euro
- **NGN** - Nigerian Naira
- **USD** - United States Dollar
- **ZAR** - South African Rand
- **KES** - Kenyan Shilling
- **GHS** - Ghanaian Cedi
- **UGX** - Ugandan Shilling
- **TZS** - Tanzanian Shilling

### Example Bank Details

```json
{
  "bankName": "Standard Bank",
  "branchNameOrCode": "Main Branch / 001234",
  "accountName": "John Doe",
  "accountNumberOrIban": "1234567890",
  "swiftBicCode": "SBZAZAJJ",
  "currency": "GBP",
  "bankCountry": "United Kingdom",
  "additionalNotes": "Savings account"
}
```

## Earnings Data Upload

### Endpoint

```
POST /admin/earnings/bulk-upload-data
```

**Authentication Required:** JWT Bearer Token (Admin only)

### Data Fields

The earnings data upload captures the following datapoints for each agent:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agentCode` | string | Yes | Agent code to identify the agent |
| `totalEarnings` | number | Yes | Total earnings (all time) |
| `earningsForCurrentMonth` | number | Yes | Earnings for current month |
| `totalReferrals` | number | Yes | Total referrals (all time) |
| `referralsForCurrentMonth` | number | Yes | Referrals for current month |
| `availableBalance` | number | Yes | Available balance for payout |
| `totalPayoutAmount` | number | Yes | Total payout amount (all time) |
| `availableMonth` | string | No | Month for which data applies (YYYY-MM format) |

### Request Body

```json
{
  "agentsData": [
    {
      "agentCode": "AG123456",
      "totalEarnings": 1250.50,
      "earningsForCurrentMonth": 150.75,
      "totalReferrals": 45,
      "referralsForCurrentMonth": 5,
      "availableBalance": 1100.50,
      "totalPayoutAmount": 950.00,
      "availableMonth": "2025-10"
    },
    {
      "agentCode": "AG789012",
      "totalEarnings": 2500.00,
      "earningsForCurrentMonth": 300.00,
      "totalReferrals": 80,
      "referralsForCurrentMonth": 8,
      "availableBalance": 2200.00,
      "totalPayoutAmount": 1800.00,
      "availableMonth": "2025-10"
    }
  ],
  "batchDescription": "Monthly earnings data upload - October 2025",
  "autoUpdate": true,
  "metadata": {
    "uploadSource": "PlanetTalk System",
    "batchId": "BATCH-2025-10"
  }
}
```

### Response

```json
{
  "totalProcessed": 2,
  "successful": 2,
  "failed": 0,
  "details": [
    {
      "agentCode": "AG123456",
      "status": "success",
      "message": "Agent data updated successfully",
      "updatedFields": [
        "totalEarnings",
        "availableBalance",
        "totalReferrals",
        "currentMonthEarnings",
        "currentMonthReferrals",
        "totalPayoutAmount",
        "dataMonth"
      ]
    },
    {
      "agentCode": "AG789012",
      "status": "success",
      "message": "Agent data updated successfully",
      "updatedFields": [
        "totalEarnings",
        "availableBalance",
        "totalReferrals",
        "currentMonthEarnings",
        "currentMonthReferrals",
        "totalPayoutAmount",
        "dataMonth"
      ]
    }
  ],
  "batchId": "DATA-BATCH-1729000000000-abc123xyz",
  "uploadedAt": "2025-10-15T10:30:00.000Z"
}
```

### Error Handling

If an agent is not found or there's an error updating their data, the response will include error details:

```json
{
  "totalProcessed": 2,
  "successful": 1,
  "failed": 1,
  "details": [
    {
      "agentCode": "AG123456",
      "status": "success",
      "message": "Agent data updated successfully",
      "updatedFields": ["totalEarnings", "availableBalance", "totalReferrals"]
    },
    {
      "agentCode": "AG999999",
      "status": "error",
      "message": "",
      "error": "Agent not found with code: AG999999"
    }
  ],
  "batchId": "DATA-BATCH-1729000000000-abc123xyz",
  "uploadedAt": "2025-10-15T10:30:00.000Z"
}
```

## Agent Entity Updates

The agent entity now includes:

### Bank Details Field

Stored in the `bankDetails` JSON column of the `agents` table.

### Metadata Fields

Monthly earnings data is stored in the agent's metadata:

- `currentMonthEarnings` - Earnings for the current month
- `currentMonthReferrals` - Referrals for the current month
- `totalPayoutAmount` - Total amount paid out
- `dataMonth` - The month for which the data applies
- `lastDataUpload` - Information about the last data upload (batchId, uploadedAt, batchDescription)

## Payout Request Updates

When creating a payout request, the bank account details must include all mandatory fields:

```json
POST /agents/:agentId/payouts

{
  "amount": 100.00,
  "method": "bank_transfer",
  "description": "Monthly commission payout",
  "paymentDetails": {
    "bankAccount": {
      "bankName": "Standard Bank",
      "branchNameOrCode": "Main Branch / 001234",
      "accountName": "John Doe",
      "accountNumberOrIban": "GB29NWBK60161331926819",
      "swiftBicCode": "SBZAZAJJ",
      "currency": "GBP",
      "bankCountry": "United Kingdom",
      "additionalNotes": "Savings account"
    }
  }
}
```

### Validation Errors

If mandatory fields are missing, you'll receive a 400 Bad Request error:

```json
{
  "statusCode": 400,
  "message": "Bank name is required",
  "error": "Bad Request"
}
```

Other possible validation errors:
- "Account name is required (must match Agent registration name)"
- "Account number or IBAN is required"
- "Account currency is required"
- "Bank country is required"

## Migration Notes

### For Existing Payouts

Existing payout records with the old bank details structure will continue to work. The system supports both old and new formats during the transition period.

### Updating Agent Bank Details

Agents can update their bank details through their profile, or admins can update them through the admin panel. The new bank details will be used for all future payout requests.

## Best Practices

1. **Verify Bank Details** - Always verify account name matches the agent's registered name
2. **International Payments** - Include SWIFT/BIC code for international bank transfers
3. **Currency Matching** - Ensure the payout currency matches the bank account currency
4. **Regular Updates** - Upload earnings data regularly (monthly recommended)
5. **Batch Processing** - Process multiple agents in a single upload to improve efficiency

