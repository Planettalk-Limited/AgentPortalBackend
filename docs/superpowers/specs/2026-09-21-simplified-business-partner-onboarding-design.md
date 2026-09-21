# Simplified Business Partner Onboarding — Design

**Date:** 2026-09-21
**Status:** Implemented 2026-09-21. See the implementation notes at the end.
**Repos:** `AgentPortalBackend` (NestJS), `AgentPortal` (Next.js)

---

## 1. Background

PlanetTalk is entering a partnership with a UK company to onboard business
partners at volume — grocery stores, supermarkets, and similar retail
businesses. A review of the current signup process found it too long and too
confusing for that audience.

The current business partner flow gates every applicant behind manual admin
review. An applicant registers, verifies their email, and then waits in
`awaiting_partner_approval` until an administrator approves them and hand-picks
a custom partner code derived from their company name. At the volume now
expected, that gate does not scale and nobody will be staffing it.

The requirement, in the words of the stakeholder briefing:

> We don't have a specialized, when business partners submit, they wait for any
> of all those things. No, it will go the same flow that individual partners go
> because we are not reviewing anything. Once they submit, they have verified
> their email, they get their partner code.

Separately, no partner-branded email banners have ever been provided. Every one
of the 25 email templates renders a single hardcoded Google Drive image.

---

## 2. Goals

1. Business partner registration follows the same flow as individual partner
   registration, with no approval gate.
2. Business partners receive a generic sequential `PTA####` code at signup.
   Custom codes become a post-hoc request handled by an administrator.
3. Remove three friction points from the signup journey: the terms and
   conditions interstitial, the Customer Interaction Type field, and the
   mandatory onboarding meeting.
4. Apply the two supplied partner email banners across the template set.
5. Leave no partner stranded in a status the new flow cannot resolve.

## 3. Non-goals

- A partner-facing form for requesting a custom code. Requests arrive by email
  and an administrator services them.
- Any change to the individual partner flow, which already behaves correctly.
- Rewriting the email template system or optimising `public/images/`.
- Removing the `awaiting_partner_approval` enum value from Postgres.

---

## 4. Key insight

This change is predominantly a **deletion**.

The individual partner flow already implements the desired behaviour end to
end. `users.service.register()` creates a pending agent inside the same
transaction as the user, protected by `withAgentCodeRetry`.
`auth.service.verifyEmailOTP()` then calls
`usersService.activateVerifiedPartnerAgent()`, receives the agent with its
assigned code, and sends the welcome email carrying that code.

Business partners are therefore unified with individual partners not by
building a new path, but by removing the `isBusiness` branches that currently
divert them off the existing one.

---

## 5. Backend design

### 5.1 Flow unification

**`src/modules/users/users.service.ts` — `register()`**

Remove the conditional that suppresses agent creation for business partners:

```ts
// before
const createdAgent = isBusiness
  ? null
  : await this.agentsService.createPendingAgentWithReferralData(createdUser, manager);

// after
const createdAgent =
  await this.agentsService.createPendingAgentWithReferralData(createdUser, manager);
```

Business partners now have a `PTA####` code reserved at signup, inside the same
transaction, with the same retry protection against the concurrent-insert race
documented in commit `8f022f9`.

The `isBusiness` flag is still needed below this point for metadata shaping, the
admin notification, and acknowledgement template selection. It is only the agent
creation branch that goes.

**`src/modules/auth/auth.service.ts` — `verifyEmailOTP()`**

Delete the entire `if (isBusinessPartner) { ... }` block (approximately 60
lines, from the `newStatus` assignment through the
`requiresPartnerApproval: true` return). Both partner types fall through to the
existing activation path that sets `ACTIVE`, calls
`activateVerifiedPartnerAgent()`, and sends the welcome email.

The `isAlreadyActive` guard inside that block also goes. It existed only to stop
an approved partner being downgraded back to `awaiting_partner_approval` on a
late OTP submission. With the status no longer written, the hazard is gone.

**Welcome email selection**

The one branch that remains, at the point of sending:

```ts
const isBusiness = user.metadata?.partnerType === 'business';
await (isBusiness
  ? this.emailService.sendBusinessPartnerWelcomeEmail(emailData)
  : this.emailService.sendIndividualPartnerWelcomeEmail(emailData));
```

Identical data, identical trigger, identical moment. Only the template differs,
so business partners keep their own branded copy.

