# 🏆 Trueigtech Bingo: Tournaments Progression & 5-Stage Elimination Lifecycle

A complete guide to the **Dynamic Tournaments Hub**, **Interactive 5-Round Elimination Bracket**, **Real-Time Visual Stepper**, **Cut-off Qualification Engine**, and **Automated Prize Payout System** in Trueigtech Bingo.

---

## 🌟 1. System Architecture & Overview

The tournament system connects the **Player Frontend** and the **Backoffice Admin Console** through real-time bidirectional synchronization powered by Express REST endpoints, autonomous background timers, and Server-Sent Events (SSE).

```
┌──────────────────────────────────────────────┐        ┌──────────────────────────────────────────────┐
│           Player Frontend (:3000)            │        │           Admin Backoffice (:3000)           │
│                                              │        │                                              │
│  • Multi-Tournament Selector Cards Strip     │        │  • Multi-Tournament Switcher Tabs & Delete   │
│  • Visual Stepper with Pulsing Live Beacon   │        │  • [+ Create New Tournament] Modal Form      │
│  • Stage Status & Cut Line Context Banner    │        │  • Autonomous Auto-Progression Engine Panel  │
│  • NO Operator Buttons in Player View!       │        │  • Speed Selector (10s, 15s, 30s, 60s)       │
│  • Player Actions:                           │        │  • Scheduled Start Countdown Buttons         │
│    [Enter for $X] [🎮 Play Stage Room →]     │        │  • Manual Operator Controls & Overrides:     │
│    [View rules] [Set reminder]               │        │    [▶ Start] [🎲 Score] [⏩ Advance]        │
│  • Easy-to-Read Rules & Scoring System Cards │        │    [🏆 Crown Champion] [↺ Reset]             │
│  • Live Standings Table (Global/Qualified)   │        │  • Non-Colliding Table (12px 18px padding)   │
│  • Real-Time Wallet Update on Champion Win   │        │  • Real-Time Contender Bracket & Standings   │
└──────────────────────┬───────────────────────┘        └──────────────────────┬───────────────────────┘
                       │                                                       │
                       │ HTTP / SSE                                            │ HTTP / SSE
                       ▼                                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  Express Backend API Engine (:4000)                                  │
│                                                                                                      │
│   Autonomous Tournament Engine:                                  Sync Bus (SSE):                     │
│   • 1-Second Heartbeat Autonomous Progression Loop               • Channel: /api/sync/events         │
│   • Scheduled auto-start countdown timers                        • Entities:                         │
│   • Hands-free stage advancement on timer expiration               - "tournaments" (create, update,  │
│   • Automated scoring, cut evaluation & 3s celebration              start, score, advance,           │
│   • Automated single champion crowning & wallet credit               complete, delete, reset)        │
│                                                                    - "wallet" (fee deduction, prize) │
│   Endpoints:                                                       - "rooms" (tournament room state) │
│   • GET    /api/tournaments                 - List tournaments                                       │
│   • POST   /api/tournaments                 - Create tournament                                      │
│   • GET    /api/tournaments/:id             - Specific tournament                                    │
│   • POST   /api/tournaments/:id/register    - Player entry buy-in                                    │
│   • POST   /api/tournaments/:id/schedule    - Schedule auto-start timer                              │
│   • POST   /api/tournaments/:id/auto-config - Toggle hands-free engine                               │
│   • POST   /api/tournaments/:id/start       - Launch Stage 1                                         │
│   • POST   /api/tournaments/:id/score-stage - Score current round                                    │
│   • POST   /api/tournaments/:id/advance     - Advance to next round                                  │
│   • POST   /api/tournaments/:id/complete    - Crown champion & payout                                │
│   • POST   /api/tournaments/:id/reset       - Reset tournament for replay                            │
│   • DELETE /api/tournaments/:id             - Remove tournament                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 2. The 5-Stage Progressive Elimination Workflow

Trueigtech Bingo features a 5-round progressive elimination tournament (e.g. the **Weekend Cup** with a guaranteed **$25,000 prize pool**). Players must place above the stage cut line to advance to subsequent rounds.

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ STAGE 1          │     │ STAGE 2          │     │ STAGE 3          │     │ STAGE 4          │     │ STAGE 5          │
│ QUALIFIERS       │ ──► │ ROUND OF 256     │ ──► │ ROUND OF 128     │ ──► │ SEMI FINAL       │ ──► │ GRAND FINAL      │
│ 512 Players      │     │ 256 Players      │     │ 128 Players      │     │ 16 Players       │     │ 8 Finalists      │
│ Cut: Top 256 Adv │     │ Cut: Top 128 Adv │     │ Cut: Top 16 Adv  │     │ Cut: Top 8 Adv   │     │ Cut: 1 Champion  │
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
         │                        │                        │                        │                        │
         ▼                        ▼                        ▼                        ▼                        ▼
    Cut line: 256            Cut line: 128            Cut line: 16             Cut line: 8              Prize Pool ($25K):
  (Top 50% advance)        (Top 50% advance)        (Top 12.5% adv)          (Top 50% advance)        • 1st: $15,000 (60%)
                                                                                                      • 2nd: $6,250 (25%)
                                                                                                      • 3rd: $3,750 (15%)
```

