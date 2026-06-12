# FixMate — AI-Powered Home Services with Escrow Payments

> **Connecting Nigerian households to verified local artisans through AI diagnosis, KYC identity verification, and trust-safe escrow payments.**

---

## The Problem

Nigeria has millions of skilled tradespeople — plumbers, electricians, AC technicians, generator mechanics — but homeowners have no safe way to find them, agree on a fair price, or guarantee the work will be done before money changes hands. The result: overcharging, ghost workers, and lost trust.

## The Solution

| Layer | Technology | Role |
|---|---|---|
| AI Diagnosis | Groq (Llama 4 Scout) + Gemini 2.5 Flash | Diagnoses issues from text and photos, estimates fair cost |
| Identity KYC | Gemini 2.5 Flash multimodal | NIN OCR + selfie face-match — zero-cost, no third-party API |
| Payments | Paystack + Supabase escrow | Holds funds until job completion — safe for both parties |
| Verification | Badge tiers (Newbie / Verified / iSabi Pro) | Auto-updated via DB trigger based on completed jobs and ratings |
| Notifications | WhatsApp via Termii (or Twilio fallback) | Every booking event delivered to phone |

---

## Features

### AI Issue Diagnosis
- Describe a home problem in text or upload a photo
- Groq Llama 4 Scout Vision returns: issue title, urgency, cost estimate (min/max in Naira), safety warning, first-aid steps, and a structured artisan brief
- Quote fairness check: compares artisan's quote to AI estimate and flags overpricing
- Dispute summaries: AI analyses the context and recommends resolution
- Full demo mode when `GROQ_API_KEY` is not set

### Zero-Cost KYC Engine
- Artisan uploads their NIN slip (or voter card / driver's licence) + takes a live selfie
- Gemini 2.5 Flash performs multimodal OCR to extract name and NIN number
- Gemini compares the document photo to the live selfie (face match)
- Returns structured JSON: `extracted_name`, `extracted_nin`, `face_match`, `confidence`, `verified`, `reason`
- Runs on Google AI Studio free tier — no Smile ID, no Dojah, no per-verification cost
- Falls back to a demo-mode pass-through when `GEMINI_API_KEY` is not set

### Phone-First Onboarding (8 steps)
1. Intent — hire a professional or register as an artisan
2. Name + phone number + password
3. OTP verification via SMS
4. Trade selection from a visual card grid (artisan only)
5. State + LGA + nearest landmark
6. Upload up to 3 portfolio photos (artisan only)
7. Set callout fee and daily rate (artisan only)
8. NIN card upload + live selfie KYC + application review (artisan only)

### Escrow Payment Flow
Full state machine: `not_funded → funded → accepted → in_progress → completed → released`
- Artisan cannot accept a job until the customer funds escrow
- Artisan uploads a before photo (optional) when starting, then uploads an after photo to trigger a payment request
- Customer has 48 hours to approve or open a dispute
- Auto-release cron job (runs hourly) releases payment automatically after the 48-hour window if neither action is taken
- Platform fee: 2% on customer deposit, 10% on artisan release

### Before/After Photo Proof
- Artisan uploads a before photo when accepting the job (optional)
- After-photo upload triggers `escrow_status → completed` and sets `auto_release_at = now() + 48h`
- Photos stored in booking record, visible to both parties

### Trust & Ratings
- Post-job rating covers four dimensions: Punctuality, Neatness, Skill, Attitude
- Average star score feeds into the artisan's trust calculation
- Badge tiers auto-updated via Supabase DB trigger:
  - **Newbie** — default
  - **Verified** — 3+ completed jobs and average score 3.5+
  - **iSabi Pro** — 10+ completed jobs and average score 4.5+

### WhatsApp Notifications
- Every booking event (new job, accepted, completed, released, dispute) sends a WhatsApp message
- Primary: Termii (Nigeria-first, WhatsApp Business)
- Fallback: Twilio WhatsApp sandbox
- Inbound messages handled via webhook at `/api/whatsapp/webhook` (Termii) and `/api/whatsapp/twilio`

### Real-Time Job Chat
- In-app messaging on every booking
- Quick reply shortcuts for customer and artisan roles
- Supabase real-time subscriptions for instant delivery

---

## Tech Stack

| Area | Technology |
|---|---|
| Framework | Next.js 15 (App Router, server actions) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS, Zustand |
| Database | Supabase (PostgreSQL + real-time) |
| Auth | Supabase Auth (phone OTP) |
| AI — Diagnosis | Groq SDK, `meta-llama/llama-4-scout-17b-16e-instruct` (vision) |
| AI — KYC | Google Gemini 2.5 Flash via `@google/genai` |
| Payments | Paystack |
| WhatsApp | Termii (primary) / Twilio (fallback) |
| Maps | Google Places API |
| Cron | Vercel Cron (`vercel.json`) |

---

## Project Structure

```
app/
  page.tsx                   — Homepage
  report/page.tsx            — AI diagnosis + artisan matching
  onboarding/page.tsx        — 8-step phone-first onboarding
  auth/page.tsx              — Phone or email sign-in
  profile/page.tsx           — Customer profile, wallet, job history, escrow actions
  browse/page.tsx            — Browse and filter artisans
  artisan/
    [id]/page.tsx            — Artisan public profile
    dashboard/page.tsx       — Artisan jobs, before/after photos, earnings
  admin/page.tsx             — Admin escrow controls and trust scores
  api/
    auth/                    — Session helpers
    artisans/register/       — Artisan registration
    bookings/[id]/photos/    — Before/after photo upload, escrow state transition
    cron/auto-release/       — Hourly auto-release of completed escrow
    diagnose/                — Groq AI diagnosis
    escrow/                  — Fund, release, dispute, refund
    kyc/verify/              — Gemini KYC: NIN OCR + face match
    ratings/                 — Post-job ratings
    whatsapp/                — Termii + Twilio webhook handlers

lib/
  types.ts                   — All TypeScript types
  api.ts                     — Data helpers (toArtisan, loadUserDb, etc.)
  supabase/                  — Browser, server, and service role clients

components/
  Navbar.tsx                 — Top bar + mobile bottom navigation
  RatingWidget.tsx           — 4-dimension star rating form
  JobChat.tsx                — Real-time booking chat
  WhatsAppFAB.tsx            — Floating WhatsApp button

supabase/migrations/         — SQL migration files
vercel.json                  — Cron schedule (hourly auto-release)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- Optional: Groq API key, Gemini API key, Paystack keys

### Installation

```bash
git clone https://github.com/phantomtee/fixmate.git
cd fixmate
npm install
cp .env.example .env.local
# Fill in .env.local (see table below)
npm run dev
# Open http://localhost:3000
```

### Database setup

Run the migration files in order via the Supabase SQL Editor:

```
supabase/migrations/001_*.sql
supabase/migrations/002_*.sql
...through...
supabase/migrations/007_escrow_photos.sql
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server only) |
| `GROQ_API_KEY` | No | Groq API key — AI diagnosis. Omit to use demo mock |
| `GEMINI_API_KEY` | No | Google Gemini key — KYC verification. Omit to use demo pass-through |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Google Places autocomplete |
| `PAYSTACK_SECRET_KEY` | No | Paystack secret key (escrow payments) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | No | Paystack public key |
| `TERMII_API_KEY` | No | Termii key — WhatsApp notifications |
| `TWILIO_ACCOUNT_SID` | No | Twilio SID — fallback WhatsApp |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | No | Twilio WhatsApp sender number |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | No | Number shown on floating WhatsApp button |
| `CRON_SECRET` | No | Bearer token protecting the auto-release cron endpoint |
| `NEXT_PUBLIC_APP_URL` | No | Full URL of your deployment |