**`src/modules/auth/dto/register.dto.ts`**

Remove `customerInteractionType` and its `@ValidateIf` / `@IsNotEmpty` /
`@IsEnum` decorators. Remove the now-unused `CustomerInteractionType` import and
enum if nothing else references it.

Retain `companyName`, `businessAddress`, `primaryBusinessActivity`,
`primarySpecialty`, and `sellsInternationalGoods`. The briefing cut only
interaction type:

> This one is very restrictive. This one does not cover businesses like grocery
> store owners. So instead of trying to customize it for this, we want to just
> completely remove this field, customer interaction type.

`metadata.business.customerInteractionType` is no longer written for new
registrations. Existing records keep theirs; no data migration.

### 5.2 Status handling

`UserStatus.AWAITING_PARTNER_APPROVAL` **remains in the enum**. Nothing writes
it after this change.

Dropping a value from a Postgres enum requires rebuilding the type and rewriting
every dependent column. Migration `1763971200000-AddAwaitingPartnerApprovalUserStatus`
already shipped the value. The risk of the teardown is not justified for a value
that simply goes unreferenced.

`auth.service.login()` keeps its `requiresPartnerApproval` branch until the
backfill (§8) has drained the existing queue. It is removed in the same pull
request, after the backfill has been confirmed clean, so no user hits a login
path that cannot describe their state.

### 5.3 Approval machinery removal

Delete:

| Kind | Item |
|---|---|
| Endpoint | `POST /admin/users/:id/approve-business-partner` |
| Endpoint | `POST /admin/users/:id/reject-business-partner` |
| Endpoint | `POST /admin/users/:id/review-business-partner` |
| Endpoint | `GET /admin/users/pending-business-partners` |
| Service | `usersService.approveBusinessPartner()` |
| Service | `usersService.rejectBusinessPartner()` |
| Service | `usersService.listPendingBusinessPartners()` |
| DTO | `approve-business-partner.dto.ts` |
| DTO | `reject-business-partner.dto.ts` |
| Template | `business-partner-rejection.hbs` |
| Template | `business-partner-email-verified.hbs` |
| Email method | `sendBusinessPartnerRejectionEmail()` |
| Email method | `sendBusinessPartnerEmailVerifiedConfirmation()` |

Retain:

- **`business-application-admin-notify`** — the team still wants to know when a
  business registers. It is now an FYI, not a gate.
- **`resubmit-business-partner`** — degrades correctly under the new flow. A
  previously rejected partner resubmits, lands in `pending`, verifies, and goes
  active. Serves the existing rejected population without special handling.

`PARTNER_MEETING_BOOKING_URL` and the `meetingBookingUrl` plumbing become
unreferenced once the meeting is removed from the form and
`business-partner-email-verified.hbs` is deleted. No `.hbs` template references
it. Remove the parameter threading through
`sendBusinessPartnerRegistrationAcknowledgement()`,
`usersService.getPartnerMeetingBookingUrl()`, and the `verifyEmailOTP` return
payload. Leave the environment variable itself in place and undocumented rather
than forcing a deployment config change.

### 5.4 New admin endpoint — change agent code

`PATCH /api/v1/admin/agents/:id/agent-code`

This is where the custom-code validation currently living in
`approveBusinessPartner()` is rehomed rather than deleted. It serves the
briefing's:

> If anybody now wants additional customization, they can contact us and we
> change that from the back end.

Request:

```json
{ "agentCode": "AFRO_FOODS_MCR" }
```

Validation, carried over unchanged:

| Rule | Detail |
|---|---|
| Length | 3–40 characters |
| Charset | Alphanumeric, `_`, `-` |
| First character | Letter or digit |
| Uniqueness | Enforced; `400` if taken |
| Case | Preserved as entered |

Behaviour: updates `agent.agentCode`, records the previous code and a timestamp
in `agent.metadata.codeHistory`, returns the updated agent. Admin-guarded like
its sibling endpoints in `admin-agents.controller.ts`.

**Referral-integrity note.** An agent code is the referral identifier. Changing
it means the old code stops resolving in `validateReferralCode()`. Any material
the partner has already distributed with the `PTA####` code goes dead. The
endpoint is therefore an administrative tool used deliberately, not a
self-service feature — which is consistent with the briefing routing these
through a conversation with the team. `codeHistory` exists so that a support
query about a dead code can be traced.

---