### Stage Progression Rules:
1. **Stage 1: Qualifiers**
   - **Participants**: 512 players (registered human contenders + network pool).
   - **Cut Criteria**: Ranks #1 through #256 marked `Qualified`. Ranks #257+ marked `Eliminated`.
2. **Stage 2: Round of 256**
   - **Participants**: Top 256 qualified players.
   - **Cut Criteria**: Ranks #1 through #128 marked `Qualified`. Remaining contenders eliminated.
3. **Stage 3: Round of 128**
   - **Participants**: Top 128 qualified players.
   - **Cut Criteria**: Ranks #1 through #16 marked `Qualified`. High-stakes cutoff.
4. **Stage 4: Semi Final**
   - **Participants**: Elite 16 qualifiers.
   - **Cut Criteria**: Ranks #1 through #8 qualify for the Grand Final showdown.
5. **Stage 5: Grand Final**
   - **Participants**: Final 8 contenders.
   - **Outcome**:
     - Rank 1: **Champion** 🏆 (Wins **$15,000** - 60% of prize pool).
     - Rank 2: **Runner-up** 🥈 (Wins **$6,250** - 25% of prize pool).
     - Rank 3: **3rd Place** 🥉 (Wins **$3,750** - 15% of prize pool).
     - Ranks 4-8: **Finalists**.

---

## 🎨 3. Visual Round Stepper & Live Beacon Specifications

The interactive round stepper (`.tourney-stage-rail`) reflects real-time status:

```
[  ✓ QUALIFIERS  ] ─── [ 🔴 2 ROUND OF 256 ] ─── [  3 ROUND OF 128  ] ─── [  4 SEMI FINAL  ] ─── [  5 GRAND FINAL  ]
     Completed               LIVE NOW · In Prog         Scheduled                 Scheduled              Scheduled
  Cut line cleared            256 → 128 advance      Top half advance          Top half advance         1 Champion
```

### Visual States:

| Round State | Badge Icon | Border & Background | Label & Subtitle | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Active / Live Now** | Red number with pulsing beacon dot | Glowing neon border, active red/violet gradient | `🔴 LIVE NOW` (or `STAGE X LIVE`) | e.g. `256 → 128 advance` |
| **Stage Scored** | Checkered flag `🏁` | Amber highlight, scored border | `🏁 Round Scored` | Standings finalized |
| **Completed** | Green checkmark `✓` | Solid green accent border (`#2bddaa`) | `✓ Completed` | Cut line passed |
| **Upcoming / Scheduled** | Stage number (`2`, `3`, `4`, `5`) | Subtle muted border and background | `Scheduled` (or `Starts Next`) | Stage target cut |
| **Connecting Lines** | Solid green path between completed stages, muted between upcoming stages |

---

## 🕹️ 4. Player & Operator Control Suite

To ensure fair play and prevent accidental or unauthorized triggers, **operator controls have been strictly separated from the player experience**:

### 4.1 When Tournament is in "Registration Open":
- **Player Actions**:
  - `Enter for $X` (deducts entry fee from player wallet, adds player to standings).
  - Once registered, displays `🎮 Open Tournament Room` and `⚡ Registered · Awaiting Auto-Start`.
  - Players **never** see operator start buttons.
- **Backoffice Admin Actions**:
  - `▶ Start Tournament (Qualifiers)` (manual force start).
  - Quick Schedule buttons: `In 30s`, `In 1m` (initiates autonomous server countdown).
  - `⚡ Auto-Run: ON / OFF` toggle and round duration speed selector.

### 4.2 When Tournament is "Live" (`in_progress`):
- **Player Actions**:
  - `🎮 Play Stage X (StageName) →` (enters the live tournament bingo room).
  - Live round countdown timer (`00:14`) and stage cut context indicator (`Top 256 advance`).
  - Automatically receives live scoring and qualification updates when the round timer ends.
- **Backoffice Admin Actions**:
  - `🎲 Score Stage X` (manual force score if not running on auto-pilot).
  - Live cut timer monitor.

