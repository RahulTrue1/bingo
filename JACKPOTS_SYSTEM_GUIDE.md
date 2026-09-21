# 💎 Trueigtech Bingo: Progressive Jackpots System & Full Flow Guide

A comprehensive architectural and operational guide to the **Dynamic Progressive Jackpots Hub**, **Backoffice Multi-Jackpot Management Console**, **Real-Time Ticket Contribution Engine**, **Qualifying Pattern Rules**, and **Automated Wallet Payouts** in Trueigtech Bingo.

---

## 🌟 1. System Architecture & Overview

The Progressive Jackpots system provides real-time pot growth, multi-room contribution pooling, qualification validation, and automated wallet payouts across the **Player Frontend** and **Backoffice Admin Console**, synchronized via Express REST APIs and Server-Sent Events (SSE).

```
┌──────────────────────────────────────────────────────────┐        ┌──────────────────────────────────────────────────────────┐
│                 Player Frontend (:3000)                  │        │                 Admin Backoffice (:3000)                 │
│                                                          │        │                                                          │
│  • Jackpots Hub (/jackpots):                             │        │  • Multi-Jackpot Switcher Tabs                           │
│    - Dynamic Jackpot Ladder (all active pots)            │        │  • [+ Create New Jackpot] Modal Form                     │
│    - Selected Pot Hero with Live Ticking Value           │        │  • [✎ Edit Configuration] Modal                          │
│    - 3-Step Qualification Path                           │        │  • Quick Operator Actions:                               │
│    - Dynamic Contributing Rooms Table with [Join Room]   │        │    - [+ Add contribution] (manual seed injection)        │
│    - Real Recent Winner Strip                            │        │    - [🏆 Trigger Win / Payout] (wallet credit & reset)   │
│    - Dynamic Rules & Eligibility Modal                   │        │    - [↺ Reset to Base]                                   │
│  • Player Lobby (/):                                     │        │    - [🗑 Delete Jackpot]                                 │
│    - Live Top Jackpot Chip Counter                       │        │  • Dynamic Liability Meter (% vs. Maximum Cap)           │
│    - "Jackpots" Room Filter                              │        │  • Real-Time Contribution & Win History Ticker           │
│  • In-Game Room (/room/:id):                             │        │  • Linked Bingo Rooms Multi-Select Tagging               │
│    - Live Progressive Pot Display in Topbar              │        │                                                          │
│    - Celebratory Full House Progressive Win Modal        │        │                                                          │
└────────────────────────────┬─────────────────────────────┘        └────────────────────────────┬─────────────────────────────┘
                             │                                                                   │
                             │ HTTP / SSE                                                        │ HTTP / SSE
                             ▼                                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              Express Backend API Engine (:4000)                                              │
│                                                                                                                              │
│   Progressive Growth Engine:                                         Sync Bus (SSE) Channel:                                 │
│   • Ticket Purchase Hooks in /api/tickets/buy:                       • /api/sync/events                                      │
│     - Calculates pot boost: totalCost * (contrib% / 100)             • Entities:                                             │
│     - Increments room.jackpot & mainJp.currentAmount                   - "jackpots" (create, update, contribute, win,         │
│     - Appends "Ticket contribution" to jackpot history                   reset, delete)                                      │
│   • Win Evaluation & Wallet Payouts (/api/jackpots/:id/trigger):       - "wallet" (credit payout, balance sync)              │
│     - Credits full pot to winner player balance in store.players       - "rooms" (live jackpot amount on linked rooms)       │
│     - Records completed transaction in store.transactions                                                                    │
│     - Resets jackpot to resetAmount                                  Endpoints:                                              │
│                                                                      • GET    /api/jackpots           - List all jackpots    │
│                                                                      • POST   /api/jackpots           - Create custom pot    │
│                                                                      • GET    /api/jackpots/:id       - Specific pot details │
│                                                                      • PUT    /api/jackpots/:id       - Update configuration │
│                                                                      • POST   /api/jackpots/:id/contribute - Manual seed     │
│                                                                      • POST   /api/jackpots/:id/trigger    - Award win & pay │
│                                                                      • POST   /api/jackpots/:id/reset      - Reset to base   │
│                                                                      • DELETE /api/jackpots/:id       - Remove pot           │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 2. Complete End-to-End Jackpot Lifecycle

```
 ┌───────────────────────────────────────────────────────────────────────────────────────────────┐
 │ 1. CREATION (Backoffice)                                                                      │
 │ Operator creates jackpot: Name, Variant, Seed ($10K), Cap ($100K), Contrib (2.5%), Pattern,   │
 │ Ball Limit (42), Base Price ($2.00), and links rooms.                                         │
 └───────────────────────────────┬───────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────────┐
 │ 2. POT ACCUMULATION (Ticket Purchases)                                                        │
 │ Players purchase cards in linked rooms. Backend deducts ticket price and adds:                │
 │ contribution = ticketPrice * (contributionPercent / 100) directly into the jackpot pot.      │
 │ SSE broadcasts new pot value to all player lobbies and game rooms in real time.               │
 └───────────────────────────────┬───────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────────┐
 │ 3. QUALIFICATION & CHASE (Live Game Room)                                                     │
 │ Players play live bingo in linked rooms.                                                      │
 │ Winning Condition: Complete designated pattern (e.g. Full House) within the qualifying        │
 │ ball limit (e.g. <= 42 balls called).                                                         │
 └───────────────────────────────┬───────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────────┐
 │ 4. WIN TRIGGER & WALLET PAYOUT                                                                │
 │ - Winner scores Full House in <= 42 calls (or Backoffice triggers manual win).                │
 │ - Total pot (e.g. $127,481) is credited directly to the winner's account balance.            │
 │ - Completed "Prize payout" transaction record created in the financial ledger.                │
 │ - History record appended: "Jackpot Won · Payout".                                            │
 │ - SSE broadcast: "🏆 Ari.R WON the Mega Trueig Jackpot for $127,481!"                         │
 └───────────────────────────────┬───────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────────┐
 │ 5. AUTOMATED RESET                                                                            │
 │ Jackpot automatically resets to its configured resetAmount (e.g. $50,000 seed).               │
 │ Linked rooms update their room.jackpot to the reset value and the chase begins anew!          │
 └───────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎮 3. Player Experience & Placement

