# Partner registration API (individual vs business)

This document describes the HTTP contract for individual and business partner self-registration, email verification, login states, and admin approval. All paths are prefixed with the global API prefix (default: `api/v1` from `API_PREFIX`).

**Base URL example:** `https://<host>/api/v1`

**Authentication:** Public routes use no auth. Admin routes require `Authorization: Bearer <jwt>` (existing admin login; no new role guard in code).

---

## 1. Register — `POST /auth/register`

Creates a pending user. **Individual** registrations also create a pending agent with an auto-generated sequential partner code. **Business** registrations store company fields in `user.metadata` and do **not** create an agent until an admin approves and assigns a custom code.

### Request body — individual (default)

Omit `partnerType` or set `"partnerType": "individual"`.

| Field | Type | Required |
|-------|------|----------|
| `firstName` | string | yes |
| `lastName` | string | yes |
| `country` | string (ISO 3166-1 alpha-2) | yes |
| `email` | string (email) | yes |
| `password` | string (min 8) | yes |
| `phoneNumber` | string (`+` E.164) | no |
| `partnerType` | `"individual"` | no (default) |

### Request body — business

| Field | Type | Required |
|-------|------|----------|
| All individual fields above | | yes |
| `partnerType` | `"business"` | yes |
| `companyName` | string | yes |
| `expectedVolume` | string | yes |
| `region` | string | yes |
| `companyRegistrationNumber` | string | no |

### Example — individual

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "country": "GB",
  "email": "jane@example.com",
  "password": "SecurePassword123!",
  "phoneNumber": "+447700900123"
}
```

### Example — business

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "firstName": "Sam",
  "lastName": "Lee",
  "country": "GB",
  "email": "sam@acme.com",
  "password": "SecurePassword123!",
  "partnerType": "business",
  "companyName": "Acme Telecom Ltd",
  "expectedVolume": "Approx. 500 activations / month",
  "region": "UK & Ireland",
  "companyRegistrationNumber": "12345678"
}
```

### Response — individual (201 / success body shape)

```json
{
  "success": true,
  "partnerType": "individual",
  "message": "Registration successful! Please check your email for the verification code. After verification, you will receive your partner credentials and welcome information.",
  "requiresEmailVerification": true,
  "meetingBookingUrl": "",
  "user": {
    "id": "uuid",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "status": "pending",
    "emailVerified": false,
    "createdAt": "2025-03-25T12:00:00.000Z"
  },
  "agent": {
    "agentCode": "PTA0007",
    "tier": "bronze",
    "commissionRate": 10,
    "status": "pending_application"
  },
  "pendingVerification": true
}
```

`meetingBookingUrl` is set when `PARTNER_MEETING_BOOKING_URL` is configured (optional for individual UI).

### Response — business

```json
{
  "success": true,
  "partnerType": "business",
  "message": "Registration received. Please verify your email. Your application stays pending until our team approves it and assigns your partner code.",
  "requiresEmailVerification": true,
  "meetingBookingUrl": "https://calendly.com/your-link",
  "user": {
    "id": "uuid",
    "firstName": "Sam",
    "lastName": "Lee",
    "email": "sam@acme.com",
    "status": "pending",
    "emailVerified": false,
    "createdAt": "2025-03-25T12:00:00.000Z"
  },
  "pendingVerification": true
}
```

No `agent` object for business at this stage.

### Error — duplicate email (400)

```json
{
  "statusCode": 400,
  "message": "User with this email already exists",
  "error": "Bad Request"
}
```

### Emails triggered (register)

| Partner type | Partner-facing emails (order) |
|--------------|--------------------------------|
| Individual | Registration acknowledgement → OTP verification email |
| Business | Admin notification (if `ADMIN_BUSINESS_APPLICATION_EMAILS` set) → registration acknowledgement → OTP verification email |

---

## 2. Verify email — `POST /auth/verify-email`

Consumes the 6-digit OTP sent after registration (or resend).

### Request body

| Field | Type | Required |
|-------|------|----------|
| `email` | string (email) | yes |
| `code` | string (6 digits) | yes |

### Example

```http
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "email": "jane@example.com",
  "code": "123456"
}
```

### Response — individual (success)

```json
{
  "success": true,
  "message": "Email verified successfully! Your account is now active and your partner credentials have been sent to your email.",
  "meetingBookingUrl": "",
  "user": {
    "id": "uuid",
    "email": "jane@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "status": "active",
    "emailVerified": true
  }
}
```

Individual welcome email is sent asynchronously (individual partner welcome template).

### Response — business (success)

```json
{
  "success": true,
  "requiresPartnerApproval": true,
  "message": "Email verified. Your business partner application is awaiting administrator approval.",
  "meetingBookingUrl": "https://calendly.com/your-link",
  "user": {
    "id": "uuid",
    "email": "sam@acme.com",
    "firstName": "Sam",
    "lastName": "Lee",
    "status": "awaiting_partner_approval",
    "emailVerified": true
  }
}
```

Business “email verified / next steps” email is sent asynchronously.

### Error examples

- Invalid OTP, expired OTP, already verified — `success: false` with `message` (HTTP 200 with body; check application pattern in your client).
- Typical shape: `{ "success": false, "message": "Invalid verification code" }`

---

## 3. Resend verification code — `POST /auth/send-email-verification`

**Request body:** `ResendVerificationDto` — `email` only.

