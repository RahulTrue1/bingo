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

      <div className="rtp-kpi-strip">
        <div className="rtp-kpi-card">
          <small>GLOBAL TARGET RTP</small>
          <strong>{globalTargetRtp}%</strong>
          <span>Applied to all non-override rooms</span>
        </div>
        <div className="rtp-kpi-card">
          <small>EXPECTED HOUSE MARGIN</small>
          <strong style={{ color: "#2563eb" }}>{houseMargin}%</strong>
          <span>GGR hold retention rate</span>
        </div>
        <div className="rtp-kpi-card">
          <small>NETWORK AVERAGE RTP</small>
          <strong>{avgTargetRtp}%</strong>
          <span>Across all {rooms.length} active rooms</span>
        </div>
        <div className="rtp-kpi-card">
          <small>DYNAMIC POOL ROOMS</small>
          <strong style={{ color: "#059669" }}>{dynamicCount}</strong>
          <span>Auto-adjust prize to sales</span>
        </div>
        <div className="rtp-kpi-card">
          <small>GUARANTEED FIXED ROOMS</small>
          <strong>{fixedCount}</strong>
          <span>Fixed minimum prize pool</span>
        </div>
      </div>

      <section className="admin-card rtp-global-card">
        <div className="rtp-global-header">
          <div>
            <h2>Network-Wide RTP Policy Control</h2>
            <p>One-click apply global payout target to all standard rooms. Changes take effect on next game round.</p>
          </div>
          <button
            type="button"
            className="admin-primary"
            onClick={() => openAction({ kind: "apply-global-rtp" })}
          >
            ⚙ Advanced Policy Settings
          </button>
        </div>

        <div className="rtp-presets-row">
          <span className="rtp-presets-label">Preset Profiles:</span>
          {[
            { label: "Aggressive Hold (72% RTP · 25.5% Margin)", rtp: 72 },
            { label: "Balanced Standard (78% RTP · 19.5% Margin)", rtp: 78 },
            { label: "Player Friendly (82% RTP · 15.5% Margin)", rtp: 82 },
            { label: "High Volume / Promo (88% RTP · 9.5% Margin)", rtp: 88 },
          ].map((preset) => (
            <button
              type="button"
              key={preset.rtp}
              className={`rtp-preset-btn ${globalTargetRtp === preset.rtp ? "active" : ""}`}
              onClick={() => applyGlobalRtp(preset.rtp)}
            >
              {preset.label}
            </button>
          ))}
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
