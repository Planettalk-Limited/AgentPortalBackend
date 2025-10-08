# Agent Resources API Documentation

This document provides the API endpoints and request/response specifications for frontend integration with the Agent Resources system.

## Base URL

```
Production: https://your-api-domain.com/api/v1
Development: http://localhost:3001/api/v1
```

## Authentication

All endpoints require JWT Bearer token authentication:

```
Authorization: Bearer {jwt-token}
```

## Agent Resources Endpoints

### 1. Get All Agent Media Resources

Retrieve all resources organized by category for the agent media section.

```http
GET /agents/media
```

#### Request
```bash
curl -X GET "http://localhost:3001/api/v1/agents/media" \
  -H "Authorization: Bearer {agent-jwt-token}"
```

#### Response
```json
{
  "trainingMaterials": [
    {
      "id": "uuid-string",
      "title": "Agent Training Manual v2.1",
      "description": "Comprehensive training guide for new agents",
      "type": "document",
      "category": "training",
      "fileName": "training-manual.pdf",
      "originalName": "Agent Training Manual v2.1.pdf",
      "mimeType": "application/pdf",
      "fileSize": 2048576,
      "isEmbedded": false,
      "isExternal": false,
      "isActive": true,
      "isFeatured": true,
      "downloadCount": 245,
      "viewCount": 1205,
      "publishedAt": "2025-01-15T10:30:00.000Z",
      "tags": ["training", "manual", "onboarding"],
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "bankForms": [
    {
      "id": "uuid-string",
      "title": "Bank Account Update Form",
      "description": "Form to update your bank account details",
      "type": "document",
      "category": "bank_forms",
      "fileName": "bank-update-form.pdf",
      "fileSize": 245760,
      "isEmbedded": false,
      "isExternal": false,
      "downloadCount": 89,
      "viewCount": 156
    }
  ],
  "termsAndConditions": [
    {
      "id": "uuid-string",
      "title": "Agent Terms & Conditions 2025",
      "description": "Updated agent agreement and terms of service",
      "type": "document",
      "category": "terms_conditions",
      "fileName": "terms-conditions-2025.pdf",
      "fileSize": 512000,
      "isFeatured": true,
      "downloadCount": 1205
    }
  ],
  "compliance": [
    {
      "id": "uuid-string",
      "title": "Compliance Requirements Checklist",
      "description": "Essential compliance requirements for all agents",
      "type": "document",
      "category": "compliance",
      "isEmbedded": true,
      "isExternal": false,
      "viewCount": 856
    }
  ],
  "marketing": [
    {
      "id": "uuid-string",
      "title": "Social Media Templates",
      "description": "Ready-to-use social media promotion templates",
      "type": "archive",
      "category": "marketing",
      "fileName": "social-templates.zip",
      "fileSize": 1024000,
      "downloadCount": 445
    }
  ],
  "policies": [],
  "guides": [],
  "templates": [],
  "media": [
    {
      "id": "uuid-string",
      "title": "Advanced Training Video Series",
      "description": "YouTube training videos for experienced agents",
      "type": "video",
      "category": "media",
      "isEmbedded": false,
      "isExternal": true,
      "externalUrl": "https://youtube.com/playlist?list=PLxxxxx",
      "viewCount": 1024,
      "isFeatured": true
    }
  ],
  "announcements": [
    {
      "id": "uuid-string",
      "title": "Platform Update - January 2025",
      "description": "Important platform updates and new features",
      "type": "document",
      "category": "announcement",
      "isEmbedded": true,
      "isExternal": false,
      "viewCount": 2156,
      "isFeatured": true
    }
  ],
  "other": [],
  "summary": {
    "totalResources": 156,
    "newThisMonth": 12,
    "featuredCount": 8
  }
}
```

### 2. Get Specific Category Resources

#### Training Materials
```http
GET /agents/media/training?page=1&limit=10
```

#### Bank Forms
```http
GET /agents/media/bank-forms?page=1&limit=10
```

#### Terms & Conditions
```http
GET /agents/media/terms-conditions
```

#### Compliance Documents
```http
GET /agents/media/compliance
```

#### Marketing Materials
```http
GET /agents/media/marketing
```

#### Announcements
```http
GET /agents/media/announcements
```

#### Request Parameters
```
page: number (default: 1)
limit: number (default: 20, max: 50)
```

#### Response Format
```json
{
  "resources": [
    {
      "id": "uuid-string",
      "title": "Resource Title",
      "description": "Resource description",
      "type": "document|image|video|audio|archive|other",
      "category": "training|bank_forms|terms_conditions|compliance|marketing|policy|guide|template|media|announcement|other",
      "fileName": "filename.pdf",
      "originalName": "Original File Name.pdf",
      "mimeType": "application/pdf",
      "fileSize": 2048576,
      "isEmbedded": false,
      "isExternal": false,
      "externalUrl": null,
      "isActive": true,
      "isFeatured": false,
      "downloadCount": 123,
      "viewCount": 456,
      "publishedAt": "2025-01-15T10:30:00.000Z",
      "expiresAt": null,
      "tags": ["tag1", "tag2"],
      "metadata": {},
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### 3. Get Featured Resources

```http
GET /agents/media/featured?limit=5
```

#### Request
```bash
curl -X GET "http://localhost:3001/api/v1/agents/media/featured?limit=5" \
  -H "Authorization: Bearer {agent-jwt-token}"
