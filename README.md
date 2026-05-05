<p align="center">
  <img src="public/images/midly-logo.png" alt="Midly Logo" width="180" />
</p>

<h1 align="center">Midly</h1>

<p align="center">
  <b>Philippines' Intelligent Peer-to-Peer Escrow Platform</b><br/>
  Secure digital trades with AI-powered fraud detection, real-time escrow, and biometric KYC verification.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Express-5-blue?logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Railway-4169E1?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-010101?logo=socket.io" alt="Socket.IO" />
</p>

---

## Overview

Midly is a full-stack escrow marketplace designed for the Philippine market. It enables users to buy and sell digital goods (game accounts, in-game items, digital services) through a trustless, AI-monitored transaction pipeline. Funds are held in a cryptographic vault until both parties confirm the trade, eliminating scams and chargebacks.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (Next.js 16)               │
│   Landing · Trade Hub · Wallet · KYC · Admin Panel   │
└────────────────────┬────────────────────────────────┘
                     │ REST + WebSocket
┌────────────────────▼────────────────────────────────┐
│               API Server (Express 5)                 │
│   Auth · Transactions · Messages · Wallet · Admin    │
├──────────┬──────────┬──────────┬────────────────────┤
│ Prisma   │ Redis    │ BullMQ   │ Socket.IO           │
│ (ORM)    │ (Cache)  │ (Queues) │ (Real-time)         │
└────┬─────┴────┬─────┴────┬─────┴────────────────────┘
     │          │          │
 PostgreSQL   Redis     AI Workers
 (Railway)   (Railway)  (Face-API / Tesseract)
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, GSAP, Framer Motion |
| **Backend** | Express 5, Socket.IO, BullMQ |
| **Database** | PostgreSQL (via Prisma ORM) |
| **Cache / Queues** | Redis, BullMQ |
| **AI / ML** | Face-API.js (biometric KYC), Tesseract.js (OCR), Levenshtein fuzzy matching |
| **Payments** | PayMongo (GCash, Cards), Midly Wallet |
| **Storage** | S3-compatible (Tigris) |
| **Auth** | NextAuth.js + JWT |
| **Deployment** | Railway (API + DB + Redis), GitHub Actions CI |

## Core Features

### Escrow & Trade Engine
- **6-Phase Trade Lifecycle** — `Agreement → Payment → Handover → Verification → Release → Complete`
- **Smart Vault** — Funds locked in escrow with AES-256 encrypted credential storage for game account trades
- **24-Hour Auto-Release Timer** — Automatic fund release with countdown if buyer doesn't respond
- **Mutual Cancellation Protocol** — Both parties can request cancellation before handover

### AI-Powered Security
- **Risk Engine** — Heuristic scoring system (account age, KYC status, velocity, reputation, chat patterns) that auto-freezes trades scoring ≥81
- **Chat Surveillance** — Fuzzy string matching (Levenshtein distance) against high-risk patterns to detect off-platform payment attempts
- **Security Lockdown** — Real-time WebSocket-driven UI freeze when trades are flagged by the AI or manually suspended by admins

### Biometric KYC (3-Phase)
- **Phase 1** — Government ID upload + OCR text extraction
- **Phase 2** — Live selfie capture + AI face descriptor matching against ID photo
- **Phase 3** — Liveness detection (blink + head movement) to prevent spoofing
- **Configurable Thresholds** — Admin-adjustable biometric match and review thresholds

### Wallet System
- **Deposit** — PayMongo integration (GCash sandbox) with webhook-driven balance updates
- **Escrow Debit/Credit** — Automatic wallet deduction on trade payment, credit on release
- **Transaction History** — Full audit trail of deposits, escrow locks, releases, and refunds

### Admin Dashboard
- **Analytics & Reports** — Time-series charts (Recharts), filterable transaction tables, CSV/PDF exports
- **Dispute Resolution** — Evidence review, fund routing (refund buyer / release to seller), typed confirmation
- **Risk & Fraud Panel** — Flagged transactions, freeze/unfreeze controls, user timeline forensics, trade audit logs
- **User Management** — Ban/unban controls, reputation tracking
- **Platform Settings** — Dynamic fee configuration, KYC threshold tuning

