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
}: {
  enterRoom: () => void;
  notify: (message: string) => void;
}) {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTourneyId, setSelectedTourneyId] = useState<string>("weekend-cup");
  const [registered, setRegistered] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [activeRound, setActiveRound] = useState(1);
  const [scope, setScope] = useState<"friends" | "global">("global");
  const [search, setSearch] = useState("");
  const [standingsPage, setStandingsPage] = useState(1);
  const [reminder, setReminder] = useState(true);
  const [prizesOpen, setPrizesOpen] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60 * 60 + 14 * 60 + 32);

  const refreshTourneys = () => {
    apiClient.tournaments.list().then((list) => {
      if (list && list.length > 0) {
        setTournaments(list);
        const cur = list.find((t) => t.id === selectedTourneyId) || list[0];
        setRegistered(Boolean(cur?.registeredPlayers?.includes("Ari.R")));
        if (typeof cur?.currentRoundIndex === "number") {
          setActiveRound(cur.currentRoundIndex + 1);
        }
      }
    }).catch(() => {});
  };

  useEffect(() => {
    refreshTourneys();
    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "tournaments") {
        refreshTourneys();
      }
    });
    return unsub;
  }, [selectedTourneyId]);

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
    standings: tournamentPlayers,
  };

  const roundsList: string[] = Array.isArray(activeTourney.rounds)
    ? activeTourney.rounds
    : ["Qualifiers", "Round of 256", "Round of 128", "Semi Final", "Grand Final"];

  const currentRoundIndex = activeTourney.currentRoundIndex ?? 0;
  const currentStageName = activeTourney.currentStageName || roundsList[currentRoundIndex] || "Qualifiers";
  const userStanding = activeTourney.standings?.find((s: any) => s.player === "Ari.R");

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
    const matchesScope = scope === "global" || player.friend || player.player === "Ari.R";
    const matchesSearch = player.player.toLowerCase().includes(search.trim().toLowerCase());
    return matchesScope && matchesSearch;
  });

  const selectedStageName = roundsList[activeRound - 1] || currentStageName;

  async function handleEntry() {
    if (registered) {
      enterRoom();
      return;
    }
    await apiClient.tournaments.register(activeTourney.id, "Ari.R");
    setRegistered(true);
    refreshTourneys();
    notify(`${activeTourney.name} entry confirmed. Your tournament card is ready.`);
  }

  function toggleReminder() {
    setReminder((value) => !value);
    notify(reminder ? "Tournament reminder turned off." : "Tournament reminder set for 30 minutes before the round.");
  }

  return (
    <div className="simple-player-page tourney-page">
      <section className="tourney-hero" aria-labelledby="tourney-title">
        <div className="tourney-hero-art" aria-hidden="true" />
        <div className="tourney-hero-copy">
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
            <span className={`tourney-live-label ${activeTourney.status === "Live" ? "active" : ""}`}>
              <i />
              {activeTourney.status === "Live"
                ? `Stage ${currentRoundIndex + 1}: ${currentStageName} LIVE`
                : activeTourney.status === "Completed"
                  ? "Tournament Completed 🏆"
                  : activeTourney.status || "Registration open"}
            </span>
            {tournaments.length > 1 && (
              <select
                value={selectedTourneyId}
                onChange={(e) => {
                  setSelectedTourneyId(e.target.value);
                  const found = tournaments.find((t) => t.id === e.target.value);
                  setRegistered(Boolean(found?.registeredPlayers?.includes("Ari.R") || found?.standings?.some((s: any) => s.player === "Ari.R")));
                }}
                style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "4px 8px", fontSize: "12px" }}
              >
                {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>

          <h1 id="tourney-title">{activeTourney.name}</h1>
          <p>{activeTourney.description || "Five rounds. One champion."}</p>

          <div className="tourney-hero-actions">
            <button className="primary-button tourney-enter-button" onClick={handleEntry}>
              {!registered
                ? `Enter for $${Number(activeTourney.entryFee).toFixed(0)}`
                : activeTourney.status === "Live"
                  ? `Play Stage ${currentRoundIndex + 1} (${currentStageName}) →`
                  : "Open tournament room"}
            </button>
            <button className="glass-button" onClick={() => setRulesOpen(true)}>
              View rules
            </button>
          </div>

          {registered && !activeTourney.winner && (
            <span className="tourney-confirmation">Entry confirmed · Seat {currentSeats}</span>
          )}

          {/* User Stage State Indicator */}
          {registered && activeTourney.status === "Live" && (
            <div style={{
              background: "rgba(43, 221, 170, 0.15)",
              border: "1px solid #2bddaa",
              borderRadius: "8px",
              padding: "8px 14px",
              marginTop: "12px",
              fontSize: "13px",
              color: "#2bddaa",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <span>⚡</span>
              <b>
                {userStanding?.status === "Qualified"
                  ? `✓ Qualified! You advanced to ${currentStageName} (Rank #${userStanding.rank} · ${userStanding.points} pts)`
                  : userStanding?.status === "Eliminated"
                    ? "Eliminated in prior round. Spectating live."
                    : `Active in Stage ${currentRoundIndex + 1}: ${currentStageName} (Rank #${userStanding?.rank || 4} · ${userStanding?.points || 60} pts)`}
              </b>
            </div>
          )}

          {/* Champion Victory Card */}
          {activeTourney.status === "Completed" && (
            <div className="tourney-champion-card" style={{
              background: "linear-gradient(135deg, rgba(254, 202, 87, 0.2), rgba(255, 159, 67, 0.1))",
              border: "1px solid #feca57",
              borderRadius: "10px",
              padding: "12px 18px",
              marginTop: "16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}>
              <span style={{ fontSize: "32px" }}>🏆</span>
              <div>
                <b style={{ color: "#feca57", fontSize: "16px", display: "block" }}>
                  {activeTourney.winner === "Ari.R"
                    ? "TOURNAMENT CHAMPION! You won 1st Place ($15,000 awarded to your wallet)!"
                    : `Tournament Champion: ${activeTourney.winner || "Ari.R"} (1st Place $15,000)`}
                </b>
                <small style={{ color: "rgba(255,255,255,0.8)" }}>
                  Five-round progressive elimination completed. Prize pool distributed.
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

      {/* Interactive Multi-Stage Rail */}
      <nav className="tourney-stage-rail" aria-label="Tournament rounds">
        {roundsList.map((stageName, index) => {
          const round = index + 1;
          const isPassed = activeTourney.status === "Completed" || (activeTourney.status === "Live" && index < currentRoundIndex);
          const isCurrent = activeTourney.status === "Live" && index === currentRoundIndex;
          const state = isPassed ? "complete" : isCurrent ? "current" : "upcoming";
          return (
            <button
              key={stageName}
              className={`${state} ${activeRound === round ? "selected" : ""}`}
              aria-pressed={activeRound === round}
              onClick={() => setActiveRound(round)}
            >
              <span className="tourney-stage-number">{round}</span>
              <span>
                <b>{stageName}</b>
                <em>{isCurrent ? "LIVE NOW" : isPassed ? "Completed" : "Scheduled"}</em>
                <small>{index === 0 ? "512 → 256" : index === roundsList.length - 1 ? "1 Champion" : "Top half advance"}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="tourney-round-context" aria-live="polite">
        <span>Viewing stage {activeRound} of {roundsList.length}</span>
        <b>{selectedStageName}</b>
        <small>
          {activeRound <= currentRoundIndex ? "Round Completed" : activeRound === currentRoundIndex + 1 ? "Round in progress" : "Upcoming Round"}
        </small>
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
                  className={scope === "friends" ? "active" : ""}
                  onClick={() => { setScope("friends"); setStandingsPage(1); }}
                >
                  Friends
                </button>
                <button
                  className={scope === "global" ? "active" : ""}
                  onClick={() => setScope("global")}
                >
                  Global
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
                  const isCurrentPlayer = player.player === "Ari.R";
                  return (
                    <tr key={player.rank} className={isCurrentPlayer ? "is-player" : ""}>
                      <td><b>#{player.rank}</b></td>
                      <td>
                        <span style={{ fontWeight: isCurrentPlayer ? 800 : 500 }}>
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
                          {player.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!visiblePlayers.length && (
                  <tr>
                    <td colSpan={6} className="tourney-empty">No players match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="tourney-table-footer">
            <span>{scope === "friends" ? `Showing ${visiblePlayers.length} friends` : `Page ${standingsPage} of 11 · 512 players`}</span>
            <div>
              <button
                disabled={scope === "friends" || standingsPage === 1}
                onClick={() => setStandingsPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              {[1, 2, 3, 11].map((page) => (
                <button
                  key={page}
                  className={standingsPage === page ? "active" : ""}
                  disabled={scope === "friends"}
                  onClick={() => setStandingsPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={scope === "friends" || standingsPage === 11}
                onClick={() => setStandingsPage((page) => Math.min(11, page + 1))}
              >
                Next
              </button>
            </div>
          </footer>
        </section>

        <aside className="tourney-player-card" aria-label="Your tournament status">
          <div className="tourney-position">
            <span>My position</span>
            <strong>#42</strong>
          </div>
          <h2>286 <small>points</small></h2>
          <p>164 points behind #128 cut line</p>
          <div className="tourney-status-divider" />
          <span className="tourney-card-label">Next round</span>
          <strong className="tourney-countdown" aria-label={`${countdown} until next round`}>{countdown}</strong>
          <p>Tomorrow · 7:00 PM ET</p>
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
              <span>Prize pool <b>$25,000 guaranteed</b></span>
              <em>{prizesOpen ? "Hide" : "Show"}</em>
            </button>
            {prizesOpen && (
              <div>
                <span><b>1st</b><em>$7,500</em></span>
                <span><b>2nd</b><em>$4,000</em></span>
                <span><b>3rd</b><em>$2,500</em></span>
                <span><b>4th</b><em>$1,500</em></span>
                <span><b>5th–8th</b><em>$1,000</em></span>
                <button onClick={() => setRulesOpen(true)}>View full prize breakdown</button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {rulesOpen && (
        <div className="tourney-modal-backdrop">
          <button className="tourney-modal-scrim" aria-label="Close tournament rules" onClick={() => setRulesOpen(false)} />
          <section className="tourney-rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title">
            <button className="tourney-modal-close" onClick={() => setRulesOpen(false)}>Close</button>
            <span className="section-kicker">Tournament guide</span>
            <h2 id="rules-title">Weekend Cup rules</h2>
            <p>Score points across five progressive rounds. Your highest valid card result in each game counts toward the stage total.</p>
            <ol>
              <li>Entry includes one card per round. Extra cards are not available.</li>
              <li>The qualification cut is applied after each stage: 512, 128, 16, then 8 players.</li>
              <li>Ties are resolved by wins, fastest bingo, then earliest registration.</li>
              <li>The final champion receives $7,500 from the guaranteed $25,000 pool.</li>
            </ol>
            <button
              className="primary-button"
              onClick={() => {
                setRulesOpen(false);
                handleEntry();
              }}
            >
              {registered ? "Open tournament room" : "Enter for $8"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
