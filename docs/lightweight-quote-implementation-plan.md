# Lightweight Quote Implementation Plan

## Purpose

Add an optional lightweight quote workflow to service requests without duplicating request/job evidence and without mixing quote amounts with final completed-work costs.

This document is intended to survive session boundaries. Future implementation work should update this file as milestones are completed or design decisions change.

## Core Decisions

1. Quotes belong to `ServiceRequest`, not `Job`.
Reason: the current re-dispatch flow can reuse a declined job and replace its `vendorId`, so quote history would become ambiguous if it lived only on `Job`.

2. Photos are stored once and referenced by quotes.
Reason: request intake photos already live on `ServiceRequest.photos`, and work photos already live on `Job.photos`. Quotes should link to those records rather than duplicate uploads.

3. Quote amount is not the same as final job cost.
Reason: `Job.totalCost` is already used as actual finished-work cost and appears in proof packets. The quote workflow must not overwrite that meaning.

4. Quote workflow is optional and parallel to the SR lifecycle.
Reason: some vendors can quote immediately, some need an assessment visit, and some jobs do not need a quote at all.

## Existing System Constraints

- `ServiceRequest` has one current `Job` relation in the Prisma schema.
- Intake photos are stored as `Photo`.
- Work photos are stored as `JobPhoto`.
- Vendor proof and actual cost fields currently live on `Job`.
- Re-dispatch can reuse a previously declined job record and swap the vendor assignment.

## Target UX

### Vendor

After reviewing a dispatched SR, vendor chooses one disposition:

- `QUOTE_NOW`
- `ASSESS_FIRST`
- `NO_QUOTE`
- `NEED_INFO`

If vendor chooses `QUOTE_NOW`, they submit a lightweight quote immediately.

If vendor chooses `ASSESS_FIRST`, they proceed with the normal visit flow, upload work photos once, then create a quote from the existing evidence after site review. If approval is needed before repair, the job can use the current pause mechanism while waiting.

If vendor chooses `NO_QUOTE`, they continue with the job normally.

If vendor chooses `NEED_INFO`, they use the existing request communication path.

### Operator

Operator sees a commercial summary on the SR:

- quote policy
- vendor disposition
- latest quote status
- amount
- validity
- supporting evidence links
- actions such as approve, request revision, or mark quote not needed

## Proposed Data Model

### New fields

`ServiceRequest`
- `quotePolicy String @default("VENDOR_DECIDES")`

`Job`
- `quoteDisposition String?`
- `quoteDispositionAt DateTime?`
- `quoteDispositionNote String?`

### New models

`Quote`
- `id`
- `serviceRequestId`
- `vendorId`
- `createdByUserId`
- `status`
- `source`
- `supersedesQuoteId`
- `amount`
- `currency`
- `scopeSummary`
- `assumptions`
- `exclusions`
- `validUntil`
- `submittedAt`
- `decidedAt`
- `decidedByUserId`
- `decisionNote`
- `requestTitleSnapshot`
- `propertyNameSnapshot`
- `propertyAddressSnapshot`
- `vendorNameSnapshot`
- `createdAt`
- `updatedAt`

`QuoteRequestPhoto`
- `quoteId`
- `photoId`
- `sortOrder`

`QuoteJobPhoto`
- `quoteId`
- `photoId`
- `sortOrder`

### Suggested status values

Quote statuses:
- `DRAFT`
- `SUBMITTED`
- `APPROVED`
- `REJECTED`
- `SUPERSEDED`
- `WITHDRAWN`

Quote sources:
- `REMOTE`
- `ASSESSMENT`
- `CHANGE_ORDER`

Quote policy values:
- `VENDOR_DECIDES`
- `REQUEST_BEFORE_WORK`
- `NOT_REQUIRED`

Quote disposition values:
- `QUOTE_NOW`
- `ASSESS_FIRST`
- `NO_QUOTE`
- `NEED_INFO`

## API Surface

### New endpoints

- `GET /api/requests/[id]/quotes`
- `POST /api/requests/[id]/quotes`
- `PATCH /api/quotes/[quoteId]`

### Likely responsibilities

`GET /api/requests/[id]/quotes`
- list quotes for the SR
- include linked request photos and job photos
- enforce operator/admin/vendor authorization