## 6. Frontend design

### 6.1 Remove the terms and conditions interstitial

`src/components/Hero.tsx` — the "Continue to Registration" modal that
intercepts the Sign Up button.

> We would like to remove this one here because sometimes it just confuses
> somebody to say I clicked on sign up and it's not going directly.

Sign Up navigates straight to the registration form. Terms are not lost: the
form already carries a required **Partner Program Agreement** checkbox linking
to the same document, which is the enforcement point that matters.

### 6.2 Registration form

`src/app/[locale]/auth/register/page.tsx`

| Remove | Location |
|---|---|
| Customer Interaction Type select | Business Information section |
| `MeetingBookingModal` import, render, and `onBooked` handler | Lines 12, 873–880 |
| `meetingBooked` state | Line 92 |
| `setMeetingBooked(false)` in the partner-type reset | Line 351 |
| `customerInteractionType` + `meeting` validation | `validateForm()`, lines ~180–181 |
| `customerInteractionType` + `meetingBooked` gates | `isFormComplete()`, line ~195 |
| `meetingBookingUrl` param passthrough | Line 242 |
| Schedule Meeting block | Lines 534–584 |

Delete `src/components/MeetingBookingModal.tsx` if nothing else imports it.

### 6.3 Copy

The "What happens next" box currently reads:

> After registering you'll verify your email. Our team will then review your
> application and activate your account once approved.

The second sentence becomes false on deploy. Rewrite to state that verifying
the email activates the account and delivers the partner code.

### 6.4 Locales

Prune orphaned keys from **all four** locale files —
`src/i18n/messages/{en,es,fr,pt}.json`:

`business.scheduleMeeting`, `business.meetingScheduled`,
`business.meetingScheduledDescription`, `business.bookMeeting`,
`business.bookMeetingDescription`, `business.canReschedule`,
`business.mustBookMeeting`, `validation.meetingRequired`,
`validation.customerInteractionRequired`, and the
`business.customerInteractionType` label and option set.

Update the "what happens next" copy in all four. Any key removed from `en.json`
must be removed from the other three, and any reworded string must be reworded
in all four — a missed locale surfaces as a raw key in production.

### 6.5 Admin business partners page

`src/app/[locale]/admin/business-partners/page.tsx` becomes a read-only list.
Remove the approve and reject controls, the partner-code input, and the calls to
the deleted endpoints in `src/lib/api/services/admin.service.ts`. Retain the
listing itself — seeing which businesses have registered stays useful — sourced
from the standard agents/users listing rather than the deleted
`pending-business-partners`.

---

## 7. Email banners

Two banners supplied:

| File | Dimensions | Content | Role |
|---|---|---|---|
| `partner-email-header.jpg` | 600×200 | Teal, framed "PLANETTALK / PARTNER PROGRAMME" | Default header, all templates |
| `partner-welcome-hero.jpg` | 1600×800 | Photographic, "Welcome to PlanetTalk Partner Programme" | Welcome emails only |

Both commit to `AgentPortal/public/images/` and are served from
`https://portal.planettalk.com/images/`. This retires the existing Google Drive
`uc?export=view` link, which Gmail and Outlook frequently refuse to render. The
frontend is already a production domain under version control, so this adds no
infrastructure.

The 600×200 banner matches the `.email-container` width exactly, so it renders
at native resolution with no scaling.

### Implementation

`TemplateService.renderTemplate()` already injects shared context
(`currentYear`, `showSupport`, `showSocial`). Add `bannerUrl` there with the
header banner as the default:

```ts
const templateData = {
  bannerUrl: `${this.getAssetBaseUrl()}/images/partner-email-header.jpg`,
  ...data,                       // caller-supplied bannerUrl wins
  currentYear: new Date().getFullYear(),
  showSupport: true,
  showSocial: false,
};
```

`header.hbs` becomes `<img src="{{bannerUrl}}" ...>`. The two welcome email
send methods pass `bannerUrl` pointing at the hero. One hook, no per-template
edits across the other 23 templates.

The asset base URL follows the existing `getPartnerPortalBaseUrl()` pattern —
production constant, `FRONTEND_URL` fallback — minus the `/en` locale suffix,
since `public/` is not locale-scoped.

Keep `alt="PlanetTalk Partner Programme"` and the inline
`max-width: 100%; height: auto; display: block` styling. Inline styles are
required; email clients discard much of the `<style>` block.

