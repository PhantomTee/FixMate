# FixMate by OPay - OPay National Innovation Challenge 2026
**Track**: Digital Tools for SMEs & Informal Sector

## 1. Best Project Positioning
- **One-line pitch**: FixMate is a Gemini-powered marketplace that instantly diagnoses home repairs and matches users with verified local artisans, secured by OPay Escrow.
- **30-second pitch**: Finding reliable artisans in Nigeria is a gamble. FixMate changes this. Users snap a photo of a broken generator or leaking pipe, and our Gemini AI instantly diagnoses the issue, estimates the cost, and recommends vetted local artisans. To guarantee trust, payment is held in OPay Escrow and only released when the customer is satisfied, protecting both the buyer and the artisan.
- **2-minute pitch**: *Expands on the above.* Highlights the problem of millions of unverified informal workers in Nigeria struggling with customer acquisition, while households suffer from terrible service delivery. We introduce FixMate as the bridge. Gemini handles the heavy lifting of multi-modal diagnosis and customer support (in local languages), while OPay provides the financial rails (Escrow, Wallet, and SME Merchant tools) to bring this informal sector into the digital economy safely. 
- **Why this fits the track**: It digitizes the most unstructured segment of the informal economy (artisans) and provides them with SME tools (inventory, verified reviews, payment records).
- **Why it's better than a directory**: Directories lack accountability. We secure the transaction with escrow and use AI to prevent pricing exploitation and misdiagnosis before the artisan even arrives.
- **Centrality of OPay & Gemini**: Gemini is required to overcome the knowledge barrier (users don't know what's broken; artisans struggle to communicate professional invoices). OPay is required to solve the trust barrier (escrow prevents scams).

## 2. Product Architecture
- **User App Flow**: Landing Page -> Upload Image/Audio of Problem -> Gemini Chat Diagnosis & Quote -> View Matched Artisans -> Fund OPay Escrow -> Job Done -> Confirm & Review.
- **Artisan App Flow**: Registration -> ID/Skill Verification -> Dashboard -> Receive Job Request & Gemini Details -> Accept & Navigate -> Complete Job (Upload Proof) -> Receive OPay Settlement.
- **Admin Flow**: View Escrow balances -> Resolve Disputes using Gemini Chat Summaries -> Verify Artisans -> Monitor Platform Fees.
- **Payment/Escrow Flow**: Wallet Debit -> Escrow Hold -> Trigger Release -> Platform Fee Split -> Artisan Wallet Credit.
- **Dispute Flow**: User flags issue -> Funds locked -> Admin reviews Gemini task summary and user photos -> Refund or Artisan Payout.
- **Review/Trust Flow**: Post-job rating + automated scoring based on successful OPay payouts.
- **Inventory/Sales Tool Flow**: Artisan logs materials bought for a job -> Gemini extracts costs from receipts -> Updates weekly SME dashboard.

## 3. Gemini AI Design
- **Exact Features**: Multimodal Vision (image to diagnosis), Text generation (chat assistant, invoice generation), NLP translation (handling Pidgin/Yoruba/Hausa/Igbo inputs).
- **Prompt Structure (Diagnosis)**: `System: You are an expert Nigerian home repair assessor. Input: User text + image. Output: JSON containing { "category": string, "urgency": "High|Medium|Low", "safety_warning": string|null, "estimated_price_naira": { "min": number, "max": number }, "follow_up_questions": string[] }`.
- **Prompt Structure (Matching)**: `Match artisan tags to extracted issue keywords`.
- **Handling Uncertainty**: If image is blurry, Gemini must reply: "I cannot clearly see the issue. Please upload a closer picture or describe the sound it makes."
- **Safety Guardrails**: If input contains "sparking", "gas smell", or "flooding", output `emergency: true` with strict instructions: "DO NOT TOUCH. Turn off your main power/gas immediately. I am escalating this to emergency-tier electricians." Never claim to be a licensed engineer.

