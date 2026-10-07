"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Icon } from "../components/shared/Icon";
import { Logo } from "../components/shared/Logo";
import { VARIANTS } from "../poker/poker-engine";
import { VariantCode } from "../poker/poker-types";

const ROLES = ["Admin", "Risk", "Finance", "Support"];
const US_STATES = [
  "AL", "AZ", "CA", "CO", "CT", "FL", "GA", "ID", "IL", "IN",
  "LA", "MA", "MI", "MN", "MT", "NJ", "NV", "NY", "OH", "PA",
  "TN", "TX", "VA", "WA",
];

export const pokerAdminNav = [
  ["dashboard", "Overview & KPIs", "⌂"],
  ["tables", "Tables & Games", "▦"],
  ["rake", "Rake & Margins", "%"],
  ["tournaments", "Tournaments", "♜"],
  ["jackpots", "Jackpot Spin & BBJ", "✦"],
  ["players", "Player 360 & Bans", "♙"],
  ["live", "Live Room Monitor", "●"],
  ["integrity", "Integrity & Alerts", "⚠"],
  ["disputes", "Disputes & Adjustments", "⚖"],
  ["finance", "Finance & Redemptions", "⇄"],
  ["promotions", "Promos & Rakeback", "★"],
  ["brand", "Brand & Geo-States", "🌐"],
  ["clubs", "Private Clubs", "♠"],
  ["audit", "Admin & Audit Log", "📋"],
  ["ai", "AI Operations Assistant", "🤖"],
];

export function pokerAdminSubtitle(module: string) {
  const subtitles: Record<string, string> = {
    dashboard: "Real-time poker liquidity, rake revenues, active tables, and player engagement.",
    tables: "Configure cash table blinds, ante levels, action clocks, and game variant parameters.",
    rake: "Control rake percentage, pot caps, 'no flop no drop' rules, and player rakeback.",
    tournaments: "Manage scheduled MTTs, mystery bounties, satellite packages, and blind structures.",
    jackpots: "Adjust Jackpot Spin multiplier weights, RTP calculations, and progressive bad-beat seeds.",
    players: "Player KYC verification, VIP tiering, stake restrictions, and collision keep-apart pairs.",
    live: "Monitor real-time table occupancy, table status, and broadcast server-wide table alerts.",
    integrity: "Automated decision-speed tracking, chip-dumping detection, and soft-play review queue.",
    disputes: "Hand replay lookup with cryptographic shuffle proof, and maker-checker balance adjustments.",
    finance: "Cash-game rake reports, tournament P&L overlay, and Sweeps Coin redemptions queue.",
    promotions: "Pay owed player rakeback, drop tournament tickets, and manage campaign leaderboards.",
    brand: "Theme skins, brand labels, default language, and US state-by-state sweepstakes geoblocking.",
    clubs: "Oversee private club tables, invite codes, member limits, and club fee models.",
    audit: "Immutable chronological audit log tracing every operational and financial change.",
    ai: "Ask natural language questions about your poker operation with real-time session data.",
  };
  return subtitles[module] ?? "Manage and configure poker operations across the platform.";
}

