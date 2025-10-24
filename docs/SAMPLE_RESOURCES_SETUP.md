# Sample Resources Setup

This guide shows how to set up sample resources for testing the Agent Media section.

## Quick Setup Examples

### 1. Create Training Materials

#### Embedded Quick Guide
```bash
curl -X POST "http://localhost:3001/admin/resources/create-link" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Quick Commission Guide",
    "description": "Essential commission information for agents",
    "type": "document",
    "category": "training",
    "visibility": "public",
    "isEmbedded": true,
    "embeddedContent": "<h2>Commission Structure</h2><ul><li>Standard Rate: 10%</li><li>All Tiers: 10%</li></ul><h3>Payout Schedule</h3><p>Monthly on the 15th</p><h3>Minimum Payout</h3><p>$20.00 USD</p>",
    "isFeatured": true,
    "tags": ["commission", "quick-guide", "payout"]
  }'
```

#### External Training Video
```bash
curl -X POST "http://localhost:3001/admin/resources/create-link" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Agent Onboarding Video Series",
    "description": "Complete video training for new PlanetTalk agents",
    "type": "video",
    "category": "training",
    "visibility": "public",
    "isExternal": true,
    "externalUrl": "https://www.youtube.com/playlist?list=PLrAXtmRdnEQeiGGtS1ygMIFKaUCVhNEu1",
    "isFeatured": true,
    "tags": ["onboarding", "video", "training"],
    "metadata": {
      "duration": "45 minutes",
      "language": "English",
      "level": "beginner"
    }
  }'
```

### 2. Create Bank Forms

#### Bank Update Form
```bash
curl -X POST "http://localhost:3001/admin/resources/upload" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -F "file=@bank-update-form.pdf" \
  -F "title=Bank Account Update Form" \
  -F "description=Form to update your bank account details for payouts" \
  -F "type=document" \
  -F "category=bank_forms" \
  -F "visibility=public" \
  -F "isFeatured=false" \
  -F "tags=bank,form,payout,update"
```

### 3. Create Terms & Conditions

#### T&Cs Document
```bash
curl -X POST "http://localhost:3001/admin/resources/upload" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -F "file=@agent-terms-conditions-2025.pdf" \
  -F "title=Agent Terms & Conditions 2025" \
  -F "description=Updated agent agreement and terms of service" \
  -F "type=document" \
  -F "category=terms_conditions" \
  -F "visibility=public" \
  -F "isFeatured=true" \
  -F "tags=legal,terms,conditions,agreement"
```

### 4. Create Compliance Documents

#### Embedded Compliance Guide
```bash
curl -X POST "http://localhost:3001/admin/resources/create-link" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Compliance Checklist",
    "description": "Essential compliance requirements for all agents",
    "type": "document",
    "category": "compliance",
    "visibility": "public",
    "isEmbedded": true,
    "embeddedContent": "<h2>Agent Compliance Requirements</h2><h3>✅ Required Documents</h3><ul><li>Valid ID verification</li><li>Bank account verification</li><li>Signed agent agreement</li><li>Tax information (if applicable)</li></ul><h3>✅ Training Requirements</h3><ul><li>Complete onboarding training</li><li>Pass compliance quiz (80% minimum)</li><li>Review terms and conditions</li></ul><h3>✅ Ongoing Requirements</h3><ul><li>Monthly activity (minimum 1 referral)</li><li>Maintain good standing</li><li>Report any issues promptly</li></ul>",
    "isFeatured": false,
    "tags": ["compliance", "checklist", "requirements"]
  }'
```

### 5. Create Marketing Materials

#### Marketing Template
```bash
curl -X POST "http://localhost:3001/admin/resources/upload" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -F "file=@social-media-templates.zip" \
  -F "title=Social Media Marketing Templates" \
  -F "description=Ready-to-use social media templates for promoting your agent code" \
  -F "type=archive" \
  -F "category=marketing" \
  -F "visibility=public" \
  -F "isFeatured=true" \
  -F "tags=marketing,social-media,templates,promotion"
```

### 6. Create Announcements

