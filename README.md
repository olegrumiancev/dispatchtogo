# DispatchToGo

A Next.js 15 field service dispatch management platform with AI-powered triage, SMS notifications, and proof-of-service packets.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v5
- **AI Triage**: Ollama (llama3.2:3b) with graceful fallback
- **SMS**: Twilio
- **Styling**: Tailwind CSS
- **Containerization**: Docker + Docker Compose

## Features

### Phase 1: Core Foundation
- Multi-role authentication (Admin, Operator, Vendor)
- Service request creation and management
- Vendor management
- Dashboard views per role

### Phase 2: Dispatch & Job Workflow
- Admin dispatch queue with drag-and-drop assignment
- Vendor job acceptance/rejection workflow
- Photo upload for proof of service
- Job status tracking (PENDING → ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED)

### Phase 3: AI & Notifications
- AI-powered request triage (priority classification via Ollama)
- SMS notifications via Twilio at key workflow stages
- Notification log with admin override
- Proof-of-service packet generation (PDF-ready data)
- Invoice generation

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL
- Ollama (optional, for AI triage)
- Twilio account (optional, for SMS)

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database URL and secrets

# Run database migrations safely against the local Prisma dev database
npm run prisma:migrate:dev:local -- --name init

# Seed the database with demo data
npx prisma db seed

# Start development server
npm run dev
```

### Docker Setup

```bash
docker-compose up -d
```

This starts PostgreSQL and the Next.js app.

## Prisma Workflow

Use different Prisma commands for different database targets:

```bash
# Safe schema development against the local disposable Prisma database
npm run prisma:migrate:dev:local -- --name your_migration_name

# Open Prisma Studio against the local Prisma database
npm run prisma:studio:local

# Apply checked-in migrations to the configured remote/shared database
npx prisma migrate deploy
```

Rules:

- Use `prisma migrate dev` only through `npm run prisma:migrate:dev:local`.
- Do not run `prisma migrate dev` directly against the remote/shared database.
- Use `prisma migrate deploy` for the remote/shared database.
- The local Prisma dev database runs on `localhost:5435` and the shadow database runs on `localhost:5434`.

## Project Structure

```
src/
  app/
    (auth)/          # Login, register pages
    (dashboard)/     # Protected dashboard routes
      admin/         # Admin: dispatch queue, vendors, notifications
      operator/      # Operator: requests, proof packets
      vendor/        # Vendor: job list, job details
    api/             # API routes
  components/
    forms/           # Form components
    layout/          # Header, sidebar, session provider
    ui/              # Reusable UI components
  lib/               # Business logic (AI triage, SMS, auth, etc.)
  types/             # TypeScript type extensions
prisma/
  schema.prisma      # Database schema
  seed.ts            # Demo data seeder
```

## Demo Accounts (after seeding)

See `prisma/seed.ts` for the seeded demo account credentials.

## Environment Variables

See `.env.example` for all required variables.

## License

MIT
