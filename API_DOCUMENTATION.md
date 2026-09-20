# Trueigtech Bingo Platform — API Documentation

Comprehensive REST API documentation for the Trueigtech Bingo platform.

---

## Table of Contents

- [Overview & Base URL](#overview--base-url)
- [Architecture & Request Lifecycle](#architecture--request-lifecycle)
- [Standard Response & Error Formats](#standard-response--error-formats)
- [1. Health & Status](#1-health--status)
- [2. Room Management (`/api/rooms`)](#2-room-management-apirooms)
- [3. Game Session Engine & Live Calling (`/api/game`)](#3-game-session-engine--live-calling-apigame)
- [4. Tickets & Cards (`/api/tickets`)](#4-tickets--cards-apitickets)
- [5. Wallet & Cashier (`/api/wallet`)](#5-wallet--cashier-apiwallet)
- [6. Progressive Jackpots (`/api/jackpots`)](#6-progressive-jackpots-apijackpots)
- [7. Tournaments (`/api/tournaments`)](#7-tournaments-apitournaments)
- [8. Promotions & Rewards (`/api/promotions`)](#8-promotions--rewards-apipromotions)
- [9. Room Chat & Moderation (`/api/chat`)](#9-room-chat--moderation-apichat)
- [10. Pattern Builder (`/api/patterns`)](#10-pattern-builder-apipatterns)
- [11. Admin Telemetry & Live Ops (`/api/admin`)](#11-admin-telemetry--live-ops-apiadmin)
- [End-to-End Simulation Workflow](#end-to-end-simulation-workflow)

---

## Overview & Base URL

- **Backend API Base URL**: `http://localhost:4000/api`
- **Frontend Proxy**: When running the Next.js / Vinext dev server (`http://localhost:3000`), requests matching `/api/*` automatically proxy to port `4000`.
- **Default Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`

---

## Architecture & Request Lifecycle

```
[Player UI / Backoffice Admin]
       │
       ▼ (HTTP / JSON)
[Express API Gateway (Port 4000)]
       │
  ┌────┴───────────────────────────┐
  │                                │
[Game Engine & Validators]   [JSON-backed Store]
  - Ball caller & randomizer   - Rooms & sessions
  - Pattern validation matrix  - Wallet ledger & TXNs
  - RTP house margin engine    - Jackpots & audit logs
```

---

## Standard Response & Error Formats

### Successful Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

---

## 1. Health & Status

### `GET /api/health`
Checks server liveness, uptime, and system status.

- **Method**: `GET`
- **Path**: `/api/health`
- **Request Body**: None

**Example Response (`200 OK`)**:
```json
{
  "status": "ok",
  "timestamp": 1773677400000,
  "service": "trueigtech-bingo-api",
  "uptime": 128.45
}
```

**cURL**:
```bash
curl -s http://localhost:4000/api/health
```

---

## 2. Room Management (`/api/rooms`)

### `GET /api/rooms`
List all Bingo rooms with optional filtering by variant, operational status, or search keywords.

- **Method**: `GET`
- **Query Parameters**:
  - `variant` *(optional, string)*: e.g. `75-Ball`, `90-Ball`, `30-Ball`, `80-Ball`
  - `status` *(optional, string)*: `Live`, `Open`, `Starting Soon`, `Selling`, `Scheduled`
  - `search` *(optional, string)*: Case-insensitive search on room name or variant
- **Request Body**: None

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "count": 6,
  "rooms": [
    {
      "id": "diamond-75",
      "name": "Diamond 75",
      "variant": "75-Ball Pattern",
      "status": "Live",
      "ticketPrice": 2,
      "prize": 2000,
      "players": 286,
      "maxPlayers": 300,
      "cardsSold": 6812,
      "startsIn": "02:14",
      "pattern": "Diamond",
      "accent": "violet",
      "frequency": "Every 5 min",
      "cardRows": 5,
      "cardColumns": 5,
      "rtp": 78,
      "rtpMode": "dynamic",
      "customRtp": false
    }
  ]
}
```

**cURL**:
```bash
curl -s "http://localhost:4000/api/rooms?status=Live"
```

---

### `GET /api/rooms/:id`
Fetch single room details by identifier.

- **Method**: `GET`
- **Path Parameter**: `id` *(string)* — e.g. `diamond-75`

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "room": {
    "id": "diamond-75",
    "name": "Diamond 75",
    "variant": "75-Ball Pattern",
    "ticketPrice": 2,
    "prize": 2000,
    "status": "Live"
  }
}
```

**cURL**:
```bash
curl -s http://localhost:4000/api/rooms/diamond-75
```

---

### `POST /api/rooms`
Create a new Bingo room with custom rules, variant, ticket price, and winning stages.

- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "id": "sunset-75",
  "name": "Sunset 75 Lounge",
  "variant": "75-Ball Pattern",
  "status": "Open",
  "ticketPrice": 3.5,
  "prize": 2500,
  "maxPlayers": 350,
  "pattern": "Four Corners",
  "accent": "coral",
  "frequency": "Every 10 min",
  "winningStages": [
    { "name": "Four Corners", "prize": 500, "continueAfterWin": true },
    { "name": "Full House", "prize": 2000, "continueAfterWin": false }
  ],
  "rtp": 80,
  "rtpMode": "dynamic",
  "customRtp": true
}
```

**Example Response (`201 Created`)**:
```json
{
  "success": true,
  "room": {
    "id": "sunset-75",
    "name": "Sunset 75 Lounge",
    "status": "Open",
    "players": 0,
    "cardsSold": 0
  }
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "id": "sunset-75",
    "name": "Sunset 75 Lounge",
    "variant": "75-Ball Pattern",
    "status": "Open",
    "ticketPrice": 3.5,
    "prize": 2500,
    "maxPlayers": 350,
    "pattern": "Four Corners"
  }'
```

---

### `PUT /api/rooms/:id`
Update an existing room's configuration (price, status, winning stages, RTP).

- **Method**: `PUT`
- **Path Parameter**: `id` *(string)* — e.g. `sunset-75`
- **Request Body**:
```json
{
  "ticketPrice": 4.0,
  "prize": 3000,
  "status": "Live"
}
```

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "room": {
    "id": "sunset-75",
    "ticketPrice": 4,
    "prize": 3000,
    "status": "Live"
  }
}
```

**cURL**:
```bash
curl -s -X PUT http://localhost:4000/api/rooms/sunset-75 \
  -H "Content-Type: application/json" \
  -d '{"ticketPrice": 4.0, "prize": 3000, "status": "Live"}'
```

---

### `POST /api/rooms/:id/duplicate`
Duplicate an existing room with cloned parameters and a unique identifier.

- **Method**: `POST`
- **Path Parameter**: `id` *(string)*

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/rooms/diamond-75/duplicate
```

---

### `DELETE /api/rooms/:id`
Permanently delete a Bingo room.

- **Method**: `DELETE`
- **Path Parameter**: `id` *(string)*

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Room 'sunset-75' deleted successfully"
}
```

**cURL**:
```bash
curl -s -X DELETE http://localhost:4000/api/rooms/sunset-75
```

---

### `POST /api/rooms/rtp-policy`
Apply a network-wide target RTP policy (e.g. 78% or 82%) across all rooms or non-override rooms.

- **Method**: `POST`
- **Request Body**:
```json
{
  "targetRtp": 80,
  "syncMode": "all"
}
```

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "targetRtp": 80,
  "syncMode": "all",
  "updatedRooms": 6,
  "rooms": [ ... ]
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/rooms/rtp-policy \
  -H "Content-Type: application/json" \
  -d '{"targetRtp": 80, "syncMode": "all"}'
```

---

## 3. Game Session Engine & Live Calling (`/api/game`)

### `GET /api/game/:roomId/state`
Fetch real-time state for an active room session: called balls, phase, winning status, active players, and jackpot level.

- **Method**: `GET`
- **Path Parameter**: `roomId` *(string)* — e.g. `diamond-75`

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "state": {
    "roomId": "diamond-75",
    "phase": "live",
    "countdown": 0,
    "called": [12, 45, 67, 3, 29],
    "current": 29,
    "speed": "Fast",
    "paused": false,
    "stageIndex": 0,
    "patternRound": 1,
    "winnerNames": [],
    "winnerPrize": 0,
    "winnerPattern": "",
    "livePlayers": 286,
    "liveCards": 934,
    "liveJackpot": 125480.6,
    "lastWinner": "LuckyStar · $420"
  }
}
```

**cURL**:
```bash
curl -s http://localhost:4000/api/game/diamond-75/state
```

---

### `POST /api/game/:roomId/call-next`
Draw the next random, fair uncalled ball from the variant ball pool.

- **Method**: `POST`
- **Path Parameter**: `roomId` *(string)*

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "ball": 34,
  "label": "N-34",
  "state": {
    "called": [12, 45, 67, 3, 29, 34],
    "current": 34,
    "phase": "live"
  }
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/game/diamond-75/call-next
```

---

### `POST /api/game/:roomId/manual-call`
Operator manually calls a designated ball number (checked against called history).

- **Method**: `POST`
- **Path Parameter**: `roomId` *(string)*
- **Request Body**:
```json
{
  "number": 17
}
```

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "ball": 17,
  "label": "B-17",
  "state": { ... }
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/game/diamond-75/manual-call \
  -H "Content-Type: application/json" \
  -d '{"number": 17}'
```

---

### `POST /api/game/:roomId/pause` & `POST /api/game/:roomId/resume`
Pause or resume automated caller ball generation.

- **Method**: `POST`
- **Path Parameter**: `roomId` *(string)*

**cURL**:
```bash
# Pause
curl -s -X POST http://localhost:4000/api/game/diamond-75/pause

# Resume
curl -s -X POST http://localhost:4000/api/game/diamond-75/resume
```

---

### `POST /api/game/:roomId/restart`
Reset the current round to countdown phase with an empty caller drum.

- **Method**: `POST`
- **Path Parameter**: `roomId` *(string)*

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/game/diamond-75/restart
```

---

### `POST /api/game/:roomId/cancel`
Cancel the active game, halt calling, and automatically refund all players who purchased cards.

- **Method**: `POST`
- **Path Parameter**: `roomId` *(string)*

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Round cancelled. Refunded $6.00 to wallet.",
  "refundAmount": 6.0,
  "state": { "phase": "selling", "paused": true }
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/game/diamond-75/cancel
```

---

### `POST /api/game/:roomId/claim`
Submit a BINGO claim. The server validates card cells against drawn balls and pattern requirements. Valid claims credit the player's wallet and log audit entries.

- **Method**: `POST`
- **Path Parameter**: `roomId` *(string)*
- **Request Body**:
```json
{
  "ticketId": "TCK-842011",
  "playerName": "Ari.R",
  "manualPattern": "One Line"
}
```

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "claim": {
    "id": "CLM-482019",
    "roomId": "diamond-75",
    "ticketId": "TCK-842011",
    "playerName": "Ari.R",
    "pattern": "One Line",
    "status": "approved",
    "prize": 500,
    "timestamp": "14:35"
  },
  "wallet": 748.5,
  "message": "🎉 BINGO! Validated One Line! Won $500.00!"
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/game/diamond-75/claim \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "TCK-842011", "playerName": "Ari.R"}'
```

---

### `POST /api/game/:roomId/declare-winner`
Backoffice operator manually declares a winner and awards a prize payout.

- **Method**: `POST`
- **Path Parameter**: `roomId` *(string)*
- **Request Body**:
```json
{
  "player": "LuckyStar",
  "prize": 400,
  "pattern": "One Line"
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/game/diamond-75/declare-winner \
  -H "Content-Type: application/json" \
  -d '{"player": "LuckyStar", "prize": 400, "pattern": "One Line"}'
```

---

### `POST /api/game/:roomId/claims/:claimId/review`
Admin operator reviews and approves or rejects a flagged or pending claim.

- **Method**: `POST`
- **Path Parameters**: `roomId`, `claimId`
- **Request Body**:
```json
{
  "action": "approve"
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/game/diamond-75/claims/CLM-482019/review \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}'
```

---

## 4. Tickets & Cards (`/api/tickets`)

### `GET /api/tickets`
List purchased Bingo cards for the current user.

- **Method**: `GET`
- **Query Parameter**: `roomId` *(optional, string)*

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "count": 2,
  "tickets": [
    {
      "id": "TCK-928410",
      "ticketIndex": 0,
      "roomId": "diamond-75",
      "variant": "75-Ball Pattern",
      "cells": [12, 24, 38, 54, 71, 5, 19, 41, 48, 63, 2, 28, 0, 59, 69, 8, 22, 33, 50, 75, 14, 16, 44, 52, 61],
      "daubed": [12, 24],
      "purchasedAt": "2026-09-16T17:15:00.000Z"
    }
  ]
}
```

**cURL**:
```bash
curl -s "http://localhost:4000/api/tickets?roomId=diamond-75"
```

---

### `POST /api/tickets/buy`
Purchase one or more cards for a room. Deducts entry fee from wallet and adds 2.5% contribution to the progressive jackpot.

- **Method**: `POST`
- **Request Body**:
```json
{
  "roomId": "diamond-75",
  "count": 2,
  "userId": "USR-11804"
}
```

**Example Response (`201 Created`)**:
```json
{
  "success": true,
  "purchasedCount": 2,
  "totalCost": 4.0,
  "wallet": 244.5,
  "tickets": [ ... ],
  "message": "Purchased 2 cards for Diamond 75."
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/tickets/buy \
  -H "Content-Type: application/json" \
  -d '{"roomId": "diamond-75", "count": 2}'
```

---

### `POST /api/tickets/:ticketId/daub`
Record a daubed / marked number on a player's card.

- **Method**: `POST`
- **Request Body**:
```json
{
  "number": 12
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/tickets/TCK-928410/daub \
  -H "Content-Type: application/json" \
  -d '{"number": 12}'
```

---

## 5. Wallet & Cashier (`/api/wallet`)

### `GET /api/wallet`
Get the user's live balance, currency, total wagered, and total prize winnings.

- **Method**: `GET`

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "balance": 248.5,
  "currency": "USD",
  "totalSpent": 48.0,
  "totalWon": 150.0,
  "transactionCount": 14
}
```

**cURL**:
```bash
curl -s http://localhost:4000/api/wallet
```

---

### `POST /api/wallet/deposit`
Deposit funds into player account.

- **Method**: `POST`
- **Request Body**:
```json
{
  "amount": 50.0
}
```

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "balance": 298.5,
  "message": "Deposited $50.00 to wallet successfully."
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/wallet/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": 50.0}'
```

---

### `POST /api/wallet/withdraw`
Request funds withdrawal.

- **Method**: `POST`
- **Request Body**:
```json
{
  "amount": 25.0
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/wallet/withdraw \
  -H "Content-Type: application/json" \
  -d '{"amount": 25.0}'
```

---

### `GET /api/wallet/transactions`
List account transactions (purchases, payouts, deposits, refunds).

- **Method**: `GET`
- **Query Parameter**: `type` *(optional, string)* — e.g. `Ticket purchase`, `Prize payout`

**cURL**:
```bash
curl -s "http://localhost:4000/api/wallet/transactions?type=Ticket%20purchase"
```

---

## 6. Progressive Jackpots (`/api/jackpots`)

### `GET /api/jackpots`
List progressive jackpots with current amounts, maximum limits, contribution percentages, and qualification conditions.

- **Method**: `GET`

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "jackpots": [
    {
      "id": "mega-trueig",
      "name": "Mega Trueig Jackpot",
      "currentAmount": 125480.6,
      "startingAmount": 50000,
      "maxAmount": 250000,
      "contributionPercent": 2.5,
      "qualifyingPattern": "Full House",
      "maxBallCount": 42,
      "active": true
    }
  ]
}
```

**cURL**:
```bash
curl -s http://localhost:4000/api/jackpots
```

---

### `POST /api/jackpots/:id/contribute`
Add a manual jackpot contribution (Operator action).

- **Method**: `POST`
- **Request Body**:
```json
{
  "amount": 1000,
  "user": "John Dawson"
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/jackpots/mega-trueig/contribute \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'
```

---

### `POST /api/jackpots/:id/reset`
Reset jackpot to initial seed amount.

- **Method**: `POST`
- **Request Body**:
```json
{
  "resetAmount": 50000
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/jackpots/mega-trueig/reset \
  -H "Content-Type: application/json" \
  -d '{"resetAmount": 50000}'
```

---

## 7. Tournaments (`/api/tournaments`)

### `GET /api/tournaments`
List tournaments with prize pools, player counts, dates, and standings.

- **Method**: `GET`

**cURL**:
```bash
curl -s http://localhost:4000/api/tournaments
```

---

### `POST /api/tournaments/:id/register`
Register player for multi-round elimination tournament (deducts entry fee).

- **Method**: `POST`
- **Request Body**:
```json
{
  "playerName": "Ari.R"
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/tournaments/weekend-cup/register \
  -H "Content-Type: application/json" \
  -d '{"playerName": "Ari.R"}'
```

---

### `POST /api/tournaments/:id/schedule`
Schedule tournament countdown to start automatically without human intervention.

- **Method**: `POST`
- **Request Body**:
```json
{
  "delaySeconds": 30,
  "cancel": false
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/tournaments/weekend-cup/schedule \
  -H "Content-Type: application/json" \
  -d '{"delaySeconds": 30}'
```

---

### `POST /api/tournaments/:id/auto-config`
Configure hands-free automated stage progression engine and round speed.

- **Method**: `POST`
- **Request Body**:
```json
{
  "autoMode": true,
  "roundDuration": 15
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/tournaments/weekend-cup/auto-config \
  -H "Content-Type: application/json" \
  -d '{"autoMode": true, "roundDuration": 15}'
```

---

### `POST /api/tournaments/:id/start`
Launch tournament into Stage 1 (Qualifiers).

- **Method**: `POST`

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/tournaments/weekend-cup/start
```

---

### `POST /api/tournaments/:id/score-stage`
Score active round and evaluate cut line (`Qualified` vs `Eliminated`).

- **Method**: `POST`

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/tournaments/weekend-cup/score-stage
```

---

### `POST /api/tournaments/:id/advance`
Advance tournament to the next stage round.

- **Method**: `POST`

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/tournaments/weekend-cup/advance
```

---

### `POST /api/tournaments/:id/complete`
Finalize tournament, crown champion, and award $15,000 prize directly to winner's wallet.

- **Method**: `POST`
- **Request Body**:
```json
{
  "winnerName": "Ari.R"
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/tournaments/weekend-cup/complete \
  -H "Content-Type: application/json" \
  -d '{"winnerName": "Ari.R"}'
```

---

### `POST /api/tournaments/:id/reset`
Reset tournament back to registration phase for replayability.

- **Method**: `POST`

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/tournaments/weekend-cup/reset
```

---

### `GET /api/tournaments/:id/engine`
Get current auto-progression engine state and remaining round seconds.

- **Method**: `GET`

**cURL**:
```bash
curl -s http://localhost:4000/api/tournaments/weekend-cup/engine
```

---

## 8. Promotions & Rewards (`/api/promotions`)

### `GET /api/promotions`
List active promotional offers (free cards, cashback, ticket deals).

- **Method**: `GET`
- **Query Parameter**: `category` *(optional, string)* — e.g. `Free cards`, `Ticket deals`

**cURL**:
```bash
curl -s "http://localhost:4000/api/promotions?category=Free%20cards"
```

---

### `POST /api/promotions/:id/claim`
Claim promotional reward or credit.

- **Method**: `POST`
- **Request Body**:
```json
{
  "playerName": "Ari.R"
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/promotions/free75/claim \
  -H "Content-Type: application/json" \
  -d '{"playerName": "Ari.R"}'
```

---

## 9. Room Chat & Moderation (`/api/chat`)

### `GET /api/chat/:roomId`
Fetch live messages and list of muted users for room.

- **Method**: `GET`
- **Path Parameter**: `roomId` *(string)*

**cURL**:
```bash
curl -s http://localhost:4000/api/chat/diamond-75
```

---

### `POST /api/chat/:roomId`
Post a message to room chat.

- **Method**: `POST`
- **Request Body**:
```json
{
  "user": "Ari.R",
  "text": "Good luck everyone! 🍀",
  "role": "player"
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/chat/diamond-75 \
  -H "Content-Type: application/json" \
  -d '{"user": "Ari.R", "text": "Good luck everyone! 🍀"}'
```

---

### `POST /api/chat/:roomId/moderate`
Moderation action: delete a message or toggle mute on a player.

- **Method**: `POST`
- **Request Body (Delete message)**:
```json
{
  "action": "delete",
  "targetMessageId": "msg-1773678000-abcd"
}
```
- **Request Body (Mute user)**:
```json
{
  "action": "toggle-mute",
  "targetUser": "RiskyB"
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/chat/diamond-75/moderate \
  -H "Content-Type: application/json" \
  -d '{"action": "toggle-mute", "targetUser": "RiskyB"}'
```

---

### `POST /api/chat/broadcast`
Broadcast an operator announcement to one or all rooms.

- **Method**: `POST`
- **Request Body**:
```json
{
  "text": "Free Bingo starts in 5 minutes! Claim your card now.",
  "target": "all"
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/chat/broadcast \
  -H "Content-Type: application/json" \
  -d '{"text": "Free Bingo starts in 5 minutes! Claim your card now.", "target": "all"}'
```

---

## 10. Pattern Builder (`/api/patterns`)

### `GET /api/patterns`
List custom and saved winning patterns.

- **Method**: `GET`

**cURL**:
```bash
curl -s http://localhost:4000/api/patterns
```

---

### `POST /api/patterns`
Save a custom pattern designed on the 5×5 / 3×9 grid.

- **Method**: `POST`
- **Request Body**:
```json
{
  "name": "Anchor",
  "cells": [2, 7, 12, 16, 17, 18, 22],
  "layout": "5 × 5",
  "allowRotations": true,
  "allowMirroring": true
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/patterns \
  -H "Content-Type: application/json" \
  -d '{"name": "Anchor", "cells": [2, 7, 12, 16, 17, 18, 22], "layout": "5 × 5"}'
```

---

## 11. Admin Telemetry & Live Ops (`/api/admin`)

### `GET /api/admin/dashboard`
Get platform KPIs (Active Rooms, Online Players, Ticket Revenue, Prize Payout, Jackpot Liability, GGR), live operations monitor, top rooms, and real-time audit feed.

- **Method**: `GET`

**Example Response (`200 OK`)**:
```json
{
  "success": true,
  "metrics": [
    { "label": "ACTIVE ROOMS", "value": "18", "change": "+2", "icon": "▦" },
    { "label": "ONLINE PLAYERS", "value": "2,847", "change": "+12.4%", "icon": "♙" },
    { "label": "TICKET REVENUE", "value": "$48,620", "change": "+8.2%", "icon": "$" },
    { "label": "PRIZE PAYOUT", "value": "$31,840", "change": "65.5%", "icon": "◇" },
    { "label": "JACKPOT LIABILITY", "value": "$142,280", "change": "+$842", "icon": "✦" },
    { "label": "GGR TODAY", "value": "$16,780", "change": "+11.6%", "icon": "↗" }
  ],
  "liveOps": [
    { "name": "Diamond 75", "ball": "B-12", "players": "286", "progress": "28/75", "prize": "$2,000" }
  ],
  "topRooms": [
    { "name": "Mega Trueig Jackpot", "games": "22", "tickets": "8,420", "revenue": "$42,100", "ggr": "$12,840", "trend": "+18%" }
  ],
  "activityFeed": [ ... ]
}
```

**cURL**:
```bash
curl -s http://localhost:4000/api/admin/dashboard
```

---

### `GET /api/admin/players`
List players with metrics (games played, turnover, winnings, balance, status).

- **Method**: `GET`
- **Query Parameters**:
  - `search` *(optional)*: Filter by username or ID
  - `status` *(optional)*: `Active`, `Restricted`, `Suspended`

**cURL**:
```bash
curl -s "http://localhost:4000/api/admin/players?status=Active"
```

---

### `POST /api/admin/players/:id/action`
Execute admin action on player (`Suspend`, `Block`, `Add Bonus Card`).

- **Method**: `POST`
- **Request Body**:
```json
{
  "action": "Suspend"
}
```

**cURL**:
```bash
curl -s -X POST http://localhost:4000/api/admin/players/USR-10482/action \
  -H "Content-Type: application/json" \
  -d '{"action": "Suspend"}'
```

---

### `GET /api/admin/live-control`
Fetch real-time controller view of all actively calling games.

- **Method**: `GET`

**cURL**:
```bash
curl -s http://localhost:4000/api/admin/live-control
```

---

## End-to-End Simulation Workflow

You can run this complete sequential flow in your terminal to simulate a real game lifecycle:

```bash
# 1. Health check
curl -s http://localhost:4000/api/health

# 2. Deposit funds to wallet
curl -s -X POST http://localhost:4000/api/wallet/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.0}'

# 3. Buy 2 tickets in Diamond 75
curl -s -X POST http://localhost:4000/api/tickets/buy \
  -H "Content-Type: application/json" \
  -d '{"roomId": "diamond-75", "count": 2}'

# 4. Call numbers in the room
curl -s -X POST http://localhost:4000/api/game/diamond-75/call-next
curl -s -X POST http://localhost:4000/api/game/diamond-75/call-next
curl -s -X POST http://localhost:4000/api/game/diamond-75/manual-call \
  -H "Content-Type: application/json" \
  -d '{"number": 25}'

# 5. Send a chat message
curl -s -X POST http://localhost:4000/api/chat/diamond-75 \
  -H "Content-Type: application/json" \
  -d '{"user": "Ari.R", "text": "Waiting for B-12!"}'

# 6. Submit a BINGO claim
curl -s -X POST http://localhost:4000/api/game/diamond-75/claim \
  -H "Content-Type: application/json" \
  -d '{"playerName": "Ari.R", "manualPattern": "One Line"}'

# 7. Check updated wallet balance and transactions
curl -s http://localhost:4000/api/wallet
curl -s http://localhost:4000/api/wallet/transactions

# 8. Check admin dashboard metrics
curl -s http://localhost:4000/api/admin/dashboard
```
