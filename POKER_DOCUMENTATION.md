# ♠️ Trueigtech Poker (BET888CASH) — Complete Architecture, Rules & Operator Guide

A comprehensive, easy-to-understand operational and technical guide to the **BET888CASH Live Poker Platform**, including the **Core Game Engine**, **Supported Poker Variants**, **Provably Fair Shuffling Engine**, **Player Cash Game Lobby**, **Multi-Tabling Arena**, **AI Bot Opponents**, and the **Operator Backoffice & Risk Console**.

---

## 📑 Table of Contents

1. [Executive Summary & What is TIG Poker?](#1-executive-summary--what-is-tig-poker)
2. [Quick Start & Access URLs](#2-quick-start--access-urls)
3. [System Architecture & Component Flow](#3-system-architecture--component-flow)
4. [Poker Variants & Rules Explained Simply](#4-poker-variants--rules-explained-simply)
   - [4.1 No-Limit Texas Hold'em (NLH)](#41-no-limit-texas-holdem-nlh)
   - [4.2 Fixed-Limit Hold'em (FLH)](#42-fixed-limit-holdem-flh)
   - [4.3 Pot-Limit Omaha (PLO4)](#43-pot-limit-omaha-plo4)
   - [4.4 5-Card Pot-Limit Omaha (PLO5)](#44-5-card-pot-limit-omaha-plo5)
   - [4.5 Omaha Hi-Lo 8-or-Better (PLO8)](#45-omaha-hi-lo-8-or-better-plo8)
   - [4.6 Short Deck 6+ Hold'em (SD)](#46-short-deck-6-holdem-sd)
   - [4.7 Hand Rankings Hierarchy Chart](#47-hand-rankings-hierarchy-chart)
5. [Provably Fair Cryptographic Verification](#5-provably-fair-cryptographic-verification)
   - [5.1 How Provable Fairness Works in Plain English](#51-how-provable-fairness-works-in-plain-english)
   - [5.2 Cryptographic Seed Commitment (SHA-256)](#52-cryptographic-seed-commitment-sha-256)
   - [5.3 Deterministic Shuffle Algorithm (`xmur3` + `sfc32`)](#53-deterministic-shuffle-algorithm-xmur3--sfc32)
   - [5.4 Verification Recipe: Verify Any Hand Yourself](#54-verification-recipe-verify-any-hand-yourself)
6. [Core Game Engine & Table Lifecycle (`poker-engine.ts`)](#6-core-game-engine--table-lifecycle-poker-enginets)
   - [6.1 The 10 Steps of a Live Poker Hand](#61-the-10-steps-of-a-live-poker-hand)
   - [6.2 Legal Betting Actions & Validation](#62-legal-betting-actions--validation)
   - [6.3 Uncalled Bet Returns](#63-uncalled-bet-returns)
   - [6.4 Dynamic Multi-Tier Side Pots Algorithm](#64-dynamic-multi-tier-side-pots-algorithm)
   - [6.5 Split Pots & Odd Chip Allocation](#65-split-pots--odd-chip-allocation)
7. [AI Bot Brain & Monte-Carlo Decision Making](#7-ai-bot-brain--monte-carlo-decision-making)
   - [7.1 Real-Time Equity Estimation](#71-real-time-equity-estimation)
   - [7.2 Pot Odds & Decision Thresholds](#72-pot-odds--decision-thresholds)
   - [7.3 Personality Matrix (Aggression & Looseness)](#73-personality-matrix-aggression--looseness)
8. [Zero-Dependency Synthesized Audio Engine](#8-zero-dependency-synthesized-audio-engine)
9. [Player Experience & Frontend Flows](#9-player-experience--frontend-flows)
   - [9.1 Cash Game Lobby (`/cashgame`)](#91-cash-game-lobby-cashgame)
   - [9.2 Multi-Table Arena (`/holdem/tables`)](#92-multi-table-arena-holdemtables)
   - [9.3 Interactive Live Table Felt (`Bet888LiveTable.tsx`)](#93-interactive-live-table-felt-bet888livetabletsx)
   - [9.4 Buy-in, Auto-Actions & Cashout Wallet Sync](#94-buy-in-auto-actions--cashout-wallet-sync)
10. [Operator Backoffice & Risk Console (`/poker-backoffice`)](#10-operator-backoffice--risk-console-poker-backoffice)
    - [10.1 Module 1: Overview & Real-Time KPIs](#101-module-1-overview--real-time-kpis)
    - [10.2 Module 2: Live Table Control Deck](#102-module-2-live-table-control-deck)
    - [10.3 Module 3: Tables Fleet Management](#103-module-3-tables-fleet-management)
    - [10.4 Module 4: Player 360 & Dynamic "Poker Online" Access](#104-module-4-player-360--dynamic-poker-online-access)
    - [10.5 Module 5: Transactions & Financial Ledger](#105-module-5-transactions--financial-ledger)
    - [10.6 Module 6: Commission & Rake Rules Engine (3 Models)](#106-module-6-commission--rake-rules-engine-3-models)
11. [Preset Tables & Stake Tiers Reference](#11-preset-tables--stake-tiers-reference)
12. [Codebase File & Directory Map](#12-codebase-file--directory-map)
13. [Glossary of Poker Terms for Anyone](#13-glossary-of-poker-terms-for-anyone)

---

## 🌟 1. Executive Summary & What is TIG Poker?

**Trueigtech Poker (BET888CASH)** is an enterprise-grade, edge-ready, real-time online poker platform built with modern web technologies (**React**, **Next.js**, **TypeScript**, and **Web Audio API**).

It provides two distinct, synchronized interfaces:
1. **The Player Arena**: A smooth, mobile-friendly poker room where players can browse cash game tables across 5 stake tiers, enter private password/code-protected games with friends, multi-table across multiple games simultaneously, play against intelligent bots or human peers, and cash out funds directly into their unified platform wallet.
2. **The Operator Backoffice**: A mission-critical administration and risk console enabling casino managers to monitor live liquidity, remotely intervene in active hands (force next street, pause/resume tables), create and delete tables, manage player access (dynamic **"Poker Online"** switch), adjust balances, and configure commission rules across three distinct commercial revenue models.

> [!NOTE]
> **Zero external dependencies for game logic**: The core card shuffling, cryptographic hashing, 5-card evaluation, bot AI, and sound synthesis run entirely within the codebase with zero third-party casino libraries, guaranteeing lightning-fast performance and total code transparency.

---

## 🚀 2. Quick Start & Access URLs

### 2.1 Starting the Application

From the root project directory:

```bash
# 1. Install dependencies (if not already installed)
npm install

# 2. Start the Backend Express API Server (Port 4000)
npm run server

# 3. Start the Next.js Frontend Dev Server (Port 3000)
npm run dev
```

### 2.2 Navigation URLs

| Interface | URL | Description |
| :--- | :--- | :--- |
| **Cash Game Lobby** | [`http://localhost:3000/cashgame`](http://localhost:3000/cashgame) | Main poker lobby: browse tables by stake, search, filter, join private games, or create tables. |
| **Multi-Table Live Arena** | [`http://localhost:3000/holdem/tables`](http://localhost:3000/holdem/tables) | Active gameplay view with side-by-side table tabs, seat positions, and interactive betting felt. |
| **Direct Table Deep-Link** | `http://localhost:3000/holdem/tables?code=<tableId_or_inviteCode>` | Direct link to open and sit at any specific table or private club game. |
| **Poker Quick Redirect** | [`http://localhost:3000/poker`](http://localhost:3000/poker) | Convenient shortcut redirecting straight to `/cashgame`. |
| **Interactive Poker Guide** | [`http://localhost:3000/poker-guide`](http://localhost:3000/poker-guide) | Dedicated visual guide with interactive hand rankings, 5-round hand flow, betting actions, and private tables. |
| **Operator Backoffice** | [`http://localhost:3000/poker-backoffice`](http://localhost:3000/poker-backoffice) | Management console for tables, players, live controls, transactions, and commission models. |

---

## 🏗️ 3. System Architecture & Component Flow

The platform is designed around a clean separation of concerns: **Visual Representation**, **Client Table State Machine**, **Shared Event Bus & Storage Registry**, and **Operator Remote Command Deck**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           PLAYER EXPERIENCE                                                 │
│                                                                                                             │
│   Cash Game Lobby (/cashgame)                           Multi-Table Arena (/holdem/tables)                  │
│   • Stake Tier Tabs (Micro, Low, Medium, High, VIP)     • Tabbed multi-table switcher                       │
│   • Group View vs Table Grid View                       • Add/Remove active table windows                   │
│   • Private Table Join (6-character invite code)        • Instant buy-in modal & top-up                     │
│   • [+ Create Table] modal form                         • Interactive felt canvas & audio synthesizer       │
└──────────────────────────────────────┬──────────────────────────────────┬───────────────────────────────────┘
                                       │                                  │
                                       ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   POKER TABLES REGISTRY & COMMAND BUS                                       │
│                                      (app/poker/poker-tables-store.ts)                                      │
│                                                                                                             │
│   • Table Fleet Storage (localStorage: basepoker_tables_registry_v1)                                        │
│   • Commission Rules Storage (basepoker_commission_rules_v1)                                                │
│   • Player 360 & Permissions Registry (basepoker_players_registry_v1)                                      │
│   • Real-Time Command Bus (CustomEvent: basepoker_live_command)                                             │
│     - Operator actions broadcasted: "pause", "resume", "next_street", "reset_hand", "set_pot"               │
└──────────────────────────────────────┬──────────────────────────────────┬───────────────────────────────────┘
                                       ▲                                  │
                                       │                                  ▼
┌──────────────────────────────────────┴───────┐        ┌─────────────────────────────────────────────────────┐
│             OPERATOR BACKOFFICE              │        │               CORE GAME ENGINE                      │
│           (/poker-backoffice)                │        │          (app/poker/poker-engine.ts)                │
│                                              │        │                                                     │
│   1. Overview & KPIs (Liquidity, Rake 24h)   │        │   • Provably Fair Shuffling Engine:                 │
│   2. Live Table Control (Street/Runout Overrides)│    │     - SHA-256 pre-deal commitment hash              │
│   3. Tables Fleet (Create, Pause, Delete)    │        │     - xmur3 128-bit hash + sfc32 32-bit PRNG        │
│   4. Player 360 (Dynamic "Poker Online" Switch)│      │     - Fisher-Yates deck shuffle                     │
│   5. Financial Ledger & Wallet Audit         │        │   • 6 Variant Evaluators (NLH, FLH, PLO4, PLO5,     │
│   6. Commission Rules (Rake, Hand Fee, Table Fee)│    │     PLO8 Hi-Lo, Short Deck 6+)                      │
└──────────────────────────────────────────────┘        │   • Multi-tier side pots calculator (buildPots)     │
                                                        │   • Monte-Carlo AI Bot decision brain (botDecide)   │
                                                        └─────────────────────────────────────────────────────┘
```

---

## 🃏 4. Poker Variants & Rules Explained Simply

The TIG Poker Engine natively supports **6 world-standard poker variants**. Below is an easy-to-understand breakdown of how each variant works.

### 4.1 No-Limit Texas Hold'em (`NLH`)
* **Hole Cards**: 2 private cards dealt face-down to each player.
* **Community Cards**: 5 shared cards on the board (Flop of 3, Turn of 1, River of 1).
* **Hand Construction**: Best 5-card combination using **any mix** of your 2 hole cards and the 5 community cards (2 hole + 3 board, 1 hole + 4 board, or all 5 board cards).
* **Betting Limit**: **No-Limit**. A player can bet any amount from the minimum bet up to their entire chip stack ("All-in") at any time.

### 4.2 Fixed-Limit Hold'em (`FLH`)
* **Hole & Board**: Same as Texas Hold'em (2 private + 5 community cards).
* **Betting Limit**: **Fixed-Limit**. Bets and raises must occur in exact fixed increments:
  * Pre-flop & Flop: Bets are fixed to the **Small Bet** (1 Big Blind).
  * Turn & River: Bets are fixed to the **Big Bet** (2 Big Blinds).
  * Maximum **4 raises** per betting round (Bet, Raise, Re-raise, Cap).

### 4.3 Pot-Limit Omaha (`PLO4`)
* **Hole Cards**: 4 private cards dealt face-down to each player.
* **The Golden Omaha Rule**: You **MUST use exactly 2 cards from your hand and exactly 3 cards from the board**.
  > [!WARNING]
  > **Crucial Omaha Rule**: Even if you hold 4 Aces in your hand, you only hold a pair of Aces because you can only use 2 of them!
* **Betting Limit**: **Pot-Limit**. The maximum a player can raise is the current size of the total pot.

### 4.4 5-Card Pot-Limit Omaha (`PLO5` / Big O)
* **Hole Cards**: 5 private cards dealt face-down to each player.
* **Action**: Extremely high action with massive drawing opportunities.
* **The Rule**: Identical to PLO4 — you **MUST use exactly 2 hole cards and exactly 3 board cards**.
* **Betting Limit**: Pot-Limit.

### 4.5 Omaha Hi-Lo 8-or-Better (`PLO8`)
* **Hole Cards**: 4 private cards.
* **The Split Pot**: At showdown, the pot is divided **50% to the Best High Hand** and **50% to the Best Qualifying Low Hand**.
* **Low Qualification ("8-or-Better")**:
  * A qualifying low hand must have **5 distinct cards ranked 8 or lower** (Aces count as 1 for the low hand).
  * No pairs or multiples allowed for the low hand.
  * The best possible low is `A-2-3-4-5` ("The Wheel" or "Nut Low").
  * Low hands are compared from the highest card down (e.g. `6-5-4-3-2` beats `7-4-3-2-A`).
* **Scooping**: If no player qualifies for a low hand (e.g., the board does not have at least 3 cards ranked 8 or below), the entire pot is awarded to the Best High Hand!

### 4.6 Short Deck 6+ Hold'em (`SD`)
* **Deck Size**: **36 cards** (all cards from 2 through 5 are completely removed from the deck).
* **Special Straight Rule**: The Ace can act as a high card (`A-K-Q-J-T`) or as a low card (`A-6-7-8-9`, functioning like a 5).
* **Altered Hand Rankings**:
  Because the card removal changes mathematical probabilities:
  1. **Flush BEATS Full House** (Flushes are harder to make with only 9 cards per suit).
  2. **Three of a Kind BEATS Straight** (Straights are much easier to hit with fewer ranks).

---

### 4.7 Hand Rankings Hierarchy Chart

Here is the official ranking from highest to lowest. Compare Standard Poker vs. Short Deck:

| Rank | Hand Name | Example | Standard (NLH / FLH / PLO) | Short Deck 6+ (`SD`) |
| :---: | :--- | :--- | :---: | :---: |
| **1** | **Royal Flush** | A♠ K♠ Q♠ J♠ T♠ | Highest possible hand | Highest possible hand |
| **2** | **Straight Flush** | 9♦ 8♦ 7♦ 6♦ 5♦ | 2nd highest | 2nd highest |
| **3** | **Four of a Kind (Quads)**| K♠ K♥ K♦ K♣ 4♣ | 3rd highest | 3rd highest |
| **4** | **Flush** | A♣ J♣ 8♣ 6♣ 2♣ | 5th (below Full House) | **4th (BEATS Full House)** 🚨 |
| **5** | **Full House** | Q♠ Q♥ Q♦ 7♣ 7♥ | 4th (above Flush) | **5th (below Flush)** 🚨 |
| **6** | **Three of a Kind (Trips)**| 9♠ 9♥ 9♦ A♣ K♦ | 7th (below Straight) | **6th (BEATS Straight)** 🚨 |
| **7** | **Straight** | 8♠ 7♥ 6♦ 5♣ 4♠ | 6th (above Trips) | **7th (below Trips)** 🚨 |
| **8** | **Two Pair** | J♠ J♦ 4♣ 4♥ A♠ | 8th | 8th |
| **9** | **One Pair** | T♠ T♣ K♦ 7♥ 3♠ | 9th | 9th |
| **10**| **High Card** | A♦ Q♠ 9♥ 6♣ 3♦ | Lowest | Lowest |

---

## 🔒 5. Provably Fair Cryptographic Verification

Online poker requires 100% trust. Players must know that the deck was **not manipulated** after their bets were placed, and operators need mathematical proof that the game is untampered.

Trueigtech Poker uses a **Provably Fair Seed-Commitment Protocol** using cryptographic SHA-256 hashes.

```
       BEFORE THE HAND STARTS                      DURING THE HAND                        AFTER THE HAND
┌────────────────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────────────────┐
│ 1. Server generates random secret  │       │ 3. Cards dealt to felt │       │ 5. Hand finishes. Server reveals   │
│    SEED string:                    │       │    using deterministic │       │    plain SEED string in summary log│
│    "a9b8c7...3f2e1d"               │       │    PRNG:                   │       │    "a9b8c7...3f2e1d"               │
│                                    │       │    xmur3(seed) + sfc32 │       │                                    │
│ 2. Server calculates SHA-256 hash: │──────>│                        │──────>│ 6. Player or auditor hashes the    │
│    HASH = sha256(SEED)             │       │ 4. Players bet, fold,  │       │    seed: sha256(seed).             │
│    and publishes HASH in the log   │       │    and call on live    │       │    Does it match the HASH from     │
│    BEFORE any cards are dealt!     │       │    table                   │       │    Step 2? YES = 100% FAIR!        │
└────────────────────────────────────┘       └────────────────────────┘       └────────────────────────────────────┘
```

### 5.1 How Provable Fairness Works in Plain English
1. **The Lockbox**: Before a single card is dealt, the computer shuffles the deck using a secret random password (the `seed`).
2. **The Fingerprint**: The computer takes a cryptographic fingerprint of that password (`sha256(seed)`) and announces it publicly in the game table log:
   ```
   TIG Hand #H38F89: No-Limit Hold'em (1.00/2.00)
   Seed hash (committed pre-deal): 4f53cda18c2429fbb6d4a82c9e782e1...
   ```
3. **No Changes Possible**: Because the fingerprint was published beforehand, the server **cannot change the deck order mid-hand**, because changing even a single card would produce a completely different fingerprint!
4. **The Reveal**: When the hand is over, the table reveals the secret password in the summary:
   ```
   *** SUMMARY ***
   Total pot 145.00 | Rake 7.25 | Board [A♠ K♥ Q♦ 10♣ 7♥]
   Seed revealed: e4b81c2f90a773d2a1b9c8d7...
   ```
5. **Instant Proof**: Anyone can verify that hashing the revealed seed matches the fingerprint published before the cards were dealt.

### 5.2 Cryptographic Seed Commitment (`sha256`)
In [`app/poker/poker-engine.ts`](file:///Users/side%20project/tig-bingo/app/poker/poker-engine.ts#L54-L123), the engine implements standard FIPS-180-2 compliant SHA-256 to create deterministic 64-character hexadecimal digests.

### 5.3 Deterministic Shuffle Algorithm (`xmur3` + `sfc32`)
The shuffle uses two mathematical functions:
1. `xmur3(seed)`: A 32-bit Murmur3-based hash that mixes the seed string into 4 32-bit internal integer states.
2. `sfc32(a, b, c, d)`: A Small Fast Counter PRNG (Part of the PractRand test suite) with a colossal period of $2^{128}$ iterations.
3. **Fisher-Yates Shuffle**: Iterates backwards from $N-1$ down to 1, swapping each element with a pseudo-random index $j \le i$.

### 5.4 Verification Recipe: Verify Any Hand Yourself

You can verify any past hand using standard Node.js or browser developer console:

```javascript
// Step 1: Copy the revealed seed from your hand history summary
const revealedSeed = "9a7d32c4f801b7a2d5e3c8f1a4b6c9d0";

// Step 2: Calculate its SHA-256 digest
async function verifyHand(seed, expectedPreDealHash) {
  const msgUint8 = new TextEncoder().encode(seed);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  console.log("Calculated Pre-Deal Hash:", calculatedHash);
  console.log("Expected Pre-Deal Hash:  ", expectedPreDealHash);
  
  if (calculatedHash === expectedPreDealHash) {
    console.log("✅ VERIFIED: Deck was 100% fair and never altered!");
  } else {
    console.error("❌ MISMATCH: Deck does not match pre-deal commitment!");
  }
}
```

---

## ⚙️ 6. Core Game Engine & Table Lifecycle (`poker-engine.ts`)

The `PokerTable` class is a deterministic, finite state machine that coordinates every stage of the hand.

### 6.1 The 10 Steps of a Live Poker Hand

```
 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 │ 1. ELIGIBILITY CHECK: Table verifies at least 2 active seated players with stack > 0.     │
 └─────────────────────────────┬─────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 │ 2. BLINDS & ANTES POSTING: Button moves clockwise. Ante deducted. SB & BB placed in pots. │
 └─────────────────────────────┬─────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 │ 3. DEALING HOLE CARDS: Cards dealt one at a time starting from seat left of the button.   │
 └─────────────────────────────┬─────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 │ 4. PRE-FLOP BETTING ROUND: Action starts Under-The-Gun (left of BB). Players Fold/Call/   │
 │    Raise until all remaining players have contributed equal bets.                         │
 └─────────────────────────────┬─────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 │ 5. THE FLOP: 1 burn card discarded. 3 community cards dealt face-up to the board.        │
 │    Flop betting round begins with first active player left of Button.                     │
 └─────────────────────────────┬─────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 │ 6. THE TURN: 1 burn card discarded. 4th community card dealt face-up. Turn betting round. │
 └─────────────────────────────┬─────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 │ 7. THE RIVER: 1 burn card discarded. 5th community card dealt face-up. Final betting.     │
 └─────────────────────────────┬─────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 │ 8. SHOWDOWN: Evaluator calculates best 5-card hands. Omaha rules & Hi-Lo splits evaluated.│
 └─────────────────────────────┬─────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 │ 9. POT & RAKE DISTRIBUTION: Rake calculated according to rules. Main & Side pots awarded. │
 └─────────────────────────────┬─────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 │ 10. SUMMARY & SEED REVEAL: Full hand history log written. Plain PRNG seed revealed.      │
 └───────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Legal Betting Actions & Validation
The engine's `legal(seatIndex)` method computes exact permissible actions for the active player:
* **Fold**: Permitted whenever facing a bet (`toCall > 0`).
* **Check**: Permitted whenever facing zero bet (`toCall === 0`).
* **Call**: Requires matching `toCall` or going all-in if `stack < toCall`.
* **Raise**:
  * Minimum Raise: Equal to `currentBet + lastRaiseSize`.
  * Pot-Limit Maximum: Calculated as `currentBet + totalPot + toCall`.
  * No-Limit Maximum: Equal to player's entire remaining stack (`stack + bet`).

### 6.3 Uncalled Bet Returns
If Player A bets €50 and Player B calls only €20 (because Player B has only €20 left), Player A's extra €30 is **immediately refunded** before dealing further cards. No player can win more than an opponent can call.

### 6.4 Dynamic Multi-Tier Side Pots Algorithm
When multiple players go all-in with different stack sizes, the engine executes `buildPots()`:
1. Distinct bet levels are sorted in ascending order (e.g. €20, €50, €100).
2. For each tier, an incremental pot slice is created:
   $$\text{Slice Amount} = \sum \max(0, \min(\text{Player Total}, \text{Level}) - \text{Previous Level})$$
3. An eligibility list (`elig`) is assigned to each pot slice containing only the players who contributed up to that level and have not folded.
4. Each pot slice is evaluated independently at showdown!

### 6.5 Split Pots & Odd Chip Allocation
When two or more players tie for the best hand:
* The pot amount is split equally among winners: $\text{Share} = \lfloor \text{Pot} / N \rfloor$.
* Any odd chip remainder (cents or chips) is awarded to the tied player sitting **closest clockwise to the Dealer Button**.

---

## 🤖 7. AI Bot Brain & Monte-Carlo Decision Making

TIG Poker includes an intelligent, autonomous bot decision brain in [`app/poker/poker-engine.ts`](file:///Users/side%20project/tig-bingo/app/poker/poker-engine.ts#L939-L1019) (`estimateEquity` and `botDecide`) that can play at cash game tables when waiting for human players.

### 7.1 Real-Time Equity Estimation
Bots do not cheat — they have zero knowledge of opponents' hole cards. Instead, they calculate their mathematical winning probability using a **Monte-Carlo simulator**:
* The bot takes its own 2 cards + existing board cards.
* In each iteration, it deals random remaining cards to simulate unknown opponents and the rest of the board.
* It calculates how often its hand beats the opponents.
* Number of iterations: **160 iterations** for Texas Hold'em, **48 iterations** for PLO4, **36 iterations** for PLO5.

### 7.2 Pot Odds & Decision Thresholds
The bot compares its estimated winning equity against the pot odds:
$$\text{Pot Odds} = \frac{\text{Amount to Call}}{\text{Total Pot} + \text{Amount to Call}}$$

* If $\text{Winning Equity} > \text{Pot Odds} \times 1.05$: The call has positive expected value ($+EV$) $\rightarrow$ **Bot Calls**.
* If $\text{Relative Strength} > 1.9$: Bot considers raising/betting $\rightarrow$ **Bot Bets 60% to 110% of Pot**.
* If facing a heavy bet with weak equity $\rightarrow$ **Bot Folds**.

### 7.3 Personality Matrix (Aggression & Looseness)
Every bot is assigned a personality profile:
* **Aggression (`aggr` between 0.1 and 0.9)**: Influences how frequently the bot bets or raises when checking is an option, and how often it attempts bluffs.
* **Looseness (`loose` between 0.1 and 0.9)**: Influences how wide a range of starting hands the bot is willing to play pre-flop.

---

## 🔊 8. Zero-Dependency Synthesized Audio Engine

In [`app/poker/Bet888LiveTable.tsx`](file:///Users/side%20project/tig-bingo/app/poker/Bet888LiveTable.tsx#L36-L151), the platform features a zero-asset browser sound synthesizer:
* **No external audio files**: Does not load bulky `.wav` or `.mp3` files over the network.
* **Instant latency**: Generates sound waves directly in the browser's audio processor via the Web Audio API (`AudioContext`).

| Sound Action | Method | Synthesizer Parameters | Experience |
| :--- | :--- | :--- | :--- |
| **Card Deal** | `playDeal()` | Sine wave swept 440 Hz $\rightarrow$ 180 Hz over 80ms | Crisp, subtle card slide |
| **Chip Click** | `playChip()` | Triangle wave swept 800 Hz $\rightarrow$ 300 Hz over 50ms | Authentic ceramic chip clink |
| **Check Knock** | `playCheck()` | Low Sine wave at 150 Hz over 60ms | Double table-felt tap |
| **Player Turn** | `playTurn()` | 2-tone chime (587 Hz D5 then 880 Hz A5) | Attention alert when it's your turn |
| **Winner Fanfare**| `playWin()` | 4-chord harmonic arpeggio (C5, E5, G5, C6) | Celebratory winning melody |

---

## 🎮 9. Player Experience & Frontend Flows

### 9.1 Cash Game Lobby (`/cashgame`)

The Cash Game Lobby is the central meeting place for players:

1. **Stake Tier Tabs**:
   * **ALL**: Complete fleet overview.
   * **MICRO**: Blinds from €0.01/€0.02 up to €1/€2.
   * **LOW**: Blinds €2/€5 and Heads-Up tables.
   * **MEDIUM**: Blinds €5/€10 and €10/€20.
   * **HIGH**: Blinds €25/€50 and €50/€100.
   * **VIP**: Blinds €100/€200 (Monaco Elite).
2. **View Modes**:
   * **Group View**: Cards grouped by stake tier with average pot, hands per hour, and waitlist counters.
   * **Table Grid View**: Compact tabular display with real-time seats occupied and commission tags.
3. **Private Games with Friends (Passcode Protected)**:
   * **Hidden Codes on Cards**: Private table cards never expose the invite code on the card or in the preview pane; they display a sleek `🔒 PRIVATE TABLE · CODE REQUIRED` locked badge.
   * **Interactive Passcode Modal**: Clicking anywhere on a private table card, "PLAY NOW", or "Open Table" immediately opens an interactive **Private Table Access Modal**, prompting the player to enter the secret 6-character invite code (e.g. `7KJ8P9`). Only entering the correct code unlocks and launches the table.
   * **Quick Join by Code**: Players who already know their code can also use the top header input to jump directly into the game.
4. **Create Table Modal**:
   * Players and operators can spawn custom tables on the fly, selecting blinds, buy-in ranges, seat limits, and public/private privacy.

### 9.2 Multi-Table Arena (`/holdem/tables`)
* **Multi-Tabling**: Players can keep multiple active tables open at once, switching seamlessly between tabs.
* **Deep Links**: Direct URL query parameters support joining any table directly: `/holdem/tables?code=peja-vip-25-50`.

### 9.3 Interactive Live Table Felt (`Bet888LiveTable.tsx`)
* **Felt Themes**: Customizable table themes (**Green Classic**, **Blue Velvet**, **Red VIP**, **Purple Elite**).
* **Seat Geometry**: Automatically positions 2 to 9 players around an oval felt with active dealer button, animated avatar rings, and real-time chip counts.
* **Live Hand Evaluator Badge**: Continuously notifies the player of their current best hand strength (e.g., *"Full house, Queens full of Sevens"*).
* **Betting Controls**:
  * Fold button.
  * Check / Call button showing exact amount.
  * Min-Raise, 2.5x, 3x, Pot, and All-in quick shortcuts.
  * Continuous slider for granular bet sizing.
* **Auto-Action Checkboxes**: Pre-select "Check / Fold" or "Call Any" while waiting for opponents to act.

### 9.4 Buy-in & Cashout Wallet Sync
* **Entering Table**: Player selects buy-in amount within table parameters (min to max). The buy-in is deducted from the player's unified platform wallet balance.
* **Leaving Table (Stand Up)**: Remaining table stack (including all winnings) is **instantly credited back to the player's wallet balance**, accompanied by a toast notification and audit ledger entry!

---

## 🛠️ 10. Operator Backoffice & Risk Console (`/poker-backoffice`)

The Operator Backoffice provides 6 mission-critical operational and risk modules:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           TIG POKER OPERATOR & RISK BACKOFFICE                              │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────┬───────────────────┤
│  Dashboard  │  Live Deck  │ Table Fleet │ Player 360  │ Financial Ledger│  Commission Rules │
│   (KPIs)    │ (Intervene) │   (Fleet)   │ (Access RG) │  (All Audits)   │   (3 Models)      │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────────┴───────────────────┘
```

### 10.1 Module 1: Overview & Real-Time KPIs
Displays macro-level platform performance:
* **Total Poker Liquidity**: Combined chips across all tables and active player balances.
* **Active Tables & Occupancy**: Number of active ring games and seat fill rates.
* **Commission Revenue (24h)**: Live breakdown of earnings across the 3 commission models.

### 10.2 Module 2: Live Table Control Deck
Operators can remotely oversee and manipulate live games:
* **Select Table**: Choose any active table across the platform.
* **Community Cards Live Feed**: View live Flop, Turn, and River cards.
* **Operator Interventions**:
  * **[⏸ Pause / Resume Table]**: Instantly freeze gameplay or resume play.
  * **[⏩ Force Next Street]**: Advance the hand from Pre-flop $\rightarrow$ Flop $\rightarrow$ Turn $\rightarrow$ River $\rightarrow$ Showdown.
  * **[↺ Reset Hand]**: Cancel a stuck hand and restart dealing.
  * **Action Speed Override**: Adjust clock countdowns (Fast 10s, Normal 15s, Slow 25s).

### 10.3 Module 3: Tables Fleet Management
Full fleet lifecycle control:
* **Add Table**: Create new tables with custom names, blinds, minimum/maximum buy-ins, seats (2, 6, 9), and fee models.
* **Toggle Status**: Pause or resume any table with one click.
* **Delete Table**: Remove inactive tables from the lobby.
* **Private Table Codes**: Inspect and manage 6-character club invite codes.

### 10.4 Module 4: Player 360 & Dynamic "Poker Online" Access
Manage player safety, VIP tiers, and regulatory access:
* **Directory Search**: Search players by name, username, or country.
* **Dynamic "Poker Online" Switch**:
  > [!IMPORTANT]
  > Operators can **instantly revoke or grant poker access** for any player in real time. If access is toggled off, the player is immediately barred from joining cash game tables.
* **VIP Tiers**: Bronze, Silver, Gold, Platinum, Diamond.
* **Direct Balance Adjustments**: Operator modal to credit or debit chip balances directly with custom audit reason notes.

### 10.5 Module 5: Transactions & Financial Ledger
Complete audit history recording every poker transaction across all players:
* Table Buy-ins (`BUY_IN`)
* Table Cashouts (`CASHOUT`)
* Rake Deductions (`RAKE`)
* Direct Balance Adjustments (`CREDIT` / `DEBIT`)
* Export and search capabilities.

### 10.6 Module 6: Commission & Rake Rules Engine (3 Models)

TIG Poker supports **3 distinct operator monetization models**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            3 COMMERCIAL COMMISSION REVENUE MODELS                           │
├───────────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│   MODEL 1: STANDARD RAKE      │    MODEL 2: FLAT HAND FEE   │    MODEL 3: TIMED TABLE FEE   │
│                               │                             │                               │
│ • % of total pot (default 5%) │ • Fixed charge per hand     │ • Time rental per seat        │
│ • Configurable Cap (e.g. €15) │   played (e.g. €2 / hand)   │   (e.g. €20 every 30 minutes) │
│ • No-Flop-No-Drop Toggle      │ • Ideal for high-stakes     │ • Ideal for private VIP clubs │
│   (zero rake taken pre-flop)  │   and fixed-limit tables    │   and scheduled tournaments   │
└───────────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

1. **Model 1: Standard Pot Rake**:
   * Formula: $\text{Rake} = \min\left(\lfloor \text{Pot} \times \frac{\text{Rake } \%}{100} \rfloor, \text{Rake Cap}\right)$
   * **No-Flop-No-Drop Rule**: When enabled, if the hand ends pre-flop without any community cards dealt (e.g. everyone folds to a pre-flop raise), **zero rake is deducted**.
2. **Model 2: Flat Hand Fee**:
   * A fixed flat amount deducted from the pot for every completed hand (e.g., €2 / hand).
3. **Model 3: Timed Table Fee (Seat Rental)**:
   * Time-based seat rental charged to seated players at fixed intervals (e.g., €20 every 30 minutes).

---

## 📊 11. Preset Tables & Stake Tiers Reference

The platform ships with a pre-configured fleet of 10 tables representing all stakes and fee models:

| Table ID | Table Name | Tier | Blinds (SB / BB) | Buy-in Range | Seats | Fee Model | Fee Label | Theme |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `micro-001-002` | Micro NLH 0.01/0.02 | **Micro** | €0.01 / €0.02 | €0.80 - €4.00 | 6 | RAKE | RAKE 5% | Green |
| `shkodra-micro-1-2` | Shkodra Micro 1/2 | **Micro** | €1 / €2 | €40 - €400 | 6 | RAKE | RAKE 5% | Green |
| `prishtina-2-5` | Prishtina 2/5 | **Low** | €2 / €5 | €100 - €1,000 | 6 | RAKE | RAKE 5% | Green |
| `prizren-1-2` | Prizren 1/2 Heads-Up | **Low** | €1 / €2 | €40 - €200 | 2 | RAKE | RAKE 5% | Blue |
| `prishtina-5-10` | Prishtina 5/10 | **Medium** | €5 / €10 | €200 - €2,000 | 6 | RAKE | RAKE 5% | Green |
| `mitrovica-10-20` | Mitrovica 10/20 | **Medium** | €10 / €20 | €400 - €4,000 | 9 | HAND_FEE | €2 / HAND | Blue |
| `peja-vip-25-50` | Peja VIP 25/50 | **High** | €25 / €50 | €1,000 - €10,000| 6 | TABLE_FEE | €20 / 30MIN| Red |
| `tirana-50-100` | Tirana High Roller | **High** | €50 / €100 | €2,000 - €20,000| 9 | RAKE | RAKE 5% (max €100) | Green |
| `vip-monaco-100-200` | Monaco Elite 100/200| **VIP** | €100 / €200 | €5,000 - €50,000| 6 | RAKE | RAKE 5% (max €200) | Purple|
| `private-demo-7kj8p9` | VIP Private Friends Club| **Medium** | €5 / €10 | €200 - €2,000 | 6 | PRIVATE | Code: `7KJ8P9` | Purple|

---

## 📁 12. Codebase File & Directory Map

| Path | Category | Purpose |
| :--- | :--- | :--- |
| [`app/poker/poker-types.ts`](file:///Users/side%20project/tig-bingo/app/poker/poker-types.ts) | TypeScript Types | Definitions for cards, hands, evaluation results, table configs, player states, legal actions, and tournament models. |
| [`app/poker/poker-engine.ts`](file:///Users/side%20project/tig-bingo/app/poker/poker-engine.ts) | Core Engine | Provably fair PRNG, SHA-256 seed hashing, 6 variant evaluators, side pot generator, and Monte-Carlo bot AI. |
| [`app/poker/poker-tables-store.ts`](file:///Users/side%20project/tig-bingo/app/poker/poker-tables-store.ts) | State Store & Bus | Persistent table registry, real-time command bus (`basepoker_live_command`), commission rules, and Player 360 permissions. |
| [`app/poker/Bet888LiveTable.tsx`](file:///Users/side%20project/tig-bingo/app/poker/Bet888LiveTable.tsx) | Live Table UI | Interactive felt canvas, seat chip animations, live hand ranking badges, betting controls, and synthesized audio. |
| [`app/poker/poker.css`](file:///Users/side%20project/tig-bingo/app/poker/poker.css) | Styling | High-definition styling for felt tables, card flips, chip stacks, dealer button, and action controls. |
| [`app/poker/page.tsx`](file:///Users/side%20project/tig-bingo/app/poker/page.tsx) | Next.js Page | Quick redirect page routing `/poker` $\rightarrow$ `/cashgame`. |
| [`app/cashgame/BasepokerCashgameLobby.tsx`](file:///Users/side%20project/tig-bingo/app/cashgame/BasepokerCashgameLobby.tsx) | Player Lobby | Stake tier filtering, group/table views, private table code joining, and table creation modal. |
| [`app/holdem/tables/BasepokerHoldemTablesView.tsx`](file:///Users/side%20project/tig-bingo/app/holdem/tables/BasepokerHoldemTablesView.tsx) | Multi-Table View | Tabbed multi-table arena supporting switching between multiple simultaneous ring tables. |
| [`app/poker-backoffice/PokerBackofficeApp.tsx`](file:///Users/side%20project/tig-bingo/app/poker-backoffice/PokerBackofficeApp.tsx) | Operator Console | 6-module management console for KPIs, live controls, fleet operations, player access, and commission models. |

---

## 📖 13. Glossary of Poker Terms for Anyone

| Term | Simple Definition |
| :--- | :--- |
| **All-In** | Wager of a player's entire remaining chip stack on the table. |
| **Ante** | Small mandatory fee paid by every player at the start of a hand before any cards are dealt. |
| **Big Blind (BB)** | Mandatory bet placed by the player two seats left of the dealer button before cards are dealt. |
| **Bluff** | Betting or raising with a weak hand to persuade players with stronger hands to fold. |
| **Board / Community Cards** | The 5 face-up cards shared by all players on the table. |
| **Button (BTN / Dealer)** | The marker indicating the nominal dealer. Position acts last on all post-flop betting rounds (strategic advantage). |
| **Call** | Matching the current highest bet made by an opponent. |
| **Check** | Passing the action to the next player without betting when no bet has been made in the current round. |
| **Check-Raise** | Checking when it is your turn, and then raising after an opponent bets. |
| **Flop** | The first 3 community cards dealt face-up simultaneously. |
| **Fold** | Surrendering your cards and relinquishing any claim to the current pot. |
| **Heads-Up (HU)** | A poker game played with only 2 players. |
| **Main Pot** | The primary pot containing bets that all active players are eligible to win. |
| **Muck** | Discarding cards face-down without showing them to opponents. |
| **No-Flop-No-Drop** | Casino rule where zero rake is deducted if the hand ends before the flop is dealt. |
| **Nut Hand (The Nuts)**| The absolute best possible unbeatable hand given the current board cards. |
| **Pot Odds** | The ratio of the current pot size compared to the cost of making a call. |
| **Rake** | The small fee (usually 3% - 5%) collected by the casino/operator from the pot for hosting the game. |
| **Rake Cap** | The maximum dollar or euro amount of rake the casino can take from a single hand. |
| **River** | The 5th and final community card dealt face-up. |
| **Runout** | The dealing of the remaining community cards to completion. |
| **Showdown** | The final stage where remaining players reveal their cards to determine the winner. |
| **Side Pot** | An additional pot formed when one or more players go all-in and other players continue betting more chips. |
| **Small Blind (SB)** | Mandatory bet placed by the player directly left of the dealer button (typically half the Big Blind). |
| **Split Pot** | A pot divided equally between two or more players who hold identical winning hands. |
| **Turn** | The 4th community card dealt face-up. |
| **Under-The-Gun (UTG)**| The player seated directly to the left of the Big Blind who must act first pre-flop. |

---

*Trueigtech Poker (BET888CASH) &copy; 2026. All rights reserved.*