`POST /api/requests/[id]/quotes`
- create draft or submitted quote
- persist snapshot fields
- attach selected existing photo IDs
- validate that photo IDs belong to the same SR or current job

`PATCH /api/quotes/[quoteId]`
- submit draft
- approve
- reject
- supersede with revision
- withdraw if still editable

### Existing endpoint changes

`PATCH /api/jobs/[id]`
- allow vendor to set `quoteDisposition`, `quoteDispositionAt`, `quoteDispositionNote`
- do not mix quote fields with completion proof fields

`GET /api/jobs/[id]`
- include latest quote summary for vendor context if useful

## UI Surface

### Vendor job detail

Add a `Commercial` section near the top of the vendor job detail page that shows:

- quote policy from SR
- current vendor disposition
- latest quote status
- primary actions

Primary actions:

- `Submit Quote`
- `Need Site Visit First`
- `No Quote Needed`
- `Need More Info`

Quote form fields:

- amount
- scope summary
- assumptions
- exclusions
- valid until
- evidence picker from existing SR and job photos

Behavior:

- photo picker should default to linking existing photos, not uploading duplicates
- new photos added during quote creation should still be saved into the existing SR/job photo store, then linked to the quote

### Operator request detail

Add a `Commercial` card above the work proof area showing:

- quote requirement/policy
- vendor disposition
- latest submitted quote
- revision history summary
- approval actions

### Request lists

Add compact chips for:

- `Quote pending`
- `Assessment first`
- `Quote approved`
- `No quote needed`

## Execution Plan

### Phase 0: freeze the design

Deliverables:
- this plan document
- final decision on service-request ownership of quotes
- final status vocabulary

Session size:
- 1 short session

### Phase 1: schema and migration

Status:
- Completed on March 12, 2026.

Deliverables:
- Prisma schema changes
- migration files
- seed updates if needed

Acceptance:
- app boots
- Prisma client generates
- existing request/job flows still load

Completed work:
- Added `ServiceRequest.quotePolicy`.
- Added `Job.quoteDisposition`, `Job.quoteDispositionAt`, and `Job.quoteDispositionNote`.
- Added `Quote`, `QuoteRequestPhoto`, and `QuoteJobPhoto` models.
- Added a SQL migration at `prisma/migrations/20260312_add_lightweight_quotes/migration.sql`.
- Updated re-dispatch reuse logic to clear vendor-specific quote disposition fields when a declined job is reassigned.

Session size:
- 1 session

### Phase 2: read models and server helpers

Status:
- Completed on March 12, 2026.

Deliverables:
- quote include/select helpers
- query helpers for latest quote and quote summary badges
- validation helpers for photo linking

Acceptance:
- operator and vendor pages can fetch quote state without UI breakage

Completed work:
- Added `src/lib/quotes.ts` with shared quote summary selects, relation args, and commercial snapshot helpers.
- Added `src/lib/quote-photo-links.ts` with request/job photo ownership validation for future quote APIs.
- Updated operator request detail queries to load quote summaries and render a read-only commercial snapshot card.
- Updated vendor job detail loading and job/request APIs to include commercial snapshot data.

Session size:
- 1 session

### Phase 3: quote APIs

Status:
- Completed on March 12, 2026.

Deliverables:
- list/create/update quote endpoints
- authorization checks
- status transition validation

Acceptance:
- vendor can create and submit a quote
- operator can approve or reject
- invalid transitions are blocked

Completed work:
- Added `GET`/`POST` request-scoped quote APIs at `src/app/api/requests/[id]/quotes/route.ts`.
- Added `GET`/`PATCH` quote-detail APIs at `src/app/api/quotes/[quoteId]/route.ts`.
- Added server-side transition rules for draft submit, approve, reject, and withdraw actions.
- Added ownership validation so linked request/job photo IDs must belong to the same SR/job context.
- Extended `PATCH /api/jobs/[id]` to persist quote disposition and note fields.

Session size:
- 1 to 2 sessions

### Phase 4: vendor commercial UX

Status:
- Completed on March 12, 2026.

Deliverables:
- new commercial card on vendor job detail
- quote disposition controls
- lightweight quote form
- evidence picker using existing request/job photos

Acceptance:
- vendor can choose disposition
- vendor can submit quote without re-uploading existing evidence
- assessment-first flow is understandable and low-friction

