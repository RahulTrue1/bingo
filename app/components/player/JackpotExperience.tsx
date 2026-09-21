import { useEffect, useState } from "react";
import { ArrowRight, Bell, ChartLineUp, CheckCircle, Clock, Club, Diamond, House, Lightning, Pulse, Star, Ticket, Trophy, UsersThree } from "@phosphor-icons/react";
import { apiClient } from "../../api-client";
import type { BingoRoomData } from "../../bingo-core";
import { money } from "../shared/types";

export const jackpotTiers = [
  { key: "mega", name: "Mega Trueig Jackpot", amount: 125480, reset: 50000, contribution: 2.5, price: 5, players: 127, variant: "75-Ball", pattern: "Full House in 42 balls", difficulty: "Legendary", reward: "Life-changing", icon: Diamond },
  { key: "major", name: "Major Trueig Jackpot", amount: 24375, reset: 25000, contribution: 2, price: 2, players: 98, variant: "90-Ball", pattern: "Coverall in 50 balls", difficulty: "Hard", reward: "Huge", icon: Star },
  { key: "minor", name: "Minor Trueig Jackpot", amount: 6250, reset: 10000, contribution: 1.5, price: 1, players: 63, variant: "75-Ball", pattern: "4 Corners in 20 balls", difficulty: "Medium", reward: "Great", icon: Diamond },
  { key: "mini", name: "Mini Trueig Jackpot", amount: 1540, reset: 5000, contribution: 1, price: .5, players: 42, variant: "75-Ball", pattern: "Any Line in 15 balls", difficulty: "Easy", reward: "Nice", icon: Club },
];

const iconMap = {
  diamond: Diamond,
  star: Star,
  club: Club,
};