### 4.3 When Tournament Stage is "Scored" (`scored`):
- **Player Actions**:
  - Real-time celebration/review banner displaying qualification or elimination result.
  - Automatically transitions to the next stage after 3 seconds when auto-run is enabled.
- **Backoffice Admin Actions**:
  - `▶ Advance to Stage X+1` (manual force advance).
  - `🏆 Crown Champion & Finish Tournament` (manual finish if Grand Final).

### 4.4 When Tournament is "Completed":
- **Player Actions**:
  - Champion victory card: `🏆 TOURNAMENT COMPLETED · Champion won $15,000`.
  - `↻ Switch to Next Tournament` selector cards.
  - Right sidebar displays final standing rank.
- **Backoffice Admin Actions**:
  - `↺ Reset Tournament` (resets standings and stages for a fresh run).
  - Delete tournament (if multiple tournaments exist).

---

## 📊 5. Dynamic Player Status & Standings

All player cards and tables are dynamic and reflect the authenticated user:

### 5.1 "Your Tournament Status" Card (Right Sidebar):
- **My Position**: Displays real rank (e.g. `#1`, `#5`) calculated from `activeTourney.standings`.
- **Points**: Current accumulated stage points (e.g. `85 points`, `340 points`).
- **Cut Line Distance**:
  - If above cut line: `✓ Inside cut line (#128 advance)`.
  - If below cut line: `N ranks behind #128 cut line`.
  - If eliminated: `Eliminated in prior stage`.
  - If champion: `🏆 You Won 1st Place!`.
- **Prize Pool Breakdown**: Collapsible drawer detailing 1st ($15,000), 2nd ($6,250), and 3rd ($3,750).

### 5.2 Live Standings Table:
- **Scope Filters**:
  - `Global`: All registered contenders.
  - `Qualified`: Only players currently above the cut line or marked `Qualified` / `Champion`.
  - `Friends`: Filter by user's network friends.
- **Player Row Styling**: Current logged-in user is tagged with `(You)` in bold violet with an active row border.
- **Status Pills**:
  - `🏆 Champion` (Gold gradient)
  - `Qualified` (Teal badge `#2bddaa`)
  - `In Play` (Blue badge)
  - `Eliminated` (Red badge `#ff4757`)

---

## 🔌 6. Backend API Reference

### 6.1 List Tournaments
`GET /api/tournaments`
- **Response**: `{ success: true, tournaments: Tournament[] }`

### 6.2 Register for Tournament
`POST /api/tournaments/:id/register`
- **Headers**: `x-session-token: <token>` (or `x-player-username: <username>`)
- **Body**: `{ playerName?: string }`
- **Actions**:
  - Resolves authenticated player.
  - Deducts `t.entryFee` ($8.00) from player balance.
  - Adds player to `registeredPlayers` and `standings`.
  - Emits `syncBus` event `"tournaments"` and `"wallet"`.
- **Response**: `{ success: true, tournament: Tournament, wallet: number, message: string }`

### 6.3 Start Tournament
`POST /api/tournaments/:id/start`
- **Actions**:
  - Sets `status: "Live"`, `currentRoundIndex: 0`, `currentStageName: "Qualifiers"`, `stageStatus: "in_progress"`.
  - Ensures all registered contenders are populated in `standings`.
  - Sets tournament room in `store.rooms` to `status: "Live"`.
  - Emits real-time SSE event to all connected clients.
- **Response**: `{ success: true, tournament: Tournament }`

### 6.4 Score Tournament Stage
`POST /api/tournaments/:id/score-stage`
- **Body**: `{ playerScores?: Array<{ player: string, points: number, wins?: number, fast?: string }> }` (Optional: if empty, runs dynamic simulation scoring).
- **Actions**:
  - Updates points, wins, and fastest bingo times.
  - Sorts standings by points descending.
  - Applies cut-off rules:
    - Stages 1-4: Top contenders marked `Qualified`, bottom contenders marked `Eliminated`.
    - Stage 5 (Grand Final): Rank 1 is `Champion`, Ranks 2-3 are `Runner-up`, remaining are `Finalist`.
  - Sets `stageStatus: "scored"`.
- **Response**: `{ success: true, tournament: Tournament }`

### 6.5 Advance Tournament Stage
`POST /api/tournaments/:id/advance`
- **Actions**:
  - Increments `currentRoundIndex` (0 $\to$ 1 $\to$ 2 $\to$ 3 $\to$ 4).
  - Updates `currentStageName = t.rounds[currentRoundIndex]`.
  - Sets `stageStatus: "in_progress"`.
  - Updates tournament bingo room header.
  - Emits SSE event across all clients.
