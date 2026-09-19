# 🏆 Trueigtech Bingo Tournament System

A comprehensive, production-grade progressive elimination tournament engine connecting the **Admin Backoffice Operations Console** and the **Player Frontend** in real-time via Server-Sent Events (SSE).

---

## 🌟 1. Overview & Architecture

The Trueigtech Bingo Tournament System is designed for multi-stage competitive tournaments (such as the weekly **$25,000 Trueigtech Weekend Cup**).

```
┌───────────────────────────┐           ┌───────────────────────────┐
│     Admin Backoffice      │           │      Player Frontend      │
│  - Launch Tournament      │           │  - Register ($8.00 Fee)   │
│  - Score Each Stage       │           │  - Live Stage Tracker     │
│  - Advance Brackets       │           │  - Play Active Stage Room │
│  - Crown Champion         │           │  - Champion Trophy Modal  │
└─────────────┬─────────────┘           └─────────────▲─────────────┘
              │                                       │
              ▼                                       │
      ┌───────────────────────────────────────────────────┐
      │          Express API & Real-Time Sync Bus         │
      │   POST /api/tournaments/:id/start                 │
      │   POST /api/tournaments/:id/score-stage           │
      │   POST /api/tournaments/:id/advance               │
      │   POST /api/tournaments/:id/complete              │
      │   POST /api/tournaments/:id/reset                 │
      │   SSE: entity="tournaments", entity="wallet"      │
      └───────────────────────────────────────────────────┘
```

---

## 🏁 2. The 5 Tournament Stages

The tournament progresses across 5 elimination rounds:

| Stage # | Stage Name | Bracket Size | Elimination / Progression Rule |
|:---:|:---|:---:|:---|
| **1** | **Qualifiers** | 512 Max (384 Seeded) | Open field; contenders score line & pattern bingos. Top 50% advance. |
| **2** | **Round of 256** | 256 Contenders | Fast pace; competitive scoring bonus. Top 50% advance. |
| **3** | **Round of 128** | 128 Contenders | High stakes; ball call intervals accelerate. Top 64 advance. |
| **4** | **Semi Final** | 64 Contenders | Elimination down to the elite finalists. Top 16 advance to Grand Final. |
| **5** | **Grand Final** | 16 Finalists | Showdown round; points determine Champion, Runner-up, and 3rd place! |

---

## 🎮 3. Player Experience

1. **Tournament Lobby (`/tournaments`)**:
   - Displays tournament title, guaranteed prize pool ($25,000), seat counter, and 5-stage progress rail.
   - **One-Click Registration**: Clicking **[Enter for $8]** registers player (`Ari.R`), deducts entry fee from the player's live wallet, and logs an audited ledger transaction.
   - **Live Stage Indication**: Glowing green indicator badge reflects the current live stage (e.g., `Stage 1: Qualifiers LIVE`).
   - **Dynamic Action Button**:
     - *Pre-Launch*: `✓ Registered & Ready` (or `Open tournament room`).
     - *When Live*: `Play Stage X (Name) →` taking the player straight into the live tournament room.
     - *Qualification Badge*: Updates dynamically with ranking points and status (`✓ Qualified! You advanced to Semi Final`).

2. **Tournament Game Room**:
   - Dedicated game room mapped to the tournament (`room.id === "tournament"`).
   - Topbar displays `🏆 Tournament Stage: <Active Stage Name>` and live caller speed.
   - Real-time ticket daubing, ball calling, and chat integration.

3. **Champion Trophy Card**:
   - When the Grand Final is scored and the champion is crowned, an animated victory card displays:
     > **🏆 TOURNAMENT CHAMPION!**  
     > **1st Place Winner: Ari.R · $15,000.00 Awarded to Wallet**
   - The player's top-bar wallet updates instantly via SSE (+ $15,000.00).

---

## 🛠️ 4. Operator Backoffice Controls

Located in **Backoffice → Tournaments**:

