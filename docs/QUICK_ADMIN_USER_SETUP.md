# Quick Reference: Admin User Full Setup

## TL;DR

**Endpoint**: `POST /admin/users`

**Purpose**: Create a fully setup, immediately usable admin account

**Key Features**:
- ✅ Email auto-verified
- ✅ Status set to ACTIVE
- ✅ Role defaults to ADMIN
- ✅ No verification required
- ✅ Can login immediately

---

## Quick Example

```bash
POST /admin/users
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>

{
  "country": "ZW",
  "email": "takudzwaneilbvungidzire+3@gmail.com",
  "firstName": "taku",
  "lastName": "bvungi",
  "password": "miraslavklose10",
  "username": "takuDev+1"
}
```

**Result**: User created with:
- Role: `admin` (default)
- Status: `active`
- Email verified: ✅ Yes
- Can login: ✅ Immediately

---

## Request Body Schema

### Required Fields
```typescript
{
  country: string;      // 2-letter ISO code, e.g., "ZW"
  email: string;        // Unique email address
  firstName: string;    // First name
  lastName: string;     // Last name
  password: string;     // Min 8 characters
  username: string;     // Unique username, 3-50 chars
}
```

### Optional Fields
```typescript
{
  phoneNumber?: string; // Phone number
  role?: 'admin' | 'pt_admin' | 'agent'; // Defaults to 'admin'
}
```

---

## What Gets Auto-Populated

| Field | Value | Notes |
|-------|-------|-------|
| `status` | `active` | User can login immediately |
| `emailVerifiedAt` | Current timestamp | Email auto-verified |
| `isFirstLogin` | `false` | Skip first login flow |
| `role` | `admin` | Can be overridden in request |
| `passwordHash` | Bcrypt hash | Password is securely hashed |
| `metadata` | Admin creation info | Audit trail |

---

## Response Example

```json
{
  "id": "uuid-here",
  "firstName": "taku",
  "lastName": "bvungi",
  "country": "ZW",
  "username": "takuDev+1",
  "email": "takudzwaneilbvungidzire+3@gmail.com",
  "role": "admin",
  "status": "active",
  "phoneNumber": null,
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

---

## Login After Creation

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "takudzwaneilbvungidzire+3@gmail.com",
  "password": "miraslavklose10"
}
```

✅ **No verification required** - Login works immediately!

---

## Differences from Regular User Creation

| Feature | Regular `POST /users` | Admin `POST /admin/users` |
|---------|----------------------|---------------------------|
| Email verification | Required | ✅ Auto-verified |
| Status | `pending` | ✅ `active` |
| Role | `agent` | ✅ `admin` (default) |
| First login flow | Required | ✅ Skipped |
| Can login | After email verify | ✅ Immediately |
| Created by | Self-registration | ✅ Admin |

---

## Common Use Cases

1. **Create admin account**: Default behavior
2. **Create PT admin**: Set `"role": "pt_admin"`
3. **Create agent with immediate access**: Set `"role": "agent"`
4. **Onboard team members**: Create multiple accounts quickly

---

## Error Handling

### Email/Username Already Exists
```json
{
  "statusCode": 400,
  "message": "User with this email or username already exists"
}
```
**Solution**: Use different email/username

### Invalid Country Code
```json
{
  "statusCode": 400,
  "message": ["Country must be a 2-character ISO country code"]
}
```
**Solution**: Use 2-letter ISO code (e.g., "ZW", "US")

### Password Too Short
```json
{
  "statusCode": 400,
  "message": ["password must be longer than or equal to 8 characters"]
}
```
**Solution**: Use password with 8+ characters

---

## Full Documentation

See `ADMIN_USER_FULL_SETUP.md` for complete API documentation.

