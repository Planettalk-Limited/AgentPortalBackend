# 🚀 Cleaned-Up Agent Portal API Structure

## Overview

This document provides the **updated and streamlined** API documentation for the Agent Portal Backend system. The API has been reorganized for clarity, consistency, and better role-based access control.

**Base URL:** `http://localhost:3000/api/v1` (or your deployed URL)  
**API Documentation:** `http://localhost:3000/api/docs` (Swagger UI)

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

🔒 = Requires Authentication  
👑 = Admin/PT Admin Only

## Table of Contents

1. [Authentication & Profile](#1-authentication--profile)
2. [User Management (Admin)](#2-user-management-admin-)
3. [Agent Applications (Onboarding)](#3-agent-applications-onboarding)
4. [Agent Management](#4-agent-management)
5. [Referral System](#5-referral-system)
6. [Earnings Management](#6-earnings-management)
7. [Payout System](#7-payout-system)
8. [Notifications](#8-notifications)
9. [Training & Resources](#9-training--resources)
10. [System Management (Admin)](#10-system-management-admin-)
11. [Email Template Management](#11-email-template-management-)
12. [Automated Processes](#12-automated-processes)

---

## 1. Authentication & Profile

✅ **Notes:** Profile response includes role-based data (admin/agent). Enforces role-based UI logic.

### Login
**POST** `/auth/login`

### Logout
**POST** `/auth/logout` 🔒

### Get Profile
**GET** `/auth/profile` 🔒

### Update Profile
**PATCH** `/auth/profile` 🔒

### Get User Preferences
**GET** `/auth/profile/preferences` 🔒

Get all user preferences and settings.

### Update User Preferences
**PATCH** `/auth/profile/preferences` 🔒

Update general preferences (language, timezone, currency, notifications).

### Get Security Settings
**GET** `/auth/profile/security` 🔒

Get user security settings (2FA status, password requirements).

### Update Security Settings
**PATCH** `/auth/profile/security` 🔒

Update security settings (2FA, password requirements).

### Get Notification Preferences
**GET** `/auth/profile/notifications` 🔒

Get granular notification preferences by type.

### Update Notification Preferences
**PATCH** `/auth/profile/notifications` 🔒

Update granular notification preferences by type (payout, earnings, training, etc.).

### Toggle 2FA
**POST** `/auth/profile/toggle-2fa` 🔒

Quick toggle for two-factor authentication.

### Toggle Email Notifications
**POST** `/auth/profile/toggle-email-notifications` 🔒

Quick toggle for all email notifications.

### Change Password
**PATCH** `/auth/change-password` 🔒

### Forgot Password
**POST** `/auth/forgot-password`

### Reset Password
**POST** `/auth/reset-password`

### Two-Factor Authentication (2FA)

#### Check 2FA Required
**POST** `/auth/2fa/check-required`

Check if email requires 2FA for login.

#### Verify 2FA (Login Step 2)
**POST** `/auth/verify-2fa`

Complete login with 2FA verification code.

#### Setup 2FA
**POST** `/auth/2fa/setup` 🔒

Generate QR code and secret for 2FA setup.

#### Complete 2FA Setup
**POST** `/auth/2fa/verify-setup` 🔒

Verify setup code and enable 2FA.

#### Disable 2FA
**POST** `/auth/2fa/disable` 🔒

Disable 2FA with verification code and password.

---

## 2. User Management (Admin) 👑

✅ **Fixes applied:** Removed duplicate "User Management" blocks. Unified CRUD + Admin-specific functions under one consistent namespace.

### Get All Users
**GET** `/admin/users` 👑

### Get User Statistics  
**GET** `/admin/users/stats` 👑

### Get User by ID
**GET** `/admin/users/:id` 👑

### Create User
**POST** `/admin/users` 👑

### Update User
**PATCH** `/admin/users/:id` 👑

### Delete User
**DELETE** `/admin/users/:id` 👑

### Update User Role
**PATCH** `/admin/users/:id/role` 👑

### Update User Status
**PATCH** `/admin/users/:id/status` 👑

### Reset User Password
**PATCH** `/admin/users/:id/reset-password` 👑

### Force Password Change
**PATCH** `/admin/users/:id/force-password-change` 👑

### Unlock User
**PATCH** `/admin/users/:id/unlock` 👑

### Bulk User Actions
**POST** `/admin/users/bulk-actions` 👑

---

## 3. Agent Applications (Onboarding)

✅ **Fixes applied:** Removed redundant POST /agents/applications (authenticated). Enforced public entry point only for new applications.

### Submit Application (Public)
**POST** `/public/agents/apply`
→ Public application submission

### Get All Applications
**GET** `/admin/agents/applications` 👑
→ List all applications

### Get Application by ID
**GET** `/admin/agents/applications/:id` 👑

### Review Application
**PATCH** `/admin/agents/applications/:id/review` 👑

---

## 4. Agent Management

✅ **Fixes applied:** Clarified who activates agent:
- Admin approves → credentials sent
- Agent first login → system auto-activates
- Removed duplication of "Agent Applications" inside referral system

### Get Current Agent
**GET** `/agents/me` 🔒
→ Current user's agent record

### Get All Agents
**GET** `/admin/agents` 👑
→ All agents

### Get Agent by ID
**GET** `/admin/agents/:id` 👑

### Create Agent
**POST** `/admin/agents` 👑

### Update Agent
**PATCH** `/admin/agents/:id` 👑

### Delete Agent
**DELETE** `/admin/agents/:id` 👑

### Agent Workflow

#### Approve Agent
**PATCH** `/admin/agents/:id/approve` 👑
→ Approve + generate code

#### Send Credentials
**POST** `/admin/agents/:id/send-credentials` 👑

#### Activate Agent
**PATCH** `/agents/:id/activate` 🔒
→ Auto-activation after first login

#### Deactivate Agent
**PATCH** `/admin/agents/:id/deactivate` 👑
→ Manual deactivation

#### Reactivate Agent
**PATCH** `/admin/agents/:id/reactivate` 👑

#### Check Inactive Agents
**POST** `/admin/agents/check-inactive` 👑
→ Auto-deactivate agents inactive for 6+ months

---

## 5. Referral System

✅ **Fixes applied:** Moved referral endpoints to their own clean section. No overlap with applications.

### Create Referral Code
**POST** `/agents/:agentId/referral-codes` 🔒

### Get Agent Referral Codes
**GET** `/agents/:agentId/referral-codes` 🔒

### Use Referral Code
**POST** `/agents/referral-codes/:code/use` 🔒

### Validate Referral Code (Public)
**GET** `/public/agents/referral-codes/:code/validate`

---

## 6. Earnings Management

✅ **Fixes applied:** Require audit logging for all adjustments. Backend prevents negative deductions > available balance.

### Get Agent Earnings
**GET** `/agents/:agentId/earnings` 🔒

### Get Earnings Summary
**GET** `/agents/:agentId/earnings/summary` 🔒

### Create Earning Adjustment
**POST** `/admin/earnings/agents/:agentId/adjust` 👑

---

## 7. Payout System

✅ **Fixes applied:** Removed duplicate payout blocks. Enforce strict transition validation:
Cannot skip stages (e.g., REQUESTED → COMPLETED).

### Request Payout
**POST** `/agents/:agentId/payouts` 🔒

Request a payout from available balance. Supports multiple payout methods including bank transfer, airtime top-up, and mobile money.

**Supported Payout Methods:**
- `bank_transfer` - Traditional bank transfer
- `airtime_topup` - Mobile airtime top-up 📱
- `mobile_money` - Mobile money transfer (EcoCash, M-Pesa, etc.) 💰
- `paypal` - PayPal transfer
- `crypto` - Cryptocurrency transfer
- `stripe` - Stripe transfer
- `check` - Physical check
- `other` - Other payment methods

**Example - Airtime Top-Up:**
```json
{
  "amount": 25.00,
  "method": "airtime_topup",
  "description": "Monthly airtime payout",
  "paymentDetails": {
    "airtimeTopup": {
      "phoneNumber": "+263771234567",
      "carrier": "Econet",
      "country": "Zimbabwe"
    }
  }
}
```

**Example - Mobile Money:**
```json
{
  "amount": 150.00,
  "method": "mobile_money", 
  "description": "Weekly earnings payout",
  "paymentDetails": {
    "mobileMoney": {
      "phoneNumber": "+254701234567",
      "provider": "M-Pesa",
      "accountName": "Jane Smith",
      "country": "Kenya"
    }
  }
}
```

### Get Agent Payouts
**GET** `/agents/:agentId/payouts` 🔒

### Get Payout Details
**GET** `/agents/payouts/:id` 🔒

### Cancel Payout
**DELETE** `/agents/payouts/:id` 🔒

### Admin Payout Management

#### Approve Payout
**PATCH** `/admin/payouts/:id/approve` 👑

#### Reject Payout
**PATCH** `/admin/payouts/:id/reject` 👑

#### Process Payout
**PATCH** `/admin/payouts/:id/process` 👑

#### Complete Payout
**PATCH** `/admin/payouts/:id/complete` 👑

#### Get All Payouts
**GET** `/admin/payouts` 👑

#### Get Payout Statistics
**GET** `/admin/payouts/stats` 👑

#### Bulk Process Payouts
**POST** `/admin/payouts/bulk-process` 👑

**Payout Status Flow:**
```
REQUESTED → PENDING_REVIEW → APPROVED → PROCESSING → COMPLETED
                ↓
            REJECTED / CANCELLED / FAILED
```

---

## 8. Notifications

**(New Section)** - Send announcement/training/earnings alerts.

### List Notifications
**GET** `/notifications` 🔒
→ List agent notifications

### Get Unread Count
**GET** `/notifications/unread-count` 🔒

### Mark Notification as Read
**PATCH** `/notifications/:id/mark-read` 🔒

### Mark All as Read
**PATCH** `/notifications/mark-all-read` 🔒

### Delete Notification
**DELETE** `/notifications/:id` 🔒

### Admin Notification Management

#### Send Notification
**POST** `/admin/notifications` 👑
→ Send notification to specific user

#### Send Bulk Notifications
**POST** `/admin/notifications/bulk` 👑

#### Send Role Announcement
**POST** `/admin/notifications/announcement/role` 👑

#### Send Global Announcement
**POST** `/admin/notifications/announcement/all` 👑

#### Get Notification Statistics
**GET** `/admin/notifications/stats` 👑

---

## 9. Training & Resources

**(New Section)** - Assigned training materials and completion tracking.

### Get Assigned Training
**GET** `/agents/training` 🔒
→ Assigned training materials

### Get Training Progress
**GET** `/agents/training/progress` 🔒

### Complete Training
**PATCH** `/agents/training/:id/complete` 🔒

### Admin Training Management

#### Get All Training Materials
**GET** `/admin/training` 👑

#### Get Training Statistics
**GET** `/admin/training/stats` 👑

#### Get Training Material by ID
**GET** `/admin/training/:id` 👑

#### Create Training Material
**POST** `/admin/training` 👑
→ Upload training/checklist

#### Update Training Material
**PATCH** `/admin/training/:id` 👑

#### Delete Training Material
**DELETE** `/admin/training/:id` 👑

---

## 10. System Management (Admin) 👑

✅ **Fixes applied:** Added audit logs, system health monitoring, and comprehensive admin controls.

### Get Dashboard Data
**GET** `/admin/system/dashboard` 👑

### Get System Health
**GET** `/admin/system/health` 👑

### Get System Settings
**GET** `/admin/system/settings` 👑

### Update System Settings
**PATCH** `/admin/system/settings` 👑

### Enable Maintenance Mode
**POST** `/admin/system/maintenance-mode` 👑

### Disable Maintenance Mode
**DELETE** `/admin/system/maintenance-mode` 👑

### Create Backup
**POST** `/admin/system/backup` 👑

### List Backups
**GET** `/admin/system/backups` 👑

### Clear Cache
**POST** `/admin/system/cache/clear` 👑

### Get Audit Logs
**GET** `/admin/system/audit-logs` 👑

### Get Performance Metrics
**GET** `/admin/system/performance` 👑

### Get Error Logs
**GET** `/admin/system/errors` 👑

---

## 11. Email Template Management 👑

### Get Available Templates
**GET** `/admin/email-templates` 👑

### Preview Template
**POST** `/admin/email-templates/preview` 👑

### Send Test Email
**POST** `/admin/email-templates/test-send` 👑

### Get Sample Data
**GET** `/admin/email-templates/samples` 👑

### Clear Template Cache
**POST** `/admin/email-templates/clear-cache` 👑

### Validate Template
**GET** `/admin/email-templates/validate/:name` 👑

### Email Service Testing

#### Check Service Status
**GET** `/admin/email/service-status` 👑

Check Mailgun email service configuration status.

#### Send Test Email
**POST** `/admin/email/test-send` 👑

Send test email via Mailgun to verify configuration.

#### Send Template Test
**POST** `/admin/email/test-template` 👑

Send test email using email templates to verify template system.

#### Debug Connection
**POST** `/admin/email/debug-connection` 👑

Debug Mailgun connection with detailed environment and connection testing.

#### Debug Email Send
**POST** `/admin/email/debug-send` 👑

Send debug email with step-by-step logging and detailed error reporting.

---

## 12. Automated Processes (System)

### Agent Inactivity Auto-Deactivation
- **Process:** Backend cron/service checks `lastActivityAt` → marks inactive after 6 months
- **Endpoint:** `POST /admin/agents/check-inactive` 👑 (manual trigger)

### Payout Status Validation
- **Process:** Enforces strict transition validation (no skipping stages)
- **Flow:** REQUESTED → PENDING_REVIEW → APPROVED → PROCESSING → COMPLETED

### Earnings Balance Protection
- **Process:** Backend prevents negative deductions > available balance
- **Audit:** All adjustments logged with reason and admin user

---

## 🎯 Key Adjustments for Backend

### ✅ Removed Duplicates
- Consolidated sections (User Mgmt, Payouts, Applications)
- Eliminated redundant endpoints

### ✅ Fixed Inconsistent Flows
- Agent onboarding clarified
- Payout transitions enforced
- Role boundaries clearly defined

### ✅ Added Missing Functionality
- **Notifications module** with admin broadcast capabilities
- **Training & Resources** with completion tracking
- **Audit logs** for all administrative actions
- **Agent deactivation** with automated checks

### ✅ Enforce Validations
- Payout transition validation (no skipping stages)
- Earnings deduction protection (prevent negative balance)
- Role-based access control (🔒 vs 👑)

### ✅ Improved Organization
- Clear separation of public vs authenticated endpoints
- Consistent naming conventions
- Logical grouping of related functionality

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/endpoint"
}
```

### Paginated Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Agent Onboarding Workflow

```
1. Public Application
   POST /public/agents/apply
   ↓
2. Admin Review
   GET /admin/agents/applications
   PATCH /admin/agents/applications/:id/review
   ↓
3. Agent Approval & Code Generation
   PATCH /admin/agents/:id/approve
   ↓
4. Credentials Delivery
   POST /admin/agents/:id/send-credentials
   ↓
5. Agent Auto-Activation (First Login)
   PATCH /agents/:id/activate
   ↓
6. Active Agent (referrals, earnings, payouts enabled)
```

---

## Payout Processing Workflow

```
1. Agent Payout Request
   POST /agents/:agentId/payouts
   ↓
2. Admin Review
   GET /admin/payouts/pending
   ↓
3. Approve/Reject
   PATCH /admin/payouts/:id/approve
   PATCH /admin/payouts/:id/reject
   ↓
4. Processing
   PATCH /admin/payouts/:id/process
   ↓
5. Complete with Transaction ID
   PATCH /admin/payouts/:id/complete
```

---

*Last updated: September 2025*  
*API Version: 2.0.0 (Cleaned Structure)*  
*Total Endpoints: 85+*  
*Framework: NestJS + TypeScript + PostgreSQL*
*New Features: Notifications, Training, Enhanced Admin Controls*