The service sends a new OTP and picks the verification template from `user.metadata.partnerType` (`business` vs `individual`). The user must still be `pending` and not yet email-verified.

**Request:**

```json
{ "email": "jane@example.com" }
```

**Response (shape):**

```json
{
  "success": true,
  "message": "Verification code sent successfully to your email"
}
```

---

## 4. Login — `POST /auth/login`

Uses existing local strategy + password. Responses branch on verification and business approval state.

### Request body

| Field | Type | Required |
|-------|------|----------|
| `email` | string | yes |
| `password` | string | yes |

### Example

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```

### Response — success (individual active, or other active user)

```json
{
  "success": true,
  "emailVerified": true,
  "isFirstSignIn": false,
  "access_token": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "jane@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "country": "GB",
    "role": "agent",
    "status": "active",
    "isFirstLogin": false,
    "emailVerified": true
  }
}
```

### Response — email not verified (`status: pending`, no `emailVerifiedAt`)

```json
{
  "success": false,
  "requiresEmailVerification": true,
  "emailVerified": false,
  "message": "Please verify your email address to complete login.",
  "email": "jane@example.com",
  "otpSent": true,
  "otpMessage": "Verification code sent successfully to your email",
  "user": {
    "id": "uuid",
    "email": "jane@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "status": "pending",
    "emailVerified": false
  }
}
```

### Response — business awaiting admin approval

User has verified email but `status` is `awaiting_partner_approval`. **No `access_token`.**

```json
{
  "success": false,
  "requiresPartnerApproval": true,
  "emailVerified": true,
  "message": "Your business partner application is awaiting administrator approval. You will receive an email once your account is active.",
  "email": "sam@acme.com",
  "user": {
    "id": "uuid",
    "email": "sam@acme.com",
    "firstName": "Sam",
    "lastName": "Lee",
    "status": "awaiting_partner_approval"
  }
}
```

### JWT restrictions

If a client somehow holds a JWT for a user in `awaiting_partner_approval`, protected routes using JWT validation reject the request with **401** (`Partner account is pending administrator approval`).

---

## 5. Admin — list pending business partners

### `GET /admin/users/pending-business-partners`

**Headers:** `Authorization: Bearer <admin-jwt>`

**Response (200):** array of partial user objects (no password hash), for users with `status: awaiting_partner_approval` and `metadata.partnerType === "business"`.

```json
[
  {
    "id": "uuid",
    "firstName": "Sam",
    "lastName": "Lee",
    "email": "sam@acme.com",
    "country": "GB",
    "phoneNumber": "+447700900123",
    "status": "awaiting_partner_approval",
    "metadata": {
      "partnerType": "business",
      "business": {
        "companyName": "Acme Telecom Ltd",
        "expectedVolume": "...",
        "region": "...",
        "companyRegistrationNumber": null
      }
    },
    "createdAt": "2025-03-25T12:00:00.000Z",
    "updatedAt": "2025-03-25T12:15:00.000Z"
  }
]
```

---

## 6. Admin — approve business partner

### `POST /admin/users/:id/approve-business-partner`

**Headers:** `Authorization: Bearer <admin-jwt>`

**Path:** `id` — user UUID (must be business + `awaiting_partner_approval`).

**Request body:**

```json
{
  "partnerCode": "ACME_GLOBAL"
}
```

Rules: 3–40 characters; must match `^[A-Za-z0-9][A-Za-z0-9_-]*$`; stored uppercased; must be unique among agents.

### Response — success (200)

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "sam@acme.com",
    "status": "active"
  },
  "agent": {
    "id": "uuid",
    "agentCode": "ACME_GLOBAL",
    "status": "active"
  }
}
```

### Error examples (400)

- User is not a business registration.
- User not in `awaiting_partner_approval`.
- Partner profile already exists.
- Partner code already in use / invalid format.

Business welcome email is sent asynchronously after success.

---

## 7. Environment variables

| Variable | Purpose |
|----------|---------|
| `PARTNER_MEETING_BOOKING_URL` | Public scheduling URL (e.g. **Google Calendar** `https://calendar.app.google/...` or **Calendly**). Returned as `meetingBookingUrl` on business **register** and **verify-email**; included in business emails and admin notification. |
| `ADMIN_BUSINESS_APPLICATION_EMAILS` | Comma/semicolon/whitespace-separated list of addresses notified on **business** register with full application lines (see admin email template). |

**Booking providers:** the API only needs a single HTTPS link — no provider API keys. For **Google Calendar appointment scheduling**, use the shareable booking page URL in this variable. The HTML/JS **embed snippet** from Google is for the **frontend** confirmation or marketing pages; paste that into the web app, not into the backend.

---

## 8. Email template reference (journey)

| Step | Individual | Business |
|------|------------|----------|
| After register | `individual-partner-registration-acknowledgement`, then `individual-partner-verify-email` | Admin notify, `business-partner-registration-acknowledgement`, then `business-partner-verify-email` |
| After verify email | `individual-partner-welcome` | `business-partner-email-verified` |
| After admin approval | — | `business-partner-welcome` |

Preview/sample payloads: `GET /admin/email-templates/samples` (requires admin JWT).

---

## 9. Database note

User status enum includes `awaiting_partner_approval` (migration `1763971200000-AddAwaitingPartnerApprovalUserStatus`). Run migrations before relying on business verify responses.