- **Response**: `{ success: true, tournament: Tournament }`

### 6.6 Complete Tournament & Award Prizes
`POST /api/tournaments/:id/complete`
- **Body**: `{ winnerName?: string }`
- **Actions**:
  - Finalizes `winner = winnerName || standings[0].player`.
  - Sets `status: "Completed"`, `stageStatus: "completed"`.
  - Calculates prize distribution: 60% ($15,000), 25% ($6,250), 15% ($3,750).
  - Credits $15,000 directly to champion's player account balance.
  - Creates transaction record: `type: "Prize payout"`, `amount: 15000`.
  - Emits SSE wallet and tournament event.
- **Response**: `{ success: true, tournament: Tournament, champion: string, payout: number, wallet: number }`

### 6.7 Reset Tournament
`POST /api/tournaments/:id/reset`
- **Actions**:
  - Resets `status: "Registration open"`, `currentRoundIndex: 0`, `stageStatus: "waiting"`.
  - Clears `winner` and resets player points to 0.
- **Response**: `{ success: true, tournament: Tournament }`

### 6.8 Schedule Auto-Start Countdown
`POST /api/tournaments/:id/schedule`
- **Body**: `{ delaySeconds: number, cancel?: boolean }`
- **Actions**:
  - Sets a live countdown timer (e.g. 30s, 60s, or custom seconds).
  - Background ticker decrements countdown every second and broadcasts live ticker pulses via SSE.
  - When countdown reaches 0:00, the server automatically launches Stage 1 (Qualifiers) without human intervention!
- **Response**: `{ success: true, tournament: Tournament, message: string }`

### 6.9 Configure Auto-Progression Engine
`POST /api/tournaments/:id/auto-config`
- **Body**: `{ autoMode?: boolean, roundDuration?: number, isPaused?: boolean }`
- **Actions**:
  - Toggles hands-free auto-progression (`autoMode: true/false`).
  - Sets custom round duration in seconds (e.g. 10s, 15s, 30s, 60s).
- **Response**: `{ success: true, tournament: Tournament, engine: TournamentEngineConfig }`

---

## ⚡ 7. Hands-Free Automated Progression Engine

The server-side **Tournament Engine** (`server/services/tournament-engine.ts`) runs an autonomous 1-second pulse that completely eliminates the need for manual clicking during live tournament operations:

1. **Auto-Start on Countdown Expiry**:
   - Backoffice schedules start time (or immediate launch).
   - Once the timer hits 0:00, the engine automatically initializes Stage 1.
2. **Autonomous Round Execution**:
   - Stage runs for the configured `roundDuration` (default 15s, or custom).
   - Ticker decrements `stageSecondsRemaining` in real time.
3. **Automated Cut Line Scoring**:
   - When round timer expires, engine automatically executes `scoreStage()`.
   - Players are evaluated against progressive cut criteria (`Qualified` vs `Eliminated`).
   - 3-second celebration/review window displays real-time results and qualification banners.
4. **Auto-Advancement to Next Round**:
   - After the 3-second window, the engine seamlessly triggers `advanceStage()`.
   - Repeats from Stage 1 through Stage 5 Grand Final.
5. **Single Grand Champion Crowning & Direct Wallet Payout**:
   - Grand Final automatically finishes and crowns the **single 1st place champion**.
   - First place prize ($15,000) is credited directly to the winner's wallet and logged to the ledger.

---

## 🎛️ 8. Strict Player vs. Operator Role Separation

As requested by the user, **operator/administrative controls have been completely removed from the Player Frontend**:
- **Player Frontend (`TournamentLobby.tsx`)**:
  - **No** `▶ Start Tournament` button.
  - **No** `🎲 Score & End Round` button.
  - **No** `Advance to Stage` button.
  - **No** `Crown Champion` button.
  - **No** `Reset Tournament` button.
  - In player view, players only see:
    - `Enter for $X` (when not registered).
    - `🎮 Open Tournament Room` (when registered).
    - `🎮 Play Stage X Room →` (when live).
    - `View rules` and `Set reminder`.
    - Real-time status pills explaining hands-free round progression.
- **Backoffice Admin (`TournamentAdmin.tsx`)**:
  - Home for all operator actions (auto-run engine toggle, round speed selector, scheduled start countdowns, manual force scoring/advance/crown/reset controls).

---

## 🌐 9. Multi-Tournament System & Backoffice Creation

The platform now natively supports multiple concurrent and scheduled tournaments:

