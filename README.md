# DispatchToGo

**B2B Dispatch Platform for Tourism Operators**

DispatchToGo connects tourism operators (hotels, campgrounds, marinas) with service vendors for seamless maintenance and service delivery. Operators submit service requests, admins triage and dispatch to qualified vendors, and vendors manage job workflows end-to-end.

---

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Framework    | Next.js 14+ (App Router)          |
| Language     | TypeScript                        |
| Database     | PostgreSQL 16                     |
| ORM          | Prisma                            |
| Auth         | NextAuth.js (JWT + Credentials)   |
| Styling      | Tailwind CSS                      |
| AI Ready     | Ollama (local LLM for classification) |
| Dev Infra    | Docker Compose                    |

---

## Prerequisites

- Node.js 18+
- Docker Desktop (for Postgres + Ollama)
- npm or yarn

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourorg/dispatchtogo.git
cd dispatchtogo

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env if needed (defaults work for local dev)

# 4. Start infrastructure
docker compose up -d

# 5. Generate Prisma client
npm run db:generate

# 6. Push schema to database
npm run db:push

# 7. Seed demo data
npm run db:seed

# 8. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Accounts

All accounts use password: **`demo123`**

| Email                  | Role     | Organization                   |
|------------------------|----------|--------------------------------|
| `admin@demo.com`       | Admin    | —                              |
| `operator1@demo.com`   | Operator | Best Western Plus Cornwall     |
| `operator2@demo.com`   | Operator | Farran Park Campground         |
| `operator3@demo.com`   | Operator | Cornwall Marina                |
| `vendor1@demo.com`     | Vendor   | SDG Plumbing & Heating         |
| `vendor2@demo.com`     | Vendor   | Cornwall Electric Services     |
| `vendor3@demo.com`     | Vendor   | Seaway Snow & Grounds          |

---

## Project Structure

```
dispatchtogo/
├── prisma/
│   ├── schema.prisma          # 16 models: User, Org, Property, Request, Job, etc.
│   └── seed.ts                # Cornwall/SDG themed demo data
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with SessionProvider
│   │   ├── page.tsx            # Login page with demo account shortcuts
│   │   ├── providers.tsx       # NextAuth SessionProvider wrapper
│   │   ├── globals.css         # Global styles + Tailwind
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth handler
│   │   │   ├── requests/           # GET/POST + GET/PATCH by ID
│   │   │   ├── jobs/               # GET/POST + GET/PATCH + PATCH status
│   │   │   ├── vendors/            # GET/POST vendors
│   │   │   ├── invoices/           # GET/POST invoices
│   │   │   ├── categories/         # GET service categories
│   │   │   ├── properties/         # GET properties (scoped by org)
│   │   │   └── upload/             # POST file upload
│   │   ├── operator/          # Operator portal (role-protected)
│   │   │   ├── page.tsx        # Dashboard with KPIs + recent activity
│   │   │   ├── requests/       # List, new, and detail pages
│   │   │   ├── properties/     # Property management
│   │   │   └── invoices/       # Invoice list with status filters
│   │   ├── vendor/            # Vendor portal (role-protected)
│   │   │   ├── page.tsx        # Job offers + active jobs dashboard
│   │   │   └── jobs/[id]/      # Full job workflow (accept→complete)
│   │   └── admin/             # Admin portal (role-protected)
│   │       ├── page.tsx        # Dispatch board
│   │       ├── DispatchBoard.tsx  # Client dispatch component
│   │       └── vendors/        # Vendor directory
│   ├── components/
│   │   ├── ui/                # Button, Input, Select, Textarea, Card, Table
│   │   ├── Navbar.tsx         # Top navbar with notifications
│   │   ├── Sidebar.tsx        # Role-aware collapsible sidebar
│   │   └── StatusBadge.tsx    # Color-coded status badges
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── auth.ts            # NextAuth options (credentials provider)
│   │   ├── utils.ts           # Formatting, color helpers
│   │   └── next-auth.d.ts     # Session type extensions
│   └── middleware.ts          # Role-based route protection
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── .env.example
```

---

## API Routes

| Method | Endpoint | Description |
|--------|----------|--------------|
| POST | `/api/auth/[...nextauth]` | NextAuth sign in/out |
| GET | `/api/categories` | List all service categories |
| GET | `/api/properties` | List properties (scoped by org) |
| GET/POST | `/api/requests` | List/create service requests |
| GET/PATCH | `/api/requests/[id]` | Get/update a request |
| GET/POST | `/api/jobs` | List/dispatch jobs |
| GET/PATCH | `/api/jobs/[id]` | Get/update job (add notes/materials) |
| PATCH | `/api/jobs/[id]/status` | Advance/decline job status |
| GET/POST | `/api/vendors` | List/create vendors |
| GET/POST | `/api/invoices` | List/generate invoices |
| POST | `/api/upload` | Upload photos/files |

---

## Service Request Flow

```
[Operator] Submit Request
        ↓
[Admin]  Triage → Dispatch to Vendor
        ↓
[Vendor] Job Offered → Accept
        ↓
        En Route → On Site → Complete
        ↓
[Admin/Vendor] Generate Invoice
        ↓
[Operator] View Invoice → Pays
```

---

## Role-Based Access

| Route | Operator | Vendor | Admin |
|-------|----------|--------|-------|
| `/operator/*` | ✅ | ❌ | ✅ |
| `/vendor/*` | ❌ | ✅ | ✅ |
| `/admin/*` | ❌ | ❌ | ✅ |

---

## Development Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:push      # Push schema changes to database
npm run db:migrate   # Create and run a migration
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio (database GUI)
```

---

## Roadmap

### Phase 2 — AI Integration
- Ollama-powered automatic service request classification
- Suggested vendor matching based on skills + availability
- AI-generated job summaries for operators

### Phase 3 — Real-time Features
- WebSocket live job status updates
- Push notifications (email + SMS via Twilio)
- In-app chat between operators and vendors

### Phase 4 — Scheduling & Availability
- Vendor calendar and availability windows
- Automatic scheduling suggestions
- Recurring maintenance job templates

### Phase 5 — Reporting & Analytics
- Operator spend analytics and dashboards
- Vendor performance metrics
- SLA tracking and compliance reporting

### Phase 6 — Mobile
- React Native vendor app for field technicians
- Offline-capable job management
- Native camera integration for before/during/after photos
