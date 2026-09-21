import { useCallback, useEffect, useState } from "react";
import { apiClient, type TournamentModel } from "../../api-client";
import type { AdminAction } from "../shared/types";

export function TournamentAdmin({
  notify,
  openAction,
}: {
  notify: (message: string) => void;
  openAction: (action: AdminAction) => void;
}) {
  const [tournaments, setTournaments] = useState<TournamentModel[]>([]);
  const [selectedId, setSelectedId] = useState<string>("weekend-cup");
  const [loadingAction, setLoadingAction] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTourneyName, setNewTourneyName] = useState("");
  const [newTourneyFee, setNewTourneyFee] = useState(10);
  const [newTourneyPrize, setNewTourneyPrize] = useState(15000);
  const [newTourneyMaxPlayers, setNewTourneyMaxPlayers] = useState(256);
  const [newTourneyStages, setNewTourneyStages] = useState(4);
  const [newTourneyStartsAt, setNewTourneyStartsAt] = useState("Tonight · 20:00");
  const [newTourneyDesc, setNewTourneyDesc] = useState("Multi-round progressive elimination tournament.");
  const [newTourneyVariant, setNewTourneyVariant] = useState<"75-Ball Pattern" | "90-Ball Classic" | "30-Ball Speed" | "80-Ball Shutter">("75-Ball Pattern");
  const [newTourneyCardsPerPlayer, setNewTourneyCardsPerPlayer] = useState<number>(1);
  const [newTourneyOpenBalls, setNewTourneyOpenBalls] = useState<number>(30);
  const [customScheduleSeconds, setCustomScheduleSeconds] = useState<number>(30);

  const refreshTournaments = useCallback(() => {
    apiClient.tournaments.list().then((list) => {
      if (list && list.length > 0) {
        setTournaments(list);
        if (!list.some((t) => t.id === selectedId)) {
          setSelectedId(list[0].id);
        }
      }
    }).catch(() => {});
  }, [selectedId]);

  useEffect(() => {
    refreshTournaments();
    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "tournaments") {
        refreshTournaments();
      }
    });
    return unsub;
  }, [refreshTournaments]);

  const active = tournaments.find((t) => t.id === selectedId) || tournaments[0] || {
    id: "weekend-cup",
    name: "Trueigtech Weekend Cup",
    entryFee: 8.0,
    prizePool: 25000,
    registeredPlayers: ["Ari.R", "LuckyStar"],
    maxPlayers: 512,
    status: "Registration open",
    rounds: ["Qualifiers", "Round of 256", "Round of 128", "Semi Final", "Grand Final"],
    currentRoundIndex: 0,
    currentStageName: "Qualifiers",
    stageStatus: "waiting",
    standings: [],
  };

  const roundsList: string[] = Array.isArray(active.rounds)
    ? active.rounds
    : ["Qualifiers", "Round of 256", "Round of 128", "Semi Final", "Grand Final"];

  const currentRoundIndex = active.currentRoundIndex ?? 0;
  const currentStageName = active.currentStageName || roundsList[currentRoundIndex] || "Qualifiers";
  const registeredCount = active.registeredPlayers?.length ?? 385;
  const standings = active.standings || [];

  // Stage execution handlers
  const handleStartTournament = async () => {
    setLoadingAction(true);
    try {
      await apiClient.tournaments.start(active.id);
      refreshTournaments();
      notify(`✓ "${active.name}" launched! Stage 1 (${roundsList[0]}) is now live.`);
    } catch {
      notify("Failed to start tournament.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleScoreStage = async () => {
    setLoadingAction(true);
    try {
      await apiClient.tournaments.scoreStage(active.id);
      refreshTournaments();
      notify(`✓ Stage ${currentRoundIndex + 1} (${currentStageName}) scored and standings updated!`);
    } catch {
      notify("Failed to score tournament stage.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAdvanceStage = async () => {
    setLoadingAction(true);
    try {
      await apiClient.tournaments.advance(active.id);
      refreshTournaments();
      const nextStage = roundsList[currentRoundIndex + 1] || "Next Stage";
      notify(`✓ Tournament advanced to Stage ${currentRoundIndex + 2}: ${nextStage}!`);
    } catch {
      notify("Failed to advance stage.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCompleteTournament = async () => {
    setLoadingAction(true);
    try {
      const winner = standings[0]?.player || "Ari.R";
      const res = await apiClient.tournaments.complete(active.id, winner);
      refreshTournaments();
      const payoutText = res && res.payout > 0 ? ` $${res.payout.toLocaleString()} awarded to wallet!` : "";
      notify(`🏆 Tournament complete! Champion: ${winner}.${payoutText}`);
    } catch {
      notify("Failed to finalize tournament.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResetTournament = async () => {
    setLoadingAction(true);
    try {
      await apiClient.tournaments.reset(active.id);
      refreshTournaments();
      notify(`✓ Tournament "${active.name}" reset to initial registration state.`);
    } catch {
      notify("Failed to reset tournament.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleAutoMode = async () => {
    setLoadingAction(true);
    try {
      const newMode = active.engine ? !active.engine.autoMode : false;
      await apiClient.tournaments.setAutoConfig(active.id, { autoMode: newMode });
      refreshTournaments();
      notify(`⚡ Auto-Progression Engine is now ${newMode ? "ACTIVE (Hands-Free)" : "PAUSED (Manual Controls)"}`);
    } catch {
      notify("Failed to update auto-engine setting.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSetRoundDuration = async (seconds: number) => {
    try {
      await apiClient.tournaments.setAutoConfig(active.id, { roundDuration: seconds });
      refreshTournaments();
      notify(`⏱ Round duration set to ${seconds}s per stage.`);
    } catch {
      notify("Failed to update round duration.");
    }
  };

  const handleScheduleStart = async (seconds: number) => {
    setLoadingAction(true);
    try {
      await apiClient.tournaments.schedule(active.id, seconds);
      refreshTournaments();
      notify(`⏳ Tournament scheduled! Countdown active: starting in ${seconds}s.`);
    } catch {
      notify("Failed to schedule tournament.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelSchedule = async () => {
    setLoadingAction(true);
    try {
      await apiClient.tournaments.schedule(active.id, 0, true);
      refreshTournaments();
      notify("Tournament start countdown cancelled.");
    } catch {
      notify("Failed to cancel schedule.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTourneyName.trim()) {
      notify("Please provide a tournament name.");
      return;
    }
    setLoadingAction(true);
    try {
      let stagesList = ["Qualifiers", "Round of 128", "Semi Final", "Grand Final"];
      if (newTourneyStages === 3) {
        stagesList = newTourneyVariant === "30-Ball Speed"
          ? ["Sprint Qualifiers", "Semi-Sprint", "Speed Final"]
          : ["Sprint Qualifiers", "Eliminator", "Grand Championship"];
      } else if (newTourneyStages === 5) {
        stagesList = ["Open Qualifiers", "Round of 256", "Round of 128", "Semi Final", "Grand Final"];
      }

      const stagePatterns = newTourneyVariant === "90-Ball Classic"
        ? (newTourneyStages === 3 ? ["One Line", "Two Lines", "Full House"] : ["One Line", "One Line", "Two Lines", "Full House"])
        : newTourneyVariant === "30-Ball Speed"
        ? (newTourneyStages === 3 ? ["One Line", "Two Lines", "Speed Full House"] : ["One Line", "One Line", "Two Lines", "Speed Full House"])
        : (newTourneyStages === 3 ? ["One Line", "Diamond", "Full House"] : newTourneyStages === 5 ? ["One Line", "Four Corners", "X Pattern", "Diamond", "Full House"] : ["One Line", "Four Corners", "Diamond", "Full House"]);

      const id = newTourneyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const res = await apiClient.tournaments.create({
        id,
        name: newTourneyName.trim(),
        description: newTourneyDesc.trim(),
        entryFee: Number(newTourneyFee),
        prizePool: Number(newTourneyPrize),
        maxPlayers: Number(newTourneyMaxPlayers),
        startsAt: newTourneyStartsAt,
        status: "Registration open",
        rounds: stagesList,
        variant: newTourneyVariant,
        cardsPerPlayer: Number(newTourneyCardsPerPlayer),
        maxOpenBalls: Number(newTourneyOpenBalls),
        stagePatterns,
      });

      if (res && res.success) {
        setShowCreateModal(false);
        setNewTourneyName("");
        refreshTournaments();
        setSelectedId(res.tournament.id);
        notify(`✓ Tournament "${res.tournament.name}" created successfully!`);
      } else {
        notify("Failed to create tournament.");
      }
    } catch {
      notify("Failed to create tournament.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteTournament = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete tournament "${name}"?`)) return;
    setLoadingAction(true);
    try {
      await apiClient.tournaments.delete(id);
      refreshTournaments();
      notify(`✓ Tournament "${name}" deleted.`);
    } catch {
      notify("Failed to delete tournament.");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="tournament-admin-grid">
      {/* Multi-Tournament Switcher Tabs */}
      <div style={{ gridColumn: "1 / -1", marginBottom: "8px" }}>
        <div className="admin-tourney-tabs">
          {tournaments.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`admin-tourney-tab ${t.id === active.id ? "active" : ""}`}
              onClick={() => setSelectedId(t.id)}
            >
              <span>{t.name}</span>
              <span className="tab-badge">
                ${Number(t.prizePool).toLocaleString()} · {t.status}
              </span>
            </button>
          ))}
          <button
            type="button"
            className="admin-create-tourney-btn"
            onClick={() => setShowCreateModal(true)}
          >
            + Create New Tournament
          </button>
        </div>
      </div>

      <section className="admin-card tournament-admin-feature">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span className={`status ${active.status === "Live" ? "status-live" : active.status === "Completed" ? "status-success" : "status-selling-tickets"}`}>
              <i /> {active.status || "Registration open"}
            </span>
            <h2>{active.name}</h2>
            <p>ID: {active.id} · {roundsList.length}-round progressive elimination · {currentStageName}</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {tournaments.length > 1 && (
              <>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "6px 12px" }}
                >
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => handleDeleteTournament(active.id, active.name)}
                  disabled={loadingAction}
                  style={{ fontSize: "11px", color: "#d13b33", borderColor: "#fca5a5" }}
                  title="Delete this tournament"
                >
                  🗑 Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="tournament-admin-stats">
          <span>
            <small>ENTRY FEE</small>
            <b>${Number(active.entryFee).toFixed(2)}</b>
          </span>
          <span>
            <small>PRIZE POOL</small>
            <b>${Number(active.prizePool).toLocaleString()}</b>
          </span>
          <span>
            <small>PLAYERS</small>
            <b>{registeredCount} / {active.maxPlayers || 512}</b>
          </span>
          <span>
            <small>CURRENT STAGE</small>
            <b style={{ color: "var(--accent-teal, #2bddaa)" }}>
              {active.status === "Completed" ? "Completed 🏆" : `${currentRoundIndex + 1}/${roundsList.length} · ${currentStageName}`}
            </b>
          </span>
          <span>
            <small>VARIANT</small>
            <b style={{ color: "#feca57" }}>{active.variant || "75-Ball Pattern"}</b>
          </span>
          <span>
            <small>CARDS / PLAYER</small>
            <b>{active.cardsPerPlayer || 1} Card{(active.cardsPerPlayer || 1) > 1 ? "s" : ""}</b>
          </span>
          <span>
            <small>BALL LIMIT</small>
            <b>{active.maxOpenBalls || 30} Balls</b>
          </span>
        </div>

        {/* Stage Timeline Rail */}
        <div className="tournament-rounds">
          {roundsList.map((item, index) => {
            const isPassed = active.status === "Completed" || (active.status === "Live" && index < currentRoundIndex);
            const isCurrent = active.status === "Live" && index === currentRoundIndex;
            return (
              <div
                className={`${isCurrent ? "active" : ""} ${isPassed ? "complete" : ""}`}
                key={item}
                style={isPassed ? { borderColor: "var(--accent-teal, #2bddaa)", opacity: 0.9 } : undefined}
              >
                <i>{isPassed ? "✓" : index + 1}</i>
                <span>
                  <b>{item}</b>
                  <small>
                    {isCurrent
                      ? (active.stageStatus === "scored" ? "🏁 Scored" : "LIVE NOW")
                      : isPassed
                        ? "Completed"
                        : index === 0
                          ? "512 → 256"
                          : index === 1
                            ? "256 → 128"
                            : index === 2
                              ? "128 → 16"
                              : index === 3
                                ? "16 → 8"
                                : "1 Champion"}
                  </small>
                </span>
              </div>
            );
          })}
        </div>

        {/* Automated Progression Engine Toolbar */}
        <div className="tournament-engine-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span className={`engine-badge ${
              active.status === "Live" && active.engine?.autoMode ? "active" :
              active.engine?.scheduledStartSeconds ? "countdown" : "idle"
            }`}>
              {active.status === "Live" && active.engine?.autoMode
                ? `⚡ Auto-Engine Active · Stage cut in ${active.engine.stageSecondsRemaining ?? 15}s`
                : active.engine?.scheduledStartSeconds
                  ? `⏳ Auto-Start Countdown: ${active.engine.scheduledStartSeconds}s`
                  : "⚡ Auto-Engine Ready"}
            </span>

            <button
              type="button"
              className={active.engine?.autoMode ? "admin-primary" : "outline-button"}
              onClick={handleToggleAutoMode}
              disabled={loadingAction}
              style={{ fontSize: "12px", padding: "6px 12px" }}
            >
              {active.engine?.autoMode ? "⚡ Auto-Run: ON" : "⏸ Auto-Run: OFF"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                Round Speed:
              </label>
              <select
                value={active.engine?.roundDuration || 15}
                onChange={(e) => handleSetRoundDuration(Number(e.target.value))}
                style={{
                  background: "#fff",
                  border: "1px solid #dcdfe6",
                  borderRadius: "6px",
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#1e202c",
                  cursor: "pointer",
                }}
              >
                <option value={10}>10s (Fast Demo)</option>
                <option value={15}>15s (Default)</option>
                <option value={30}>30s (Medium)</option>
                <option value={60}>60s (Standard)</option>
              </select>
            </div>
          </div>

          {/* Schedule Launch / Timer Controls */}
          {active.status === "Registration open" && (
            <div style={{
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  ⏱ Tournament Start Scheduler (Backoffice Only)
                </span>
                {active.engine?.scheduledStartSeconds ? (
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(254, 202, 87, 0.15)",
                    border: "1px solid rgba(254, 202, 87, 0.4)",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#feca57",
                  }}>
                    ⏳ Auto-Start in {active.engine.scheduledStartSeconds}s
                  </span>
                ) : (
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Players in room see "Awaiting Tournament Start" until scheduled or launched
                  </span>
                )}
              </div>

              {active.engine?.scheduledStartSeconds ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={handleCancelSchedule}
                    disabled={loadingAction}
                    style={{ fontSize: "12px", padding: "6px 14px", color: "#e74c3c", borderColor: "rgba(231, 76, 60, 0.5)", fontWeight: 700 }}
                  >
                    ✕ Cancel Countdown Timer
                  </button>
                  <button
                    type="button"
                    className="admin-primary"
                    onClick={handleStartTournament}
                    disabled={loadingAction}
                    style={{ fontSize: "12px", padding: "6px 14px", background: "linear-gradient(135deg, #2bddaa, #00b894)", color: "#000", fontWeight: 800 }}
                  >
                    🚀 Override & Launch Live Now
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
                    Quick Presets:
                  </span>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => handleScheduleStart(15)}
                    disabled={loadingAction}
                    style={{ fontSize: "11px", padding: "5px 10px" }}
                  >
                    ⏱ 15s
                  </button>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => handleScheduleStart(30)}
                    disabled={loadingAction}
                    style={{ fontSize: "11px", padding: "5px 10px" }}
                  >
                    ⏱ 30s
                  </button>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => handleScheduleStart(60)}
                    disabled={loadingAction}
                    style={{ fontSize: "11px", padding: "5px 10px" }}
                  >
                    ⏱ 1m
                  </button>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => handleScheduleStart(120)}
                    disabled={loadingAction}
                    style={{ fontSize: "11px", padding: "5px 10px" }}
                  >
                    ⏱ 2m
                  </button>
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => handleScheduleStart(300)}
                    disabled={loadingAction}
                    style={{ fontSize: "11px", padding: "5px 10px" }}
                  >
                    ⏱ 5m
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "6px" }}>
                    <input
                      type="number"
                      min={5}
                      max={3600}
                      step={5}
                      value={customScheduleSeconds}
                      onChange={(e) => setCustomScheduleSeconds(Math.max(5, Number(e.target.value)))}
                      style={{
                        width: "60px",
                        padding: "5px 8px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "rgba(0,0,0,0.3)",
                        color: "#fff",
                        textAlign: "center",
                      }}
                    />
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>sec</span>
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => handleScheduleStart(customScheduleSeconds)}
                      disabled={loadingAction}
                      style={{ fontSize: "11px", padding: "5px 10px", borderColor: "#2bddaa", color: "#2bddaa", fontWeight: 700 }}
                    >
                      Set Timer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stage Control Operator Actions */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "10px",
          padding: "16px",
          marginTop: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase" }}>
              Stage Operator Console
            </span>
            <h3 style={{ margin: "3px 0 0", fontSize: "15px" }}>
              {active.status === "Registration open" && (
                active.engine?.scheduledStartSeconds
                  ? `⏳ Scheduled: Auto-starting in ${active.engine.scheduledStartSeconds}s`
                  : "⚡ Standby: Tournament awaiting operator launch or schedule"
              )}
              {active.status === "Live" && `Active Stage: ${currentStageName} (${active.stageStatus === "scored" ? "Scored" : "In Progress"})`}
              {active.status === "Completed" && `Tournament Complete · Champion: ${active.winner || "Ari.R"}`}
            </h3>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {active.status === "Registration open" && (
              <>
                <button
                  type="button"
                  className="admin-primary tournament-start-button"
                  disabled={loadingAction}
                  onClick={handleStartTournament}
                  style={{
                    background: "linear-gradient(135deg, #2bddaa, #00b894)",
                    color: "#000",
                    fontWeight: 800,
                  }}
                >
                  🚀 Launch Live Now ({roundsList[0]})
                </button>
                {active.engine?.scheduledStartSeconds && (
                  <button
                    type="button"
                    className="outline-button"
                    disabled={loadingAction}
                    onClick={handleCancelSchedule}
                    style={{ color: "#e74c3c", borderColor: "rgba(231, 76, 60, 0.5)" }}
                  >
                    ✕ Cancel Timer
                  </button>
                )}
              </>
            )}

            {active.status === "Live" && (
              <>
                <button
                  type="button"
                  className="admin-primary tournament-score-button"
                  disabled={loadingAction}
                  onClick={handleScoreStage}
                >
                  🎲 Score Stage {currentRoundIndex + 1}
                </button>

                {currentRoundIndex < roundsList.length - 1 ? (
                  <button
                    type="button"
                    className="outline-button tournament-advance-button"
                    disabled={loadingAction || active.stageStatus !== "scored"}
                    onClick={handleAdvanceStage}
                    style={{ background: active.stageStatus === "scored" ? "rgba(43, 221, 170, 0.15)" : undefined, borderColor: active.stageStatus === "scored" ? "#2bddaa" : undefined }}
                  >
                    ⏩ Advance to Stage {currentRoundIndex + 2} ({roundsList[currentRoundIndex + 1]})
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-primary tournament-complete-button"
                    disabled={loadingAction || active.stageStatus !== "scored"}
                    onClick={handleCompleteTournament}
                    style={{ background: "linear-gradient(135deg, #feca57, #ff9f43)", color: "#111", border: 0 }}
                  >
                    🏆 Crown Champion & Pay Out $15,000
                  </button>
                )}
              </>
            )}

            {active.status === "Completed" && (
              <button
                type="button"
                className="outline-button tournament-reset-button"
                disabled={loadingAction}
                onClick={handleResetTournament}
              >
                ↺ Reset Tournament
              </button>
            )}
          </div>
        </div>

        {/* Live Tournament Standings */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 style={{ fontSize: "14px", margin: 0 }}>Tournament Bracket & Standings</h3>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              {standings.length} contenders · Updated live
            </span>
          </div>
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Contender</th>
                  <th>Total Points</th>
                  <th>Stage Wins</th>
                  <th>Fastest Bingo</th>
                  <th>Round Status</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr
                    key={s.player}
                    style={s.player === "Ari.R" ? { background: "rgba(122, 102, 244, 0.12)" } : undefined}
                  >
                    <td><b>#{s.rank}</b></td>
                    <td>
                      <span style={{ fontWeight: s.player === "Ari.R" ? 800 : 600 }}>
                        {s.player} {s.player === "Ari.R" && "(Current Player)"}
                      </span>
                    </td>
                    <td><b>{s.points} pts</b></td>
                    <td>{s.wins} wins</td>
                    <td><small>{s.fast || "25 balls"}</small></td>
                    <td>
                      <span className={`table-status ${
                        s.status === "Champion" ? "success" : s.status === "Qualified" ? "success" : s.status === "Eliminated" ? "danger" : "warning"
                      }`}>
                        {s.status === "Champion" && "🏆 "}
                        {s.status === "Qualified" && "✓ "}
                        {s.status === "Eliminated" && "✗ "}
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pattern-actions" style={{ marginTop: "20px" }}>
          <button className="outline-button" onClick={() => openAction({ kind: "edit-tournament" })}>
            Edit tournament settings
          </button>
          <button className="admin-primary" onClick={() => notify(`Tournament "${active.name}" broadcast to all connected players.`)}>
            Broadcast tournament update
          </button>
        </div>
      </section>

      <aside className="admin-card">
        <div className="card-title">
          <div>
            <h2>Points rules</h2>
            <p>Scoring formula per round</p>
          </div>
          <button onClick={() => openAction({ kind: "edit-tournament" })}>Edit</button>
        </div>
        <div className="points-list">
          {[
            ["Line win", "10 pts"],
            ["Pattern win", "25 pts"],
            ["Full house", "50 pts"],
            ["Fast Bingo bonus", "+15 pts"],
            ["Round winner", "+40 pts"],
            ["1st Place Champion", "$15,000 (60%)"],
            ["2nd Place Runner-up", "$6,250 (25%)"],
            ["3rd Place Semi-finalist", "$3,750 (15%)"],
          ].map((row) => (
            <div key={row[0]}>
              <span>{row[0]}</span>
              <b>{row[1]}</b>
            </div>
          ))}
        </div>
        <button className="full-outline" onClick={() => setShowCreateModal(true)}>
          + Create tournament
        </button>
      </aside>

      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#fff", color: "#1e202c", borderRadius: "14px", maxWidth: "540px", width: "100%", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)", position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              style={{ position: "absolute", top: "18px", right: "18px", background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}
            >
              ✕
            </button>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "20px", fontWeight: 800 }}>Create New Tournament</h2>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#6b7280" }}>
              Configure tournament parameters, prize pool, stage tiers, and start schedule.
            </p>
            <form onSubmit={handleCreateTournament} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>Tournament Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunday High Roller Championship"
                  value={newTourneyName}
                  onChange={(e) => setNewTourneyName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>Description</label>
                <input
                  type="text"
                  value={newTourneyDesc}
                  onChange={(e) => setNewTourneyDesc(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>Entry Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={newTourneyFee}
                    onChange={(e) => setNewTourneyFee(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>Prize Pool ($)</label>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    required
                    value={newTourneyPrize}
                    onChange={(e) => setNewTourneyPrize(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>Max Contenders</label>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    required
                    value={newTourneyMaxPlayers}
                    onChange={(e) => setNewTourneyMaxPlayers(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>Number of Stages</label>
                  <select
                    value={newTourneyStages}
                    onChange={(e) => setNewTourneyStages(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                  >
                    <option value={3}>3 Stages (Sprint / Blitz)</option>
                    <option value={4}>4 Stages (Masters / Standard)</option>
                    <option value={5}>5 Stages (Grand Championship)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>Game Variant (Ball Type)</label>
                  <select
                    value={newTourneyVariant}
                    onChange={(e) => {
                      const v = e.target.value as any;
                      setNewTourneyVariant(v);
                      if (v === "30-Ball Speed") setNewTourneyOpenBalls(20);
                      else if (v === "90-Ball Classic") setNewTourneyOpenBalls(35);
                      else if (v === "80-Ball Shutter") setNewTourneyOpenBalls(28);
                      else setNewTourneyOpenBalls(30);
                    }}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                  >
                    <option value="75-Ball Pattern">75-Ball Pattern (5x5)</option>
                    <option value="90-Ball Classic">90-Ball Classic (3x9)</option>
                    <option value="30-Ball Speed">30-Ball Speed (3x3)</option>
                    <option value="80-Ball Shutter">80-Ball Shutter (4x4)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>Cards / Player</label>
                  <select
                    value={newTourneyCardsPerPlayer}
                    onChange={(e) => setNewTourneyCardsPerPlayer(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                  >
                    <option value={1}>1 Card (Standard)</option>
                    <option value={2}>2 Cards</option>
                    <option value={4}>4 Cards</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>Open Ball Limit</label>
                  <input
                    type="number"
                    min="10"
                    max="75"
                    value={newTourneyOpenBalls}
                    onChange={(e) => setNewTourneyOpenBalls(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>Start Schedule Text</label>
                <input
                  type="text"
                  value={newTourneyStartsAt}
                  onChange={(e) => setNewTourneyStartsAt(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-primary"
                  disabled={loadingAction}
                  style={{ padding: "8px 18px", fontWeight: 800 }}
                >
                  {loadingAction ? "Creating..." : "Create Tournament"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

