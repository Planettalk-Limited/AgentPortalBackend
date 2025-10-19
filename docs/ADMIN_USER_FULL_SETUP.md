# Admin User Full Setup API

## Overview

This endpoint allows administrators to create fully configured user accounts with automatic verification and activation. This is designed for creating admin accounts or setting up users who need immediate access without going through the standard registration and verification flow.

## Authentication

All endpoints require admin authentication:

```http
Authorization: Bearer <jwt-token>
```

**Required Roles**: `admin` or `pt_admin`

---

## Create Fully Setup User

**POST** `/admin/users`

Creates a fully configured user account with admin override, bypassing all verification steps.

### Key Features

✅ **Email Auto-Verified** - `emailVerifiedAt` is automatically set  
✅ **Status Set to ACTIVE** - User can login immediately  
✅ **Role Defaults to ADMIN** - Can be overridden to any role  
✅ **No First Login Flow** - `isFirstLogin` is set to `false`  
✅ **Ready for Immediate Use** - User can login and access all features  
✅ **Complete Metadata Tracking** - Full audit trail of admin creation  

### Request Body

```json
{
  "country": "ZW",
  "email": "admin@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePassword123!",
  "username": "johnadmin",
  "phoneNumber": "+263771234567",
  "role": "admin"
}
```

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `firstName` | string | User's first name (max 100 chars) | "John" |
| `lastName` | string | User's last name (max 100 chars) | "Doe" |
| `country` | string | 2-letter ISO country code | "ZW" |
| `username` | string | Unique username (3-50 chars) | "johnadmin" |
| `email` | string | Unique email address (max 255 chars) | "admin@example.com" |
| `password` | string | Password (min 8 chars) | "SecurePassword123!" |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `role` | enum | `admin` | User role: `admin`, `pt_admin`, or `agent` |
| `phoneNumber` | string | null | Phone number (max 20 chars) |

### Success Response

**Status Code**: `201 Created`

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "firstName": "John",
  "lastName": "Doe",
  "country": "ZW",
  "username": "johnadmin",
  "email": "admin@example.com",
  "role": "admin",
  "status": "active",
  "phoneNumber": "+263771234567",
  "lastLoginAt": null,
  "emailVerifiedAt": "2025-10-19T10:30:00.000Z",
  "isFirstLogin": false,
  "metadata": {
    "createdBy": "admin",
    "createdVia": "admin_panel",
    "adminCreatedFullySetup": true,
    "emailAutoVerified": true,
    "skipFirstLoginFlow": true,
    "createdAt": "2025-10-19T10:30:00.000Z"
  },
  "createdAt": "2025-10-19T10:30:00.000Z",
  "updatedAt": "2025-10-19T10:30:00.000Z"
}
```

### Error Responses

#### User Already Exists
**Status Code**: `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "User with this email or username already exists",
  "error": "Bad Request"
}
```

#### Invalid Input Data
**Status Code**: `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters",
    "Country must be a 2-character ISO country code"
  ],
  "error": "Bad Request"
}
```

#### Unauthorized
**Status Code**: `401 Unauthorized`

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## Usage Examples

### Example 1: Create Admin User

```bash
curl -X POST https://api.example.com/admin/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "ZW",
    "email": "takudzwaneilbvungidzire+3@gmail.com",
    "firstName": "Taku",
    "lastName": "Bvungi",
    "password": "miraslavklose10",
    "username": "takuDev+1",
    "role": "admin"
  }'
```

### Example 2: Create PT Admin User

```bash
curl -X POST https://api.example.com/admin/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "email": "pt.admin@planettalk.com",
    "firstName": "Planet",
    "lastName": "Admin",
    "password": "SecurePass123!",
    "username": "ptadmin001",
    "phoneNumber": "+1234567890",
    "role": "pt_admin"
  }'
```

### Example 3: Create Agent User (with immediate access)

```bash
curl -X POST https://api.example.com/admin/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "ZW",
    "email": "agent@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "password": "AgentPass123!",
    "username": "janeagent",
    "phoneNumber": "+263771234567",
    "role": "agent"
  }'
