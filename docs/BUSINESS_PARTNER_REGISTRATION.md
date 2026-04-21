# Business Partner Registration — API Reference & Workflow

This document covers the end-to-end lifecycle of a business partner application on the PlanetTalk Partner Portal: registration, email verification, admin review, approval (with custom partner code assignment), rejection, and the partner's first login.

---

## Table of Contents

1. [Workflow Overview](#1-workflow-overview)
2. [User Statuses](#2-user-statuses)
3. [Step 1 — Partner Submits Application](#3-step-1--partner-submits-application)
4. [Step 2 — Email Verification](#4-step-2--email-verification)
5. [Step 3 — Admin Reviews Applications](#5-step-3--admin-reviews-applications)
6. [Step 4A — Admin Approves (Assigns Partner Code)](#6-step-4a--admin-approves-assigns-partner-code)
7. [Step 4B — Admin Rejects](#7-step-4b--admin-rejects)
8. [Step 5 — Partner Login](#8-step-5--partner-login)
9. [Environment Variables](#9-environment-variables)
10. [Email Templates](#10-email-templates)

---

## 1. Workflow Overview

```
Applicant submits form
        │
        ▼
[Status: pending]
System: Acknowledgement email → Applicant
System: Admin notification email → Admin inboxes
        │
        ▼
Applicant verifies email (OTP)
        │
        ▼
[Status: awaiting_partner_approval]
System: Email verified confirmation → Applicant
        │
        ├─── Admin REJECTS ──────────────────────────────────────────────────┐
        │    [Status: rejected]                                              │
        │    System: Rejection email → Applicant                            │
        │                                                                   │
        └─── Admin APPROVES (assigns custom Partner Code) ──────────────────┘
             [Status: active] + Agent profile created
             System: Welcome / activation email → Applicant
                     (contains login URL, Partner Code, commission rate)
                              │
                              ▼
                    Partner logs in to portal
                    Views assigned Partner Code and dashboard
```

---

## 2. User Statuses

| Status | Value | Meaning |
|--------|-------|---------|
| Pending | `pending` | Application submitted, email not yet verified |
| Awaiting Approval | `awaiting_partner_approval` | Email verified, waiting for admin decision |
| Active | `active` | Approved — partner can log in and use the portal |
| Rejected | `rejected` | Application rejected by admin |

---

## 3. Step 1 — Partner Submits Application

### Endpoint

```
POST /api/v1/auth/register
```

No authentication required.

### Request Body

All fields below are required for `partnerType: "business"`.

```json
{
  "firstName": "Ade",
  "lastName": "Johnson",
  "email": "ade@afrofoods.co.uk",
  "phoneNumber": "+447123456789",
  "country": "GB",
  "password": "SecurePass123!",
  "partnerType": "business",
  "companyName": "Afro Foods Ltd",
  "businessAddress": "42 High Street, Manchester, M1 2AB",
  "primaryBusinessActivity": "grocery_convenience",
  "primarySpecialty": "African",
  "customerInteractionType": "grab_and_go",
  "sellsInternationalGoods": true
}
```

### Field Reference

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `firstName` | string | Yes | max 100 chars | |
| `lastName` | string | Yes | max 100 chars | |
| `email` | string | Yes | valid email, max 255 | Must be unique |
| `phoneNumber` | string | No | E.164 format e.g. `+447123456789` | |
| `country` | string | Yes | 2-char ISO 3166-1 e.g. `GB` | |
| `password` | string | Yes | min 8 chars | Partner sets their own password at registration |
| `partnerType` | string | Yes | `"business"` | Triggers the business registration flow |
| `companyName` | string | Yes* | max 200 chars | Legal or trading name |
| `businessAddress` | string | Yes* | max 500 chars | Full address including post code |
| `primaryBusinessActivity` | enum | Yes* | see below | Primary business category |
| `primarySpecialty` | string | Yes* | max 200 chars | e.g. `African`, `Caribbean`, `South Asian` |
| `customerInteractionType` | enum | Yes* | see below | How customers engage with the business |
| `sellsInternationalGoods` | boolean | Yes* | `true` / `false` | Whether the business sells international/ethnic goods |

*Required when `partnerType` is `"business"`.

### `primaryBusinessActivity` Enum Values

| Value | Label |
|-------|-------|
| `grocery_convenience` | Grocery / Convenience |
| `restaurant_cafe` | Restaurant / Cafe |
| `bar_pub` | Bar / Pub |
| `specialty_food_import` | Specialty Food Import |
| `professional_services` | Professional Services |
| `other` | Other |

### `customerInteractionType` Enum Values

| Value | Label |
|-------|-------|
| `sit_down_table_service` | Sit-down / Table Service |
| `grab_and_go` | Grab-and-go / Over the counter |
| `appointment_based` | Appointment based |

### Password Rules

- Minimum 8 characters
- At least one uppercase letter (frontend enforcement)
- At least one special character (frontend enforcement)

### What the System Does

1. Creates a `users` record with status `pending`, role `agent`.
2. Stores all business fields in `user.metadata.business`.
3. Sends an **acknowledgement email** to the applicant (`business-partner-registration-acknowledgement` template).
4. Sends an **admin notification email** to all inboxes in `ADMIN_BUSINESS_APPLICATION_EMAILS` with the full application details (`business-application-admin-notify` template).
5. Generates and emails a **6-digit OTP** to the applicant for email verification (`business-partner-verify-email` template).

### Success Response `201`

```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your address.",
  "user": {
    "id": "uuid",
    "email": "ade@afrofoods.co.uk",
    "firstName": "Ade",
    "lastName": "Johnson",
    "status": "pending"
  }
}
```

### Error Responses

| HTTP | Condition |
|------|-----------|
| `400` | Email already registered, validation failure, missing required fields |

---

## 4. Step 2 — Email Verification

The applicant receives a 6-digit OTP valid for 15 minutes.

### Verify OTP

```
POST /api/v1/auth/verify-email
```

```json
{
  "email": "ade@afrofoods.co.uk",
  "otp": "847291"
}
```

**On success:**
- Status changes from `pending` → `awaiting_partner_approval`.
- System sends **email verified confirmation** to the applicant (`business-partner-email-verified` template), which includes the meeting booking link.
- Partner **cannot log in** yet — their application is in the admin review queue.

### Resend OTP

```
POST /api/v1/auth/send-email-verification
```

```json
{
  "email": "ade@afrofoods.co.uk"
}
```

Only works while status is `pending`.

---

## 5. Step 3 — Admin Reviews Applications

### List All Pending Applications

```
GET /api/v1/admin/users/pending-business-partners
Authorization: Bearer <admin-token>
```

Returns all users with status `awaiting_partner_approval` and `partnerType: "business"`, ordered by submission date (newest first).

### View Application Detail

```
GET /api/v1/admin/users/:id
Authorization: Bearer <admin-token>
```

The full `metadata.business` object contains all registration fields:

```json
{
  "id": "uuid",
  "firstName": "Ade",
  "lastName": "Johnson",
  "email": "ade@afrofoods.co.uk",
  "phoneNumber": "+447123456789",
  "country": "GB",
  "status": "awaiting_partner_approval",
  "metadata": {
    "partnerType": "business",
    "pendingApproval": true,
    "registeredAt": "2026-04-15T10:00:00.000Z",
    "business": {
      "companyName": "Afro Foods Ltd",
      "businessAddress": "42 High Street, Manchester, M1 2AB",
      "primaryBusinessActivity": "grocery_convenience",
      "primarySpecialty": "African",
      "customerInteractionType": "grab_and_go",
      "sellsInternationalGoods": true
    }
  }
}
```

---

## 6. Step 4A — Admin Approves (Assigns Partner Code)

This is the critical step where the admin assigns a **custom partner code** to the business. The partner code:

- Must be unique across all agents.
- Must start with an alphanumeric character.
- Can contain letters, numbers, underscores (`_`) and hyphens (`-`).
- Minimum 3 characters, maximum 40 characters.

### Endpoint

```
POST /api/v1/admin/users/:id/approve-business-partner
Authorization: Bearer <admin-token>
Content-Type: application/json
```

### Request Body

```json
{
  "partnerCode": "AFRO_FOODS_MCR"
}
```

### Partner Code Rules

| Rule | Detail |
|------|--------|
| Format | Alphanumeric + `_` or `-` |
| Must start with | Letter or digit (not `_` or `-`) |
| Length | 3–40 characters |
| Case | Case-preserved as entered |
| Uniqueness | Enforced — returns `400` if already taken |

### Partner Code Naming Convention (Recommended)

Use a format that is recognisable and meaningful:

```
COMPANY_LOCATION     →  AFRO_FOODS_MCR
COMPANY_SHORTCODE    →  AFROFOODS
REGION_BUSINESS      →  MCR_GROCERY_01
```

### What the System Does

1. Validates user is `awaiting_partner_approval` and has `partnerType: "business"`.
2. Creates an `Agent` record linked to the user, with the provided `partnerCode` as `agentCode`.
3. Sets user status to `active`.
4. Sends a **welcome / activation email** to the partner (`business-partner-welcome` template) containing:
   - Login URL
   - Assigned Partner Code
   - Commission rate and tier
   - Onboarding instructions
   - Support contact

### Success Response `200`

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "ade@afrofoods.co.uk",
    "status": "active"
  },
  "agent": {
    "id": "uuid",
    "agentCode": "AFRO_FOODS_MCR",
    "status": "active"
  }
}
```

### Error Responses

| HTTP | Condition |
|------|-----------|
| `400` | User not in `awaiting_partner_approval` status |
| `400` | Partner code already taken |
| `400` | User is not a business partner registration |
| `400` | Agent profile already exists for this user |
| `404` | User not found |

---

## 7. Step 4B — Admin Rejects

### Endpoint

```
POST /api/v1/admin/users/:id/reject-business-partner
Authorization: Bearer <admin-token>
Content-Type: application/json
```

### Request Body

```json
{
  "reason": "The business does not meet minimum eligibility criteria for our partner programme at this time."
}
```

The `reason` field is optional. If omitted, the rejection email is sent without a reason paragraph.

### What the System Does

1. Validates user is `awaiting_partner_approval` or `pending` and has `partnerType: "business"`.
2. Sets user status to `rejected`.
3. Records `rejectedAt` timestamp and `rejectionReason` in `user.metadata`.
4. Sends a **rejection email** to the applicant (`business-partner-rejection` template) with:
   - Company name
   - Rejection reason (if provided)
   - Support contact

### Success Response `200`

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "ade@afrofoods.co.uk",
    "status": "rejected"
  },
  "message": "Business partner application for Afro Foods Ltd has been rejected."
}
```

### Error Responses

| HTTP | Condition |
|------|-----------|
| `400` | User not in a rejectable state |
| `400` | User is not a business partner registration |
| `404` | User not found |

---

## 8. Step 5 — Partner Login

Once approved, the partner logs in with the email and password they set during registration.

```
POST /api/v1/auth/login
```

```json
{
  "email": "ade@afrofoods.co.uk",
  "password": "SecurePass123!"
}
```

### Login Response by Status

| Status | Response |
|--------|----------|
| `pending` (unverified) | `{ "requiresEmailVerification": true }` — OTP re-sent automatically |
| `awaiting_partner_approval` | `{ "requiresPartnerApproval": true }` — informs applicant to wait |
| `rejected` | `{ "rejected": true }` — directs applicant to check their email |
| `active` | `{ "success": true, "access_token": "..." }` — full JWT issued |

### Successful Login Response `200`

```json
{
  "success": true,
  "emailVerified": true,
  "access_token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "ade@afrofoods.co.uk",
    "firstName": "Ade",
    "lastName": "Johnson",
    "country": "GB",
    "role": "agent",
    "status": "active"
  }
}
```

The partner's **assigned partner code** is available on their profile:

```
GET /api/v1/auth/profile
Authorization: Bearer <access_token>
```

---

## 9. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_BUSINESS_APPLICATION_EMAILS` | Yes | Comma-separated admin inboxes for application alerts |
| `PARTNER_MEETING_BOOKING_URL` | Recommended | Calendly or Google Calendar booking link shown to applicants |
| `FRONTEND_URL` | Development | Used to construct login URLs in emails (production uses hardcoded portal URL) |
| `MAILGUN_API_KEY` | Yes | Mailgun API key for sending emails |
| `MAILGUN_DOMAIN` | Yes | Mailgun domain |
| `MAILGUN_API_URL` | Yes | Mailgun regional API URL (EU: `https://api.eu.mailgun.net`) |

---

## 10. Email Templates

| Template | File | Trigger |
|----------|------|---------|
| Registration acknowledgement | `business-partner-registration-acknowledgement.hbs` | On form submission |
| Email OTP | `business-partner-verify-email.hbs` | On registration and OTP resend |
| Email verified confirmation | `business-partner-email-verified.hbs` | After OTP verified |
| Admin application alert | `business-application-admin-notify.hbs` | On form submission → admin inboxes |
| Welcome / activation | `business-partner-welcome.hbs` | On admin approval |
| Rejection | `business-partner-rejection.hbs` | On admin rejection |

All templates are Handlebars (`.hbs`) and live in `src/templates/email/`. They use the shared `layouts/base.hbs` layout with `components/header.hbs` and `components/footer.hbs` partials.