The progressive jackpot system is integrated seamlessly throughout the player experience:

### 3.1 Dedicated Jackpots Hub (`/jackpots`)
Accessed via the main navigation bar **"Jackpots"** tab:
1. **Dynamic Jackpot Ladder**:
   - Displays interactive cards for every configured jackpot (`Mega Trueig`, `Major Trueig`, `Minor Trueig`, `Mini Trueig`, and custom pots like `Golden Dragon`).
   - Shows live value in glowing gold, game variant, qualifying pattern, difficulty, and reward tier.
   - Clicking any card selects it and updates the entire hub in real time.
2. **Selected Jackpot Hero**:
   - Shows real-time dynamic value (e.g. `$127,481`), live pulse beacon (`+Live $42.00`), and qualifying pattern.
   - **`Play for $X` button**: Directly enters the primary contributing room.
3. **Your Path to Qualify (3-Step Guide)**:
   - Step 1: Choose an eligible room (e.g. 75-Ball rooms marked "Contributing").
   - Step 2: Buy a qualifying ticket (e.g. `$2.00` minimum).
   - Step 3: Complete the pattern within the qualifying ball limit (e.g. Full House in 42 calls).
4. **Jackpot Pulse Sidebar**:
   - **Reset amount**: Starting baseline when won.
   - **Contribution per ticket**: Percentage rate added to the pot.
   - **Active contributors**: Live player count.
   - **Qualifying limit**: Maximum balls called to win.
   - **Player reminder toggle**: Sets notification reminder.
