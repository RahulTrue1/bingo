"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BasepokerTableItem,
  StakeTier,
  getStoredPokerTables,
  createAndStorePokerTable,
} from "../poker/poker-tables-store";
import { PlayerHeader } from "../components/player/PlayerHeader";
import { AuthModal } from "../components/player/AuthModal";
import { apiClient, type PlayerModel } from "../api-client";
import "../poker/poker.css";

export default function BasepokerCashgameLobby() {
  const router = useRouter();

  // Tables State
  const [tables, setTables] = useState<BasepokerTableItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<"holdem" | "plo" | "spin" | "aof" | "tournaments">("holdem");

  // View Mode: Group vs Table
  const [viewMode, setViewMode] = useState<"group" | "table">("group");

  // Filter States
  const [tierFilter, setTierFilter] = useState<StakeTier>("all");
  const [seatsFilter, setSeatsFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  // Join by Invite Code
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joinError, setJoinError] = useState("");

  // Create Table Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    sb: 5,
    bb: 10,
    seats: 6,
    feeType: "RAKE" as "RAKE" | "HAND_FEE" | "TABLE_FEE",
    isPrivate: false,
  });

  // Wallet & Player Authentication State (matching Bingo)
  const [wallet, setWallet] = useState(10000);
  const [currentUser, setCurrentUser] = useState<PlayerModel | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [blockedAlert, setBlockedAlert] = useState<string | null>(null);

  // Private Table Passcode Modal State
  const [privateTableToUnlock, setPrivateTableToUnlock] = useState<BasepokerTableItem | null>(null);
  const [privateCodeInput, setPrivateCodeInput] = useState("");
  const [privateCodeError, setPrivateCodeError] = useState("");

  const isCurrentUserBlocked = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.status === "Restricted" ||
      currentUser.status === "Suspended" ||
      (currentUser as any).pokerAccess === false
    );
  }, [currentUser]);

  const refreshWallet = useCallback((targetUsername?: string) => {
    const user = targetUsername || currentUser?.username || apiClient.auth.getStoredUsername();
    apiClient.wallet.get(user || undefined).then((w) => {
      if (w && typeof w.balance === "number") setWallet(w.balance);
    }).catch(() => {});
  }, [currentUser?.username]);

  const refreshUser = useCallback((targetUsername?: string) => {
    const user = targetUsername || currentUser?.username || apiClient.auth.getStoredUsername();
    apiClient.auth.me(user || undefined).then((res) => {
      if (res?.user) {
        setCurrentUser(res.user);
        if (typeof res.wallet === "number") setWallet(res.wallet);
      }
    }).catch(() => {});
  }, [currentUser?.username]);

  const handleAuthSuccess = (user: PlayerModel, newWallet: number) => {
    apiClient.auth.setStoredUsername(user.username);
    setCurrentUser(user);
    setWallet(newWallet);
    setAuthModalOpen(false);
  };

  const handleLogout = () => {
    apiClient.auth.logout();
    setCurrentUser(null);
    refreshWallet();
  };

  // Load tables, user, and wallet on mount, and subscribe to table updates
  useEffect(() => {
    const syncTables = () => {
      const list = getStoredPokerTables();
      setTables(list);
      if (list.length > 0 && !list.some((t) => t.id === selectedTableId)) {
        setSelectedTableId(list[0].id);
      }
    };

    syncTables();
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 10);

    refreshWallet();
    refreshUser();

    const handleWalletUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ balance: number }>;
      if (typeof custom.detail?.balance === "number") {
        setWallet(custom.detail.balance);
      }
    };
    window.addEventListener("wallet_balance_updated", handleWalletUpdate);

    const handleStorage = () => syncTables();
    window.addEventListener("basepoker_tables_updated", handleStorage);
    window.addEventListener("storage", handleStorage);

    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "wallet" || event.entity === "players") {
        refreshWallet();
        refreshUser();
      }
    });

    return () => {
      clearTimeout(t);
      window.removeEventListener("wallet_balance_updated", handleWalletUpdate);
      window.removeEventListener("basepoker_tables_updated", handleStorage);
      window.removeEventListener("storage", handleStorage);
      unsub();
    };
  }, [refreshWallet, refreshUser, selectedTableId]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      // Stake Tier
      if (tierFilter !== "all" && t.tier !== tierFilter) return false;
      // Seats
      if (seatsFilter !== "all" && t.maxSeats !== seatsFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesBlinds = `${t.sb}/${t.bb}`.includes(q);
        const matchesCode = t.inviteCode && t.inviteCode.toLowerCase().includes(q);
        if (!matchesName && !matchesBlinds && !matchesCode) return false;
      }
      return true;
    });
  }, [tables, tierFilter, seatsFilter, searchQuery]);

  // Selected Table for Table Preview
  const selectedTable = useMemo(() => {
    return tables.find((t) => t.id === selectedTableId) || filteredTables[0] || tables[0];
  }, [tables, selectedTableId, filteredTables]);

  // Open Table in `/holdem/tables?code=...`
  const handleOpenTable = (tableId: string) => {
    if (isCurrentUserBlocked) {
      setBlockedAlert(
        "🚫 Account Restricted: Your poker gaming privileges have been restricted by the administrator. Contact support for assistance."
      );
      return;
    }
    const target = tables.find((t) => t.id === tableId);
    if (!target) return;

    // If private table, do not enter directly: prompt for invite code
    if (target.isPrivate) {
      setPrivateTableToUnlock(target);
      setPrivateCodeInput("");
      setPrivateCodeError("");
      return;
    }

    const code = target.inviteCode || target.id || tableId;
    router.push(`/holdem/tables?code=${encodeURIComponent(code)}`);
  };

  // Submit Private Table Passcode
  const handleUnlockPrivateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateTableToUnlock) return;
    const cleanInput = privateCodeInput.trim().toUpperCase();
    const actualCode = (privateTableToUnlock.inviteCode || "").trim().toUpperCase();

    if (!cleanInput) {
      setPrivateCodeError("Please enter the invite code.");
      return;
    }

    if (cleanInput === actualCode) {
      const target = privateTableToUnlock;
      const code = target.inviteCode || target.id;
      setPrivateTableToUnlock(null);
      setPrivateCodeInput("");
      setPrivateCodeError("");
      router.push(`/holdem/tables?code=${encodeURIComponent(code)}`);
    } else {
      setPrivateCodeError("Incorrect code. Please enter the valid table code to join.");
    }
  };

  // Join by Invite Code
  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCurrentUserBlocked) {
      setBlockedAlert(
        "🚫 Account Restricted: Your poker gaming privileges have been restricted by the administrator."
      );
      return;
    }
    const clean = inviteCodeInput.trim().toUpperCase();
    if (!clean) return;

    const target = tables.find(
      (t) => t.inviteCode?.toUpperCase() === clean || t.id.toLowerCase() === clean.toLowerCase()
    );

    if (target) {
      router.push(`/holdem/tables?code=${encodeURIComponent(clean)}`);
    } else {
      setJoinError(`Table with code "${clean}" not found.`);
    }
  };

  // Create Table Handler
  const handleCreateTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    const newTable = createAndStorePokerTable({
      name: createForm.name.trim(),
      sb: createForm.sb,
      bb: createForm.bb,
      maxSeats: createForm.seats,
      feeType: createForm.feeType,
      isPrivate: createForm.isPrivate,
    });

    setTables(getStoredPokerTables());
    setSelectedTableId(newTable.id);
    setShowCreateModal(false);
    // Navigate straight to the newly created table
    router.push(`/holdem/tables?code=${encodeURIComponent(newTable.inviteCode || newTable.id)}`);
  };

  return (
    <div className="player-shell basepoker-root">
      {/* ================= BINGO UNIFIED PLAYER HEADER ================= */}
      <PlayerHeader
        wallet={wallet}
        currentUser={currentUser}
        currentApp="poker"
        onOpenAuth={() => setAuthModalOpen(true)}
        openAuthModal={() => setAuthModalOpen(true)}
        handleLogout={handleLogout}
        activePokerTab={activeTab}
        onPokerTabChange={setActiveTab}
      />

      {/* ================= HERO CASH GAME BANNER ================= */}
      <section className="bp-hero">
        <div className="bp-hero-container">
          <div className="bp-hero-content">
            <span className="bp-hero-badge">
              {activeTab === "holdem" && "TEXAS HOLD'EM MULTIPLAYER"}
              {activeTab === "plo" && "POT-LIMIT OMAHA MULTIPLAYER"}
              {activeTab === "spin" && "SPIN & CASH HYPER-TURBO"}
              {activeTab === "aof" && "ALL-IN OR FOLD CASH TABLES"}
              {activeTab === "tournaments" && "CHAMPIONSHIP TOURNAMENTS"}
            </span>
            <h1 className="bp-hero-title">
              {activeTab === "holdem" && "No-Limit Hold'em Cash Games"}
              {activeTab === "plo" && "Pot-Limit Omaha Cash Games"}
              {activeTab === "spin" && "Spin & Cash Multiplier Jackpot"}
              {activeTab === "aof" && "All In or Fold High-Action Tables"}
              {activeTab === "tournaments" && "Championship Tournament Series"}
            </h1>
            <p className="bp-hero-desc">
              Play live poker against players in real-time. Choose your stakes from Micro to High Roller,
              or create your own private table for friends.
            </p>
          </div>

          <div className="bp-hero-stats">
            <div className="bp-stat-box">
              <span className="bp-stat-num">{tables.length}</span>
              <span className="bp-stat-label">Live Tables</span>
            </div>
            <div className="bp-stat-box">
              <span className="bp-stat-num">
                {tables.reduce((acc, t) => acc + t.seatsOccupied, 0)}
              </span>
              <span className="bp-stat-label">Players Seated</span>
            </div>
            <div className="bp-stat-box">
              <span className="bp-stat-num">3</span>
              <span className="bp-stat-label">Commission Models</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CONTROL & FILTER BAR ================= */}
      <section className="bp-controls-section">
        <div className="bp-controls-container">
          {/* Left: View Mode Toggle & Stake Filters */}
          <div className="bp-controls-left">
            {/* View Mode Toggle: Group vs Table */}
            <div className="bp-view-switcher" role="radiogroup" aria-label="View layout">
              <button
                className={`bp-view-btn ${viewMode === "group" ? "active" : ""}`}
                onClick={() => setViewMode("group")}
                title="Switch to Grouped Card View"
              >
                <span className="bp-btn-icon">▦</span>
                <span>Group</span>
              </button>
              <button
                className={`bp-view-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Switch to Table List View"
              >
                <span className="bp-btn-icon">☰</span>
                <span>Table</span>
              </button>
            </div>

            {/* Stake Tier Filter Tabs */}
            <div className="bp-stake-tabs">
              {(["all", "micro", "low", "medium", "high", "vip"] as StakeTier[]).map((tier) => (
                <button
                  key={tier}
                  className={`bp-stake-tab ${tierFilter === tier ? "active" : ""}`}
                  onClick={() => setTierFilter(tier)}
                >
                  {tier.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Seats Filter */}
            <select
              className="bp-seats-select"
              value={seatsFilter}
              onChange={(e) => setSeatsFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            >
              <option value="all">All Seats</option>
              <option value={2}>2-Max (Heads-Up)</option>
              <option value={6}>6-Max</option>
              <option value={9}>9-Max (Full Ring)</option>
            </select>
          </div>

          {/* Right: Search, Invite Code, and Create Table */}
          <div className="bp-controls-right">
            {/* Search Input */}
            <div className="bp-search-box">
              <span className="bp-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search table or blinds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="bp-search-clear" onClick={() => setSearchQuery("")}>
                  ×
                </button>
              )}
            </div>

            {/* Quick Join by Code */}
            <form className="bp-join-code-form" onSubmit={handleJoinByCode}>
              <input
                type="text"
                placeholder="Invite Code (e.g. 7KJ8P9)"
                maxLength={8}
                value={inviteCodeInput}
                onChange={(e) => {
                  setInviteCodeInput(e.target.value.toUpperCase());
                  setJoinError("");
                }}
              />
              <button type="submit" className="bp-join-btn">
                Join
              </button>
            </form>
          </div>
        </div>

        {joinError && (
          <div className="bp-error-bar">
            <span>⚠️ {joinError}</span>
          </div>
        )}
      </section>

      {/* ================= MAIN CONTENT: GROUP VIEW OR TABLE VIEW ================= */}
      <main className="bp-main-container">
        {viewMode === "group" ? (
          /* ================= GROUP VIEW (Cards Grid) ================= */
          <div className="bp-group-grid">
            {filteredTables.map((tbl) => {
              const gradientFrom =
                tbl.theme === "purple"
                  ? "#3b1e54"
                  : tbl.theme === "blue"
                  ? "#10375c"
                  : tbl.theme === "red"
                  ? "#521c22"
                  : "#093c3c";

              return (
                <div
                  key={tbl.id}
                  className={`bp-card theme-${tbl.theme} ${tbl.isPrivate ? "is-private" : ""}`}
                  style={{ background: `linear-gradient(180deg, ${gradientFrom} 0%, #030b14 100%)` }}
                  onClick={() => handleOpenTable(tbl.id)}
                >
                  {/* Card Header */}
                  <div className="bp-card-header">
                    <div>
                      <h3 className="bp-card-title">{tbl.name}</h3>
                      <span className="bp-card-tier">{tbl.tier.toUpperCase()} STAKES</span>
                    </div>
                    <span className={`bp-card-badge badge-${tbl.theme}`}>
                      {tbl.feeLabel}
                    </span>
                  </div>

                  {/* Private Table Lock Indicator (Code hidden, prompt on click) */}
                  {tbl.isPrivate && (
                    <div className="bp-card-private-code is-locked">
                      <span>🔒 <b>PRIVATE TABLE</b> · CODE REQUIRED</span>
                    </div>
                  )}

                  {/* Mini Table Felt Visual */}
                  <div className="bp-card-table-stage">
                    <div className={`bp-card-oval glow-${tbl.theme}`}>
                      <div className="bp-card-felt">
                        <span className="bp-felt-blinds">
                          €{tbl.sb} / €{tbl.bb}
                        </span>
                        <span className="bp-felt-format">NLH</span>
                      </div>
                      {/* Seat dots */}
                      {Array.from({ length: tbl.maxSeats }).map((_, sIdx) => {
                        const occupied = sIdx < tbl.seatsOccupied;
                        const angle = (sIdx / tbl.maxSeats) * 2 * Math.PI;
                        const x = 50 + 44 * Math.cos(angle);
                        const y = 50 + 38 * Math.sin(angle);
                        return (
                          <div
                            key={sIdx}
                            className={`bp-seat-dot ${occupied ? "occupied" : "empty"}`}
                            style={{ left: `${x}%`, top: `${y}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Metadata */}
                  <div className="bp-card-meta">
                    <div className="bp-meta-item">
                      <span className="bp-meta-lbl">Stakes</span>
                      <span className="bp-meta-val">€{tbl.sb} / €{tbl.bb}</span>
                    </div>
                    <div className="bp-meta-item">
                      <span className="bp-meta-lbl">Buy-in</span>
                      <span className="bp-meta-val">€{tbl.minBuyIn} - €{tbl.maxBuyIn}</span>
                    </div>
                  </div>

                  {/* Players Row & Action */}
                  <div className="bp-card-footer">
                    <div className="bp-card-players">
                      <span className={`bp-status-dot ${tbl.status === "playing" ? "playing" : "waiting"}`} />
                      <span>
                        {tbl.seatsOccupied}/{tbl.maxSeats} Players
                        {tbl.status === "playing" ? " (In Hand)" : " (Waiting)"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="bp-play-cta"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTable(tbl.id);
                      }}
                    >
                      PLAY NOW
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ================= TABLE VIEW (List + Table Preview) ================= */
          <div className="bp-table-view-split">
            {/* Left: Table List */}
            <div className="bp-table-list-panel">
              <div className="bp-table-grid-header">
                <span>TABLE NAME</span>
                <span>STAKES</span>
                <span>BUY-IN</span>
                <span>PLAYERS</span>
                <span>COMMISSION</span>
                <span>ACTION</span>
              </div>

              <div className="bp-table-grid-body">
                {filteredTables.map((tbl) => {
                  const isSelected = selectedTable?.id === tbl.id;
                  return (
                    <div
                      key={tbl.id}
                      className={`bp-table-row ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedTableId(tbl.id)}
                    >
                      <div className="bp-col-name">
                        <strong className="bp-tbl-title">{tbl.name}</strong>
                        {tbl.isPrivate ? (
                          <span className="bp-badge-private">PRIVATE ({tbl.inviteCode})</span>
                        ) : (
                          <span className="bp-badge-public">PUBLIC</span>
                        )}
                      </div>

                      <div className="bp-col-stakes">
                        €{tbl.sb} / €{tbl.bb}
                      </div>

                      <div className="bp-col-buyin">
                        €{tbl.minBuyIn} - €{tbl.maxBuyIn}
                      </div>

                      <div className="bp-col-players">
                        <span className="bp-players-count">
                          {tbl.seatsOccupied} / {tbl.maxSeats}
                        </span>
                        <div className="bp-progress-bar">
                          <div
                            className="bp-progress-fill"
                            style={{
                              width: `${Math.min(100, (tbl.seatsOccupied / tbl.maxSeats) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="bp-col-fee">
                        <span className={`bp-fee-tag tag-${tbl.theme}`}>
                          {tbl.feeLabel}
                        </span>
                      </div>

                      <div className="bp-col-action">
                        <button
                          type="button"
                          className="bp-btn-open-row"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTable(tbl.id);
                          }}
                        >
                          Open Table
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredTables.length === 0 && (
                  <div className="bp-no-tables">
                    <p>No tables matching the selected filters.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Table Preview Pane */}
            {selectedTable && (
              <aside className="bp-preview-panel">
                <div className="bp-preview-header">
                  <div>
                    <h3 className="bp-preview-title">{selectedTable.name}</h3>
                    <span className="bp-preview-sub">
                      Blinds €{selectedTable.sb} / €{selectedTable.bb} • {selectedTable.maxSeats}-Max
                    </span>
                  </div>
                  <span className={`bp-card-badge badge-${selectedTable.theme}`}>
                    {selectedTable.feeLabel}
                  </span>
                </div>

                {/* Table Felt Graphic with Seats Preview */}
                <div className="bp-preview-felt-wrap">
                  <div className={`bp-preview-oval glow-${selectedTable.theme}`}>
                    <div className="bp-preview-felt">
                      <div className="bp-preview-dealer">♠ DEALER</div>
                      <div className="bp-preview-center">
                        <div className="bp-preview-chips">🪙 €{selectedTable.bb * 8}</div>
                        <div className="bp-preview-board">
                          <span className="c">🂠</span>
                          <span className="c">🂠</span>
                          <span className="c">🂠</span>
                          <span className="c">🂠</span>
                          <span className="c">🂠</span>
                        </div>
                      </div>
                    </div>

                    {/* Preview Seat Dots with Avatars */}
                    {Array.from({ length: selectedTable.maxSeats }).map((_, sIdx) => {
                      const occupied = sIdx < selectedTable.seatsOccupied;
                      const angle = (sIdx / selectedTable.maxSeats) * 2 * Math.PI;
                      const x = 50 + 44 * Math.cos(angle);
                      const y = 50 + 38 * Math.sin(angle);
                      return (
                        <div
                          key={sIdx}
                          className={`bp-preview-seat ${occupied ? "occupied" : "empty"}`}
                          style={{ left: `${x}%`, top: `${y}%` }}
                        >
                          {occupied ? `P${sIdx + 1}` : "+"}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Table Details List */}
                <div className="bp-preview-details">
                  <div className="bp-detail-row">
                    <span className="lbl">Game Variant:</span>
                    <span className="val">No-Limit Texas Hold&apos;em</span>
                  </div>
                  <div className="bp-detail-row">
                    <span className="lbl">Stakes (SB/BB):</span>
                    <span className="val">€{selectedTable.sb} / €{selectedTable.bb}</span>
                  </div>
                  <div className="bp-detail-row">
                    <span className="lbl">Buy-in Range:</span>
                    <span className="val">€{selectedTable.minBuyIn} - €{selectedTable.maxBuyIn}</span>
                  </div>
                  <div className="bp-detail-row">
                    <span className="lbl">Company Commission:</span>
                    <span className="val font-gold">{selectedTable.feeLabel}</span>
                  </div>
                  <div className="bp-detail-row">
                    <span className="lbl">Seats Capacity:</span>
                    <span className="val">{selectedTable.maxSeats} Players Max</span>
                  </div>
                  <div className="bp-detail-row">
                    <span className="lbl">Current Seated:</span>
                    <span className="val">{selectedTable.seatsOccupied} Players</span>
                  </div>
                  {selectedTable.isPrivate && (
                    <div className="bp-detail-row highlight-code">
                      <span className="lbl">Access:</span>
                      <span className="val code" style={{ color: "#c084fc" }}>🔒 Private (Code Required)</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="bp-preview-actions">
                  <button
                    className="bp-btn-preview-open"
                    onClick={() => handleOpenTable(selectedTable.id)}
                  >
                    Open Table
                  </button>
                  <button
                    className="bp-btn-preview-spectate"
                    onClick={() => handleOpenTable(selectedTable.id)}
                  >
                    Spectate
                  </button>
                </div>
              </aside>
            )}
          </div>
        )}
      </main>

      {/* ================= BLOCKED ACCOUNT ALERT MODAL ================= */}
      {blockedAlert && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: 20,
          }}
          onClick={() => setBlockedAlert(null)}
        >
          <div
            style={{
              background: "#181432",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: 16,
              maxWidth: 440,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 44, marginBottom: 12 }}>🚫</div>
            <h3 style={{ color: "#fff", margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>
              Account Access Restricted
            </h3>
            <p style={{ color: "#a5a2bb", fontSize: 13, lineHeight: 1.5, margin: "0 0 20px" }}>
              {blockedAlert}
            </p>
            <button
              type="button"
              onClick={() => setBlockedAlert(null)}
              style={{
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* ================= AUTH MODAL (LOGIN / SIGNUP) ================= */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* ================= PRIVATE TABLE PASSCODE PROMPT MODAL ================= */}
      {privateTableToUnlock && (
        <div
          className="bp-modal-overlay"
          onClick={() => {
            setPrivateTableToUnlock(null);
            setPrivateCodeInput("");
            setPrivateCodeError("");
          }}
        >
          <div className="bp-unlock-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bp-unlock-header">
              <div className="bp-unlock-icon">🔒</div>
              <div className="bp-unlock-title-box">
                <h3 className="bp-unlock-title">Private Table Access</h3>
                <span className="bp-unlock-sub">
                  {privateTableToUnlock.name} • €{privateTableToUnlock.sb}/€{privateTableToUnlock.bb} NLH
                </span>
              </div>
              <button
                type="button"
                className="bp-unlock-close"
                onClick={() => {
                  setPrivateTableToUnlock(null);
                  setPrivateCodeInput("");
                  setPrivateCodeError("");
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUnlockPrivateTable} className="bp-unlock-form">
              <p className="bp-unlock-desc">
                This table is private. Please enter the invite code provided by the table host to join.
              </p>

              <div className="bp-unlock-input-wrap">
                <label htmlFor="private-table-code-input" className="bp-unlock-label">
                  Table Invite Code
                </label>
                <input
                  id="private-table-code-input"
                  type="text"
                  className="bp-unlock-input"
                  placeholder="e.g. 7KJ8P9"
                  maxLength={12}
                  autoFocus
                  value={privateCodeInput}
                  onChange={(e) => {
                    setPrivateCodeInput(e.target.value.toUpperCase());
                    if (privateCodeError) setPrivateCodeError("");
                  }}
                />
              </div>

              {privateCodeError && (
                <div className="bp-unlock-error">
                  <span>⚠️ {privateCodeError}</span>
                </div>
              )}

              <div className="bp-unlock-actions">
                <button
                  type="button"
                  className="bp-unlock-cancel-btn"
                  onClick={() => {
                    setPrivateTableToUnlock(null);
                    setPrivateCodeInput("");
                    setPrivateCodeError("");
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="bp-unlock-submit-btn">
                  Unlock & Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= INLINE STYLES ================= */}
      <style jsx>{`
        .basepoker-root {
          min-height: 100vh;
          background: #0c0920;
          color: #ffffff;
          font-family: 'Plus Jakarta Sans', 'Manrope', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
        }

        /* Hero */
        .bp-hero {
          background: radial-gradient(circle at 50% 30%, rgba(120, 104, 255, 0.22), transparent 60%), #0c0920;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 32px 24px;
        }

        .bp-hero-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bp-hero-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          color: #8a78ff;
          letter-spacing: 1.5px;
          margin-bottom: 8px;
        }

        .bp-hero-title {
          font-size: 28px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.5px;
          margin: 0 0 8px;
        }

        .bp-hero-desc {
          margin: 0;
          font-size: 13px;
          color: #9b93ae;
          max-width: 600px;
          line-height: 1.6;
        }

        .bp-hero-stats {
          display: flex;
          gap: 16px;
        }

        .bp-stat-box {
          background: rgba(23, 18, 47, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 14px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 100px;
          box-shadow: 0 8px 20px rgba(10, 7, 30, 0.35);
        }

        .bp-stat-num {
          font-size: 22px;
          font-weight: 900;
          color: #f6bd49;
        }

        .bp-stat-label {
          font-size: 11px;
          color: #9b93ae;
          font-weight: 700;
        }

        /* Controls & Filter Bar */
        .bp-controls-section {
          background: #0e0a24;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 14px 24px;
        }

        .bp-controls-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .bp-controls-left {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        /* View switcher (Group / Table) */
        .bp-view-switcher {
          display: flex;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 4px;
          gap: 4px;
        }

        .bp-view-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: #928ca7;
          padding: 8px 14px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .bp-view-btn:hover:not(.active) {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }

        .bp-view-btn.active {
          background: #7868ff;
          color: #fff;
          box-shadow: 0 4px 12px rgba(120, 104, 255, 0.35);
        }

        .bp-stake-tabs {
          display: flex;
          gap: 4px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 4px;
          border-radius: 12px;
        }

        .bp-stake-tab {
          background: transparent;
          border: none;
          color: #928ca7;
          padding: 8px 14px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .bp-stake-tab:hover:not(.active) {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }

        .bp-stake-tab.active {
          background: #7868ff;
          color: #fff;
          box-shadow: 0 4px 12px rgba(120, 104, 255, 0.3);
        }

        .bp-seats-select {
          background: #17122f;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 10px;
          cursor: pointer;
          outline: none;
        }

        .bp-seats-select:focus {
          border-color: #7868ff;
          box-shadow: 0 0 0 3px rgba(120, 104, 255, 0.2);
        }

        .bp-controls-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .bp-search-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .bp-search-icon {
          position: absolute;
          left: 10px;
          font-size: 12px;
          color: #8e89a5;
        }

        .bp-search-box input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 8px 28px 8px 30px;
          color: #fff;
          font-size: 12px;
          width: 170px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .bp-search-box input:focus {
          border-color: #7868ff;
          box-shadow: 0 0 0 3px rgba(120, 104, 255, 0.2);
        }

        .bp-search-clear {
          position: absolute;
          right: 8px;
          background: none;
          border: none;
          color: #928ca7;
          cursor: pointer;
          font-size: 14px;
        }

        .bp-join-code-form {
          display: flex;
          gap: 0;
        }

        .bp-join-code-form input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px 0 0 10px;
          padding: 8px 12px;
          color: #fff;
          font-size: 12px;
          width: 130px;
          text-transform: uppercase;
          outline: none;
        }

        .bp-join-code-form input:focus {
          border-color: #7868ff;
        }

        .bp-join-btn {
          background: #7868ff;
          border: none;
          color: #fff;
          padding: 0 14px;
          border-radius: 0 10px 10px 0;
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .bp-join-btn:hover {
          background: #5943e9;
        }

        .bp-create-table-btn {
          background: linear-gradient(135deg, #7868ff, #5943e9);
          border: none;
          color: #fff;
          font-weight: 800;
          font-size: 12px;
          padding: 9px 18px;
          border-radius: 10px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(120, 104, 255, 0.35);
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .bp-create-table-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(120, 104, 255, 0.45);
        }

        .bp-error-bar {
          max-width: 1400px;
          margin: 8px auto 0;
          background: rgba(255, 114, 94, 0.15);
          border: 1px solid #ff725e;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          color: #ff9d8f;
        }

        /* Main Container */
        .bp-main-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          flex: 1;
          width: 100%;
        }

        /* Group View (Grid) */
        .bp-group-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .bp-card {
          background: linear-gradient(145deg, #17132e, #100e23);
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 18px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 15px 28px rgba(26, 20, 58, 0.15);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          position: relative;
        }

        .bp-card:hover {
          transform: translateY(-4px);
          border-color: rgba(120, 104, 255, 0.45);
          box-shadow: 0 18px 36px rgba(120, 104, 255, 0.25);
        }

        .bp-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .bp-card-title {
          font-size: 16px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 2px;
        }

        .bp-card-tier {
          font-size: 10px;
          color: #8a78ff;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .bp-card-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .badge-green {
          background: rgba(39, 215, 173, 0.15);
          border: 1px solid #27d7ad;
          color: #27d7ad;
        }

        .badge-blue {
          background: rgba(120, 104, 255, 0.15);
          border: 1px solid #7868ff;
          color: #a496ff;
        }

        .badge-red {
          background: rgba(255, 114, 94, 0.15);
          border: 1px solid #ff725e;
          color: #ff725e;
        }

        .badge-purple {
          background: rgba(120, 104, 255, 0.25);
          border: 1px solid #8a78ff;
          color: #c4b5fd;
        }

        .bp-card-private-code {
          background: rgba(246, 189, 73, 0.12);
          border: 1px dashed rgba(246, 189, 73, 0.5);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 11px;
          color: #f6bd49;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          letter-spacing: 0.5px;
          transition: all 0.2s ease;
        }

        .bp-card-private-code.is-locked {
          background: rgba(168, 85, 247, 0.15);
          border: 1px dashed #a855f7;
          color: #e9d5ff;
        }

        .bp-card-private-code.is-locked:hover {
          background: rgba(168, 85, 247, 0.25);
          border-color: #c084fc;
        }

        /* Private Table Passcode Modal */
        .bp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 20px;
        }

        .bp-unlock-modal {
          background: linear-gradient(180deg, #1f153a 0%, #100b24 100%);
          border: 1px solid rgba(168, 85, 247, 0.45);
          border-radius: 18px;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(168, 85, 247, 0.25);
          overflow: hidden;
          animation: bpModalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes bpModalPop {
          0% {
            transform: scale(0.94);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .bp-unlock-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 22px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        .bp-unlock-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(168, 85, 247, 0.2);
          border: 1px solid rgba(168, 85, 247, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .bp-unlock-title-box {
          flex: 1;
        }

        .bp-unlock-title {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
        }

        .bp-unlock-sub {
          font-size: 12px;
          color: #c4b5fd;
          font-weight: 500;
        }

        .bp-unlock-close {
          background: transparent;
          border: none;
          color: #928ca7;
          font-size: 24px;
          cursor: pointer;
          line-height: 1;
          padding: 4px;
          transition: color 0.15s;
        }

        .bp-unlock-close:hover {
          color: #ffffff;
        }

        .bp-unlock-form {
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .bp-unlock-desc {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: #a5a2bb;
        }

        .bp-unlock-input-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .bp-unlock-label {
          font-size: 11px;
          font-weight: 700;
          color: #e2e0ed;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .bp-unlock-input {
          width: 100%;
          background: #090616;
          border: 1.5px solid rgba(168, 85, 247, 0.4);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 16px;
          font-weight: 800;
          color: #f6bd49;
          letter-spacing: 2px;
          text-transform: uppercase;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .bp-unlock-input:focus {
          border-color: #a855f7;
          box-shadow: 0 0 16px rgba(168, 85, 247, 0.35);
          background: #0d0822;
        }

        .bp-unlock-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
          font-size: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          font-weight: 600;
        }

        .bp-unlock-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 6px;
        }

        .bp-unlock-cancel-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #d1cddb;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bp-unlock-cancel-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }

        .bp-unlock-submit-btn {
          background: linear-gradient(135deg, #7868ff 0%, #a855f7 100%);
          border: none;
          color: #ffffff;
          padding: 10px 22px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(120, 104, 255, 0.4);
          transition: all 0.2s;
        }

        .bp-unlock-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5);
        }

        /* Mini Oval Felt */
        .bp-card-table-stage {
          display: flex;
          justify-content: center;
          padding: 10px 0;
        }

        .bp-card-oval {
          width: 180px;
          height: 90px;
          border-radius: 45px;
          background: radial-gradient(ellipse at center, #1f124d 0%, #120a30 70%, #0c0720 100%);
          border: 3px solid #7868ff;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 14px rgba(120, 104, 255, 0.2), inset 0 0 10px rgba(0, 0, 0, 0.6);
        }

        .glow-green {
          border-color: #27d7ad;
          box-shadow: 0 0 10px rgba(39, 215, 173, 0.35);
        }

        .glow-blue {
          border-color: #7868ff;
          box-shadow: 0 0 10px rgba(120, 104, 255, 0.35);
        }

        .glow-red {
          border-color: #ff725e;
          box-shadow: 0 0 10px rgba(255, 114, 94, 0.35);
        }

        .glow-purple {
          border-color: #8a78ff;
          box-shadow: 0 0 10px rgba(138, 120, 255, 0.35);
        }

        .bp-card-felt {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .bp-felt-blinds {
          font-size: 13px;
          font-weight: 800;
          color: #fff;
        }

        .bp-felt-format {
          font-size: 9px;
          color: #f6bd49;
          font-weight: 700;
        }

        .bp-seat-dot {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }

        .bp-seat-dot.occupied {
          background: #f6bd49;
          border: 1px solid #fff;
          box-shadow: 0 0 6px #f6bd49;
        }

        .bp-seat-dot.empty {
          background: rgba(255, 255, 255, 0.2);
          border: 1px dashed rgba(255, 255, 255, 0.4);
        }

        .bp-card-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          background: rgba(0, 0, 0, 0.25);
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .bp-meta-item {
          display: flex;
          flex-direction: column;
        }

        .bp-meta-lbl {
          font-size: 10px;
          color: #928ca7;
          text-transform: uppercase;
        }

        .bp-meta-val {
          font-size: 12px;
          font-weight: 700;
          color: #fff;
        }

        .bp-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
        }

        .bp-card-players {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #cbd5e1;
          font-weight: 600;
        }

        .bp-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .bp-status-dot.playing {
          background: #27d7ad;
          box-shadow: 0 0 6px #27d7ad;
        }

        .bp-status-dot.waiting {
          background: #928ca7;
        }

        .bp-play-cta {
          background: linear-gradient(135deg, #7868ff, #5943e9);
          border: none;
          color: #fff;
          font-weight: 800;
          font-size: 11px;
          padding: 7px 16px;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(120, 104, 255, 0.35);
          transition: all 0.15s ease;
        }

        .bp-play-cta:hover {
          background: #5943e9;
          transform: translateY(-1px);
        }

        /* Table View Split */
        .bp-table-view-split {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
          align-items: start;
        }

        .bp-table-list-panel {
          background: #17122f;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(10, 7, 30, 0.2);
        }

        .bp-table-grid-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1.2fr 1.2fr 1.4fr 1fr;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 11px;
          font-weight: 800;
          color: #928ca7;
          text-transform: uppercase;
        }

        .bp-table-grid-body {
          display: flex;
          flex-direction: column;
        }

        .bp-table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1.2fr 1.2fr 1.4fr 1fr;
          padding: 12px 16px;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          cursor: pointer;
          font-size: 13px;
          transition: background 0.15s ease;
        }

        .bp-table-row:hover {
          background: rgba(120, 104, 255, 0.08);
        }

        .bp-table-row.selected {
          background: rgba(120, 104, 255, 0.16);
          border-left: 3px solid #7868ff;
        }

        .bp-col-name {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .bp-tbl-title {
          color: #fff;
          font-weight: 700;
        }

        .bp-badge-private {
          font-size: 9px;
          color: #f6bd49;
          font-weight: 800;
        }

        .bp-badge-public {
          font-size: 9px;
          color: #27d7ad;
          font-weight: 800;
        }

        .bp-col-players {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .bp-progress-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          width: 80px;
        }

        .bp-progress-fill {
          height: 100%;
          background: #27d7ad;
        }

        .bp-fee-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .tag-green {
          background: rgba(39, 215, 173, 0.15);
          color: #27d7ad;
        }

        .tag-blue {
          background: rgba(120, 104, 255, 0.15);
          color: #a496ff;
        }

        .tag-red {
          background: rgba(255, 114, 94, 0.15);
          color: #ff725e;
        }

        .tag-purple {
          background: rgba(120, 104, 255, 0.25);
          color: #c4b5fd;
        }

        .bp-btn-open-row {
          background: #7868ff;
          border: none;
          color: #fff;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .bp-btn-open-row:hover {
          background: #5943e9;
        }

        /* Table Preview Panel */
        .bp-preview-panel {
          background: #17122f;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 10px 30px rgba(10, 7, 30, 0.2);
        }

        .bp-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .bp-preview-title {
          font-size: 17px;
          font-weight: 900;
          color: #fff;
          margin: 0;
        }

        .bp-preview-sub {
          font-size: 11px;
          color: #928ca7;
          font-weight: 600;
        }

        .bp-preview-felt-wrap {
          display: flex;
          justify-content: center;
          padding: 8px 0;
        }

        .bp-preview-oval {
          width: 240px;
          height: 120px;
          border-radius: 60px;
          background: radial-gradient(ellipse at center, #1f124d 0%, #120a30 70%, #0c0720 100%);
          border: 3px solid #7868ff;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 18px rgba(120, 104, 255, 0.25), inset 0 0 12px rgba(0, 0, 0, 0.6);
        }

        .bp-preview-felt {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .bp-preview-dealer {
          font-size: 10px;
          color: #928ca7;
          font-weight: 800;
          margin-bottom: 2px;
        }

        .bp-preview-center {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .bp-preview-chips {
          font-size: 11px;
          font-weight: 800;
          color: #f6bd49;
        }

        .bp-preview-board {
          display: flex;
          gap: 2px;
          font-size: 14px;
          color: #fff;
        }

        .bp-preview-seat {
          position: absolute;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
        }

        .bp-preview-seat.occupied {
          background: #f6bd49;
          color: #000;
          border: 1px solid #fff;
          box-shadow: 0 0 6px #f6bd49;
        }

        .bp-preview-seat.empty {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
          border: 1px dashed rgba(255, 255, 255, 0.4);
        }

        .bp-preview-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(0, 0, 0, 0.3);
          padding: 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .bp-detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }

        .bp-detail-row .lbl {
          color: #928ca7;
        }

        .bp-detail-row .val {
          color: #fff;
          font-weight: 700;
        }

        .bp-detail-row .font-gold {
          color: #f6bd49;
        }

        .highlight-code {
          background: rgba(246, 189, 73, 0.15);
          padding: 4px 6px;
          border-radius: 4px;
        }

        .highlight-code .code {
          color: #f6bd49;
          font-family: monospace;
          font-size: 13px;
        }

        .bp-preview-actions {
          display: flex;
          gap: 10px;
        }

        .bp-btn-preview-open {
          flex: 1;
          background: linear-gradient(135deg, #7868ff, #5943e9);
          border: none;
          color: #fff;
          padding: 10px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(120, 104, 255, 0.35);
          transition: transform 0.15s ease;
        }

        .bp-btn-preview-open:hover {
          transform: translateY(-1px);
        }

        .bp-btn-preview-spectate {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .bp-btn-preview-spectate:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        /* Modal */
        .bp-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 7, 30, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 16px;
        }

        .bp-modal {
          background: #17122f;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          width: 100%;
          max-width: 500px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
        }

        .bp-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: #120e28;
        }

        .bp-modal-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #fff;
        }

        .bp-modal-close {
          background: none;
          border: none;
          color: #928ca7;
          font-size: 20px;
          cursor: pointer;
        }

        .bp-modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .bp-modal-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #cbd5e1;
        }

        .bp-modal-field input,
        .bp-modal-field select {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
        }

        .bp-modal-field input:focus,
        .bp-modal-field select:focus {
          border-color: #7868ff;
          box-shadow: 0 0 0 3px rgba(120, 104, 255, 0.2);
        }

        .bp-modal-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .bp-modal-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #cbd5e1;
          cursor: pointer;
        }

        .bp-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 8px;
        }

        .bp-btn-cancel {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }

        .bp-btn-submit {
          background: linear-gradient(135deg, #7868ff, #5943e9);
          border: none;
          color: #fff;
          padding: 9px 20px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(120, 104, 255, 0.35);
        }

        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 1;
          }
        }

        @media (max-width: 900px) {
          .bp-table-view-split {
            grid-template-columns: 1fr;
          }
          .bp-hero-stats {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
