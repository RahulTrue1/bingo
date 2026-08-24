# Trueigtech Bingo Demo — Project Guide & Architecture

Welcome to the **Trueigtech Bingo Demo** codebase! This document provides a complete guide to the project's directory structure, software architecture, key logic components, user interface elements, and deployment configurations.

---

## 📂 Project Directory Structure

Below is an overview of the directories and configuration files in this project:

```
├── .openai/
│   └── hosting.json              # Sites D1 and R2 bindings configuration
├── app/
│   ├── layout.tsx                # Next.js Root Layout & dynamic metadata generator
│   ├── page.tsx                  # Interactive client-side Bingo game (Player & Backoffice shells)
│   ├── globals.css               # Premium styling & theme rules for all screens
│   ├── bingo-core.ts             # Pure functions, structures, engines, and validators
│   └── chatgpt-auth.ts           # ChatGPT Auth (SIWC) headers mapping helpers
├── build/
│   └── sites-vite-plugin.ts      # Custom Vite plugin for packaging builds and migrations
├── db/
│   ├── index.ts                  # Drizzle ORM client initialization with Cloudflare D1
│   └── schema.ts                 # Database schema definitions (SQLite)
├── drizzle/                      # Generated database migration files
├── examples/
│   └── d1/                       # Optional Cloudflare D1 implementation example
├── tests/
│   └── rendered-html.test.mjs    # Automated loading skeleton and DOM hierarchy test suite
├── worker/
│   └── index.ts                  # Cloudflare Worker entry point & image optimization handler
├── drizzle.config.ts             # Drizzle Kit migration configuration
├── eslint.config.mjs             # Linting rules for TypeScript, React & Next.js
├── next.config.ts                # Next.js configurations
├── package.json                  # Dependencies, scripts, and runtime engines configuration
├── postcss.config.mjs            # PostCSS Tailwind config
├── tsconfig.json                 # TypeScript compiler configuration
└── vite.config.ts                # Vite configurations simulating local Cloudflare bindings
```

---

## 🛠️ Technology Stack

The project runs on a modern serverless edge architecture:
1. **Core Framework**: [Vinext](https://github.com/cloudflare/vinext) — A lightweight framework running Next.js App Router applications directly on Cloudflare Workers.
2. **Database (ORM)**: [Drizzle ORM](https://orm.drizzle.team/) configured for a **Cloudflare D1 SQLite** database.
3. **Styling**: Modern, premium CSS (using Tailwind CSS 4 setup via `postcss.config.mjs` and native CSS tokens in `globals.css`).
4. **Local Runtime**: Local emulation of Cloudflare D1, R2, and Images bindings via `@cloudflare/vite-plugin` and Wrangler.
5. **Testing**: Native Node.js test runner validating SSR outputs and loading state constraints.

---

## 🎲 Core Game Logic (`app/bingo-core.ts`)

The backend engine and core data structures of the Bingo application are contained in `app/bingo-core.ts`:

- **Types & Enums**: Defines Bingo room states (`Live`, `Selling Tickets`, `Starting Soon`, `Open`, `Scheduled`), card structures (`BingoCardCell`), and room profiles (`BingoRoomData`).
- **Ticket Generation**:
  - `make75Card(seed)`: Generates a standard $5 \times 5$ Bingo grid for 75-Ball games, including the central `FREE` square.
  - `make90Ticket(seed)`: Generates a traditional $3 \times 9$ ticket layout containing 15 numbers and 12 blank spaces.
  - `makeGridCard(rows, columns, ballCount, seed)`: Procedurally builds grid tickets for custom variants like 30-Ball (Speed) or 80-Ball.
- **Engines**:
  - `BingoEngine`: Handles selection of subsequent numbers from the remaining set and generates ball labels (e.g., `B-12`).
  - `PatternValidator`: Detects winning shapes such as `Four Corners` or calculates completion percentages for daubed cards.
  - `PrizeEngine`: Manages payout divisions in the event of tie wins.
  - `JackpotEngine`: Approportions ticket revenues to progressive jackpots.
  - `TransactionManager`: Generates unique transaction audit records (e.g., `TRUEIG-123456`).

---

## 🖥️ User Experience & UI (`app/page.tsx`)

The interface consists of two key modes of operation managed under a single-page architecture:

### 1. Player Experience Shell
- **Lobby View**: Features a high-fidelity carousel showcasing top progressive jackpots, featured game rooms, search filters for game types (Live, Speed, 75/90-Ball, Free), and live wins feeds.
- **Active Game Room View**:
  - Interactive board showing the called balls and game progress rails (Selling → Countdown → Live → Validation → Winner → Results).
  - Virtual card grids displaying live daubed cells (supports **Auto-Daub** and manual selection).
  - Interactive chat panel and live leaderboards.
  - Interactive **BINGO!** claim overlay which mimics real-time ticket audits and displays win announcements.
- **Supporting Views**:
  - **Tickets**: Review scheduled cards and join rooms.
  - **Jackpots**: Live progressive jackpot pools.
  - **Tournaments**: Standard tournament leaderboards showing qualified players.
  - **History**: Historical list of previous entries and prizes.
  - **Profile**: Account statistics and notifications.

### 2. Admin Backoffice Experience Shell
- **Dashboard**: High-level telemetry of the bingo network. Real-time graphs for ticket revenue versus payouts, live room activity widgets, top-performing room tables, and operational audit feeds.
- **Room Management**: View and modify live game parameters, duplicate setups, or adjust ticket fees instantly.
- **Live Control Console**: Operator-facing deck allowing manual calling override, game-loop controls (Pause/Resume/Restart/Cancel), and live validation workflow moderation.
- **Pattern Builder**: A $5 \times 5$ canvas permitting operators to draw, test, and save custom matching patterns.
- **Scheduler**: A weekly scheduling deck displaying scheduled games and timing.
- **Variants Builder**: Configuration panel for card layout sizing and default rules.
- **Reports, Transactions, and Moderation Logs**: Complete audit tables for users, transactions, promotional rewards, and live chat queues.

---

## 🔌 Authentication & Workspace Integration

Signed-in workspace users have identity attributes forwarded via custom gateway HTTP headers:
- `oai-authenticated-user-id`
- `oai-authenticated-user-email`
- `oai-authenticated-user-full-name` (percent-encoded UTF-8)

`app/chatgpt-auth.ts` exposes helper functions to read and enforce identity:
- `getChatGPTUser()`: Extracts user identifiers from headers.
- `requireChatGPTUser(returnTo)`: Automatically redirects anonymous traffic to `/signin-with-chatgpt`.
- `chatGPTSignInPath(returnTo)` / `chatGPTSignOutPath(returnTo)`: Helper routes to navigate auth redirects safely.

---

## 🚀 Running & Building

Manage the project locally using the following scripts:

- **Local Dev Server**:
  ```bash
  npm run dev
  ```
  Runs the local dev environment via Vinext and Wrangler, mocking database structures locally under `.wrangler/`.

- **Production Build**:
  ```bash
  npm run build
  ```
  Assembles files for production, triggering the custom Vite plugin `sites` to bundle migration states.

- **Drizzle Database Migrations**:
  ```bash
  npm run db:generate
  ```
  Scans `db/schema.ts` and writes schema migrations to `drizzle/`.

- **Test Suite**:
  ```bash
  npm test
  ```
  Runs Vite build and starts the native Node.js test runner (`tests/rendered-html.test.mjs`) verifying layout constraints.
