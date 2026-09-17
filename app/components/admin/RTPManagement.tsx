import { useState } from "react";
import { BingoRoomData, RTPEngine, RtpMode } from "../../bingo-core";
import { money, type AdminAction } from "../shared/types";

export function RTPManagement({
  rooms,
  setRooms,
  notify,
  openAction,
}: {
  rooms: BingoRoomData[];
  setRooms: (rooms: BingoRoomData[]) => void;
  notify: (message: string) => void;
  openAction: (action: AdminAction) => void;
}) {
  const [globalTargetRtp, setGlobalTargetRtp] = useState(80);
  const [filter, setFilter] = useState<"all" | "dynamic" | "fixed" | "custom">("all");
  const [search, setSearch] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const dynamicCount = rooms.filter((r) => r.rtpMode === "dynamic").length;
  const fixedCount = rooms.filter((r) => r.rtpMode === "fixed").length;
  const customCount = rooms.filter((r) => r.customRtp).length;

  const avgTargetRtp =
    Math.round((rooms.reduce((sum, r) => sum + (r.rtp ?? globalTargetRtp), 0) / Math.max(1, rooms.length)) * 10) / 10;
  const houseMargin = RTPEngine.calculateHouseMargin(globalTargetRtp, 2.5);

  const applyGlobalRtp = (newRtp: number) => {
    setGlobalTargetRtp(newRtp);
    const updated = rooms.map((room) => {
      const updatedPrize =
        room.rtpMode === "dynamic"
          ? RTPEngine.calculateDynamicPrize(room.cardsSold, room.ticketPrice, newRtp, room.jackpot ? 2.5 : 0)
          : room.prize;
      return {
        ...room,
        rtp: newRtp,
        customRtp: false,
        prize: updatedPrize > 0 ? Math.round(updatedPrize) : room.prize,
      };
    });
    setRooms(updated);
    notify(`✓ Global ${newRtp}% RTP applied across all ${rooms.length} rooms. Dynamic prizes recalculated.`);
  };

  const updateRoomRtp = (roomId: string, delta: number) => {
    const target = rooms.find((r) => r.id === roomId);
    if (!target) return;
    const current = target.rtp ?? globalTargetRtp;
    const nextRtp = Math.max(65, Math.min(95, current + delta));
    if (nextRtp === current) return;

    const updated = rooms.map((room) => {
      if (room.id !== roomId) return room;
      const isCustom = nextRtp !== globalTargetRtp;
      const updatedPrize =
        room.rtpMode === "dynamic"
          ? RTPEngine.calculateDynamicPrize(room.cardsSold, room.ticketPrice, nextRtp, room.jackpot ? 2.5 : 0)
          : room.prize;
      return {
        ...room,
        rtp: nextRtp,
        customRtp: isCustom,
        prize: updatedPrize > 0 ? Math.round(updatedPrize) : room.prize,
      };
    });
    setRooms(updated);
    notify(`${target.name} target RTP set to ${nextRtp}%.`);
  };

  const toggleRoomMode = (roomId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;
    const nextMode: RtpMode = targetRoom.rtpMode === "dynamic" ? "fixed" : "dynamic";
    const targetRtp = targetRoom.rtp ?? globalTargetRtp;
    const updatedPrize =
      nextMode === "dynamic"
        ? RTPEngine.calculateDynamicPrize(targetRoom.cardsSold, targetRoom.ticketPrice, targetRtp, targetRoom.jackpot ? 2.5 : 0)
        : targetRoom.prize;
    const updated = rooms.map((room) =>
      room.id === roomId
        ? {
            ...room,
            rtpMode: nextMode,
            prize: updatedPrize > 0 ? Math.round(updatedPrize) : room.prize,
          }
        : room,
    );
    setRooms(updated);
    notify(`${targetRoom.name} switched to ${nextMode === "dynamic" ? "Dynamic Pool (Auto-scaled)" : "Guaranteed Fixed"} mode.`);
  };

  const resetToGlobal = (roomId: string) => {
    const updated = rooms.map((room) => {
      if (room.id !== roomId) return room;
      const updatedPrize =
        room.rtpMode === "dynamic"
          ? RTPEngine.calculateDynamicPrize(room.cardsSold, room.ticketPrice, globalTargetRtp, room.jackpot ? 2.5 : 0)
          : room.prize;
      return {
        ...room,
        rtp: globalTargetRtp,
        customRtp: false,
        prize: updatedPrize > 0 ? Math.round(updatedPrize) : room.prize,
      };
    });
    setRooms(updated);
    notify(`Reset ${rooms.find((r) => r.id === roomId)?.name} to global target (${globalTargetRtp}%).`);
  };

  const recalcRoom = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const targetRtp = room.rtp ?? globalTargetRtp;
    const updatedPrize = RTPEngine.calculateDynamicPrize(room.cardsSold, room.ticketPrice, targetRtp, room.jackpot ? 2.5 : 0);
    const prize = updatedPrize > 0 ? Math.round(updatedPrize) : room.prize;
    setRooms(rooms.map((r) => (r.id === roomId ? { ...r, prize } : r)));
    notify(`Prize pool refreshed for ${room.name} (${money(prize)}).`);
  };

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = `${room.name} ${room.variant}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "dynamic" && room.rtpMode === "dynamic") ||
      (filter === "fixed" && room.rtpMode === "fixed") ||
      (filter === "custom" && room.customRtp);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="rtp-management-page">
      <div className="rtp-guide-header">
        <div className="rtp-guide-summary">
          <span className="rtp-guide-badge">💡 Simple Admin Guide</span>
          <span><b>RTP = Return to Player:</b> Percentage of ticket wagers returned to winning players. The rest is casino profit.</span>
        </div>
        <button
          type="button"
          className="rtp-guide-toggle-btn"
          onClick={() => setShowGuide(!showGuide)}
        >
          {showGuide ? "Hide Explainer ▲" : "How RTP & Margins Work ▼"}
        </button>
      </div>

      {showGuide && (
        <div className="rtp-explainer-cards">
          <div className="rtp-explainer-card">
            <span className="explainer-icon">🎯</span>
            <div>
              <b>Player Return (RTP %)</b>
              <p>The portion of ticket wagers paid back to winners. At <b>80% RTP</b>, for every $100 spent by players, <b>$80</b> is returned in prize money.</p>
            </div>
          </div>
          <div className="rtp-explainer-card">
            <span className="explainer-icon">🏦</span>
            <div>
              <b>House Profit Margin</b>
              <p>The gross revenue kept by Trueigtech after prize payouts and jackpot contributions. At 80% RTP with 2.5% jackpot seed, house margin is <b>17.5%</b>.</p>
            </div>
          </div>
          <div className="rtp-explainer-card">
            <span className="explainer-icon">⚡</span>
            <div>
              <b>Dynamic Prize Scaling</b>
              <p>Dynamic rooms scale their prize pool in real time: <code>Prize = Tickets Sold × Price × RTP%</code>. Eliminates operator risk of under-funded games.</p>
            </div>
          </div>
          <div className="rtp-explainer-card">
            <span className="explainer-icon">🔒</span>
            <div>
              <b>Guaranteed Fixed Prize</b>
              <p>Fixed rooms offer a guaranteed jackpot amount regardless of ticket sales. Requires enough ticket volume to break even.</p>
            </div>
          </div>
        </div>
      )}

      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card-main">
            <span className="metric-icon" style={{ background: "#eef2ff", color: "#4f46e5" }}>🎯</span>
            <div>
              <small>GLOBAL TARGET RTP</small>
              <strong>{globalTargetRtp}%</strong>
              <span style={{ color: "#4f46e5" }}>Avg across rooms: {avgTargetRtp}%</span>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-card-main">
            <span className="metric-icon" style={{ background: "#e0f2fe", color: "#0284c7" }}>🏦</span>
            <div>
              <small>EXPECTED HOUSE MARGIN</small>
              <strong style={{ color: "#0284c7" }}>{houseMargin}%</strong>
              <span style={{ color: "#0284c7" }}>GGR hold retention rate</span>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-card-main">
            <span className="metric-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>⚡</span>
            <div>
              <small>DYNAMIC POOLS</small>
              <strong style={{ color: "#16a34a" }}>{dynamicCount}</strong>
              <span style={{ color: "#16a34a" }}>Auto-adjust prize to sales</span>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-card-main">
            <span className="metric-icon" style={{ background: "#fef3c7", color: "#d97706" }}>🔒</span>
            <div>
              <small>FIXED GUARANTEED</small>
              <strong style={{ color: "#d97706" }}>{fixedCount}</strong>
              <span style={{ color: "#d97706" }}>Fixed minimum prize pool</span>
            </div>
          </div>
        </div>
      </div>

      <section className="rtp-global-controller">
        <div className="rtp-card-header">
          <div>
            <h2>Network-Wide RTP Policy Control</h2>
            <p>One-click apply global payout target to all standard rooms. Changes take effect on next game round.</p>
          </div>
          <div className="rtp-header-badges">
            <span className="global-rtp-badge">{globalTargetRtp}% Target RTP</span>
            <span className="global-margin-badge">{houseMargin}% House Hold</span>
            <button
              type="button"
              className="admin-primary"
              style={{ padding: "6px 14px", fontSize: "12px" }}
              onClick={() => openAction({ kind: "apply-global-rtp" })}
            >
              ⚙ Advanced Policy Settings
            </button>
          </div>
        </div>

        {/* Visual 100% Breakdown Bar */}
        <div className="rtp-distribution-box">
          <div className="rtp-dist-header">
            <span className="dist-title">Total Wager Allocation (100%)</span>
            <span className="dist-equation">
              <b>{globalTargetRtp}%</b> Prize + <b>{houseMargin}%</b> Margin + <b>2.5%</b> Jackpot = <b>100%</b>
            </span>
          </div>
          <div className="rtp-dist-bar-track">
            <div className="bar-rtp" style={{ width: `${globalTargetRtp}%` }} />
            <div className="bar-margin" style={{ width: `${houseMargin}%` }} />
            <div className="bar-jackpot" style={{ width: "2.5%" }} />
          </div>
          <div className="rtp-dist-legend">
            <div className="legend-chip legend-rtp">
              <span className="chip-dot" />
              <span className="chip-label">Player Payout:</span>
              <span className="chip-val">{globalTargetRtp}%</span>
            </div>
            <div className="legend-chip legend-margin">
              <span className="chip-dot" />
              <span className="chip-label">Operator Gross Hold:</span>
              <span className="chip-val">{houseMargin}%</span>
            </div>
            <div className="legend-chip legend-jackpot">
              <span className="chip-dot" />
              <span className="chip-label">Jackpot Reserve:</span>
              <span className="chip-val">2.5%</span>
            </div>
          </div>
        </div>

        <div className="rtp-global-body">
          <div className="rtp-slider-col">
            <div className="rtp-control-header">
              <div>
                <span className="control-label">TARGET PAYOUT PERCENTAGE</span>
                <span className="control-desc">Adjust stepper or select a preset strategy below</span>
              </div>
              <div className="rtp-stepper-box">
                <button
                  type="button"
                  className="stepper-action-btn"
                  onClick={() => applyGlobalRtp(Math.max(65, globalTargetRtp - 1))}
                  title="Decrease target RTP"
                >
                  −
                </button>
                <span className="stepper-number">{globalTargetRtp}%</span>
                <button
                  type="button"
                  className="stepper-action-btn"
                  onClick={() => applyGlobalRtp(Math.min(95, globalTargetRtp + 1))}
                  title="Increase target RTP"
                >
                  +
                </button>
              </div>
            </div>

            <div className="rtp-slider-container">
              <input
                type="range"
                className="rtp-range-slider"
                min="65"
                max="95"
                step="1"
                value={globalTargetRtp}
                onChange={(e) => applyGlobalRtp(Number(e.target.value))}
              />
              <div className="slider-track-labels">
                <span>65% (Conservative)</span>
                <span>78% (Industry Standard)</span>
                <span>85% (Player Friendly)</span>
                <span>95% (High Promo)</span>
              </div>
            </div>

            <div className="rtp-presets-container">
              <span className="presets-title">Preset Profiles</span>
              <div className="rtp-presets-grid">
                {[
                  { name: "Aggressive Hold", rtp: 72, margin: "25.5%", desc: "Maximum house margin retention" },
                  { name: "Balanced Standard", rtp: 78, margin: "19.5%", desc: "Standard commercial balance" },
                  { name: "Player Friendly", rtp: 82, margin: "15.5%", desc: "Higher win rates & retention" },
                  { name: "High Volume / Promo", rtp: 88, margin: "9.5%", desc: "Special promotion and VIP events" },
                ].map((preset) => (
                  <button
                    type="button"
                    key={preset.rtp}
                    className={`preset-tile ${globalTargetRtp === preset.rtp ? "selected" : ""}`}
                    onClick={() => applyGlobalRtp(preset.rtp)}
                  >
                    <div className="preset-tile-top">
                      <span className="preset-name">{preset.name}</span>
                      <span className="preset-val">{preset.rtp}% RTP</span>
                    </div>
                    <span className="preset-desc">{preset.margin} margin · {preset.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rtp-global-summary">
            <div className="summary-header">
              <span className="summary-title">Network Impact Preview</span>
              <span className="summary-subtitle">Live projections based on current room volume</span>
            </div>
            <div className="summary-metrics-list">
              <div className="summary-row">
                <div className="row-label"><span className="dot-purple" /><span>Target Player Return:</span></div>
                <b>{globalTargetRtp}%</b>
              </div>
              <div className="summary-row">
                <div className="row-label"><span className="dot-blue" /><span>Operator House Hold:</span></div>
                <b className="text-blue">{houseMargin}%</b>
              </div>
              <div className="summary-row">
                <div className="row-label"><span className="dot-amber" /><span>Jackpot Contribution:</span></div>
                <b>2.5%</b>
              </div>
              <div className="summary-row">
                <div className="row-label"><span>Active Games Affected:</span></div>
                <b>{rooms.length} rooms</b>
              </div>
            </div>
            <div className="summary-footer">
              <button
                type="button"
                className="rtp-apply-all-btn"
                onClick={() => applyGlobalRtp(globalTargetRtp)}
              >
                ✓ Apply to all {rooms.length} rooms
              </button>
              <span className="apply-hint">Recalculates dynamic prizes across active rooms</span>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-card data-card rtp-table-section">
        <div className="data-toolbar">
          <div className="search-box compact">
            <input
              placeholder="Filter rooms by name or variant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="rtp-filter-tabs">
            <button
              type="button"
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              All Rooms ({rooms.length})
            </button>
            <button
              type="button"
              className={filter === "dynamic" ? "active" : ""}
              onClick={() => setFilter("dynamic")}
            >
              ⚡ Dynamic Pools ({dynamicCount})
            </button>
            <button
              type="button"
              className={filter === "fixed" ? "active" : ""}
              onClick={() => setFilter("fixed")}
            >
              🔒 Fixed Guaranteed ({fixedCount})
            </button>
            {customCount > 0 && (
              <button
                type="button"
                className={filter === "custom" ? "active" : ""}
                onClick={() => setFilter("custom")}
              >
                ✏️ Custom Overrides ({customCount})
              </button>
            )}
          </div>
        </div>

        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Room &amp; Variant</th>
                <th>Payout Mode</th>
                <th>Ticket Sales</th>
                <th>Target RTP</th>
                <th>House Margin</th>
                <th>Current Prize</th>
                <th>Margin Safety</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => {
                const targetRtp = room.rtp ?? globalTargetRtp;
                const grossSales = room.cardsSold * room.ticketPrice;
                const margin = RTPEngine.calculateHouseMargin(targetRtp, room.jackpot ? 2.5 : 0);
                const health = RTPEngine.getHealthStatus(room, globalTargetRtp);

                return (
                  <tr key={room.id}>
                    <td>
                      <div className="table-room">
                        <span className={`mini-orb accent-${room.accent}`}>{room.variant.match(/\d+/)?.[0] ?? "T"}</span>
                        <div>
                          <b>{room.name}</b>
                          <small>{room.variant} · {room.ticketPrice > 0 ? money(room.ticketPrice) : "Free Card"}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`rtp-mode-pill ${room.rtpMode === "dynamic" ? "mode-dynamic" : "mode-fixed"}`}
                        onClick={() => toggleRoomMode(room.id)}
                        title="Click to toggle between Dynamic Pool and Guaranteed Fixed"
                      >
                        {room.rtpMode === "dynamic" ? "⚡ Dynamic Pool" : "🔒 Guaranteed"}
                      </button>
                    </td>
                    <td>
                      <b>{money(grossSales)}</b>
                      <small style={{ display: "block", color: "var(--muted)" }}>{room.cardsSold.toLocaleString()} tickets sold</small>
                    </td>
                    <td>
                      <div className="rtp-stepper-control">
                        <button
                          type="button"
                          className="rtp-step-btn"
                          onClick={() => updateRoomRtp(room.id, -1)}
                          title="Decrease RTP"
                        >
                          −
                        </button>
                        <span className="rtp-stepper-val">
                          <b>{targetRtp}%</b>
                          {room.customRtp && <small className="custom-tag">Custom</small>}
                        </span>
                        <button
                          type="button"
                          className="rtp-step-btn"
                          onClick={() => updateRoomRtp(room.id, 1)}
                          title="Increase RTP"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td>
                      <b style={{ color: "#2563eb" }}>{margin}%</b>
                    </td>
                    <td>
                      <b>{money(room.prize)}</b>
                      <small style={{ display: "block", color: room.rtpMode === "dynamic" ? "#059669" : "var(--muted)" }}>
                        {room.rtpMode === "dynamic" ? "⚡ Auto-scaled" : "🔒 Guaranteed"}
                      </small>
                    </td>
                    <td>
                      <span className={`rtp-health-badge ${health.badgeClass}`} title={health.hint}>
                        {health.label}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        {room.rtpMode === "dynamic" && (
                          <button
                            type="button"
                            onClick={() => recalcRoom(room.id)}
                            title="Recalculate prize from current tickets sold"
                          >
                            Recalc
                          </button>
                        )}
                        {room.customRtp && (
                          <button
                            type="button"
                            onClick={() => resetToGlobal(room.id)}
                            title="Reset to global target RTP"
                          >
                            Reset
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openAction({ kind: "edit-room", room })}
                          title="Edit room configuration"
                        >
                          Configure
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