---

## 8. Backfill

Business partners currently in `awaiting_partner_approval` have verified their
email and are waiting on an administrator. After this change, nothing will ever
move them. They must be resolved explicitly.

**Extend the existing script rather than adding a new one.**
`src/scripts/backfill-missing-agent-profiles.ts` (from commit `fef6950`)
already provides dry-run-by-default, `--apply`, `--only=<emails>`, test-account
filtering, idempotency, welcome-email sending, and a pure, unit-tested
`classifyOrphan()` with its own spec file. Duplicating that scaffolding would be
waste, and two scripts that both mint agent codes is a hazard.

Three changes are required:

**1. Lift the business-partner refusal.** `classifyOrphan()` currently returns:

```ts
if (user.metadata?.registrationMethod === 'self_registration_business') {
  return { action: 'skip', reason: 'business partner - code assigned at approval' };
}
```

That guard encodes the very rule this design removes. It goes, along with the
comment block above it.

**2. Treat a verified-but-not-active partner as activatable.** The final line
currently reads `activate: user.status === 'active'`. A partner in
`awaiting_partner_approval` has verified their email — that is precisely how
they reached the status — but is not `active`, so they would be created
deactivated and never issued a working code. `validateReferralCode()` rejects
codes belonging to inactive agents.

Widen the signature to accept `emailVerifiedAt` and activate on verification
rather than on status:

```ts
return { action: 'fix', activate: user.status === 'active' || !!user.emailVerifiedAt };
```

This is more accurate than the status check it replaces and leaves the
individual-partner behaviour unchanged.

**3. Set the user status, not just the agent profile.** The script currently
repairs agent profiles only. An `awaiting_partner_approval` user additionally
needs `status = ACTIVE`, or they will hold a live code they cannot log in to
use. Add that write inside the same transaction as the profile creation.

`awaiting_partner_approval` is not `'active'`, so the existing
`includePending` filter already excludes these users from a default run. They
are reached with `--include-pending`, which is the correct level of
deliberateness for a production write. No new flag.

Email sending stays outside the transaction, matching the existing convention
in `register()` — no email may announce an account that was rolled back.

**Ordering: the backfill runs after deploy**, so the raised `PTA9999` pool
(commit `8fdd41e`) and the current activation logic are live when it executes.

Users in `rejected` stay rejected. That was a deliberate business decision and
this change does not reverse it; `resubmit-business-partner` remains available
to them.

---

## 9. Testing

Extending the existing suites — `agents.service.pending-agent.spec.ts`,
`agents.service.verification-activation.spec.ts`, `users.service.register.spec.ts`:

**Registration**
- A business registration creates user and agent in one transaction, with a
  `PTA####` code.
- A failure during agent creation rolls back the user — no orphan, matching the
  `8f022f9` regression.
- A business registration omitting `customerInteractionType` is accepted.

**Verification**
- Verifying a business partner sets `ACTIVE`, activates the agent, and sends the
  **business** welcome template with the code.
- Verifying an individual partner is unchanged.
- No path writes `AWAITING_PARTNER_APPROVAL`.

**Agent code change**
- Valid code updates and records history.
- Duplicate returns `400`.
- Malformed codes (too short, leading `_`, illegal characters) return `400`.

**Backfill** — extending `backfill-missing-agent-profiles.spec.ts`, which
already tests `classifyOrphan()` directly:
- A business partner is now classified `fix`, not `skip`. The existing
  assertion for the old refusal must be inverted, not deleted.
- An `awaiting_partner_approval` user with `emailVerifiedAt` set classifies as
  `{ action: 'fix', activate: true }`.
- An unverified `pending` user still classifies as `activate: false`.
- Without `--include-pending`, an awaiting user is skipped.
- Individual-partner classification is unchanged across all existing cases.
- Re-running touches nothing (idempotent).

**Manual**
- End-to-end business signup on staging: no interstitial, no interaction type,
  no meeting, code arrives in the welcome email, login works.
- Render the welcome and acknowledgement emails and confirm both banners load
  in Gmail and Outlook.

---

## 10. Risks

**Rejection becomes impossible.** Once the reject endpoint is gone, anyone who
verifies an email address receives a live partner code and portal access. There
is no gate. This is the explicit intent of the briefing and the correct tradeoff
for volume onboarding, but it is a one-way door and was flagged for
confirmation with the UK partner.