```

---

## Important Notes

### 🔒 Security Considerations

1. **Admin Only** - This endpoint should only be accessible to admin users
2. **Strong Passwords** - Ensure strong passwords are used (min 8 characters)
3. **Audit Trail** - All created users have metadata tracking who created them
4. **Email Verification** - Email is auto-verified, so ensure email addresses are valid

### 🎯 Use Cases

This endpoint is ideal for:

- **Creating admin accounts** - Set up new administrators quickly
- **Onboarding staff** - Create accounts for team members
- **Testing** - Create test accounts without verification flow
- **Bulk user imports** - Set up multiple users programmatically
- **Emergency access** - Quickly grant access to users who need it

### ⚠️ Differences from Regular Registration

| Feature | Regular Registration | Admin Full Setup |
|---------|---------------------|------------------|
| Email Verification | Required (OTP) | Auto-verified |
| Initial Status | `pending` | `active` |
| First Login Flow | Required | Skipped |
| Default Role | `agent` | `admin` |
| Ready to Login | After verification | Immediately |
| Agent Profile | Auto-created (pending) | Not created* |

*Note: If you need to create an agent profile for agent users, use the agent creation endpoint after creating the user.

### 📋 User Metadata

All admin-created users include the following metadata:

```json
{
  "createdBy": "admin",
  "createdVia": "admin_panel",
  "adminCreatedFullySetup": true,
  "emailAutoVerified": true,
  "skipFirstLoginFlow": true,
  "createdAt": "2025-10-19T10:30:00.000Z"
}
```

This provides a complete audit trail for compliance and tracking purposes.

---

## Login After Creation

Once a user is created via this endpoint, they can immediately login using the standard login endpoint:

**POST** `/auth/login`

```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123!"
}
```

No additional verification steps are required.

---

## Database Fields Populated

The endpoint automatically populates all required database fields:

- ✅ `firstName` - From request
- ✅ `lastName` - From request
- ✅ `country` - From request (2-letter ISO code)
- ✅ `username` - From request (unique)
- ✅ `email` - From request (unique)
- ✅ `passwordHash` - Hashed from password
- ✅ `phoneNumber` - From request (optional)
- ✅ `role` - From request (defaults to `admin`)
- ✅ `status` - Set to `active`
- ✅ `emailVerifiedAt` - Set to current timestamp
- ✅ `isFirstLogin` - Set to `false`
- ✅ `metadata` - Populated with admin creation info
- ✅ `createdAt` - Auto-generated
- ✅ `updatedAt` - Auto-generated

Fields set to null (optional):
- `lastLoginAt` - Set on first login
- `agents` - No agent profile created (unless role is `agent` and you create separately)

---

## Related Endpoints

- **POST** `/auth/login` - Login with created credentials
- **GET** `/admin/users` - List all users
- **GET** `/admin/users/:id` - Get user details
- **PATCH** `/admin/users/:id` - Update user
- **PATCH** `/admin/users/:id/role` - Update user role
- **PATCH** `/admin/users/:id/status` - Update user status

---

## Testing

### Test Data

```json
{
  "country": "ZW",
  "email": "test.admin@example.com",
  "firstName": "Test",
  "lastName": "Admin",
  "password": "TestPassword123!",
  "username": "testadmin001",
  "phoneNumber": "+263771234567",
  "role": "admin"
}
```

### Verification Steps

1. Create user via endpoint
2. Verify response includes `emailVerifiedAt` timestamp
3. Verify `status` is `active`
4. Verify `isFirstLogin` is `false`
5. Attempt login with credentials
6. Verify login is successful without additional verification

---

## Troubleshooting

### Issue: "User with this email or username already exists"

**Solution**: Check if the email or username is already in the database. Use a different email/username or delete the existing user first.

### Issue: Password validation error

**Solution**: Ensure password is at least 8 characters long.

### Issue: Country code validation error

**Solution**: Use a valid 2-letter ISO country code (e.g., "ZW", "US", "GB").

### Issue: Unauthorized

**Solution**: Ensure you're using a valid JWT token from an admin account.

---

## Version History

- **v1.0** (2025-10-19) - Initial release with full setup functionality