export function JackpotExperience({
  rooms,
  enterRoom,
  notify,
}: {
  rooms: BingoRoomData[];
  enterRoom: (room: BingoRoomData) => void;
  notify: (message: string) => void;
}) {
  const [tiers, setTiers] = useState<Array<any>>(jackpotTiers);
  const [selectedTier, setSelectedTier] = useState(0);
  const [liveBump, setLiveBump] = useState(0);
  const [reminder, setReminder] = useState(true);
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    const refreshJackpots = () => {
      apiClient.jackpots
        .list()
        .then((list) => {
          if (list && list.length > 0) {
            const dynamicTiers = list.map((j) => {
              const icon =
                (j.iconKey && iconMap[j.iconKey as keyof typeof iconMap]) ||
                (j.key === "major" ? Star : j.key === "mini" ? Club : Diamond);
              return {
                id: j.id,
                key: j.key || j.id,
                name: j.name,
                amount: j.currentAmount,
                reset: j.resetAmount || j.startingAmount,
                contribution: j.contributionPercent || 2.0,
                price: j.price || 2,
                players: j.players || 50,
                variant: j.variant || "75-Ball Progressive",
                pattern: j.qualifyingPattern || "Full House in 42 balls",
                ballLimit: j.qualifyingBallLimit || 42,
                difficulty: j.difficulty || "Hard",
                reward: j.reward || "Huge",
                linkedRooms: j.linkedRooms || [],
                history: j.history || [],
                icon,
              };
            });
            setTiers(dynamicTiers);
          }
        })
        .catch(() => {});
    };

    refreshJackpots();

    const unsubscribe = apiClient.sync.subscribe((event) => {
      if (event.entity === "jackpots") {
        refreshJackpots();
        if (event.message) notify(event.message);
      }
    });

    const poll = window.setInterval(refreshJackpots, 3000);

    return () => {
      unsubscribe();
      window.clearInterval(poll);
    };
  }, [notify]);

  const active = tiers[selectedTier] ?? tiers[0] ?? {
    id: "mega-trueig",
    key: "mega",
    name: "Mega Trueig Jackpot",
    amount: 125480,
    reset: 50000,
    contribution: 2.5,
    price: 5,
    players: 127,
    variant: "75-Ball Progressive",
    pattern: "Full House in 42 balls",
    ballLimit: 42,
    difficulty: "Legendary",
    reward: "Life-changing",
    linkedRooms: ["mega-jackpot", "diamond-75"],
    history: [],
    icon: Diamond,
  };

  // Find eligible rooms: explicitly linked rooms first, then variant matches, then all rooms
  const linked = rooms.filter((r) => active.linkedRooms?.includes(r.id));
  const variantMatch = rooms.filter((r) =>
    r.variant?.toLowerCase().includes((active.variant || "").slice(0, 2).toLowerCase())
  );
  const eligibleRooms = linked.length > 0 ? linked : (variantMatch.length > 0 ? variantMatch : rooms);
  const visibleRooms = eligibleRooms.slice(0, showAllRooms ? 8 : 4);
  const targetRoom = visibleRooms[0] ?? rooms[0];

  // Find recent winner across history
  const allWins = tiers.flatMap((t) => (t.history || []).map((h: any) => ({ ...h, jackpotName: t.name })))
    .filter((h: any) => h.type.includes("Won") || h.type.includes("Payout"));
  const recentWin = allWins[0] || {
    user: "Ari.R",
    amount: 42180,
    jackpotName: active.name,
    time: "14:32",
  };

  useEffect(() => {
    const timer = window.setInterval(() => setLiveBump((value) => value + 0.5), 3000);
    return () => window.clearInterval(timer);
  }, []);

  function play(room = targetRoom) {
    if (room) enterRoom(room);
  }

  function toggleReminder() {
    setReminder((value) => !value);
    notify(reminder ? "Jackpot reminder turned off." : "Jackpot reminder set for your next qualifying game.");
  }

  return (
    <div className="simple-player-page jackpot-experience">
      <header className="jackpot-page-header">
        <div>
          <h1>Trueigtech Jackpots</h1>
          <span className="jackpot-live"><i />Progressive active</span>
          <span className="jackpot-updated">Live update · just now</span>
        </div>
      </header>

      <section className="jackpot-feature" aria-labelledby="jackpot-feature-title">
        <div className="jackpot-feature-main">
          <span className="jackpot-growth"><Lightning size={15} weight="fill" />Live +${(42 + liveBump).toFixed(2)}</span>
          <h2 id="jackpot-feature-title">{active.name}</h2>
          <strong aria-live="polite">
            {money(active.amount + liveBump)}
          </strong>
          <p>Rising with every ticket. Win with <b>{active.pattern}</b> within <b>{active.ballLimit} balls</b>.</p>
          <button className="jackpot-play-button" onClick={() => play()}>
            Play for {money(active.price)} <ArrowRight size={17} weight="bold" />
          </button>
          <small>Minimum 1 ticket · {eligibleRooms.length} eligible room{eligibleRooms.length === 1 ? "" : "s"}</small>
        </div>

        <div className="jackpot-qualify">
          <h3>Your path to qualify</h3>
          <ol>
            <li>
              <span>1</span>
              <div>
                <House size={18} weight="duotone" />
                <p><b>Choose an eligible {active.variant?.split(" ")[0]} room</b><small>Look for rooms marked “Contributing”.</small></p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <Ticket size={18} weight="duotone" />
                <p><b>Buy a qualifying ticket ({money(active.price)})</b><small>+{active.contribution}% of each ticket boosts this pot.</small></p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <CheckCircle size={18} weight="duotone" />
                <p><b>Complete the pattern</b><small>Win with {active.pattern.toLowerCase()} in {active.ballLimit} calls.</small></p>
              </div>
            </li>
          </ol>
          <button className="jackpot-text-button" onClick={() => setRulesOpen(true)}>
            View full rules & eligibility <ArrowRight size={14} />
          </button>
        </div>

        <aside className="jackpot-pulse">
          <h3><Pulse size={20} />Jackpot pulse</h3>
          <dl>
            <div><dt><Clock size={16} />Reset amount</dt><dd>{money(active.reset)}</dd></div>
            <div><dt><Ticket size={16} />Contribution per ticket</dt><dd>+{active.contribution}%<small>of ticket price</small></dd></div>
            <div><dt><UsersThree size={16} />Active contributors</dt><dd>{active.players}<small>players</small></dd></div>
            <div><dt><Clock size={16} />Qualifying limit</dt><dd>{active.ballLimit}<small>calls max</small></dd></div>
          </dl>
          <button className="jackpot-reminder" role="switch" aria-checked={reminder} onClick={toggleReminder}>
            <span><Bell size={16} />Player reminder</span>
            <i className={reminder ? "on" : ""}><b /></i>
          </button>
          <button className="jackpot-text-button" onClick={() => setRulesOpen(true)}>
            View full eligibility rules <ArrowRight size={14} />
          </button>
        </aside>
      </section>

      {/* Dynamic Jackpot Ladder */}
      <section className="jackpot-ladder" aria-labelledby="jackpot-ladder-title">
        <div className="jackpot-section-title">
          <h2 id="jackpot-ladder-title"><ChartLineUp size={20} />Jackpot ladder</h2>
          <p>{tiers.length} progressive jackpots live now. Choose your prize chase.</p>
        </div>
        <div className="jackpot-tier-grid" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))` }}>
          {tiers.map((tier, index) => {
            const TierIcon = tier.icon || Diamond;
            const isSelected = selectedTier === index;
            return (
              <button
                key={tier.id || tier.key}
                className={`jackpot-tier-card tier-${tier.key} ${isSelected ? "selected" : ""}`}
                onClick={() => { setSelectedTier(index); setLiveBump(0); }}
                aria-pressed={isSelected}
                style={{
                  border: isSelected ? "2px solid #ffd32a" : undefined,
                  boxShadow: isSelected ? "0 0 20px rgba(255,211,42,0.25)" : undefined,
                }}
              >
                <span className="jackpot-tier-icon"><TierIcon size={27} weight="duotone" /></span>
                <span className="jackpot-tier-copy">
                  <b>{tier.name}</b>
                  <strong style={{ color: "#ffd32a" }}>{money(tier.amount)}</strong>
                </span>
                <span className="jackpot-tier-live"><i />Live</span>
                <span className="jackpot-tier-meta">
                  <small>Difficulty<b>{tier.difficulty}</b></small>
                  <small>Reward<b>{tier.reward}</b></small>
                </span>
                <em>{tier.variant} · {tier.pattern} · +{tier.contribution}% per ticket</em>
              </button>
            );
          })}
        </div>
      </section>

      {/* Dynamic Contributing Rooms */}
      <section className="jackpot-rooms" aria-labelledby="jackpot-rooms-title">
        <div className="jackpot-section-title">
          <h2 id="jackpot-rooms-title"><Pulse size={20} />Games contributing now</h2>
          <p>Join these rooms to play for and boost {active.name}.</p>
          <button onClick={() => { setLiveBump((value) => value + 7); notify("Jackpot room data refreshed."); }}>
            Refresh
          </button>
        </div>
        <div className="jackpot-room-table">
          <table>
            <thead>
              <tr>
                <th>Room</th>
                <th>Ticket price</th>
                <th>Players</th>
                <th>Jackpot contribution</th>
                <th>Game type</th>
                <th>Qualifying rule</th>
                <th>Join</th>
              </tr>
            </thead>
            <tbody>
              {visibleRooms.map((room, index) => (
                <tr key={`${room.id}-${index}`}>
                  <td>
                    <span className="jackpot-room-ball">{room.variant.match(/\d+/)?.[0] ?? "75"}</span>
                    <span>
                      <b>{room.name}</b>
                      <small style={{ color: "#2bddaa", fontWeight: 600 }}>● Contributing</small>
                    </span>
                  </td>
                  <td>{money(room.ticketPrice || active.price)}</td>
                  <td><UsersThree size={15} />{room.players}</td>
                  <td>
                    <b style={{ color: "#2bddaa" }}>+{active.contribution}%</b>
                    <small>({money((room.ticketPrice || active.price) * active.contribution / 100)} per ticket)</small>
                  </td>
                  <td>{room.variant}</td>
                  <td>{active.pattern} ({active.ballLimit} calls)</td>
                  <td>
                    <button
                      onClick={() => play(room)}
                      style={{
                        background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
                        color: "#fff",
                        fontWeight: 600,
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Join room
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {eligibleRooms.length > 4 && (
          <button className="jackpot-show-rooms" onClick={() => setShowAllRooms((value) => !value)}>
            {showAllRooms ? "Show fewer rooms" : `View all ${eligibleRooms.length} contributing rooms`} <ArrowRight size={14} />
          </button>
        )}
      </section>

      {/* Recent Winner Strip */}
      <aside className="jackpot-winner-strip">
        <Trophy size={24} weight="fill" color="#ffd32a" />
        <span className="jackpot-winner-label">Recent winner</span>
        <strong>{recentWin.user} won {money(recentWin.amount)}</strong>
        <p>in {recentWin.jackpotName || active.name} · {recentWin.time || "Just now"}</p>
        <button onClick={() => play()}>Play next round</button>
      </aside>

      {/* Dynamic Rules Modal */}
      {rulesOpen && (
        <div className="tourney-modal-backdrop">
          <button className="tourney-modal-scrim" aria-label="Close jackpot rules" onClick={() => setRulesOpen(false)} />
          <section className="tourney-rules-modal" role="dialog" aria-modal="true" aria-labelledby="jackpot-rules-title">
            <button className="tourney-modal-close" onClick={() => setRulesOpen(false)}>Close</button>
            <span className="section-kicker">Rules & eligibility</span>
            <h2 id="jackpot-rules-title">{active.name} rules</h2>
            <p>Every ticket bought in contributing {active.variant} rooms adds +{active.contribution}% directly to this progressive jackpot.</p>
            <ol>
              <li>Qualify by purchasing at least 1 ticket ({money(active.price)} minimum) in an eligible contributing room.</li>
              <li>Win the entire jackpot by achieving <b>{active.pattern}</b> within <b>{active.ballLimit} calls</b>.</li>
              <li>If multiple players claim simultaneously in the same call, the prize pool splits equally among them.</li>
              <li>When won, the jackpot prize is instantly credited to your wallet balance and the jackpot resets to {money(active.reset)}.</li>
            </ol>
            <button className="primary-button" onClick={() => { setRulesOpen(false); play(); }}>
              Play {active.name} now
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

