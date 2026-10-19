"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayerHeader } from "../components/player/PlayerHeader";
import { AuthModal } from "../components/player/AuthModal";
import { apiClient, type PlayerModel } from "../api-client";
import { pokerLiveApi } from "../poker/poker-live-api";
import { pokerSocketService } from "../poker/poker-socket-service";
import type {
  PokerLobbyTable,
  PokerSessionItem,
  PokerHandSummaryItem,
  PokerHandDetail,
  PokerFeeType,
} from "../poker/poker-live-types";
import { rankLabel, suitMeta } from "../poker/Bet888LiveTable";
import { Copy, Check, Clock, Trophy, List, Eye } from "@phosphor-icons/react";
import "../poker/poker.css";

export type StakeTier = "all" | "micro" | "low" | "medium" | "high" | "vip";

export default function BasepokerCashgameLobby() {
  const router = useRouter();

  // Navigation: Lobby Tabs or My Poker History
  const [activeTab, setActiveTab] = useState<"lobby" | "history">("lobby");
  const [historySubTab, setHistorySubTab] = useState<"sessions" | "hands">("sessions");

  // View Mode: Group vs Table
  const [viewMode, setViewMode] = useState<"group" | "table">("group");

  // Tables state from Live API
  const [tables, setTables] = useState<PokerLobbyTable[]>([]);
  const [seatedTableIds, setSeatedTableIds] = useState<number[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

  // Filters
  const [tierFilter, setTierFilter] = useState<StakeTier>("all");
  const [seatsFilter, setSeatsFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Join by Invite Code
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);

  // Create Private Table Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    sb: 5,
    bb: 10,
    maxSeats: 6,
  });
  const [createError, setCreateError] = useState("");
  const [createdTableData, setCreatedTableData] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // "My Poker" History State
  const [sessions, setSessions] = useState<PokerSessionItem[]>([]);
  const [hands, setHands] = useState<PokerHandSummaryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedHandDetail, setSelectedHandDetail] = useState<PokerHandDetail | null>(null);
  const [handDetailLoading, setHandDetailLoading] = useState(false);

  // Unified Player Wallet & User State
  const [wallet, setWallet] = useState(10000);
  const [currentUser, setCurrentUser] = useState<PlayerModel | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isPokerEnabled, setIsPokerEnabled] = useState<boolean | null>(null);

  // Refresh Wallet & User
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

  // Check Poker Access
  const checkPokerAccess = useCallback(async () => {
    try {
      const res = await pokerLiveApi.getUserDetails();
      if (res.user) {
        setIsPokerEnabled(res.user.isPokerEnabled !== false);
      } else {
        // Fallback to true if user endpoint not yet populated
        setIsPokerEnabled(true);
      }
    } catch (_) {
      setIsPokerEnabled(true);
    }
  }, []);

  // Fetch Tables from Authoritative REST API
  const loadLiveTables = useCallback(async () => {
    try {
      const res = await pokerLiveApi.getTables();
      if (res.tables && Array.isArray(res.tables)) {
        setTables(res.tables);
        setSeatedTableIds(res.seatedTableIds || []);
        if (res.tables.length > 0 && selectedTableId === null) {
          setSelectedTableId(res.tables[0].id);
        }
      }
    } catch (e) {
      console.warn("[PokerLobby] Error loading tables:", e);
    } finally {
      setLoadingTables(false);
    }
  }, [selectedTableId]);

  // Load history data
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      if (historySubTab === "sessions") {
        const res = await pokerLiveApi.getMySessions(historyPage, 20);
        setSessions(res.sessions || []);
      } else {
        const res = await pokerLiveApi.getMyHands(historyPage, 20);
        setHands(res.hands || []);
      }
    } catch (e) {
      console.warn("[PokerLobby] Error loading history:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, [historySubTab, historyPage]);

  // Mount effect: load tables, connect socket & subscribe to live updates
  useEffect(() => {
    refreshWallet();
    refreshUser();
    checkPokerAccess();
    loadLiveTables();

    // Connect WebSocket
    pokerSocketService.connect();
    pokerSocketService.subscribeLobby().catch(() => {});

    // Listen to real-time lobby updates
    const unsubLobby = pokerSocketService.onLobbyUpdate(({ tables: updatedTables, removed }) => {
      setTables((prev) => {
        const map = new Map<number, PokerLobbyTable>();
        for (const t of prev) map.set(t.id, t);
        for (const remId of removed || []) map.delete(remId);
        for (const u of updatedTables || []) map.set(u.id, { ...map.get(u.id), ...u });
        return Array.from(map.values());
      });
    });

    // Listen to wallet balance updates
    const unsubBalance = pokerSocketService.onBalance((newBal) => {
      setWallet(newBal);
    });

    const handleWalletEvent = (e: Event) => {
      const custom = e as CustomEvent<{ balance: number }>;
      if (typeof custom.detail?.balance === "number") {
        setWallet(custom.detail.balance);
      }
    };
    window.addEventListener("wallet_balance_updated", handleWalletEvent);

    // Fallback polling every 5s per integration guide
    const interval = setInterval(() => {
      loadLiveTables();
    }, 5000);

    return () => {
      unsubLobby();
      unsubBalance();
      clearInterval(interval);
      pokerSocketService.unsubscribeLobby().catch(() => {});
      window.removeEventListener("wallet_balance_updated", handleWalletEvent);
    };
  }, [refreshWallet, refreshUser, checkPokerAccess, loadLiveTables]);

  // Load history when tab switches
  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, historySubTab, historyPage, loadHistory]);

  const handleAuthSuccess = (user: PlayerModel, newWallet: number) => {
    apiClient.auth.setStoredUsername(user.username);
    setCurrentUser(user);
    setWallet(newWallet);
    setAuthModalOpen(false);
    checkPokerAccess();
    loadLiveTables();
  };

  const handleLogout = () => {
    apiClient.auth.logout();
    setCurrentUser(null);
    refreshWallet();
  };

  // Helper to determine stake tier
  const getTableTier = (bb: number): StakeTier => {
    if (bb <= 0.1) return "micro";
    if (bb <= 2) return "low";
    if (bb <= 20) return "medium";
    if (bb <= 100) return "high";
    return "vip";
  };

  // Filtered Tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const tier = getTableTier(t.bb);
      if (tierFilter !== "all" && tier !== tierFilter) return false;
      if (seatsFilter !== "all" && t.maxSeats !== seatsFilter) return false;
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

  const selectedTable = useMemo(() => {
    return (
      tables.find((t) => t.id === selectedTableId) ||
      filteredTables[0] ||
      tables[0] ||
      null
    );
  }, [tables, selectedTableId, filteredTables]);

  // Navigate to Table View in `/holdem/tables?tableId=...`
  const handleOpenTable = (tableId: number, inviteCode?: string) => {
    const target = tables.find((t) => t.id === tableId);
    if (target?.status === "paused") {
      alert(`Table "${target.name}" is currently paused. Please choose another table.`);
      return;
    }
    const codeParam = inviteCode || target?.inviteCode ? `&code=${encodeURIComponent(inviteCode || target?.inviteCode || "")}` : "";
    router.push(`/holdem/tables?tableId=${encodeURIComponent(tableId)}${codeParam}`);
  };

  // Join with Invite Code per Spec Section 4.2
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inviteCodeInput.trim();
    if (!clean) return;

    setJoinBusy(true);
    setJoinError("");

    try {
      const res = await pokerLiveApi.joinPrivateTable(clean);
      if (res.tableId) {
        setInviteCodeInput("");
        router.push(`/holdem/tables?tableId=${encodeURIComponent(res.tableId)}&code=${encodeURIComponent(clean)}`);
      } else {
        const err = res.error;
        if (err?.error === "INVALID_CODE") {
          setJoinError("Invalid invite code. Please verify the code with your friend.");
        } else if (err?.error === "TOO_MANY_ATTEMPTS") {
          setJoinError("Too many incorrect attempts. You are locked out for 15 minutes.");
        } else if (err?.error === "POKER_DISABLED") {
          setJoinError("Poker Live is not enabled for your account. Contact your agent.");
        } else {
          setJoinError(err?.message || "Failed to join private table.");
        }
      }
    } catch (e: any) {
      setJoinError(e?.message || "Failed to join private table.");
    } finally {
      setJoinBusy(false);
    }
  };

  // Create Private Table per Spec Section 4.1
  const handleCreatePrivateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError("Please enter a table name.");
      return;
    }

    setCreateError("");
    try {
      const res = await pokerLiveApi.createPrivateTable({
        name: createForm.name.trim(),
        sb: Number(createForm.sb),
        bb: Number(createForm.bb),
        maxSeats: Number(createForm.maxSeats),
      });

      if (res.table) {
        setShowCreateModal(false);
        setCreatedTableData(res.table);
        loadLiveTables();
      } else {
        setCreateError(res.error?.message || "Failed to create private table.");
      }
    } catch (e: any) {
      setCreateError(e?.message || "Failed to create private table.");
    }
  };

  // Close Private Table (owner only, Spec Section 4.3)
  const handleCloseTable = async (tableId: number) => {
    if (!confirm("Are you sure you want to close this private table? Active hands will be voided and stacks returned to wallets.")) {
      return;
    }
    try {
      const res = await pokerLiveApi.closePrivateTable(tableId);
      if (res.success) {
        loadLiveTables();
      } else {
        alert(res.error?.message || "Could not close table");
      }
    } catch (e: any) {
      alert(e?.message || "Could not close table");
    }
  };

  // View Hand Detail in Modal
  const handleViewHandDetail = async (handId: number) => {
    setHandDetailLoading(true);
    try {
      const res = await pokerLiveApi.getMyHandDetails(handId);
      if (res.hand) {
        setSelectedHandDetail(res.hand);
      }
    } catch (e) {
      console.warn("Could not load hand details", e);
    } finally {
      setHandDetailLoading(false);
    }
  };

  // Spec Section 2: If poker is disabled, hide all poker elements
  if (isPokerEnabled === false) {
    return (
      <div className="player-shell basepoker-root">
        <PlayerHeader
          wallet={wallet}
          currentUser={currentUser}
          currentApp="poker"
          onOpenAuth={() => setAuthModalOpen(true)}
          handleLogout={handleLogout}
        />
        <div className="poker-disabled-notice-box">
          <div className="disabled-icon">♠️</div>
          <h2>Poker Live Not Enabled</h2>
          <p>Poker Live is not enabled for your account. Please contact your agent or administrator to activate access.</p>
          <Link href="/" className="back-lobby-btn">
            Return to Casino Lobby
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="player-shell basepoker-root">
      {/* ================= HEADER ================= */}
      <PlayerHeader
        wallet={wallet}
        currentUser={currentUser}
        currentApp="poker"
        onOpenAuth={() => setAuthModalOpen(true)}
        openAuthModal={() => setAuthModalOpen(true)}
        handleLogout={handleLogout}
        activePokerTab="holdem"
      />

      {/* ================= HERO LOBBY BAR ================= */}
      <section className="poker-lobby-nav-hero">
        <div className="lobby-nav-container">
          <div className="lobby-nav-tabs">
            <button
              className={`lobby-tab-btn ${activeTab === "lobby" ? "active" : ""}`}
              onClick={() => setActiveTab("lobby")}
            >
              ♠ Live Cash Tables
            </button>
            <button
              className={`lobby-tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              📊 My Poker History
            </button>
          </div>

          {activeTab === "lobby" && (
            <div className="lobby-hero-actions">
              <button
                className="bp-create-table-btn"
                onClick={() => setShowCreateModal(true)}
              >
                + Create Table (Friends)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ================= MAIN CONTENT: LIVE TABLES OR HISTORY ================= */}
      {activeTab === "lobby" ? (
        <>
          {/* Controls & Filter Bar */}
          <section className="bp-controls-section">
            <div className="bp-controls-container">
              {/* Left: View Mode Toggle & Stake Filters */}
              <div className="bp-controls-left">
                <div className="bp-view-switcher" role="radiogroup">
                  <button
                    className={`bp-view-btn ${viewMode === "group" ? "active" : ""}`}
                    onClick={() => setViewMode("group")}
                    title="Grid layout"
                  >
                    <span>▦ Group</span>
                  </button>
                  <button
                    className={`bp-view-btn ${viewMode === "table" ? "active" : ""}`}
                    onClick={() => setViewMode("table")}
                    title="List layout"
                  >
                    <span>☰ List</span>
                  </button>
                </div>

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

                <select
                  className="bp-seats-select"
                  value={seatsFilter}
                  onChange={(e) => setSeatsFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                >
                  <option value="all">All Seats</option>
                  <option value={2}>2-Max (Heads-Up)</option>
                  <option value={4}>4-Max</option>
                  <option value={6}>6-Max</option>
                  <option value={9}>9-Max (Full Ring)</option>
                </select>
              </div>

              {/* Right: Search and Quick Join by Code */}
              <div className="bp-controls-right">
                <div className="bp-search-box">
                  <span className="bp-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search table or blinds..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="bp-search-clear" onClick={() => setSearchQuery("")}>×</button>
                  )}
                </div>

                <form className="bp-join-code-form" onSubmit={handleJoinByCode}>
                  <input
                    type="text"
                    placeholder="Enter Invite Code"
                    maxLength={10}
                    value={inviteCodeInput}
                    onChange={(e) => {
                      setInviteCodeInput(e.target.value.toUpperCase());
                      setJoinError("");
                    }}
                  />
                  <button type="submit" className="bp-join-btn" disabled={joinBusy}>
                    {joinBusy ? "..." : "Join"}
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

          {/* Table Grid / List Content */}
          <main className="bp-main-container">
            {loadingTables ? (
              <div className="bp-loading-box">Loading Live Poker Tables...</div>
            ) : filteredTables.length === 0 ? (
              <div className="bp-empty-box">
                <p>No poker tables found matching your filters.</p>
                <button className="secondary-btn" onClick={() => { setTierFilter("all"); setSeatsFilter("all"); setSearchQuery(""); }}>
                  Clear Filters
                </button>
              </div>
            ) : viewMode === "group" ? (
              /* ================= GROUP VIEW (Cards Grid) ================= */
              <div className="bp-group-grid">
                {filteredTables.map((tbl) => {
                  const isSeated = seatedTableIds.includes(tbl.id);
                  const theme = tbl.private
                    ? "purple"
                    : tbl.feeType === "HAND_FEE"
                    ? "blue"
                    : tbl.feeType === "TABLE_FEE"
                    ? "red"
                    : "green";

                  // Fee badge label per Spec 5.2
                  let feeBadge = `RAKE ${tbl.fee?.rakePercent ?? 5}%`;
                  if (tbl.private) {
                    feeBadge = `PRIVATE ${tbl.fee?.rakePercent ?? 5}%`;
                  } else if (tbl.feeType === "HAND_FEE") {
                    feeBadge = `${tbl.fee?.handFee ?? 2} / DORË`;
                  } else if (tbl.feeType === "TABLE_FEE") {
                    feeBadge = `${tbl.fee?.tableFee ?? 20} / ${tbl.fee?.tableFeeMinutes ?? 30}MIN`;
                  }

                  return (
                    <div
                      key={tbl.id}
                      className={`bp-card theme-${theme} ${tbl.private ? "is-private" : ""} ${tbl.status === "paused" ? "is-paused" : ""}`}
                      onClick={() => handleOpenTable(tbl.id)}
                    >
                      <div className={`bp-card-top-glow glow-bar-${theme}`} />

                      <div className="bp-card-header">
                        <div className="bp-card-title-group">
                          <div className="bp-card-title-row">
                            <h3 className="bp-card-title">{tbl.name}</h3>
                            {tbl.private && <span className="bp-private-lock-badge" title="Private Table">🔒</span>}
                            {isSeated && <span className="bp-seated-badge" title="You are seated at this table">SEATED</span>}
                          </div>
                          <div className="bp-card-pill-tags">
                            <span className="bp-tier-pill">{getTableTier(tbl.bb).toUpperCase()}</span>
                            <span className="bp-format-tag">{tbl.maxSeats}-MAX NLH</span>
                          </div>
                        </div>

                        <div className="bp-card-header-right">
                          {tbl.status === "paused" && (
                            <span className="bp-paused-pill">⏸ PAUSED</span>
                          )}
                          <span className={`bp-card-badge badge-${theme}`}>{feeBadge}</span>
                        </div>
                      </div>

                      {/* Owner Invite Code Chip */}
                      {tbl.inviteCode && tbl.isOwner && (
                        <div className="bp-card-invite-strip" onClick={(e) => e.stopPropagation()}>
                          <span>INVITE CODE: <b>{tbl.inviteCode}</b></span>
                          <button
                            type="button"
                            className="copy-chip-btn"
                            onClick={() => {
                              navigator.clipboard?.writeText(tbl.inviteCode || "");
                              alert(`Code ${tbl.inviteCode} copied!`);
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      )}

                      {/* Stadium Felt Preview */}
                      <div className="bp-card-table-stage">
                        {tbl.status === "paused" && (
                          <div className="bp-paused-stage-overlay">
                            <span>⏸ TABLE PAUSED</span>
                          </div>
                        )}
                        <div className={`bp-stadium-wrap stadium-${theme}`}>
                          <div className="bp-stadium-rail">
                            <div className="bp-stadium-felt">
                              <div className="bp-felt-watermark">BET888</div>
                              <div className="bp-felt-center">
                                <div className="bp-felt-blinds-pill">
                                  <span className="bp-felt-coin">🪙</span>
                                  <span className="bp-felt-blinds-text">€{tbl.sb} / €{tbl.bb}</span>
                                </div>
                                <span className="bp-felt-sub-text">NO-LIMIT HOLD&apos;EM</span>
                              </div>

                              {/* Mini Seat Dots representing seatsTaken */}
                              {Array.from({ length: tbl.maxSeats }).map((_, sIdx) => {
                                const isOccupied = tbl.seatsTaken ? Boolean(tbl.seatsTaken[sIdx]) : sIdx < tbl.players;
                                const angle = (sIdx / tbl.maxSeats) * 2 * Math.PI - Math.PI / 2;
                                const x = 50 + 44 * Math.cos(angle);
                                const y = 50 + 40 * Math.sin(angle);
                                return (
                                  <div
                                    key={sIdx}
                                    className={`bp-seat-cushion ${isOccupied ? "is-occupied" : "is-empty"}`}
                                    style={{ left: `${x}%`, top: `${y}%` }}
                                  >
                                    {isOccupied ? "👤" : "+"}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Metadata */}
                      <div className="bp-card-meta">
                        <div className="bp-meta-item">
                          <span className="bp-meta-lbl">STAKES (SB/BB)</span>
                          <span className="bp-meta-val font-gold">€{tbl.sb} / €{tbl.bb}</span>
                        </div>
                        <div className="bp-meta-divider" />
                        <div className="bp-meta-item">
                          <span className="bp-meta-lbl">BUY-IN</span>
                          <span className="bp-meta-val">€{tbl.minBuyIn}+</span>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="bp-card-footer">
                        <div className="bp-card-players">
                          <span className={`bp-status-radar ${tbl.inProgress ? "playing" : "waiting"}`}>
                            <span className="bp-radar-dot" />
                          </span>
                          <span className="bp-players-count-text">
                            <b>{tbl.players}/{tbl.maxSeats}</b> Players
                            {tbl.inProgress ? " · In Hand" : " · Waiting"}
                          </span>
                        </div>

                        <div className="bp-card-action-group">
                          {tbl.isOwner && (
                            <button
                              type="button"
                              className="bp-owner-close-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCloseTable(tbl.id);
                              }}
                              title="Close Private Table"
                            >
                              Close
                            </button>
                          )}
                          <button
                            type="button"
                            className="bp-card-play-btn"
                            disabled={tbl.status === "paused"}
                          >
                            {isSeated ? "Return to Table" : "Play"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ================= TABLE LIST VIEW ================= */
              <div className="bp-table-view-wrap">
                <div className="bp-table-grid-list">
                  <table className="bp-list-table">
                    <thead>
                      <tr>
                        <th>Table Name</th>
                        <th>Type</th>
                        <th>Blinds</th>
                        <th>Min Buy-In</th>
                        <th>Players</th>
                        <th>Status</th>
                        <th>Fee Model</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTables.map((tbl) => (
                        <tr
                          key={tbl.id}
                          className={`${selectedTableId === tbl.id ? "selected" : ""} ${tbl.status === "paused" ? "paused-row" : ""}`}
                          onClick={() => setSelectedTableId(tbl.id)}
                        >
                          <td>
                            <div className="list-name-col">
                              <b>{tbl.name}</b>
                              {tbl.private && <span className="pvt-icon">🔒</span>}
                              {seatedTableIds.includes(tbl.id) && <span className="seat-badge">Seated</span>}
                            </div>
                          </td>
                          <td>{tbl.private ? "Private" : "Public"}</td>
                          <td className="font-gold">€{tbl.sb} / €{tbl.bb}</td>
                          <td>€{tbl.minBuyIn}+</td>
                          <td>{tbl.players} / {tbl.maxSeats}</td>
                          <td>
                            <span className={`status-pill ${tbl.inProgress ? "live" : "idle"}`}>
                              {tbl.status === "paused" ? "Paused" : tbl.inProgress ? "In Hand" : "Waiting"}
                            </span>
                          </td>
                          <td>{tbl.feeType}</td>
                          <td>
                            <button
                              className="list-play-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTable(tbl.id);
                              }}
                              disabled={tbl.status === "paused"}
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </>
      ) : (
        /* ================= MY POKER HISTORY SECTION ================= */
        <main className="poker-history-container">
          <div className="history-sub-nav">
            <button
              className={`sub-nav-btn ${historySubTab === "sessions" ? "active" : ""}`}
              onClick={() => { setHistorySubTab("sessions"); setHistoryPage(1); }}
            >
              My Sessions
            </button>
            <button
              className={`sub-nav-btn ${historySubTab === "hands" ? "active" : ""}`}
              onClick={() => { setHistorySubTab("hands"); setHistoryPage(1); }}
            >
              My Hands
            </button>
          </div>

          {historyLoading ? (
            <div className="bp-loading-box">Loading history records...</div>
          ) : historySubTab === "sessions" ? (
            /* Sessions History Table */
            <div className="history-table-wrap">
              {sessions.length === 0 ? (
                <div className="bp-empty-box">No poker sessions recorded yet.</div>
              ) : (
                <table className="history-data-table">
                  <thead>
                    <tr>
                      <th>Table</th>
                      <th>Blinds</th>
                      <th>Fee</th>
                      <th>Status</th>
                      <th>Buy-in</th>
                      <th>Cash-out / Stack</th>
                      <th>Net Profit</th>
                      <th>Joined</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id}>
                        <td><b>{s.tableName}</b></td>
                        <td className="font-gold">€{s.blinds}</td>
                        <td>{s.feeType}</td>
                        <td>
                          <span className={`history-status-badge status-${s.status}`}>
                            {s.status.toUpperCase()}
                          </span>
                        </td>
                        <td>€{s.buyIn.toLocaleString()}</td>
                        <td>
                          {s.cashOut != null
                            ? `€${s.cashOut.toLocaleString()}`
                            : s.onTable != null
                            ? `€${s.onTable.toLocaleString()} (on table)`
                            : "—"}
                        </td>
                        <td className={s.profit >= 0 ? "font-green font-bold" : "font-red font-bold"}>
                          {s.profit >= 0 ? `+€${s.profit.toFixed(2)}` : `-€${Math.abs(s.profit).toFixed(2)}`}
                        </td>
                        <td>{new Date(s.joinedAt).toLocaleString()}</td>
                        <td>{Math.round(s.durationSec / 60)} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            /* Hands History Table */
            <div className="history-table-wrap">
              {hands.length === 0 ? (
                <div className="bp-empty-box">No hands recorded yet.</div>
              ) : (
                <table className="history-data-table">
                  <thead>
                    <tr>
                      <th>Hand #</th>
                      <th>Table</th>
                      <th>Started</th>
                      <th>Contributed</th>
                      <th>Won</th>
                      <th>Net</th>
                      <th>Hand Rank</th>
                      <th>Result</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hands.map((h) => (
                      <tr key={h.id}>
                        <td><b>#{h.handNo}</b></td>
                        <td>{h.tableName}</td>
                        <td>{new Date(h.startedAt).toLocaleTimeString()}</td>
                        <td>€{h.contributed.toFixed(2)}</td>
                        <td>€{h.won.toFixed(2)}</td>
                        <td className={h.net >= 0 ? "font-green font-bold" : "font-red font-bold"}>
                          {h.net >= 0 ? `+€${h.net.toFixed(2)}` : `-€${Math.abs(h.net).toFixed(2)}`}
                        </td>
                        <td>{h.handRank || (h.folded ? "Folded" : "—")}</td>
                        <td>
                          <span className={`history-status-badge status-${h.status}`}>
                            {h.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <button
                            className="view-hand-btn"
                            onClick={() => handleViewHandDetail(h.id)}
                            title="Replay hand details"
                          >
                            <Eye size={16} /> Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </main>
      )}

      {/* ================= CREATE PRIVATE TABLE MODAL ================= */}
      {showCreateModal && (
        <div className="bp-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="bp-unlock-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="bp-unlock-header">
              <div className="bp-unlock-icon">♠</div>
              <div className="bp-unlock-title-box">
                <h3 className="bp-unlock-title">Create Table for Friends</h3>
                <span className="bp-unlock-sub">Tavolinë për shokë · Private Hold&apos;em with Invite Code</span>
              </div>
              <button type="button" className="bp-unlock-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreatePrivateTable} className="bp-unlock-form">
              <div className="bp-unlock-input-wrap">
                <label className="bp-unlock-label">Table Name</label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  className="bp-unlock-input"
                  placeholder="e.g. Friday friends"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="bp-unlock-input-wrap">
                  <label className="bp-unlock-label">Blinds (SB/BB)</label>
                  <select
                    className="bp-unlock-input"
                    value={`${createForm.sb}/${createForm.bb}`}
                    onChange={(e) => {
                      const [sb, bb] = e.target.value.split("/").map(Number);
                      setCreateForm({ ...createForm, sb, bb });
                    }}
                  >
                    <option value="1/2">1 / 2</option>
                    <option value="5/10">5 / 10</option>
                    <option value="10/20">10 / 20</option>
                    <option value="25/50">25 / 50</option>
                    <option value="50/100">50 / 100</option>
                  </select>
                </div>

                <div className="bp-unlock-input-wrap">
                  <label className="bp-unlock-label">Seats</label>
                  <select
                    className="bp-unlock-input"
                    value={createForm.maxSeats}
                    onChange={(e) => setCreateForm({ ...createForm, maxSeats: Number(e.target.value) })}
                  >
                    <option value="2">2 Seats (Heads-Up)</option>
                    <option value="4">4 Seats</option>
                    <option value="6">6 Seats</option>
                    <option value="9">9 Seats (Full Ring)</option>
                  </select>
                </div>
              </div>

              <div className="private-table-derived-info">
                <div>• Buy-in range: <b>€{createForm.bb * 20}</b> to <b>€{createForm.bb * 200}</b> (20 BB to 200 BB)</div>
                <div>• Rake: <b>5%</b> (Cap: <b>€{createForm.bb * 10}</b>)</div>
              </div>

              {createError && (
                <div className="bp-unlock-error">
                  <span>⚠️ {createError}</span>
                </div>
              )}

              <div className="bp-unlock-actions">
                <button type="button" className="bp-unlock-cancel-btn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="bp-unlock-submit-btn">
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CREATED TABLE SUCCESS MODAL ================= */}
      {createdTableData && (
        <div className="bp-modal-overlay" onClick={() => setCreatedTableData(null)}>
          <div className="bp-unlock-modal" style={{ maxWidth: 460, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "28px 24px 20px" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
              <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>
                Private Table Created!
              </h3>
              <p style={{ color: "#a5a2bb", fontSize: 13, margin: "0 0 20px" }}>
                Share this invite code with your friends to join your private table:
              </p>

              <div className="created-invite-box">
                <div className="code-label">INVITE CODE</div>
                <div className="code-value">{createdTableData.inviteCode}</div>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard?.writeText(createdTableData.inviteCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                >
                  {copiedCode ? <Check size={18} /> : <Copy size={18} />}
                  <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                </button>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="bp-unlock-cancel-btn"
                  onClick={() => setCreatedTableData(null)}
                >
                  Stay in Lobby
                </button>
                <button
                  type="button"
                  className="bp-unlock-submit-btn"
                  onClick={() => {
                    const tid = createdTableData.id;
                    const code = createdTableData.inviteCode;
                    setCreatedTableData(null);
                    router.push(`/holdem/tables?tableId=${encodeURIComponent(tid)}&code=${encodeURIComponent(code)}`);
                  }}
                >
                  Enter Table Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= HAND REPLAY / DETAILS MODAL ================= */}
      {selectedHandDetail && (
        <div className="bp-modal-overlay" onClick={() => setSelectedHandDetail(null)}>
          <div className="bp-unlock-modal hand-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bp-unlock-header">
              <div className="bp-unlock-icon">🃏</div>
              <div className="bp-unlock-title-box">
                <h3 className="bp-unlock-title">Hand #{selectedHandDetail.handNo} Details</h3>
                <span className="bp-unlock-sub">
                  {selectedHandDetail.tableName} · Total Pot: €{selectedHandDetail.totalPot.toFixed(2)} · Rake: €{selectedHandDetail.rake.toFixed(2)}
                </span>
              </div>
              <button type="button" className="bp-unlock-close" onClick={() => setSelectedHandDetail(null)}>×</button>
            </div>

            <div className="hand-detail-body">
              {/* Board Cards */}
              <div className="hand-detail-board-section">
                <h4>Community Board:</h4>
                <div className="hand-detail-cards-row">
                  {selectedHandDetail.board && selectedHandDetail.board.length > 0 ? (
                    selectedHandDetail.board.map((cardStr, idx) => {
                      const r = cardStr[0];
                      const s = cardStr[1];
                      const meta = suitMeta(s);
                      return (
                        <div key={idx} className={`poker-seat-card rank-${r} suit-${s} ${meta.colorClass}`}>
                          <span>{r}{meta.symbol}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span>No board dealt (preflop fold)</span>
                  )}
                </div>
              </div>

              {/* Players at Table */}
              <div className="hand-detail-players-section">
                <h4>Players &amp; Hole Cards:</h4>
                <div className="hand-players-list">
                  {selectedHandDetail.players?.map((p) => (
                    <div key={p.seatNo} className={`hand-player-card ${p.isMe ? "is-me" : ""}`}>
                      <div className="player-top">
                        <span className="player-name">{p.username} {p.isMe ? "(You)" : ""}</span>
                        <span className={p.won > 0 ? "font-green font-bold" : ""}>
                          {p.won > 0 ? `+€${p.won.toFixed(2)}` : p.folded ? "Folded" : ""}
                        </span>
                      </div>
                      <div className="player-cards-row">
                        {p.cards && p.cards.length > 0 ? (
                          p.cards.map((cStr, idx) => {
                            const r = cStr[0];
                            const s = cStr[1];
                            const meta = suitMeta(s);
                            return (
                              <span key={idx} className={`mini-card ${meta.colorClass}`}>
                                {r}{meta.symbol}
                              </span>
                            );
                          })
                        ) : (
                          <span className="mucked-text">{p.folded ? "Folded" : "Mucked"}</span>
                        )}
                      </div>
                      {p.handRank && <div className="hand-rank-lbl">{p.handRank}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Street Action History */}
              <div className="hand-detail-actions-section">
                <h4>Street Actions:</h4>
                <div className="hand-actions-timeline">
                  {selectedHandDetail.actions?.map((act, idx) => (
                    <div key={idx} className="timeline-action-row">
                      <span className="street-badge">{act.street.toUpperCase()}</span>
                      <span className="act-user">{act.username}</span>
                      <span className="act-type">{act.action}</span>
                      {act.to > 0 && <span className="act-to">to €{act.to}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bp-unlock-actions">
              <button type="button" className="bp-unlock-submit-btn" onClick={() => setSelectedHandDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= AUTH MODAL ================= */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
