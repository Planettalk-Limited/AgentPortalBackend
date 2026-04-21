# Odoo Entry-Level Integration Cost Report

## Executive Summary

This report estimates the cost and effort to connect the current Agent Portal system to Odoo at an entry level.

The recommended first phase is to sync partner registrations and business approval events into Odoo CRM. This gives immediate operational value without a full ERP rollout.

## Current System Context (Already in Place)

- Backend: NestJS API (`AgentPortalBackend`)
- Frontend: Next.js portal (`AgentPortal`)
- Existing process already supports:
  - partner registration
  - business partner approval by admin
  - email verification and onboarding workflow

These existing flows reduce integration effort because Odoo can be added at clear points in the process.

## Recommended Entry-Level Integration Scope

Phase 1 should include:

- send new partner registration data to Odoo CRM
- update partner status in Odoo when admin approval happens
- map key fields (name, email, phone, country, company details, partner status)
- add retry/logging for failed sync attempts

Not included in entry-level scope:

- accounting automation
- invoice/payment flows
- inventory/advanced ERP modules
- complex custom Odoo modules

## Implementation Effort (Internal Team)

Estimated effort for API-based integration (if done by your internal team):

- Lean MVP: 8 to 14 developer days
- Typical delivery window: 2 to 4 weeks (including testing and user validation)

One-time external integration charge in this report: **0 USD** (implementation handled internally).

## Odoo Subscription Impact

Official Odoo pricing indicates:

- Standard: 31.10 USD/user/month (annual billing) or 38.90 USD monthly
- Custom: 61.00 USD/user/month (annual billing) or 76.20 USD monthly

Important: External API access is listed under the Custom plan, which is typically required for live system integration.

## Infrastructure and Domain Costs

### DigitalOcean Droplets (monthly examples)

- 1GB Basic Droplet: 6 USD/month
- 2GB Basic Droplet: 12 USD/month
- 4GB Basic Droplet: 24 USD/month
- 8GB Basic Droplet: 48 USD/month

Optional backups generally add about 20% to 30% of droplet cost.

### Domain and DNS

- .com domain registration: typically 10 USD to 20 USD/year (registrar dependent)
- DigitalOcean DNS management: free
- Note: DigitalOcean does not register domains directly

## Budget Options (Board View)

## 1) Lean

Best for: proving value quickly with minimum spend

- Odoo: Custom plan, 1 user = 61 USD/month
- Hosting: single small droplet = 12 USD/month
- Backup: 2 USD/month (light backup posture)
- Domain: ~15 USD/year (~1.25 USD/month equivalent)

Estimated monthly run rate: ~76 USD/month  
Estimated one-time integration charge: **0 USD** (internal implementation)

## 2) Recommended

Best for: stable production setup for current portal usage

- Odoo: Custom plan, 1 user = 61 USD/month
- Backend droplet (4GB) = 24 USD/month
- Frontend droplet (1GB) = 6 USD/month
- Backups = 6 USD/month
- Domain: ~15 USD/year (~1.25 USD/month equivalent)

Estimated monthly run rate: ~98 USD/month  
Estimated one-time integration charge: **0 USD** (internal implementation)

## 3) Growth

Best for: expected increase in registrations/users and safer scaling headroom

- Odoo: Custom plan, 2 users = 122 USD/month
- Backend droplet (8GB) = 48 USD/month
- Frontend droplet (2GB) = 12 USD/month
- Backups = 18 USD/month
- Domain: ~15 USD/year (~1.25 USD/month equivalent)

Estimated monthly run rate: ~201 USD/month  
Estimated one-time integration charge: **0 USD** (internal implementation)

## Risks and Clarifications

- Odoo license pricing may vary by billing region and contract terms.
- If external consultants are used later, implementation/support services are separate from license fees.
- Any future workflow expansion (invoices, commissions, accounting) increases effort and cost.
- Infrastructure estimates exclude taxes, email provider charges, and managed database upgrades.

## Recommended Decision

Approve the **Recommended** option for initial rollout:

- balanced monthly operating cost
- enough hosting capacity for stable operation
- clear path to scale later without redoing integration

## Suggested Next Steps

1. Confirm Odoo plan (Custom) and number of internal users.
2. Approve Lean/Recommended/Growth budget option.
3. Run a short technical discovery (2-3 days) for field mapping and API contract.
4. Start Phase 1 implementation and UAT.

## Pricing Sources

- Odoo Pricing: https://www.odoo.com/pricing
- DigitalOcean Droplet Pricing: https://www.digitalocean.com/pricing/droplets
- DigitalOcean DNS Pricing: https://docs.digitalocean.com/products/networking/dns/details/pricing/
- Namecheap (domain benchmark): https://www.namecheap.com/
- Cloudflare Registrar FAQ (domain benchmark): https://developers.cloudflare.com/registrar/faq
