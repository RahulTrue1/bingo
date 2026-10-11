"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Icon } from "../components/shared/Icon";
import { Logo } from "../components/shared/Logo";
import {
  BasepokerTableItem,
  StakeTier,
  getStoredPokerTables,
  createAndStorePokerTable,
  togglePokerTableStatus,
  deletePokerTable,
  resetPokerTables,
  PokerCommissionSettings,
  getStoredCommissionSettings,
  saveStoredCommissionSettings,
  DEFAULT_COMMISSION_SETTINGS,
  BackofficePokerPlayer,
  getStoredPokerPlayers,
  togglePlayerPokerAccess,
} from "../poker/poker-tables-store";

export const pokerAdminNav = [
  ["dashboard", "Overview & KPIs", "⌂"],
  ["live", "Live Table Control", "●"],
  ["tables", "Tables & Fleet", "▦"],
  ["players", "Player 360 & Access", "♙"],
  ["rules", "Commission Rules", "%"],
];

export function pokerAdminSubtitle(module: string) {
  const subtitles: Record<string, string> = {
    dashboard: "Real-time poker liquidity, commission revenue breakdown across 3 models, and active tables.",
    live: "Monitor active ring tables and intervene in real time with automated street runouts and clock control.",
    tables: "Live table fleet management, real-time table creation, pause/resume, and table deletion.",
    players: "Player directory, VIP tiering, and dynamic 'Poker Online' access permission controls.",
    rules: "Configure operator rake percentage, caps, fixed hand fees, and timed table fee rules.",
  };
  return subtitles[module] ?? "Manage and configure poker operations across the platform.";
}