5. **Dynamic "Games Contributing Now" Table**:
   - Lists all rooms linked to this jackpot.
   - Displays Room name with "● Contributing" badge, ticket price, active player count, dynamic contribution amount (`+$X per ticket`), game type, and qualifying rule.
   - **`Join room` button**: Navigates the player directly into that live room!
6. **Recent Winner Banner**:
   - Real-time strip displaying the latest jackpot winner from the database (e.g. `🏆 Ari.R won $42,180 in Mega Trueig Jackpot`).
7. **Dynamic Rules & Eligibility Modal**:
   - Opened via "View full rules & eligibility" link.
   - Details specific buy-in criteria, split rules for simultaneous winners, ball limit thresholds, and payout procedure.

### 3.2 Player Lobby (`/`)
- **Top Chip**: Displays the highest active jackpot amount dynamically (e.g. `✦ Jackpot Bingo · $127,481 live`).
- **"Jackpots" Filter**: Filters the room grid to show only rooms linked to progressive jackpots.
- **Room Cards**: Display progressive jackpot badge with live amount.

### 3.3 Live Game Room (`/room/:id`)
- **Header Badge**: Shows the live ticking jackpot value.
- **Progressive Win Celebration**:
  - If a player claims Full House within the qualifying ball count (e.g. 38 balls <= 42 ball limit):
  - Displays golden celebration banner: `🏆 PROGRESSIVE JACKPOT HIT within 38 balls (under 42 limit)!`.
  - Automatically awards the jackpot, credits the player's wallet balance, and logs the win.

---

## 🛠️ 4. Backoffice Operator Console

Operators have full control over progressive jackpots from the Backoffice **Jackpots** menu:

### 4.1 Multi-Jackpot Switcher Tabs
- Modern horizontal tabs along the top showing each jackpot's Name, Live Amount, and Variant.
- Instant switching between jackpots.
- **`+ Create New Jackpot` button** located directly on the tab bar.

### 4.2 "+ Create New Jackpot" Modal Form
Allows operators to configure custom jackpots dynamically:
- **Jackpot Name**: Custom event name (e.g. "Golden Dragon Jackpot").
- **Game Variant**: `75-Ball Progressive`, `90-Ball Classic`, `30-Ball Speed`, `75-Ball Pattern`, `80-Ball Shutter`.
- **Contribution Rate (%)**: 0.5% to 10.0% of ticket sales.
- **Starting Seed ($)**: Initial pot value.
- **Current Value ($)**: Active live value.
- **Reset Value ($)**: Amount to reset to upon winning.
- **Maximum Cap ($)**: Maximum liability ceiling.
- **Ticket Base Price ($)**: Minimum ticket price required.
- **Qualifying Pattern**: e.g. "Full House", "Coverall", "4 Corners".
- **Qualifying Ball Limit**: Maximum number of balls (e.g. 42).
- **Difficulty & Reward Badges**: Legendary / Hard / Medium / Easy; Life-changing / Huge / Great / Nice.
- **Card Icon**: 💎 Diamond / ⭐ Star / ♣ Club.
- **Link to Contributing Rooms**: Multi-select checklist linking specific rooms.

### 4.3 Operator Actions & Overrides
- **`● LIVE ACTIVE` / `○ DISABLED` Toggle**: Instantly enables or disables pot accumulation.
- **`+ Add contribution`**: Inject manual seed adjustments ($500, $1,000, $2,500, $5,000, or custom).
- **`🏆 Trigger Win`**: Award the progressive jackpot to any player username (e.g. "Ari.R"). Credits wallet instantly, records transactions, and resets the pot.
- **`↺ Reset`**: Reset the jackpot to its baseline seed value with confirmation.
- **`✎ Edit`**: Open the configuration modal to modify rules and caps.
- **`🗑 Delete`**: Remove the jackpot cleanly (with safeguard preventing deletion of the last remaining jackpot).

