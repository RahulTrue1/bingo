"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, ShieldCheck, Lock, Sparkle, Question, PokerChip, Trophy, CaretRight, CheckCircle, Info } from "@phosphor-icons/react";

export default function PokerGuidePage() {
  const [activeTab, setActiveTab] = useState<
    "rankings" | "flow" | "actions" | "variants" | "private" | "wallet" | "fairness"
  >("rankings");

  const [selectedHandRank, setSelectedHandRank] = useState<number>(0);

  // Hand Rankings Dataset with visual card styling
  const handRankings = [
    {
      id: 0,
      name: "Royal Flush",
      rankText: "Rank #1 · The Rarest & Highest Hand",
      description: "An Ace, King, Queen, Jack, and Ten, all of the exact same suit. It is completely unbeatable.",
      cards: [
        { r: "A", s: "♠", color: "white" },
        { r: "K", s: "♠", color: "white" },
        { r: "Q", s: "♠", color: "white" },
        { r: "J", s: "♠", color: "white" },
        { r: "10", s: "♠", color: "white" },
      ],
      exampleText: "Example: A♠ K♠ Q♠ J♠ 10♠. If you hold this, you win 100% of the time!",
      frequency: "1 in 649,740 hands",
    },
    {
      id: 1,
      name: "Straight Flush",
      rankText: "Rank #2 · Five Cards in Sequence of Same Suit",
      description: "Any 5 consecutive cards of the same suit that is not a Royal Flush.",
      cards: [
        { r: "9", s: "♦", color: "red" },
        { r: "8", s: "♦", color: "red" },
        { r: "7", s: "♦", color: "red" },
        { r: "6", s: "♦", color: "red" },
        { r: "5", s: "♦", color: "red" },
      ],
      exampleText: "Example: 9♦ 8♦ 7♦ 6♦ 5♦ beats any Four of a Kind or Full House.",
      frequency: "1 in 72,193 hands",
    },
    {
      id: 2,
      name: "Four of a Kind (Quads)",
      rankText: "Rank #3 · Four Cards of the Exact Same Rank",
      description: "Four cards of identical numerical value plus any fifth kicker card.",
      cards: [
        { r: "K", s: "♠", color: "white" },
        { r: "K", s: "♥", color: "red" },
        { r: "K", s: "♦", color: "red" },
        { r: "K", s: "♣", color: "white" },
        { r: "4", s: "♣", color: "white" },
      ],
      exampleText: "Example: Four Kings (K-K-K-K-4). If another player also has four of a kind, higher rank wins.",
      frequency: "1 in 4,165 hands",
    },
    {
      id: 3,
      name: "Full House (Boat)",
      rankText: "Rank #4 in Standard Poker · Three of a Kind + One Pair",
      description: "Three cards of one rank matched with two cards of another rank.",
      cards: [
        { r: "Q", s: "♠", color: "white" },
        { r: "Q", s: "♥", color: "red" },
        { r: "Q", s: "♦", color: "red" },
        { r: "7", s: "♣", color: "white" },
        { r: "7", s: "♥", color: "red" },
      ],
      exampleText: "Example: Three Queens and Two Sevens (Queens full of Sevens). Beats a Flush in standard poker!",
      frequency: "1 in 694 hands",
    },
    {
      id: 4,
      name: "Flush",
      rankText: "Rank #5 in Standard Poker · 5 Cards of the Same Suit",
      description: "Any five cards of the same suit, not in sequential order.",
      cards: [
        { r: "A", s: "♣", color: "white" },
        { r: "J", s: "♣", color: "white" },
        { r: "8", s: "♣", color: "white" },
        { r: "6", s: "♣", color: "white" },
        { r: "2", s: "♣", color: "white" },
      ],
      exampleText: "Example: Ace-high Club Flush (A♣ J♣ 8♣ 6♣ 2♣). In Short Deck 6+, a Flush BEATS a Full House!",
      frequency: "1 in 508 hands",
    },
    {
      id: 5,
      name: "Straight",
      rankText: "Rank #6 in Standard Poker · 5 Consecutive Cards",
      description: "Five sequential cards of mixed suits. Aces can count high (A-K-Q-J-10) or low (5-4-3-2-A).",
      cards: [
        { r: "8", s: "♠", color: "white" },
        { r: "7", s: "♥", color: "red" },
        { r: "6", s: "♦", color: "red" },
        { r: "5", s: "♣", color: "white" },
        { r: "4", s: "♠", color: "white" },
      ],
      exampleText: "Example: 8-7-6-5-4 Straight. In Short Deck 6+, Three of a Kind beats a Straight!",
      frequency: "1 in 254 hands",
    },
    {
      id: 6,
      name: "Three of a Kind (Trips / Set)",
      rankText: "Rank #7 in Standard Poker · Three Cards of Same Rank",
      description: "Three cards of identical numerical value and two unmatched kickers.",
      cards: [
        { r: "9", s: "♠", color: "white" },
        { r: "9", s: "♥", color: "red" },
        { r: "9", s: "♦", color: "red" },
        { r: "A", s: "♣", color: "white" },
        { r: "K", s: "♦", color: "red" },
      ],
      exampleText: "Example: Three Nines with Ace-King kickers (9-9-9-A-K).",
      frequency: "1 in 47 hands",
    },
    {
      id: 7,
      name: "Two Pair",
      rankText: "Rank #8 · Two Distinct Pairs of Cards",
      description: "Two cards of one rank, two cards of another rank, plus one kicker.",
      cards: [
        { r: "J", s: "♠", color: "white" },
        { r: "J", s: "♦", color: "red" },
        { r: "4", s: "♣", color: "white" },
        { r: "4", s: "♥", color: "red" },
        { r: "A", s: "♠", color: "white" },
      ],
      exampleText: "Example: Pair of Jacks and Pair of Fours (Jacks and Fours with Ace kicker).",
      frequency: "1 in 21 hands",
    },
    {
      id: 8,
      name: "One Pair",
      rankText: "Rank #9 · Two Cards of the Same Rank",
      description: "Two cards of matching rank plus three unrelated cards.",
      cards: [
        { r: "10", s: "♠", color: "white" },
        { r: "10", s: "♣", color: "white" },
        { r: "K", s: "♦", color: "red" },
        { r: "7", s: "♥", color: "red" },
        { r: "3", s: "♠", color: "white" },
      ],
      exampleText: "Example: Pair of Tens (10-10-K-7-3). Very common starting winning hand.",
      frequency: "1 in 2.4 hands",
    },
    {
      id: 9,
      name: "High Card",
      rankText: "Rank #10 · No Matching Pairs or Sequence",
      description: "When you have no pair, flush, or straight, your hand is evaluated by its single highest card.",
      cards: [
        { r: "A", s: "♦", color: "red" },
        { r: "Q", s: "♠", color: "white" },
        { r: "9", s: "♥", color: "red" },
        { r: "6", s: "♣", color: "white" },
        { r: "3", s: "♦", color: "red" },
      ],
      exampleText: "Example: Ace High (A-Q-9-6-3). Beats King High.",
      frequency: "1 in 2 hands",
    },
  ];

  return (
    <div className="poker-guide-page">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="pg-header">
        <div className="pg-header-inner">
          <div className="pg-brand">
            <Link href="/cashgame" className="pg-back-link">
              <ArrowLeft size={18} weight="bold" />
              <span>Back to Lobby</span>
            </Link>
            <div className="pg-divider" />
            <div className="pg-logo-title">
              <span className="pg-chip-icon">♠️</span>
              <span className="pg-app-title">BET888CASH POKER GUIDE</span>
            </div>
          </div>

          <div className="pg-header-actions">
            <Link href="/holdem/tables" className="pg-btn-play">
              <Play size={16} weight="fill" />
              <span>Play Live Tables</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ================= HERO INTRO BANNER ================= */}
      <section className="pg-hero">
        <div className="pg-hero-container">
          <div className="pg-hero-badge">
            <Sparkle size={14} weight="fill" />
            <span>BEGINNER TO PRO ACADEMY</span>
          </div>
          <h1 className="pg-hero-heading">How Our Poker Works</h1>
          <p className="pg-hero-sub">
            Everything you need to know about hands, betting, table flows, private friends clubs,
            and provably fair technology explained in simple, clear language with real examples.
          </p>

          {/* Quick Category Tabs */}
          <div className="pg-nav-tabs">
            <button
              className={`pg-tab ${activeTab === "rankings" ? "active" : ""}`}
              onClick={() => setActiveTab("rankings")}
            >
              🏆 Hand Rankings
            </button>
            <button
              className={`pg-tab ${activeTab === "flow" ? "active" : ""}`}
              onClick={() => setActiveTab("flow")}
            >
              🔄 The 5 Rounds of a Hand
            </button>
            <button
              className={`pg-tab ${activeTab === "actions" ? "active" : ""}`}
              onClick={() => setActiveTab("actions")}
            >
              💰 Betting Actions Explained
            </button>
            <button
              className={`pg-tab ${activeTab === "variants" ? "active" : ""}`}
              onClick={() => setActiveTab("variants")}
            >
              🃏 Game Variants
            </button>
            <button
              className={`pg-tab ${activeTab === "private" ? "active" : ""}`}
              onClick={() => setActiveTab("private")}
            >
              🔒 Private Tables & Passcodes
            </button>
            <button
              className={`pg-tab ${activeTab === "wallet" ? "active" : ""}`}
              onClick={() => setActiveTab("wallet")}
            >
              💳 Chips & Wallet Payouts
            </button>
            <button
              className={`pg-tab ${activeTab === "fairness" ? "active" : ""}`}
              onClick={() => setActiveTab("fairness")}
            >
              🛡️ Provably Fair Decks
            </button>
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="pg-main-content">
        {/* ================= 1. HAND RANKINGS ================= */}
        {activeTab === "rankings" && (
          <section className="pg-section">
            <div className="pg-section-head">
              <h2>Official Poker Hand Rankings</h2>
              <p>In Texas Hold&apos;em and Omaha, the best 5-card combination wins the pot. Here is every hand from highest to lowest:</p>
            </div>

            <div className="pg-rankings-layout">
              {/* Left: Hand List Selector */}
              <div className="pg-rankings-menu">
                {handRankings.map((h, idx) => (
                  <button
                    key={h.id}
                    className={`pg-rank-item ${selectedHandRank === idx ? "active" : ""}`}
                    onClick={() => setSelectedHandRank(idx)}
                  >
                    <span className="rank-num">#{idx + 1}</span>
                    <span className="rank-name">{h.name}</span>
                    <CaretRight size={14} weight="bold" className="rank-arrow" />
                  </button>
                ))}
              </div>

              {/* Right: Card Visual Display */}
              <div className="pg-rank-display">
                <div className="pg-display-header">
                  <span className="pg-display-tag">{handRankings[selectedHandRank].rankText}</span>
                  <h3 className="pg-display-title">{handRankings[selectedHandRank].name}</h3>
                  <p className="pg-display-desc">{handRankings[selectedHandRank].description}</p>
                </div>

                {/* Card Visual Felt */}
                <div className="pg-cards-row">
                  {handRankings[selectedHandRank].cards.map((c, cIdx) => (
                    <div key={cIdx} className={`pg-poker-card ${c.color === "red" ? "card-red" : "card-dark"}`}>
                      <span className="card-rank">{c.r}</span>
                      <span className="card-suit">{c.s}</span>
                    </div>
                  ))}
                </div>

                <div className="pg-example-box">
                  <Info size={20} weight="fill" className="info-icon" />
                  <div>
                    <strong>Real Example:</strong>
                    <p>{handRankings[selectedHandRank].exampleText}</p>
                    <span className="odds-label">Statistical Frequency: {handRankings[selectedHandRank].frequency}</span>
                  </div>
                </div>

                {/* Short Deck Special Notice */}
                <div className="pg-alert-note">
                  <strong>🚨 Short Deck 6+ Difference:</strong>
                  <p>
                    If playing <b>Short Deck (6+)</b>, cards 2 through 5 are removed. Because of this:
                    <br />
                    1. <b>Flush BEATS Full House</b>
                    <br />
                    2. <b>Three of a Kind BEATS Straight</b>
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= 2. THE 5 ROUNDS OF A HAND ================= */}
        {activeTab === "flow" && (
          <section className="pg-section">
            <div className="pg-section-head">
              <h2>How a Poker Hand is Played: 5 Simple Rounds</h2>
              <p>Every hand moves through 5 clear stages from dealing cards to declaring the winner:</p>
            </div>

            <div className="pg-flow-timeline">
              {/* Round 1 */}
              <div className="pg-flow-step">
                <div className="step-badge">Round 1</div>
                <div className="step-card">
                  <h3>1. Blinds & Pre-Flop (Hole Cards Dealt)</h3>
                  <p>
                    Before any cards are dealt, two players post mandatory forced bets called the <b>Small Blind (SB)</b> and <b>Big Blind (BB)</b> to create the starting pot.
                  </p>
                  <div className="step-example">
                    <strong>Example:</strong> In a €1 / €2 table:
                    <ul>
                      <li>Player on Small Blind puts in €1.</li>
                      <li>Player on Big Blind puts in €2.</li>
                      <li>Every player receives <b>2 secret hole cards</b> face down.</li>
                      <li>First betting round starts with the player sitting directly left of the Big Blind.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Round 2 */}
              <div className="pg-flow-step">
                <div className="step-badge">Round 2</div>
                <div className="step-card">
                  <h3>2. The Flop (First 3 Community Cards)</h3>
                  <p>
                    The dealer discards one card face-down (the &quot;burn card&quot;) and deals <b>3 community cards face-up</b> in the center of the table.
                  </p>
                  <div className="step-example">
                    <strong>Example:</strong> Board reveals [A♠ K♥ 8♦]. Every player now has 5 cards (their 2 private cards + these 3 shared cards). Another betting round takes place!
                  </div>
                </div>
              </div>

              {/* Round 3 */}
              <div className="pg-flow-step">
                <div className="step-badge">Round 3</div>
                <div className="step-card">
                  <h3>3. The Turn (4th Community Card)</h3>
                  <p>
                    A 4th shared card is dealt face-up to the board.
                  </p>
                  <div className="step-example">
                    <strong>Example:</strong> Board is now [A♠ K♥ 8♦ <b>10♣</b>]. Players can now see if they have completed a Straight or Two Pair. A third betting round takes place.
                  </div>
                </div>
              </div>

              {/* Round 4 */}
              <div className="pg-flow-step">
                <div className="step-badge">Round 4</div>
                <div className="step-card">
                  <h3>4. The River (5th & Final Community Card)</h3>
                  <p>
                    The 5th and final shared card is placed on the board.
                  </p>
                  <div className="step-example">
                    <strong>Example:</strong> Board is now [A♠ K♥ 8♦ 10♣ <b>7♥</b>]. No more cards will be dealt. The final betting round occurs. Players can bet, bluff, call, or fold.
                  </div>
                </div>
              </div>

              {/* Round 5 */}
              <div className="pg-flow-step">
                <div className="step-badge">Round 5</div>
                <div className="step-card">
                  <h3>5. Showdown & Pot Award</h3>
                  <p>
                    All players who stayed in the hand reveal their private cards. The player who makes the highest 5-card combination wins the entire pot!
                  </p>
                  <div className="step-example">
                    <strong>Example:</strong> Alice has A♦ Q♠ (Pair of Aces). Bob has 10♦ 10♠ (Three of a Kind, Tens). <b>Bob wins the €140 pot!</b>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= 3. BETTING ACTIONS ================= */}
        {activeTab === "actions" && (
          <section className="pg-section">
            <div className="pg-section-head">
              <h2>Betting Actions Explained Simply</h2>
              <p>When it is your turn to act at the table, you have 5 possible choices:</p>
            </div>

            <div className="pg-actions-grid">
              <div className="pg-action-card border-red">
                <div className="action-tag tag-red">FOLD</div>
                <h3>Surrender Your Hand</h3>
                <p>
                  Throw away your cards and stop playing this hand. You forfeit whatever chips you already put in the pot, but you do not have to pay anything more.
                </p>
                <div className="action-scenario">
                  <strong>When to use:</strong> When opponents bet high and your cards are too weak to justify calling.
                </div>
              </div>

              <div className="pg-action-card border-blue">
                <div className="action-tag tag-blue">CHECK</div>
                <h3>Pass Without Paying</h3>
                <p>
                  If no player before you has made a bet on the current round, you can &quot;Check&quot;. This passes the turn to the next player for €0 cost while keeping your cards.
                </p>
                <div className="action-scenario">
                  <strong>When to use:</strong> When the current price to stay in is zero and you want to see the next card for free.
                </div>
              </div>

              <div className="pg-action-card border-green">
                <div className="action-tag tag-green">CALL</div>
                <h3>Match Opponent&apos;s Bet</h3>
                <p>
                  Put in the exact amount of chips required to match the highest bet made on the table.
                </p>
                <div className="action-scenario">
                  <strong>Example:</strong> Pot is €20. Player A bets €5. You click <b>Call €5</b> to stay in the hand.
                </div>
              </div>

              <div className="pg-action-card border-gold">
                <div className="action-tag tag-gold">BET / RAISE</div>
                <h3>Increase the Price</h3>
                <p>
                  Increase the bet higher than the previous bet. All subsequent players must now match your raise or fold their cards.
                </p>
                <div className="action-scenario">
                  <strong>Example:</strong> Player A bets €5. You click <b>Raise to €15</b>. Opponents must now put in €15 to continue.
                </div>
              </div>

              <div className="pg-action-card border-purple">
                <div className="action-tag tag-purple">ALL-IN</div>
                <h3>Bet Everything You Have</h3>
                <p>
                  Risk your entire remaining chip stack on the table. Once you are All-In, you cannot be forced out of the hand by bigger bets!
                </p>
                <div className="action-scenario">
                  <strong>Side Pot Rule:</strong> If you have €50 and opponents have €200, you compete for a €50 &quot;Main Pot&quot;. Opponents bet their extra chips into a separate &quot;Side Pot&quot;.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= 4. GAME VARIANTS ================= */}
        {activeTab === "variants" && (
          <section className="pg-section">
            <div className="pg-section-head">
              <h2>Supported Game Variants</h2>
              <p>Our platform natively supports 6 world-standard poker variants:</p>
            </div>

            <div className="pg-variants-list">
              <div className="variant-item">
                <div className="variant-header">
                  <span className="variant-code">NLH</span>
                  <h3>No-Limit Texas Hold&apos;em</h3>
                </div>
                <p>
                  The world&apos;s most popular game. Every player gets <b>2 private cards</b>. There are 5 shared community cards. Players can use any combination (both private cards, 1 private card, or just the board) to make the best 5-card hand. You can bet all your chips at any time.
                </p>
              </div>

              <div className="variant-item">
                <div className="variant-header">
                  <span className="variant-code">PLO4</span>
                  <h3>Pot-Limit Omaha (4 Cards)</h3>
                </div>
                <p>
                  Every player receives <b>4 private hole cards</b>.
                  <br />
                  <span className="gold-highlight">
                    ⚠️ The Crucial Omaha Rule: You MUST use exactly 2 cards from your hand and exactly 3 cards from the board.
                  </span>
                  <br />
                  Even if you hold 4 Aces in your hand, you only hold a Pair of Aces because you can only use two of them! The maximum bet is capped at the size of the total pot.
                </p>
              </div>

              <div className="variant-item">
                <div className="variant-header">
                  <span className="variant-code">PLO5</span>
                  <h3>5-Card Pot-Limit Omaha (Big O)</h3>
                </div>
                <p>
                  Similar to PLO4, but players receive <b>5 private hole cards</b>. Massive action with frequent Monster Flushes and Full Houses. Same 2-from-hand, 3-from-board rule applies!
                </p>
              </div>

              <div className="variant-item">
                <div className="variant-header">
                  <span className="variant-code">PLO8</span>
                  <h3>Omaha Hi-Lo 8-or-Better</h3>
                </div>
                <p>
                  At showdown, the pot is split <b>50% to the Best High Hand</b> and <b>50% to the Best Qualifying Low Hand</b> (5 distinct cards 8 or lower, A=1). If no low hand qualifies, the best high hand scoops the entire pot!
                </p>
              </div>

              <div className="variant-item">
                <div className="variant-header">
                  <span className="variant-code">SD</span>
                  <h3>Short Deck 6+ Hold&apos;em</h3>
                </div>
                <p>
                  Played with a 36-card deck where all cards from 2 through 5 are removed. Aces can complete a low straight (A-6-7-8-9).
                  <b> Flushes beat Full Houses</b>, and <b>Three of a Kind beats Straights</b>!
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ================= 5. PRIVATE TABLES & PASSCODES ================= */}
        {activeTab === "private" && (
          <section className="pg-section">
            <div className="pg-section-head">
              <h2>Private Tables & Friend Club Games</h2>
              <p>Host private games exclusively for your friends or club members with full privacy protection:</p>
            </div>

            <div className="pg-private-explainer">
              <div className="private-step-box">
                <div className="box-icon">🔒</div>
                <h3>1. Codes are 100% Hidden</h3>
                <p>
                  To prevent unauthorized players from snooping, private table cards in the lobby do <b>not</b> show the invite code publicly. Instead, they display a locked badge:
                </p>
                <div className="code-badge-preview">
                  <span>🔒 <b>PRIVATE TABLE</b> · CODE REQUIRED TO ENTER</span>
                </div>
              </div>

              <div className="private-step-box">
                <div className="box-icon">🔑</div>
                <h3>2. Click to Enter Passcode</h3>
                <p>
                  When you or your friends click on any private card or click <b>PLAY NOW</b>, a secure prompt modal appears asking for the 6-character invite code (e.g. <code>7KJ8P9</code>).
                </p>
                <div className="modal-preview-mock">
                  <div className="mock-title">🔒 Private Table Access</div>
                  <div className="mock-input">7KJ8P9</div>
                  <div className="mock-btn">Unlock &amp; Join Table</div>
                </div>
              </div>

              <div className="private-step-box">
                <div className="box-icon">👥</div>
                <h3>3. Create Your Own Private Table</h3>
                <p>
                  Click <b>+ Create Table</b> in the Cashgame lobby. Set your desired blinds, maximum seats, and check &quot;Private Table&quot;. The system generates a unique 6-character invite code for you to send to friends via WhatsApp, Telegram, or Discord!
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ================= 6. WALLET & CHIPS ================= */}
        {activeTab === "wallet" && (
          <section className="pg-section">
            <div className="pg-section-head">
              <h2>Unified Wallet & Table Chips</h2>
              <p>How funds move seamlessly between your platform account and the poker tables:</p>
            </div>

            <div className="pg-wallet-flow-grid">
              <div className="wallet-card">
                <div className="w-icon">📥</div>
                <h3>1. Sitting Down (Buy-In)</h3>
                <p>
                  When you enter a table, a buy-in slider opens. You choose how many chips to bring to the table (between the table&apos;s Minimum and Maximum buy-in).
                </p>
                <div className="w-detail">
                  Chips are instantly deducted from your unified account balance and placed directly on your table seat.
                </div>
              </div>

              <div className="wallet-card">
                <div className="w-icon">🎲</div>
                <h3>2. Playing &amp; Winning</h3>
                <p>
                  Every chip you win from opponents is added directly to your active table stack in real-time. If you start with €100 and win €150 in pots, your stack shows €250.
                </p>
                <div className="w-detail">
                  Your chips stay safe on the table as long as you remain seated.
                </div>
              </div>

              <div className="wallet-card">
                <div className="w-icon">📤</div>
                <h3>3. Standing Up (Cashout)</h3>
                <p>
                  Whenever you are ready to leave, simply click <b>Leave Table / Stand Up</b>.
                </p>
                <div className="w-detail highlight-credit">
                  ✅ Your entire remaining table stack (including all winnings!) is <b>instantly credited back to your platform wallet balance</b> with zero delay.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= 7. PROVABLY FAIR ================= */}
        {activeTab === "fairness" && (
          <section className="pg-section">
            <div className="pg-section-head">
              <h2>100% Provably Fair Decks (Cryptographic Proof)</h2>
              <p>How we mathematically guarantee that the cards can never be rigged or manipulated:</p>
            </div>

            <div className="pg-fairness-box">
              <div className="fairness-card">
                <ShieldCheck size={48} weight="fill" className="shield-icon" />
                <h3>The Digital Lockbox Analogy</h3>
                <p>
                  Imagine before a single card is dealt, the dealer shuffles a real deck and puts it inside a clear, sealed glass lockbox. The dealer posts a cryptographic fingerprint of that deck in the game log.
                </p>
                <p>
                  Because the fingerprint was published <b>before you placed your bets</b>, the server cannot switch cards during the hand!
                </p>
              </div>

              <div className="fairness-steps">
                <div className="f-step">
                  <div className="f-num">Step 1</div>
                  <h4>Pre-Deal Commitment</h4>
                  <p>Server generates secret PRNG seed and publishes its <b>SHA-256 Hash</b> in the table log.</p>
                </div>
                <div className="f-step">
                  <div className="f-num">Step 2</div>
                  <h4>Live Dealing</h4>
                  <p>Cards are dealt strictly according to the mathematical Fisher-Yates deterministic shuffle.</p>
                </div>
                <div className="f-step">
                  <div className="f-num">Step 3</div>
                  <h4>Hand End Revelation</h4>
                  <p>The plain seed is revealed in the summary. Anyone can run SHA-256 on the seed to prove it matches Step 1!</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= CALL TO ACTION FOOTER ================= */}
        <section className="pg-cta-banner">
          <div className="cta-content">
            <Trophy size={36} weight="fill" className="trophy-icon" />
            <div>
              <h3>Ready to Hit the Felt?</h3>
              <p>Choose your stakes in the cashgame lobby or join a private friends table right now.</p>
            </div>
          </div>
          <div className="cta-actions">
            <Link href="/cashgame" className="btn-cta-lobby">
              Browse Cash Tables
            </Link>
            <Link href="/holdem/tables" className="btn-cta-play">
              Launch Live Table
            </Link>
          </div>
        </section>
      </main>

      {/* ================= INLINE STYLES ================= */}
      <style jsx>{`
        .poker-guide-page {
          min-height: 100vh;
          background: #090618;
          color: #ffffff;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .pg-header {
          height: 60px;
          background: #0e0a24;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .pg-header-inner {
          max-width: 1300px;
          width: 100%;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pg-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .pg-back-link {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #a5a2bb;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.2s;
        }

        .pg-back-link:hover {
          color: #fff;
          background: rgba(120, 104, 255, 0.2);
        }

        .pg-divider {
          width: 1px;
          height: 20px;
          background: rgba(255, 255, 255, 0.12);
        }

        .pg-logo-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pg-chip-icon {
          font-size: 18px;
        }

        .pg-app-title {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .pg-btn-play {
          display: flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #7868ff 0%, #a855f7 100%);
          color: #fff;
          text-decoration: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 4px 14px rgba(120, 104, 255, 0.35);
          transition: transform 0.2s;
        }

        .pg-btn-play:hover {
          transform: translateY(-1px);
        }

        /* Hero */
        .pg-hero {
          background: radial-gradient(ellipse at 50% 20%, rgba(120, 104, 255, 0.22) 0%, transparent 70%), #090618;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 40px 24px 24px;
          text-align: center;
        }

        .pg-hero-container {
          max-width: 1100px;
          margin: 0 auto;
        }

        .pg-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(246, 189, 73, 0.15);
          border: 1px solid rgba(246, 189, 73, 0.4);
          color: #f6bd49;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 20px;
          margin-bottom: 14px;
          letter-spacing: 1px;
        }

        .pg-hero-heading {
          font-size: 38px;
          font-weight: 900;
          margin: 0 0 12px;
          background: linear-gradient(135deg, #ffffff 0%, #e2d9ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .pg-hero-sub {
          font-size: 16px;
          line-height: 1.6;
          color: #a5a2bb;
          max-width: 740px;
          margin: 0 auto 32px;
        }

        /* Tabs */
        .pg-nav-tabs {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pg-tab {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #9f9cb8;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pg-tab:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
        }

        .pg-tab.active {
          background: rgba(120, 104, 255, 0.25);
          border-color: #7868ff;
          color: #ffffff;
          box-shadow: 0 0 16px rgba(120, 104, 255, 0.3);
        }

        /* Main */
        .pg-main-content {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 40px 24px 60px;
          flex: 1;
        }

        .pg-section {
          animation: pgFadeIn 0.3s ease;
        }

        @keyframes pgFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pg-section-head {
          margin-bottom: 28px;
        }

        .pg-section-head h2 {
          font-size: 24px;
          font-weight: 800;
          margin: 0 0 8px;
          color: #fff;
        }

        .pg-section-head p {
          font-size: 14px;
          color: #a5a2bb;
          margin: 0;
        }

        /* Hand Rankings Grid */
        .pg-rankings-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          background: #110c2c;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        }

        .pg-rankings-menu {
          display: flex;
          flex-direction: column;
          gap: 6px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          padding-right: 18px;
        }

        .pg-rank-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
          color: #9f9cb8;
          font-size: 13px;
          font-weight: 700;
          text-align: left;
          transition: all 0.15s;
        }

        .pg-rank-item:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.04);
        }

        .pg-rank-item.active {
          background: rgba(120, 104, 255, 0.2);
          border-color: rgba(120, 104, 255, 0.4);
          color: #fff;
        }

        .rank-num {
          font-size: 11px;
          color: #f6bd49;
          font-weight: 800;
        }

        .rank-name {
          flex: 1;
        }

        .rank-arrow {
          opacity: 0.5;
        }

        .pg-rank-item.active .rank-arrow {
          opacity: 1;
          color: #f6bd49;
        }

        /* Display area */
        .pg-rank-display {
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding-left: 6px;
        }

        .pg-display-tag {
          font-size: 11px;
          font-weight: 800;
          color: #f6bd49;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pg-display-title {
          font-size: 26px;
          font-weight: 900;
          margin: 4px 0 6px;
          color: #ffffff;
        }

        .pg-display-desc {
          font-size: 14px;
          color: #a5a2bb;
          margin: 0;
          line-height: 1.5;
        }

        /* Card representation */
        .pg-cards-row {
          display: flex;
          gap: 12px;
          margin: 10px 0;
          flex-wrap: wrap;
        }

        .pg-poker-card {
          width: 72px;
          height: 104px;
          background: #ffffff;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 8px 6px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
          font-family: monospace;
          transition: transform 0.2s;
        }

        .pg-poker-card:hover {
          transform: translateY(-4px);
        }

        .card-red {
          color: #e11d48;
        }

        .card-dark {
          color: #111827;
        }

        .card-rank {
          font-size: 20px;
          font-weight: 900;
          line-height: 1;
        }

        .card-suit {
          font-size: 32px;
          line-height: 1;
        }

        .pg-example-box {
          display: flex;
          gap: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px;
        }

        .info-icon {
          color: #7868ff;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .pg-example-box p {
          margin: 4px 0 6px;
          font-size: 13px;
          color: #d1cddb;
        }

        .odds-label {
          font-size: 11px;
          color: #f6bd49;
          font-weight: 700;
        }

        .pg-alert-note {
          background: rgba(168, 85, 247, 0.12);
          border: 1px solid rgba(168, 85, 247, 0.35);
          border-radius: 10px;
          padding: 14px 16px;
          font-size: 13px;
          color: #e9d5ff;
          line-height: 1.5;
        }

        /* Flow Timeline */
        .pg-flow-timeline {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .pg-flow-step {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 20px;
          align-items: flex-start;
        }

        .step-badge {
          background: rgba(120, 104, 255, 0.2);
          border: 1px solid rgba(120, 104, 255, 0.4);
          color: #c4b5fd;
          font-weight: 800;
          font-size: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          text-align: center;
        }

        .step-card {
          background: #110c2c;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 20px 24px;
        }

        .step-card h3 {
          margin: 0 0 8px;
          font-size: 17px;
          color: #ffffff;
        }

        .step-card p {
          margin: 0 0 12px;
          font-size: 14px;
          color: #a5a2bb;
          line-height: 1.5;
        }

        .step-example {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 13px;
          color: #d1cddb;
        }

        .step-example ul {
          margin: 6px 0 0 18px;
          padding: 0;
        }

        .step-example li {
          margin-bottom: 4px;
        }

        /* Actions Grid */
        .pg-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 18px;
        }

        .pg-action-card {
          background: #110c2c;
          border-radius: 14px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
        }

        .action-tag {
          align-self: flex-start;
          font-size: 10px;
          font-weight: 900;
          padding: 3px 8px;
          border-radius: 6px;
          margin-bottom: 12px;
          letter-spacing: 0.5px;
        }

        .tag-red { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; }
        .tag-blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid #3b82f6; }
        .tag-green { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid #22c55e; }
        .tag-gold { background: rgba(246, 189, 73, 0.2); color: #f6bd49; border: 1px solid #f6bd49; }
        .tag-purple { background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid #a855f7; }

        .pg-action-card h3 {
          margin: 0 0 8px;
          font-size: 16px;
          color: #fff;
        }

        .pg-action-card p {
          margin: 0 0 14px;
          font-size: 13px;
          color: #a5a2bb;
          line-height: 1.5;
          flex: 1;
        }

        .action-scenario {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 12px;
          color: #d1cddb;
        }

        /* Variants */
        .pg-variants-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .variant-item {
          background: #110c2c;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 22px;
        }

        .variant-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .variant-code {
          background: rgba(120, 104, 255, 0.2);
          border: 1px solid #7868ff;
          color: #c4b5fd;
          font-weight: 800;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .variant-header h3 {
          margin: 0;
          font-size: 18px;
          color: #fff;
        }

        .variant-item p {
          margin: 0;
          font-size: 14px;
          color: #a5a2bb;
          line-height: 1.6;
        }

        .gold-highlight {
          color: #f6bd49;
          font-weight: 700;
        }

        /* Private Tables Explainer */
        .pg-private-explainer {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .private-step-box {
          background: #110c2c;
          border: 1px solid rgba(168, 85, 247, 0.3);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .box-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .private-step-box h3 {
          margin: 0 0 8px;
          font-size: 17px;
          color: #fff;
        }

        .private-step-box p {
          margin: 0 0 16px;
          font-size: 13px;
          color: #a5a2bb;
          line-height: 1.5;
        }

        .code-badge-preview {
          background: rgba(168, 85, 247, 0.15);
          border: 1px dashed #a855f7;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 11px;
          color: #e9d5ff;
          text-align: center;
          margin-top: auto;
        }

        .modal-preview-mock {
          background: #090616;
          border: 1px solid rgba(168, 85, 247, 0.4);
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: auto;
        }

        .mock-title {
          font-size: 12px;
          font-weight: 800;
          color: #fff;
        }

        .mock-input {
          background: #140d2e;
          border: 1px solid #a855f7;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 13px;
          font-weight: 800;
          color: #f6bd49;
          letter-spacing: 2px;
          text-align: center;
        }

        .mock-btn {
          background: linear-gradient(135deg, #7868ff, #a855f7);
          color: #fff;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          text-align: center;
          padding: 6px;
        }

        /* Wallet */
        .pg-wallet-flow-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .wallet-card {
          background: #110c2c;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
        }

        .w-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .wallet-card h3 {
          margin: 0 0 8px;
          font-size: 17px;
          color: #fff;
        }

        .wallet-card p {
          margin: 0 0 14px;
          font-size: 13px;
          color: #a5a2bb;
          line-height: 1.5;
        }

        .w-detail {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 12px;
          color: #d1cddb;
        }

        .highlight-credit {
          border-left: 3px solid #22c55e;
          color: #bbf7d0;
        }

        /* Fairness */
        .pg-fairness-box {
          background: #110c2c;
          border: 1px solid rgba(120, 104, 255, 0.3);
          border-radius: 18px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .fairness-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 680px;
          margin: 0 auto;
        }

        .shield-icon {
          color: #7868ff;
          margin-bottom: 12px;
        }

        .fairness-card h3 {
          margin: 0 0 10px;
          font-size: 22px;
          color: #fff;
        }

        .fairness-card p {
          margin: 0 0 10px;
          font-size: 14px;
          color: #a5a2bb;
          line-height: 1.6;
        }

        .fairness-steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .f-step {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }

        .f-num {
          font-size: 11px;
          font-weight: 800;
          color: #f6bd49;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .f-step h4 {
          margin: 0 0 6px;
          font-size: 15px;
          color: #fff;
        }

        .f-step p {
          margin: 0;
          font-size: 12px;
          color: #a5a2bb;
          line-height: 1.4;
        }

        /* CTA */
        .pg-cta-banner {
          margin-top: 48px;
          background: linear-gradient(135deg, #1b1240 0%, #110b28 100%);
          border: 1px solid rgba(120, 104, 255, 0.4);
          border-radius: 18px;
          padding: 28px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .cta-content {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .trophy-icon {
          color: #f6bd49;
        }

        .cta-content h3 {
          margin: 0 0 4px;
          font-size: 20px;
          color: #fff;
        }

        .cta-content p {
          margin: 0;
          font-size: 14px;
          color: #a5a2bb;
        }

        .cta-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-cta-lobby {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          transition: background 0.2s;
        }

        .btn-cta-lobby:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .btn-cta-play {
          background: linear-gradient(135deg, #7868ff, #a855f7);
          color: #fff;
          text-decoration: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 4px 14px rgba(120, 104, 255, 0.4);
          transition: transform 0.2s;
        }

        .btn-cta-play:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .pg-rankings-layout {
            grid-template-columns: 1fr;
          }
          .pg-rankings-menu {
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-right: 0;
            padding-bottom: 16px;
          }
          .pg-flow-step {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}