**Stale copy is load-bearing.** `business-partner-registration-acknowledgement.hbs`
currently promises "your account stays pending review until we approve it" and
"we will assign a custom partner code aligned with your business". Both become
false on deploy. Rewriting them is not cosmetic — it is part of the change.
Likewise `business-partner-welcome.hbs`, which is written as an approval
notification.

**Code pool consumption rises.** Business partners now draw from the same
`PTA0001`–`PTA9999` pool as individuals, starting at registration rather than
approval. The pool was raised in `8fdd41e` and is ample, but consumption is now
driven by signups rather than approvals, so unverified registrations also hold
codes.

**Referral links break on code customisation.** Covered in §5.4. The mitigation
is that customisation is administrator-driven and `codeHistory` is recorded.

---

## 11. Sequencing

1. Backend flow unification and approval machinery removal (§5.1–5.3)
2. Agent code change endpoint (§5.4)
3. Email template copy rewrites and banner wiring (§7)
4. Frontend form, interstitial, locales, admin page (§6)
5. Backfill script changes (§8)
6. Deploy, then dry-run the backfill, canary a single `--only=<email>`, then
   run `--include-pending --apply`
7. Remove the `requiresPartnerApproval` login branch once the queue is clear

Steps 1–5 are one pull request. Steps 6–7 are the deployment procedure.

---

## 12. Documentation

`docs/BUSINESS_PARTNER_REGISTRATION.md` describes the approval workflow in
detail across all 477 lines and becomes almost entirely wrong. Rewrite it around
the unified flow.

`docs/AGENT_CODE_ASSIGNMENT.md` is already stale — it documents the
`PTA0001`–`PTA0205` range that commit `8fdd41e` raised to `PTA9999`. Correct it
while in the area and add the new code-change endpoint.

---

## 13. Implementation notes (2026-09-21)

Built as specified, with these deviations and additions found during the work:

**`createPartnerWithAssignedCode()` was repurposed, not deleted.** It existed
only to serve `approveBusinessPartner()` and became dead code. Its validation is
exactly what the new endpoint needed, so it was rewritten in place as
`changeAgentCode(agentId, newCode)` rather than deleted and reinvented.

**`sendAgentWelcomeEmail()` also needed the template branch.** The spec only
named `verifyEmailOTP()`, but the backfill script sends its welcome email
through `AgentsService.sendAgentWelcomeEmail()`, which was hardcoded to the
individual template. Backfilled business partners would have received the wrong
email. Both call sites now branch on `metadata.partnerType`.

**The admin users list did not return agent codes.** `getAllUsersAdmin()`
selects user columns only, so the rebuilt admin page would have shown an empty
code column and a permanently unusable custom-code form. Added a `leftJoin` on
`user.agents` selecting `id`, `agentCode` and `status`. `getCount()` uses
`COUNT(DISTINCT user.id)` and `getMany()` with `take` uses TypeORM's distinct-id
strategy, so pagination is unaffected.

**The admin users endpoint returns `{ users: [...] }`, not `{ data: [...] }`.**
Caught by comparing against `admin/users/page.tsx`, which already unwraps it
that way.

**The seeder's code pool was still capped at `PTA0205`.** Commit `8fdd41e`
raised `agents.service.ts` to `PTA9999` but missed
`database/seeders/planettalk.seeder.ts`. Raised to match. Out of scope
strictly, but it is the same pool business partners now draw from.

**The frontend's `BUSINESS_PARTNER_REGISTRATION.md` was a byte-identical copy**
of the backend document and had gone stale. Replaced with a pointer plus
frontend-specific notes, rather than a second copy to keep in sync.

**Locale files were reflowed.** Rewriting the JSON normalised inconsistent
indentation and stripped trailing whitespace beyond the 12 removed keys per
locale. Key parity across all four locales was verified programmatically:
0 missing, 0 extra under `auth.register`.

### Verification

| Check | Result |
|---|---|
| `tsc --noEmit` (backend) | clean |
| `nest build` | clean |
| `jest` | 69 passed, 6 suites |
| `tsc --noEmit` (frontend) | clean |
| `next build` | succeeded |
| `next lint` on changed files | warnings only (pre-existing `any` patterns) |

Not yet done: the backfill has **not** been run — it is a post-deploy step
(§11). No staging end-to-end run, and the banners have not been checked in a
real Gmail or Outlook client.