### 4.4 Dynamic Liability Meter
- Calculates: `(currentAmount / maximumAmount) * 100%`.
- Color-coded bar:
  - Green/Gold: Healthy reserve level (<80%).
  - Crimson Warning: Near maximum liability cap (>80%).

### 4.5 Real Contribution & Win History Ticker
- Logs every pot transaction in real time:
  - `↗ Ticket contribution`: +$X from ticket purchases with timestamp and player username.
  - `⚙ Manual adjustment`: +$X operator seed additions.
  - `🏆 Jackpot Won · Payout`: +$X jackpot win payouts with winner username.

---

## 🔌 5. Backend REST API Reference

### 5.1 List All Jackpots
`GET /api/jackpots`
- **Response (`200 OK`)**:
```json
{
  "success": true,
  "jackpots": [
    {
      "id": "mega-trueig",
      "name": "Mega Trueig Jackpot",
      "variant": "75-Ball Progressive",
      "currentAmount": 127480.6,
      "startingAmount": 50000,
      "maximumAmount": 250000,
      "resetAmount": 50000,
      "contributionPercent": 2.5,
      "qualifyingPattern": "Full House in 42 balls",
      "qualifyingBallLimit": 42,
      "enabled": true,
      "linkedRooms": ["mega-jackpot", "diamond-75"],
      "price": 5,
      "difficulty": "Legendary",
      "reward": "Life-changing",
      "iconKey": "diamond"
    }
  ]
}
```

### 5.2 Create New Progressive Jackpot
`POST /api/jackpots`
- **Request Body**:
```json
{
  "name": "Golden Dragon Jackpot",
  "variant": "75-Ball Progressive",
  "startingAmount": 20000,
  "currentAmount": 20000,
  "maximumAmount": 100000,
  "resetAmount": 20000,
  "contributionPercent": 3.0,
  "qualifyingPattern": "Full House in 40 balls",
  "qualifyingBallLimit": 40,
  "linkedRooms": ["diamond-75"],
  "price": 3,
  "difficulty": "Legendary",
  "reward": "Life-changing",
  "iconKey": "diamond"
}
```
- **Actions**:
  - Creates slug identifier.
  - Syncs `room.jackpot` and `room.progressiveBallLimit` to all linked rooms.
  - Emits SSE event: `{ entity: "jackpots", action: "create" }`.
- **Response (`201 Created`)**:
```json
{
  "success": true,
  "jackpot": { ... },
  "message": "Jackpot \"Golden Dragon Jackpot\" created successfully."
}
```

### 5.3 Update Jackpot Configuration
`PUT /api/jackpots/:id`
- **Request Body**: Partial<Jackpot>
```json
{
  "maximumAmount": 200000,
  "contributionPercent": 3.5,
  "enabled": true
}
```
- **Response (`200 OK`)**: `{ "success": true, "jackpot": { ... } }`

### 5.4 Add Manual Contribution
`POST /api/jackpots/:id/contribute`
- **Request Body**:
```json
{
  "amount": 1000,
  "user": "John Dawson"
}
```
- **Actions**:
  - Increments `currentAmount`.
  - Appends history entry: `{ type: "Manual adjustment", amount: 1000, time, user }`.
  - Emits SSE event: `{ entity: "jackpots", action: "contribute" }`.
- **Response (`200 OK`)**: `{ "success": true, "jackpot": { ... }, "message": "Added $1,000.00 contribution..." }`

### 5.5 Award / Trigger Jackpot Win
`POST /api/jackpots/:id/trigger`
- **Request Body**:
```json
{
  "winnerName": "Ari.R"
}
```
- **Actions**:
  - Credits full `currentAmount` to player's wallet in `store.players`.
  - Records completed transaction (`type: "Prize payout"`).
  - Appends history entry: `{ type: "Jackpot Won · Payout", amount, time, user }`.
  - Resets jackpot `currentAmount` to `resetAmount`.
  - Syncs linked rooms.
  - Emits SSE event on `"jackpots"` (`action: "win"`) and `"wallet"` (`action: "credit"`).
