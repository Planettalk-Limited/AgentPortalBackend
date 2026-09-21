# Business Partner Registration — API Reference & Workflow

This document covers the lifecycle of a business partner on the PlanetTalk Partner Portal: registration, email verification, activation, and first login.

> **Changed September 2026.** Business partners no longer go through admin review. They follow exactly the same flow as individual partners and receive a generic `PTA####` code automatically. The approve/reject/review endpoints and the `awaiting_partner_approval` step have been removed. Custom partner codes are now assigned on request, after the fact.

---

## Table of Contents

1. [Workflow Overview](#1-workflow-overview)
2. [User Statuses](#2-user-statuses)
3. [Step 1 — Partner Registers](#3-step-1--partner-registers)
4. [Step 2 — Email Verification and Activation](#4-step-2--email-verification-and-activation)
5. [Step 3 — Partner Login](#5-step-3--partner-login)
6. [Custom Partner Codes](#6-custom-partner-codes)
7. [Environment Variables](#7-environment-variables)
8. [Email Templates](#8-email-templates)
9. [Migrating Partners From the Old Flow](#9-migrating-partners-from-the-old-flow)

---

## 1. Workflow Overview

```
Applicant submits form
        │
        ▼
[Status: pending]  +  Agent profile created (PTA#### reserved, pending_application)
System: Acknowledgement email → Applicant
System: Admin notification email → Admin inboxes (FYI only, not a gate)
System: 6-digit OTP → Applicant
        │
        ▼
Applicant verifies email (OTP)
        │
        ▼
[Status: active]  +  Agent profile activated
System: Welcome email → Applicant (contains login URL, Partner Code, commission)
        │
        ▼
Partner logs in and starts sharing their code
```

The user row and the agent profile are created in a **single transaction**. If the code cannot be allocated, registration fails cleanly and nothing is persisted — no orphaned accounts. A code collision between two simultaneous registrations is retried automatically.

This is the same flow individual partners follow. The only differences are the business metadata captured at registration, the admin notification, and the choice of email template.

---

## 2. User Statuses

| Status | Value | Meaning |
|--------|-------|---------|
| Pending | `pending` | Registered, email not yet verified |
| Active | `active` | Verified — partner can log in and use the portal |
| Rejected | `rejected` | Legacy only. Nothing sets this any more. |
| Awaiting Approval | `awaiting_partner_approval` | **Legacy only.** Nothing sets this any more. Retained in the enum because removing a Postgres enum value requires rebuilding the type. See [§9](#9-migrating-partners-from-the-old-flow). |

---

## 3. Step 1 — Partner Registers

### Endpoint

```
POST /api/v1/auth/register
```

No authentication required.

### Request Body

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
  "sellsInternationalGoods": true
}
```

### Field Reference

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `firstName` | string | Yes | max 100 chars | |
| `lastName` | string | Yes | max 100 chars | |
| `email` | string | Yes | valid email, max 255 | Must be unique |
| `phoneNumber` | string | No | E.164 e.g. `+447123456789` | |
| `country` | string | Yes | 2-char ISO 3166-1 e.g. `GB` | |
| `password` | string | Yes | min 8 chars | Partner sets their own |
| `partnerType` | string | Yes | `"business"` | Selects the business flow |
| `companyName` | string | Yes* | max 200 chars | Legal or trading name |
| `businessAddress` | string | Yes* | max 500 chars | Include post code |
| `primaryBusinessActivity` | enum | Yes* | see below | |
| `primarySpecialty` | string | Yes* | max 200 chars | e.g. `African`, `Caribbean` |
| `sellsInternationalGoods` | boolean | Yes* | `true` / `false` | |

*Required when `partnerType` is `"business"`.

> **Removed September 2026:** `customerInteractionType`. The fixed options (sit-down, grab-and-go, appointment-based) did not describe retailers such as grocery stores, so the field was dropped rather than extended. Existing records keep the value they were saved with; nothing new writes it.

### `primaryBusinessActivity` Enum Values

| Value | Label |
|-------|-------|
| `grocery_convenience` | Grocery / Convenience |
| `restaurant_cafe` | Restaurant / Cafe |
| `bar_pub` | Bar / Pub |
| `specialty_food_import` | Specialty Food Import |
| `professional_services` | Professional Services |
| `other` | Other |

### What the System Does

In one transaction:

1. Creates a `users` record with status `pending`, role `agent`.
2. Stores the business fields in `user.metadata.business`.
3. Creates the `Agent` profile with the next free `PTA####` code, status `pending_application`.

Then, after commit:

4. Sends an **admin notification** to `ADMIN_BUSINESS_APPLICATION_EMAILS` (`business-application-admin-notify`). Informational — no action required.
5. Sends an **acknowledgement email** (`business-partner-registration-acknowledgement`).
6. Sends a **6-digit OTP** (`business-partner-verify-email`).

### Success Response `201`

```json
{
  "success": true,
  "partnerType": "business",
  "message": "Registration received. Please verify your email to activate your account and receive your partner code.",
  "requiresEmailVerification": true,
  "user": {
    "id": "uuid",
    "email": "ade@afrofoods.co.uk",
    "firstName": "Ade",
    "lastName": "Johnson",
    "status": "pending"
  },
  "agent": {
    "agentCode": "PTA0206",
    "tier": "bronze",
    "commissionRate": 10,
    "status": "pending_application"
  },
  "pendingVerification": true
}
```

### Error Responses

| HTTP | Condition |
|------|-----------|
| `400` | Email already registered, validation failure, missing required fields |
| `400` | Agent code pool exhausted — nothing is persisted, the partner can retry |

---

## 4. Step 2 — Email Verification and Activation

The applicant receives a 6-digit OTP valid for 24 hours.

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

- User status `pending` → `active`.
- The agent profile is activated. This ordering matters: `validateReferralCode()` rejects a code whose agent is not active, and the email below carries that code.
- The **welcome email** (`business-partner-welcome`) goes out with the login URL, partner code, and commission rate.
- The partner can log in immediately.

### Resend OTP

```
POST /api/v1/auth/send-email-verification
```

Only works while status is `pending`.

---

## 5. Step 3 — Partner Login

```
POST /api/v1/auth/login
```

| Status | Response |
|--------|----------|
| `pending` (unverified) | `{ "requiresEmailVerification": true }` — OTP re-sent automatically |
| `active` | `{ "success": true, "access_token": "..." }` |

The partner code is on their profile:

```
GET /api/v1/auth/profile
Authorization: Bearer <access_token>
```

---

## 6. Custom Partner Codes

Every partner is issued a generic `PTA####` code. A business that wants a branded code contacts the team, and an administrator changes it.

```
PATCH /api/v1/admin/agents/:id/agent-code
Authorization: Bearer <admin-token>
```

```json
{ "agentCode": "AFRO_FOODS_MCR" }
```

### Rules

| Rule | Detail |
|------|--------|
| Length | 3–40 characters |
| Charset | Alphanumeric, `_`, `-` |
| First character | Letter or digit |
| Uniqueness | Enforced — `400` if taken |
| Case | Uppercased on save |

### ⚠️ The old code stops working immediately

The agent code **is** the referral identifier. `validateReferralCode()` resolves the current value only, so any flyer, poster, or message already carrying the previous code stops working the moment this succeeds. Confirm with the partner before changing a code they have distributed.

The previous code is recorded in `agent.metadata.codeHistory` so a support query about a dead code can be traced:

```json
{
  "codeHistory": [
    { "from": "PTA0206", "to": "AFRO_FOODS_MCR", "changedAt": "2026-09-21T10:00:00.000Z" }
  ]
}
```

### Error Responses

| HTTP | Condition |
|------|-----------|
| `400` | Invalid format or length |
| `400` | Code already in use |
| `404` | Agent not found |

Requesting the code the agent already has is a no-op and returns `200`.

---

## 7. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_BUSINESS_APPLICATION_EMAILS` | Yes | Comma-separated admin inboxes for registration alerts |
| `FRONTEND_URL` | Development | Used for login URLs and email banner URLs (production uses the portal domain) |
| `MAILGUN_API_KEY` | Yes | Mailgun API key |
| `MAILGUN_DOMAIN` | Yes | Mailgun domain |
| `MAILGUN_API_URL` | Yes | Mailgun regional API URL (EU: `https://api.eu.mailgun.net`) |

`PARTNER_MEETING_BOOKING_URL` is no longer read. The onboarding meeting was removed from the signup form — it could not scale to the expected volume and stranded applicants who clicked through to the booking page. The variable can stay in the environment; nothing consumes it.

---

## 8. Email Templates

| Template | File | Trigger |
|----------|------|---------|
| Registration acknowledgement | `business-partner-registration-acknowledgement.hbs` | On registration |
| Email OTP | `business-partner-verify-email.hbs` | On registration and OTP resend |
| Welcome / activation | `business-partner-welcome.hbs` | On email verification |
| Admin registration alert | `business-application-admin-notify.hbs` | On registration → admin inboxes |

Removed: `business-partner-email-verified.hbs` (announced entry into the review queue) and `business-partner-rejection.hbs` (no rejection path exists).

All templates are Handlebars and live in `src/templates/email/`, using `layouts/base.hbs` with the `components/header.hbs` and `components/footer.hbs` partials.

### Banners

`TemplateService.renderTemplate()` injects a `bannerUrl` default that `header.hbs` renders. Callers can override it:

| Banner | File | Used by |
|--------|------|---------|
| Header strip (600×200) | `partner-email-header.jpg` | Default for every template |
| Welcome hero (1600×800) | `partner-welcome-hero.jpg` | Individual and business welcome emails |

Both are served from the partner portal at `https://portal.planettalk.com/images/`, committed in the `AgentPortal` repo under `public/images/`. They replaced a Google Drive `uc?export=view` link that Gmail and Outlook frequently refused to render.

---

## 9. Migrating Partners From the Old Flow

Partners who registered under the old flow may sit in `awaiting_partner_approval`. They verified their email but were waiting on an administrator. Nothing moves them now, so they must be migrated explicitly.

Use the existing backfill script, which now covers business partners:

```bash
# 1. Dry run — prints the plan, writes nothing, sends nothing
npx ts-node src/scripts/backfill-missing-agent-profiles.ts --include-pending

# 2. Canary a single partner
npx ts-node src/scripts/backfill-missing-agent-profiles.ts --only=ade@afrofoods.co.uk --apply

# 3. Apply to the rest
npx ts-node src/scripts/backfill-missing-agent-profiles.ts --include-pending --apply
```

For each partner it allocates a `PTA####` code, creates and activates the agent profile, sets the user to `active`, and sends the welcome email carrying the code. It is idempotent — anyone who already has an agent profile is skipped — and safe to re-run.

`--include-pending` is required because `awaiting_partner_approval` is not `active`. That is deliberate: it keeps a production write behind an explicit flag.

Users in `rejected` are left alone. That was a deliberate business decision and this change does not reverse it; `resubmit-business-partner` remains available to them and now leads to the normal flow.
