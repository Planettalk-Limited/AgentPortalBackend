# Agent Portal - Onboarding & Referral System Model

## Overview

This document describes the database model design for the Agent Portal's onboarding and referral management system, based on the Miro workflow diagram.

## Core Entities

### 1. User Entity (`users` table)

The base user entity that represents all system users (Agents, PT Admins, System Admins).

**Key Features:**
- UUID primary key for security
- Role-based access control (RBAC)
- Email and username uniqueness
- Account status tracking
- First login detection

**Roles:**
- `ADMIN`: System administrator
- `PT_ADMIN`: PT (Product Team) administrator 
- `AGENT`: Insurance agent

**Statuses:**
- `PENDING`: Account created but not verified
- `ACTIVE`: Fully active account
- `INACTIVE`: Temporarily disabled
- `SUSPENDED`: Suspended due to violations

### 2. Agent Entity (`agents` table)

Extends user functionality with agent-specific data and tracks the onboarding workflow.

**Agent Status Flow (matches Miro diagram):**
1. `PENDING_APPLICATION` → Agent submits application
2. `APPLICATION_APPROVED` → PT Admin approves application
3. `CODE_GENERATED` → System generates agent code
4. `CREDENTIALS_SENT` → Login credentials sent to agent
5. `ACTIVE` → Agent completes first login and onboarding

**Key Features:**
- Unique agent code generation
- Tier-based commission structure (Bronze → Diamond)
- Real-time earnings tracking
- Referral performance metrics
- Activity monitoring

### 3. Agent Application Entity (`agent_applications` table)

Captures the initial application data when agents submit their onboarding form.

**Application Status Flow:**
- `SUBMITTED` → Initial submission
- `UNDER_REVIEW` → PT Admin reviewing
- `PENDING_DOCUMENTS` → Awaiting additional documents
- `APPROVED` → Ready for agent creation
- `REJECTED` → Application denied
- `WITHDRAWN` → Applicant withdrew

**Data Captured:**
- Personal information (name, contact, address)
- Professional background and experience
- Licensing information
- Document uploads (resume, license, ID)
- Review notes and decision tracking

## Referral Management System

### 4. Referral Code Entity (`referral_codes` table)

Manages agent referral codes for tracking and rewarding referrals.

**Code Types:**
- `STANDARD`: Regular referral codes
- `PROMOTIONAL`: Special promotion codes
- `LIMITED_TIME`: Time-bound campaigns
- `VIP`: High-value agent codes

**Features:**
- Unique code generation
- Usage limits and expiration
- Bonus commission rates
- Status management
- Usage analytics

### 5. Referral Usage Entity (`referral_usages` table)

Tracks each use of a referral code and manages the referral lifecycle.

**Usage Flow:**
1. `PENDING` → Code used, awaiting confirmation
2. `CONFIRMED` → Referral verified and commission earned
3. `CANCELLED` → Referral cancelled (refund, etc.)
4. `EXPIRED` → Referral expired without confirmation

## Earnings & Rewards System

### 6. Agent Earnings Entity (`agent_earnings` table)

Comprehensive earnings tracking for all agent compensation.

**Earning Types:**
- `REFERRAL_COMMISSION`: Commission from successful referrals
- `BONUS`: Performance or milestone bonuses
- `PENALTY`: Deductions for violations
- `ADJUSTMENT`: Manual adjustments
- `PROMOTION_BONUS`: Special promotion rewards

**Payment Flow:**
1. `PENDING` → Earnings calculated but not confirmed
2. `CONFIRMED` → Earnings approved for payment
3. `PAID` → Payment processed
4. `CANCELLED` → Earnings cancelled
5. `DISPUTED` → Under dispute resolution

## Workflow Integration

### Agent Onboarding Process (from Miro)

```
Agent Application → Application Review → Agent Code Generation → 
Credentials Delivery → First Login → Active Agent
```

**Database Flow:**
1. `AgentApplication` created with status `SUBMITTED`
2. PT Admin reviews and sets status to `APPROVED`
3. System creates `Agent` record with `CODE_GENERATED` status
4. Email service sends credentials, status becomes `CREDENTIALS_SENT`
5. Agent logs in, status becomes `ACTIVE`

### Referral Process

```
Agent Creates Code → Customer Uses Code → Referral Tracked → 
Commission Calculated → Payment Processed
```

**Database Flow:**
1. `ReferralCode` created by agent
2. `ReferralUsage` recorded when code is used
3. `AgentEarnings` entry created for commission
4. Earnings status updated through payment flow

## Key Relationships

- **User → Agent**: One-to-many (users can have multiple agent profiles)
- **Agent → ReferralCodes**: One-to-many (agents can have multiple codes)
- **ReferralCode → ReferralUsages**: One-to-many (codes can be used multiple times)
- **Agent → AgentEarnings**: One-to-many (agents have multiple earning records)
- **Agent → AgentApplications**: One-to-many (application history tracking)

## Analytics & Reporting

The model supports comprehensive analytics:

- **Agent Performance**: Total earnings, referral counts, conversion rates
- **Referral Analytics**: Code usage patterns, success rates, popular codes
- **Financial Reporting**: Commission tracking, payment processing, revenue attribution
- **Onboarding Metrics**: Application approval rates, time-to-active, dropout analysis

## Security Considerations

- UUID primary keys prevent enumeration attacks
- Sensitive data (passwords) properly hashed
- Audit trails through created/updated timestamps
- Role-based access control at entity level
- Metadata fields for extensibility without schema changes

## Future Extensions

The model is designed to accommodate:
- Multi-level referral programs (MLM)
- Dynamic commission structures
- Advanced agent territories
- Integration with external payment systems
- Advanced analytics and machine learning features
