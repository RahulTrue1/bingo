import { useEffect, useState } from "react";
import { apiClient } from "../../api-client";

export const tournamentStages = [
  { name: "Open qualifier", detail: "512 → 256 players", date: "Aug 22 · 2:00 PM" },
  { name: "Pattern sprint", detail: "256 → 128 players", date: "Aug 22 · 7:00 PM" },
  { name: "Quarterfinal", detail: "128 → 16 players", date: "Aug 23 · 7:00 PM" },
  { name: "Semifinal", detail: "16 → 8 players", date: "Aug 24 · 5:00 PM" },
  { name: "Grand final", detail: "8 players · one champion", date: "Aug 24 · 8:00 PM" },
] as const;

export const tournamentPlayers = [
  { rank: 1, player: "TrueigQueen", points: 480, wins: 4, fast: "18 balls", status: "Advanced", friend: true },
  { rank: 2, player: "BallisticB", points: 455, wins: 3, fast: "21 balls", status: "Advanced", friend: false },
  { rank: 3, player: "MikaK", points: 438, wins: 3, fast: "19 balls", status: "Advanced", friend: true },
  { rank: 18, player: "LuckyStar", points: 348, wins: 2, fast: "24 balls", status: "In play", friend: true },
  { rank: 42, player: "Ari.R", points: 286, wins: 1, fast: "28 balls", status: "In play", friend: true },
  { rank: 97, player: "SkyJump", points: 224, wins: 1, fast: "31 balls", status: "In play", friend: false },
];