export default function PokerBackofficeApp() {
  const [mounted, setMounted] = useState(false);
  const [module, setModule] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tables, setTables] = useState<BasepokerTableItem[]>([]);
  const [players, setPlayers] = useState<BackofficePokerPlayer[]>([]);
  const [commissionRules, setCommissionRules] = useState<PokerCommissionSettings>(DEFAULT_COMMISSION_SETTINGS);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  // Table Search & Filters
  const [tableSearch, setTableSearch] = useState("");
  const [stakeFilter, setStakeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Player Search & Filters
  const [playerSearch, setPlayerSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState<string>("all");

  // Create Table Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState("Gjakova 5/10");
  const [formSb, setFormSb] = useState(5);
  const [formBb, setFormBb] = useState(10);
  const [formMinBuy, setFormMinBuy] = useState(200);
  const [formMaxBuy, setFormMaxBuy] = useState(2000);
  const [formMaxSeats, setFormMaxSeats] = useState(6);
  const [formFeeType, setFormFeeType] = useState<"RAKE" | "HAND_FEE" | "TABLE_FEE">("RAKE");
  const [formIsPrivate, setFormIsPrivate] = useState(false);
  const [formInviteCode, setFormInviteCode] = useState("");

  // Commission Rules Form State
  const [rulesForm, setRulesForm] = useState<PokerCommissionSettings>(DEFAULT_COMMISSION_SETTINGS);

  // Live Game Control State (Matching Bingo LiveControl)
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [liveStreet, setLiveStreet] = useState<"preflop" | "flop" | "turn" | "river" | "showdown">("flop");
  const [livePot, setLivePot] = useState<number>(145);
  const [actionSpeed, setActionSpeed] = useState("Normal · 15 sec");
  const [liveCommunityCards, setLiveCommunityCards] = useState<string[]>(["A♠", "K♥", "Q♦"]);

  // Toast Helper
  const showToast = useCallback((message: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  // Sync Data on Mount & Events
  const refreshData = useCallback(() => {
    const loadedTables = getStoredPokerTables();
    const loadedPlayers = getStoredPokerPlayers();
    const loadedRules = getStoredCommissionSettings();
    setTables(loadedTables);
    setPlayers(loadedPlayers);
    setCommissionRules(loadedRules);
    setRulesForm(loadedRules);
    if (loadedTables.length > 0 && !selectedTableId) {
      setSelectedTableId(loadedTables[0].id);
    }
  }, [selectedTableId]);

  useEffect(() => {
    setMounted(true);
    refreshData();

    const handleStorageUpdate = () => {
      refreshData();
    };

    window.addEventListener("basepoker_tables_updated", handleStorageUpdate);
    window.addEventListener("basepoker_players_updated", handleStorageUpdate);
    window.addEventListener("basepoker_commission_updated", handleStorageUpdate);
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener("basepoker_tables_updated", handleStorageUpdate);
      window.removeEventListener("basepoker_players_updated", handleStorageUpdate);
      window.removeEventListener("basepoker_commission_updated", handleStorageUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, [refreshData]);

  // Derived KPI calculations
  const kpis = useMemo(() => {
    const activeTables = tables.filter((t) => t.status === "playing");
    const totalSeated = tables.reduce((acc, t) => acc + (t.seatsOccupied || 0), 0);
    const turnover = tables.reduce((acc, t) => acc + (t.avgPot || t.bb * 8) * (t.handsPerHour || 50), 0);

    // Revenue Model 1: Rake 5%
    const rakeTables = tables.filter((t) => t.feeType === "RAKE");
    const rakeRevenue = rakeTables.reduce(
      (acc, t) => acc + (t.avgPot || t.bb * 8) * (t.handsPerHour || 50) * (commissionRules.rakePercent / 100),
      0
    );

    // Revenue Model 2: Hand Fee
    const handTables = tables.filter((t) => t.feeType === "HAND_FEE");
    const handFeeRevenue = handTables.reduce(
      (acc, t) => acc + (t.handsPerHour || 50) * commissionRules.handFeeEur * 4,
      0
    );

    // Revenue Model 3: Table Fee
    const tableFeeTables = tables.filter((t) => t.feeType === "TABLE_FEE");
    const tableFeeRevenue = tableFeeTables.reduce(
      (acc, t) => acc + (commissionRules.tableFeeEur * 2) * (t.seatsOccupied || 1),
      0
    );

    const privateTables = tables.filter((t) => t.isPrivate);
    const totalCommission = rakeRevenue + handFeeRevenue + tableFeeRevenue;

    return {
      activeTablesCount: activeTables.length,
      totalTablesCount: tables.length,
      totalSeated,
      turnover,
      totalCommission,
      rakeTablesCount: rakeTables.length,
      rakeRevenue,
      handTablesCount: handTables.length,
      handFeeRevenue,
      tableFeeTablesCount: tableFeeTables.length,
      tableFeeRevenue,
      privateTablesCount: privateTables.length,
    };
  }, [tables, commissionRules]);

  // Selected Table in Live Game Control
  const selectedTable = useMemo(() => {
    return tables.find((t) => t.id === selectedTableId) || tables[0] || null;
  }, [tables, selectedTableId]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      if (stakeFilter !== "all" && t.tier !== stakeFilter) return false;
      if (statusFilter === "active" && t.status !== "playing") return false;
      if (statusFilter === "paused" && t.status !== "paused") return false;
      if (statusFilter === "private" && !t.isPrivate) return false;
      if (tableSearch) {
        const q = tableSearch.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.inviteCode && t.inviteCode.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [tables, stakeFilter, statusFilter, tableSearch]);

  // Filtered Players
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (accessFilter === "enabled" && !p.pokerAccess) return false;
      if (accessFilter === "restricted" && p.pokerAccess) return false;
      if (playerSearch) {
        const q = playerSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.username.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [players, accessFilter, playerSearch]);

  // Table Control Handlers
  const handleToggleTable = (id: string, name: string) => {
    const updated = togglePokerTableStatus(id);
    setTables(updated);
    const tbl = updated.find((t) => t.id === id);
    const isNowPlaying = tbl?.status === "playing";
    showToast(
      `Table "${name}" ${isNowPlaying ? "resumed (Active in Lobby)" : "paused (Suspended from Lobby)"}`,
      isNowPlaying ? "success" : "warning"
    );
  };

  const handleDeleteTable = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete table "${name}"? It will be removed from all lobbies.`)) {
      const updated = deletePokerTable(id);
      setTables(updated);
      showToast(`Table "${name}" successfully deleted`, "info");
    }
  };

  const handleResetFleet = () => {
    if (confirm("Reset table fleet to default BET888 5-tier specification tables?")) {
      const updated = resetPokerTables();
      setTables(updated);
      showToast("Table fleet reset to default BET888 specification", "success");
    }
  };

  const handleCreateTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Please provide a table name");
      return;
    }

    let feeLabel = "RAKE 5%";
    if (formFeeType === "HAND_FEE") feeLabel = `€${commissionRules.handFeeEur.toFixed(2)} / HAND`;
    if (formFeeType === "TABLE_FEE") feeLabel = `€${commissionRules.tableFeeEur.toFixed(2)} / 30MIN`;

    const newTable = createAndStorePokerTable({
      name: formName.trim(),
      sb: Number(formSb),
      bb: Number(formBb),
      minBuyIn: Number(formMinBuy),
      maxBuyIn: Number(formMaxBuy),
      maxSeats: Number(formMaxSeats),
      feeType: formFeeType,
      feeLabel,
      isPrivate: formIsPrivate,
      inviteCode: formInviteCode.trim() || undefined,
    });

    const refreshed = getStoredPokerTables();
    setTables(refreshed);
    setShowCreateModal(false);
    showToast(`Table "${newTable.name}" created and deployed to live cashgame lobby!`, "success");
  };

  // Player Control Handler
  const handleTogglePlayer = (id: string, name: string) => {
    const updated = togglePlayerPokerAccess(id);
    setPlayers(updated);
    const p = updated.find((item) => item.id === id);
    const statusText = p?.pokerAccess ? "ACTIVE (Can Join Tables)" : "RESTRICTED (Blocked from Cash Games)";
    showToast(`Player "${name}" Poker Online access updated: ${statusText}`, p?.pokerAccess ? "success" : "warning");
  };

  // Commission Rules Handler
  const handleSaveCommissionRules = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredCommissionSettings(rulesForm);
    setCommissionRules(rulesForm);
    showToast(`Commission rules saved: ${rulesForm.rakePercent}% Rake (Cap €${rulesForm.rakeCapEur}), Hand fee €${rulesForm.handFeeEur}`, "success");
  };

  // Live Game Control Actions (Matching Bingo LiveControl)
  const handleDealNextStreet = () => {
    if (liveStreet === "preflop") {
      setLiveStreet("flop");
      setLiveCommunityCards(["A♠", "K♥", "Q♦"]);
      setLivePot((prev) => prev + 60);
      showToast("Flop dealt: A♠ K♥ Q♦");
    } else if (liveStreet === "flop") {
      setLiveStreet("turn");
      setLiveCommunityCards(["A♠", "K♥", "Q♦", "J♣"]);
      setLivePot((prev) => prev + 120);
      showToast("Turn dealt: J♣");
    } else if (liveStreet === "turn") {
      setLiveStreet("river");
      setLiveCommunityCards(["A♠", "K♥", "Q♦", "J♣", "10♠"]);
      setLivePot((prev) => prev + 240);
      showToast("River dealt: 10♠ (Board Royal Flush possible!)");
    } else if (liveStreet === "river") {
      setLiveStreet("showdown");
      showToast("Showdown reached! Hand awarded to Player 1 (Royal Flush).");
    } else {
      setLiveStreet("preflop");
      setLiveCommunityCards([]);
      setLivePot(selectedTable ? selectedTable.bb * 3 : 30);
      showToast("New hand dealt pre-flop.");
    }
  };

  const handleResetHand = () => {
    setLiveStreet("preflop");
    setLiveCommunityCards([]);
    setLivePot(selectedTable ? selectedTable.bb * 3 : 30);
    showToast(`Hand restarted pre-flop for ${selectedTable?.name || "Table"}.`);
  };

  if (!mounted) {
    return (
      <div className="admin-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#6b59df", fontWeight: 700 }}>
        ♠ Loading Trueigtech Poker Operations Console...
      </div>
    );
  }

  const currentLabel = pokerAdminNav.find(([key]) => key === module)?.[1] ?? "Overview";

  return (
    <div className="admin-shell">
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: toast.type === "success" ? "#15a982" : toast.type === "warning" ? "#c08c1c" : "#6e59e8",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>●</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="admin-app">
        {/* ================= BINGO MATCHING SIDEBAR ================= */}
        <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="admin-logo">
            <Logo dark />
            <button onClick={() => setSidebarOpen(false)}>×</button>
          </div>

          <nav>
            {pokerAdminNav.map(([key, label, glyph]) => (
              <button
                key={key}
                className={module === key ? "active" : ""}
                onClick={() => {
                  setModule(key);
                  setSidebarOpen(false);
                }}
              >
                <Icon>{glyph}</Icon>
                <span>{label}</span>
                {key === "tables" && <i className="nav-badge">{tables.length}</i>}
                {key === "live" && (
                  <i className="nav-badge">{tables.filter((t) => t.status === "playing").length}</i>
                )}
                {key === "players" && <i className="nav-badge muted">{players.length}</i>}
              </button>
            ))}
          </nav>

          <div style={{ padding: "0 14px 14px" }}>
            <button
              className="outline-button"
              style={{ width: "100%", fontSize: 11, background: "rgba(255,255,255,0.06)", color: "#a9a8bd", borderColor: "rgba(255,255,255,0.1)" }}
              onClick={handleResetFleet}
              title="Reset tables to default BET888 5-tier specification"
            >
              ↺ Reset Default Fleet
            </button>
          </div>

          <div className="sidebar-user">
            <span>OP</span>
            <div>
              <b>Poker Operator</b>
              <small>Super Admin</small>
            </div>
            <button>•••</button>
          </div>
        </aside>

        {/* ================= BINGO MATCHING MAIN SECTION ================= */}
        <section className="admin-main">
          {/* Main Top Header */}
          <header className="admin-header">
            <div>
              <button className="mobile-menu" onClick={() => setSidebarOpen(true)}>☰</button>
              <span>Trueigtech Operations /</span>
              <b>{currentLabel}</b>
            </div>

            <div className="admin-header-actions">
              <span className="environment">
                <i /> Live Engine Active
              </span>
              <Link href="/cashgame" className="admin-primary" style={{ textDecoration: "none" }}>
                ♠ View Player Lobby
              </Link>
              <Link href="/backoffice" className="outline-button" style={{ textDecoration: "none" }}>
                ▦ Bingo Admin
              </Link>
            </div>
          </header>

          {/* Content Area */}
          <div className="admin-content">
            <div className="admin-page-title">
              <div>
                <span className="section-kicker">TRUEIGTECH POKER OPERATIONS</span>
                <h1>{currentLabel}</h1>
                <p>{pokerAdminSubtitle(module)}</p>
              </div>

              <div className="admin-title-actions">
                <button className="outline-button" onClick={() => showToast(`${currentLabel} data exported to CSV.`)}>
                  ↓ Export
                </button>
                {module === "tables" && (
                  <button className="admin-primary" onClick={() => setShowCreateModal(true)}>
                    + Create Table
                  </button>
                )}
                <button className="outline-button" onClick={refreshData} title="Sync latest state">
                  ↻ Sync
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* MODULE 1: DASHBOARD / OVERVIEW & KPIS (FIGURE 10.2)                       */}
            {/* ========================================================================= */}
            {module === "dashboard" && (
              <div>
                {/* 5 Core Metric Cards (Bingo Admin Metric Grid) */}
                <div className="metric-grid">
                  <div className="metric-card">
                    <button type="button" className="metric-card-main" onClick={() => setModule("tables")}>
                      <span className="metric-icon metric-1">▦</span>
                      <div>
                        <small>ACTIVE TABLES</small>
                        <strong>{kpis.activeTablesCount} / {kpis.totalTablesCount}</strong>
                        <span>5 stake tiers <i>live</i></span>
                      </div>
                    </button>
                  </div>

                  <div className="metric-card">
                    <button type="button" className="metric-card-main" onClick={() => setModule("live")}>
                      <span className="metric-icon metric-2">●</span>
                      <div>
                        <small>SEATED PLAYERS</small>
                        <strong>{kpis.totalSeated}</strong>
                        <span>Live ring seats</span>
                      </div>
                    </button>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-main">
                      <span className="metric-icon metric-3">⇄</span>
                      <div>
                        <small>24H POT TURNOVER</small>
                        <strong>€{kpis.turnover.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                        <span>Cash action volume</span>
                      </div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <button type="button" className="metric-card-main" onClick={() => setModule("rules")}>
                      <span className="metric-icon metric-4">%</span>
                      <div>
                        <small>NET COMMISSION</small>
                        <strong>€{kpis.totalCommission.toFixed(2)}</strong>
                        <span>Across 3 models</span>
                      </div>
                    </button>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card-main">
                      <span className="metric-icon metric-5">♠</span>
                      <div>
                        <small>PRIVATE TABLES</small>
                        <strong>{kpis.privateTablesCount}</strong>
                        <span>6-digit PIN clubs</span>
                      </div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <button type="button" className="metric-card-main" onClick={() => setModule("players")}>
                      <span className="metric-icon metric-1">♙</span>
                      <div>
                        <small>POKER PLAYERS</small>
                        <strong>{players.filter((p) => p.pokerAccess).length} / {players.length}</strong>
                        <span>Online permitted</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Figure 10.2: 4 Revenue Models Breakdown & Live Table Quick Glance */}
                <div className="dashboard-grid">
                  {/* Left: 4 Commission Models Breakdown */}
                  <div className="admin-card revenue-chart">
                    <div className="card-title">
                      <div>
                        <h2>Figure 10.2 — Revenue & 3 Commission Models Breakdown</h2>
                        <p>Dynamic engine telemetry calculated from active ring tables</p>
                      </div>
                      <button className="table-link" onClick={() => setModule("rules")}>
                        Configure Rules &rarr;
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
                      {/* Model 1 */}
                      <div style={{ background: "#f8f9fc", border: "1px solid #e5e7ed", borderRadius: 10, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#15a982", background: "#eaf8f4", padding: "2px 6px", borderRadius: 4 }}>
                            MODEL 1: POT RAKE
                          </span>
                          <b style={{ color: "#15a982", fontSize: 11 }}>ACTIVE</b>
                        </div>
                        <strong style={{ fontSize: 13, color: "#1e202c", display: "block" }}>Standard Pot Rake (5%)</strong>
                        <p style={{ fontSize: 11, color: "#77758b", margin: "4px 0 10px", lineHeight: 1.4 }}>
                          5% deducted from pots reaching the flop, capped at €{commissionRules.rakeCapEur.toFixed(2)}. "No Flop No Drop" policy.
                        </p>
                        <div style={{ borderTop: "1px solid #eef0f3", paddingTop: 8, fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                          <span>Commission Collected:</span>
                          <b style={{ color: "#6e59e8" }}>€{kpis.rakeRevenue.toFixed(2)}</b>
                        </div>
                      </div>

                      {/* Model 2 */}
                      <div style={{ background: "#f8f9fc", border: "1px solid #e5e7ed", borderRadius: 10, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#428de3", background: "#eaf3ff", padding: "2px 6px", borderRadius: 4 }}>
                            MODEL 2: FIXED HAND FEE
                          </span>
                          <b style={{ color: "#428de3", fontSize: 11 }}>ACTIVE</b>
                        </div>
                        <strong style={{ fontSize: 13, color: "#1e202c", display: "block" }}>€{commissionRules.handFeeEur.toFixed(2)} / Hand Fee</strong>
                        <p style={{ fontSize: 11, color: "#77758b", margin: "4px 0 10px", lineHeight: 1.4 }}>
                          Flat fee charged per dealt hand into dealer tray regardless of pot volume (e.g. Mitrovica 10/20).
                        </p>
                        <div style={{ borderTop: "1px solid #eef0f3", paddingTop: 8, fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                          <span>Commission Collected:</span>
                          <b style={{ color: "#6e59e8" }}>€{kpis.handFeeRevenue.toFixed(2)}</b>
                        </div>
                      </div>

                      {/* Model 3 */}
                      <div style={{ background: "#f8f9fc", border: "1px solid #e5e7ed", borderRadius: 10, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#e46559", background: "#fff0ef", padding: "2px 6px", borderRadius: 4 }}>
                            MODEL 3: TIMED TABLE FEE
                          </span>
                          <b style={{ color: "#e46559", fontSize: 11 }}>ACTIVE</b>
                        </div>
                        <strong style={{ fontSize: 13, color: "#1e202c", display: "block" }}>€{commissionRules.tableFeeEur.toFixed(2)} / 30 Min Rental</strong>
                        <p style={{ fontSize: 11, color: "#77758b", margin: "4px 0 10px", lineHeight: 1.4 }}>
                          Periodic seat rental fee deducted from active chip stacks every 30 minutes (e.g. Peja VIP 25/50).
                        </p>
                        <div style={{ borderTop: "1px solid #eef0f3", paddingTop: 8, fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                          <span>Commission Collected:</span>
                          <b style={{ color: "#6e59e8" }}>€{kpis.tableFeeRevenue.toFixed(2)}</b>
                        </div>
                      </div>

                      {/* Private Tables */}
                      <div style={{ background: "#f8f9fc", border: "1px solid #e5e7ed", borderRadius: 10, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#a05bcd", background: "#f7edff", padding: "2px 6px", borderRadius: 4 }}>
                            PRIVATE CLUBS
                          </span>
                          <b style={{ color: "#a05bcd", fontSize: 11 }}>ACTIVE</b>
                        </div>
                        <strong style={{ fontSize: 13, color: "#1e202c", display: "block" }}>Private Friends Club Tables</strong>
                        <p style={{ fontSize: 11, color: "#77758b", margin: "4px 0 10px", lineHeight: 1.4 }}>
                          Private tables with 6-character PIN code. Friends-only access, 5% operator rake share.
                        </p>
                        <div style={{ borderTop: "1px solid #eef0f3", paddingTop: 8, fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                          <span>Active Private Clubs:</span>
                          <b style={{ color: "#6e59e8" }}>{kpis.privateTablesCount} Tables</b>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Live Room Quick Glance */}
                  <div className="admin-card live-ops">
                    <div className="card-title">
                      <div>
                        <h2>Live Table Quick Glance</h2>
                        <p>Real-time status across top tables</p>
                      </div>
                      <button className="table-link" onClick={() => setModule("tables")}>
                        All tables &rarr;
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {tables.slice(0, 5).map((t) => (
                        <div
                          key={t.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 12px",
                            background: "#f9fafb",
                            border: "1px solid #edf0f5",
                            borderRadius: 8,
                          }}
                        >
                          <div>
                            <b style={{ fontSize: 12, color: "#1e202c" }}>{t.name}</b>
                            <div style={{ fontSize: 10, color: "#838697" }}>
                              €{t.sb}/€{t.bb} &bull; {t.seatsOccupied}/{t.maxSeats} seated &bull; {t.feeLabel}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                              className="outline-button"
                              style={{ padding: "4px 8px", fontSize: 10 }}
                              onClick={() => handleToggleTable(t.id, t.name)}
                            >
                              {t.status === "playing" ? "Pause" : "Resume"}
                            </button>
                            <Link
                              href={`/holdem/tables?code=${t.id}`}
                              className="admin-primary"
                              style={{ padding: "4px 8px", fontSize: 10, textDecoration: "none" }}
                            >
                              Felt &rarr;
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MODULE 2: LIVE TABLE CONTROL (MATCHING BINGO LIVECONTROL)                 */}
            {/* ========================================================================= */}
            {module === "live" && selectedTable && (
              <div className="control-grid">
                {/* Left Section: Live Control Cockpit */}
                <section className="admin-card control-stage">
                  <div className="live-control-overview">
                    <div className="card-title">
                      <div>
                        <h2>Live Table Control Stage</h2>
                        <p>{tables.filter((t) => t.status === "playing").length} tables currently live in lobby</p>
                      </div>
                    </div>

                    {/* Table Selection Pills (Bingo live-game-list) */}
                    <div className="live-game-list">
                      {tables.map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          className={`live-game-item ${selectedTableId === t.id ? "active" : ""}`}
                          onClick={() => {
                            setSelectedTableId(t.id);
                            showToast(`${t.name} selected in live control.`);
                          }}
                        >
                          <span className="live-game-item-name">{t.name}</span>
                          <small>€{t.sb}/€{t.bb} &bull; {t.seatsOccupied}/{t.maxSeats} Seated</small>
                          <strong>{t.status === "playing" ? "LIVE" : "PAUSED"}</strong>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stage Head */}
                  <div className="control-stage-head">
                    <div>
                      <span className={`status ${selectedTable.status === "playing" ? "status-live" : "status-starting-soon"}`}>
                        <i />{selectedTable.status === "playing" ? "live" : "paused"}
                      </span>
                      <h2>{selectedTable.name} · {selectedTable.id}</h2>
                      <p>
                        Controller: Auto Live Dealer &bull; Stage: {liveStreet.toUpperCase()} &bull; {selectedTable.feeLabel} &bull; {selectedTable.isPrivate ? `Private PIN: ${selectedTable.inviteCode}` : "Public Table"}
                      </p>
                    </div>

                    <div>
                      <select
                        value={actionSpeed}
                        onChange={(e) => {
                          setActionSpeed(e.target.value);
                          showToast(`Action clock speed changed to ${e.target.value}.`);
                        }}
                      >
                        <option>Fast · 10 sec</option>
                        <option>Normal · 15 sec</option>
                        <option>Slow · 25 sec</option>
                        <option>Blitz · 5 sec</option>
                      </select>
                      <button
                        className="danger-button"
                        onClick={() => {
                          handleToggleTable(selectedTable.id, selectedTable.name);
                        }}
                      >
                        {selectedTable.status === "playing" ? "Stop table" : "Start table"}
                      </button>
                    </div>
                  </div>

                  {/* Big Live Table Cockpit (operator-caller) */}
                  <div className="operator-caller">
                    <div className={selectedTable.status !== "playing" ? "paused" : ""}>
                      <small>CURRENT POT</small>
                      <strong>€{livePot}</strong>
                      <span>{liveStreet.toUpperCase()}</span>
                    </div>

                    <div className="operator-stats">
                      <span>
                        <small>BLINDS</small>
                        <b>€{selectedTable.sb} / €{selectedTable.bb}</b>
                      </span>
                      <span>
                        <small>SEATED PLAYERS</small>
                        <b>{selectedTable.seatsOccupied} / {selectedTable.maxSeats}</b>
                      </span>
                      <span>
                        <small>COMMISSION MODEL</small>
                        <b>{selectedTable.feeType}</b>
                      </span>
                      <span>
                        <small>EST. OPERATOR RAKE</small>
                        <b>€{(livePot * 0.05).toFixed(2)}</b>
                      </span>
                      <span>
                        <small>AVG POT VOLUME</small>
                        <b>€{selectedTable.avgPot || selectedTable.bb * 8}</b>
                      </span>
                      <span>
                        <small>HANDS PER HOUR</small>
                        <b>{selectedTable.handsPerHour || 60} h/hr</b>
                      </span>
                    </div>
                  </div>

                  {/* Live Operator Control Actions (operator-controls) */}
                  <div className="operator-controls">
                    <button
                      className={selectedTable.status === "paused" ? "resume" : ""}
                      onClick={() => handleToggleTable(selectedTable.id, selectedTable.name)}
                    >
                      {selectedTable.status === "paused" ? "▶ Resume Table" : "Ⅱ Pause Table"}
                    </button>
                    <button onClick={handleDealNextStreet}>
                      Deal Next Street ({liveStreet === "preflop" ? "Flop" : liveStreet === "flop" ? "Turn" : liveStreet === "turn" ? "River" : "Showdown"}) →
                    </button>
                    <button onClick={handleResetHand}>
                      Re-deal New Hand
                    </button>
                    <Link
                      href={`/holdem/tables?code=${selectedTable.id}`}
                      className="full-outline"
                      style={{ display: "inline-flex", width: "auto", textDecoration: "none" }}
                    >
                      Live Stadium Felt &rarr;
                    </Link>
                  </div>

                  {/* Seated Players Roster */}
                  <div className="player-list">
                    <div className="card-title">
                      <div>
                        <h2>Seated Table Players ({selectedTable.seatsOccupied} / {selectedTable.maxSeats})</h2>
                        <p>Live active chip stacks and table positions</p>
                      </div>
                    </div>

                    {Array.from({ length: selectedTable.seatsOccupied }).map((_, idx) => (
                      <div key={idx}>
                        <span>{idx === 0 ? "P1" : `P${idx + 1}`}</span>
                        <b>
                          {idx === 0 ? "Player 1 (Hero)" : idx === 1 ? "Arben Shark" : idx === 2 ? "Dardan HighRoller" : `Table Seat ${idx + 1}`}
                          <small style={{ color: "#9497a6", fontSize: 10 }}>Seat #{idx + 1} &bull; In Hand</small>
                        </b>
                        <strong style={{ color: "#15a982", fontSize: 12 }}>
                          €{selectedTable.bb * (idx === 0 ? 100 : idx === 1 ? 180 : 75)} Chips
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Right Section: Live Community Board & Telemetry */}
                <aside className="admin-card claim-review">
                  <div className="card-title">
                    <div>
                      <h2>Live Board Community</h2>
                      <p>Runout and pot distribution</p>
                    </div>
                  </div>

                  <div style={{ background: "#0b1220", borderRadius: 8, padding: 14, marginTop: 12, border: "1px solid #1a253a" }}>
                    <small style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
                      BOARD CARDS ({liveStreet.toUpperCase()}):
                    </small>
                    <div style={{ display: "flex", gap: 6 }}>
                      {liveCommunityCards.length > 0 ? (
                        liveCommunityCards.map((c, i) => (
                          <div
                            key={i}
                            style={{
                              background: "#fff",
                              color: c.includes("♥") || c.includes("♦") ? "#e11d48" : "#0f172a",
                              fontWeight: 800,
                              fontSize: 14,
                              width: 38,
                              height: 52,
                              borderRadius: 5,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                            }}
                          >
                            {c}
                          </div>
                        ))
                      ) : (
                        <span style={{ color: "#64748b", fontSize: 11, fontStyle: "italic" }}>
                          Pre-flop &bull; Awaiting Flop
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="claim-card">
                    <div>
                      <span className="claim-player">♠</span>
                      <div>
                        <b>POT DYNAMICS</b>
                        <small>5% Rake cap enforced</small>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 11, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Current Pot:</span>
                        <b>€{livePot}</b>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Net Rake Deduction:</span>
                        <b style={{ color: "#15a982" }}>€{Math.min(livePot * 0.05, commissionRules.rakeCapEur).toFixed(2)}</b>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Main Pot for Winner:</span>
                        <b style={{ color: "#6e59e8" }}>€{(livePot - Math.min(livePot * 0.05, commissionRules.rakeCapEur)).toFixed(2)}</b>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <Link
                      href={`/holdem/tables?code=${selectedTable.id}`}
                      className="full-outline"
                      style={{ display: "block", textAlign: "center", textDecoration: "none" }}
                    >
                      Open Live Table on Felt &rarr;
                    </Link>
                  </div>
                </aside>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MODULE 3: TABLES & FLEET MANAGEMENT (FIGURE 10.3)                         */}
            {/* ========================================================================= */}
            {module === "tables" && (
              <div>
                {/* Filters toolbar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <input
                    type="text"
                    placeholder="Search table name, ID, or PIN..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #dcdfe6",
                      fontSize: 12,
                      width: 280,
                      outline: "none",
                    }}
                  />

                  <div style={{ display: "flex", gap: 10 }}>
                    <select
                      value={stakeFilter}
                      onChange={(e) => setStakeFilter(e.target.value)}
                      style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12, outline: "none" }}
                    >
                      <option value="all">All Stake Tiers</option>
                      <option value="micro">Micro Stakes</option>
                      <option value="low">Low Stakes</option>
                      <option value="medium">Medium Stakes</option>
                      <option value="high">High Stakes</option>
                      <option value="vip">VIP Stakes</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12, outline: "none" }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active Only</option>
                      <option value="paused">Paused Only</option>
                      <option value="private">Private Tables</option>
                    </select>

                    <button className="admin-primary" onClick={() => setShowCreateModal(true)}>
                      + Create Table
                    </button>
                  </div>
                </div>

                {/* Table list in Bingo admin-card */}
                <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #edf0f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h2 style={{ fontSize: 14, margin: 0, fontWeight: 700, color: "#1e202c" }}>
                        Figure 10.3 — Active Cash Table Fleet ({filteredTables.length} tables)
                      </h2>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9497a6" }}>
                        Tables currently active and synchronized with /cashgame and /holdem/tables
                      </p>
                    </div>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f8f9fb", borderBottom: "1px solid #eef0f3" }}>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>TABLE NAME</th>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>TIER</th>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>BLINDS</th>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>BUY-IN</th>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>SEATS</th>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>COMMISSION</th>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>STATUS</th>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTables.map((t) => (
                        <tr key={t.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <strong style={{ color: "#1e202c", display: "block" }}>{t.name}</strong>
                            <small style={{ color: "#9497a6", fontSize: 10 }}>
                              {t.id} {t.isPrivate && <span style={{ color: "#a05bcd", fontWeight: 700 }}>[PIN: {t.inviteCode}]</span>}
                            </small>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "2px 6px", borderRadius: 4, background: "#f0edff", color: "#6e59e8" }}>
                              {t.tier}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <b>€{t.sb} / €{t.bb}</b>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            €{t.minBuyIn} - €{t.maxBuyIn}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span>{t.seatsOccupied} / {t.maxSeats}</span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: t.feeType === "RAKE" ? "#15a982" : t.feeType === "HAND_FEE" ? "#428de3" : "#e46559" }}>
                              {t.feeLabel}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span className={`status ${t.status === "playing" ? "status-live" : "status-starting-soon"}`}>
                              <i />{t.status === "playing" ? "live" : "paused"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                className="outline-button"
                                style={{ padding: "4px 8px", fontSize: 11 }}
                                onClick={() => handleToggleTable(t.id, t.name)}
                              >
                                {t.status === "playing" ? "Pause" : "Resume"}
                              </button>
                              <Link
                                href={`/holdem/tables?code=${t.id}`}
                                className="admin-primary"
                                style={{ padding: "4px 8px", fontSize: 11, textDecoration: "none" }}
                              >
                                Felt &rarr;
                              </Link>
                              <button
                                className="danger-button"
                                style={{ padding: "4px 8px", fontSize: 11 }}
                                onClick={() => handleDeleteTable(t.id, t.name)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MODULE 4: PLAYER 360 & POKER ONLINE ACCESS (SECTIONS 10.1 & 10.2)         */}
            {/* ========================================================================= */}
            {module === "players" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <input
                    type="text"
                    placeholder="Search player name, username, or ID..."
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12, width: 280, outline: "none" }}
                  />

                  <select
                    value={accessFilter}
                    onChange={(e) => setAccessFilter(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12, outline: "none" }}
                  >
                    <option value="all">All Poker Access Statuses</option>
                    <option value="enabled">Poker Online: ALLOWED</option>
                    <option value="restricted">Poker Online: RESTRICTED</option>
                  </select>
                </div>

                <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #edf0f5" }}>
                    <h2 style={{ fontSize: 14, margin: 0, fontWeight: 700, color: "#1e202c" }}>
                      Section 10.1 & 10.2 — Player 360 & Real-Time Poker Online Access
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9497a6" }}>
                      Toggle cash table joining permissions instantly per player
                    </p>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f8f9fb", borderBottom: "1px solid #eef0f3" }}>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>PLAYER</th>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>VIP TIER</th>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>BALANCE (€)</th>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>HANDS PLAYED</th>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>RAKE GENERATED</th>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>LAST ACTIVE</th>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "#696c7e", fontWeight: 700 }}>POKER ONLINE ACCESS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlayers.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 18 }}>{p.avatar}</span>
                              <div>
                                <strong style={{ color: "#1e202c", display: "block" }}>{p.name}</strong>
                                <small style={{ color: "#9497a6", fontSize: 10 }}>@{p.username} &bull; {p.country}</small>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#fef08a", color: "#854d0e" }}>
                              {p.vipTier}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <b>€{p.balanceEur.toFixed(2)}</b>
                          </td>
                          <td style={{ padding: "12px 16px" }}>{p.handsPlayed}</td>
                          <td style={{ padding: "12px 16px", color: "#15a982", fontWeight: 700 }}>€{p.rakeGeneratedEur.toFixed(2)}</td>
                          <td style={{ padding: "12px 16px", color: "#838697" }}>{p.lastActive}</td>
                          <td style={{ padding: "12px 16px" }}>
                            {/* DYNAMIC POKER ACCESS SWITCH */}
                            <button
                              onClick={() => handleTogglePlayer(p.id, p.name)}
                              style={{
                                border: "none",
                                borderRadius: 6,
                                padding: "6px 12px",
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: "pointer",
                                background: p.pokerAccess ? "#eaf8f4" : "#fff0ef",
                                color: p.pokerAccess ? "#15a982" : "#e46559",
                              }}
                            >
                              {p.pokerAccess ? "✔ POKER: YES" : "✖ POKER: NO"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MODULE 5: COMMISSION RULES ENGINE (SECTION 6.4)                           */}
            {/* ========================================================================= */}
            {module === "rules" && (
              <div className="admin-card" style={{ maxWidth: 840, padding: 24 }}>
                <div className="card-title">
                  <div>
                    <h2>Section 6.4 — Global Commission Engine Parameters</h2>
                    <p>Live parameters controlling rake deductions across all cash game tables</p>
                  </div>
                </div>

                <form onSubmit={handleSaveCommissionRules} style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 16 }}>
                  <div style={{ background: "#f8f9fb", border: "1px solid #edf0f5", borderRadius: 8, padding: 16 }}>
                    <b style={{ color: "#1e202c", fontSize: 13, display: "block", marginBottom: 12 }}>
                      Model 1: Pot Rake Parameters
                    </b>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#696c7e", marginBottom: 4 }}>
                          Global Rake Rate (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={rulesForm.rakePercent}
                          onChange={(e) => setRulesForm({ ...rulesForm, rakePercent: Number(e.target.value) })}
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12 }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#696c7e", marginBottom: 4 }}>
                          Max Pot Rake Cap (€)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={rulesForm.rakeCapEur}
                          onChange={(e) => setRulesForm({ ...rulesForm, rakeCapEur: Number(e.target.value) })}
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12 }}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "#f8f9fb", border: "1px solid #edf0f5", borderRadius: 8, padding: 16 }}>
                    <b style={{ color: "#1e202c", fontSize: 13, display: "block", marginBottom: 12 }}>
                      Model 2: Fixed Hand Fee Parameter
                    </b>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#696c7e", marginBottom: 4 }}>
                        Hand Fee Deduction (€ per hand dealt)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={rulesForm.handFeeEur}
                        onChange={(e) => setRulesForm({ ...rulesForm, handFeeEur: Number(e.target.value) })}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12 }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ background: "#f8f9fb", border: "1px solid #edf0f5", borderRadius: 8, padding: 16 }}>
                    <b style={{ color: "#1e202c", fontSize: 13, display: "block", marginBottom: 12 }}>
                      Model 3: Timed Table Fee Parameter
                    </b>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#696c7e", marginBottom: 4 }}>
                          Table Fee Amount (€)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={rulesForm.tableFeeEur}
                          onChange={(e) => setRulesForm({ ...rulesForm, tableFeeEur: Number(e.target.value) })}
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12 }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#696c7e", marginBottom: 4 }}>
                          Billing Frequency (Minutes)
                        </label>
                        <input
                          type="number"
                          step="5"
                          value={rulesForm.tableFeeIntervalMin}
                          onChange={(e) => setRulesForm({ ...rulesForm, tableFeeIntervalMin: Number(e.target.value) })}
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12 }}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button type="submit" className="admin-primary">
                      Save Commission Rules
                    </button>
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => setRulesForm(DEFAULT_COMMISSION_SETTINGS)}
                    >
                      Reset to BET888 Standards
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ================= CREATE TABLE MODAL ================= */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              width: "90vw",
              maxWidth: 480,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: "#1e202c" }}>Figure 10.3 — Create Live Cash Table</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#838697" }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTableSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#696c7e", marginBottom: 4 }}>
                  Table Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12 }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#696c7e", marginBottom: 4 }}>
                    Small Blind (SB €)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formSb}
                    onChange={(e) => setFormSb(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#696c7e", marginBottom: 4 }}>
                    Big Blind (BB €)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formBb}
                    onChange={(e) => setFormBb(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12 }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#696c7e", marginBottom: 4 }}>
                    Min Buy-In (€)
                  </label>
                  <input
                    type="number"
                    value={formMinBuy}
                    onChange={(e) => setFormMinBuy(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#696c7e", marginBottom: 4 }}>
                    Max Buy-In (€)
                  </label>
                  <input
                    type="number"
                    value={formMaxBuy}
                    onChange={(e) => setFormMaxBuy(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12 }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#696c7e", marginBottom: 4 }}>
                    Max Seats
                  </label>
                  <select
                    value={formMaxSeats}
                    onChange={(e) => setFormMaxSeats(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12 }}
                  >
                    <option value={2}>2-Max (Heads-Up)</option>
                    <option value={6}>6-Max (Short Handed)</option>
                    <option value={9}>9-Max (Full Ring)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#696c7e", marginBottom: 4 }}>
                    Commission Model
                  </label>
                  <select
                    value={formFeeType}
                    onChange={(e) => setFormFeeType(e.target.value as any)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12 }}
                  >
                    <option value="RAKE">Model 1: Pot Rake (5%)</option>
                    <option value="HAND_FEE">Model 2: Fixed Hand Fee (€2.00)</option>
                    <option value="TABLE_FEE">Model 3: Timed Table Fee (€20 / 30m)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="chk-private"
                  checked={formIsPrivate}
                  onChange={(e) => setFormIsPrivate(e.target.checked)}
                />
                <label htmlFor="chk-private" style={{ fontSize: 12, color: "#313345", cursor: "pointer" }}>
                  Private Friends Table (6-digit PIN code)
                </label>
              </div>

              {formIsPrivate && (
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#696c7e", marginBottom: 4 }}>
                    Invite PIN Code (Leave empty to auto-generate)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formInviteCode}
                    onChange={(e) => setFormInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 7KJ8P9"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dcdfe6", fontSize: 12 }}
                  />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" className="outline-button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-primary">
                  Deploy Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
