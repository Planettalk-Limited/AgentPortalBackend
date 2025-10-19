# CSV to JSON Mapping - Frontend Transform

## Overview

Frontend reads CSV, transforms to JSON array, sends to backend endpoint.

---

## CSV Format (What Frontend Reads)

```csv
Agent Code,Total Earnings,Earnings for Current Month,Total Referrals,Referrals for Current Month,Available Balance,Total Payout Amount
AGT21618,125.50,25.50,45,5,100.00,25.50
AGT92654,250.00,50.00,80,10,200.00,50.00
AGT24157,175.75,15.75,60,3,160.00,15.75
AGT15616,110.00,10.00,38,2,100.00,10.00
AGT59116,221.00,21.00,72,4,200.00,21.00
AGT89302,53.00,3.00,18,1,50.00,3.00
AGT68581,64.00,4.00,22,1,60.00,4.00
AGT02440,109.00,9.00,35,2,100.00,9.00
AGT94118,53.00,3.00,18,1,50.00,3.00
```

---

## JSON Format (What Frontend Sends)

```json
POST /admin/earnings/bulk-upload-data
Content-Type: application/json

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
    },
    {
      "agentCode": "AGT92654",
      "totalEarnings": 250.00,
      "earningsForCurrentMonth": 50.00,
      "totalReferrals": 80,
      "referralsForCurrentMonth": 10,
      "availableBalance": 200.00,
      "totalPayoutAmount": 50.00
    },
    {
      "agentCode": "AGT24157",
      "totalEarnings": 175.75,
      "earningsForCurrentMonth": 15.75,
      "totalReferrals": 60,
      "referralsForCurrentMonth": 3,
      "availableBalance": 160.00,
      "totalPayoutAmount": 15.75
    },
    {
      "agentCode": "AGT15616",
      "totalEarnings": 110.00,
      "earningsForCurrentMonth": 10.00,
      "totalReferrals": 38,
      "referralsForCurrentMonth": 2,
      "availableBalance": 100.00,
      "totalPayoutAmount": 10.00
    },
    {
      "agentCode": "AGT59116",
      "totalEarnings": 221.00,
      "earningsForCurrentMonth": 21.00,
      "totalReferrals": 72,
      "referralsForCurrentMonth": 4,
      "availableBalance": 200.00,
      "totalPayoutAmount": 21.00
    },
    {
      "agentCode": "AGT89302",
      "totalEarnings": 53.00,
      "earningsForCurrentMonth": 3.00,
      "totalReferrals": 18,
      "referralsForCurrentMonth": 1,
      "availableBalance": 50.00,
      "totalPayoutAmount": 3.00
    },
    {
      "agentCode": "AGT68581",
      "totalEarnings": 64.00,
      "earningsForCurrentMonth": 4.00,
      "totalReferrals": 22,
      "referralsForCurrentMonth": 1,
      "availableBalance": 60.00,
      "totalPayoutAmount": 4.00
    },
    {
      "agentCode": "AGT02440",
      "totalEarnings": 109.00,
      "earningsForCurrentMonth": 9.00,
      "totalReferrals": 35,
      "referralsForCurrentMonth": 2,
      "availableBalance": 100.00,
      "totalPayoutAmount": 9.00
    },
    {
      "agentCode": "AGT94118",
      "totalEarnings": 53.00,
      "earningsForCurrentMonth": 3.00,
      "totalReferrals": 18,
      "referralsForCurrentMonth": 1,
      "availableBalance": 50.00,
      "totalPayoutAmount": 3.00
    }
  ],
  "batchDescription": "CSV Upload - 10/19/2025, 11:46:33 AM",
  "autoUpdate": true,
  "metadata": {
    "filename": "earnings_import_sample.csv",
    "uploadSource": "Admin Panel CSV"
  }
}
```

---

## Field Mapping

| CSV Column | JSON Field | Type | Required |
|------------|------------|------|----------|
| Agent Code | `agentCode` | string | ✅ Yes |
| Total Earnings | `totalEarnings` | number | ✅ Yes |
| Earnings for Current Month | `earningsForCurrentMonth` | number | ✅ Yes |
| Total Referrals | `totalReferrals` | number | ✅ Yes |
| Referrals for Current Month | `referralsForCurrentMonth` | number | ✅ Yes |
| Available Balance | `availableBalance` | number | ✅ Yes |
| Total Payout Amount | `totalPayoutAmount` | number | ✅ Yes |
| Available Month | `availableMonth` | string (YYYY-MM) | ⚪ Optional |

---

## TypeScript Interface (Frontend)

```typescript
interface AgentEarningsData {
  agentCode: string;
  totalEarnings: number;
  earningsForCurrentMonth: number;
  totalReferrals: number;
  referralsForCurrentMonth: number;
  availableBalance: number;
  totalPayoutAmount: number;
  availableMonth?: string; // Optional, format: "2025-10"
}

interface BulkEarningsDataUpload {
  agentsData: AgentEarningsData[];
  batchDescription?: string;
  autoUpdate?: boolean;
  metadata?: {
    filename?: string;
    uploadSource?: string;
    [key: string]: any;
  };
}
```

---

## Frontend CSV Parser Example