1. **Stage Timeline Rail**: Visual indicator showing completed (✓), active (glowing teal), and upcoming stages.
2. **`[▶ Start Tournament]`**:
   - Switches status to `"Live"`.
   - Initializes Stage 1 (*Qualifiers*) and marks the tournament game room live.
   - Broadcasts SSE event to all connected player clients.
3. **`[🎲 Score Stage X]`**:
   - Aggregates points for all contenders based on stage performance.
   - Re-ranks standings dynamically.
   - Marks advancing players as `Qualified` and bottom players as `Eliminated`.
   - Enables the `Advance Stage` button.
4. **`[⏩ Advance to Stage X+1]`**:
   - Increments stage counter (`currentRoundIndex + 1`).
   - Updates active stage name on all clients.
   - Resets stage status to `in_progress` for the new round.
5. **`[🏆 Crown Champion & Pay Out $15,000]`**:
   - Finalizes the tournament upon Grand Final scoring.
   - Assigns winner (`Ari.R`).
   - Computes prize payout:
     - **1st Place (60%)**: **$15,000.00** (automatically credited to player wallet).
     - **2nd Place (25%)**: **$6,250.00**
     - **3rd Place (15%)**: **$3,750.00**
   - Appends audited prize transaction record to ledger.
   - Emits `wallet` and `tournaments` SSE events.
6. **`[↺ Reset Tournament]`**:
   - Resets the tournament back to registration phase for full replayability.

---

## 📊 5. Standings & Scoring Matrix

Standings table shows:
- **Rank** (1 to 8+) with Gold 🥇, Silver 🥈, Bronze 🥉 badges for top 3.
- **Contender Name** (player highlighted in distinctive accent color).
- **Total Points** (accumulated across stages).
- **Stage Wins** (bingos hit during active stages).
- **Fastest Bingo** (e.g. `18 balls`).
- **Round Status** (`Champion`, `Runner-up`, `Qualified`, `Eliminated`).

### Scoring Rules:
- Line Win: **10 pts**
- Pattern Win: **25 pts**
- Full House: **50 pts**
- Fast Bingo Bonus: **+15 pts**
- Round Winner Bonus: **+40 pts**

---

## ⚡ 6. Real-Time SSE Architecture

All state transitions broadcast over `/api/sync/events`:

```typescript
// Example: Advancing Stage
syncBus.emitChange("tournaments", "advance", tournament, tournament.id, "Advanced to Stage 2: Round of 256!");

// Example: Champion Payout
syncBus.emitChange("wallet", "tournament-champion", { wallet: newBalance, payout: 15000 });
syncBus.emitChange("tournaments", "complete", tournament, tournament.id, "🏆 Ari.R has won the Trueigtech Weekend Cup!");
```

Clients subscribe once and reactively re-render the view, update wallet totals, and display notification toasts without requiring manual page reloads.

---

## 🧪 7. Automated Testing & Verification

A dedicated Puppeteer browser test suite (`tests/browser-tournaments-e2e.mjs`) verifies the entire lifecycle in real Google Chrome:

```bash
# Run the complete tournament end-to-end browser test
node tests/browser-tournaments-e2e.mjs
```

### Verified Test Flow:
1. Starts Express API (:4000) and Vinext App (:3000).
2. Player registers for Weekend Cup ($8 fee deducted from wallet).
3. Admin starts tournament in Backoffice → Stage 1 (Qualifiers) live.
4. Player enters live tournament game room → Stage subtitle verified.
5. Admin scores Stage 1 → Player qualified.
6. Admin advances & scores Stage 2 (Round of 256).
7. Admin advances & scores Stage 3 (Round of 128).
8. Admin advances & scores Stage 4 (Semi Final).
9. Admin advances & scores Stage 5 (Grand Final).
10. Admin crowns Champion & awards $15,000.
11. Player frontend verifies Champion Trophy card and $15,000 wallet increase.
12. Admin resets tournament for replayability.
