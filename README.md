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

# Run database migrations
npx prisma migrate dev

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

| Role     | Email                    | Password  |
|----------|--------------------------|-----------|
| Admin    | admin@dispatchtogo.com   | password  |
| Operator | operator@dispatchtogo.com| password  |
| Vendor   | vendor@dispatchtogo.com  | password  |

## Environment Variables

See `.env.example` for all required variables.

## License

MIT
