# DispatchToGo — Copilot Instructions

## Architecture Overview

**DispatchToGo** is a Next.js 15 (App Router) field-service dispatch SaaS with three user roles: **Admin**, **Operator**, and **Vendor**.

### Route Groups
- `src/app/(auth)/` — public login/register (maps to `/app/login`, `/app/register`)
- `src/app/(dashboard)/admin/` — admin-only pages (dispatch queue, vendor management, billing)
- `src/app/(marketing)/` — public marketing/pricing pages
- `src/app/api/` — all API routes (server-side only; blocked on non-app subdomains in production)
- All protected app routes are prefixed `/app/` in the URL

### Subdomain Routing (middleware.ts)
The middleware splits traffic between `app.dispatchtogo.com` (the SaaS app) and `www` (marketing). API routes return 404 on the www host in production. Set `APP_HOST` and `APP_BASE_URL` env vars for local overrides.

### Data Model Key Relationships
- `User` → `Organization` (OPERATOR orgs) or `Vendor`
- `ServiceRequest` → `Job` (one active job per request; job holds vendor assignment)
- `Job` status lifecycle: `OFFERED → ACCEPTED → IN_PROGRESS → PAUSED → COMPLETED`
- `ServiceRequest` status lifecycle: `SUBMITTED → TRIAGING → READY_TO_DISPATCH → DISPATCHED → ACCEPTED → IN_PROGRESS → COMPLETED → VERIFIED`
- **All enum-like columns are stored as `String` in Prisma** (not native PG enums) — the schema comment at the top of `prisma/schema.prisma` explains this.

## Developer Workflows

```bash
npm run dev              # Start Next.js dev server
npx prisma migrate dev   # Apply schema changes + regenerate client
npx prisma db seed       # Seed demo accounts (admin/operator/vendor@dispatchtogo.com / password)
npx prisma studio        # Browse DB in browser
npm run build            # Production build
docker-compose up -d     # Start Postgres + app via Docker
```

Auth is guarded by `next-auth` middleware in `src/middleware.ts`. Cron routes require `Authorization: Bearer $CRON_SECRET` (validated by `src/lib/cron-guard.ts`).

## Project-Specific Conventions

### Enums as Constants
All status/category values are defined in `src/lib/constants.ts` as typed `as const` arrays (`SERVICE_CATEGORIES`, `REQUEST_STATUSES`, `JOB_STATUSES`, etc.). Always import from there rather than using raw strings.

### AI Triage — Double-Path Pattern
- **Primary path**: `/api/triage/classify` pre-classifies before form submission; result stored via `storePreClassification()` in `src/lib/ai-triage.ts`
- **Fallback path**: called post-submission when AI was offline; uses `triageServiceRequest()` in the same file
- AI client (`src/lib/ai-client.ts`) is a generic OpenAI-compatible client — supports the bundled `copilot-server/copilot-openai-server` (Go proxy), Perplexity, or OpenAI directly. Configure via `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`. Cloudflare Access headers added automatically if `CF_ACCESS_CLIENT_ID` is set.

### SMS Notifications
Uses **TextBee** (not Twilio despite the README). All sends go through `sendSMS()` in `src/lib/sms.ts`. A DB-controlled redirect failsafe in `SystemSettings` (`smsRedirectEnabled`, `smsRedirectNumber`) reroutes all SMS to a test number when enabled — check `src/lib/settings.ts`.

### Notification Toggles
`src/lib/notification-config.ts` is the single gate for SMS/email feature flags. SMS requires `TEXTBEE_API_KEY` + `TEXTBEE_DEVICE_ID`; email requires `SMTP_HOST` + `SMTP_USER` + `SMTP_PASS`.

### Auto-Dispatch Cascade (`src/lib/auto-dispatch.ts`)
When a request is submitted, vendor selection follows this priority:
1. Operator explicitly chose a vendor in the form
2. Property-level `PreferredVendor` record matching category
3. Org-level `PreferredVendor` (no property) matching category
4. Any `AVAILABLE` vendor with matching `VendorSkill` (load-balanced by fewest active jobs)
5. Falls back to `READY_TO_DISPATCH` for manual admin assignment

### Billing Plans (`src/lib/billing.ts` + `src/lib/constants.ts`)
Plans are defined in `BILLING_PLANS` in constants. `PlatformBill` tracks monthly usage per org. Stripe is used for invoicing platform bills (not operator-to-vendor invoicing, which is a separate `Invoice` model).

### Settings Singleton
`SystemSettings` is a single DB row with `id: "singleton"`. Always access via `getSettings()` in `src/lib/settings.ts` — it auto-upserts defaults on first call.

### Cron Jobs
Platform: Dokploy HTTP cron (not Vercel crons). All job logic lives in `job.ts` files co-located with each cron route (e.g., `src/app/api/cron/digest/job.ts`). To run in-process instead, set `CRON_MODE=inprocess` — see `src/lib/scheduler.ts` for full instructions.

### Role Enforcement — Three Layers

Roles are `ADMIN`, `OPERATOR`, and `VENDOR` (stored as strings on `User.role`, embedded in the JWT via the `jwt` callback in `src/lib/auth.ts`).

**Layer 1 — Middleware** (`src/middleware.ts`): `withAuth` runs for `/app/operator/*`, `/app/vendor/*`, `/app/admin/*`. Enforces *authentication only* — unauthenticated users redirect to `/app/login`. Does **not** enforce cross-role access.

**Layer 2 — Page Server Components**: Each page calls `auth()` from `@/lib/auth`, casts the session user, and calls `redirect()` if the role is wrong:
```ts
const session = await auth();
const user = session!.user as any;
if (user.role !== "OPERATOR") redirect("/");
```

**Layer 3 — API Routes**: Each handler calls `auth()`, returns 401 (no session) or 403 (wrong role):
```ts
const session = await auth();
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

Data scoping is enforced at the query level: Operator routes filter by `organizationId`, Vendor routes filter by `vendorId` from the session token.

## Key Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Full data model — all String enums documented at top |
| `src/middleware.ts` | Subdomain routing + auth guard for all `/app/*` routes |
| `src/lib/auth.ts` | NextAuth config — credentials, JWT, Turnstile CAPTCHA, approval flow |
| `src/lib/constants.ts` | All status/category/urgency enums and badge colors |
| `src/lib/auto-dispatch.ts` | Core dispatch logic with 5-step cascade |
| `src/lib/ai-client.ts` | OpenAI-compatible AI client; `isAiConfigured()` gates all AI calls |
| `src/lib/notification-config.ts` | Feature flags for SMS/email notifications |
| `src/lib/settings.ts` | Singleton system settings with safe upsert |
