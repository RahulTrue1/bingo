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
  const [registered, setRegistered] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [activeRound, setActiveRound] = useState(3);
  const [scope, setScope] = useState<"friends" | "global">("global");
  const [search, setSearch] = useState("");
  const [standingsPage, setStandingsPage] = useState(1);
  const [reminder, setReminder] = useState(true);
  const [prizesOpen, setPrizesOpen] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60 * 60 + 14 * 60 + 32);

  useEffect(() => {
    apiClient.tournaments.list().then((list) => {
      const tourney = list?.find((t) => t.id === "weekend-cup");
      if (tourney?.registeredPlayers?.includes("Ari.R")) {
        setRegistered(true);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = [Math.floor(secondsLeft / 3600), Math.floor((secondsLeft % 3600) / 60), secondsLeft % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

  const pagePlayers = standingsPage === 1 ? tournamentPlayers : Array.from({ length: standingsPage === 11 ? 12 : 6 }, (_, index) => ({
    rank: (standingsPage - 1) * 50 + index + 1,
    player: `Player_${String((standingsPage - 1) * 50 + index + 1).padStart(3, "0")}`,
    points: Math.max(62, 390 - standingsPage * 17 - index * 9),
    wins: Math.max(0, 3 - (index % 4)),
    fast: `${21 + index} balls`,
    status: standingsPage < 4 ? "Advanced" : "In play",
    friend: false,
  }));

  const visiblePlayers = pagePlayers.filter((player) => {
    const matchesScope = scope === "global" || player.friend;
    const matchesSearch = player.player.toLowerCase().includes(search.trim().toLowerCase());
    return matchesScope && matchesSearch;
  });

  const selectedStage = tournamentStages[activeRound - 1];

  function handleEntry() {
    if (registered) {
      enterRoom();
      return;
    }
    apiClient.tournaments.register("weekend-cup", "Ari.R");
    setRegistered(true);
    notify("Weekend Cup entry confirmed. Your tournament card is ready.");
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
          <span className="tourney-live-label"><i />Registration open</span>
          <h1 id="tourney-title">Trueigtech Weekend Cup</h1>
          <p>Five rounds. One champion.</p>
          <div className="tourney-hero-actions">
            <button className="primary-button" onClick={handleEntry}>
              {registered ? "Open tournament room" : "Enter for $8"}
            </button>
            <button className="glass-button" onClick={() => setRulesOpen(true)}>
              View rules
            </button>
          </div>
          {registered && <span className="tourney-confirmation">Entry confirmed · Seat 385</span>}
        </div>
        <div className="tourney-prize-panel">
          <small>$25,000 guaranteed</small>
          <strong>$25,000</strong>
          <span>guaranteed</span>
          <div
            className="tourney-seat-progress"
            role="progressbar"
            aria-label="Tournament seats filled"
            aria-valuemin={0}
            aria-valuemax={512}
            aria-valuenow={registered ? 385 : 384}
          >
            <i style={{ width: registered ? "75.2%" : "75%" }} />
          </div>
          <div className="tourney-seat-copy">
            <span>{registered ? 385 : 384} / 512 seats filled</span>
            <b>{registered ? "75.2%" : "75%"}</b>
          </div>
        </div>
      </section>

      <nav className="tourney-stage-rail" aria-label="Tournament rounds">
        {tournamentStages.map((stage, index) => {
          const round = index + 1;
          const state = round < 3 ? "complete" : round === 3 ? "current" : "upcoming";
          return (
            <button
              key={stage.name}
              className={`${state} ${activeRound === round ? "selected" : ""}`}
              aria-pressed={activeRound === round}
              onClick={() => setActiveRound(round)}
            >
              <span className="tourney-stage-number">{round}</span>
              <span>
                <b>{stage.name}</b>
                <em>{stage.detail}</em>
                <small>{stage.date}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="tourney-round-context" aria-live="polite">
        <span>Viewing stage {activeRound} of 5</span>
        <b>{selectedStage.name}</b>
        <small>{selectedStage.detail} · {selectedStage.date}</small>
      </div>

      <div className="tourney-dashboard">
        <section className="tourney-standings" aria-labelledby="standings-title">
          <div className="tourney-table-toolbar">
            <div>
              <h2 id="standings-title">Live standings</h2>
              <p><i />Round 3 of 5 · <span>Top 128 advance</span></p>
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
                {visiblePlayers.map((player) => (
                  <tr key={player.rank} className={player.rank === 42 ? "is-player" : ""}>
                    <td>{player.rank}</td>
                    <td>{player.rank === 42 ? "You" : player.player}</td>
                    <td>{player.points}</td>
                    <td>{player.wins}</td>
                    <td>{player.fast}</td>
                    <td>
                      <span className={`table-status ${player.status === "Advanced" ? "success" : "warning"}`}>
                        {player.status}
                      </span>
                    </td>
                  </tr>
                ))}
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
