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
  const [tiers, setTiers] = useState(jackpotTiers);
  const [selectedTier, setSelectedTier] = useState(0);
  const [liveBump, setLiveBump] = useState(0);
  const [reminder, setReminder] = useState(true);
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    apiClient.jackpots
      .list()
      .then((list) => {
        if (list && list.length > 0) {
          const dynamicTiers = list.map((j) => {
            const icon =
              (j.iconKey && iconMap[j.iconKey as keyof typeof iconMap]) ||
              (j.key === "major" ? Star : j.key === "mini" ? Club : Diamond);
            return {
              key: j.key || j.id,
              name: j.name,
              amount: j.currentAmount,
              reset: j.resetAmount || j.startingAmount,
              contribution: j.contributionPercent,
              price: j.price || 2,
              players: j.players || 50,
              variant: j.variant || "75-Ball",
              pattern: j.qualifyingPattern || "Full House in 42 balls",
              difficulty: j.difficulty || "Hard",
              reward: j.reward || "Huge",
              icon,
            };
          });
          setTiers(dynamicTiers);
        }
      })
      .catch(() => {});
  }, []);

  const active = tiers[selectedTier] ?? tiers[0];
  const eligibleRooms = rooms.filter((room) => room.variant.includes(active.variant.slice(0, 2)));
  const visibleRooms = (eligibleRooms.length ? eligibleRooms : rooms).slice(0, showAllRooms ? 8 : 4);
  const targetRoom = visibleRooms[0] ?? rooms[0];

  useEffect(() => {
    const timer = window.setInterval(() => setLiveBump((value) => value + 2), 4500);
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
          <span className="jackpot-growth"><Lightning size={15} weight="fill" />Live +${42 + liveBump}</span>
          <h2 id="jackpot-feature-title">{active.name}</h2>
          <strong aria-live="polite">
            {money(active.amount + liveBump)}
          </strong>
          <p>Rising with every ticket. Win with <b>{active.pattern}</b>.</p>
          <button className="jackpot-play-button" onClick={() => play()}>
            Play for {money(active.price)} <ArrowRight size={17} weight="bold" />
          </button>
          <small>Minimum 1 ticket</small>
        </div>

        <div className="jackpot-qualify">
          <h3>Your path to qualify</h3>
          <ol>
            <li>
              <span>1</span>
              <div>
                <House size={18} weight="duotone" />
                <p><b>Choose an eligible {active.variant} room</b><small>Look for rooms marked “Contributing”.</small></p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <Ticket size={18} weight="duotone" />
                <p><b>Buy a qualifying ticket</b><small>Each purchased ticket boosts this jackpot.</small></p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <CheckCircle size={18} weight="duotone" />
                <p><b>Complete the pattern</b><small>Win with {active.pattern.toLowerCase()}.</small></p>
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
            <div><dt><Clock size={16} />Next qualifying game</dt><dd>Today<small>11:59 PM</small></dd></div>
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

      <section className="jackpot-ladder" aria-labelledby="jackpot-ladder-title">
        <div className="jackpot-section-title">
          <h2 id="jackpot-ladder-title"><ChartLineUp size={20} />Jackpot ladder</h2>
          <p>Four jackpots. Four rewards. One thrilling chase.</p>
        </div>
        <div className="jackpot-tier-grid">
          {tiers.map((tier, index) => {
            const TierIcon = tier.icon;
            return (
              <button
                key={tier.key}
                className={`jackpot-tier-card tier-${tier.key} ${selectedTier === index ? "selected" : ""}`}
                onClick={() => { setSelectedTier(index); setLiveBump(0); }}
                aria-pressed={selectedTier === index}
              >
                <span className="jackpot-tier-icon"><TierIcon size={27} weight="duotone" /></span>
                <span className="jackpot-tier-copy">
                  <b>{tier.name}</b>
                  <strong>{money(tier.amount)}</strong>
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

      <section className="jackpot-rooms" aria-labelledby="jackpot-rooms-title">
        <div className="jackpot-section-title">
          <h2 id="jackpot-rooms-title"><Pulse size={20} />Games contributing now</h2>
          <p>Join these {active.variant} rooms to contribute to the {active.name}.</p>
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
                <th>Next game</th>
                <th>Join</th>
              </tr>
            </thead>
            <tbody>
              {visibleRooms.map((room, index) => (
                <tr key={`${room.id}-${index}`}>
                  <td>
                    <span className="jackpot-room-ball">{room.variant.match(/\d+/)?.[0] ?? "75"}</span>
                    <span><b>{room.name}</b><small>Contributing</small></span>
                  </td>
                  <td>{money(room.ticketPrice || active.price)}</td>
                  <td><UsersThree size={15} />{room.players}</td>
                  <td>
                    <b>+{active.contribution}%</b>
                    <small>({money((room.ticketPrice || active.price) * active.contribution / 100)} per ticket)</small>
                  </td>
                  <td>{active.pattern}</td>
                  <td>{["11:59 PM", "12:14 AM", "12:29 AM", "12:44 AM"][index % 4]}</td>
                  <td><button onClick={() => play(room)}>Join room</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="jackpot-show-rooms" onClick={() => setShowAllRooms((value) => !value)}>
          {showAllRooms ? "Show fewer rooms" : "View all contributing rooms"} <ArrowRight size={14} />
        </button>
      </section>

      <aside className="jackpot-winner-strip">
        <Trophy size={24} weight="fill" />
        <span className="jackpot-winner-label">Recent winner</span>
        <strong>Ari.R won $42,180</strong>
        <p>in Mega Trueig Jackpot with Full House after 38 balls · 14:32</p>
        <button onClick={() => play()}>Play next round</button>
      </aside>

      {rulesOpen && (
        <div className="tourney-modal-backdrop">
          <button className="tourney-modal-scrim" aria-label="Close jackpot rules" onClick={() => setRulesOpen(false)} />
          <section className="tourney-rules-modal" role="dialog" aria-modal="true" aria-labelledby="jackpot-rules-title">
            <button className="tourney-modal-close" onClick={() => setRulesOpen(false)}>Close</button>
            <span className="section-kicker">Rules & eligibility</span>
            <h2 id="jackpot-rules-title">{active.name} rules</h2>
            <p>Every ticket bought in contributing {active.variant} rooms adds +{active.contribution}% to the prize pool.</p>
            <ol>
              <li>Qualify by buying at least 1 ticket ({money(active.price)} minimum) in a contributing room.</li>
              <li>Win the jackpot by completing <b>{active.pattern}</b>.</li>
              <li>If multiple players claim simultaneously, the jackpot splits equally.</li>
              <li>When won, the jackpot immediately resets to {money(active.reset)}.</li>
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