---

## Escrow State Machine

```
Customer reports issue
        |
        v
  Artisan matched
        |
        v
  Customer funds escrow ──► not_funded → funded
        |
        v
  Artisan accepts job ─────► funded → accepted
        |
        v
  Work begins ─────────────► accepted → in_progress
        |
        v
  Artisan uploads after photo ► in_progress → completed
  (auto_release_at = now + 48h)
        |
      ┌─┴──────────────┐
      v                 v
  Customer releases   Customer opens dispute
  (manual)            (→ admin review)
      |
      v
  released ──► artisan paid (minus 10% fee)
        |
        v
  48h timeout ──► auto-released by cron
```

---

## KYC Architecture

Traditional approach: pay Smile ID or Dojah ~$0.50–$2.00 per verification.

FixMate approach: send NIN card image + live selfie as `inlineData` to Gemini 2.5 Flash with a structured KYC prompt. Gemini performs OCR on the document and compares faces. Returns a JSON verdict with name, NIN, face_match, confidence, and a one-sentence reason. Total cost on Google AI Studio free tier: $0.

```
Client (browser)
    ├── NIN card image (base64)
    └── Live selfie (base64)
           │
           ▼
    POST /api/kyc/verify
           │
           ▼
    Gemini 2.5 Flash
    (multimodal: OCR + face comparison)
           │
           ▼
    { extracted_name, extracted_nin,
      face_match, confidence,
      verified, reason }
```

---

## Cron Auto-Release

`vercel.json` schedules `/api/cron/auto-release` to run every hour.

The endpoint:
1. Finds all bookings where `escrow_status = 'completed'` and `auto_release_at <= now()`
2. Updates each to `escrow_status = 'released'`
3. Inserts an `escrow_transactions` record for the release
4. Returns a count of released bookings

Protect the endpoint with `CRON_SECRET` — only Vercel's cron service (and your own `Authorization: Bearer <secret>` calls) can trigger it.