## 4. MVP Scope
- **Must Build (Demo)**: Landing page, Problem report (Image + Text), Gemini Diagnostic Chat UI, Artisan List, Mock OPay Escrow page, Success/Review screen.
- **Good to Build**: Artisan SME Dashboard (simple charts).
- **Do NOT Build**: Live geolocation tracking, real-time WebSockets for dispute chat, actual biometric KYC.

## 5. Full Technical Stack
- **Next.js (App Router, Tailwind CSS)**: Fast modern React building, great for serverless and SEO. Tailored for mobile-first views.
- **TypeScript**: Ensures bug-free models for payments and data handling.
- **Firebase/Firestore**: Easiest way to store structured NoSQL data (job requests, artisan profiles) rapidly during a hackathon.
- **Gemini @google/genai SDK**: For all AI integrations, running securely server-side via Next.js API routes.
- **Mock OPay API**: Custom Next.js endpoints simulating OPay's endpoints (`/api/opay/escrow/fund`, `/api/opay/escrow/release`).

## 6. Database Schema (NoSQL/JSON style)
- **`users`**: `{ id, name, phone, type: "CUSTOMER"|"ARTISAN", created_at }`
- **`artisans`**: `{ user_id, category, location, verification_status, trust_score }`
- **`job_requests`**: `{ id, user_id, description, image_url, ai_diagnosis (json), estimated_price, status: "OPEN"|"ACCEPTED"|"COMPLETED"|"DISPUTED" }`
- **`escrow_transactions`**: `{ id, job_id, amount, opay_reference, status: "HELD"|"RELEASED"|"REFUNDED" }`
- **`reviews`**: `{ job_id, rating (1-5), comment }`

## 7. AI Trust Score Model (0-100)
**Formula**: 
`Score = (Completion Rate * 40) + (Review Average/5 * 30) + (Verified ID * 10) + (Dispute Absence * 20)`
*Explanation*: If an artisan completes 10 out of 10 jobs (40 pts), has 5 stars (30 pts), is verified (10 pts), and has 0 disputes (20 pts), score = 100. Disputes heavily penalize the score. Escrow volume builds institutional trust for OPay loans later.

## 8. Payment Simulation (Mock OPay Flow)
1. User clicks "Book & Pay" -> Calls `/api/mock-opay/fund`.
2. State changes: User Wallet (-₦15k), Escrow Wallet (+₦15k). Status: `IN_ESCROW`.
3. Artisan finishes -> User clicks "Confirm Job".
4. State changes: Calls `/api/mock-opay/release`. Platform Wallet (+₦1.5k), Artisan Wallet (+₦13.5k). Status: `RELEASED`.

## 9. Demo Data
- **Categories**: Plumber, Electrician, AC Repair, Tailor.
- **Artisan**: Opeyemi Ahmed (AC Technician, Ikeja, Score: 92, Rate: ₦15,000/hr).
- **Job Request**: "My LG split AC is blowing warm air and dripping water inside the room." -> Gemini diagnoses: *Blocked drain pipe + Low refrigerant*. Estimate: ₦10,000 - ₦25,000.
- **Mock Balances**: User starts with ₦50,000 mock OPay balance.

