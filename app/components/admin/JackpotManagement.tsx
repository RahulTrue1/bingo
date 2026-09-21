import { useCallback, useEffect, useState } from "react";
import { apiClient, type JackpotModel } from "../../api-client";
import { money, type AdminAction } from "../shared/types";
import type { BingoRoomData } from "../../bingo-core";

export function JackpotManagement({
  notify,
  openAction,
}: {
  notify: (message: string) => void;
  openAction: (action: AdminAction) => void;
}) {
  const [jackpots, setJackpots] = useState<JackpotModel[]>([]);
  const [rooms, setRooms] = useState<BingoRoomData[]>([]);
  const [selectedId, setSelectedId] = useState<string>("mega-trueig");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contribAmount, setContribAmount] = useState(1000);

  // Form state for create / edit
  const [formName, setFormName] = useState("");
  const [formVariant, setFormVariant] = useState("75-Ball Progressive");
  const [formStarting, setFormStarting] = useState(10000);
  const [formCurrent, setFormCurrent] = useState(10000);
  const [formMax, setFormMax] = useState(100000);
  const [formReset, setFormReset] = useState(10000);
  const [formContrib, setFormContrib] = useState(2.0);
  const [formPattern, setFormPattern] = useState("Full House in 42 balls");
  const [formBallLimit, setFormBallLimit] = useState(42);
  const [formPrice, setFormPrice] = useState(2);
  const [formDifficulty, setFormDifficulty] = useState("Medium");
  const [formReward, setFormReward] = useState("Huge");
  const [formIconKey, setFormIconKey] = useState<"diamond" | "star" | "club">("diamond");
  const [formLinkedRooms, setFormLinkedRooms] = useState<string[]>([]);

  const refreshJackpots = useCallback(() => {
    apiClient.jackpots.list().then((list) => {
      if (list && list.length > 0) {
        setJackpots(list);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshJackpots();
    apiClient.rooms.list().then((res) => {
      if (res) setRooms(res);
    }).catch(() => {});

    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "jackpots" || event.entity === "rooms") {
        refreshJackpots();
      }
    });
    return unsub;
  }, [refreshJackpots]);

  const active = jackpots.find((j) => j.id === selectedId) || jackpots[0] || {
    id: "mega-trueig",
    name: "Mega Trueig Jackpot",
    variant: "75-Ball Progressive",
    currentAmount: 125480.6,
    startingAmount: 50000,
    contributionPercent: 2.5,
    maximumAmount: 250000,
    resetAmount: 50000,
    qualifyingPattern: "Full House in 42 balls",
    qualifyingBallLimit: 42,
    enabled: true,
    linkedRooms: ["mega-jackpot", "diamond-75"],
    price: 5,
    players: 127,
    difficulty: "Legendary",
    reward: "Life-changing",
    iconKey: "diamond",
    history: [],
  };

  const liabilityPct = Math.min(
    100,
    Math.round(((active.currentAmount) / (active.maximumAmount || 250000)) * 1000) / 10
  );

  const openCreateModal = () => {
    setFormName("");
    setFormVariant("75-Ball Progressive");
    setFormStarting(10000);
    setFormCurrent(10000);
    setFormMax(100000);
    setFormReset(10000);
    setFormContrib(2.0);
    setFormPattern("Full House in 42 balls");
    setFormBallLimit(42);
    setFormPrice(2);
    setFormDifficulty("Medium");
    setFormReward("Huge");
    setFormIconKey("diamond");
    setFormLinkedRooms([]);
    setShowCreateModal(true);
  };

  const openEditCurrentModal = () => {
    setFormName(active.name);
    setFormVariant(active.variant || "75-Ball Progressive");
    setFormStarting(active.startingAmount || 10000);
    setFormCurrent(active.currentAmount || 10000);
    setFormMax(active.maximumAmount || 100000);
    setFormReset(active.resetAmount || active.startingAmount || 10000);
    setFormContrib(active.contributionPercent || 2.0);
    setFormPattern(active.qualifyingPattern || "Full House in 42 balls");
    setFormBallLimit(active.qualifyingBallLimit || 42);
    setFormPrice(active.price || 2);
    setFormDifficulty(active.difficulty || "Medium");
    setFormReward(active.reward || "Huge");
    setFormIconKey(active.iconKey || "diamond");
    setFormLinkedRooms(active.linkedRooms || []);
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      notify("Please provide a jackpot name");
      return;
    }
    const res = await apiClient.jackpots.create({
      name: formName.trim(),
      variant: formVariant,
      startingAmount: Number(formStarting),
      currentAmount: Number(formCurrent),
      maximumAmount: Number(formMax),
      resetAmount: Number(formReset),
      contributionPercent: Number(formContrib),
      qualifyingPattern: formPattern,
      qualifyingBallLimit: Number(formBallLimit),
      price: Number(formPrice),
      difficulty: formDifficulty,
      reward: formReward,
      iconKey: formIconKey,
      linkedRooms: formLinkedRooms,
      enabled: true,
    });
    if (res?.success) {
      notify(`✓ New progressive jackpot "${formName}" created and live!`);
      setShowCreateModal(false);
      refreshJackpots();
      if (res.jackpot?.id) setSelectedId(res.jackpot.id);
    } else {
      notify("Error creating jackpot.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiClient.jackpots.update(active.id, {
      name: formName.trim() || active.name,
      variant: formVariant,
      startingAmount: Number(formStarting),
      currentAmount: Number(formCurrent),
      maximumAmount: Number(formMax),
      resetAmount: Number(formReset),
      contributionPercent: Number(formContrib),
      qualifyingPattern: formPattern,
      qualifyingBallLimit: Number(formBallLimit),
      price: Number(formPrice),
      difficulty: formDifficulty,
      reward: formReward,
      iconKey: formIconKey,
      linkedRooms: formLinkedRooms,
    });
    if (res?.success) {
      notify(`✓ Jackpot "${active.name}" configuration updated!`);
      setShowEditModal(false);
      refreshJackpots();
    } else {
      notify("Error updating jackpot.");
    }
  };

  const toggleLinkedRoom = (roomId: string) => {
    setFormLinkedRooms((prev) =>
      prev.includes(roomId) ? prev.filter((r) => r !== roomId) : [...prev, roomId]
    );
  };

  const handleToggleEnabled = async () => {
    const newStatus = !Boolean(active.enabled);
    await apiClient.jackpots.update(active.id, { enabled: newStatus });
    refreshJackpots();
    notify(`Jackpot ${active.name} is now ${newStatus ? "Enabled" : "Disabled"}.`);
  };

  const handleContribute = async () => {
    await apiClient.jackpots.contribute(active.id, contribAmount);
    refreshJackpots();
    setShowContributeModal(false);
    notify(`✓ Added ${money(contribAmount)} contribution to ${active.name}!`);
  };

  const handleTriggerWin = async () => {
    const winner = prompt("Enter the player username to award this jackpot to:", "Ari.R") || "Ari.R";
    const res = await apiClient.jackpots.trigger(active.id, winner);
    if (res?.success) {
      refreshJackpots();
      notify(`🏆 ${winner} WON ${money(res.payout)} in ${active.name}! Prize credited to wallet.`);
    } else {
      notify("Error awarding jackpot.");
    }
  };

  const handleReset = async () => {
    if (confirm(`Reset ${active.name} to its base reset amount of ${money(active.resetAmount || active.startingAmount)}?`)) {
      await apiClient.jackpots.reset(active.id);
      refreshJackpots();
      notify(`✓ ${active.name} reset to ${money(active.resetAmount || active.startingAmount)}.`);
    }
  };

  const handleDelete = async () => {
    if (jackpots.length <= 1) {
      notify("Cannot delete the only remaining jackpot.");
      return;
    }
    if (confirm(`Are you sure you want to permanently delete "${active.name}"?`)) {
      const res = await apiClient.jackpots.delete(active.id);
      if (res?.success) {
        notify(`✓ Jackpot "${active.name}" deleted.`);
        const remaining = jackpots.filter((j) => j.id !== active.id);
        if (remaining[0]) setSelectedId(remaining[0].id);
        refreshJackpots();
      }
    }
  };

  return (
    <>
      {/* Top Multi-Jackpot Tabs */}
      <div className="admin-tourney-tabs" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", flex: 1, paddingBottom: "4px" }}>
          {jackpots.map((j) => {
            const isSelected = j.id === (active.id);
            return (
              <button
                key={j.id}
                type="button"
                className={`admin-tourney-tab ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedId(j.id)}
              >
                <div style={{ fontWeight: 700, fontSize: "13px" }}>{j.name}</div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px", fontSize: "11px", opacity: 0.85 }}>
                  <span>{money(j.currentAmount)}</span>
                  <span>·</span>
                  <span>{j.variant?.split(" ")[0] || "75-Ball"}</span>
                </div>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="admin-create-tourney-btn"
          onClick={openCreateModal}
          style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <span>+</span> Create New Jackpot
        </button>
      </div>

      {/* Selected Jackpot Hero */}
      <div className="jackpot-admin-hero">
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
            <span className="section-kicker">PROGRESSIVE JACKPOT</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "10px",
                background: active.enabled ? "rgba(43,221,170,0.15)" : "rgba(255,255,255,0.1)",
                color: active.enabled ? "#2bddaa" : "var(--muted)",
                border: `1px solid ${active.enabled ? "rgba(43,221,170,0.3)" : "rgba(255,255,255,0.2)"}`,
              }}
            >
              {active.enabled ? "● LIVE ACTIVE" : "○ DISABLED"}
            </span>
          </div>
          <h2>{active.name}</h2>
          <p>{active.id.toUpperCase()} · {active.variant || "75-Ball Progressive"}</p>
        </div>
        <div>
          <small>CURRENT VALUE</small>
          <strong style={{ color: "#ffd32a" }}>{money(active.currentAmount)}</strong>
          <span>+{active.contributionPercent || 2.0}% per ticket purchase</span>
        </div>
        <div className="jackpot-hero-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            className={`toggle ${active.enabled ? "on" : ""}`}
            onClick={handleToggleEnabled}
            title={active.enabled ? "Disable jackpot" : "Enable jackpot"}
          >
            <i />
          </button>
          <span>{active.enabled ? "Enabled" : "Disabled"}</span>
          <button type="button" onClick={() => setShowContributeModal(true)}>
            + Add contribution
          </button>
          <button
            type="button"
            onClick={handleTriggerWin}
            style={{
              background: "linear-gradient(135deg, #ffd32a, #ff9f1a)",
              color: "#181300",
              fontWeight: 700,
              border: "none",
            }}
          >
            🏆 Trigger Win
          </button>
        </div>
      </div>

      {/* Main Admin Grid */}
      <div className="jackpot-admin-grid">
        {/* Dynamic Configuration Card */}
        <section className="admin-card jackpot-config">
          <div className="card-title">
            <div>
              <h2>Configuration</h2>
              <p>Contribution rates, qualification rules & limits</p>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={openEditCurrentModal}>✎ Edit</button>
              <button
                onClick={handleReset}
                title="Reset jackpot to starting/reset value"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}
              >
                ↺ Reset
              </button>
              {jackpots.length > 1 && (
                <button
                  onClick={handleDelete}
                  title="Delete this jackpot"
                  style={{ background: "rgba(255,71,87,0.15)", color: "#ff4757", borderColor: "rgba(255,71,87,0.3)" }}
                >
                  🗑
                </button>
              )}
            </div>
          </div>
          <div className="config-grid">
            <span>
              <small>STARTING VALUE</small>
              <b>{money(active.startingAmount || 10000)}</b>
            </span>
            <span>
              <small>CONTRIBUTION</small>
              <b>{active.contributionPercent || 2.0}% of ticket sales</b>
            </span>
            <span>
              <small>MAXIMUM CAP</small>
              <b>{money(active.maximumAmount || 250000)}</b>
            </span>
            <span>
              <small>RESET VALUE</small>
              <b>{money(active.resetAmount || active.startingAmount || 10000)}</b>
            </span>
            <span>
              <small>QUALIFYING PATTERN</small>
              <b>{active.qualifyingPattern || "Full House in 42 balls"}</b>
            </span>
            <span>
              <small>BALL REQUIREMENT</small>
              <b>Within {active.qualifyingBallLimit || 42} calls</b>
            </span>
            <span>
              <small>TICKET BASE PRICE</small>
              <b>{money(active.price || 2)}</b>
            </span>
            <span>
              <small>DIFFICULTY / REWARD</small>
              <b>{active.difficulty || "Medium"} · {active.reward || "Huge"}</b>
            </span>
          </div>

          <div style={{ marginTop: "16px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
            <small style={{ display: "block", fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", marginBottom: "6px" }}>
              LINKED BINGO ROOMS
            </small>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {active.linkedRooms && active.linkedRooms.length > 0 ? (
                active.linkedRooms.map((rId) => {
                  const r = rooms.find((x) => x.id === rId);
                  return (
                    <span
                      key={rId}
                      style={{
                        fontSize: "12px",
                        padding: "3px 9px",
                        borderRadius: "6px",
                        background: "rgba(108,92,231,0.2)",
                        color: "#a29bfe",
                        border: "1px solid rgba(108,92,231,0.4)",
                      }}
                    >
                      {r ? r.name : rId}
                    </span>
                  );
                })
              ) : (
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>No specific rooms linked (Available in all {active.variant?.split(" ")[0]} rooms)</span>
              )}
            </div>
          </div>

          <div className="liability-meter" style={{ marginTop: "16px" }}>
            <div>
              <span>Liability vs maximum cap ({money(active.maximumAmount || 250000)})</span>
              <b>{liabilityPct}%</b>
            </div>
            <i>
              <span
                style={{
                  width: `${liabilityPct}%`,
                  background: liabilityPct > 80 ? "linear-gradient(90deg, #ff4757, #ff6b81)" : "linear-gradient(90deg, #2bddaa, #ffd32a)",
                }}
              />
            </i>
          </div>
        </section>

        {/* Dynamic History Card */}
        <section className="admin-card jackpot-history">
          <div className="card-title">
            <div>
              <h2>Contribution & Win History</h2>
              <p>Real-time ticket boosts, adjustments & jackpot payouts</p>
            </div>
            <button onClick={refreshJackpots}>Refresh</button>
          </div>
          {active.history && active.history.length > 0 ? (
            active.history.slice(0, 8).map((row, idx) => {
              const isWin = row.type.includes("Won") || row.type.includes("Payout");
              const isContrib = row.type.includes("contribution") || row.type.includes("Ticket");
              return (
                <div key={`${row.time}-${idx}`} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize: "16px" }}>
                    {isWin ? "🏆" : isContrib ? "↗" : "⚙"}
                  </span>
                  <b style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <span style={{ color: isWin ? "#ffd32a" : "inherit" }}>{row.type}</span>
                    <small style={{ color: "var(--muted)", fontWeight: 400 }}>
                      {row.time} · {row.user || "System"}
                    </small>
                  </b>
                  <strong style={{ color: isWin ? "#ffd32a" : isContrib ? "#2bddaa" : "#74b9ff" }}>
                    {isWin ? `+$${row.amount.toLocaleString()}` : `+$${row.amount.toFixed(2)}`}
                  </strong>
                </div>
              );
            })
          ) : (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--muted)" }}>
              No recorded history for this jackpot yet.
            </div>
          )}
        </section>
      </div>

      {/* Manual Contribution Modal */}
      {showContributeModal && (
        <div className="tourney-modal-backdrop">
          <button className="tourney-modal-scrim" onClick={() => setShowContributeModal(false)} />
          <div className="tourney-rules-modal" style={{ maxWidth: "420px" }}>
            <button className="tourney-modal-close" onClick={() => setShowContributeModal(false)}>✕</button>
            <span className="section-kicker">MANUAL SEED</span>
            <h2>Add Contribution</h2>
            <p>Inject funds directly into {active.name}.</p>
            <div style={{ marginTop: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                Contribution Amount ($)
              </label>
              <input
                type="number"
                step="100"
                value={contribAmount}
                onChange={(e) => setContribAmount(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: 700,
                }}
              />
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                {[500, 1000, 2500, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setContribAmount(val)}
                    style={{
                      flex: 1,
                      padding: "6px",
                      fontSize: "12px",
                      background: contribAmount === val ? "#6c5ce7" : "rgba(255,255,255,0.08)",
                      border: "none",
                      borderRadius: "4px",
                      color: "#fff",
                    }}
                  >
                    +${val}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="admin-primary"
              onClick={handleContribute}
              style={{ width: "100%", marginTop: "20px", padding: "12px" }}
            >
              Confirm +${contribAmount.toLocaleString()} Contribution
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Jackpot Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="tourney-modal-backdrop">
          <button
            className="tourney-modal-scrim"
            onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
          />
          <div className="tourney-rules-modal" style={{ maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
            <button
              className="tourney-modal-close"
              onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
            >
              ✕
            </button>
            <span className="section-kicker">{showCreateModal ? "JACKPOT BUILDER" : "CONFIGURE JACKPOT"}</span>
            <h2>{showCreateModal ? "Create Progressive Jackpot" : `Edit ${active.name}`}</h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>
              Configure progressive pot growth, qualification thresholds, and linked bingo rooms.
            </p>

            <form onSubmit={showCreateModal ? handleCreateSubmit : handleEditSubmit} style={{ display: "grid", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                  Jackpot Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diamond Blitz Jackpot"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                    Game Variant
                  </label>
                  <select
                    value={formVariant}
                    onChange={(e) => setFormVariant(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  >
                    <option value="75-Ball Progressive">75-Ball Progressive</option>
                    <option value="90-Ball Classic">90-Ball Classic</option>
                    <option value="30-Ball Speed">30-Ball Speed</option>
                    <option value="75-Ball Pattern">75-Ball Pattern</option>
                    <option value="80-Ball Shutter">80-Ball Shutter</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                    Contribution Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10"
                    value={formContrib}
                    onChange={(e) => setFormContrib(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                    Starting Seed ($)
                  </label>
                  <input
                    type="number"
                    value={formStarting}
                    onChange={(e) => setFormStarting(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                    Current Value ($)
                  </label>
                  <input
                    type="number"
                    value={formCurrent}
                    onChange={(e) => setFormCurrent(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                    Reset Value ($)
                  </label>
                  <input
                    type="number"
                    value={formReset}
                    onChange={(e) => setFormReset(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                    Maximum Cap ($)
                  </label>
                  <input
                    type="number"
                    value={formMax}
                    onChange={(e) => setFormMax(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                    Ticket Min Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                    Qualifying Pattern
                  </label>
                  <input
                    type="text"
                    value={formPattern}
                    onChange={(e) => setFormPattern(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                    Ball Limit
                  </label>
                  <input
                    type="number"
                    value={formBallLimit}
                    onChange={(e) => setFormBallLimit(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                    Difficulty
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  >
                    <option value="Legendary">Legendary</option>
                    <option value="Hard">Hard</option>
                    <option value="Medium">Medium</option>
                    <option value="Easy">Easy</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                    Reward Tier
                  </label>
                  <select
                    value={formReward}
                    onChange={(e) => setFormReward(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  >
                    <option value="Life-changing">Life-changing</option>
                    <option value="Huge">Huge</option>
                    <option value="Great">Great</option>
                    <option value="Nice">Nice</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                    Card Icon
                  </label>
                  <select
                    value={formIconKey}
                    onChange={(e) => setFormIconKey(e.target.value as "diamond" | "star" | "club")}
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  >
                    <option value="diamond">💎 Diamond</option>
                    <option value="star">⭐ Star</option>
                    <option value="club">♣ Club</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                  Link to Contributing Bingo Rooms
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", maxHeight: "120px", overflowY: "auto", padding: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "6px" }}>
                  {rooms.map((room) => {
                    const checked = formLinkedRooms.includes(room.id);
                    return (
                      <label key={room.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLinkedRoom(room.id)}
                        />
                        <span>{room.name} ({room.variant})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  type="submit"
                  className="admin-primary"
                  style={{ flex: 1, padding: "10px" }}
                >
                  {showCreateModal ? "Create & Launch Jackpot" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                  style={{ padding: "10px 16px", background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", borderRadius: "6px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