```typescript
// Parse CSV and transform to JSON
function parseCSVToJSON(csvText: string, filename: string): BulkEarningsDataUpload {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  
  const agentsData: AgentEarningsData[] = [];
  
  // Start from line 1 (skip header)
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    
    agentsData.push({
      agentCode: values[0].trim(),
      totalEarnings: parseFloat(values[1]),
      earningsForCurrentMonth: parseFloat(values[2]),
      totalReferrals: parseInt(values[3]),
      referralsForCurrentMonth: parseInt(values[4]),
      availableBalance: parseFloat(values[5]),
      totalPayoutAmount: parseFloat(values[6])
    });
  }
  
  return {
    agentsData,
    batchDescription: `CSV Upload - ${new Date().toLocaleString()}`,
    autoUpdate: true,
    metadata: {
      filename,
      uploadSource: "Admin Panel CSV"
    }
  };
}

// Upload to backend
async function uploadEarningsData(data: BulkEarningsDataUpload) {
  const response = await fetch('/admin/earnings/bulk-upload-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(data)
  });
  
  return await response.json();
}
```

---

## React Example (File Upload Component)

```typescript
import React, { useState } from 'react';
import { parse } from 'papaparse'; // or use any CSV parser

function CSVUploadComponent() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    // Parse CSV
    parse(file, {
      header: true,
      complete: async (results) => {
        // Transform to backend format
        const uploadData = {
          agentsData: results.data.map((row: any) => ({
            agentCode: row['Agent Code'],
            totalEarnings: parseFloat(row['Total Earnings']),
            earningsForCurrentMonth: parseFloat(row['Earnings for Current Month']),
            totalReferrals: parseInt(row['Total Referrals']),
            referralsForCurrentMonth: parseInt(row['Referrals for Current Month']),
            availableBalance: parseFloat(row['Available Balance']),
            totalPayoutAmount: parseFloat(row['Total Payout Amount'])
          })),
          batchDescription: `CSV Upload - ${new Date().toLocaleString()}`,
          autoUpdate: true,
          metadata: {
            filename: file.name,
            uploadSource: 'Admin Panel CSV'
          }
        };

        // Send to backend
        try {
          const response = await fetch('/admin/earnings/bulk-upload-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(uploadData)
          });

          const result = await response.json();
          setResult(result);
          console.log('Upload successful:', result);
        } catch (error) {
          console.error('Upload failed:', error);
        } finally {
          setUploading(false);
        }
      }
    });
  };

  return (
    <div>
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileUpload} 
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {result && (
        <div>
          <h3>Upload Result</h3>
          <p>Total Processed: {result.totalProcessed}</p>
          <p>Successful: {result.successful}</p>
          <p>Failed: {result.failed}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Key Points

✅ **Yes, it's an array** - `agentsData` is an array of individual agent records  
✅ **Frontend transforms** - CSV → JSON happens in frontend  
✅ **Backend receives** - Clean JSON array ready to process  
✅ **Each item is independent** - Backend processes each agent individually  
✅ **Validation per item** - Each agent validated, errors reported per agent  

---

## What Backend Does

For each item in `agentsData` array:

1. **Validates** agent code exists
2. **Updates** agent record fields:
   - `totalEarnings`
   - `availableBalance`
   - `totalReferrals`
3. **Stores** monthly data in metadata:
   - `earningsForCurrentMonth`
   - `referralsForCurrentMonth`
   - `totalPayoutAmount`
4. **Returns** status for each agent

---

## Response Format

```json
{
  "totalProcessed": 9,
  "successful": 9,
  "failed": 0,
  "details": [
    {
      "agentCode": "AGT21618",
      "status": "success",
      "message": "Agent data updated successfully",
      "updatedFields": ["totalEarnings", "availableBalance", "totalReferrals"]
    },
    {
      "agentCode": "AGT92654",
      "status": "success",
      "message": "Agent data updated successfully",
      "updatedFields": ["totalEarnings", "availableBalance", "totalReferrals"]
    }
    // ... 7 more items
  ],
  "batchId": "DATA-BATCH-1729338393000-xyz",
  "uploadedAt": "2025-10-19T10:46:33.000Z"
}
```

---

## Error Example (One Agent Fails)

```json
{
  "totalProcessed": 9,
  "successful": 8,
  "failed": 1,
  "details": [
    {
      "agentCode": "AGT21618",
      "status": "success",
      "message": "Agent data updated successfully"
    },
    {
      "agentCode": "AGT99999",
      "status": "error",
      "error": "Agent not found with code: AGT99999"
    },
    {
      "agentCode": "AGT92654",
      "status": "success",
      "message": "Agent data updated successfully"
    }
    // ... rest of items
  ]
}
```

---

## Summary

**Your workflow**:
1. User uploads CSV in frontend
2. Frontend parses CSV to JSON array
3. Frontend sends JSON with `agentsData` array to `/admin/earnings/bulk-upload-data`
4. Backend processes each item individually
5. Backend returns detailed results

**Yes, the endpoint accepts an array of individual items!** ✅

The key is:
- Use `agentsData` (not `earnings`)
- Use `/admin/earnings/bulk-upload-data` (not `/admin/earnings/bulk-upload`)
- Match the field names to your CSV columns