Completed work:
- Added `src/components/forms/vendor-commercial-card.tsx` for vendor-side commercial workflow.
- Added quote disposition controls and commercial note saving on the vendor job detail page.
- Added a lightweight quote composer modal with amount, scope summary, assumptions, exclusions, source, and validity fields.
- Added an evidence picker that links existing request photos and work photos without duplicating uploads.
- Wired vendor job detail to render the commercial card with server-provided commercial snapshot data.
- Refined the vendor UX so the page now shows a compact quote summary near current status and uses a dedicated `Quote` step inside Job Workspace for the full quote workflow.
- Verified the phase with `npm run build` and post-build `npx tsc --noEmit`.

Session size:
- 1 to 2 sessions

### Phase 5: operator commercial UX

Status:
- Completed on March 12, 2026.

Deliverables:
- commercial card on operator request detail
- quote review actions
- latest quote and history rendering

Acceptance:
- operator can approve or reject from SR detail
- operator can see which evidence supported the quote

Completed work:
- Added `src/components/forms/operator-quote-review-card.tsx` for operator-side quote review.
- Replaced the read-only operator request detail commercial summary with an interactive quote review card.
- Added request-scoped quote history loading, evidence previews, and selected-quote detail rendering.
- Added operator actions to approve a submitted quote or request a revision with an optional decision note.
- Verified the phase with `npm run build` and post-build `npx tsc --noEmit`.

Session size:
- 1 to 2 sessions

### Phase 6: list views and status chips

Status:
- Completed on March 12, 2026.

Deliverables:
- request list indicators
- optional vendor list indicators if useful

Acceptance:
- quote-required requests are visible without opening detail pages

Completed work:
- Added `getCommercialIndicator` in `src/lib/quotes.ts` to normalize compact quote status chips.
- Added operator request list quote chips for draft, pending, approved, assessment-first, need-info, no-quote, and quote-required states.
- Added vendor jobs list quote chips across available, mine, and completed cards using the same shared indicator logic.
- Verified the phase with `npm run build` and post-build `npx tsc --noEmit`.

Session size:
- 1 session

### Phase 7: notifications and audit

Deliverables:
- operator notification when quote submitted
- vendor notification when quote approved/rejected
- audit logging for submit/approve/reject/revise

Acceptance:
- quote decision events are visible and traceable

Session size:
- 1 session

### Phase 8: proof packet and reporting alignment

Deliverables:
- confirm proof packet continues to show actual final cost only
- optionally add quote reference metadata later if needed

Acceptance:
- no regression in proof packet meaning
- quote and final cost remain distinct in reporting

Session size:
- 1 session

## Recommended Build Order

Do not start with UI. Use this order:

1. Prisma schema and migration
2. server-side quote queries and transitions
3. vendor disposition and quote submit flow
4. operator review flow
5. list chips
6. notifications

## Explicit Non-Goals For V1

- full estimating engine
- tax calculation
- line-item pricing builder
- vendor comparison workflow
- quote PDF generation
- customer self-approval portal
- separate quote comments thread

## Open Questions

1. Should `ASSESS_FIRST` require an accepted job first, or be selectable before acceptance?
Recommended: after acceptance, so the vendor owns the assessment visit operationally.

2. Should operator approval block work automatically when `quotePolicy = REQUEST_BEFORE_WORK`?
Recommended: yes for repair execution, but assessment visits remain allowed.

3. Should quotes support multiple revisions in V1?
Recommended: yes, but only as full replacement versions, not editable history.

4. Should linked photos be immutable after quote submission?
Recommended: freeze the linked photo ID set on submission, but do not duplicate files.

## Session Handoff Checklist

At the end of each implementation session:

1. Update this document with completed phases.
2. Record any schema or status vocabulary changes.
3. Record any deviations from the plan.
4. Note remaining blockers in the relevant phase section.

## First Implementation Slice

Status:
- Completed on March 12, 2026.

Delivered:

1. Prisma schema changes for quotes and disposition fields
2. migration generation
3. minimal query includes so request/job pages can read quote summaries

Next practical session:

1. Quote decision notifications and audit logging
2. Proof packet and reporting alignment check
3. Any wording or placement polish for list-level quote chips