## 10. UI/UX Plan
- **Mobile-first UI**: 95% of target market uses Android. Large touch targets.
- **Colors**: OPay Green (#00B579) primary, White background, clean charcoal text. 
- **Layout**: 
  - Landing: Hero -> How it works -> CTA.
  - Report: Big camera icon, simple text box "What's broken?"
  - Chat: WhatsApp-style speech bubbles.
- Trust badges everywhere ("Protected by OPay Escrow", "Gemini AI Verified").

## 11. Core User Stories
- As a customer with a smoking generator, I want to upload a video so I get matched instantly with a qualified mechanic without getting scammed on price.
- As an artisan, I want my payment locked in escrow before I travel 5km to a client's house so I know I won't waste my transport money.

## 12. Judging Strategy
- **Start with a Story**: "This is Chinedu. His roof leaked at 2 AM..."
- **Show, Don't Tell**: Spend 60 seconds of the 2 mins doing the live Gemini diagnosis and OPay Escrow mock release.
- **Business Focus**: Emphasize that OPay acquires merchants, and artisans get access to credit lines based on their escrow history. Win-win.

## 13. Business Model
- **Primary**: 10% Transaction fee on successful escrow releases.
- **Secondary**: Premium subscription for Artisans (₦1,000/month) for priority listing and advanced SME dashboard analytics. 
- *Go-to-market strategy*: Zero fees for the first 3 months to build supply-side liquidity.

## 14. Risk Analysis & Mitigation
- **Risk**: Artisans bypass the platform to avoid the 10% fee.
- **Mitigation**: Users only get the OPay Dispute Guarantee if paid through escrow. Artisans lose rank and access to OPay credit if they don't process jobs via the app.

## 15. Pitch Deck Outline (10 Slides)
1. **Title**: FixMate by OPay (Logo + "Digitizing Nigeria's Informal Artisans").
2. **Problem**: Unreliable service, lack of trust, price exploitation.
3. **Market**: 30m+ informal workers in Nigeria, billion-dollar home repair market.
4. **Solution**: Gemini AI for diagnosis + OPay Escrow for trust.
5. **Product Demo**: Screenshots of Chat & Booking.
6. **Gemini AI Layer**: Visualizing the multimodal pipeline and smart pricing.
7. **OPay Escrow**: Showing the wallet-to-escrow-to-wallet flow.
8. **Business Model**: 10% commission + working capital credit play.
9. **Impact**: Financial inclusion, digitizing the unbanked, creating jobs.
10. **Team & Ask**: What we need to scale.

## 16. Build Roadmap (7 Days)
- **Day 1**: Scaffold Next.js + Tailwind. Define DB Schema.
- **Day 2**: Frontend: Landing Page, Report Page UI.
- **Day 3**: Backend: Gemini API integration for issue diagnosis.
- **Day 4**: Backend: Mock OPay API routes (fund, release).
- **Day 5**: Frontend: Artisan listing and Escrow status pages.
- **Day 6**: Polish UI, link frontend to backend, Seed demo data.
- **Day 7**: Testing, bug fixing, record demo video.

## 17. Repository Structure
```
/app
  /api/gemini/diagnosis/route.ts
  /api/opay/escrow/route.ts
  /report/page.tsx
  /artisan/[id]/page.tsx
  /dashboard/page.tsx
  page.tsx
/components
  /ui
  ChatBubble.tsx
  EscrowStatusCard.tsx
/lib
  gemini.ts
  mock-db.ts
```

## 18. API Routes Needed
- `POST /api/gemini/diagnosis` (Reads image/text, returning JSON quote)
- `POST /api/opay/fund` (Mock deduction from User)
- `POST /api/opay/release` (Mock credit to Artisan)

## 19. Gemini Prompt Templates
**Diagnosis Prompt Example**:
```json
{
  "system": "You are FixMate AI for Nigeria. Analyze home repair issues. Respond in JSON only.",
  "input": "[User text] + [Image Base64]",
  "expected_output": {
    "issue_title": "Short title",
    "artisan_category": "Plumber",
    "urgency": "High",
    "estimated_cost_naira": "15000-25000",
    "safety_warning": "Turn off main water valve immediately."
  },
  "fallback": { "error": "Could not diagnose. Please provide more details." }
}
```

## 20. Final Deliverables List
1. Vercel Deployed Demo Link
2. Public GitHub Repo (Clean README)
3. 2-Minute Demo Video (MP4)
4. Slide Deck (PDF)
5. Demo Credentials (Test User + Test Artisan logins)
