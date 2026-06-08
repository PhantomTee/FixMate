# FixMate — AI-Powered Home Repair with Simulated OPay Escrow

> **OPay × Google Gemini Hackathon Submission**
> Connecting Nigerian households to verified local artisans through Gemini-backed AI diagnosis and trust-safe OPay escrow payments.

---

## The Problem

Nigeria has millions of skilled tradespeople — plumbers, electricians, AC technicians, generator mechanics — but homeowners have no safe way to find them, agree on a fair price, or guarantee the work will be done before money changes hands. The result: overcharging, ghost workers, and lost trust.

## The Solution

FixMate combines three technologies to fix this:

| Layer | Technology | Role |
|---|---|---|
| AI Triage | Google Gemini 2.5 Flash | Diagnoses issues, estimates costs, briefs artisans |
| Payments | OPay Escrow (simulated) | Holds funds until job completion — no risk for either party |
| Trust | Calculated trust score | 6-factor algorithm replaces manual ratings |

---

## Key Features

### 1. Gemini AI Diagnosis
- Describe an issue in text or upload a photo
- Gemini returns: issue title, summary, urgency, cost estimate (min/max), safety warning, first-aid steps, follow-up questions for the artisan, and a structured artisan brief
- Supports 5 languages: **English, Pidgin, Yoruba, Hausa, Igbo**
- Falls back to smart mock responses when `GEMINI_API_KEY` is missing

### 2. OPay Escrow Simulation
- Full escrow state machine: `not_funded → funded → accepted → in_progress → completed → released`
- Critical guards enforced in code:
  - Artisan **cannot accept** until customer funds escrow
  - Customer **cannot release** until artisan marks job completed
  - Admin can force-refund or force-release in disputes
- Fee structure: customer 2% platform fee, artisan 10% fee on release
- Transparent OPay reference number on every booking
- `/opay-simulator` page shows the full payment ledger and lets judges trigger webhooks

### 3. Calculated Trust Score
Six-factor weighted formula (not manual star ratings):
```
Completed jobs (30%) + Verified ID (20%) + Review rating (20%)
+ Low dispute rate (15%) + Response speed (10%) + Profile completeness (5%)
```
Tiers: Elite (90+) · Trusted (75+) · Good (60+) · New (0+)

### 4. Demo Role System
Switch between **Customer**, **Artisan**, and **Admin** with one click via the amber demo banner — no login required. Each role shows the correct dashboard and restricts inappropriate actions.

### 5. USSD & WhatsApp Demos
- `/ussd-demo` — phone-frame simulation for low-data users who can't access the web app
- `/whatsapp-demo` — WhatsApp-style bot interface powered by the same Gemini actions

---

## Demo Flow for Judges

> Start at the homepage and follow the numbered cards in the **"Run the Full Demo Flow"** section.

**Step 1 — Report Issue** (`/report`)
1. Click "Report Issue" or use the Judge Demo CTA on the homepage
2. Type a description (e.g. "My generator is smoking and smells like fuel")
3. Optionally upload a photo
4. Choose a language (Pidgin, Yoruba, etc.)
5. Click "Analyze Issue" — Gemini diagnoses the problem
6. See cost estimate, safety warning, recommended artisans with match reasons
7. Expand "AI Artisan Brief" on any artisan card

**Step 2 — Book & Fund Escrow** (`/booking`)
1. Click "Select & Book" on an artisan
2. Review the cost breakdown (quote + 2% user fee)
3. Click "Fund Escrow with OPay →" — funds move from wallet to escrow
4. Visit `/opay-simulator` to see the payment record and simulate webhooks

**Step 3 — Artisan Hub** (`/artisan/dashboard`)
1. Switch role to **Artisan** using the amber demo banner
2. See the incoming job — "Accept" button only activates once escrow is funded
3. Accept the job, mark In Progress, then mark Completed
4. Trust score breakdown is shown with all 6 factors

**Step 4 — Release Funds** (`/booking` or `/dashboard`)
1. Switch back to **Customer** role
2. "Release Funds" button is now active (only after artisan marks completed)
3. Release sends payment to artisan minus the 10% artisan fee
4. Try "Open Dispute" to route the job to admin

**Step 5 — Admin Console** (`/admin`)
1. Switch to **Admin** role
2. See platform metrics: total escrow locked, fees collected, open disputes
3. View calculated trust scores for all artisans with tier badges
4. Click "AI Summary" on a dispute to get Gemini's recommended action
5. Use escrow controls to force-refund or force-release any booking

---

## Architecture