export default function PokerBackofficeApp() {
  const [mounted, setMounted] = useState(false);
  const [module, setModule] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Persistent Poker State (same storage key as PokerApp for unified syncing)
  const [state, setState] = useState(() => {
    return {
      wallet: { USD: 100000, GC: 2500000, SC: 50000 } as Record<string, number>,
      tickets: [] as any[],
      tx: [] as any[],
      hands: [] as any[],
      tourneys: [] as any[],
      ops: {
        handsDealt: 0,
        byVariant: {} as Record<string, number>,
        rake: { USD: 0, GC: 0, SC: 0 } as Record<string, number>,
        fees: { USD: 0, GC: 0, SC: 0 } as Record<string, number>,
        tourneysRun: 0,
      },
      decisions: [] as number[],
      settings: {
        skin: "tig",
        fourColor: true,
        brand: "TIG Poker",
        mode: "real",
        sweepsCur: "SC",
        rakePct: 5,
        rakeCapBB: 3,
        timeBank: 20,
        speed: 1,
        nextDelay: 2200,
      },
      bo: {
        section: "overview",
        role: "Admin",
        audit: [] as any[],
        adjustments: [] as any[],
        redemptions: [] as any[],
        clubs: [] as any[],
        alerts: {} as Record<string, string>,
        broadcast: "",
        geoState: "NY",
        blockedStates: ["CT", "LA", "MI", "MT", "NJ", "TN", "WA"],
        frozen: false,
        withdrawHold: false,
        limits: { maxBuyInBB: 100, maxTables: 4, lossLimit: 0 },
        nfnd: true,
        rakeback: 20,
        rakebackPaid: 0,
        toggles: { straddle: false, rit: true, rabbit: false, anon: false, autoOpen: true, waitlist: true, disconnect: true, chat: true },
        spin: [[2, 8203], [3, 1100], [5, 500], [10, 162], [100, 33], [1000, 2]],
        mtt: {} as Record<string, any>,
        rakeByVariant: {} as Record<string, Record<string, number>>,
        bans: [] as string[],
        apart: [["RiverRat", "ColdDeck"]],
        vip: "Silver",
        note: "",
        lobbyOrder: "stakes",
        lang: "en",
        jackpot: { badBeat: 250000, highHand: 50000 },
      },
    };
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tig_poker_demo_v1");
      if (raw) {
        const loaded = JSON.parse(raw);
        setState((prev) => ({
          ...prev,
          ...loaded,
          settings: { ...prev.settings, ...(loaded.settings || {}) },
          ops: { ...prev.ops, ...(loaded.ops || {}) },
          bo: { ...prev.bo, ...(loaded.bo || {}) },
        }));
      }
    } catch (_) {}
    setMounted(true);
  }, []);

  const saveState = useCallback((updater: (prev: typeof state) => typeof state) => {
    setState((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem("tig_poker_demo_v1", JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const audit = useCallback(
    (action: string, detail?: string) => {
      saveState((prev) => ({
        ...prev,
        bo: {
          ...prev.bo,
          audit: [
            { ts: Date.now(), role: prev.bo.role, action, detail },
            ...prev.bo.audit,
          ].slice(0, 400),
        },
      }));
    },
    [saveState]
  );

  const money = useCallback((v: number, c = "USD") => {
    if (c === "USD") {
      return (
        (v < 0 ? "-" : "") +
        "$" +
        (Math.abs(v) / 100).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    }
    if (c === "SC") {
      return (v / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " SC";
    }
    return Math.round(v).toLocaleString("en-US") + " GC";
  }, []);

  const spinRTP = (t: number[][]) => {
    const tot = t.reduce((a, [, w]) => a + w, 0);
    const e = t.reduce((a, [m, w]) => a + m * w, 0) / (tot || 1);
    return { tot, e, rtp: (e / 3) * 100 };
  };

  const currentLabel = pokerAdminNav.find(([key]) => key === module)?.[1] ?? "Overview";

  if (!mounted) return null;

  return (
    <div className="admin-shell">
      <div className="admin-app">
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1e1442",
            border: "1px solid #7868ff",
            color: "#fff",
            padding: "10px 24px",
            borderRadius: 8,
            zIndex: 99999,
            fontWeight: 700,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-logo">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" style={{ width: 28, height: 28, borderRadius: "50%", background: "#fff", flexShrink: 0 }} />
            <div>
              <b style={{ color: "#fff", fontSize: 13, letterSpacing: 1 }}>TRUEIGTECH</b>
              <small style={{ color: "#7868ff", display: "block", fontSize: 9, fontWeight: 800 }}>POKER OPERATIONS</small>
            </div>
          </div>
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
              {key === "live" && <i className="nav-badge">Live</i>}
              {key === "integrity" && state.bo.alerts && Object.keys(state.bo.alerts).length > 0 && (
                <i className="nav-badge muted">Alert</i>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <span>{state.bo.role.slice(0, 2).toUpperCase()}</span>
          <div>
            <b>John Dawson</b>
            <small>{state.bo.role} Role</small>
          </div>
          <Link href="/poker" title="Go to Poker Platform" style={{ color: "#27d7ad", fontSize: 12 }}>
            Lobby →
          </Link>
        </div>
      </aside>

      {/* Backdrop for mobile/tablet drawer */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Admin Section */}
      <section className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div>
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
            <span>Trueigtech Operations / Poker /</span>
            <b>{currentLabel}</b>
          </div>

          <div className="admin-header-actions">
            <div className="environment">
              <i /> Certified RNG
            </div>
            <select
              style={{
                background: "#f0edff",
                border: "1px solid #dcd7fa",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: "#5943e9",
              }}
              value={state.bo.role}
              onChange={(e) => {
                const r = e.target.value;
                saveState((prev) => ({
                  ...prev,
                  bo: { ...prev.bo, role: r },
                }));
                audit("Role switched", r);
                showToast(`Role switched to ${r}`);
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r} Role
                </option>
              ))}
            </select>
            <Link href="/poker" className="admin-primary" style={{ textDecoration: "none", display: "inline-flex" }}>
              ♠ View Poker Lobby
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="admin-content">
          <div className="admin-page-title">
            <div>
              <span className="section-kicker">TRUEIGTECH POKER OPERATIONS</span>
              <h1>{currentLabel}</h1>
              <p>{pokerAdminSubtitle(module)}</p>
            </div>
            <div className="admin-title-actions">
              <button
                className="outline-button"
                onClick={() => {
                  audit("Report exported", currentLabel);
                  showToast(`${currentLabel} data exported to CSV.`);
                }}
              >
                ↓ Export Report
              </button>
              <button
                className="admin-primary"
                onClick={() => {
                  audit("Manual Sync Triggered", currentLabel);
                  showToast("Operator settings synced across active tables.");
                }}
              >
                Sync Platform
              </button>
            </div>
          </div>

          {/* Module 1: Dashboard / Overview */}
          {module === "dashboard" && (
            <div>
              <div className="metric-grid">
                <div className="metric-card">
                  <div className="metric-card-main">
                    <div className="metric-icon metric-1">♠</div>
                    <div>
                      <small>Hands Dealt</small>
                      <strong>{state.ops.handsDealt.toLocaleString()}</strong>
                      <span>All active rooms</span>
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-main">
                    <div className="metric-icon metric-2">$</div>
                    <div>
                      <small>Cash Rake</small>
                      <strong>{money(state.ops.rake.USD || 0, "USD")}</strong>
                      <span className="neutral-change">{money(state.ops.rake.SC || 0, "SC")}</span>
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-main">
                    <div className="metric-icon metric-3">♜</div>
                    <div>
                      <small>Tournament Fees</small>
                      <strong>{money(state.ops.fees.USD || 0, "USD")}</strong>
                      <span className="neutral-change">{money(state.ops.fees.SC || 0, "SC")}</span>
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-main">
                    <div className="metric-icon metric-4">✦</div>
                    <div>
                      <small>Tourneys Run</small>
                      <strong>{state.ops.tourneysRun}</strong>
                      <span>MTT, SNG, Spins</span>
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-main">
                    <div className="metric-icon metric-5">●</div>
                    <div>
                      <small>Active Variants</small>
                      <strong>6</strong>
                      <span>NLH, PLO, SD, FLH</span>
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-main">
                    <div className="metric-icon metric-1">%</div>
                    <div>
                      <small>Current Rake Rule</small>
                      <strong>{state.settings.rakePct}%</strong>
                      <span>Cap {state.settings.rakeCapBB}bb</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="admin-card revenue-chart">
                  <div className="card-title">
                    <div>
                      <h2>Hands Dealt by Variant</h2>
                      <p>Real-time game popularity and table allocation</p>
                    </div>
                  </div>
                  <div className="variant-bars" style={{ marginTop: 16 }}>
                    {Object.values(VARIANTS).map((v) => {
                      const count = state.ops.byVariant[v.code] || 0;
                      const max = Math.max(1, ...Object.values(state.ops.byVariant));
                      const pct = Math.round((count / max) * 100);
                      return (
                        <div key={v.code} className="variant-row">
                          <div className="variant-label">
                            <span className="variant-code-pill">{v.code}</span>
                            <span className="variant-name">{v.name}</span>
                          </div>
                          <div className="variant-track">
                            <div
                              className="variant-fill"
                              style={{ width: `${Math.max(count > 0 ? 8 : 0, pct)}%` }}
                            />
                          </div>
                          <div className="variant-count">
                            <strong>{count.toLocaleString()}</strong>
                            <small>hands</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="admin-card live-ops">
                  <div className="card-title">
                    <div>
                      <h2>Integrity &amp; Operational Alerts</h2>
                      <p>Pending reviews requiring supervisor action</p>
                    </div>
                  </div>
                  <div className="alert-card-list" style={{ marginTop: 14 }}>
                    <div className="alert-card-row">
                      <div className="alert-info">
                        <span
                          className={`alert-dot ${
                            state.bo.redemptions.filter((r: any) => r.status === "Pending").length
                              ? "gold"
                              : "good"
                          }`}
                        />
                        <div>
                          <b>Redemption Requests</b>
                          <small>Sweeps Coin withdrawals queue</small>
                        </div>
                      </div>
                      <div className="alert-meta">
                        {state.bo.redemptions.filter((r: any) => r.status === "Pending").length ? (
                          <span className="tag gold">
                            {state.bo.redemptions.filter((r: any) => r.status === "Pending").length} Pending
                          </span>
                        ) : (
                          <span className="tag good">All Settled</span>
                        )}
                        <button className="alert-action-btn" onClick={() => setModule("finance")}>
                          View →
                        </button>
                      </div>
                    </div>

                    <div className="alert-card-row">
                      <div className="alert-info">
                        <span
                          className={`alert-dot ${
                            state.bo.adjustments.filter((a: any) => a.status === "Pending").length
                              ? "gold"
                              : "good"
                          }`}
                        />
                        <div>
                          <b>Maker-Checker Adjustments</b>
                          <small>Manual overrides awaiting 2nd review</small>
                        </div>
                      </div>
                      <div className="alert-meta">
                        {state.bo.adjustments.filter((a: any) => a.status === "Pending").length ? (
                          <span className="tag gold">
                            {state.bo.adjustments.filter((a: any) => a.status === "Pending").length} Awaiting
                          </span>
                        ) : (
                          <span className="tag good">None</span>
                        )}
                        <button className="alert-action-btn" onClick={() => setModule("disputes")}>
                          View →
                        </button>
                      </div>
                    </div>

                    <div className="alert-card-row">
                      <div className="alert-info">
                        <span className={`alert-dot ${state.bo.frozen ? "bad" : "good"}`} />
                        <div>
                          <b>Account Freeze Status</b>
                          <small>Emergency circuit breaker &amp; risk control</small>
                        </div>
                      </div>
                      <div className="alert-meta">
                        {state.bo.frozen ? (
                          <span className="tag bad">Frozen</span>
                        ) : (
                          <span className="tag good">Normal</span>
                        )}
                        <button className="alert-action-btn" onClick={() => setModule("players")}>
                          Controls →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Module 2: Tables & Games */}
          {module === "tables" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>Global Table Defaults &amp; Feature Flags</h2>
                  <p>Settings applied to new cash games, speed blitz, and private tables</p>
                </div>
              </div>
              <div className="form" style={{ marginTop: 16 }}>
                <label className="field">
                  Action Clock (Seconds)
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={state.settings.timeBank}
                    onChange={(e) =>
                      saveState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, timeBank: +e.target.value },
                      }))
                    }
                  />
                </label>

                <label className="field">
                  Maximum Buy-in (Big Blinds)
                  <input
                    type="number"
                    min={40}
                    max={250}
                    value={state.bo.limits.maxBuyInBB}
                    onChange={(e) =>
                      saveState((prev) => ({
                        ...prev,
                        bo: {
                          ...prev.bo,
                          limits: { ...prev.bo.limits, maxBuyInBB: +e.target.value },
                        },
                      }))
                    }
                  />
                </label>

                <label className="field">
                  Max Tables per Player
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={state.bo.limits.maxTables}
                    onChange={(e) =>
                      saveState((prev) => ({
                        ...prev,
                        bo: {
                          ...prev.bo,
                          limits: { ...prev.bo.limits, maxTables: +e.target.value },
                        },
                      }))
                    }
                  />
                </label>

                <label className="field">
                  Simulation Speed Multiplier
                  <select
                    value={String(state.settings.speed)}
                    onChange={(e) =>
                      saveState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, speed: +e.target.value },
                      }))
                    }
                  >
                    <option value="0.7">Relaxed (0.7x)</option>
                    <option value="1">Normal (1.0x)</option>
                    <option value="1.6">Fast (1.6x)</option>
                    <option value="2.5">Very Fast (2.5x)</option>
                  </select>
                </label>
              </div>

              <h3 style={{ marginTop: 24, marginBottom: 12 }}>Game Engine Variants Catalogue</h3>
              <div className="tblwrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Game Variant</th>
                      <th>Hole Cards</th>
                      <th>Evaluator Type</th>
                      <th>Betting Limit</th>
                      <th>Special Rules</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(VARIANTS).map((v) => (
                      <tr key={v.code}>
                        <td>
                          <b>{v.code}</b>
                        </td>
                        <td>{v.name}</td>
                        <td>{v.hole} cards</td>
                        <td>{v.eval === "omaha" ? "Exact 2 Hole + 3 Board" : "Best 5 of 7"}</td>
                        <td>{v.limit === "NL" ? "No-Limit" : v.limit === "PL" ? "Pot-Limit" : "Fixed-Limit"}</td>
                        <td>
                          {v.hilo ? <span className="tag gold">Hi-Lo 8/b Split</span> : null}
                          {v.shortDeck ? <span className="tag good">36 Cards (Flush beats Full House)</span> : null}
                          {!v.hilo && !v.shortDeck ? "Standard High" : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 20 }}>
                <button
                  className="admin-primary"
                  onClick={() => {
                    audit("Table settings saved", `Clock: ${state.settings.timeBank}s, MaxBB: ${state.bo.limits.maxBuyInBB}`);
                    showToast("Table configuration saved successfully.");
                  }}
                >
                  Save Table Settings
                </button>
              </div>
            </div>
          )}

          {/* Module 3: Rake & Margins */}
          {module === "rake" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>Cash Game Rake Rules &amp; House Margin</h2>
                  <p>Configured percentage, pot caps, and player rakeback distribution</p>
                </div>
              </div>
              <div className="form" style={{ marginTop: 16 }}>
                <label className="field">
                  Rake Percentage (%)
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={state.settings.rakePct}
                    onChange={(e) =>
                      saveState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, rakePct: +e.target.value },
                      }))
                    }
                  />
                </label>

                <label className="field">
                  Rake Cap (Big Blinds)
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={state.settings.rakeCapBB}
                    onChange={(e) =>
                      saveState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, rakeCapBB: +e.target.value },
                      }))
                    }
                  />
                </label>

                <label className="field">
                  Player Rakeback (%)
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={state.bo.rakeback}
                    onChange={(e) =>
                      saveState((prev) => ({
                        ...prev,
                        bo: { ...prev.bo, rakeback: +e.target.value },
                      }))
                    }
                  />
                </label>

                <label className="field">
                  Pre-flop Policy
                  <div style={{ marginTop: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={state.bo.nfnd}
                        onChange={(e) =>
                          saveState((prev) => ({
                            ...prev,
                            bo: { ...prev.bo, nfnd: e.target.checked },
                          }))
                        }
                      />
                      <b>No Flop, No Drop (No rake if hand ends pre-flop)</b>
                    </label>
                  </div>
                </label>
              </div>

              <div style={{ marginTop: 22 }}>
                <button
                  className="admin-primary"
                  onClick={() => {
                    audit("Rake rules updated", `${state.settings.rakePct}% cap ${state.settings.rakeCapBB}bb`);
                    showToast("Rake policy applied across all cash rooms.");
                  }}
                >
                  Apply Rake Rules
                </button>
              </div>
            </div>
          )}

          {/* Module 4: Tournaments */}
          {module === "tournaments" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>Multi-Table Tournament (MTT) Schedule</h2>
                  <p>Guarantees, entry fees, start times, and satellite reward packages</p>
                </div>
              </div>
              <div className="tblwrap" style={{ marginTop: 14 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Event Name</th>
                      <th>Game</th>
                      <th>Buy-in</th>
                      <th>Fee</th>
                      <th>Field</th>
                      <th>Start Stack</th>
                      <th>Special Format</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><b>Daily Mystery Bounty</b></td>
                      <td>No-Limit Hold&apos;em</td>
                      <td>$20.00</td>
                      <td>$2.00</td>
                      <td>180 players</td>
                      <td>5,000</td>
                      <td><span className="tag gold">Mystery Envelopes (Top 10% pool)</span></td>
                    </tr>
                    <tr>
                      <td><b>Road to the Live Main Event</b></td>
                      <td>No-Limit Hold&apos;em</td>
                      <td>$50.00</td>
                      <td>$5.00</td>
                      <td>140 players</td>
                      <td>5,000</td>
                      <td><span className="tag gold">Direct Live Satellite Package</span></td>
                    </tr>
                    <tr>
                      <td><b>PLO Turbo</b></td>
                      <td>Pot-Limit Omaha</td>
                      <td>$10.00</td>
                      <td>$1.00</td>
                      <td>120 players</td>
                      <td>5,000</td>
                      <td>Turbo Blinds</td>
                    </tr>
                    <tr>
                      <td><b>Short Deck Sunday</b></td>
                      <td>Short Deck 6+</td>
                      <td>$20.00</td>
                      <td>$2.00</td>
                      <td>90 players</td>
                      <td>5,000</td>
                      <td>Ante Only</td>
                    </tr>
                    <tr>
                      <td><b>Sunday Freeroll</b></td>
                      <td>No-Limit Hold&apos;em</td>
                      <td>Free</td>
                      <td>$0.00</td>
                      <td>300 players</td>
                      <td>3,000</td>
                      <td><span className="tag good">$500 Added Pool</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Module 5: Jackpot Spins & BBJ */}
          {module === "jackpots" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>Jackpot Spin Multiplier Odds &amp; Return to Player (RTP)</h2>
                  <p>Weights configured out of 10,000 basis points for hyper 3-player spins</p>
                </div>
              </div>
              {(() => {
                const rtpData = spinRTP(state.bo.spin);
                return (
                  <div>
                    <div className="tblwrap" style={{ marginTop: 14 }}>
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Multiplier</th>
                            <th>Weight (out of 10,000)</th>
                            <th>Calculated Probability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.bo.spin.map(([mult, weight], idx) => (
                            <tr key={idx}>
                              <td><b>{mult}×</b></td>
                              <td>{weight}</td>
                              <td>{((weight / (rtpData.tot || 1)) * 100).toFixed(2)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: 16, fontSize: 14 }}>
                      <b>Expected Multiplier:</b> {rtpData.e.toFixed(4)}× · <b>Target RTP:</b>{" "}
                      <span className={rtpData.rtp <= 100 ? "pos" : "neg"}>{rtpData.rtp.toFixed(2)}%</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Module 6: Players 360 & Bans */}
          {module === "players" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>Player 360 &amp; Responsible Gaming Enforcement</h2>
                  <p>Manage account freeze, VIP tier, game restrictions, and keep-apart pairs</p>
                </div>
              </div>
              <div className="form" style={{ marginTop: 16 }}>
                <label className="field">
                  Account Status
                  <div style={{ marginTop: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={state.bo.frozen}
                        onChange={(e) => {
                          const frozen = e.target.checked;
                          saveState((prev) => ({
                            ...prev,
                            bo: { ...prev.bo, frozen },
                          }));
                          audit("Player Freeze Toggled", String(frozen));
                          showToast(frozen ? "Account frozen: all table joins blocked." : "Account restored.");
                        }}
                      />
                      <b style={{ color: state.bo.frozen ? "#ff725e" : "#27d7ad" }}>
                        {state.bo.frozen ? "Account Frozen (Seating Blocked)" : "Account Active & Cleared"}
                      </b>
                    </label>
                  </div>
                </label>

                <label className="field">
                  VIP Loyalty Level
                  <select
                    value={state.bo.vip}
                    onChange={(e) => {
                      const v = e.target.value;
                      saveState((prev) => ({
                        ...prev,
                        bo: { ...prev.bo, vip: v },
                      }));
                      audit("VIP Tier Updated", v);
                      showToast(`VIP Tier updated to ${v}`);
                    }}
                  >
                    {["Bronze", "Silver", "Gold", "Platinum", "Black"].map((tier) => (
                      <option key={tier} value={tier}>
                        {tier} Tier
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  Withdrawal Hold Policy
                  <div style={{ marginTop: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={state.bo.withdrawHold}
                        onChange={(e) => {
                          const hold = e.target.checked;
                          saveState((prev) => ({
                            ...prev,
                            bo: { ...prev.bo, withdrawHold: hold },
                          }));
                          audit("Withdrawal Hold Toggled", String(hold));
                          showToast(hold ? "Withdrawals placed on security hold." : "Withdrawal hold released.");
                        }}
                      />
                      <b>Security Hold on Redemptions &amp; Withdrawals</b>
                    </label>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Module 7: Live Room Monitor */}
          {module === "live" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>Live Table Spectator &amp; System Broadcast</h2>
                  <p>Send high-priority notifications to all seated players at the start of next hand</p>
                </div>
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                <input
                  id="liveBcInput"
                  style={{ flex: 1 }}
                  placeholder="e.g. Server maintenance in 30 minutes. All pots will be automatically refunded."
                  defaultValue={state.bo.broadcast}
                />
                <button
                  className="admin-primary"
                  onClick={() => {
                    const msg = (document.getElementById("liveBcInput") as HTMLInputElement)?.value.trim() || "";
                    saveState((prev) => ({
                      ...prev,
                      bo: { ...prev.bo, broadcast: msg },
                    }));
                    audit("Table Broadcast", msg);
                    showToast(msg ? "Broadcast queued for next deal." : "Broadcast cleared.");
                  }}
                >
                  Send Announcement
                </button>
              </div>
            </div>
          )}

          {/* Module 8: Integrity & Collusion */}
          {module === "integrity" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>Integrity Alerts Queue &amp; Collusion Flags</h2>
                  <p>Automated heuristic signals detecting timing anomalies and soft play</p>
                </div>
              </div>
              <div className="tblwrap" style={{ marginTop: 14 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Triggered Alert</th>
                      <th>Signal Evidence</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="tag bad">High</span></td>
                      <td><b>Possible Soft-Play Collusion</b></td>
                      <td>RiverRat and ColdDeck shared 34 tables and never raised each other post-flop.</td>
                      <td>Under Review</td>
                    </tr>
                    <tr>
                      <td><span className="tag gold">Medium</span></td>
                      <td><b>Fast Decision Speed Profiling</b></td>
                      <td>Decision latency average under 650ms across 40+ consecutive betting rounds.</td>
                      <td>Monitoring</td>
                    </tr>
                    <tr>
                      <td><span className="tag gold">Medium</span></td>
                      <td><b>Shared Device Fingerprint</b></td>
                      <td>Two active sessions detected with matching browser hardware signatures.</td>
                      <td>Verified</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Module 9: Disputes & Adjustments */}
          {module === "disputes" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>Maker-Checker Balance Adjustments</h2>
                  <p>Dispute refunds require authorization by a second operator role</p>
                </div>
              </div>
              <div className="form" style={{ marginTop: 14 }}>
                <label className="field">
                  Currency
                  <select id="adjCur" defaultValue="USD">
                    <option value="USD">USD (Real Money)</option>
                    <option value="SC">SC (Sweeps Coins)</option>
                    <option value="GC">GC (Gold Coins)</option>
                  </select>
                </label>
                <label className="field">
                  Amount
                  <input id="adjAmt" type="number" step="0.01" defaultValue="25" />
                </label>
                <label className="field">
                  Adjustment Reason
                  <input id="adjWhy" defaultValue="Disconnect during all-in on river" />
                </label>
              </div>
              <div style={{ marginTop: 16 }}>
                <button
                  className="admin-primary"
                  onClick={() => {
                    const cur = (document.getElementById("adjCur") as any)?.value || "USD";
                    const amt = Math.round(+((document.getElementById("adjAmt") as any)?.value || 25) * (cur === "GC" ? 1 : 100));
                    const why = (document.getElementById("adjWhy") as any)?.value || "Adjustment";
                    saveState((prev) => ({
                      ...prev,
                      bo: {
                        ...prev.bo,
                        adjustments: [
                          { ts: Date.now(), by: prev.bo.role, cur, amount: amt, why, status: "Pending" },
                          ...prev.bo.adjustments,
                        ],
                      },
                    }));
                    audit("Adjustment Raised", `${money(amt, cur)} - ${why}`);
                    showToast("Adjustment raised. Awaiting second operator approval.");
                  }}
                >
                  Raise Adjustment
                </button>
              </div>

              {state.bo.adjustments.length > 0 && (
                <div className="tblwrap" style={{ marginTop: 20 }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Raised By</th>
                        <th>Amount</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.bo.adjustments.map((a: any, i: number) => (
                        <tr key={i}>
                          <td>{new Date(a.ts).toLocaleTimeString()}</td>
                          <td>{a.by}</td>
                          <td className="money">{money(a.amount, a.cur)}</td>
                          <td>{a.why}</td>
                          <td>
                            <span className={`tag ${a.status === "Approved" ? "good" : a.status === "Rejected" ? "bad" : "gold"}`}>
                              {a.status}
                            </span>
                          </td>
                          <td>
                            {a.status === "Pending" ? (
                              <button
                                className="btn small primary"
                                onClick={() => {
                                  saveState((prev) => {
                                    const adj = [...prev.bo.adjustments];
                                    adj[i] = { ...adj[i], status: "Approved", approver: prev.bo.role };
                                    const w = { ...prev.wallet, [a.cur]: (prev.wallet[a.cur] || 0) + a.amount };
                                    return {
                                      ...prev,
                                      wallet: w,
                                      bo: { ...prev.bo, adjustments: adj },
                                    };
                                  });
                                  audit("Adjustment Approved", money(a.amount, a.cur));
                                  showToast("Adjustment approved and funds credited.");
                                }}
                              >
                                Approve
                              </button>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Module 10: Finance & Redemptions */}
          {module === "finance" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>Sweeps Coin Redemptions &amp; Financial Clearing</h2>
                  <p>Approve player bank transfers and review rake liability</p>
                </div>
              </div>
              <div className="tblwrap" style={{ marginTop: 14 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Requested Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.bo.redemptions.length ? (
                      state.bo.redemptions.map((r: any, idx: number) => (
                        <tr key={idx}>
                          <td>{new Date(r.ts).toLocaleString()}</td>
                          <td className="money">{money(r.amount, "SC")}</td>
                          <td>
                            <span className={`tag ${r.status === "Paid" ? "good" : "gold"}`}>{r.status}</span>
                          </td>
                          <td>
                            {r.status === "Pending" ? (
                              <button
                                className="btn small primary"
                                onClick={() => {
                                  saveState((prev) => {
                                    const reds = [...prev.bo.redemptions];
                                    reds[idx] = { ...reds[idx], status: "Paid" };
                                    return { ...prev, bo: { ...prev.bo, redemptions: reds } };
                                  });
                                  audit("Redemption Approved", money(r.amount, "SC"));
                                  showToast("Redemption paid to player bank.");
                                }}
                              >
                                Approve &amp; Settle
                              </button>
                            ) : (
                              <span className="muted">Settled</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="muted" style={{ textAlign: "center", padding: 20 }}>
                          No pending redemption requests in queue.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Module 11: Promos & Rakeback */}
          {module === "promotions" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>Promotions, Rakeback &amp; Ticket Drops</h2>
                  <p>Directly reward loyal players with cash rakeback or satellite tournament entries</p>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <button
                  className="admin-primary"
                  onClick={() => {
                    saveState((prev) => ({
                      ...prev,
                      tickets: [
                        {
                          name: "Sunday Freeroll Ticket",
                          value: 1000,
                          cur: "USD",
                          from: "Operator Drop",
                          ts: Date.now(),
                          code: "DROP-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
                        },
                        ...prev.tickets,
                      ],
                    }));
                    audit("Ticket Dropped to Player Wallet");
                    showToast("Tournament ticket added to player wallet.");
                  }}
                >
                  Drop Tournament Ticket to Player
                </button>
              </div>
            </div>
          )}

          {/* Module 12: Brand & Geo-States */}
          {module === "brand" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>Sweepstakes Geoblocking &amp; Brand Settings</h2>
                  <p>Block specific US states from sweepstakes prize redemption</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10, margin: "16px 0" }}>
                {US_STATES.map((s) => (
                  <label key={s} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={state.bo.blockedStates.includes(s)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        saveState((prev) => {
                          const list = checked
                            ? [...prev.bo.blockedStates, s]
                            : prev.bo.blockedStates.filter((x) => x !== s);
                          return { ...prev, bo: { ...prev.bo, blockedStates: list } };
                        });
                        audit(`State ${s} block toggled`, String(checked));
                      }}
                    />
                    <b>{s}</b>
                  </label>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12 }}>
                Checked states will display geographic restriction notices for Sweepstakes games.
              </p>
            </div>
          )}

          {/* Module 13: Private Clubs */}
          {module === "clubs" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>Private Clubs &amp; Home Game Tables</h2>
                  <p>Overview of player-created clubs and shareable invite codes</p>
                </div>
              </div>
              <div className="tblwrap" style={{ marginTop: 14 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Club Name</th>
                      <th>Invite Code</th>
                      <th>Game</th>
                      <th>Seats</th>
                      <th>Model</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.bo.clubs.length ? (
                      state.bo.clubs.map((c: any, i: number) => (
                        <tr key={i}>
                          <td><b>{c.name}</b></td>
                          <td><code>{c.code}</code></td>
                          <td>{c.v}</td>
                          <td>{c.seats}</td>
                          <td>{c.rake ? `${c.rake}% Rake` : "Club Fee"}</td>
                          <td><span className="tag good">{c.status}</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="muted" style={{ textAlign: "center", padding: 20 }}>
                          No private clubs currently active. Clubs created in the poker lobby will appear here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Module 14: Audit Log */}
          {module === "audit" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>Regulatory Compliance Audit Log</h2>
                  <p>Chronological record of every administrative and financial adjustment</p>
                </div>
              </div>
              <div className="tblwrap" style={{ marginTop: 14 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Operator Role</th>
                      <th>Action</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.bo.audit.length ? (
                      state.bo.audit.slice(0, 100).map((a: any, idx: number) => (
                        <tr key={idx}>
                          <td>{new Date(a.ts).toLocaleString()}</td>
                          <td><span className="tag">{a.role}</span></td>
                          <td><b>{a.action}</b></td>
                          <td className="muted">{a.detail || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="muted" style={{ textAlign: "center", padding: 20 }}>
                          Audit log initialized. Actions taken in the backoffice will be recorded here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Module 15: AI Operations Assistant */}
          {module === "ai" && (
            <div className="admin-card" style={{ padding: 24 }}>
              <div className="card-title">
                <div>
                  <h2>AI Poker Operations Assistant</h2>
                  <p>Ask operational questions directly powered by live platform data</p>
                </div>
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                <input
                  id="pokerBoAiIn"
                  style={{ flex: 1 }}
                  placeholder="e.g. rake today, tournament fees, active alerts, most played game"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      document.getElementById("pokerBoAiGo")?.click();
                    }
                  }}
                />
                <button
                  id="pokerBoAiGo"
                  className="admin-primary"
                  onClick={() => {
                    const q = (document.getElementById("pokerBoAiIn") as HTMLInputElement)?.value.toLowerCase() || "";
                    const out = document.getElementById("pokerBoAiOut");
                    if (!q || !out) return;
                    if (q.includes("rake")) {
                      out.innerHTML = `Total Cash Rake: <b>${['USD', 'SC', 'GC']
                        .map((c) => money(state.ops.rake[c] || 0, c))
                        .join(", ")}</b>. Current Rake Setting: ${state.settings.rakePct}% capped at ${state.settings.rakeCapBB}bb.`;
                    } else if (q.includes("fee") || q.includes("tournament")) {
                      out.innerHTML = `Total Tournament Fees: <b>${['USD', 'SC', 'GC']
                        .map((c) => money(state.ops.fees[c] || 0, c))
                        .join(", ")}</b> across ${state.ops.tourneysRun} tournaments.`;
                    } else if (q.includes("hand")) {
                      out.innerHTML = `Total Hands Dealt: <b>${state.ops.handsDealt}</b> across all active poker tables.`;
                    } else if (q.includes("alert")) {
                      out.innerHTML = `Integrity queue has <b>3 active monitoring flags</b>: soft-play collusion review, decision speed heuristic, and device fingerprint check.`;
                    } else {
                      out.innerHTML = `Poker Operations Status: Platform active with <b>${state.ops.handsDealt} hands dealt</b> and <b>${state.ops.tourneysRun} tournaments run</b>.`;
                    }
                  }}
                >
                  Query Assistant
                </button>
              </div>
              <div
                id="pokerBoAiOut"
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: "#f8f9fc",
                  border: "1px solid #e2e5ef",
                  borderRadius: 10,
                  fontSize: 14,
                  minHeight: 50,
                  color: "#1e202c",
                }}
              >
                Assistant responses will appear here. Try asking about <b>rake</b>, <b>tournament fees</b>, or <b>hands dealt</b>.
              </div>
            </div>
          )}
        </div>
      </section>

      <style>{`
        .admin-shell {
          background: #f7f8fa;
          min-height: 100vh;
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }
        .admin-app {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          min-height: 100vh;
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
          background: #f7f8fa;
        }
        .admin-sidebar {
          width: 260px;
          min-width: 260px;
          max-width: 260px;
          position: sticky;
          top: 0;
          left: 0;
          height: 100vh;
          background: #121125;
          color: #a9a8bd;
          display: flex;
          flex-direction: column;
          z-index: 60;
          overflow-x: hidden;
        }
        .admin-sidebar nav {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 11px 9px;
          scrollbar-width: thin;
        }
        .admin-sidebar nav button {
          align-items: center;
          background: transparent;
          border: 0;
          border-radius: 8px;
          color: #77758b;
          display: flex;
          font-size: 12.5px;
          font-weight: 700;
          margin: 1px 0;
          padding: 10px 12px;
          text-align: left;
          width: 100%;
          cursor: pointer;
          transition: all 0.2s ease;
          gap: 10px;
        }
        .admin-sidebar nav .icon,
        .admin-sidebar nav button > span.icon {
          flex: 0 0 18px !important;
          width: 18px !important;
          min-width: 18px !important;
          margin-right: 0 !important;
          font-size: 15px !important;
          text-align: center !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #777386;
        }
        .admin-sidebar nav button > span:not(.icon) {
          flex: 1 1 auto;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 12.5px;
          color: inherit;
        }
        .admin-sidebar nav button:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #dedde5;
        }
        .admin-sidebar nav button.active {
          background: linear-gradient(90deg, rgba(122, 102, 244, 0.24), rgba(122, 102, 244, 0.08));
          color: #fff;
        }
        .admin-sidebar nav button.active .icon {
          color: #9685ff !important;
        }
        .admin-sidebar .sidebar-user {
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          display: grid;
          gap: 10px;
          grid-template-columns: auto 1fr auto;
          padding: 14px 16px;
          background: rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }
        .admin-sidebar-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 8, 25, 0.65);
          backdrop-filter: blur(2px);
          z-index: 55;
        }
        @media (max-width: 980px) {
          .admin-app {
            display: block !important;
          }
          .admin-sidebar {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: -280px !important;
            width: 260px !important;
            min-width: 260px !important;
            max-width: 260px !important;
            height: 100vh !important;
            z-index: 9999 !important;
            transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-shadow: 10px 0 35px rgba(0, 0, 0, 0.45) !important;
          }
          .admin-sidebar.open {
            left: 0 !important;
          }
          .admin-logo > button {
            display: block !important;
            background: transparent;
            border: 0;
            color: #fff;
            font-size: 20px;
            cursor: pointer;
            margin-left: auto;
            padding: 4px 8px;
          }
          .mobile-menu {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: 0;
            color: #4d5060;
            font-size: 18px;
            cursor: pointer;
            margin-right: 10px;
          }
        }
        .admin-main {
          min-width: 0;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }
        .admin-content {
          margin: 0 auto;
          max-width: 1550px;
          padding: 25px 28px 55px;
          width: 100%;
          box-sizing: border-box;
        }
        .admin-shell .outline-button,
        .admin-main .outline-button,
        .outline-button {
          background: #fff !important;
          border: 1px solid #dfe1e7 !important;
          border-radius: 8px !important;
          color: #313345 !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          padding: 8px 14px !important;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .admin-shell .outline-button:hover,
        .admin-main .outline-button:hover,
        .outline-button:hover {
          background: #f8f9fb !important;
          border-color: #cbcdd7 !important;
          color: #1a1c29 !important;
        }
        .metric-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
        }
        .dashboard-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: 1.3fr 1fr;
          margin-top: 16px;
        }
        @media (max-width: 1100px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        /* Variant Bars Card */
        .variant-bars {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 4px 0;
        }
        .variant-row {
          display: grid;
          grid-template-columns: 190px 1fr 80px;
          gap: 14px;
          align-items: center;
        }
        .variant-label {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }
        .variant-code-pill {
          background: #f0edff;
          color: #5d46eb;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 7px;
          border-radius: 6px;
          letter-spacing: 0.5px;
          font-family: 'JetBrains Mono', monospace;
        }
        .variant-name {
          font-size: 12.5px;
          font-weight: 600;
          color: #2b2e3e;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .variant-track {
          background: #f0eff6;
          height: 9px;
          border-radius: 99px;
          overflow: hidden;
          position: relative;
          width: 100%;
        }
        .variant-fill {
          background: linear-gradient(90deg, #7868ff, #9e8eff);
          height: 100%;
          border-radius: 99px;
          transition: width 0.3s ease;
        }
        .variant-count {
          display: flex;
          align-items: baseline;
          justify-content: flex-end;
          gap: 4px;
          text-align: right;
        }
        .variant-count strong {
          font-size: 13.5px;
          font-weight: 800;
          color: #1a1c29;
          font-family: 'Manrope', sans-serif;
        }
        .variant-count small {
          font-size: 10px;
          color: #9295a5;
          text-transform: uppercase;
          font-weight: 700;
        }
        /* Alert Card Rows */
        .alert-card-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .alert-card-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: #fbfbfd;
          border: 1px solid #ebedf3;
          border-radius: 10px;
          transition: all 0.2s ease;
        }
        .alert-card-row:hover {
          background: #f6f7fb;
          border-color: #dedcf8;
        }
        .alert-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .alert-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .alert-dot.good {
          background: #27d7ad;
          box-shadow: 0 0 0 3px rgba(39, 215, 173, 0.2);
        }
        .alert-dot.gold, .alert-dot.warn {
          background: #f6bd49;
          box-shadow: 0 0 0 3px rgba(246, 189, 73, 0.2);
        }
        .alert-dot.bad {
          background: #ff725e;
          box-shadow: 0 0 0 3px rgba(255, 114, 94, 0.2);
        }
        .alert-info b {
          font-size: 13px;
          font-weight: 700;
          color: #1e202c;
          display: block;
        }
        .alert-info small {
          font-size: 11px;
          color: #8b8e9f;
          display: block;
          margin-top: 1px;
        }
        .alert-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .alert-action-btn {
          background: #fff;
          border: 1px solid #dcdfe8;
          border-radius: 7px;
          color: #5943e9;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .alert-action-btn:hover {
          background: #f0edff;
          border-color: #b7abff;
        }
        /* Forms & Fields */
        .form, .formgrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .field, .formgrid label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #4e5163;
        }
        .field input, .field select, .field textarea,
        .formgrid input, .formgrid select {
          background: #fff;
          border: 1px solid #dfe1e7;
          border-radius: 8px;
          color: #1e202c;
          font-size: 12px;
          padding: 9px 12px;
          font-weight: 600;
          outline: none;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .field input:focus, .field select:focus, .field textarea:focus,
        .formgrid input:focus, .formgrid select:focus {
          border-color: #7868ff;
          box-shadow: 0 0 0 3px rgba(120, 104, 255, 0.15);
        }
        /* Buttons */
        .btn {
          background: #fff;
          border: 1px solid #dfe1e7;
          border-radius: 8px;
          color: #313345;
          font-size: 12px;
          font-weight: 700;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        .btn:hover {
          background: #f8f9fb;
          border-color: #cbcdd7;
        }
        .btn.small {
          padding: 5px 10px;
          font-size: 11px;
          border-radius: 6px;
        }
        .btn.primary {
          background: linear-gradient(135deg, #806fff, #6653ee);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 4px 12px rgba(104, 83, 238, 0.2);
        }
        .btn.primary:hover {
          background: linear-gradient(135deg, #9384ff, #7362f2);
          color: #fff;
        }
        .btn.danger {
          background: #fff0ef;
          border-color: #ffd0cb;
          color: #e46559;
        }
        /* Fallback Bars */
        .bars {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .bars .b {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          background: #fbfbfd;
          border: 1px solid #ebedf3;
          border-radius: 8px;
          font-size: 12px;
        }
        /* Tables */
        .tblwrap, .responsive-table {
          overflow-x: auto;
          width: 100%;
        }
        .tbl, .responsive-table table {
          width: 100%;
          border-collapse: collapse;
          min-width: 680px;
          background: #fff;
        }
        .tbl th, .responsive-table th {
          color: #9a9cab !important;
          text-transform: uppercase !important;
          font-weight: 700 !important;
          font-size: 11px !important;
          padding: 12px 14px !important;
          text-align: left !important;
          border-bottom: 1px solid #ebecf0 !important;
          letter-spacing: 0.5px !important;
          background: #fff !important;
        }
        .tbl td, .responsive-table td {
          color: #313345 !important;
          font-size: 12px !important;
          padding: 12px 14px !important;
          border-bottom: 1px solid #f0f1f5 !important;
          vertical-align: middle !important;
        }
        .tbl tbody tr:hover, .responsive-table tbody tr:hover {
          background: #fafbfe !important;
        }
        /* Tags */
        .tag {
          background: #f0f2f5;
          border-radius: 20px;
          color: #767b8d;
          display: inline-flex;
          align-items: center;
          font-size: 10px;
          font-weight: 800;
          padding: 4px 10px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .tag.good, .tag.success {
          background: rgba(39, 215, 173, 0.15) !important;
          color: #1eae87 !important;
        }
        .tag.gold, .tag.warn, .tag.warning {
          background: rgba(246, 189, 73, 0.15) !important;
          color: #d99726 !important;
        }
        .tag.bad, .tag.danger {
          background: rgba(255, 114, 94, 0.15) !important;
          color: #e15d57 !important;
        }
        .tag.neutral {
          background: rgba(148, 151, 166, 0.12) !important;
          color: #7f8292 !important;
        }
        .money {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
        }
        .panel {
          background: #fff;
          border: 1px solid #e4e6ec;
          border-radius: 12px;
          padding: 16px;
        }
      `}</style>
      </div>
    </div>
  );
}
