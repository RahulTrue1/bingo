"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, type PlayerModel, type PokerTableApiModel } from "../../api-client";
import { money } from "../shared/types";
import "../../poker/poker.css";

interface Bet888CasinoLobbyProps {
  currentUser?: PlayerModel | null;
  wallet?: number;
  onOpenAuth?: () => void;
  onNavigateToBingo?: () => void;
}

export function Bet888CasinoLobby({
  currentUser,
  wallet = 10000,
  onOpenAuth,
  onNavigateToBingo,
}: Bet888CasinoLobbyProps) {
  const router = useRouter();

  // Active navigation
  const [activeCategory, setActiveCategory] = useState<string>("poker-live");
  const [tables, setTables] = useState<PokerTableApiModel[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Invite code join state
  const [quickCodeInput, setQuickCodeInput] = useState("");
  const [quickCodeError, setQuickCodeError] = useState("");
  const [quickCodeSuccess, setQuickCodeSuccess] = useState("");

  // Quick "Tavolinë për shokë" form state
  const [friendsName, setFriendsName] = useState("");
  const [friendsBlinds, setFriendsBlinds] = useState("5/10");
  const [friendsSeats, setFriendsSeats] = useState("6");
  const [createLoading, setCreateLoading] = useState(false);
  const [createdTableCode, setCreatedTableCode] = useState<string | null>(null);

  // Modal for unlocking private table code on card click
  const [unlockModalTable, setUnlockModalTable] = useState<PokerTableApiModel | null>(null);
  const [unlockCodeInput, setUnlockCodeInput] = useState("");
  const [unlockError, setUnlockError] = useState("");

  // Access check: Section 3 & 5: opt-in access control
  const isPokerEnabled = useMemo(() => {
    if (!currentUser) return true; // Guests can see and will be prompted to login/enable
    return currentUser.poker_enabled !== false;
  }, [currentUser]);

  const loadTables = useCallback(() => {
    setLoadingTables(true);
    apiClient.poker
      .tables()
      .then((data) => {
        if (Array.isArray(data)) setTables(data);
      })
      .catch(() => {})
      .finally(() => setLoadingTables(false));
  }, []);

  useEffect(() => {
    loadTables();
    const unsub = apiClient.sync.subscribe((e) => {
      if (e.entity === "rooms" || e.entity === "wallet") {
        loadTables();
      }
    });
    return unsub;
  }, [loadTables]);

  // Quick Join by Invite Code
  const handleQuickJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickCodeInput.trim()) return;

    setQuickCodeError("");
    setQuickCodeSuccess("");

    if (!isPokerEnabled) {
      setQuickCodeError("Llogaria juaj nuk ka qasje të aktivizuar në Poker Live. Kontaktoni operatorin.");
      return;
    }

    try {
      const res = await apiClient.poker.joinPrivateTable(quickCodeInput.trim());
      if (res?.success && res.table) {
        setQuickCodeSuccess(`Tavolina '${res.table.name}' u gjet me sukses!`);
        setTimeout(() => {
          router.push(`/holdem/tables?tableId=${encodeURIComponent(res.table!.id)}&code=${encodeURIComponent(quickCodeInput.trim().toUpperCase())}`);
        }, 500);
      } else {
        setQuickCodeError(res?.error || "Kodi i ftesës është i pasaktë.");
      }
    } catch (err: any) {
      setQuickCodeError(err.message || "Gabim gjatë verifikimit të kodit.");
    }
  };

  // Quick Create "Tavolinë për shokë"
  const handleQuickCreateFriends = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPokerEnabled) {
      setQuickCodeError("Poker Live nuk është aktivizuar për llogarinë tuaj.");
      return;
    }

    const [sbStr, bbStr] = friendsBlinds.split("/");
    const sb = Number(sbStr) || 5;
    const bb = Number(bbStr) || 10;
    const seats = Number(friendsSeats) || 6;
    const name = friendsName.trim() || `Tavolinë ${friendsBlinds}`;

    setCreateLoading(true);
    try {
      const res = await apiClient.poker.createPrivateTable({
        name,
        sb,
        bb,
        seats,
        feeType: "RAKE",
      });

      if (res?.success && res.inviteCode) {
        setCreatedTableCode(res.inviteCode);
        loadTables();
      }
    } catch (err: any) {
      setQuickCodeError(err.message || "Gabim gjatë krijimit të tavolinës.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Card click handler: if private with hasCode, ask for code modal
  const handleTableCardClick = (table: PokerTableApiModel) => {
    if (!isPokerEnabled) {
      alert("Poker Live nuk është i aktivizuar për këtë llogari. Ju lutem kontaktoni operatorin për leje.");
      return;
    }

    if (table.isPrivate || table.hasCode) {
      setUnlockModalTable(table);
      setUnlockCodeInput("");
      setUnlockError("");
    } else {
      router.push(`/holdem/tables?tableId=${encodeURIComponent(table.id)}`);
    }
  };

  const handleUnlockPrivateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockModalTable || !unlockCodeInput.trim()) return;

    setUnlockError("");
    try {
      const res = await apiClient.poker.joinPrivateTable(unlockCodeInput.trim());
      if (res?.success && res.table) {
        const tid = unlockModalTable.id;
        const code = unlockCodeInput.trim().toUpperCase();
        setUnlockModalTable(null);
        router.push(`/holdem/tables?tableId=${encodeURIComponent(tid)}&code=${encodeURIComponent(code)}`);
      } else {
        setUnlockError(res?.error || "Kodi i ftesës është i pasaktë.");
      }
    } catch (err: any) {
      setUnlockError(err.message || "Gabim gjatë verifikimit.");
    }
  };

  return (
    <div className="bet888-casino-shell">
      {/* ================= SECTION 5 TOPBAR ================= */}
      <header className="bet888-header">
        <div className="bet888-header-left">
          <Link href="/" className="bet888-brand" aria-label="BET888CASH Casino Home">
            <span className="bet888-brand-text">BET<span className="brand-gold">888</span>CASH</span>
            <span className="bet888-brand-sub">CASINO &amp; LIVE</span>
          </Link>
          <div className="bet888-search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Kërko lojëra, tavolina ose provajderë..."
              aria-label="Kërko lojëra"
            />
          </div>
        </div>

        <div className="bet888-header-right">
          <button
            type="button"
            className="bet888-nav-btn bingo-switch"
            onClick={onNavigateToBingo}
            title="Kalo te Bingo"
          >
            🎱 Bingo Live
          </button>
          <Link
            href="/cashgame"
            className="bet888-nav-btn poker-switch active"
            title="Kalo te Basepoker Cash Game"
          >
            ♠ Poker Lobby
          </Link>
          <Link
            href="/poker-guide"
            className="bet888-nav-btn guide-switch"
            title="Udhëzuesi i Rregullave të Pokerit"
          >
            📖 Udhëzuesi
          </Link>

          <div className="bet888-balance-card">
            <span className="bet888-bal-label">BILANCI</span>
            <span className="bet888-bal-val">
              <span className="bet888-chip-coin">🪙</span>
              {money(wallet)}
            </span>
          </div>

          {currentUser ? (
            <div className="bet888-user-pill">
              <span className="bet888-avatar-mini">
                {currentUser.username.slice(0, 2).toUpperCase()}
              </span>
              <span className="bet888-username">{currentUser.username}</span>
            </div>
          ) : (
            <button
              type="button"
              className="bet888-btn-login"
              onClick={onOpenAuth}
            >
              Hyr / Regjistrohu
            </button>
          )}

          <div className="bet888-lang-switch">🇦🇱 SQ</div>
        </div>
      </header>

      {/* ================= MAIN LAYOUT WITH SIDEBAR & CONTENT ================= */}
      <div className="bet888-body-wrapper">
        {/* ================= SECTION 5.1 SIDEBAR ================= */}
        <aside className="bet888-sidebar" aria-label="Kazino Navigimi">
          <nav className="bet888-side-nav">
            {/* Lobi (All Casino) */}
            <button
              type="button"
              className={`bet888-side-item ${activeCategory === "all" ? "active" : ""}`}
              onClick={() => setActiveCategory("all")}
            >
              <span className="bet888-side-icon">🏠</span>
              <span>Lobi</span>
            </button>

            {/* Poker Live: Placed directly below Lobi with pulsing LIVE badge */}
            <button
              type="button"
              className={`bet888-side-item poker-live-side-item ${activeCategory === "poker-live" ? "active" : ""}`}
              onClick={() => setActiveCategory("poker-live")}
            >
              <span className="bet888-side-icon spade-icon">♠</span>
              <span>Poker Live</span>
              <span className="bet888-badge-live pulse">LIVE</span>
            </button>

            {/* Other Casino Categories */}
            <button
              type="button"
              className={`bet888-side-item ${activeCategory === "slots" ? "active" : ""}`}
              onClick={() => setActiveCategory("slots")}
            >
              <span className="bet888-side-icon">🎰</span>
              <span>Slots</span>
            </button>

            <button
              type="button"
              className={`bet888-side-item ${activeCategory === "live-casino" ? "active" : ""}`}
              onClick={() => setActiveCategory("live-casino")}
            >
              <span className="bet888-side-icon">🎲</span>
              <span>Live Casino</span>
            </button>

            <button
              type="button"
              className={`bet888-side-item ${activeCategory === "tables" ? "active" : ""}`}
              onClick={() => setActiveCategory("tables")}
            >
              <span className="bet888-side-icon">🃏</span>
              <span>Lojëra Tavoline</span>
            </button>

            <button
              type="button"
              className={`bet888-side-item ${activeCategory === "virtual" ? "active" : ""}`}
              onClick={() => setActiveCategory("virtual")}
            >
              <span className="bet888-side-icon">⚽</span>
              <span>Virtuale</span>
            </button>

            <div className="bet888-side-divider" />

            <Link href="/poker-backoffice" className="bet888-side-item admin-link">
              <span className="bet888-side-icon">⚙️</span>
              <span>Poker Backoffice</span>
            </Link>
          </nav>
        </aside>

        {/* ================= MAIN CONTENT AREA ================= */}
        <main className="bet888-main-content">
          {/* Access Warning if poker_enabled === false */}
          {!isPokerEnabled && currentUser && (
            <div style={{
              background: "rgba(231, 76, 60, 0.15)",
              border: "1.5px solid #e74c3c",
              borderRadius: "10px",
              padding: "14px 20px",
              marginBottom: "20px",
              color: "#fca5a5",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div>
                <strong style={{ color: "#fff", display: "block", marginBottom: "2px" }}>
                  ⚠️ Qasja në Poker Live është e kufizuar
                </strong>
                Llogaria juaj nuk ka leje të aktivizuar nga administratori. Kontaktoni operatorin e sallës ose ndihmën e klientit për aktivizim.
              </div>
              <Link
                href="/poker-backoffice"
                style={{
                  background: "#e74c3c",
                  color: "#fff",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontWeight: 800,
                  fontSize: "12px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Hap Backoffice →
              </Link>
            </div>
          )}

          {/* Hero Banner for Poker Live */}
          <div className="bet888-hero-banner">
            <div className="bet888-hero-info">
              <span className="bet888-hero-kicker">♠ POKER LIVE TEXAS HOLD&apos;EM</span>
              <h1 className="bet888-hero-title">Tavolina Ring Cash Game në Kohë Reale</h1>
              <p className="bet888-hero-desc">
                Luaj No-Limit Texas Hold&apos;em kundër lojtarëve realë. Komisione transparente (Rake, Hand Fee, Table Fee), tavolina private me kod sigurie dhe balancë e unifikuar me një portofol të vetëm.
              </p>
              <div className="bet888-hero-actions">
                <Link href="/cashgame" className="bet888-hero-btn primary">
                  Shiko Të Gjitha Tavolinat →
                </Link>
                <Link href="/poker-guide" className="bet888-hero-btn secondary">
                  Rregullat &amp; Si Luhet
                </Link>
              </div>
            </div>

            <div className="bet888-card-fan">
              <div className="bet888-fan-card c1">
                <span className="r">A</span>
                <span className="s">♠</span>
              </div>
              <div className="bet888-fan-card c2">
                <span className="r">K</span>
                <span className="s red">♥</span>
              </div>
              <div className="bet888-fan-card c3">
                <span className="r">Q</span>
                <span className="s">♠</span>
              </div>
            </div>
          </div>

          {/* ================= SECTION 5.2 PROVIDER CHIP STRIP ================= */}
          <div className="bet888-provider-strip" role="group" aria-label="Filtrimi sipas provajderit">
            {/* 1st Chip: POKER LIVE (green felt background, gold outline) */}
            <button
              type="button"
              className="bet888-provider-chip poker-live-chip"
              onClick={() => setActiveCategory("poker-live")}
              title="Filtroni lojërat e Poker Live"
            >
              <span className="chip-spade">♠</span>
              <span>POKER LIVE</span>
            </button>

            {/* Other casino providers starting with EGT Digital */}
            <button
              type="button"
              className="bet888-provider-chip"
              onClick={() => setActiveCategory("egt")}
              title="EGT Digital Slots"
            >
              🎰 EGT Digital
            </button>
            <button
              type="button"
              className="bet888-provider-chip"
              onClick={() => setActiveCategory("pragmatic")}
              title="Pragmatic Play Games"
            >
              ⚡ Pragmatic Play
            </button>
            <button type="button" className="bet888-provider-chip">💎 NetEnt</button>
            <button type="button" className="bet888-provider-chip">🎯 Evolution Gaming</button>
            <button type="button" className="bet888-provider-chip">✈️ Spribe (Aviator)</button>
            <button type="button" className="bet888-provider-chip">👑 Novomatic</button>
          </div>

          {/* ================= SECTION 5.3 ROW 1: ♠ POKER LIVE ================= */}
          <section className="bet888-game-row-section">
            <div className="bet888-row-header">
              <div className="bet888-row-title-chip">
                <span className="title-spade">♠</span>
                <h2>Poker Live</h2>
              </div>

              {/* Section 5.3 Row Controls: Invite Code + "Tavolinë për shokë" */}
              <div className="bet888-row-controls">
                {/* 1. Quick Invite Code Join Field */}
                <form className="bet888-invite-join-form" onSubmit={handleQuickJoin}>
                  <label htmlFor="quick-poker-code">Kodi i ftesës:</label>
                  <input
                    id="quick-poker-code"
                    type="text"
                    maxLength={6}
                    placeholder="KODI"
                    value={quickCodeInput}
                    onChange={(e) => setQuickCodeInput(e.target.value.toUpperCase())}
                  />
                  <button type="submit" className="bet888-btn-join">
                    Hyr
                  </button>
                </form>

                {/* 2. "Tavolinë për shokë" Quick Creation Form */}
                <form className="bet888-create-friends-form" onSubmit={handleQuickCreateFriends}>
                  <span className="friends-label">Tavolinë për shokë:</span>
                  <input
                    type="text"
                    placeholder="Emri i tavolinës"
                    value={friendsName}
                    onChange={(e) => setFriendsName(e.target.value)}
                  />
                  <select
                    value={friendsBlinds}
                    onChange={(e) => setFriendsBlinds(e.target.value)}
                    aria-label="Zgjidh blinds"
                  >
                    <option value="1/2">1/2</option>
                    <option value="5/10">5/10</option>
                    <option value="10/20">10/20</option>
                    <option value="25/50">25/50</option>
                    <option value="50/100">50/100</option>
                  </select>
                  <select
                    value={friendsSeats}
                    onChange={(e) => setFriendsSeats(e.target.value)}
                    aria-label="Numri i ulëseve"
                  >
                    <option value="2">2 Ulëse</option>
                    <option value="4">4 Ulëse</option>
                    <option value="6">6 Ulëse</option>
                    <option value="9">9 Ulëse</option>
                  </select>
                  <button type="submit" className="bet888-btn-create" disabled={createLoading}>
                    {createLoading ? "Duke krijuar..." : "+ Krijo"}
                  </button>
                </form>

                {/* 3. View All & Navigation arrows */}
                <div className="bet888-row-actions">
                  <Link href="/cashgame" className="bet888-btn-view-all">
                    Shiko të gjitha →
                  </Link>
                </div>
              </div>
            </div>

            {/* Feedbacks / Errors */}
            {quickCodeError && (
              <div style={{ color: "#ef4444", fontSize: "12px", marginBottom: "12px", fontWeight: 700 }}>
                ⚠️ {quickCodeError}
              </div>
            )}
            {quickCodeSuccess && (
              <div style={{ color: "#22c55e", fontSize: "12px", marginBottom: "12px", fontWeight: 700 }}>
                ✓ {quickCodeSuccess}
              </div>
            )}
            {createdTableCode && (
              <div style={{
                background: "#064e3b",
                border: "1px solid #10b981",
                padding: "10px 16px",
                borderRadius: "8px",
                color: "#ecfdf5",
                fontSize: "12.5px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div>
                  <strong>Tavolina private u krijua me sukses!</strong>
                  <span style={{ marginLeft: "10px" }}>
                    Kodi i ftesës: <b style={{ color: "#facc15", letterSpacing: "1px" }}>{createdTableCode}</b>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatedTableCode(null)}
                  style={{ background: "none", border: "none", color: "#a7f3d0", cursor: "pointer", fontSize: "14px" }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Horizontal Table Carousel / Grid */}
            <div className="bet888-tables-carousel">
              {tables.map((table) => {
                const seated = (table.seats || []).filter((s) => Boolean(s.player)).length;
                const feeBadgeClass =
                  table.feeType === "RAKE" ? "badge-green" : table.feeType === "HAND_FEE" ? "badge-blue" : "badge-purple";
                const feeLabel =
                  table.feeType === "RAKE"
                    ? `RAKE ${table.rakePercent}%`
                    : table.feeType === "HAND_FEE"
                      ? `HAND FEE $${table.handFeeAmount}`
                      : `TABLE FEE $${table.tableFeeAmount}`;

                return (
                  <div
                    key={table.id}
                    className="bet888-table-tile"
                    onClick={() => handleTableCardClick(table)}
                    title={table.isPrivate || table.hasCode ? "Tavolinë Private me Kod" : `Hyr në ${table.name}`}
                  >
                    {/* Fee Badge */}
                    <span className={`tile-fee-badge ${feeBadgeClass}`}>
                      {feeLabel}
                    </span>

                    {/* Mini Oval Table Graphic */}
                    <div className="mini-table-stage">
                      <div className="mini-table-oval glow-green">
                        <div className="mini-table-felt">
                          <span className="mini-felt-title">NL HOLD&apos;EM</span>
                          <span className="mini-blinds-label">${table.sb} / ${table.bb}</span>
                        </div>
                        {/* Render miniature seat dots around the oval */}
                        {Array.from({ length: table.maxSeats }).map((_, seatIdx) => {
                          const isOccupied = seatIdx < seated;
                          const angle = (seatIdx / table.maxSeats) * 2 * Math.PI - Math.PI / 2;
                          const dotX = 65 + 58 * Math.cos(angle);
                          const dotY = 37 + 30 * Math.sin(angle);
                          return (
                            <span
                              key={seatIdx}
                              className={`mini-seat-dot ${isOccupied ? "occupied" : "empty"}`}
                              style={{ left: `${dotX}px`, top: `${dotY}px` }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Table Info Block */}
                    <div className="tile-info-block">
                      <h3 className="tile-table-name">{table.name}</h3>
                      <div className="tile-meta">
                        <span>NL Hold&apos;em</span>
                        <span className="dot-sep">·</span>
                        <span>{table.sb}/{table.bb}</span>
                        <span className="dot-sep">·</span>
                        <span>{seated}/{table.maxSeats} Lojtarë</span>
                      </div>

                      {/* Code status: code is hidden on the card, only prompt */}
                      {table.isPrivate || table.hasCode ? (
                        <div className="tile-private-code">
                          🔒 ME KOD FTESE
                        </div>
                      ) : (
                        <div className="tile-status-line">
                          <span className="status-indicator-dot playing" />
                          <span>E Hapur për Lojë</span>
                        </div>
                      )}
                    </div>

                    {/* Hover Overlay */}
                    <div className="tile-hover-overlay">
                      <button type="button" className="tile-play-btn">
                        {table.isPrivate || table.hasCode ? "🔒 SHKRUAJ KODIN" : "LUAJ TANI ♠"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ================= SECTION 5.3 ROW 2: EGT DIGITAL SLOTS ================= */}
          <section className="bet888-game-row-section">
            <div className="bet888-row-header">
              <div className="bet888-row-title-chip egt-chip">
                <span>🎰</span>
                <h2>EGT Digital</h2>
              </div>
              <div className="bet888-row-actions">
                <button type="button" className="bet888-btn-view-all">Shiko të gjitha (64) →</button>
              </div>
            </div>

            <div className="bet888-casino-slots-grid">
              {[
                { title: "Burning Hot", tag: "JACKPOT", icon: "🔥", jp: "€142,850" },
                { title: "Shining Crown", tag: "HOT", icon: "👑", jp: "€98,400" },
                { title: "20 Super Hot", tag: "CLASSIC", icon: "🍒", jp: "€64,120" },
                { title: "Flaming Hot", tag: "POPULAR", icon: "🍇", jp: "€52,900" },
                { title: "40 Super Hot", tag: "JACKPOT", icon: "⭐", jp: "€81,400" },
                { title: "Dazzling Hot", tag: "FRUIT", icon: "🍋", jp: "€39,200" },
              ].map((slot) => (
                <div key={slot.title} className="bet888-slot-card" title={`Luaj ${slot.title}`}>
                  <div className="slot-visual" style={{ background: "linear-gradient(135deg, #1e1b4b, #0f172a)" }}>
                    <span className="slot-tag">{slot.tag}</span>
                    <span className="slot-reel-icon">{slot.icon}</span>
                    <span className="slot-jackpot">{slot.jp}</span>
                  </div>
                  <div className="slot-info">
                    <h4>{slot.title}</h4>
                    <small>EGT Digital · 96.5% RTP</small>
                  </div>
                  <div className="slot-overlay">
                    <button type="button" className="tile-play-btn">DEMO / PLAY</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ================= SECTION 5.3 ROW 3: PRAGMATIC PLAY SLOTS ================= */}
          <section className="bet888-game-row-section">
            <div className="bet888-row-header">
              <div className="bet888-row-title-chip pragmatic-chip">
                <span>⚡</span>
                <h2>Pragmatic Play</h2>
              </div>
              <div className="bet888-row-actions">
                <button type="button" className="bet888-btn-view-all">Shiko të gjitha (128) →</button>
              </div>
            </div>

            <div className="bet888-casino-slots-grid">
              {[
                { title: "Gates of Olympus", tag: "DROPS & WINS", icon: "⚡", jp: "5,000x" },
                { title: "Sweet Bonanza", tag: "TUMBLE", icon: "🍭", jp: "21,100x" },
                { title: "Sugar Rush", tag: "POPULAR", icon: "🍬", jp: "5,000x" },
                { title: "Big Bass Bonanza", tag: "FISHING", icon: "🐟", jp: "2,100x" },
                { title: "The Dog House", tag: "STICKY WILDS", icon: "🐶", jp: "6,750x" },
                { title: "Wolf Gold", tag: "JACKPOT", icon: "🐺", jp: "1,000x" },
              ].map((slot) => (
                <div key={slot.title} className="bet888-slot-card" title={`Luaj ${slot.title}`}>
                  <div className="slot-visual" style={{ background: "linear-gradient(135deg, #3b0764, #0f172a)" }}>
                    <span className="slot-tag">{slot.tag}</span>
                    <span className="slot-reel-icon">{slot.icon}</span>
                    <span className="slot-jackpot">{slot.jp}</span>
                  </div>
                  <div className="slot-info">
                    <h4>{slot.title}</h4>
                    <small>Pragmatic Play · 96.5% RTP</small>
                  </div>
                  <div className="slot-overlay">
                    <button type="button" className="tile-play-btn">DEMO / PLAY</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* ================= UNLOCK PRIVATE TABLE PASSCODE MODAL ================= */}
      {unlockModalTable && (
        <div className="poker-modal-backdrop" onClick={() => setUnlockModalTable(null)}>
          <div className="poker-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔒 Tavolinë Private: {unlockModalTable.name}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setUnlockModalTable(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 16px" }}>
                Kjo tavolinë është private. Ju lutem shkruani kodin 6-shifror të ftesës për të hyrë në lojë.
              </p>

              <form onSubmit={handleUnlockPrivateTable}>
                <div style={{ marginBottom: "16px" }}>
                  <label
                    htmlFor="private-table-modal-code"
                    style={{ display: "block", color: "#cbd5e1", fontSize: "12px", marginBottom: "6px", fontWeight: 700 }}
                  >
                    KODI I FTESËS (6 KARAKTERE)
                  </label>
                  <input
                    id="private-table-modal-code"
                    type="text"
                    maxLength={6}
                    placeholder="P.sh. W7K9X2"
                    value={unlockCodeInput}
                    onChange={(e) => setUnlockCodeInput(e.target.value.toUpperCase())}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "#1e293b",
                      border: "1.5px solid #38bdf8",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "18px",
                      fontWeight: 800,
                      letterSpacing: "3px",
                      textAlign: "center",
                      textTransform: "uppercase",
                    }}
                    autoFocus
                  />
                </div>

                {unlockError && (
                  <div style={{ color: "#ef4444", fontSize: "12px", marginBottom: "14px", fontWeight: 700 }}>
                    ⚠️ {unlockError}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setUnlockModalTable(null)}
                    style={{
                      padding: "8px 16px",
                      background: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "6px",
                      color: "#cbd5e1",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Anulo
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "8px 20px",
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      border: "none",
                      borderRadius: "6px",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Hyr në Tavolinë →
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
