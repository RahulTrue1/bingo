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

  return (
    <div className="tournament-admin-grid">
      <section className="admin-card tournament-admin-feature">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span className={`status ${active.status === "Live" ? "status-live" : active.status === "Completed" ? "status-success" : "status-selling-tickets"}`}>
              <i /> {active.status || "Registration open"}
            </span>
            <h2>{active.name}</h2>
            <p>ID: {active.id} · {roundsList.length}-round progressive elimination · {currentStageName}</p>
          </div>
          {tournaments.length > 1 && (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "6px 12px" }}
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
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
                      ? "LIVE NOW"
                      : isPassed
                        ? "Completed"
                        : index === 0
                          ? `${active.maxPlayers || 512} players`
                          : index === roundsList.length - 1
                            ? "Champion"
                            : "Top 50% advance"}
                  </small>
                </span>
              </div>
            );
          })}
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
              {active.status === "Registration open" && "Tournament awaiting launch"}
              {active.status === "Live" && `Active Stage: ${currentStageName} (${active.stageStatus === "scored" ? "Scored" : "In Progress"})`}
              {active.status === "Completed" && `Tournament Complete · Champion: ${active.winner || "Ari.R"}`}
            </h3>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {active.status === "Registration open" && (
              <button
                type="button"
                className="admin-primary tournament-start-button"
                disabled={loadingAction}
                onClick={handleStartTournament}
              >
                ▶ Start Tournament ({roundsList[0]})
              </button>
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
        <button className="full-outline" onClick={() => openAction({ kind: "create-tournament" })}>
          + Create tournament
        </button>
      </aside>
    </div>
  );
}

