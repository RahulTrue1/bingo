# 👤 Trueigtech Bingo: Authentication, Player Management & Operator Wallet System

A complete guide to the **User Authentication Modal**, **Dynamic Player Profile System**, **Backoffice Player Management**, and **Real-Time Operator Wallet Management** in Trueigtech Bingo.

---

## 🌟 1. System Architecture & Overview

The system establishes a dynamic, bidirectional bridge between the **Player Frontend** and the **Admin Backoffice**, synchronized in real-time through an Express API and Server-Sent Events (SSE).

```
┌─────────────────────────────────────────┐          ┌─────────────────────────────────────────┐
│       Player Frontend (:3000)           │          │       Admin Backoffice (:3000)          │
│                                         │          │                                         │
│  - [👤 Sign In / Switch User] Button    │          │  - Players Directory Table              │
│  - Interactive Auth Modal (Tabs)        │          │  - Search & Status Filter               │
│  - Dynamic Player Profile (No Mock)     │          │  - AdminPlayerDrawer                    │
│  - In-Room Ticket Purchases & Chat      │          │  - Operator Wallet Box (+$25..+$500)    │
│  - Live Wallet HUD (Auto-synced)        │          │  - Action Grid (Suspend, Block, etc.)   │
└────────────────────┬────────────────────┘          └────────────────────┬────────────────────┘
                     │                                                    │
                     │ HTTP / SSE                                         │ HTTP / SSE
                     ▼                                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                            Express Backend API Engine (:4000)                                │
│                                                                                              │
│   Auth Routes:               Admin Routes:                  Wallet Routes:                   │
│   • POST /api/auth/signup    • POST /admin/players/:id/     • GET /api/wallet                │
│   • POST /api/auth/login       add-funds                    • POST /api/wallet/deposit       │
│   • GET  /api/auth/me        • POST /admin/players/:id/     • POST /api/wallet/withdraw      │
│   • GET  /api/auth/users       action                       • GET  /api/wallet/transactions  │
│                                                                                              │
│                              Real-Time Sync Bus (SSE)                                        │
│   • Channel: /api/sync/events (Emits: "auth", "players", "wallet", "tickets")                │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 2. Player Authentication Flows

### 2.1 Interactive Auth Modal (`app/components/player/AuthModal.tsx`)

The authentication modal is accessible from the top-right header via the **`[👤 Sign In / Switch User]`** button:
- Clicking opens an accessible card backdrop with active focus.
- Displays two operational tabs: **Log In** and **Sign Up**.
- Closes via `×` button, `ESC` key, or backdrop click.

```
┌──────────────────────────────────────────────────────────────────┐
│  TRUEIGTECH CASINO                                               │
│  Player Login / Create Account                                [×]│
├──────────────────────────────────────────────────────────────────┤
│  [  Log In (Active)  ]      [  Sign Up                      ]    │
├──────────────────────────────────────────────────────────────────┤
│  QUICK SWITCH ACCOUNTS:                                          │
│  [👑 TrueigQueen · $12,480]  [⚡ MikaK · $4,820]  [AR Ari.R · $248]│
│                                                                  │
│  Username or Player ID:                                          │
│  [ e.g. NovaQueen, LuckyPlayer                                 ] │
│  Password:                                                       │
│  [ ••••••••                                                    ] │
│                                                                  │
│  [                      Sign In →                              ] │
└──────────────────────────────────────────────────────────────────┘
```

---

### 2.2 Dynamic Account Registration (Sign Up) Flow

1. **User Input**:
   - **Username** *(required)*: e.g. `NovaPlayer`.
   - **Password** *(required)*: min 4 characters with interactive Show/Hide toggle.
   - **Display Name** *(optional)*: e.g. `Nova Rivera`.
   - **Email Address** *(optional)*: e.g. `nova@trueigtech.com`.
   - **Welcome Bonus Selector**: Select starting credits:
     - `+$50.00` (Quick Play)
     - `+$100.00` (Popular Starter)
     - `+$250.00` (VIP Pass)
2. **Backend Processing (`POST /api/auth/signup`)**:
   - Generates a unique user ID: `USR-` + 5 random digits (e.g. `USR-54128`).
   - Securely stores user's password (`cleanPassword || "demo123"`).
   - Assigns tier (`VIP` for $\ge \$250$ bonus, else `Standard`).
   - Initializes player balance with selected bonus amount.
   - Adds a starting `Bonus credit` record to the transaction ledger.
   - Appends audit log: `"Dynamic player registered with $X welcome bonus"`.
   - Sets user as current active session: `store.activeUsername = username`, `store.wallet = bonus`.
   - Broadcasts SSE event: `{ entity: "auth", action: "signup", data: sanitizedUser }`.
   - Strips password from all API responses to ensure security.
3. **Frontend Reaction**:
   - Header avatar updates immediately with player's initials (e.g. `NO`).
   - Wallet HUD animates to the new balance (e.g. `$100.00`).
   - Modal closes automatically and displays welcome notification.

---

### 2.3 Quick Switcher & Password-Protected Login Flow

1. **Quick-Switch Pills**:
   - The Log In tab dynamically loads all existing players (`GET /api/auth/users`).
   - Each pill displays user initials, display name, tier, and live balance.
   - Clicking any pill instantly logs into that account using pre-authenticated credentials.
2. **Manual Password Login**:
   - Player inputs username or user ID and their password.
   - Calls `POST /api/auth/login` with `{ username, password }`.
   - Backend verifies password against the stored password created during signup:
     - If password matches: returns HTTP 200, updates `lastLogin`, synchronizes session, and logs in.
     - If password mismatches: returns HTTP 401 `{ success: false, error: "Incorrect password. Please try again." }`.
     - If password is empty for a password-protected account: returns HTTP 401 `{ success: false, error: "Password is required to sign in." }`.
   - Generates unique session token (`token`) for this browser window.
   - Emits targeted SSE `{ entity: "auth", action: "login", player: username }`.

---

### 2.4 Multi-Browser & Incognito Session Isolation

The platform supports multiple distinct users simultaneously logged in across different browsers, browser tabs, or incognito windows without session collisions:

1. **Token-Based Sessions**:
   - Each browser window stores its own session token in `localStorage` under `tig_session_token`.
   - Every API request sends `x-session-token: <token>` and `x-player-username: <username>`.
   - The backend `store.resolveUser(req)` resolves the user profile associated with that specific browser session token.
2. **Independent Wallets & Purchases**:
   - Deposits, withdrawals, and ticket purchases operate strictly on the session user's wallet without clobbering other users.
3. **Scoped Real-Time Sync (SSE)**:
   - Wallet and authentication sync events include `player: <username>`.
   - Frontends filter incoming events and only update their local state if the event specifically matches their current session username.
4. **Concurrent Backoffice Administration**:
   - The `/backoffice` administration console operates independently in any window. Admins can update rooms, RTP, ticket limits, and credit wallets without interrupting any active player sessions.

---

## 👤 3. Dynamic Player Profile & In-Game Dynamism

### 3.1 100% Dynamic Profile Page (`app/components/player/PlayerProfile.tsx`)

All hardcoded mock data has been completely removed. The profile dynamically presents the authenticated user's state:

| Element | Description | Source |
|:---|:---|:---|
| **Avatar Initials** | Two uppercase letters of active handle | `currentUser.username.slice(0, 2)` |
| **Player Name** | Display Name or Username | `currentUser.displayName` \|\| `currentUser.username` |
| **Player ID** | Unique system ID | `currentUser.id` (e.g. `USR-39218`) |
| **Account Status** | Status badge (`Active`, `Restricted`) | `currentUser.status` |
| **Tier Badge** | Player tier (`Standard`, `VIP`) | `currentUser.tier` |
| **Live Balance** | Current wallet funds | `apiClient.wallet.get()` |
| **Bingo Wins** | Total career wins | `currentUser.wins` |
| **Cards Played** | Total cards purchased | `currentUser.cardsPurchased` |
| **Win Rate %** | `(wins / cards) * 100` | Calculated dynamically |
| **Notification Center** | Real-time transaction receipts | `apiClient.wallet.transactions()` |

---

### 3.2 In-Game & Tournament Dynamism

The active user profile is seamlessly bound to all game activities:

1. **Game Rooms (`GameRoom.tsx`)**:
   - **Ticket Purchases**: Deducts entry cost directly from the logged-in user's balance.
   - **Live In-Room Chat**: Messages are sent with the logged-in player's username.
   - **Bingo Claims**: When a player claims or demonstrates a win, the winning claim is logged under the active user's ID and handle.
   - **Mini-Leaderboard**: Shows the active user in the room leaderboards.
2. **Tournament Lobby (`TournamentLobby.tsx`)**:
   - **Registration**: Registers the logged-in user into tournament brackets.
   - **Live Standings**: Highlights the current user with a `(You)` tag and live qualification status.
   - **Champion Crowning**: The championship victory banner dynamically hails the active user:
     `"TOURNAMENT CHAMPION! You won 1st Place ($15,000 awarded to your wallet)!"`

---

## 🛠️ 4. Admin Backoffice Player Management

Located at **`/backoffice`** $\rightarrow$ **`Players`** section.

### 4.1 Players Directory (`app/components/admin/PlayersTable.tsx`)

- **Search Filter**: Real-time filtering by username, display name, or Player ID.
- **Status Filter**: Dropdown to isolate `Active`, `Restricted`, or all accounts.
- **Data Columns**:
  1. `Player`: Avatar pill, username, unique `USR-xxxxx` ID.
  2. `Tier`: `VIP` or `Standard`.
  3. `Last Login`: Timestamp.
  4. `Games`: Total game sessions played.
  5. `Total Entry`: Sum of all ticket spend.
  6. `Winnings`: Total prizes awarded.
  7. `Balance`: Current available wallet balance.
  8. `Status`: Green `Active` or orange `Restricted` pill.
  9. `Action`: **`View →`** button opening the player drawer.

---

### 4.2 Admin Player Drawer (`AdminPlayerDrawer` in `BackofficeDrawer.tsx`)

Clicking **`View →`** opens a sliding inspection and management panel:
- **Player Summary Header**: Shows live balance, tier, email, and ID.
- **Operator Action Grid**:
  - `Suspend` / `Block`: Locks player account from purchasing cards.
  - `Restrict Bingo`: Restricts high-stakes bingo access.
  - `Add Bonus Card`: Issues promotional cards.
  - `View Cards` / `View Game History` / `View Transactions`.

---

## 💰 5. Operator Wallet Management (Admin Fund Injection)

The **Operator Wallet Management Box** inside `AdminPlayerDrawer` allows administrators to credit playing funds or promotional balances to any player in real time.

```
┌──────────────────────────────────────────────────────────────────┐
│  💰 Operator Wallet Management                                   │
│  Directly credit playing funds or bonus amounts to player wallet │
├──────────────────────────────────────────────────────────────────┤
│  Quick Presets:                                                  │
│  [ +$25 ]  [ +$50 ]  [ +$100 ]  [ +$200 ]  [ +$500 ]             │
│                                                                  │
│  Amount ($):           Reason / Category:                        │
│  [ 150              ]  [ Operator deposit to play game       ▼ ] │
│                                                                  │
│  [               + Add to Player Wallet                        ] │
│                                                                  │
│  ✓ +$150.00 added! New balance: $244.00                          │
└──────────────────────────────────────────────────────────────────┘
```

### 5.1 Step-by-Step Operator Flow

1. Admin enters amount (or clicks a preset like `+$100`).
2. Admin selects reason:
   - `Operator deposit to play game`
   - `Welcome / Onboarding bonus`
   - `Tournament entry credit`
   - `Customer support goodwill`
   - `VIP High Roller boost`
3. Admin clicks **`+ Add to Player Wallet`**.
4. The system sends `POST /api/admin/players/:id/add-funds`.
5. **Backend Execution**:
   - Updates target player's `balance` in database.
   - If the target player is the active user, updates `store.wallet`.
   - Records a ledger transaction: `{ type: "Deposit", amount: +150.00, room: "Backoffice Admin" }`.
   - Appends audit entry: `"Operator added +$150.00 to [user] ([reason])"`.
   - Emits SSE events:
     - `wallet`: `{ player, amount, balance, transaction }`
     - `players`: `{ update, player }`
6. **Instant Frontend Real-Time Reaction**:
   - Admin drawer balance updates immediately.
   - Player's frontend header wallet HUD updates in real-time without page reload.
   - A celebratory green toast appears: `"+$150.00 added to wallet by Admin"`.

---

## 📡 6. Complete API Reference

### 6.1 Authentication Endpoints

#### `POST /api/auth/signup`
Creates a new player account with starting bonus credits.
- **Request Body**:
  ```json
  {
    "username": "NovaPlayer",
    "displayName": "Nova Rivera",
    "email": "nova@trueigtech.com",
    "bonus": 100
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "USR-41062",
      "username": "NovaPlayer",
      "displayName": "Nova Rivera",
      "email": "nova@trueigtech.com",
      "tier": "Standard",
      "balance": 100,
      "status": "Active",
      "gamesPlayed": 0,
      "totalEntry": 0,
      "winnings": 0
    },
    "wallet": 100,
    "message": "Welcome NovaPlayer! $100.00 bonus added to your wallet."
  }
  ```

---

#### `POST /api/auth/login`
Switches active player and syncs wallet.
- **Request Body**:
  ```json
  {
    "username": "TrueigQueen"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "USR-10482",
      "username": "TrueigQueen",
      "tier": "VIP",
      "balance": 12480,
      "status": "Active"
    },
    "wallet": 12480,
    "message": "Welcome back, TrueigQueen!"
  }
  ```

---

#### `GET /api/auth/me`
Retrieves currently active authenticated player.
- **Query Parameter**: `username` *(optional)*
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": { ... },
    "wallet": 244.00
  }
  ```