export function TournamentLobby({
  enterRoom,
  notify,
  currentUser,
}: {
  enterRoom: (tourney?: any) => void;
  notify: (message: string) => void;
  currentUser?: any;
}) {
  const currentUsername = currentUser?.username || "Ari.R";
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTourneyId, setSelectedTourneyId] = useState<string>("weekend-cup");
  const [registered, setRegistered] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [activeRound, setActiveRound] = useState(1);
  const [scope, setScope] = useState<"friends" | "global" | "qualified">("global");
  const [search, setSearch] = useState("");
  const [standingsPage, setStandingsPage] = useState(1);
  const [reminder, setReminder] = useState(true);
  const [prizesOpen, setPrizesOpen] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60 * 60 + 14 * 60 + 32);
  const [actionLoading, setActionLoading] = useState(false);

  const refreshTourneys = () => {
    apiClient.tournaments.list().then((list) => {
      if (list && list.length > 0) {
        setTournaments(list);
        const cur = list.find((t) => t.id === selectedTourneyId) || list[0];
        setRegistered(Boolean(cur?.registeredPlayers?.some((p: string) => p.toLowerCase() === currentUsername.toLowerCase()) || cur?.standings?.some((s: any) => s.player?.toLowerCase() === currentUsername.toLowerCase())));
        if (typeof cur?.currentRoundIndex === "number") {
          setActiveRound(cur.currentRoundIndex + 1);
        }
      }
    }).catch(() => {});
  };

  useEffect(() => {
    refreshTourneys();
    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "tournaments" || event.entity === "wallet") {
        refreshTourneys();
      }
    });
    return unsub;
  }, [selectedTourneyId, currentUsername]);

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeTourney = tournaments.find((t) => t.id === selectedTourneyId) || tournaments[0] || {
    id: "weekend-cup",
    name: "Trueigtech Weekend Cup",
    description: "Five rounds. One champion.",
    entryFee: 8,
    prizePool: 25000,
    playersCount: 384,
    maxPlayers: 512,
    status: "Registration open",
    rounds: ["Qualifiers", "Round of 256", "Round of 128", "Semi Final", "Grand Final"],
    currentRoundIndex: 0,
    currentStageName: "Qualifiers",
    stageStatus: "waiting",
    standings: tournamentPlayers,
  };

  const roundsList: string[] = Array.isArray(activeTourney.rounds)
    ? activeTourney.rounds
    : ["Qualifiers", "Round of 256", "Round of 128", "Semi Final", "Grand Final"];

  const currentRoundIndex = activeTourney.currentRoundIndex ?? 0;
  const currentStageName = activeTourney.currentStageName || roundsList[currentRoundIndex] || "Qualifiers";
  const userStanding = activeTourney.standings?.find(
    (s: any) => s.player?.toLowerCase() === currentUsername.toLowerCase()
  );

  const currentSeats = (activeTourney.playersCount || 384) + (registered ? 1 : 0);
  const maxSeats = activeTourney.maxPlayers || 512;
  const pctSeats = `${Math.min(100, Math.round((currentSeats / maxSeats) * 1000) / 10)}%`;

  const countdown = [Math.floor(secondsLeft / 3600), Math.floor((secondsLeft % 3600) / 60), secondsLeft % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

  const standingsSource: Array<{ rank: number; player: string; points: number; wins: number; fast?: string; status: string; friend?: boolean }> =
    activeTourney.standings && activeTourney.standings.length > 0
      ? activeTourney.standings
      : tournamentPlayers;

  const visiblePlayers = standingsSource.filter((player) => {
    const isCurrentPlayer = player.player?.toLowerCase() === currentUsername.toLowerCase();
    const matchesScope =
      scope === "global"
        ? true
        : scope === "friends"
          ? (player.friend || isCurrentPlayer)
          : (player.status === "Qualified" || player.status === "Champion");
    const matchesSearch = player.player?.toLowerCase().includes(search.trim().toLowerCase());
    return matchesScope && matchesSearch;
  });

  const selectedStageName = roundsList[activeRound - 1] || currentStageName;

  const getStageCutText = (index: number) => {
    switch (index) {
      case 0: return "512 → 256 advance";
      case 1: return "256 → 128 advance";
      case 2: return "128 → 16 advance";
      case 3: return "16 → 8 advance";
      case 4: return "8 → 1 Champion";
      default: return "Top half advance";
    }
  };

  const getStageTargetCut = (index: number) => {
    switch (index) {
      case 0: return 256;
      case 1: return 128;
      case 2: return 16;
      case 3: return 8;
      case 4: return 1;
      default: return 128;
    }
  };

  const targetCut = getStageTargetCut(currentRoundIndex);
  const isCutMet = userStanding ? userStanding.rank <= targetCut : false;
  const cutDistance = userStanding && !isCutMet ? (userStanding.rank - targetCut) : 0;

  async function handleEntry() {
    if (registered) {
      enterRoom();
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiClient.tournaments.register(activeTourney.id, currentUsername);
      if (res && res.success) {
        setRegistered(true);
        refreshTourneys();
        notify(`${activeTourney.name} entry confirmed! Your tournament card is ready.`);
      } else {
        notify("Could not complete registration. Check your wallet balance.");
      }
    } catch {
      notify("Registration failed.");
    } finally {
      setActionLoading(false);
    }
  }



  function toggleReminder() {
    setReminder((value) => !value);
    notify(reminder ? "Tournament reminder turned off." : "Tournament reminder set for 30 minutes before the round.");
  }

  return (
    <div className="simple-player-page tourney-page">
      {/* Multi-Tournament Event Browser */}
      <section className="tourney-selector-section" aria-label="Available Tournaments">
        <div className="tourney-selector-header">
          <div>
            <span className="tourney-badge-kicker">FEATURED TOURNAMENTS</span>
            <h2>Select a Tournament Series</h2>
          </div>
          <span className="tourney-count-pill">{tournaments.length} Active Events</span>
        </div>
        <div className="tourney-selector-cards">
          {tournaments.map((t) => {
            const isSelected = t.id === activeTourney.id;
            const isUserRegistered = Boolean(
              t.registeredPlayers?.some((p: string) => p.toLowerCase() === currentUsername.toLowerCase()) ||
              t.standings?.some((s: any) => s.player?.toLowerCase() === currentUsername.toLowerCase())
            );
            return (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                className={`tourney-selector-card ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  setSelectedTourneyId(t.id);
                  setRegistered(isUserRegistered);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedTourneyId(t.id);
                    setRegistered(isUserRegistered);
                  }
                }}
              >
                <div className="tourney-card-top">
                  <span className={`tourney-status-chip ${t.status === "Live" ? "live" : t.status === "Completed" ? "completed" : "open"}`}>
                    {t.status === "Live" ? "● LIVE NOW" : t.status === "Completed" ? "🏆 FINISHED" : "REGISTRATION OPEN"}
                  </span>
                  <span className="tourney-fee-chip">Buy-in: ${Number(t.entryFee).toFixed(0)}</span>
                </div>
                <h3 className="tourney-card-name">{t.name}</h3>
                <p className="tourney-card-desc">{t.description || `${t.rounds?.length || 5} rounds progressive elimination`}</p>
                <div className="tourney-card-footer">
                  <div className="tourney-prize-highlight">
                    <small>GUARANTEED PRIZE</small>
                    <b>${Number(t.prizePool).toLocaleString()}</b>
                  </div>
                  <div className="tourney-card-action">
                    {isSelected ? (
                      <span className="active-pill">Viewing Event ✓</span>
                    ) : (
                      <span className="select-pill">Select Event →</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="tourney-hero" aria-labelledby="tourney-title">
        <div className="tourney-hero-art" aria-hidden="true" />
        <div className="tourney-hero-copy">
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
            <span className={`tourney-live-label ${activeTourney.status === "Live" ? "active" : ""}`}>
              <i />
              {activeTourney.status === "Live"
                ? `STAGE ${currentRoundIndex + 1} OF ${roundsList.length}: ${currentStageName.toUpperCase()} LIVE`
                : activeTourney.status === "Completed"
                  ? "Tournament Completed 🏆"
                  : activeTourney.status || "Registration open"}
            </span>
          </div>

          <h1 id="tourney-title">{activeTourney.name}</h1>
          <p>{activeTourney.description || "Five-round progressive elimination tournament."}</p>

          {/* Primary Action Buttons */}
          <div className="tourney-hero-actions" style={{ flexWrap: "wrap", gap: "10px" }}>
            {activeTourney.status === "Completed" ? (
              <button
                className="primary-button"
                onClick={() => setRulesOpen(true)}
                style={{ background: "linear-gradient(135deg, #feca57, #ff9f43)", color: "#000", fontWeight: 800 }}
              >
                🏆 Tournament Concluded · View Final Standings
              </button>
            ) : !registered ? (
              <button
                className="primary-button tourney-enter-button"
                disabled={actionLoading}
                onClick={handleEntry}
              >
                Enter for ${Number(activeTourney.entryFee).toFixed(0)}
              </button>
            ) : activeTourney.status === "Registration open" ? (
              <button
                className="primary-button tourney-enter-button"
                onClick={() => enterRoom(activeTourney)}
                style={{ background: "linear-gradient(135deg, #2bddaa, #00b894)", color: "#000", fontWeight: 800 }}
              >
                🎮 Open Tournament Room
              </button>
            ) : (
              <>
                <button
                  className="primary-button tourney-enter-button"
                  onClick={() => enterRoom(activeTourney)}
                  style={{ background: "linear-gradient(135deg, #ff4757, #ff6b81)", fontWeight: 800 }}
                >
                  🎮 Play Stage {currentRoundIndex + 1} ({currentStageName}) →
                </button>
                <button className="glass-button" onClick={() => enterRoom(activeTourney)}>
                  Open Tournament Room
                </button>
              </>
            )}

            <button className="glass-button" onClick={() => setRulesOpen(true)}>
              View rules
            </button>
            <button className="glass-button" onClick={toggleReminder}>
              {reminder ? "🔔 Reminder active" : "Set reminder"}
            </button>
          </div>

          {registered && !activeTourney.winner && (
            <span className="tourney-confirmation">Entry confirmed · Seat {currentSeats}</span>
          )}

          {/* Scheduled Countdown Toast */}
          {activeTourney.status === "Registration open" && activeTourney.engine?.scheduledStartSeconds && (
            <div style={{
              background: "rgba(254, 202, 87, 0.15)",
              border: "1px solid #feca57",
              borderRadius: "8px",
              padding: "10px 16px",
              marginTop: "12px",
              fontSize: "13px",
              color: "#feca57",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}>
              <span>⏳</span>
              <b>
                Tournament scheduled! Auto-starting in {activeTourney.engine.scheduledStartSeconds}s. {registered ? "You are registered and will auto-enter Round 1!" : "Register now to participate!"}
              </b>
            </div>
          )}

          {/* User Stage State Indicator & Auto-Progression Toast */}
          {registered && activeTourney.status === "Live" && (
            <div style={{
              background: activeTourney.stageStatus === "scored"
                ? (userStanding?.status === "Qualified" || isCutMet ? "rgba(43, 221, 170, 0.2)" : "rgba(255, 71, 87, 0.2)")
                : "rgba(43, 221, 170, 0.15)",
              border: `1px solid ${
                activeTourney.stageStatus === "scored"
                  ? (userStanding?.status === "Qualified" || isCutMet ? "#2bddaa" : "#ff4757")
                  : "#2bddaa"
              }`,
              borderRadius: "8px",
              padding: "10px 16px",
              marginTop: "12px",
              fontSize: "13px",
              color: activeTourney.stageStatus === "scored" && !(userStanding?.status === "Qualified" || isCutMet) ? "#ff6b81" : "#2bddaa",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}>
              <span>{activeTourney.stageStatus === "scored" ? (userStanding?.status === "Qualified" || isCutMet ? "🎉" : "❌") : "⚡"}</span>
              <b>
                {activeTourney.stageStatus === "scored"
                  ? (userStanding?.status === "Qualified" || isCutMet
                      ? `Round Scored! ✓ Qualified for Stage ${currentRoundIndex + 2} (${roundsList[currentRoundIndex + 1] || "Next Round"})! Next round starts in ${activeTourney.engine?.stageSecondsRemaining ?? 3}s...`
                      : `Round Scored! ❌ You were eliminated in Stage ${currentRoundIndex + 1} (Rank #${userStanding?.rank || 5}). Spectating live.`)
                  : (userStanding?.status === "Qualified" || isCutMet
                      ? `✓ Inside cut line (#${targetCut} advance) · Stage ${currentRoundIndex + 1}: ${currentStageName} (Rank #${userStanding?.rank || 1} · ${userStanding?.points || 0} pts)`
                      : userStanding?.status === "Eliminated"
                        ? "Eliminated in prior round. Spectating live."
                        : `Active in Stage ${currentRoundIndex + 1}: ${currentStageName} (Rank #${userStanding?.rank || 1} · ${userStanding?.points || 0} pts)`)}
              </b>
            </div>
          )}

          {/* Champion Victory Card */}
          {activeTourney.status === "Completed" && (
            <div className="tourney-champion-card" style={{
              background: "linear-gradient(135deg, rgba(254, 202, 87, 0.2), rgba(255, 159, 67, 0.1))",
              border: "1px solid #feca57",
              borderRadius: "10px",
              padding: "14px 20px",
              marginTop: "16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}>
              <span style={{ fontSize: "36px" }}>🏆</span>
              <div>
                <b style={{ color: "#feca57", fontSize: "16px", display: "block" }}>
                  {activeTourney.winner?.toLowerCase() === currentUsername.toLowerCase()
                    ? "TOURNAMENT CHAMPION! You won 1st Place ($15,000 awarded to your wallet)!"
                    : `Tournament Champion: ${activeTourney.winner || currentUsername} (1st Place $15,000)`}
                </b>
                <small style={{ color: "rgba(255,255,255,0.85)" }}>
                  Five-round progressive elimination completed. Total prize pool $25,000 distributed.
                </small>
              </div>
            </div>
          )}
        </div>

        <div className="tourney-prize-panel">
          <small>${Number(activeTourney.prizePool).toLocaleString()} guaranteed</small>
          <strong>${Number(activeTourney.prizePool).toLocaleString()}</strong>
          <span>guaranteed</span>
          <div
            className="tourney-seat-progress"
            role="progressbar"
            aria-label="Tournament seats filled"
            aria-valuemin={0}
            aria-valuemax={maxSeats}
            aria-valuenow={currentSeats}
          >
            <i style={{ width: pctSeats }} />
          </div>
          <div className="tourney-seat-copy">
            <span>{currentSeats} / {maxSeats} seats filled</span>
            <b>{pctSeats}</b>
          </div>
        </div>
      </section>

      {/* Interactive Multi-Stage Rail with Live Pulsing Indicator */}
      <nav className="tourney-stage-rail" aria-label="Tournament rounds">
        {roundsList.map((stageName, index) => {
          const round = index + 1;
          const isPassed = activeTourney.status === "Completed" || (activeTourney.status === "Live" && index < currentRoundIndex);
          const isCurrent = activeTourney.status === "Live" && index === currentRoundIndex;
          const isScored = isCurrent && activeTourney.stageStatus === "scored";
          const state = isPassed ? "complete" : isCurrent ? (isScored ? "current scored" : "current") : "upcoming";

          return (
            <button
              key={stageName}
              className={`${state} ${activeRound === round ? "selected" : ""}`}
              aria-pressed={activeRound === round}
              onClick={() => setActiveRound(round)}
            >
              <span className="tourney-stage-number">
                {isPassed ? "✓" : isCurrent ? (isScored ? "🏁" : round) : round}
              </span>
              <span>
                <b>{stageName}</b>
                <em>
                  {isCurrent ? (
                    isScored ? "🏁 Round Scored" : <><span className="live-beacon-dot" /> LIVE NOW</>
                  ) : isPassed ? (
                    "✓ Completed"
                  ) : activeTourney.status === "Registration open" && index === 0 ? (
                    "Starts Next"
                  ) : (
                    "Scheduled"
                  )}
                </em>
                <small>{getStageCutText(index)}</small>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Stage Context and Live Cutoff Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(16, 24, 50, 0.98), rgba(11, 18, 38, 0.98))",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "12px",
        padding: "14px 20px",
        marginTop: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{
            background: activeTourney.status === "Live" ? "rgba(255, 71, 87, 0.2)" : "rgba(129, 93, 255, 0.2)",
            border: `1px solid ${activeTourney.status === "Live" ? "#ff4757" : "#815dff"}`,
            color: activeTourney.status === "Live" ? "#ff6b81" : "#a78bff",
            borderRadius: "6px",
            padding: "4px 8px",
            fontSize: "11px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}>
            {activeTourney.status === "Live"
              ? `Round ${currentRoundIndex + 1} of ${roundsList.length}`
              : activeTourney.status === "Completed"
                ? "Tournament Complete"
                : "Awaiting Start"}
          </span>
          <b style={{ color: "#fff", fontSize: "14px" }}>
            {activeTourney.status === "Live"
              ? `${currentStageName} — ${activeTourney.stageStatus === "scored" ? "Scored & Finalized ✓" : "In Progress"}`
              : activeTourney.status === "Completed"
                ? `Champion: ${activeTourney.winner || currentUsername} 🏆`
                : `${roundsList[0]} will begin when launched`}
          </b>
          <span style={{ color: "#8e889f", fontSize: "12px" }}>
            Cut line rule: <b>{getStageCutText(currentRoundIndex)}</b>
          </span>
        </div>

        {/* Player Hands-Free Round Status Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {activeTourney.status === "Live" && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(43, 221, 170, 0.12)",
              border: "1px solid rgba(43, 221, 170, 0.3)",
              color: "#2bddaa",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2bddaa", boxShadow: "0 0 8px #2bddaa", display: "inline-block" }} />
              ⚡ Hands-Free Round in Progress · Next Stage Advances Automatically
            </span>
          )}
          {activeTourney.status === "Registration open" && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#feca57",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
            }}>
              ⏳ Scheduled Launch · Tournament begins automatically when countdown expires
            </span>
          )}
          {activeTourney.status === "Completed" && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(254, 202, 87, 0.15)",
              border: "1px solid rgba(254, 202, 87, 0.4)",
              color: "#feca57",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
            }}>
              🏆 Champion Crowned · $15,000 Awarded to Winner's Wallet
            </span>
          )}
        </div>
      </div>

      <div className="tourney-dashboard">
        <section className="tourney-standings" aria-labelledby="standings-title">
          <div className="tourney-table-toolbar">
            <div>
              <h2 id="standings-title">Live standings</h2>
              <p>
                <i />
                {activeTourney.status === "Completed"
                  ? "Final Results · Champion Crowned"
                  : `Stage ${currentRoundIndex + 1} of ${roundsList.length} · ${currentStageName}`}
              </p>
            </div>
            <div className="tourney-table-controls">
              <label>
                <span className="sr-only">Search player</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search player"
                />
              </label>
              <div className="tourney-scope" aria-label="Standings scope">
                <button
                  className={scope === "global" ? "active" : ""}
                  onClick={() => { setScope("global"); setStandingsPage(1); }}
                >
                  Global
                </button>
                <button
                  className={scope === "qualified" ? "active" : ""}
                  onClick={() => { setScope("qualified"); setStandingsPage(1); }}
                >
                  Qualified
                </button>
                <button
                  className={scope === "friends" ? "active" : ""}
                  onClick={() => { setScope("friends"); setStandingsPage(1); }}
                >
                  Friends
                </button>
              </div>
            </div>
          </div>
          <div className="tourney-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Points</th>
                  <th>Wins</th>
                  <th>Fast bingo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visiblePlayers.map((player) => {
                  const isCurrentPlayer = player.player?.toLowerCase() === currentUsername.toLowerCase();
                  return (
                    <tr key={`${player.rank}-${player.player}`} className={isCurrentPlayer ? "is-player" : ""}>
                      <td>
                        <b>
                          {player.rank === 1 ? "🥇 #1" : player.rank === 2 ? "🥈 #2" : player.rank === 3 ? "🥉 #3" : `#${player.rank}`}
                        </b>
                      </td>
                      <td>
                        <span style={{ fontWeight: isCurrentPlayer ? 800 : 500, color: isCurrentPlayer ? "#a78bff" : "inherit" }}>
                          {player.player} {isCurrentPlayer && "(You)"}
                        </span>
                      </td>
                      <td><b>{player.points} pts</b></td>
                      <td>{player.wins}</td>
                      <td>{player.fast || "24 balls"}</td>
                      <td>
                        <span className={`table-status ${
                          player.status === "Champion" ? "success" : player.status === "Qualified" ? "success" : player.status === "Eliminated" ? "danger" : "warning"
                        }`}>
                          {player.status === "Champion" ? "🏆 Champion" : player.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!visiblePlayers.length && (
                  <tr>
                    <td colSpan={6} className="tourney-empty">No players match your search filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="tourney-table-footer">
            <span>
              {scope === "friends"
                ? `Showing ${visiblePlayers.length} friends`
                : scope === "qualified"
                  ? `Showing ${visiblePlayers.length} qualified players`
                  : `Showing ${visiblePlayers.length} contenders`}
            </span>
            <div>
              <button
                disabled={standingsPage === 1}
                onClick={() => setStandingsPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <button className="active">{standingsPage}</button>
              <button
                disabled={standingsPage >= Math.ceil(visiblePlayers.length / 10)}
                onClick={() => setStandingsPage((page) => page + 1)}
              >
                Next
              </button>
            </div>
          </footer>
        </section>

        {/* Dynamic User Status Card */}
        <aside className="tourney-player-card" aria-label="Your tournament status">
          <div className="tourney-position">
            <span>{activeTourney.status === "Completed" ? "Final Standing" : "My position"}</span>
            <strong style={{ color: isCutMet || userStanding?.status === "Champion" ? "#2bddaa" : "#956cff" }}>
              {userStanding ? `#${userStanding.rank}` : activeTourney.status === "Completed" ? "🏆 Final" : registered ? "#1" : "—"}
            </strong>
          </div>
          <h2>
            {userStanding ? userStanding.points : 0} <small>points</small>
          </h2>
          <p>
            {activeTourney.status === "Completed"
              ? (activeTourney.winner?.toLowerCase() === currentUsername.toLowerCase()
                  ? "🏆 GRAND CHAMPION · $15,000 Won!"
                  : userStanding
                    ? `Finalist · Ranked #${userStanding.rank} of ${standingsSource.length}`
                    : `Champion: ${activeTourney.winner || "LuckyStar"} ($15,000)`)
              : activeTourney.status === "Live"
                ? (userStanding?.status === "Qualified" || isCutMet
                    ? `✓ Inside cut line (#${targetCut} advance)`
                    : userStanding?.status === "Eliminated"
                      ? "Eliminated in prior stage"
                      : `${cutDistance} ranks behind #${targetCut} cut line`)
                : activeTourney.engine?.scheduledStartSeconds
                  ? `Auto-starting in ${activeTourney.engine.scheduledStartSeconds}s`
                  : "Tournament scheduled to start"}
          </p>
          <div className="tourney-status-divider" />
          <span className="tourney-card-label">
            {activeTourney.status === "Completed"
              ? "Tournament Status"
              : activeTourney.status === "Live"
                ? (activeTourney.engine?.autoMode ? "Stage Timer" : "Active Stage")
                : activeTourney.engine?.scheduledStartSeconds
                  ? "Auto-Start In"
                  : "Tournament Start"}
          </span>
          <strong className="tourney-countdown" aria-label={`${countdown} until round`}>
            {activeTourney.status === "Completed"
              ? "Completed 🏆"
              : activeTourney.status === "Live"
                ? (activeTourney.engine?.autoMode
                    ? `00:${String(activeTourney.engine.stageSecondsRemaining ?? 15).padStart(2, "0")}`
                    : `Stage ${currentRoundIndex + 1}: ${currentStageName}`)
                : activeTourney.engine?.scheduledStartSeconds
                  ? `00:${String(activeTourney.engine.scheduledStartSeconds).padStart(2, "0")}`
                  : countdown}
          </strong>
          <p>
            {activeTourney.status === "Completed"
              ? "Next tournament registration opens soon"
              : activeTourney.status === "Live"
                ? (activeTourney.stageStatus === "scored" ? "Stage Scored ✓ Advancing in 3s" : `${currentStageName} in progress`)
                : activeTourney.engine?.scheduledStartSeconds
                  ? `Stage 1 (${roundsList[0]}) starts automatically`
                  : "Starts Today · 8:00 PM ET"}
          </p>
          <button
            className="tourney-reminder"
            role="switch"
            aria-checked={reminder}
            onClick={toggleReminder}
          >
            <span>Remind me</span>
            <i className={reminder ? "on" : ""}><b /></i>
          </button>
          <div className="tourney-prize-breakdown">
            <button aria-expanded={prizesOpen} onClick={() => setPrizesOpen((value) => !value)}>
              <span>Prize pool <b>${Number(activeTourney.prizePool || 25000).toLocaleString()} guaranteed</b></span>
              <em>{prizesOpen ? "Hide" : "Show"}</em>
            </button>
            {prizesOpen && (
              <div>
                <span><b>1st Place (60%)</b><em>${Math.round((activeTourney.prizePool || 25000) * 0.6).toLocaleString()}</em></span>
                <span><b>2nd Place (25%)</b><em>${Math.round((activeTourney.prizePool || 25000) * 0.25).toLocaleString()}</em></span>
                <span><b>3rd Place (15%)</b><em>${Math.round((activeTourney.prizePool || 25000) * 0.15).toLocaleString()}</em></span>
                <button onClick={() => setRulesOpen(true)}>View full prize breakdown</button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Comprehensive Easy-to-Read Rules & Scoring System */}
      <section className="tourney-rules-guide" aria-labelledby="rules-guide-title">
        <div className="rules-guide-header">
          <div>
            <span className="tourney-badge-kicker">HOW IT WORKS</span>
            <h2 id="rules-guide-title">Tournament Rules & Scoring Guide</h2>
            <p>Master the progressive elimination rounds, earn pattern points, and claim the championship prize pool.</p>
          </div>
          <button className="glass-button" onClick={() => setRulesOpen(true)}>
            Open Quick Modal
          </button>
        </div>

        <div className="rules-cards-grid">
          <div className="rules-info-card">
            <div className="rules-card-icon">🎟️</div>
            <h3>1. Buy-In & Seat Allocation</h3>
            <p>
              Pay ${Number(activeTourney.entryFee).toFixed(0)} buy-in directly from your account balance.
              Seats are immediately allocated and your contenders profile is entered into Stage 1 ({roundsList[0]}).
            </p>
            <div className="rules-pill-tag">Instant Wallet Confirmation</div>
          </div>

          <div className="rules-info-card">
            <div className="rules-card-icon">🔢</div>
            <h3>2. Dynamic Points Matrix</h3>
            <ul className="rules-points-list">
              <li><span>Single Line Win</span> <b>10 pts</b></li>
              <li><span>Pattern Win</span> <b>25 pts</b></li>
              <li><span>Full House / Blackout</span> <b>50 pts</b></li>
              <li><span>Fast Bingo Bonus (&lt;25 balls)</span> <b>+15 pts</b></li>
              <li><span>Round Winner Bonus</span> <b>+40 pts</b></li>
            </ul>
            <div className="rules-pill-tag">Live Leaderboard Scoring</div>
          </div>

          <div className="rules-info-card">
            <div className="rules-card-icon">✂️</div>
            <h3>3. Progressive Elimination Cuts</h3>
            <p>
              After each stage ends, standings lock and only the top tier players advance:
            </p>
            <ul className="rules-cuts-list">
              {roundsList.map((rName, idx) => (
                <li key={rName} className={idx === currentRoundIndex ? "active-round" : ""}>
                  <b>{rName}:</b> <span>{getStageCutText(idx)}</span>
                </li>
              ))}
            </ul>
            <div className="rules-pill-tag">Top Tier Progression</div>
          </div>

          <div className="rules-info-card">
            <div className="rules-card-icon">🏆</div>
            <h3>4. Prize Payout & Hands-Free Engine</h3>
            <p>
              Guaranteed <b>${Number(activeTourney.prizePool).toLocaleString()}</b> prize pool is credited directly to winner wallets:
            </p>
            <ul className="rules-points-list">
              <li><span>1st Place Champion (60%)</span> <b>${Math.round(activeTourney.prizePool * 0.6).toLocaleString()}</b></li>
              <li><span>2nd Place Runner-up (25%)</span> <b>${Math.round(activeTourney.prizePool * 0.25).toLocaleString()}</b></li>
              <li><span>3rd Place Semi-finalist (15%)</span> <b>${Math.round(activeTourney.prizePool * 0.15).toLocaleString()}</b></li>
            </ul>
            <div className="rules-pill-tag" style={{ background: "rgba(43, 221, 170, 0.15)", color: "#2bddaa" }}>
              ⚡ Hands-Free Auto Engine: Zero clicks needed
            </div>
          </div>
        </div>
      </section>

      {rulesOpen && (
        <div className="tourney-modal-backdrop">
          <button className="tourney-modal-scrim" aria-label="Close tournament rules" onClick={() => setRulesOpen(false)} />
          <section className="tourney-rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title">
            <button className="tourney-modal-close" onClick={() => setRulesOpen(false)}>Close</button>
            <span className="section-kicker">Tournament guide</span>
            <h2 id="rules-title">{activeTourney.name} rules</h2>
            <p>Score points across five progressive rounds. Top players advance to the next round until one champion remains.</p>
            <ol>
              <li>Entry fee of ${Number(activeTourney.entryFee).toFixed(0)} enters you into Stage 1 (Qualifiers).</li>
              <li>Qualification cut: Stage 1 (512 → 256), Stage 2 (256 → 128), Stage 3 (128 → 16), Stage 4 (16 → 8), Stage 5 (8 → 1 Champion).</li>
              <li>Ties are resolved by wins, fastest bingo, then earliest registration.</li>
              <li>The champion receives 60% (${Math.round((activeTourney.prizePool || 25000) * 0.6).toLocaleString()}) of the guaranteed pool.</li>
            </ol>
            <button
              className="primary-button"
              onClick={() => {
                setRulesOpen(false);
                if (registered) enterRoom(activeTourney);
                else handleEntry();
              }}
            >
              {registered ? "Open tournament room" : `Enter for $${Number(activeTourney.entryFee).toFixed(0)}`}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
