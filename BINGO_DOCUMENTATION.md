# Trueigtech Bingo Platform — Complete Architecture & Flow Documentation

Welcome to the comprehensive documentation for the **Trueigtech Bingo Platform**. This platform is a modern, high-performance, edge-ready Bingo gaming ecosystem providing both an immersive **Player Experience** and an enterprise **Operator Backoffice**.

---

## Table of Contents
1. [System Architecture & Technology Stack](#1-system-architecture--technology-stack)
2. [Project Directory & Codebase Layout](#2-project-directory--codebase-layout)
3. [How to Connect & Run the Project](#3-how-to-connect--run-the-project)
4. [Core Game Engine & Mathematics (`bingo-core.ts`)](#4-core-game-engine--mathematics-bingo-corets)
   - [Supported Bingo Variants](#supported-bingo-variants)
   - [Deterministic Card Generation (PRNG)](#deterministic-card-generation-prng)
   - [Core Engine Classes](#core-engine-classes)
5. [Player End (User Experience) Flow](#5-player-end-user-experience-flow)
   - [5.1 Lobby & Room Discovery](#51-lobby--room-discovery)
   - [5.2 Ticket Purchase & Wallet Integration](#52-ticket-purchase--wallet-integration)
   - [5.3 Live Game Room Flow & Calling Rails](#53-live-game-room-flow--calling-rails)
   - [5.4 Auto-Daub vs Manual Daubing](#54-auto-daub-vs-manual-daubing)
   - [5.5 Winning Claim & Validation Lifecycle](#55-winning-claim--validation-lifecycle)
   - [5.6 Multi-Stage Winning Progression](#56-multi-stage-winning-progression)
   - [5.7 Progressive Jackpots Experience](#57-progressive-jackpots-experience)
   - [5.8 Tournaments (Weekend Cup) Flow](#58-tournaments-weekend-cup-flow)
   - [5.9 Rewards, Promotions & History](#59-rewards-promotions--history)
6. [Backoffice End (Operator Management) Flow](#6-backoffice-end-operator-management-flow)
   - [6.1 Operator Dashboard & Commercial Telemetry](#61-operator-dashboard--commercial-telemetry)
   - [6.2 Room Management & Live Pricing](#62-room-management--live-pricing)
   - [6.3 Multi-Stage Game Builder](#63-multi-stage-game-builder)
   - [6.4 Live Control Deck & Calling Console](#64-live-control-deck--calling-console)
   - [6.5 Pattern Builder & Canvas](#65-pattern-builder--canvas)
   - [6.6 Weekly Game Scheduler](#66-weekly-game-scheduler)
   - [6.7 Progressive Jackpot Management](#67-progressive-jackpot-management)
   - [6.8 Variant Customization Engine](#68-variant-customization-engine)
   - [6.9 Player CRM & Account Moderation](#69-player-crm--account-moderation)
   - [6.10 Financial Ledger & Transaction Audits](#610-financial-ledger--transaction-audits)
   - [6.11 Chat Moderation & Broadcast System](#611-chat-moderation--broadcast-system)
   - [6.12 Reports, Analytics & GGR Tracking](#612-reports-analytics--ggr-tracking)
7. [Authentication & Identity Management](#7-authentication--identity-management)
8. [End-to-End System Data Flows & Lifecycles](#8-end-to-end-system-data-flows--lifecycles)
   - [Complete Game Round Lifecycle Diagram](#complete-game-round-lifecycle-diagram)
   - [Ticket Purchase & Verification Flow](#ticket-purchase--verification-flow)
   - [Claim Audit & Payout Flow](#claim-audit--payout-flow)

---

## 1. System Architecture & Technology Stack

The platform is designed to operate at ultra-low latency with serverless edge rendering:

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Edge Framework** | [Vinext](https://github.com/cloudflare/vinext) | Runs Next.js App Router applications on Cloudflare Workers |
| **Runtime & Server** | Cloudflare Workers / Wrangler | Serverless V8 isolate environment |
| **Frontend Library** | React 19 (`react`, `react-dom`) | Modern client and server components |
| **Bundler** | Vite 8 + `@cloudflare/vite-plugin` | Ultra-fast local HMR and edge build bundling |
| **Database & ORM** | Cloudflare D1 (SQLite) + Drizzle ORM | Edge-replicated serverless relational storage |
| **Styling** | Tailwind CSS 4 + Modern CSS Variables | Dark theme with gaming accents, fluid layout, responsive cards |
| **Icons** | `@phosphor-icons/react` | High-fidelity vector iconography |
| **Auth Gateway** | ChatGPT / SIWC Gateway Headers | Per-request header injection (`oai-authenticated-user-*`) |

---

## 2. Project Directory & Codebase Layout

```
tig-bingo/
├── app/
│   ├── layout.tsx                # Global HTML root layout, metadata & fonts
│   ├── page.tsx                  # Player Frontend route (/) with automated test fallback
│   ├── backoffice/
│   │   └── page.tsx              # Operator Backoffice route (/backoffice)
│   ├── BingoApp.tsx              # Master single-page interactive controller (Player & Admin)
│   ├── bingo-core.ts             # Pure engines: RNG, card generation, validators, scheduling
│   ├── chatgpt-auth.ts           # Workspace authentication header decoder & auth redirects
│   ├── globals.css               # Complete stylesheet (Player HUD, Backoffice tables, modals)
│   └── _sites-preview/           # Skeleton loaders for automated testing
├── db/
│   ├── index.ts                  # Drizzle ORM client initialization with Cloudflare D1
│   └── schema.ts                 # SQLite schema definitions
├── build/
│   └── sites-vite-plugin.ts      # Custom Vite plugin for packaging builds and migrations
├── worker/
│   └── index.ts                  # Cloudflare Worker entry point & edge image optimization
├── public/
│   ├── banners/                  # Promotional hero carousel graphics
│   ├── rooms/                    # Themed Bingo room artwork (75, 90, 80, Turbo 30)
│   ├── jackpots/                 # Jackpot badges & winner avatars
│   └── promotions/               # Rewards & promotion art
├── drizzle.config.ts             # Drizzle Kit migration settings
├── package.json                  # Dependencies & execution scripts
└── vite.config.ts                # Vite config simulating local Cloudflare D1/R2 bindings
```

---

## 3. How to Connect & Run the Project

### Prerequisites
- **Node.js**: version `>=22.13.0`
- **NPM**: installed with Node

### Installation & Execution Commands

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev
# The dev server will start at: http://localhost:3000
# Wrangler will mock Cloudflare D1 databases in `.wrangler/`

# 3. Production build
npm run build

# 4. Run automated test suite
npm test

# 5. Generate database migrations (when modifying db/schema.ts)
npm run db:generate
```

### Accessing the Applications
- **Player Gaming HUD**: Navigate to `http://localhost:3000/`
- **Operator Backoffice Admin**: Navigate to `http://localhost:3000/backoffice`

---

## 4. Core Game Engine & Mathematics (`bingo-core.ts`)

All Bingo rules, procedural card generation, and calculation engines reside in `app/bingo-core.ts` as pure, testable TypeScript classes and functions.

### Supported Bingo Variants

1. **75-Ball Pattern / Progressive (`Diamond 75`, `Mega Jackpot`, `Pattern Arena`)**:
   - $5 \times 5$ grid (25 cells) with center cell designated as `FREE`.
   - Columns map strictly to numbers:
     - **B**: 1–15
     - **I**: 16–30
     - **N**: 31–45 (Middle cell is FREE)
     - **G**: 46–60
     - **O**: 61–75
2. **90-Ball Classic (`Trueig 90 Classic`, `Midnight Bingo`)**:
   - Traditional UK/European $3 \times 9$ ticket strip (27 slots).
   - Contains 15 numbers (5 per row) and 12 blanks (4 per row).
   - Columns represent decades (1–9, 10–19, 20–29, ..., 80–90).
   - Multi-stage sequence: **1 Line -> 2 Lines -> Full House**.
3. **30-Ball Speed Bingo (`Turbo 30`)**:
   - Rapid-fire $3 \times 3$ grid (9 cells) with no free space.
   - Numbers selected from a tight pool of 1–30.
   - Fast calling interval (600ms per ball), game resolves under 2 minutes.
4. **80-Ball Grid (`Quick 80`)**:
   - $4 \times 4$ grid (16 cells) using color-coded columns (1–20, 21–40, 41–60, 61–80).
   - Winning targets: Single Line -> Four Corners -> Full House.

### Deterministic Card Generation (PRNG)

To ensure that ticket cards remain consistent across re-renders without freezing the event loop, a fast **32-bit Xorshift PRNG** (`seededRandom`) is utilized:

```typescript
function seededRandom(seed: number): () => number {
  let state = Math.abs(Math.trunc(seed)) * 2654435761 % 4294967296 || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
}
```

For grid variants (30-Ball and 80-Ball), `makeGridCard` applies a **Fisher-Yates shuffle** over the complete ball pool, guaranteeing cards never contain duplicates and never deadlock.

### Core Engine Classes

- **`BingoEngine`**:
  - `nextNumber(called: number[], ballCount: number)`: Draws random balls without replacement.
  - `label(value: number)`: Converts numbers to traditional call labels (e.g., 12 -> B-12, 68 -> O-68).
- **`PatternValidator`**:
  - `isFourCorners(card, called)`: Validates corners `[0, 4, 20, 24]`.
  - `completion(card, called)`: Computes percentage towards card completion.
- **`PrizeEngine`**:
  - `split(amount, winners)`: Safely calculates even prize distribution in tie wins.
- **`JackpotEngine`**:
  - `contribution(ticketRevenue, percent)`: Calculates the house pool contribution (default 2.5%).
- **`TournamentEngine`**:
  - `points(lineWins, patternWins, fullHouses)`: Standardized tournament scoring (10 pts / line, 25 pts / pattern, 50 pts / Full House).
- **`TransactionManager`**:
  - `reference(prefix)`: Generates compliant transaction IDs (e.g., `TRUEIG-854201`).
- **`RTPEngine`**:
  - `calculateDynamicPrize(cardsSold, ticketPrice, targetRtp, jackpotPercent)`: Dynamically scales prize pools according to actual ticket revenue and configured target RTP.
  - `calculateActualRtp(prize, cardsSold, ticketPrice)`: Real-time calculation of realized payout percentage ($ \frac{\text{Prize}}{\text{Gross Revenue}} \times 100 $).
  - `calculateHouseMargin(targetRtp, jackpotPercent)`: Computes operator retention ($ 100\% - \text{RTP}\% - \text{Jackpot}\% $).
  - `getHealthStatus(actualRtp, targetRtp)`: Evaluates health and risk tiers (`Optimal`, `High Payout Risk`, `Conservative Margin`).

---

## 5. Player End (User Experience) Flow

The player interface provides an all-in-one gaming suite accessible from the top navigation bar.

### 5.1 Lobby & Room Discovery
- **Hero Carousel**: Features active high-stakes events (Weekend Cup $25,000, Mega Jackpot $125k+, Free Party).
- **Filtering & Search**:
  - Filters: *All games*, *Live now*, *75-Ball*, *90-Ball*, *Speed*, *Jackpots*, *Free*.
  - Search bar supports instant keyword filtering across game names and rules.
- **Room Cards**:
  - Displays occupancy percentage, tickets sold, countdown timer or ball count, entry fee, pattern name, and favorite bookmarking.

### 5.2 Ticket Purchase & Wallet Integration
- Players begin in the **Selling Phase**.
- Up to **8 cards** can be selected per room.
- Real-time ticket calculation: Total Cost = Ticket Price * Number of Cards.
- When "Buy cards" is clicked:
  1. Validates player balance: Wallet >= Total Cost.
  2. Deducts funds from player wallet.
  3. Secures ticket batch with audit reference `TRUEIG-XXXXXX`.
  4. Advances game to the **Countdown Phase**.

### 5.3 Live Game Room Flow & Calling Rails
The room displays a 6-phase rail at the top:

```
[1. Cards (Selling)] -> [2. Countdown] -> [3. Calling (Live)] -> [4. Validation (Review)] -> [5. Winner] -> [6. Results]
```

1. **Selling Phase**: Select/deselect tickets; browse available cards.
2. **Countdown Phase**: 5-second countdown ("Eyes down!").
3. **Live Calling Phase**:
   - The automated caller extracts random balls based on room speed:
     - **Turbo**: 600ms
     - **Fast**: 1,200ms
     - **Normal**: 2,100ms
     - **Slow**: 3,200ms
   - Displays current ball with glowing pulse animation, caller voice toggle, and previous 5 balls.
   - Master **Number Board**: Complete matrix of numbers (1–75, 1–90, etc.) highlighting every ball called.

### 5.4 Auto-Daub vs Manual Daubing
- **Auto-Daub ON (Default)**: Automatically marks matching numbers on all active cards the moment a ball is called.
- **Manual Daub Mode**:
  - Players must click called numbers on their cards.
  - Invalid click guard: Clicking an uncalled number prompts a warning toast ("That number has not been called yet").
- **Near-Win Alert ("1 TO GO")**:
  - When any ticket is exactly 1 cell away from satisfying the active pattern, a glowing badge **"1 TO GO"** triggers on that card.

### 5.5 Winning Claim & Validation Lifecycle
- Players can hit the **"BINGO!"** button or let automated detection trigger when winning conditions are met.
- **Claim Modal Overlay**:
  - Phase changes to **Review**: Audits 3 items:
    1. Ticket ownership & player signature.
    2. Called-number history verification.
    3. Geometric pattern match check.
  - Phase changes to **Winner**:
    - Announces winner name(s).
    - Splits prize pool equally if multiple players win simultaneously.
    - Credits prize directly to player's wallet balance.
    - Emits announcement into live room chat.

### 5.6 Multi-Stage Winning Progression
For games with multiple stages (e.g. `Trueig 90 Classic`: 1 Line -> 2 Lines -> Full House):
- When Stage 1 (One Line) is won, prize is awarded.
- Because `continueAfterWin = true`, the round **does not terminate**.
- The active pattern automatically advances to Stage 2 (Two Lines), and number calling resumes immediately.
- The game only transitions to `Results` after the final stage (`Full House`) completes.

### 5.7 Progressive Jackpots Experience
- Accessible via the **Jackpots** navigation tab.
- Tracks 4 progressive tiers:
  - **Mega Trueig Jackpot**: $125,000+ base, 75-Ball, Full House <= 42 balls, 2.5% contribution.
  - **Major Trueig Jackpot**: $24,000+ base, 90-Ball, Coverall <= 50 balls, 2.0% contribution.
  - **Minor Trueig Jackpot**: $6,200+ base, 75-Ball, 4 Corners <= 20 balls, 1.5% contribution.
  - **Mini Trueig Jackpot**: $1,500+ base, 75-Ball, Any Line <= 15 balls, 1.0% contribution.
- Real-time pulse shows active contributors and live amount ticking up with ticket sales.
- Direct **"Join room"** table listing all contributing game rooms.

### 5.8 Tournaments (Weekend Cup) Flow
- 5-Stage progressive elimination tournament:
  1. **Open qualifier**: 512 -> 256 players
  2. **Pattern sprint**: 256 -> 128 players
  3. **Quarterfinal**: 128 -> 16 players
  4. **Semifinal**: 16 -> 8 players
  5. **Grand final**: 8 players -> 1 champion ($7,500 top prize)
- Features interactive leaderboards with "Friends" vs "Global" views, points calculation, countdown timers, and automated reminder toggle.

### 5.9 Rewards, Promotions & History
- **Promotions Tab**: Browse and activate promo vouchers (Free Bingo every hour, VIP Gold access, Buy 3 Get 1 free, 10% cashback).
- **History Tab**: Complete transaction history with Game ID, Room, Timestamp, Cards bought, Entry cost, Prize won, and Status (`Won` / `Completed`).
- **Profile Tab**: Account balance, verified KYC badge, win rate stats, and live notification alerts.

---

## 6. Backoffice End (Operator Management) Flow

The operator backoffice (accessed at `/backoffice`) allows complete oversight, real-time control, and financial governance of the Bingo network.

### 6.1 Operator Dashboard & Commercial Telemetry
- **Key Metric Cards**:
  - *Active Rooms* (18 live)
  - *Online Players* (2,847 concurrent)
  - *Ticket Revenue* ($48,620 gross today)
  - *Prize Payout Ratio* (65.5% payout)
  - *Jackpot Liability* ($142,280 total reserves)
  - *GGR (Gross Gaming Revenue)* ($16,780 today)
- **Revenue vs Payouts Chart**: 7-day dual-bar comparison to monitor house margin health.
- **Live Operations Widget**: Quick-glance view of live games, current ball, players, and prize pools.
- **Top Rooms Ranking**: Performance leaderboard sorted by volume and GGR.
- **Operational Audit Feed**: Live event log for claims, contributions, and risk alerts.

### 6.2 Room Management & Live Pricing
- Table of all configured rooms with real-time status pills.
- **Inline Price Editor**: Operators can edit ticket prices on the fly without entering sub-menus.
- **Room Actions**:
  - *Duplicate*: Instantly clones a room configuration with `-copy` slug.
  - *Edit / Configure*: Opens the slide-over configuration drawer.

### 6.3 Winning & RTP (Return to Player) Management
A dedicated module for managing house margins, target winning rates, and dynamic prize scaling:
- **Global Network Bulk Controller**:
  - Sets network-wide baseline RTP ($70\%$, $75\%$, $78\%$, $80\%$, $85\%$, $90\%$).
  - One-click **"Apply to All Games"** button updates every room across the network immediately.
  - Live preview shows projected operator house margin, jackpot allocations, and player return.
- **Per-Room Custom RTP Overrides**:
  - Configure target RTP individually per game or maintain global inheritance.
  - Inline target percentage editor.
- **Payout Calculation Modes**:
  - **Dynamic Prize Pool (`rtpMode: "dynamic"`)**: The prize pool automatically recalculates in real time as tickets are purchased:
    $$\text{Prize Pool} = \text{Cards Sold} \times \text{Ticket Price} \times \frac{\text{Target RTP} - \text{Jackpot}\%}{100}$$
  - **Guaranteed Fixed (`rtpMode: "fixed"`)**: Fixed minimum guaranteed prize with automatic margin health tracking.
- **Telemetry & Health Indicators**:
  - Live tracking of Actual Realized RTP vs. Target RTP.
  - Health badges: `Optimal RTP`, `High Payout Risk` ($>95\%$), `Conservative Margin` ($<60\%$).
  - One-click **"Recalc"** action to recalculate prizes based on latest ticket velocity.

### 6.4 Multi-Stage Game Builder
- Create games with arbitrary winning stages.
- Configure stage sequence: assign pattern names, prize amounts, and toggle `continueAfterWin`.
- Operators can schedule the game for future execution or hit **"Start now"** to launch immediately.

### 6.4 Live Control Deck & Calling Console
The operational centerpiece for game supervisors:
- **Game Selector**: Switch seamlessly between active games (`Diamond 75`, `Turbo 30`, `Quick 80`).
- **Caller Controls**:
  - **Pause / Resume**: Temporarily freeze number calling.
  - **Call Next Ball**: Step balls manually.
  - **Manual Call Modal**: Force-call a specific number (validated against call history).
  - **Restart Game**: Reset round to Ball 1 with fresh random generation.
  - **Stop Game / Cancel Round**: Terminate game and trigger player refund workflows.
  - **Declare Winner**: Manual override to award prizes to specific players.
- **Claim Review Card**: Shows incoming Bingo claims with visual pattern card matches; operator can click **"Validate winner"** or **"Reject Bingo"**.

### 6.5 Pattern Builder & Canvas
- Interactive $5 \times 5$ grid editor.
- Click cells to toggle required winning locations (includes center `FREE` cell toggle).
- Rules configuration:
  - Toggle **Allow rotations** (90°, 180°, 270°).
  - Toggle **Allow mirroring** (horizontal reflections).
  - Minimum cells requirement counter.
- **Pattern Library**: Save, load, and test reusable patterns (`Diamond`, `Four Corners`, `X Shape`, `Full House`).

### 6.6 Weekly Game Scheduler
- Interactive visual weekly calendar (Monday through Sunday) with hourly time tracks.
- Color-coded badges representing room variants.
- Add, adjust, or view recurring, hourly, daily, and tournament game schedules.

### 6.7 Progressive Jackpot Management
- Telemetry for jackpot growth, starting values, and maximum liability caps.
- Controls:
  - **Manual Contribution Injection**: Inject promotional funds into the pool.
  - **Pause / Resume**: Freeze jackpot growth during maintenance.
  - **Reset Jackpot**: Safely reset pool to baseline amount with confirmation dialog.

### 6.8 Variant Customization Engine
- Configure standard and custom variants: 75-Ball, 90-Ball, 80-Ball, 30-Ball, 50-Ball.
- Set card layout dimensions (rows * columns), free space location, and winning rules.

### 6.9 Player CRM & Account Moderation
- Table of players with tier indicators (`VIP`, `Standard`, `Restricted`).
- Financial metrics per player: Lifetime entry, total winnings, current balance.
- Slide-over player profile:
  - Quick actions: *Suspend*, *Block*, *Restrict Bingo*, *Add Bonus Card*, *Add Promotional Ticket*, *View History*.

### 6.10 Financial Ledger & Transaction Audits
- Searchable transaction ledger with unique reference numbers (`TXN-`, `PAY-`, `JP-`, `REF-`, `PROMO-`).
- Summary indicators: Ticket purchases, prize payouts, refunds, and net cash flow.

### 6.11 Chat Moderation & Broadcast System
- Live message feed across all rooms.
- **Moderation Actions**: Delete message, mute user for 30 minutes, or ban from chat.
- **Operator Broadcast**: Push urgent or promotional announcements to a single room or network-wide.

### 6.12 Reports, Analytics & GGR Tracking
- Filter performance by Date Range, Room, Variant, and Currency.
- Visual daily ticket sales bar charts and variant revenue share donut chart.
- Validation KPIs: Payout ratio %, Average ticket entry, Claim validation success rate (98.6%).

---

## 7. Authentication & Identity Management

Authentication in the platform is managed via gateway identity headers (`app/chatgpt-auth.ts`):
- `oai-authenticated-user-id`: Unique, stable user ID.
- `oai-authenticated-user-email`: User email address.
- `oai-authenticated-user-full-name`: Percent-encoded UTF-8 full name.

### Helper API in `app/chatgpt-auth.ts`:
- `getChatGPTUser()`: Reads request headers and returns user identity or `null` for anonymous visitors.
- `requireChatGPTUser(returnTo)`: Enforces authentication on server-rendered pages, redirecting unauthenticated users to `/signin-with-chatgpt`.
- `chatGPTSignInPath(returnTo)` / `chatGPTSignOutPath(returnTo)`: Constructs safe relative redirect routes.

---

## 8. End-to-End System Data Flows & Lifecycles

### Complete Game Round Lifecycle

```
                  ┌─────────────────────────────────┐
                  │          SELLING PHASE          │
                  │  Players select & buy up to 8   │
                  │  cards; wallet balance debited  │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │         COUNTDOWN PHASE         │
                  │   5-second countdown to start   │
                  │      "Eyes down, good luck!"    │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │        LIVE CALLING PHASE       │
                  │  Numbers drawn at set speed     │
                  │  Auto-daub / Manual card daub   │
                  └────────────────┬────────────────┘
                                   │
                     Winning pattern matched OR
                     Player clicks "BINGO!"
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │       REVIEW / VALIDATION       │
                  │  1. Ownership audit             │
                  │  2. Called-number verification  │
                  │  3. Pattern geometric match     │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │           WINNER PHASE          │
                  │  Prizes awarded to wallet(s)    │
                  │  Progressive jackpot audit      │
                  │  System announcement in chat    │
                  └────────────────┬────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   │                               │
         More stages remain               Final stage complete
       (continueAfterWin = true)                   │
                   │                               ▼
                   ▼                     ┌───────────────────┐
     ┌───────────────────────────┐       │   RESULTS PHASE   │
     │   Advance to Next Stage   │       │ Round statistics  │
     │  (e.g., 2 Lines -> House) │       │   Open next game  │
     └─────────────┬─────────────┘       └───────────────────┘
                   │
                   └───────> Returns to Live Calling
```

### Ticket Purchase & Verification Flow

```
Player selects cards -> Checks wallet balance >= price -> Deducts balance -> Generates TRUEIG-XXXXXX reference -> Card seeds locked in state -> Displays in player HUD
```

### Claim Audit & Payout Flow

```
Claim initiated -> BingoEngine checks card cells against called numbers -> PatternValidator verifies active target shape -> If progressive, checks ball count <= limit -> PrizeEngine splits pool if multiple winners -> Credits player wallet -> Updates backoffice ledger
```

---

## 9. Summary & Quick Reference

- **To run the player frontend**: Start `npm run dev` and visit `http://localhost:3000/`.
- **To run the operator backoffice**: Visit `http://localhost:3000/backoffice`.
- **To configure rooms or live callers**: Open the backoffice, select **Live control** or **Bingo rooms**, and use the slide-over drawer to configure games, caller speeds, patterns, and payouts.

---

## 10. Dynamic Backend API & Database Persistence Reference

The application runs a dedicated Express backend (`server/index.ts`) backed by file-persisted JSON database (`data/bingo-db.json`) via `server/db/store.ts`.

### Database Schema Collections (`data/bingo-db.json`)
- `rooms`: Catalog of 75, 90, 80, 30, and 50-ball bingo rooms with custom/dynamic RTP configurations.
- `wallet`: Live player wallet balance with atomic debit/credit operations.
- `transactions`: Full ledger containing deposits, card purchases, prize payouts, jackpot contributions, and refunds.
- `gameSessions`: Live server-managed calling engine states, called numbers, current stage, and win validations.
- `tickets`: Purchased player cards with unique serialized cells and daub history.
- `jackpots`: 4 progressive tiers (`mega-trueig`, `major-trueig`, `minor-trueig`, `mini-trueig`) with live amounts and contributions.
- `tournaments`: Multi-stage elimination cups, seat limits, and real-time point standings.
- `promotions`: Dynamic marketing campaign catalog with claim verification, bonus codes, and rich media assets.
- `banners`: Dynamic lobby hero carousel slides configured with target rooms, media art, and CTAs.
- `chatMessages`: Live in-room player and admin broadcasts.
- `mutedUsers`: Active moderation blacklist.
- `patterns`: Stored pattern coordinate maps from Pattern Builder.
- `players`: Backoffice player registry with KYC/VIP tier levels and restriction controls.
- `auditFeed`: Operator telemetry audit log.

### Key API Endpoints

| Resource | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/api/health` | Service health and uptime |
| **Rooms** | `GET` | `/api/rooms` | List all rooms with active state |
| **Rooms** | `POST` | `/api/rooms` | Create new bingo room |
| **Rooms** | `PUT` | `/api/rooms/:id` | Update room settings (price, schedule) |
| **Rooms** | `POST` | `/api/rooms/rtp-policy` | Apply global network target RTP |
| **Game** | `GET` | `/api/game/:roomId/state` | Fetch server game caller session |
| **Game** | `POST` | `/api/game/:roomId/call-next` | Advance game caller by drawing next ball |
| **Game** | `POST` | `/api/game/:roomId/pause` | Pause live caller |
| **Game** | `POST` | `/api/game/:roomId/resume` | Resume live caller |
| **Game** | `POST` | `/api/game/:roomId/claim` | Verify and award player BINGO claim |
| **Tickets** | `GET` | `/api/tickets` | List user's purchased tickets |
| **Tickets** | `POST` | `/api/tickets/buy` | Buy tickets, deduct wallet, add cards |
| **Wallet** | `GET` | `/api/wallet` | Get balance and transaction history |
| **Wallet** | `POST` | `/api/wallet/deposit` | Deposit funds |
| **Jackpots** | `GET` | `/api/jackpots` | List all 4 dynamic progressive tiers |
| **Jackpots** | `POST` | `/api/jackpots/:id/contribute` | Add manual operator contribution |
| **Jackpots** | `POST` | `/api/jackpots/:id/reset` | Reset jackpot to seed amount |
| **Tournaments** | `GET` | `/api/tournaments` | List tournaments and live standings |
| **Tournaments** | `POST` | `/api/tournaments/:id/register` | Register seat for tournament |
| **Promotions** | `GET` | `/api/promotions` | List promotional offers (filter by category) |
| **Promotions** | `POST` | `/api/promotions/:id/claim` | Claim promotion bonus |
| **Promotions** | `PUT` | `/api/promotions/:id` | Admin toggle/update promotion |
| **Banners** | `GET` | `/api/banners` | List lobby hero carousel banners |
| **Chat** | `GET` | `/api/chat/:roomId` | Get chat messages for room |
| **Chat** | `POST` | `/api/chat/:roomId` | Post chat message |
| **Patterns** | `GET` | `/api/patterns` | List custom pattern presets |
| **Admin** | `GET` | `/api/admin/dashboard` | Telemetry KPIs, top rooms, event feed |
| **Admin** | `GET` | `/api/admin/players` | Backoffice player accounts |
| **Admin** | `POST` | `/api/admin/players/:id/action` | Restrict/suspend/mute player |