### 9.1 Seeded Default Tournaments:
1. **`weekend-cup`**: "Trueigtech Weekend Cup" — $25,000 Guaranteed, $8 entry fee, 5 stages (Qualifiers → Round of 256 → Round of 128 → Semi Final → Grand Final).
2. **`daily-masters`**: "Daily High Roller Masters" — $50,000 Guaranteed, $25 entry fee, 4 stages (Open Heat → Quarterfinal → Semifinal → Grand Final).
3. **`speed-sprint`**: "Turbo 30 Speed Sprint" — $10,000 Guaranteed, $5 entry fee, 3 stages (Sprint Qualifiers → Semi-Sprint → Speed Final).

### 9.2 Player Frontend Tournament Selector:
- A responsive card carousel (`.tourney-selector-section`) at the top of the lobby displays all tournaments with:
  - Event name and description.
  - Guaranteed prize pool badge ($25K, $50K, $10K).
  - Status pill (LIVE NOW, REGISTRATION OPEN, FINISHED).
  - Buy-in fee.
  - One-click event switching.

### 9.3 Backoffice "+ Create Tournament" Modal:
- Operators can dynamically create custom tournaments via the Backoffice "+ Create New Tournament" modal:
  - Name and Description.
  - Buy-in fee ($) and Guaranteed Prize Pool ($).
  - Max Contenders capacity.
  - Stage tiers preset (3 Stages Sprint, 4 Stages Standard, 5 Stages Grand Championship).
  - Start schedule text.
- Instant synchronization via `apiClient.tournaments.create` and Server-Sent Events!

---

## 📜 10. Easy-to-Read Rules & Scoring System Guide

A dedicated visual guide (`.tourney-rules-guide`) is embedded directly into the player lobby, organized into 4 intuitive cards:
1. **🎟️ 1. Buy-In & Seat Allocation**: Buy in from account balance, instant seat assignment into Stage 1.
2. **🔢 2. Dynamic Points Matrix**:
   - Single Line Win: **10 pts**
   - Pattern Win: **25 pts**
   - Full House / Blackout: **50 pts**
   - Fast Bingo Bonus (<25 balls): **+15 pts**
   - Round Winner Bonus: **+40 pts**
3. **✂️ 3. Progressive Elimination Cuts**:
   - Stage 1 Qualifiers: Top 256 advance (out of 512)
   - Stage 2 Round of 256: Top 128 advance
   - Stage 3 Round of 128: Top 16 advance
   - Stage 4 Semi Final: Top 8 advance
   - Stage 5 Grand Final: 8 → 1 Champion!
4. **🏆 4. Prize Payout & Hands-Free Engine**:
   - 1st Place Champion: 60% ($15,000 in Weekend Cup) credited straight to winner balance.
   - 2nd Place Runner-up: 25% ($6,250).
   - 3rd Place Semi-finalist: 15% ($3,750).
   - Hands-Free Auto Engine: Zero clicks needed to advance.

---

## 🧪 11. Automated Testing & Verification

### 11.1 Automated API Tests (Node Test Runner)
```bash
node --test tests/api.test.mjs
```
*Result: 25/25 tests passing (0 failures).*

### 11.2 Interactive Multi-Stage E2E Test
```bash
node tests/browser-tournaments-e2e.mjs
```
*Result: All 12 stages, room transitions, and $15,000 prize payout verified.*

### 11.3 Hands-Free Auto-Progression E2E Test
```bash
node tests/browser-tournaments-auto-e2e.mjs
```
*Result: Scheduled countdown, hands-free round transitions, and completed state validation passed 100%.*

### 11.4 Full UI & Role Verification Test
```bash
node tests/test-verify-ui.mjs
```
*Result: Verified zero operator buttons in Player Lobby, multi-tournament switcher cards, rules guide, and Backoffice Create Tournament modal.*

### 11.5 Screenshots Reference
- `32-backoffice-fixed-table-and-auto-console.png`: Spaced Backoffice table with status badges and auto-engine console.
- `33-player-auto-scheduled-countdown.png`: Scheduled auto-start countdown banner in player lobby.
- `34-player-hands-free-stage-progression.png`: Live round progression with real-time standings.
- `35-player-tournament-completed-no-enter-button.png`: Finished tournament view with Champion card and no "Enter for $8" button.
- `36-player-lobby-multi-tournaments-and-rules.png`: Overhauled Player Lobby showing Multi-Tournament cards and clean hero.
- `37-backoffice-create-tournament-modal.png`: Backoffice tournament switcher tabs and "+ Create New Tournament" modal.
- `38-player-tournament-rules-guide.png`: Clean 4-card Tournament Rules & Scoring System guide in player lobby.