```
app/
  page.tsx              — Homepage with judge CTA
  report/page.tsx       — AI diagnosis + artisan matching
  booking/page.tsx      — Escrow funding and status
  dashboard/page.tsx    — Customer wallet and job history
  artisan/
    register/           — Artisan onboarding
    dashboard/          — Artisan jobs, trust score, inventory
  admin/page.tsx        — Admin escrow controls and trust scores
  opay-simulator/       — OPay payment ledger for judges
  ussd-demo/            — USSD simulation
  whatsapp-demo/        — WhatsApp bot demo
  api/opay/webhook/     — Simulated OPay webhook endpoint
  actions.ts            — All Gemini server actions

lib/
  types.ts              — All TypeScript types
  demo-db.ts            — localStorage database with escrow state machine
  demo-auth.ts          — Demo role management
  opay-simulator.ts     — OPay payment simulation
  trust-score.ts        — Calculated trust score algorithm
  store.ts              — Zustand global state

components/
  DemoModeBanner.tsx    — Role switcher (amber banner)
  Navbar.tsx            — Navigation with role indicator
  LocationAutocomplete  — Google Places integration
  JobChat.tsx           — In-job messaging
```

---

## Why OPay

OPay is the escrow backbone of FixMate. The simulator is a **transparent mock** of real OPay APIs:

| Simulator function | Real OPay equivalent |
|---|---|
| `createPaymentIntent()` | OPay Checkout API — initiate payment |
| `verifyPayment()` | OPay Query API — check payment status |
| `simulateWebhook()` | Real OPay HMAC-signed webhook |
| `releaseEscrowPayment()` | OPay Split/Transfer API |
| `refundEscrowPayment()` | OPay Refund API |

To connect real OPay APIs: replace the functions in `lib/opay-simulator.ts` with actual HTTP calls and wire the `app/api/opay/webhook/route.ts` endpoint to your OPay webhook URL. Every other part of the app stays the same.

---

## Why Gemini

Gemini powers every intelligent action in FixMate:

- **Issue diagnosis** — structured JSON response with urgency, cost, safety notes
- **Artisan brief** — tells the artisan exactly what to bring and what to expect
- **Quote fairness** — compares artisan quote to Gemini estimate, flags overpricing
- **Dispute summary** — analyses the dispute context and recommends resolution

All Gemini calls are in `app/actions.ts` as Next.js server actions. Every function has a mock fallback, so the app runs in full demo mode with zero API keys.

---

## Setup

### Quick start (demo mode — no API keys needed)

```bash
git clone https://github.com/phantomtee/fixmate.git
cd fixmate
npm install
npm run dev
# Open http://localhost:3000
```

The app runs completely in demo mode with realistic mock data.

### With Gemini AI

```bash
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY
npm run dev
```

Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com/).

### Environment variables

See `.env.example` for all variables. Only `GEMINI_API_KEY` is needed for live AI features — everything else is optional.

---

## Routes

| Path | Description | Role |
|---|---|---|
| `/` | Homepage with judge CTA | All |
| `/report` | Create job + AI diagnosis | Customer |
| `/booking` | Fund escrow, track status | Customer |
| `/dashboard` | Wallet, job history | Customer |
| `/artisan/register` | Artisan onboarding | Public |
| `/artisan/dashboard` | Jobs, trust score, inventory | Artisan |
| `/admin` | Platform controls | Admin |
| `/opay-simulator` | OPay ledger + webhook test | Judge |
| `/ussd-demo` | USSD phone demo | Judge |
| `/whatsapp-demo` | WhatsApp bot demo | Judge |
| `/api/opay/webhook` | Simulated webhook endpoint | System |

---

## Tech Stack

- **Next.js 15** (App Router, server actions)
- **React 19** with TypeScript strict mode
- **Gemini 2.5 Flash** via `@google/genai`
- **Tailwind CSS 4** with custom animations
- **Zustand** for global state
- **localStorage** demo database (no real Firebase required)
- **React Leaflet** for maps

---

## Roadmap to Production

- [ ] Replace `lib/opay-simulator.ts` with real OPay Checkout + Webhook APIs
- [ ] Add Firebase Auth for real user accounts
- [ ] Connect Firestore as the production database
- [ ] Add Firebase Storage for artisan ID verification uploads
- [ ] Integrate Google Maps Distance Matrix for actual proximity matching
- [ ] Send real WhatsApp notifications via Twilio or Meta Cloud API
- [ ] Add USSD gateway via Africa's Talking

---

## Team

Built for the **OPay × Google Gemini Developer Scholarship Hackathon**.

> This demo uses a simulated OPay payment environment. No real money is transferred. The simulator is designed to be a direct drop-in replacement for real OPay API calls.