#### System Update Announcement
```bash
curl -X POST "http://localhost:3001/admin/resources/create-link" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Platform Update - January 2025",
    "description": "Important updates to the agent portal and commission system",
    "type": "document",
    "category": "announcement",
    "visibility": "public",
    "isEmbedded": true,
    "embeddedContent": "<h2>Platform Updates - January 2025</h2><h3>🆕 New Features</h3><ul><li>Enhanced agent dashboard</li><li>Real-time commission tracking</li><li>Mobile app improvements</li><li>New payout methods</li></ul><h3>📈 Commission Updates</h3><ul><li>Standard commission rate: 10%</li><li>New bonus structure for high performers</li><li>Minimum payout threshold: $20</li></ul><h3>🔧 Technical Improvements</h3><ul><li>Faster loading times</li><li>Better mobile experience</li><li>Enhanced security features</li></ul><p><strong>Effective Date:</strong> January 15, 2025</p>",
    "isFeatured": true,
    "tags": ["update", "announcement", "platform", "commission"],
    "publishedAt": "2025-01-15T00:00:00Z"
  }'
```

## Test Agent Media Access

After creating these sample resources, agents can access them through:

### Get All Media
```bash
curl -X GET "http://localhost:3001/agents/media" \
  -H "Authorization: Bearer YOUR_AGENT_JWT_TOKEN"
```

### Get Training Materials
```bash
curl -X GET "http://localhost:3001/agents/media/training" \
  -H "Authorization: Bearer YOUR_AGENT_JWT_TOKEN"
```

### Get Bank Forms
```bash
curl -X GET "http://localhost:3001/agents/media/bank-forms" \
  -H "Authorization: Bearer YOUR_AGENT_JWT_TOKEN"
```

### Get Terms & Conditions
```bash
curl -X GET "http://localhost:3001/agents/media/terms-conditions" \
  -H "Authorization: Bearer YOUR_AGENT_JWT_TOKEN"
```

### Access Specific Resource Content
```bash
curl -X GET "http://localhost:3001/agents/media/{resource-id}/content" \
  -H "Authorization: Bearer YOUR_AGENT_JWT_TOKEN"
```

## Sample Response Structure

When agents access `/agents/media`, they'll get:

```json
{
  "trainingMaterials": [
    {
      "id": "uuid-1",
      "title": "Quick Commission Guide",
      "description": "Essential commission information for agents",
      "type": "document",
      "category": "training",
      "isEmbedded": true,
      "isExternal": false,
      "isFeatured": true,
      "viewCount": 0,
      "downloadCount": 0,
      "tags": ["commission", "quick-guide", "payout"]
    },
    {
      "id": "uuid-2", 
      "title": "Agent Onboarding Video Series",
      "description": "Complete video training for new PlanetTalk agents",
      "type": "video",
      "category": "training",
      "isEmbedded": false,
      "isExternal": true,
      "externalUrl": "https://www.youtube.com/playlist?list=...",
      "isFeatured": true
    }
  ],
  "bankForms": [
    {
      "id": "uuid-3",
      "title": "Bank Account Update Form",
      "description": "Form to update your bank account details for payouts",
      "type": "document",
      "category": "bank_forms",
      "fileName": "bank-update-form.pdf",
      "fileSize": 245760
    }
  ],
  "termsAndConditions": [
    {
      "id": "uuid-4",
      "title": "Agent Terms & Conditions 2025",
      "description": "Updated agent agreement and terms of service",
      "type": "document",
      "category": "terms_conditions",
      "fileName": "agent-terms-conditions-2025.pdf",
      "fileSize": 512000,
      "isFeatured": true
    }
  ],
  "compliance": [
    {
      "id": "uuid-5",
      "title": "Compliance Checklist",
      "description": "Essential compliance requirements for all agents",
      "type": "document",
      "category": "compliance",
      "isEmbedded": true,
      "isExternal": false
    }
  ],
  "announcements": [
    {
      "id": "uuid-6",
      "title": "Platform Update - January 2025",
      "description": "Important updates to the agent portal and commission system",
      "type": "document",
      "category": "announcement",
      "isEmbedded": true,
      "isFeatured": true
    }
  ],
  "summary": {
    "totalResources": 6,
    "newThisMonth": 6,
    "featuredCount": 4
  }
}
```

This setup provides a comprehensive media library with different content types optimized for server resources and user experience.