### Real-Time Communication
- **WebSocket Trade Rooms** — Instant status updates, message delivery, and system alerts via Socket.IO
- **Redis Pub/Sub Adapter** — Horizontally scalable WebSocket layer
- **Notification System** — Bell icon with unread badge, trade invites, dispute alerts

## Project Structure

```
midly/
├── src/                          # Next.js Frontend
│   ├── app/                      # App Router pages
│   │   ├── trade/[id]/           # Trade Hub (escrow room)
│   │   ├── admin/                # Admin Dashboard
│   │   ├── wallet/               # Wallet & Deposits
│   │   ├── kyc/                  # KYC Verification Flow
│   │   └── marketplace/          # P2P Listings
│   ├── ai/                       # AI Workers (BullMQ processors)
│   ├── components/               # Reusable UI components
│   ├── hooks/                    # Custom React hooks
│   └── lib/                      # Utilities, validations, API config
├── server/                       # Express Backend
│   ├── modules/                  # Feature modules
│   │   ├── auth/                 # Authentication routes
│   │   ├── transactions/         # Trade lifecycle & escrow
│   │   ├── messages/             # Chat + risk analysis
│   │   ├── admin/                # Admin APIs
│   │   ├── wallet/               # Wallet operations
│   │   ├── kyc/                  # KYC verification
│   │   ├── uploads/              # File upload (S3)
│   │   └── webhooks/             # PayMongo webhooks
│   ├── shared/                   # Middlewares (auth, rate limiting)
│   ├── utils/                    # Risk engine, audit logger, S3, payments
│   └── config/                   # DB, Redis, Resend connections
├── prisma/                       # Database schema & seeds
├── scripts/                      # Utility scripts
├── server.ts                     # Express + Socket.IO entry point
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Redis instance
- S3-compatible storage bucket

### Installation

```bash
# Clone the repository
git clone https://github.com/jjjandib6013/midly.git
cd midly

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Download AI models (face detection)
npx tsx download_models.ts

# Seed admin account
npx tsx prisma/seedAdmin.ts
```

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://...
PORT=5001

NEXT_PUBLIC_API_URL=http://localhost:5001

JWT_SECRET=your_jwt_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000

REDIS_URL=redis://...

AWS_REGION=auto
AWS_ENDPOINT=https://...
AWS_BUCKET_NAME=your_bucket
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_WEBHOOK_SECRET=whsk_...

ENCRYPTION_KEY=your_64_char_hex_key
RESEND_API_KEY=re_...
```

### Development

```bash
# Run both frontend and backend concurrently
npm run dev
```

This starts:
- **Frontend** → `http://localhost:3000`
- **Backend API** → `http://localhost:5001`

### Production

Deployed on [Railway](https://railway.app) with automatic deploys from the `main` branch.

```bash
# Build for production
npm run build

# Start production server
npm run start:backend  # Express API
npm run start          # Next.js frontend
```

## API Documentation

All API routes are prefixed with `/api` and require JWT authentication unless noted.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | User registration |
| `POST` | `/api/auth/login` | JWT login |
| `GET` | `/api/transactions` | List user's trades |
| `POST` | `/api/transactions` | Create new trade |
| `POST` | `/api/transactions/:id/progress` | Advance trade state |
| `GET` | `/api/messages/:tradeId` | Get trade messages |
| `POST` | `/api/messages/:tradeId` | Send message (triggers risk analysis) |
| `GET` | `/api/wallet` | Get wallet balance |
| `POST` | `/api/wallet/deposit` | Initiate deposit (PayMongo) |
| `POST` | `/api/kyc/phase1` | Submit KYC documents |
| `GET` | `/api/admin/metrics` | Dashboard metrics (admin) |
| `POST` | `/api/admin/disputes/:id/resolve` | Resolve dispute (admin) |

## License

This project is proprietary software. All rights reserved.

---

<p align="center">
  Built with 🇵🇭 for the Filipino digital trading community.
</p>
