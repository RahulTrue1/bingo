# Trueigtech Bingo — Full-Stack Gaming Platform

A modern, high-performance, dynamic multiplayer Bingo platform built with **Next.js / React / Vinext** on the frontend and **Node.js & Express** on the backend.

---

## Highlights & Features

- **Multi-Variant Game Engine**: Native support for **75-Ball Pattern**, **90-Ball Classic**, **30-Ball Speed Bingo**, and **80-Ball Grid**.
- **Dynamic REST API**: Express server running on port `4000` with 10 route modules and JSON file-backed persistence (`data/bingo-db.json`).
- **Live Ball Calling**: Fair uncalled number selector, automated call cadence, and manual operator overrides.
- **Pattern Validation Engine**: Real-time evaluation of lines, two lines, four corners, diamonds, X shapes, and full house / blackout.
- **RTP & Margin Controls**: Platform-wide and per-room dynamic return-to-player target margins (70% - 95%).
- **Card Wallet & Progressive Jackpots**: Real-time wallet deductions, 2.5% progressive jackpot auto-contributions, and card daubing tracking.
- **Backoffice Administration**: Real-time KPI telemetry, room configuration drawer, live game control deck, player restrictions, and chat moderation queue.
- **Comprehensive API Documentation**: Complete REST API specification with copy-paste `curl` commands in [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md).

---

## System Architecture

```
┌───────────────────────────────────────────────────────────┐
│              Frontend Web Application (Port 3000)         │
│  - Player Lobby & Game Rooms                              │
│  - Live Card Wallet & Ticket Previews                     │
│  - Tournaments, Jackpots & Rewards                        │
│  - Backoffice Suite, Live Control & Pattern Builder       │
└────────────────────────────┬──────────────────────────────┘
                             │  HTTP / REST (Proxy: /api)
┌────────────────────────────▼──────────────────────────────┐
│             Node.js Express API Server (Port 4000)        │
│  - server/index.ts (Express Gateway)                      │
│  - server/routes/ (Rooms, Game, Tickets, Wallet, etc.)    │
│  - server/services/bingo-engine.ts (Rules & RNG)          │
│  - server/db/store.ts (Persistent JSON Store)             │
└───────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Node.js `>=22.13.0`
- npm `>=10.0.0`

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Backend API Server
```bash
npm run server
```
*The Express API server will listen on `http://localhost:4000` with health check at `http://localhost:4000/api/health`.*

### 3. Start the Frontend Dev Server
In a separate terminal window:
```bash
npm run dev
```
*The web interface will open at `http://localhost:3000` (requests to `/api/*` are automatically proxied to `:4000`).*

---

## End-to-End Game Flow Walkthrough

### 1. Player Journey

1. **Player Enters Lobby**:
   - The user opens the home view. The frontend requests `GET /api/rooms` and displays available rooms with real-time countdowns, ticket prices, and jackpot levels.
   - The user's wallet is loaded from `GET /api/wallet`.
2. **Deposit Funds**:
   - Clicking `+` in the header calls `POST /api/wallet/deposit` (`+$50.00`). The balance updates immediately on screen and in the database.
3. **Purchase Tickets**:
   - Entering a room (e.g. *Diamond 75*) and clicking **Buy Cards** calls `POST /api/tickets/buy`.
   - The backend deducts the entry fee, generates deterministic card layout matrices, increments the room card counter, and deposits 2.5% of the ticket price into the progressive jackpot.
4. **Live Round & Daubing**:
   - The game transitions to `live` calling. Each ball drawn via `POST /api/game/:roomId/call-next` is broadcast to players.
   - Numbers matching player cards are daubed (`POST /api/tickets/:id/daub`).
5. **Claiming BINGO**:
   - Clicking **Claim BINGO** calls `POST /api/game/:roomId/claim`.
   - The server engine verifies whether the player's card satisfied the winning pattern with currently called balls.
   - Upon verification, the prize is credited to the player's wallet (`store.wallet += prize`), a transaction is logged, and audit events are generated.

---

### 2. Backoffice & Operator Journey

1. **Admin Telemetry & Live Ops**:
   - Navigating to Admin (`/backoffice`) fetches `GET /api/admin/dashboard` to display platform KPIs (Active Rooms, Online Players, Gross Ticket Revenue, Prize Payout Ratio, Jackpot Liability, and GGR).
2. **Room Management & Global RTP**:
   - Create, duplicate, edit, or delete rooms via `/api/rooms`.
   - The **RTP Policy** tool lets operators enforce global payout percentages across all rooms via `POST /api/rooms/rtp-policy`.
3. **Live Game Control Deck**:
   - The operator can manually draw specific balls (`POST /api/game/:roomId/manual-call`), pause/resume calling, restart rounds, or trigger cancellations with automatic player refunds.
   - Operator can manually declare winners or review flagged claims.
4. **Chat Moderation**:
   - Real-time chat feed from `GET /api/chat/:roomId`.
   - Operator can mute misbehaving users, delete flagged messages, or broadcast platform-wide system announcements.

---

## API Reference Summary

All API endpoints are documented with complete request schemas, response schemas, and copy-paste `curl` commands in **[`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md)**:

| Module | Base Path | Description |
| :--- | :--- | :--- |
| **Health** | `GET /api/health` | System status and uptime check |
| **Rooms** | `/api/rooms` | CRUD, room filtering, duplication, global RTP policy |
| **Game Session** | `/api/game` | Live ball calling, pause/resume, cancel & refunds, claims validation |
| **Tickets** | `/api/tickets` | Card generation, ticket purchasing, number daubing |
| **Wallet** | `/api/wallet` | Balance inquiry, deposits, withdrawals, transaction history |
| **Jackpots** | `/api/jackpots` | Progressive jackpot pools, manual operator contributions, resets |
| **Tournaments** | `/api/tournaments` | Multi-round elimination tournaments, registration, standings |
| **Promotions** | `/api/promotions` | Bonus campaigns, voucher claims, status toggling |
| **Chat** | `/api/chat` | Room chat messages, user muting, message deletion, announcements |
| **Patterns** | `/api/patterns` | Custom pattern designer persistence and pattern library |
| **Admin** | `/api/admin` | Platform KPI telemetry, player management, live control feed |

---

## Verification & Testing

Run the automated test suites:

```bash
# 1. Run full build & rendered HTML regression test
npm test

# 2. Run backend API integration test suite
node --experimental-strip-types --test tests/api.test.mjs

# 3. Run ESLint checks
npm run lint
```

---

## License

Trueigtech Bingo Platform &copy; 2026. All rights reserved.