- **Response (`200 OK`)**:
```json
{
  "success": true,
  "jackpot": { ... },
  "winner": "Ari.R",
  "payout": 127480.6,
  "wallet": 142480.6,
  "message": "Jackpot Mega Trueig Jackpot awarded to Ari.R! Prize $127,481 credited."
}
```

### 5.6 Reset Jackpot
`POST /api/jackpots/:id/reset`
- **Request Body** (Optional): `{ "resetAmount": 50000 }`
- **Response (`200 OK`)**: `{ "success": true, "jackpot": { ... }, "message": "..." }`

### 5.7 Delete Jackpot
`DELETE /api/jackpots/:id`
- **Actions**:
  - Validates `store.jackpots.length > 1` (cannot delete the only jackpot).
  - Removes from database.
  - Unlinks `room.jackpot` from any associated rooms.
  - Emits SSE event: `{ entity: "jackpots", action: "delete" }`.
- **Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Jackpot \"Golden Dragon Jackpot\" deleted successfully.",
  "remainingCount": 4
}
```

---

## 📈 6. Ticket Purchase Contribution Hook

When a player buys tickets via `POST /api/tickets/buy`:
```ts
// Progressive jackpot contribution hook in server/routes/tickets.ts
if (room.jackpot) {
  const mainJp = store.jackpots.find((jp) => jp.linkedRooms.includes(room.id));
  const rate = mainJp && mainJp.contributionPercent ? mainJp.contributionPercent / 100 : 0.025;
  const contribution = Math.round(totalCost * rate * 100) / 100;
  
  room.jackpot += contribution;
  if (mainJp) {
    mainJp.currentAmount += contribution;
    mainJp.history.unshift({
      type: "Ticket contribution",
      amount: contribution,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      user: effectiveUsername,
    });
    syncBus.emitChange(
      "jackpots",
      "contribute",
      mainJp,
      mainJp.id,
      `Jackpot ${mainJp.name} +$${contribution.toFixed(2)} from ticket purchase`
    );
  }
}
```

---

## 📸 7. Visual Catalog & Screenshots

| Screenshot Reference | View | Description |
| :--- | :--- | :--- |
| **`39-backoffice-create-jackpot-modal.png`** | Backoffice Modal | Full creation form with starting seed, max cap, contribution %, pattern, ball limit, and room selection checkboxes. |
| **`40-backoffice-jackpots-management-dynamic.png`** | Backoffice Console | Multi-jackpot switcher tabs, hero with `+ Add contribution` and `🏆 Trigger Win`, configuration grid, liability meter, and history. |
| **`41-player-jackpot-experience-dynamic-ladder.png`** | Player Jackpots Hub | Dynamic 5-tier progressive ladder, live pulse metrics, and linked contributing rooms table. |
| **`42-player-jackpot-rules-modal.png`** | Player Rules Modal | Dynamic rules modal with specific ball limits, contribution rate, and payout terms. |
| **`43-player-custom-jackpot-selected.png`** | Player Custom View | Active selection of newly created `Golden Dragon Jackpot ($11,000)` with updated hero and contributing 75-Ball rooms. |

---

## 🧪 8. Test Verification & Commands

### 8.1 Automated Unit & Integration Tests
```bash
node --test tests/api.test.mjs
```
*Result: 26 / 26 PASS (0 failures). Tests jackpot creation, configuration update, manual seed contribution, ticket purchase accumulation, win trigger with wallet payout, and clean deletion.*

### 8.2 End-to-End Browser Verification Test
```bash
node tests/browser-jackpots-e2e.mjs
```
*Result: 100% PASS. Tests Backoffice creation, switcher tabs, contributions, Player Hub ladder rendering, rules modal, and room entry.*