---

#### `GET /api/auth/users`
Lists available users for the quick switcher.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "users": [ ... ]
  }
  ```

---

### 6.2 Operator Wallet Endpoints

#### `POST /api/admin/players/:id/add-funds`
Operator credits playing funds directly to player wallet.
- **URL Parameter**: `:id` — Player ID (e.g. `USR-41062`) or username (`NovaPlayer`).
- **Request Body**:
  ```json
  {
    "amount": 150.00,
    "reason": "Operator deposit to play game"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "player": {
      "id": "USR-41062",
      "username": "NovaPlayer",
      "balance": 244.00
    },
    "wallet": 244.00,
    "amount": 150.00,
    "transaction": {
      "id": "TXN-89412",
      "player": "NovaPlayer",
      "room": "Backoffice Admin",
      "type": "Deposit",
      "amount": 150.00,
      "status": "Completed"
    },
    "message": "Successfully added $150.00 to NovaPlayer's wallet. New balance: $244.00."
  }
  ```

---

## 🧪 7. Automated Testing & Verification

### 7.1 Backend API Test Suite

Run the comprehensive 21-test API test suite:

```bash
node --test tests/api.test.mjs
```

**Output**:
```text
✔ GET /api/health returns ok status
✔ GET /api/rooms returns list of bingo rooms
✔ POST /api/auth/signup creates a dynamic player with initial bonus
✔ POST /api/auth/login switches active player and syncs wallet
✔ POST /api/admin/players/:id/add-funds adds funds to player and records transaction
ℹ tests 21 | pass 21 | fail 0
```

---

### 7.2 End-to-End Headless Chrome Test

Run the full 7-stage browser verification test in Google Chrome:

```bash
node tests/browser-auth-admin-wallet-e2e.mjs
```

**Verified Stages**:
1. **Stage 1**: Player frontend loads, user clicks header auth button, Auth modal opens.
2. **Stage 2**: Enters dynamic username `NovaPlayer`, selects `+$100` bonus, signs up. Header reflects `NovaPlayer` with `$100.00` balance.
3. **Stage 3**: Opens Profile view, verifies dynamic ID, tier, and live balance.
4. **Stage 4**: Enters Diamond 75 room, buys tickets, verifies wallet deduction.
5. **Stage 5**: Opens Backoffice (`/backoffice`), locates player in Players table, credits `$150.00` via Operator Wallet Box.
6. **Stage 6**: Real-time SSE updates player frontend wallet to `$244.00` without page refresh.
7. **Stage 7**: Opens quick user switcher, clicks `TrueigQueen`, verifies seamless session swap.

---

## 🛡️ 8. Extension Error Safeguards

To prevent third-party Chrome extensions (e.g. Urban VPN, ad blockers) from throwing unhandled promise rejections on `localhost:3000` and triggering the development error overlay:
- An early capture-phase interceptor in [`app/layout.tsx`](file:///Users/side%20project/tig-bingo/app/layout.tsx) catches extension errors (`chrome-extension://`, `eppiocemhmnlbhjplcgkofciiegomcon`, `executors/200.js`, `M_ID`) and stops their propagation.
- A matching guard in [`app/BingoApp.tsx`](file:///Users/side%20project/tig-bingo/app/BingoApp.tsx) safeguards client transitions, ensuring a seamless development and production experience.