```

#### Response
```json
[
  {
    "id": "uuid-string",
    "title": "Agent Training Manual v2.1",
    "description": "Essential training for all agents",
    "type": "document",
    "category": "training",
    "isFeatured": true,
    "downloadCount": 1205,
    "viewCount": 2456
  }
]
```

### 4. Get Recent Resources

```http
GET /agents/media/recent?limit=10&days=30
```

#### Request Parameters
```
limit: number (default: 10)
days: number (default: 30) - Resources added in last N days
```

### 5. Get Resource Content

Access the actual content of a resource (embedded text, external URL, or download URL).

```http
GET /agents/media/{id}/content
```

#### Request
```bash
curl -X GET "http://localhost:3001/api/v1/agents/media/abc123/content" \
  -H "Authorization: Bearer {agent-jwt-token}"
```

#### Response Types

##### Embedded Content
```json
{
  "type": "embedded",
  "content": "<h2>Training Guide</h2><p>This is the embedded content that displays directly in the portal...</p>",
  "mimeType": "text/html"
}
```

##### External Link
```json
{
  "type": "external",
  "url": "https://youtube.com/watch?v=training-video-123"
}
```

##### File Download
```json
{
  "type": "file",
  "url": "https://presigned-download-url-here",
  "fileName": "training-manual.pdf",
  "mimeType": "application/pdf",
  "fileSize": 2048576,
  "expiresIn": 3600
}
```

### 6. Get Resource Details

```http
GET /agents/media/{id}
```

#### Response
```json
{
  "id": "uuid-string",
  "title": "Agent Training Manual v2.1",
  "description": "Comprehensive training guide for new agents",
  "type": "document",
  "category": "training",
  "fileName": "training-manual.pdf",
  "originalName": "Agent Training Manual v2.1.pdf",
  "mimeType": "application/pdf",
  "fileSize": 2048576,
  "isEmbedded": false,
  "isExternal": false,
  "isActive": true,
  "isFeatured": true,
  "downloadCount": 245,
  "viewCount": 1205,
  "publishedAt": "2025-01-15T10:30:00.000Z",
  "expiresAt": null,
  "tags": ["training", "manual", "onboarding"],
  "metadata": {
    "version": "2.1",
    "author": "Training Team"
  },
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z",
  "uploadedBy": {
    "id": "admin-id",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

### 7. Download Resource

Generate secure download URL and increment download count.

```http
GET /agents/media/{id}/download
```

#### Response
```json
{
  "url": "https://presigned-download-url-with-5-minute-expiry",
  "fileName": "training-manual.pdf"
}
```

### 8. Track Resource Access

Track when an agent accesses a resource (important for compliance).

```http
POST /agents/media/{id}/track-access
```

#### Response
```json
{
  "success": true,
  "message": "Resource access tracked successfully"
}
```

### 9. Search Resources

```http
GET /agents/media/search/{searchTerm}?page=1&limit=10
```

#### Request
```bash
curl -X GET "http://localhost:3001/api/v1/agents/media/search/training%20manual" \
  -H "Authorization: Bearer {agent-jwt-token}"
```

### 10. Get Categories Summary

Get count of resources in each category for navigation.

```http
GET /agents/media/categories/summary
```

#### Response
```json
{
  "training": 15,
  "bank_forms": 3,
  "terms_conditions": 5,
  "compliance": 8,
  "marketing": 12,
  "policy": 4,
  "guide": 6,
  "template": 2,
  "media": 7,
  "announcement": 4,
  "other": 1
}
```

## Frontend Integration Examples

### React Hook for Media Resources

```javascript
const useAgentMedia = () => {
  const [mediaData, setMediaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMediaResources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/agents/media', {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch resources');
      }
      
      const data = await response.json();
      setMediaData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaResources();
  }, []);

  return { mediaData, loading, error, refetch: fetchMediaResources };
};
```

### Resource Content Handler

```javascript
const handleResourceAccess = async (resource) => {
  try {
    // Track access for compliance
    await fetch(`/api/v1/agents/media/${resource.id}/track-access`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    // Get content based on type
    const response = await fetch(`/api/v1/agents/media/${resource.id}/content`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });
    
    const content = await response.json();

    if (content.type === 'embedded') {
      // Display embedded content in modal or inline
      showEmbeddedContent(content.content);
    } else if (content.type === 'external') {
      // Open external link in new tab
      window.open(content.url, '_blank');
    } else if (content.type === 'file') {
      // Download file
      const link = document.createElement('a');
      link.href = content.url;
      link.download = content.fileName;
      link.click();
    }
  } catch (error) {
    console.error('Failed to access resource:', error);
  }
};
```

### Category Filtering

```javascript
const fetchCategoryResources = async (category) => {
  try {
    const response = await fetch(`/api/v1/agents/media/${category}?page=1&limit=20`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch category resources:', error);
    return null;
  }
};

// Usage
const trainingMaterials = await fetchCategoryResources('training');
const bankForms = await fetchCategoryResources('bank-forms');
const termsConditions = await fetchCategoryResources('terms-conditions');
```

### Search Resources

```javascript
const searchResources = async (searchTerm, filters = {}) => {
  try {
    const params = new URLSearchParams({
      page: filters.page || 1,
      limit: filters.limit || 10,
      ...filters
    });
    
    const response = await fetch(`/api/v1/agents/media/search/${encodeURIComponent(searchTerm)}?${params}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('Search failed:', error);
    return null;
  }
};
```

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden (Private Resource)
```json
{
  "statusCode": 403,
  "message": "Access denied to this resource",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

## Resource Object Schema

```typescript
interface Resource {
  id: string;
  title: string;
  description?: string;
  fileName?: string;
  originalName?: string;
  mimeType?: string;
  fileSize?: number;
  type: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';
  category: 'training' | 'bank_forms' | 'terms_conditions' | 'compliance' | 'marketing' | 'policy' | 'guide' | 'template' | 'media' | 'announcement' | 'other';
  visibility: 'public' | 'private' | 'restricted';
  s3Key?: string;
  s3Url?: string;
  s3Bucket?: string;
  externalUrl?: string;
  embeddedContent?: string;
  isEmbedded: boolean;
  isExternal: boolean;
  isActive: boolean;
  isFeatured: boolean;
  downloadCount: number;
  viewCount: number;
  publishedAt?: string;
  expiresAt?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
```

## Content Types Handling

### Frontend Logic for Different Content Types

```javascript
const renderResourceContent = (resource) => {
  if (resource.isEmbedded) {
    return (
      <div className="embedded-content">
        <h3>{resource.title}</h3>
        <div 
          dangerouslySetInnerHTML={{ __html: resource.embeddedContent }}
          className="embedded-html-content"
        />
      </div>
    );
  }
  
  if (resource.isExternal) {
    return (
      <div className="external-resource">
        <h3>{resource.title}</h3>
        <p>{resource.description}</p>
        <button 
          onClick={() => window.open(resource.externalUrl, '_blank')}
          className="external-link-btn"
        >
          🌐 Open External Link
        </button>
      </div>
    );
  }
  
  // File-based resource
  return (
    <div className="file-resource">
      <h3>{resource.title}</h3>
      <p>{resource.description}</p>
      <div className="file-info">
        <span>📄 {resource.originalName}</span>
        <span>📊 {formatFileSize(resource.fileSize)}</span>
        <span>📥 {resource.downloadCount} downloads</span>
      </div>
      <button 
        onClick={() => handleResourceAccess(resource)}
        className="download-btn"
      >
        📥 Download {getFileExtension(resource.fileName).toUpperCase()}
      </button>
    </div>
  );
};
```

### Media Section Component Structure

```javascript
const AgentMediaSection = () => {
  const { mediaData, loading, error } = useAgentMedia();
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="agent-media-section">
      {/* Summary Cards */}
      <div className="media-summary">
        <SummaryCard 
          title="Total Resources" 
          value={mediaData.summary.totalResources} 
        />
        <SummaryCard 
          title="New This Month" 
          value={mediaData.summary.newThisMonth} 
        />
        <SummaryCard 
          title="Featured" 
          value={mediaData.summary.featuredCount} 
        />
      </div>

      {/* Category Navigation */}
      <CategoryNavigation 
        categories={[
          { key: 'training', label: 'Training', count: mediaData.trainingMaterials.length },
          { key: 'bank_forms', label: 'Bank Forms', count: mediaData.bankForms.length },
          { key: 'terms_conditions', label: 'Terms & Conditions', count: mediaData.termsAndConditions.length },
          { key: 'compliance', label: 'Compliance', count: mediaData.compliance.length },
          { key: 'marketing', label: 'Marketing', count: mediaData.marketing.length },
          { key: 'announcements', label: 'Announcements', count: mediaData.announcements.length },
        ]}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* Resource Content */}
      <div className="resource-content">
        {selectedCategory === 'all' && <FeaturedResources />}
        {selectedCategory === 'training' && (
          <ResourceList 
            title="Training Materials" 
            resources={mediaData.trainingMaterials} 
          />
        )}
        {selectedCategory === 'bank_forms' && (
          <ResourceList 
            title="Bank Forms" 
            resources={mediaData.bankForms} 
          />
        )}
        {/* ... other categories */}
      </div>
    </div>
  );
};
```

## Utility Functions

### File Size Formatter
```javascript
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};
```

### File Extension Extractor
```javascript
const getFileExtension = (fileName) => {
  return fileName ? fileName.split('.').pop()?.toLowerCase() || '' : '';
};
```

### Resource Type Icons
```javascript
const getResourceIcon = (type) => {
  const icons = {
    document: '📄',
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    archive: '📦',
    other: '📎'
  };
  return icons[type] || '📎';
};
```

This API documentation provides all the necessary endpoints and response formats for frontend developers to integrate the Agent Resources system effectively.
