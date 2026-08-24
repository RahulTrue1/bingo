"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  BingoEngine,
  BingoRoomData,
  BingoStatus,
  PatternValidator,
  TransactionManager,
  demoRooms,
  makeGridCard,
  make90Ticket,
  make75Card,
} from "./bingo-core";

type AppMode = "player" | "admin";
type PlayerView = "lobby" | "room" | "tickets" | "jackpots" | "tournaments" | "promotions" | "history" | "profile";
type GamePhase = "selling" | "countdown" | "live" | "review" | "winner" | "results";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 10 ? 2 : 0 }).format(value);

function Icon({ children }: { children: ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`logo ${dark ? "logo-dark" : ""}`}>
      <img className="logo-mark" src="/logo.svg" alt="" aria-hidden="true" />
      <span><b>TRUEIGTECH</b> BINGO</span>
    </div>
  );
}

function StatusPill({ status }: { status: BingoStatus }) {
  return <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}><i />{status}</span>;
}

function Toast({ message }: { message: string }) {
  return message ? <div className="toast"><span>✓</span>{message}</div> : null;
}

export default function Home() {
  const [mode, setMode] = useState<AppMode>("player");
  const [rooms, setRooms] = useState(demoRooms);
  const [playerView, setPlayerView] = useState<PlayerView>("lobby");
  const [activeRoomId, setActiveRoomId] = useState("diamond-75");
  const [wallet, setWallet] = useState(248.5);
  const [toast, setToast] = useState("");

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function enterRoom(room: BingoRoomData) {
    setActiveRoomId(room.id);
    setPlayerView("room");
  }

  return (
    <main className={mode === "admin" ? "admin-shell" : "player-shell"}>
      {mode === "player" ? (
        <>
          <PlayerHeader
            view={playerView}
            setView={setPlayerView}
            setMode={setMode}
            wallet={wallet}
          />
          {playerView === "lobby" && <PlayerLobby rooms={rooms} enterRoom={enterRoom} setView={setPlayerView} />}
          {playerView === "room" && (
            <GameRoom
              key={activeRoom.id}
              room={activeRoom}
              wallet={wallet}
              setWallet={setWallet}
              goBack={() => setPlayerView("lobby")}
              notify={notify}
            />
          )}
          {playerView === "tournaments" && <TournamentLobby enterRoom={() => enterRoom(rooms[7] ?? rooms[0])} />}
          {playerView === "history" && <PlayerHistory />}
          {playerView === "tickets" && <PlayerHubPage type="tickets" rooms={rooms} enterRoom={enterRoom} />}
          {playerView === "jackpots" && <PlayerHubPage type="jackpots" rooms={rooms} enterRoom={enterRoom} />}
          {playerView === "promotions" && <PlayerHubPage type="promotions" rooms={rooms} enterRoom={enterRoom} />}
          {playerView === "profile" && <PlayerHubPage type="profile" rooms={rooms} enterRoom={enterRoom} />}
        </>
      ) : (
        <AdminExperience rooms={rooms} setRooms={setRooms} setMode={setMode} notify={notify} />
      )}
      <Toast message={toast} />
    </main>
  );
}

function PlayerHeader({ view, setView, setMode, wallet }: { view: PlayerView; setView: (view: PlayerView) => void; setMode: (mode: AppMode) => void; wallet: number }) {
  const links: Array<[PlayerView, string]> = [["lobby", "Lobby"], ["tickets", "Tickets"], ["jackpots", "Jackpots"], ["tournaments", "Tournaments"], ["promotions", "Promotions"], ["history", "History"]];
  return (
    <header className="player-header">
      <button className="brand-button" onClick={() => setView("lobby")} aria-label="Go to lobby"><Logo /></button>
      <nav className="main-nav" aria-label="Player navigation">
        {links.map(([key, label]) => <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>{label}</button>)}
      </nav>
      <div className="header-actions">
        <button className="outline-button support-button"><Icon>?</Icon> Support</button>
        <button className="mode-link" onClick={() => setMode("admin")} aria-label="Open Trueigtech Backoffice"><Icon>⌘</Icon><span>Backoffice</span></button>
        <div className="wallet"><small>WALLET</small><strong>{money(wallet)}</strong><button aria-label="Add funds">+</button></div>
        <button className="avatar-button" aria-label="Open profile" onClick={() => setView("profile")}><span>AR</span><i /></button>
      </div>
    </header>
  );
}

function PlayerLobby({ rooms, enterRoom, setView }: { rooms: BingoRoomData[]; enterRoom: (room: BingoRoomData) => void; setView: (view: PlayerView) => void }) {
  const [filter, setFilter] = useState("All games");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(["diamond-75"]);
  const filters = ["All games", "Live now", "75-Ball", "90-Ball", "Speed", "Jackpots", "Free"];
  const filtered = rooms.filter((room) => {
    const matchesSearch = `${room.name} ${room.variant}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All games"
      || (filter === "Live now" && room.status === "Live")
      || (filter === "Jackpots" && Boolean(room.jackpot))
      || (filter === "Free" && room.ticketPrice === 0)
      || room.variant.includes(filter.replace("-Ball", ""));
    return matchesSearch && matchesFilter;
  });

  const toggleFavorite = (id: string) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <div className="lobby-page">
      <HeroCarousel rooms={rooms} enterRoom={enterRoom} setView={setView} />

      <section className="lobby-content">
        <div className="section-heading">
          <div><span className="section-kicker">DISCOVER</span><h2>Find your next game</h2></div>
          <div className="search-box"><Icon>⌕</Icon><input aria-label="Search rooms" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rooms or variants" /><kbd>⌘ K</kbd></div>
        </div>
        <div className="filter-row">
          <div className="filter-tabs">{filters.map((item) => <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div>
          <button className="sort-button"><Icon>↕</Icon> Sort: Popular</button>
        </div>
        <div className="lobby-section-chips">
          {[["●", "Live now", "3 rooms"], ["◷", "Starting soon", "5 rooms"], ["✦", "Jackpot Bingo", "$125k live"], ["⚡", "Speed Bingo", "Next in 00:17"], ["♛", "VIP Bingo", "Tonight 21:00"]].map((item) => <button key={item[1]} onClick={() => setFilter(item[1].includes("Jackpot") ? "Jackpots" : item[1].includes("Speed") ? "Speed" : item[1].includes("Live") ? "Live now" : "All games")}><i>{item[0]}</i><span><b>{item[1]}</b><small>{item[2]}</small></span></button>)}
        </div>
        <div className="room-grid">
          {filtered.map((room) => <RoomCard key={room.id} room={room} onEnter={() => enterRoom(room)} favorite={favorites.includes(room.id)} toggleFavorite={() => toggleFavorite(room.id)} />)}
        </div>
        {!filtered.length && <div className="empty-state"><span>⌕</span><h3>No rooms found</h3><p>Try a different game type or search term.</p></div>}
        <div className="lobby-lower-grid">
          <section className="tournament-promo">
            <div><span className="eyebrow dark"><i /> FRIDAY · 20:00 UTC</span><h3>Trueigtech Weekend Cup</h3><p>Five rounds. One champion. The top 128 advance after every lightning-fast stage.</p></div>
            <div className="promo-prize"><small>PRIZE POOL</small><strong>$25,000</strong><span>384 / 512 players</span><div><i style={{ width: "75%" }} /></div></div>
            <button onClick={() => setView("tournaments")}>View tournament <span>→</span></button>
          </section>
          <section className="recent-winners">
            <div className="mini-section-title"><div><span className="live-dot" /><h3>Live wins</h3></div><button>View all</button></div>
            {[
              ["MK", "MikaK", "Mega Trueig Jackpot", "+$2,840"], ["SJ", "SkyJump", "Trueig 90 Classic", "+$625"], ["LA", "LunaAce", "Turbo 30", "+$180"],
            ].map((winner, index) => <div className="winner-row" key={winner[1]}><span className={`winner-avatar avatar-${index}`}>{winner[0]}</span><div><strong>{winner[1]}</strong><small>{winner[2]}</small></div><b>{winner[3]}</b></div>)}
          </section>
        </div>
      </section>
    </div>
  );
}

function HeroCarousel({ rooms, enterRoom, setView }: { rooms: BingoRoomData[]; enterRoom: (room: BingoRoomData) => void; setView: (view: PlayerView) => void }) {
  const slides = [
    { id: "mega-jackpot", kicker: "MEGA TRUEIG JACKPOT", title: <>The next call could<br />change <em>everything.</em></>, body: "Complete Full House within 42 balls for the progressive. Miss the limit and the $5,000 house prize is still live.", cta: "Play now", alt: "View jackpot", seconds: 151, theme: "jackpot", value: "$125,480" },
    { id: "turbo-30", kicker: "SPEED BINGO", title: <>Thirty balls.<br /><em>Full speed.</em></>, body: "Grab a 3×3 card, count down from five and race to a full house in under two minutes.", cta: "Join round", alt: "How it works", seconds: 17, theme: "speed", value: "00:17" },
    { id: "free-party", kicker: "FREE BINGO EVERY HOUR", title: <>Your next card<br />is <em>on us.</em></>, body: "Claim a free 75-ball card and play Four Corners for a $100 community prize.", cta: "Claim free card", alt: "View schedule", seconds: 2380, theme: "free", value: "18:00" },
    { id: "tournament", kicker: "TRUEIGTECH WEEKEND CUP", title: <>Five rounds.<br /><em>One champion.</em></>, body: "Build points across patterns and Full House wins. The top 128 advance after every stage.", cta: "Enter tournament", alt: "View standings", seconds: 6840, theme: "tournament", value: "$25,000" },
    { id: "vip-gold", kicker: "VIP BINGO NIGHT", title: <>Premium cards.<br /><em>Golden prizes.</em></>, body: "A private X Pattern to Blackout progression for Trueigtech VIP players.", cta: "Enter VIP room", alt: "View benefits", seconds: 4200, theme: "vip", value: "$20,000" },
  ];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(slides[0].seconds);
  const [jackpot, setJackpot] = useState(125480.6);
  const active = slides[index];
  const activeRoom = rooms.find((room) => room.id === active.id) ?? rooms[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (paused) return;
      setSeconds((value) => value > 0 ? value - 1 : active.seconds);
      setJackpot((value) => value + 0.17);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused, active.seconds]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % slides.length), 8000);
    return () => window.clearTimeout(timer);
  }, [index, paused]);

  useEffect(() => setSeconds(active.seconds), [index]);
  const displayTime = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const move = (direction: number) => setIndex((value) => (value + direction + slides.length) % slides.length);

  return <section className={`lobby-hero hero-slide-${active.theme}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
    <div className="hero-copy">
      <span className="eyebrow"><i /> {active.kicker} · {displayTime}</span>
      <h1>{active.title}</h1><p>{active.body}</p>
      <div className="hero-actions"><button className="primary-button" onClick={() => enterRoom(activeRoom)}>{active.cta} <span>→</span></button><button className="glass-button" onClick={() => active.id === "tournament" ? setView("tournaments") : active.id === "mega-jackpot" ? setView("jackpots") : enterRoom(activeRoom)}>{active.alt}</button></div>
      <div className="trust-row"><span><b>{2847 + index * 31}</b> players online</span><span><b>{rooms.length}</b> playable rooms</span><span><b>$186k</b> won today</span></div>
    </div>
    <div className="jackpot-display">
      <div className="orbit orbit-one" /><div className="orbit orbit-two" />
      <span className="jackpot-kicker">{active.kicker}</span>
      <strong>{active.theme === "jackpot" ? money(jackpot) : active.value}</strong>
      <p>{activeRoom.pattern}</p><div className="jackpot-meter"><span style={{ width: `${64 + index * 6}%` }} /></div><small>{activeRoom.players + index * 4} players · {activeRoom.cardsSold} cards sold</small>
      <div className="floating-ball ball-b"><small>{active.theme === "speed" ? "" : "B"}</small>{active.theme === "speed" ? "30" : "12"}</div><div className="floating-ball ball-o"><small>O</small>68</div><div className="floating-ball ball-g"><small>G</small>49</div>
    </div>
    <div className="carousel-controls"><button onClick={() => move(-1)} aria-label="Previous promotion">←</button><div>{slides.map((slide, slideIndex) => <button key={slide.id} className={slideIndex === index ? "active" : ""} onClick={() => setIndex(slideIndex)} aria-label={`Show ${slide.kicker}`} />)}</div><button onClick={() => move(1)} aria-label="Next promotion">→</button><button className="carousel-pause" onClick={() => setPaused(!paused)} aria-label={paused ? "Resume carousel" : "Pause carousel"}>{paused ? "▶" : "Ⅱ"}</button></div>
  </section>;
}

function patternCells(name: string, rows: number, columns: number, ballCount: number): number[] {
  if (ballCount === 90) return name.includes("Two") ? Array.from({ length: 18 }, (_, index) => index) : name.includes("Full") ? Array.from({ length: 27 }, (_, index) => index) : Array.from({ length: 9 }, (_, index) => index);
  if (ballCount === 30 || name.includes("Full") || name.includes("Blackout")) return Array.from({ length: rows * columns }, (_, index) => index);
  if (name.includes("Four")) return [0, columns - 1, (rows - 1) * columns, rows * columns - 1];
  if (name.includes("Diamond")) return rows === 5 ? [2, 6, 8, 10, 12, 14, 16, 18, 22] : [1, 4, 7, 10, 13];
  if (name.includes("X")) return Array.from({ length: rows }, (_, i) => [i * columns + i, i * columns + (columns - 1 - i)]).flat();
  if (name.includes("Cross")) return Array.from({ length: rows }, (_, i) => [Math.floor(rows / 2) * columns + i, i * columns + Math.floor(columns / 2)]).flat();
  if (name.includes("Two")) return Array.from({ length: columns * 2 }, (_, index) => index);
  return Array.from({ length: columns }, (_, index) => index);
}

function RoomCard({ room, onEnter, favorite, toggleFavorite }: { room: BingoRoomData; onEnter: () => void; favorite: boolean; toggleFavorite: () => void }) {
  // Prefer the room's most distinctive stage: a coverall fills all 25 cells, so
  // leading with it would render half the lobby as identical solid blocks.
  const stageNames = room.winningStages?.map((stage) => stage.name) ?? [];
  const headlinePattern = [...stageNames].reverse().find((name) => !/full house|blackout|coverall/i.test(name)) ?? stageNames.at(-1) ?? room.pattern;
  const orbCells = patternCells(headlinePattern, 5, 5, 75);
  return (
    <article className={`room-card accent-${room.accent}`}>
      <div className="room-card-top">
        <span className="room-tag">{room.tag}</span>
        <button className={`favorite-button ${favorite ? "active" : ""}`} onClick={toggleFavorite} aria-label={favorite ? "Remove from favorites" : "Add to favorites"}>♥</button>
      </div>
      <div className="room-orb">
        <span>
          <span className="room-orb-pattern" role="img" aria-label={`${headlinePattern} winning pattern`}>
            {Array.from({ length: 25 }, (_, index) => <i className={orbCells.includes(index) ? "marked" : ""} key={index} />)}
          </span>
        </span>
      </div>
      <div className="room-main">
        <StatusPill status={room.status} />
        <h3>{room.name}</h3>
        <p>{room.variant}</p>
        <div className="room-prize"><small>{room.jackpot ? "CURRENT JACKPOT" : "PRIZE POOL"}</small><strong>{money(room.jackpot ?? room.prize)}</strong></div>
        <div className="room-meta"><span><small>TICKET</small><b>{room.ticketPrice ? money(room.ticketPrice) : "FREE"}</b></span><span><small>{room.status === "Live" ? "ROUND" : "STARTS IN"}</small><b>{room.startsIn}</b></span><span><small>PLAYERS</small><b>{room.players}/{room.maxPlayers}</b></span><span><small>CARDS SOLD</small><b>{room.cardsSold}</b></span></div>
        <div className="sales-progress"><span style={{ width: `${Math.min(100, (room.players / room.maxPlayers) * 100)}%` }} /></div>
        <div className="room-frequency"><span>{room.frequency ?? "Every 10 min"}</span><span>{room.winningStages?.length ?? 1} winning stage{(room.winningStages?.length ?? 1) > 1 ? "s" : ""}</span></div>
        <div className="room-footer"><span><Icon>◇</Icon>{room.pattern}</span><button onClick={onEnter}>{room.status === "Live" ? "Join live" : "Play demo"} <b>→</b></button></div>
      </div>
    </article>
  );
}

function GameRoom({ room, wallet, setWallet, goBack, notify }: { room: BingoRoomData; wallet: number; setWallet: (value: number) => void; goBack: () => void; notify: (message: string) => void }) {
  const [phase, setPhase] = useState<GamePhase>("selling");
  const [countdown, setCountdown] = useState(5);
  const [called, setCalled] = useState<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [autoDaub, setAutoDaub] = useState(true);
  const [manualMarks, setManualMarks] = useState<number[]>([]);
  const [speed, setSpeed] = useState(room.variant.includes("Speed") ? "Turbo" : "Fast");
  const [paused, setPaused] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [selectedCards, setSelectedCards] = useState<number[]>([0, 1, 2]);
  const [activeCard, setActiveCard] = useState(0);
  const [multiView, setMultiView] = useState(true);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [stageIndex, setStageIndex] = useState(0);
  const [patternRound, setPatternRound] = useState(0);
  const [winnerNames, setWinnerNames] = useState<string[]>([]);
  const [winnerPrize, setWinnerPrize] = useState(0);
  const [winnerPattern, setWinnerPattern] = useState("");
  const [claimLocked, setClaimLocked] = useState(false);
  const [chat, setChat] = useState("");
  const [livePlayers, setLivePlayers] = useState(room.players);
  const [liveCards, setLiveCards] = useState(room.cardsSold);
  const [liveJackpot, setLiveJackpot] = useState(room.jackpot ?? 0);
  const [lastWinner, setLastWinner] = useState("LuckyStar · $420");
  const [messages, setMessages] = useState([
    ["Trueigtech", `Welcome to ${room.name}. ${room.pattern} is the opening target.`, "now"],
    ["PixelPete", room.variant.includes("Speed") ? "Ready for turbo mode ⚡" : "Good luck, everyone!", "1m"],
    ["MikaK", "Cards locked in. Eyes down!", "1m"],
  ]);

  const ballCount = room.variant.includes("90") ? 90 : room.variant.includes("30") ? 30 : room.variant.includes("80") ? 80 : 75;
  const rows = room.cardRows ?? (ballCount === 90 ? 3 : ballCount === 30 ? 3 : ballCount === 80 ? 4 : 5);
  const columns = room.cardColumns ?? (ballCount === 90 ? 9 : ballCount === 30 ? 3 : ballCount === 80 ? 4 : 5);
  const patternSeries = ["X Pattern", "Diamond", "Four Corners", "Cross", "Blackout"];
  const stages = room.id === "pattern-arena"
    ? [{ name: patternSeries[patternRound], prize: room.prize, continueAfterWin: false }]
    : room.winningStages ?? [{ name: room.pattern, prize: room.prize, continueAfterWin: false }];
  const activeStage = stages[Math.min(stageIndex, stages.length - 1)];
  const price = room.ticketPrice * selectedCards.length;

  const cardValues = useMemo(() => Array.from({ length: 8 }, (_, index) => {
    if (ballCount === 90) return make90Ticket(index + 2);
    if (ballCount === 80) return makeGridCard(4, 4, 80, index + 2).map((cell) => cell.value);
    if (ballCount === 30) return makeGridCard(3, 3, 30, index + 2).map((cell) => cell.value);
    return make75Card(index + 2).map((cell) => cell.value);
  }), [ballCount]);

  const ballLabel = (value: number) => ballCount === 75 ? BingoEngine.label(value) : `${value}`;
  const targetCells = (name: string) => patternCells(name, rows, columns, ballCount);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("live");
      notify(`${room.name} is live — ${activeStage.name} is the first stage.`);
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "live" || paused) return;
    const delays: Record<string, number> = { Slow: 3200, Normal: 2100, Fast: room.callDelay ?? 1200, Turbo: 600 };
    const timer = window.setInterval(() => {
      setCalled((previous) => {
        const next = BingoEngine.nextNumber(previous, ballCount);
        if (next === null) return previous;
        setCurrent(next);
        if ((previous.length + 1) % 5 === 0) setMessages((items) => [...items.slice(-7), ["System", `Ball ${ballLabel(next)} has been called.`, "now"]]);
        return [...previous, next];
      });
    }, delays[speed]);
    return () => window.clearInterval(timer);
  }, [phase, paused, speed, ballCount, room.callDelay]);

  useEffect(() => {
    if (phase !== "live") return;
    const timer = window.setInterval(() => {
      setLivePlayers((value) => Math.max(10, value + (Math.random() > .35 ? 1 : -1)));
      setLiveCards((value) => value + (Math.random() > .4 ? 1 : 0));
      if (room.jackpot) setLiveJackpot((value) => value + .25);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [phase, room.jackpot]);

  useEffect(() => {
    if (phase !== "live" || claimLocked) return;
    const thresholds = ballCount === 90 ? [7, 13, 19] : ballCount === 30 ? [8] : ballCount === 80 ? [7, 12, 18] : stages.length > 1 ? [7, 13, 20, 26] : [12];
    if (called.length >= (thresholds[stageIndex] ?? 14)) triggerWinner(stageIndex === 1 ? ["LuckyStar", "MikaK"] : [stageIndex === 0 ? "LuckyStar" : "Ari.R"]);
  }, [called.length, phase, stageIndex, claimLocked]);

  function injectWinningNumbers() {
    const values = cardValues[activeCard];
    const winning = targetCells(activeStage.name).map((index) => values[index]).filter((value): value is number => typeof value === "number");
    setCalled((previous) => Array.from(new Set([...previous, ...winning])));
  }

  function triggerWinner(names = ["Ari.R"]) {
    if (phase !== "live" || claimLocked) return;
    setClaimLocked(true);
    injectWinningNumbers();
    setWinnerNames(names);
    setWinnerPattern(activeStage.name);
    const jackpotQualified = room.jackpot && activeStage.name.includes("Full") && called.length <= (room.progressiveBallLimit ?? 42);
    const total = jackpotQualified ? liveJackpot : activeStage.prize;
    setWinnerPrize(total / names.length);
    setPhase("review");
    window.setTimeout(() => {
      setPhase("winner");
      setLastWinner(`${names.join(" & ")} · ${money(total)}`);
      setWallet(Math.round((wallet + (names.includes("Ari.R") ? total / names.length : 0)) * 100) / 100);
      setMessages((items) => [...items, ["System", `${names.join(" & ")} won ${activeStage.name}! ${names.length > 1 ? `${money(total)} split equally.` : money(total)}`, "now"]]);
      window.setTimeout(() => {
        if (activeStage.continueAfterWin && stageIndex < stages.length - 1) {
          setStageIndex((value) => value + 1); setPhase("live"); setClaimLocked(false);
          notify(`${activeStage.name} paid. The round continues to the next winning stage.`);
        } else {
          setPhase("results");
        }
      }, 2600);
    }, 1200);
  }

  const startRound = () => {
    if (!selectedCards.length) return notify("Select at least one card before starting the round.");
    if (wallet < price) return notify("Not enough wallet balance for these cards.");
    setWallet(Math.round((wallet - price) * 100) / 100); setPhase("countdown"); setCountdown(5);
    notify(`${selectedCards.length} card${selectedCards.length > 1 ? "s" : ""} secured · ${TransactionManager.reference("TRUEIG")}`);
  };

  const nextRound = () => {
    setCalled([]); setCurrent(null); setManualMarks([]); setPhase("selling"); setCountdown(5); setPaused(false); setStageIndex(0); setClaimLocked(false); setWinnerNames([]);
    if (room.id === "pattern-arena") setPatternRound((value) => (value + 1) % patternSeries.length);
    notify(room.id === "pattern-arena" ? `Next pattern loaded: ${patternSeries[(patternRound + 1) % patternSeries.length]}.` : "Next round is open for tickets.");
  };

  const sendChat = (event: FormEvent) => { event.preventDefault(); if (!chat.trim()) return; setMessages((items) => [...items, ["Ari.R", chat.trim(), "now"]]); setChat(""); };
  const toggleCard = (index: number) => {
    if (phase !== "selling") return setActiveCard(index);
    setSelectedCards((cards) => cards.includes(index) ? cards.filter((item) => item !== index) : cards.length < 8 ? [...cards, index] : cards);
    setActiveCard(index);
  };
  const visibleCards = (phase === "selling" ? Array.from({ length: 8 }, (_, index) => index) : selectedCards).sort((a, b) => sortDirection === "asc" ? a - b : b - a);

  return <div className="game-page">
    <div className="game-topbar"><button className="back-button" onClick={goBack}>← <span>Trueigtech Lobby</span></button><div className="game-room-title"><span className={`mini-orb accent-${room.accent}`}>{ballCount}</span><div><h1>{room.name}</h1><p>{room.variant} · Game TRUEIG-{2842 + patternRound}</p></div><StatusPill status={phase === "live" ? "Live" : phase === "selling" ? "Selling Tickets" : "Starting Soon"} /></div><div className="game-top-actions"><span><small>{room.jackpot ? "Jackpot" : "Prize pool"}</small><b>{money(room.jackpot ? liveJackpot : room.prize)}</b></span><span><small>Players</small><b>{livePlayers}</b></span><button onClick={() => setVoiceOn(!voiceOn)} aria-label="Voice caller">{voiceOn ? "◖" : "×"}</button><button onClick={() => setPaused(!paused)} aria-label="Pause or resume">{paused ? "▶" : "Ⅱ"}</button><button aria-label="Full screen">⛶</button></div></div>
    <div className="phase-rail">{[["selling","Cards"],["countdown","Countdown"],["live","Calling"],["review","Validation"],["winner","Winner"],["results","Results"]].map(([key,label],index)=>{const order=["selling","countdown","live","review","winner","results"];const activeIndex=order.indexOf(phase);return <div className={`${key===phase?"active":""} ${index<activeIndex?"done":""}`} key={key}><span>{index<activeIndex?"✓":index+1}</span><small>{label}</small></div>})}</div>
    <div className="game-layout">
      <section className="caller-panel">
        <div className="caller-heading"><div><span className="live-dot"/><b>TRUEIGTECH CALLER</b></div><select value={speed} onChange={(event)=>setSpeed(event.target.value)}>{["Slow","Normal","Fast","Turbo"].map(value=><option key={value}>{value}</option>)}</select></div>
        <div className={`current-ball ${phase==="live"&&!paused?"calling":""}`}>{phase==="selling"?<><small>ROUND OPENS</small><strong>00:18</strong></>:phase==="countdown"?<><small>STARTING IN</small><strong>{countdown}</strong></>:<><small>{current&&ballCount===75?BingoEngine.label(current).split("-")[0]:"BALL"}</small><strong>{current??"—"}</strong></>}</div>
        <div className="caller-state"><h2>{phase==="selling"?"Select your cards":phase==="countdown"?"Eyes down":phase==="review"?"Validating ticket…":phase==="winner"?"BINGO confirmed!":phase==="results"?"Round complete":paused?"Calling paused":current?`${ballLabel(current)} called`:"Ready for first ball"}</h2><p>{phase==="live"?`${voiceOn?"Voice on":"Voice off"} · ${speed} pace · next ball in ${speed==="Turbo"?"0.6":"1.2"}s`:activeStage.name}</p></div>
        <div className="recent-calls"><small>PREVIOUS BALLS</small><div>{called.slice(-5).reverse().map((number,index)=><span className={index===0?"latest":""} key={number}>{ballLabel(number).replace("-","")}</span>)}{!called.length&&<em>Numbers appear here</em>}</div></div>
        <div className="winning-stage-list"><small>WINNING STAGES</small>{stages.map((stage,index)=><div className={`${index===stageIndex?"active":""} ${index<stageIndex?"complete":""}`} key={stage.name}><i>{index<stageIndex?"✓":index+1}</i><span><b>{stage.name}</b><small>{money(stage.prize)} · {stage.continueAfterWin?"game continues":"final stage"}</small></span></div>)}</div>
        <div className="pattern-preview"><div><small>ACTIVE TARGET</small><strong>{activeStage.name}</strong><span>{room.jackpot?`Jackpot within ${room.progressiveBallLimit} balls`:`Prize · ${money(activeStage.prize)}`}</span></div><div className={`mini-pattern pattern-${columns}`}>{Array.from({length:Math.min(25,rows*columns)},(_,index)=><i className={targetCells(activeStage.name).includes(index)?"marked":""} key={index}/>)}</div></div>
        {phase==="selling"?<div className="ticket-purchase"><div><button onClick={()=>setSelectedCards((cards)=>cards.slice(0,-1))}>−</button><strong>{selectedCards.length}<small>SELECTED</small></strong><button onClick={()=>setSelectedCards((cards)=>cards.length<8?[...cards,Array.from({length:8},(_,i)=>i).find(i=>!cards.includes(i))??0]:cards)}>+</button></div><button className="buy-button" onClick={startRound}>Buy cards · {price?money(price):"Free"}<span>→</span></button><p>Choose specific cards below · Maximum 8</p></div>:phase==="results"?<button className="buy-button" onClick={nextRound}>Open next round <span>→</span></button>:<><button className="bingo-button" onClick={()=>triggerWinner(["Ari.R"])} disabled={phase!=="live"}><span>BINGO!</span><small>Demonstrate {activeStage.name}</small></button>{phase==="live"&&<button className="caller-pause-button" onClick={()=>setPaused(!paused)}>{paused?"▶ Resume caller":"Ⅱ Pause caller"}</button>}</>}
      </section>
      <section className="cards-panel">
        <div className="room-stats-strip">{[["PLAYERS ONLINE",livePlayers],["CARDS SOLD",liveCards],["PRIZE POOL",money(room.prize)],["LAST WINNER",lastWinner],["AVG BALLS","41.2"],["GAMES TODAY","126"]].map(stat=><span key={stat[0]}><small>{stat[0]}</small><b>{stat[1]}</b></span>)}</div>
        <div className="cards-toolbar"><div><h2>{phase==="selling"?"Choose cards":"Your cards"} <span>{selectedCards.length}</span></h2><p>Card #0{activeCard+1} · {called.filter(number=>cardValues[activeCard].includes(number)).length} matches</p></div><div className="card-tools"><button onClick={()=>setSelectedCards([0,1,2,3])}>Auto-select 4</button><button onClick={()=>setSortDirection(value=>value==="asc"?"desc":"asc")}>Sort {sortDirection==="asc"?"↓":"↑"}</button><button className={multiView?"active":""} onClick={()=>setMultiView(!multiView)}>Multi-view</button></div><div className="daub-control"><span><small>AUTO DAUB</small><b>{autoDaub?"All matches marked":"Manual mode"}</b></span><button className={autoDaub?"on":""} onClick={()=>setAutoDaub(!autoDaub)}><i/></button></div></div>
        <div className={`ticket-grid trueig-ticket-grid ${!multiView?"single":""}`}>{visibleCards.map(index=><TrueigTicket key={index} index={index} values={cardValues[index]} rows={rows} columns={columns} ballCount={ballCount} selected={selectedCards.includes(index)} active={activeCard===index} selling={phase==="selling"} called={called} manualMarks={manualMarks} autoDaub={autoDaub} targetCells={targetCells(activeStage.name)} onSelect={()=>toggleCard(index)} onPreview={()=>setActiveCard(index)} onMark={(value)=>{if(!called.includes(value))return notify("That number has not been called yet.");setManualMarks(values=>values.includes(value)?values.filter(item=>item!==value):[...values,value])}}/>)}</div>
        <div className="number-board"><div><h3>Full number board & history</h3><span>{called.length} of {ballCount} called · {paused?"Paused":`${speed} caller`}</span></div><div className={`number-board-grid board-${ballCount}`}>{Array.from({length:ballCount},(_,index)=>index+1).map(number=><span className={called.includes(number)?"called":""} key={number}>{number}</span>)}</div></div>
      </section>
      <aside className="social-panel"><div className="social-tabs"><button className="active">Chat</button><button>Players <span>{livePlayers}</span></button></div><div className="chat-messages"><div className="system-message"><span>◇</span><p>Stage {stageIndex+1}: <b>{activeStage.name}</b> for {money(activeStage.prize)}.</p></div>{messages.map((message,index)=><div className="chat-message" key={`${message[0]}-${index}`}><span className={`chat-avatar chat-${index%4}`}>{message[0].slice(0,2).toUpperCase()}</span><div><p><b>{message[0]}</b><small>{message[2]}</small></p><span>{message[1]}</span></div></div>)}{winnerNames.length>0&&phase==="winner"&&<div className="winner-announcement"><span>★</span><p><b>{winnerNames.join(" & ")} called BINGO!</b>{winnerPattern} · {money(winnerPrize)} each</p></div>}</div><form className="chat-input" onSubmit={sendChat}><button type="button" onClick={()=>setChat(value=>`${value} 🎉`)}>☺</button><input value={chat} onChange={event=>setChat(event.target.value)} placeholder="Say something…"/><button>↑</button></form><div className="mini-leaderboard"><div><h3>Trueigtech room leaders</h3><button>•••</button></div>{[["1","TrueigQueen","3 wins"],["2","MikaK","2 wins"],["3","Ari.R","1 win"]].map(row=><p key={row[0]}><i>{row[0]}</i><span>{row[1]}</span><small>{row[2]}</small></p>)}</div></aside>
    </div>
    {(phase==="review"||phase==="winner")&&<div className={`claim-overlay ${phase==="winner"?"confirmed":""}`}><div className="claim-modal"><div className="trueig-modal-brand">TRUEIGTECH BINGO ENGINE</div><div className="claim-icon">{phase==="winner"?"✓":<i/>}</div><span className="section-kicker">GAME TRUEIG-{2842+patternRound}</span><h2>{phase==="winner"?"Bingo confirmed!":"Validating ticket…"}</h2><p>{phase==="winner"?`${winnerNames.join(" & ")} completed ${winnerPattern} after ${called.length} balls.`:"Checking ownership, called numbers and the active winning pattern."}</p>{phase==="winner"?<><div className="winner-avatars">{winnerNames.map(name=><span key={name}>{name.slice(0,2).toUpperCase()}</span>)}</div><strong className="winner-prize">{money(winnerPrize)} each</strong><small>{winnerNames.length>1?`${winnerNames.length} simultaneous winners · prize split equally`:room.jackpot&&winnerPattern.includes("Full")?`Progressive qualified within ${room.progressiveBallLimit} balls`:`Winning Card #0${activeCard+1}`}</small></>:<div className="validation-steps"><span className="done">✓ Ticket ownership</span><span className="done">✓ Called-number history</span><span><i/> {activeStage.name} validation</span></div>}</div></div>}
  </div>;
}

function TrueigTicket({ index, values, rows, columns, ballCount, selected, active, selling, called, manualMarks, autoDaub, targetCells, onSelect, onPreview, onMark }: { index:number; values:Array<number|"FREE"|null>; rows:number; columns:number; ballCount:number; selected:boolean; active:boolean; selling:boolean; called:number[]; manualMarks:number[]; autoDaub:boolean; targetCells:number[]; onSelect:()=>void; onPreview:()=>void; onMark:(value:number)=>void }) {
  const isMarked=(value:number|"FREE"|null)=>value==="FREE"||(typeof value==="number"&&((autoDaub&&called.includes(value))||manualMarks.includes(value)));
  const matched=values.filter(value=>isMarked(value)).length;
  const needed=targetCells.filter(index=>values[index]!==null).length;
  const targetMatched=targetCells.filter(index=>isMarked(values[index])).length;
  const nearWin=targetMatched>=Math.max(1,needed-1)&&targetMatched<needed;
  return <div className={`bingo-ticket trueig-ticket ticket-${ballCount} ${active?"active":""} ${selected?"selected":""} ${nearWin?"near-win":""}`} onClick={onPreview} role="button" tabIndex={0} onKeyDown={event=>event.key==="Enter"&&onPreview()}>
    <div className="ticket-head"><b>TRUEIG CARD #{String(index+1).padStart(2,"0")}</b><div>{nearWin&&<span className="near-label">1 TO GO</span>}{selling?<button className={selected?"selected":""} onClick={event=>{event.stopPropagation();onSelect()}}>{selected?"✓ SELECTED":"+ SELECT"}</button>:<span>{active?"ACTIVE":`${matched} MARKED`}</span>}</div></div>
    {ballCount===75&&<div className="bingo-letters">{"BINGO".split("").map(letter=><b key={letter}>{letter}</b>)}</div>}
    <div className={`trueig-ticket-cells cells-${columns}`} style={{gridTemplateColumns:`repeat(${columns},1fr)`}}>{values.map((value,cellIndex)=><button className={`${value===null?"blank":""} ${isMarked(value)?"marked":""} ${targetCells.includes(cellIndex)?"target":""}`} onClick={event=>{event.stopPropagation();if(typeof value==="number")onMark(value)}} key={`${value}-${cellIndex}`} disabled={value===null}>{value==="FREE"?<span>★<small>FREE</small></span>:value}</button>)}</div>
    <div className="ticket-foot"><span>{nearWin?"⚡ Near win":selected?"♥ Selected":"Preview card"}</span><small>{rows}×{columns} · #{284200+index+1}</small></div>
  </div>;
}

function LegacyGameRoom({ room, wallet, setWallet, goBack, notify }: { room: BingoRoomData; wallet: number; setWallet: (value: number) => void; goBack: () => void; notify: (message: string) => void }) {
  const [phase, setPhase] = useState<GamePhase>("selling");
  const [countdown, setCountdown] = useState(5);
  const [cardCount, setCardCount] = useState(3);
  const [called, setCalled] = useState<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [autoDaub, setAutoDaub] = useState(true);
  const [manualMarks, setManualMarks] = useState<number[]>([]);
  const [speed, setSpeed] = useState("Fast");
  const [paused, setPaused] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [chat, setChat] = useState("");
  const [messages, setMessages] = useState([
    ["System", "Welcome to the Diamond 75 room. Good luck!", "now"],
    ["PixelPete", "That jackpot is looking very nice 👀", "1m"],
    ["MikaK", "GL everyone!", "1m"],
  ]);
  const cards = useMemo(() => Array.from({ length: Math.max(cardCount, 4) }, (_, index) => make75Card(index + 2)), [cardCount]);
  const ballCount = room.variant.includes("90") ? 90 : room.variant.includes("30") ? 30 : room.variant.includes("80") ? 80 : room.variant.includes("50") ? 50 : 75;
  const price = room.ticketPrice * cardCount;

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("live");
      notify("Round 2842 is live — good luck!");
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "live" || paused) return;
    const delays: Record<string, number> = { Slow: 4200, Normal: 2800, Fast: 1600, Turbo: 800 };
    const timer = window.setInterval(() => {
      setCalled((previous) => {
        const next = BingoEngine.nextNumber(previous, ballCount);
        if (next === null) return previous;
        setCurrent(next);
        return [...previous, next];
      });
    }, delays[speed]);
    return () => window.clearInterval(timer);
  }, [phase, paused, speed, ballCount]);

  useEffect(() => {
    if (phase !== "winner") return;
    const timer = window.setTimeout(() => setPhase("results"), 4200);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const startRound = () => {
    if (wallet < price) return notify("Not enough wallet balance for these cards.");
    setWallet(Math.round((wallet - price) * 100) / 100);
    setPhase("countdown");
    setCountdown(5);
    notify(`${cardCount} card${cardCount > 1 ? "s" : ""} secured · ${TransactionManager.reference("CARD")}`);
  };

  const claimBingo = () => {
    if (phase !== "live") return notify("Bingo claims open once the number call begins.");
    const winningNumbers = [cards[0][0], cards[0][4], cards[0][20], cards[0][24]].map((cell) => cell.value).filter((value): value is number => typeof value === "number");
    setCalled((previous) => Array.from(new Set([...previous, ...winningNumbers])));
    setPhase("review");
    window.setTimeout(() => {
      setPhase("winner");
      setWallet(Math.round((wallet - price + 1250) * 100) / 100);
    }, 1800);
  };

  const nextRound = () => {
    setCalled([]); setCurrent(null); setManualMarks([]); setPhase("selling"); setCountdown(5); setPaused(false);
    notify("Next round is open for tickets.");
  };

  const sendChat = (event: FormEvent) => {
    event.preventDefault();
    if (!chat.trim()) return;
    setMessages((items) => [...items, ["Ari.R", chat.trim(), "now"]]);
    setChat("");
  };

  return (
    <div className="game-page">
      <div className="game-topbar">
        <button className="back-button" onClick={goBack}>← <span>All rooms</span></button>
        <div className="game-room-title"><span className={`mini-orb accent-${room.accent}`}>75</span><div><h1>{room.name}</h1><p>{room.variant} · Round #2842</p></div><StatusPill status={phase === "live" ? "Live" : phase === "selling" ? "Selling Tickets" : "Starting Soon"} /></div>
        <div className="game-top-actions"><span><small>Prize pool</small><b>{money(room.prize)}</b></span><span><small>Players</small><b>{room.players + (phase === "live" ? 14 : 0)}</b></span><button aria-label="Sound">◖</button><button aria-label="Settings">⚙</button><button aria-label="Full screen">⛶</button></div>
      </div>
      <div className="phase-rail">
        {[["selling", "Cards"], ["countdown", "Countdown"], ["live", "Calling"], ["review", "Validation"], ["winner", "Winner"], ["results", "Results"]].map(([key, label], index) => {
          const order = ["selling", "countdown", "live", "review", "winner", "results"];
          const activeIndex = order.indexOf(phase);
          return <div className={`${key === phase ? "active" : ""} ${index < activeIndex ? "done" : ""}`} key={key}><span>{index < activeIndex ? "✓" : index + 1}</span><small>{label}</small></div>;
        })}
      </div>
      <div className="game-layout">
        <section className="caller-panel">
          <div className="caller-heading"><div><span className="live-dot" /><b>NUMBER CALLER</b></div><select aria-label="Calling speed" value={speed} onChange={(event) => setSpeed(event.target.value)}>{["Slow", "Normal", "Fast", "Turbo"].map((value) => <option key={value}>{value}</option>)}</select></div>
          <div className={`current-ball ${phase === "live" && !paused ? "calling" : ""}`}>
            {phase === "selling" ? <><small>ROUND OPENS</small><strong>00:18</strong></> : phase === "countdown" ? <><small>STARTING IN</small><strong>{countdown}</strong></> : <><small>{current ? BingoEngine.label(current).split("-")[0] : "—"}</small><strong>{current ?? "—"}</strong></>}
          </div>
          <div className="caller-state">
            {phase === "selling" && <><h2>Choose your cards</h2><p>Tickets close automatically when the countdown reaches zero.</p></>}
            {phase === "countdown" && <><h2>Eyes down</h2><p>The first ball is about to be called.</p></>}
            {phase === "live" && <><h2>{paused ? "Calling paused" : current ? `${BingoEngine.label(current)} called` : "Ready for first ball"}</h2><p>{paused ? "The operator will resume shortly." : "Voice caller · Fast pace"}</p></>}
            {phase === "review" && <><h2>Claim under review</h2><p>Checking Card #01 against called numbers…</p></>}
            {phase === "winner" && <><h2>Winner confirmed!</h2><p>Your Four Corners pattern is valid.</p></>}
            {phase === "results" && <><h2>Round complete</h2><p>Prize credited. Next round opens now.</p></>}
          </div>
          <div className="recent-calls"><small>RECENT CALLS</small><div>{called.slice(-5).reverse().map((number, index) => <span className={index === 0 ? "latest" : ""} key={number}>{BingoEngine.label(number).replace("-", "")}</span>)}{!called.length && <em>Numbers appear here</em>}</div></div>
          <div className="pattern-preview"><div><small>WINNING PATTERN</small><strong>Four Corners</strong><span>Prize · {money(room.prize)}</span></div><div className="mini-pattern">{Array.from({ length: 25 }, (_, index) => <i className={[0, 4, 20, 24].includes(index) ? "marked" : ""} key={index} />)}</div></div>
          {phase === "selling" ? (
            <div className="ticket-purchase"><div><button onClick={() => setCardCount(Math.max(1, cardCount - 1))}>−</button><strong>{cardCount}<small>CARDS</small></strong><button onClick={() => setCardCount(Math.min(8, cardCount + 1))}>+</button></div><button className="buy-button" onClick={startRound}>Buy cards · {price ? money(price) : "Free"}<span>→</span></button><p>Maximum 8 cards · Sales close in 00:18</p></div>
          ) : phase === "results" ? <button className="buy-button" onClick={nextRound}>Enter next round <span>→</span></button> : (
            <button className="bingo-button" onClick={claimBingo} disabled={phase !== "live"}><span>BINGO!</span><small>Claim on Card #01</small></button>
          )}
        </section>

        <section className="cards-panel">
          <div className="cards-toolbar"><div><h2>Your cards <span>{cardCount}</span></h2><p>Card #0{activeCard + 1} · {PatternValidator.completion(cards[activeCard], called)}% marked</p></div><div className="daub-control"><span><small>AUTO DAUB</small><b>{autoDaub ? "All matches marked" : "Manual mode"}</b></span><button className={autoDaub ? "on" : ""} onClick={() => setAutoDaub(!autoDaub)} aria-label="Toggle auto daub"><i /></button></div></div>
          <div className={`ticket-grid ${cardCount === 1 ? "single" : ""}`}>
            {cards.slice(0, cardCount).map((card, index) => (
              <BingoTicket key={index} index={index} variant={room.variant} active={activeCard === index} card={card} called={called} manualMarks={manualMarks} autoDaub={autoDaub} onSelect={() => setActiveCard(index)} onMark={(value) => {
                if (!called.includes(value)) return notify("That number has not been called yet.");
                setManualMarks((values) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
              }} />
            ))}
          </div>
          <div className="number-board">
            <div><h3>Number board</h3><span>{called.length} of {ballCount} called</span></div>
            <div className="number-board-grid">{Array.from({ length: ballCount }, (_, index) => index + 1).map((number) => <span className={called.includes(number) ? "called" : ""} key={number}>{number}</span>)}</div>
          </div>
        </section>

        <aside className="social-panel">
          <div className="social-tabs"><button className="active">Chat</button><button>Players <span>{room.players}</span></button></div>
          <div className="chat-messages">
            <div className="system-message"><span>◇</span><p>Win Four Corners to take the <b>{money(room.prize)}</b> prize pool.</p></div>
            {messages.map((message, index) => <div className="chat-message" key={`${message[0]}-${index}`}><span className={`chat-avatar chat-${index % 4}`}>{message[0].slice(0, 2).toUpperCase()}</span><div><p><b>{message[0]}</b><small>{message[2]}</small></p><span>{message[1]}</span></div></div>)}
            {phase === "winner" && <div className="winner-announcement"><span>★</span><p><b>Ari.R called BINGO!</b>Winner confirmed · Card #01</p></div>}
          </div>
          <form className="chat-input" onSubmit={sendChat}><button type="button">☺</button><input aria-label="Chat message" value={chat} onChange={(event) => setChat(event.target.value)} placeholder="Say something…" /><button aria-label="Send message">↑</button></form>
          <div className="mini-leaderboard"><div><h3>Room leaders</h3><button>•••</button></div>{[["1", "TrueigQueen", "3 wins"], ["2", "MikaK", "2 wins"], ["3", "Ari.R", "1 win"]].map((row) => <p key={row[0]}><i>{row[0]}</i><span>{row[1]}</span><small>{row[2]}</small></p>)}</div>
        </aside>
      </div>

      {(phase === "review" || phase === "winner") && <div className={`claim-overlay ${phase === "winner" ? "confirmed" : ""}`}>
        <div className="claim-modal"><button className="modal-close" onClick={() => setPhase("live")}>×</button><div className="claim-icon">{phase === "winner" ? "✓" : <i />}</div><span className="section-kicker">ROUND #2842</span><h2>{phase === "winner" ? "Bingo confirmed!" : "Validating your claim"}</h2><p>{phase === "winner" ? "Card #01 completed Four Corners after 28 calls." : "The game engine is comparing your card with the call history."}</p>{phase === "winner" ? <><strong className="winner-prize">+$1,250.00</strong><small>Shared prize · 4 simultaneous winners</small></> : <div className="validation-steps"><span className="done">✓ Ticket ownership</span><span className="done">✓ Called numbers</span><span><i /> Pattern validation</span></div>}</div>
      </div>}
    </div>
  );
}

function BingoTicket({ index, variant, active, card, called, manualMarks, autoDaub, onSelect, onMark }: { index: number; variant: string; active: boolean; card: ReturnType<typeof make75Card>; called: number[]; manualMarks: number[]; autoDaub: boolean; onSelect: () => void; onMark: (value: number) => void }) {
  const marked = (value: number | "FREE") => value === "FREE" || (typeof value === "number" && ((autoDaub && called.includes(value)) || manualMarks.includes(value)));
  if (variant.includes("90")) {
    const values: Array<number | null> = [2, null, 22, 31, null, 52, null, 71, 84, null, 14, 25, null, 43, 57, 62, null, 90, 7, 18, null, 39, 47, null, 68, 75, null];
    return <button className={`bingo-ticket ticket-90 ${active ? "active" : ""}`} onClick={onSelect}><div className="ticket-head"><b>CARD #{String(index + 1).padStart(2, "0")}</b><span>90 BALL</span></div><div className="ticket-90-grid">{values.map((value, cell) => <i className={value && marked(value) ? "marked" : !value ? "blank" : ""} key={cell}>{value}</i>)}</div></button>;
  }
  if (variant.includes("30")) {
    const values = [2, 6, 9, 12, 16, 20, 23, 27, 30].map((value) => Math.max(1, value - index));
    return <button className={`bingo-ticket ticket-30 ${active ? "active" : ""}`} onClick={onSelect}><div className="ticket-head"><b>CARD #{String(index + 1).padStart(2, "0")}</b><span>SPEED 30</span></div><div className="ticket-30-grid">{values.map((value) => <i className={marked(value) ? "marked" : ""} key={value}>{value}</i>)}</div></button>;
  }
  return (
    <div className={`bingo-ticket ${active ? "active" : ""}`} onClick={onSelect} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && onSelect()}>
      <div className="ticket-head"><b>CARD #{String(index + 1).padStart(2, "0")}</b><span>{active ? "ACTIVE" : "SELECT"}</span></div>
      <div className="bingo-letters">{"BINGO".split("").map((letter) => <b key={letter}>{letter}</b>)}</div>
      <div className="ticket-cells">{card.map((cell, cellIndex) => <button className={marked(cell.value) ? "marked" : ""} onClick={(event) => { event.stopPropagation(); if (typeof cell.value === "number") onMark(cell.value); }} key={`${cell.value}-${cellIndex}`}>{cell.value === "FREE" ? <span>★<small>FREE</small></span> : cell.value}</button>)}</div>
      <div className="ticket-foot"><span>♡ Favorite</span><small>#{284200 + index + 1}</small></div>
    </div>
  );
}

function TournamentLobby({ enterRoom }: { enterRoom: () => void }) {
  return <div className="simple-player-page"><div className="page-title-block"><span className="section-kicker">COMPETE</span><h1>Tournaments</h1><p>Stack points across multiple rounds and climb into the prize positions.</p></div><section className="tournament-hero-card"><div><span className="eyebrow dark"><i /> REGISTRATION OPEN</span><h2>Trueigtech Weekend Cup</h2><p>Five progressive elimination rounds · Top 128 qualify after each stage</p><div className="hero-actions"><button className="primary-button" onClick={enterRoom}>Enter for $8 <span>→</span></button><button className="glass-button">View rules</button></div></div><div className="tournament-number"><small>GUARANTEED PRIZE</small><strong>$25,000</strong><span>384 of 512 seats filled</span></div></section><div className="standings-card"><div className="table-header"><div><h2>Live standings</h2><p>Updated after Round 3 of 5</p></div><button className="outline-button">My position · #42</button></div><table><thead><tr><th>Rank</th><th>Player</th><th>Points</th><th>Wins</th><th>Fast bingo</th><th>Status</th></tr></thead><tbody>{[["1", "TrueigQueen", "480", "4", "18 balls", "Qualified"], ["2", "BallisticB", "455", "3", "21 balls", "Qualified"], ["3", "MikaK", "438", "3", "19 balls", "Qualified"], ["42", "Ari.R", "286", "1", "28 balls", "In play"]].map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{index === 5 ? <span className={`table-status ${cell === "Qualified" ? "success" : "warning"}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div></div>;
}

function PlayerHistory() {
  const rows = [["#2841", "Diamond 75", "Today · 14:32", "3", "$6.00", "+$0.00", "Completed"], ["#2838", "Trueig 90 Classic", "Today · 13:05", "6", "$3.00", "+$125.00", "Won"], ["#2812", "Turbo 30", "Yesterday · 21:48", "2", "$2.00", "+$0.00", "Completed"], ["#2794", "Free Bingo Party", "Yesterday · 19:00", "1", "Free", "+$25.00", "Won"]];
  return <div className="simple-player-page"><div className="page-title-block"><span className="section-kicker">ACTIVITY</span><h1>Game history</h1><p>Review every ticket, result and number call from your recent games.</p></div><div className="history-stats"><div><small>GAMES PLAYED</small><strong>128</strong><span>+14 this month</span></div><div><small>CARDS PURCHASED</small><strong>346</strong><span>2.7 avg / game</span></div><div><small>TOTAL PRIZES</small><strong>$2,840</strong><span>18 winning rounds</span></div></div><div className="standings-card"><div className="table-header"><div><h2>Recent rounds</h2><p>Last 30 days</p></div><button className="outline-button">Export history</button></div><table><thead><tr><th>Game ID</th><th>Room</th><th>Date & time</th><th>Cards</th><th>Entry</th><th>Prize</th><th>Result</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{index === 6 ? <span className={`table-status ${cell === "Won" ? "success" : "neutral"}`}>{cell}</span> : index === 0 ? <button className="table-link">{cell}</button> : cell}</td>)}</tr>)}</tbody></table></div></div>;
}

function PlayerHubPage({ type, rooms, enterRoom }: { type: "tickets" | "jackpots" | "promotions" | "profile"; rooms: BingoRoomData[]; enterRoom: (room: BingoRoomData) => void }) {
  const [claimed, setClaimed] = useState<string[]>([]);
  const title = type === "tickets" ? "My tickets" : type === "jackpots" ? "Trueigtech Jackpots" : type === "promotions" ? "Promotions" : "Player profile";
  const subtitle = type === "tickets" ? "Preview purchased cards and rejoin upcoming games." : type === "jackpots" ? "Track live progressives and their qualifying rules." : type === "promotions" ? "Claim rewards and use them in eligible Bingo rooms." : "Account, Bingo activity, balances and notification preferences.";
  if (type === "profile") return <div className="simple-player-page"><div className="page-title-block"><span className="section-kicker">TRUEIGTECH PLAYER</span><h1>{title}</h1><p>{subtitle}</p></div><div className="profile-grid"><section className="standings-card profile-summary"><span className="profile-avatar">AR</span><h2>Ari R.</h2><p>Player ID · TRUEIG-11804</p><span className="table-status success">Verified account</span><div><span><small>CURRENT BALANCE</small><b>$248.50</b></span><span><small>BINGO WINS</small><b>18</b></span><span><small>WIN RATE</small><b>14.1%</b></span><span><small>CARDS PLAYED</small><b>346</b></span></div></section><section className="standings-card profile-activity"><div className="table-header"><div><h2>Notification center</h2><p>Live alerts from your favorite rooms</p></div><button className="outline-button">Mark all read</button></div>{[["1 MIN","Your Trueig 90 Classic game starts in 1 minute."],["WIN","You won $250 in Diamond 75!"],["JP","Mega Trueig Jackpot increased to $126,240."],["FREE","Free Bingo starts in 5 minutes."],["CUP","Tournament Round 2 is now open."]].map(item=><div className="profile-notification" key={item[1]}><i>{item[0]}</i><span><b>{item[1]}</b><small>Trueigtech Bingo · just now</small></span><button>Open →</button></div>)}</section></div></div>;
  if (type === "tickets") return <div className="simple-player-page"><div className="page-title-block"><span className="section-kicker">CARD WALLET</span><h1>{title}</h1><p>{subtitle}</p></div><div className="ticket-wallet-grid">{rooms.slice(0,4).map((room,index)=><article className="standings-card wallet-ticket" key={room.id}><div><span className={`mini-orb accent-${room.accent}`}>{room.variant.match(/\d+/)?.[0]}</span><span><b>{room.name}</b><small>{room.variant} · Card #0{index+1}</small></span><span className="table-status warning">Starts {room.startsIn}</span></div><div className="wallet-card-preview">{Array.from({length:room.cardRows&&room.cardColumns?Math.min(25,room.cardRows*room.cardColumns):25},(_,cell)=><i className={cell%6===0?"marked":""} key={cell}>{(cell*7+index*3)%75+1}</i>)}</div><button className="primary-button" onClick={()=>enterRoom(room)}>Rejoin room →</button></article>)}</div></div>;
  if (type === "jackpots") { const jackpotRooms=rooms.filter(room=>room.jackpot); return <div className="simple-player-page"><div className="page-title-block"><span className="section-kicker">LIVE PROGRESSIVES</span><h1>{title}</h1><p>{subtitle}</p></div>{jackpotRooms.map(room=><section className="jackpot-player-card" key={room.id}><div><span className="eyebrow dark"><i/> PROGRESSIVE ACTIVE</span><h2>{room.name}</h2><p>{room.variant} · {room.pattern}</p><button className="primary-button" onClick={()=>enterRoom(room)}>Play for {money(room.ticketPrice)} →</button></div><div><small>CURRENT JACKPOT</small><strong>{money(room.jackpot??0)}</strong><span>+2.5% of every ticket · Reset $50,000</span><div><i style={{width:"50%"}}/></div></div></section>)}</div>; }
  const promotions=[["FREE75","Free Bingo Every Hour","Claim one free 75-ball card","free-party"],["BUY3","Buy 3, Get 1","Your fourth card is free in eligible rooms","diamond-75"],["HAPPY","Happy Hour Bingo","50% off tickets from 18:00–19:00","trueig-90"],["VIP","VIP Gold Access","Unlock tonight’s $20,000 prize room","vip-gold"],["CUP","Weekend Cup Ticket","Free tournament entry after five games","tournament"],["CASH","10% Bingo Cashback","Get back 10% of today’s entries","turbo-30"]];
  return <div className="simple-player-page"><div className="page-title-block"><span className="section-kicker">TRUEIGTECH REWARDS</span><h1>{title}</h1><p>{subtitle}</p></div><div className="promotion-player-grid">{promotions.map((promo,index)=><article className={`promotion-player-card promo-${index}`} key={promo[0]}><span>{promo[0]}</span><h2>{promo[1]}</h2><p>{promo[2]}</p><button className={claimed.includes(promo[0])?"claimed":""} onClick={()=>{if(claimed.includes(promo[0])){const room=rooms.find(item=>item.id===promo[3]);if(room)enterRoom(room)}else setClaimed(items=>[...items,promo[0]])}}>{claimed.includes(promo[0])?"Use reward →":"Claim reward"}</button></article>)}</div></div>;
}

const adminNav = [
  ["dashboard", "Dashboard", "⌂"], ["rooms", "Bingo rooms", "▦"], ["gamebuilder", "Games", "◫"], ["scheduler", "Scheduler", "□"], ["games", "Live control", "●"], ["variants", "Bingo variants", "⬡"], ["cards", "Bingo cards", "▤"], ["patterns", "Winning patterns", "◇"], ["caller", "Number caller", "◉"], ["prizes", "Prize management", "$"], ["jackpots", "Jackpots", "✦"], ["tournaments", "Tournaments", "♜"], ["players", "Players", "♙"], ["transactions", "Transactions", "⇄"], ["promotions", "Promotions", "%"], ["chat", "Chat moderation", "◌"], ["reports", "Reports", "↗"], ["history", "Game history", "↺"], ["roles", "Roles & permissions", "⌘"], ["audit", "Audit logs", "≡"], ["settings", "System settings", "⚙"],
];

type AdminAction = { kind: string; room?: BingoRoomData; label?: string };

function AdminExperience({ rooms, setRooms, setMode, notify }: { rooms: BingoRoomData[]; setRooms: (rooms: BingoRoomData[]) => void; setMode: (mode: AppMode) => void; notify: (message: string) => void }) {
  const [module, setModule] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [action, setAction] = useState<AdminAction | null>(null);
  const currentLabel = adminNav.find(([key]) => key === module)?.[1] ?? "Overview";
  const primaryActions: Record<string, [string, string]> = { rooms: ["+ Create room", "create-room"], gamebuilder: ["+ Create game", "create-game"], scheduler: ["+ Schedule game", "create-game"], variants: ["+ Create variant", "variants"], caller: ["Configure caller", "caller-config"], jackpots: ["+ Create jackpot", "create-jackpot"], tournaments: ["+ Create tournament", "create-tournament"], players: ["Open player profile", "player"], promotions: ["+ Create promotion", "promotion"], chat: ["+ Announcement", "announcement"], reports: ["Build report", "report"], settings: ["Configure platform", "settings"] };
  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-logo"><Logo dark /><button onClick={() => setSidebarOpen(false)}>×</button></div>
        <nav>{adminNav.map(([key, label, glyph]) => <button key={key} className={module === key ? "active" : ""} onClick={() => { setModule(key); setSidebarOpen(false); }}><Icon>{glyph}</Icon><span>{label}</span>{key === "games" && <i className="nav-badge">3</i>}{key === "chat" && <i className="nav-badge muted">12</i>}</button>)}</nav>
        <div className="sidebar-user"><span>JD</span><div><b>John Dawson</b><small>Super Admin</small></div><button>•••</button></div>
      </aside>
      <section className="admin-main">
        <header className="admin-header"><div><button className="mobile-menu" onClick={() => setSidebarOpen(true)}>☰</button><span>Trueigtech Operations /</span><b>{currentLabel}</b></div><div className="admin-header-actions"><button className="environment"><i /> Demo live</button><button className="notification" onClick={() => setAction({kind:"notifications"})}>♢<i>4</i></button><button className="view-player" onClick={() => setMode("player")}>View player site ↗</button></div></header>
        <div className="admin-content">
          <div className="admin-page-title"><div><span className="section-kicker">TRUEIGTECH BINGO OPERATIONS</span><h1>{currentLabel}</h1><p>{adminSubtitle(module)}</p></div><div className="admin-title-actions"><button className="outline-button" onClick={() => notify(`${currentLabel} data exported to CSV.`)}>↓ Export</button>{primaryActions[module] && <button className="admin-primary" onClick={() => setAction({kind:primaryActions[module][1]})}>{primaryActions[module][0]}</button>}</div></div>
          <AdminModule module={module} rooms={rooms} setRooms={setRooms} notify={notify} openAction={(next) => setAction(next)} />
        </div>
      </section>
      {action && <BackofficeDrawer action={action} close={() => setAction(null)} rooms={rooms} setRooms={setRooms} notify={notify} />}
    </div>
  );
}

function adminSubtitle(module: string) {
  const subtitles: Record<string, string> = {
    dashboard: "Live platform health, player activity and commercial performance.", rooms: "Create and configure every player-facing Bingo room.", gamebuilder: "Create, schedule and start games with multiple winning stages.", games: "Monitor active rounds and intervene in real time.", scheduler: "Plan one-off, recurring and tournament game sessions.", patterns: "Build and validate reusable winning patterns.", jackpots: "Control contributions, qualification rules and liability.", reports: "Explore validated performance across rooms and game types.", players: "Review player activity, value and account status.", transactions: "Trace every ticket, payout, refund and promotional credit.", variants: "Configure extensible Bingo engines and card layouts.",
  };
  return subtitles[module] ?? `Configure ${adminNav.find(([key]) => key === module)?.[1].toLowerCase()} across the platform.`;
}

function AdminModule({ module, rooms, setRooms, notify, openAction }: { module: string; rooms: BingoRoomData[]; setRooms: (rooms: BingoRoomData[]) => void; notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  if (module === "dashboard") return <AdminDashboard openAction={openAction} />;
  if (module === "rooms") return <RoomManagement rooms={rooms} setRooms={setRooms} openAction={openAction} notify={notify} />;
  if (module === "gamebuilder") return <GameManagement rooms={rooms} openAction={openAction} notify={notify} />;
  if (module === "games") return <LiveControl notify={notify} openAction={openAction} />;
  if (module === "scheduler") return <Scheduler notify={notify} openAction={openAction} />;
  if (module === "patterns") return <PatternBuilder notify={notify} />;
  if (module === "jackpots") return <JackpotManagement notify={notify} openAction={openAction} />;
  if (module === "variants") return <VariantManagement notify={notify} openAction={openAction} />;
  if (module === "players") return <PlayersTable notify={notify} openAction={openAction} />;
  if (module === "transactions") return <TransactionsTable />;
  if (module === "reports") return <ReportsPanel openAction={openAction} />;
  if (module === "tournaments") return <TournamentAdmin notify={notify} openAction={openAction} />;
  if (module === "promotions") return <PromotionManagement notify={notify} openAction={openAction} />;
  if (module === "chat") return <ChatModeration notify={notify} openAction={openAction} />;
  return <GenericAdminPanel module={module} notify={notify} openAction={openAction} />;
}

function AdminDashboard({ openAction }: { openAction: (action: AdminAction) => void }) {
  const metrics = [["ACTIVE ROOMS", "18", "+2", "▦"], ["ONLINE PLAYERS", "2,847", "+12.4%", "♙"], ["TICKET REVENUE", "$48,620", "+8.2%", "$"], ["PRIZE PAYOUT", "$31,840", "65.5%", "◇"], ["JACKPOT LIABILITY", "$142,280", "+$842", "✦"], ["GGR TODAY", "$16,780", "+11.6%", "↗"]];
  return <>
    <div className="metric-grid">{metrics.map((metric, index) => <button className="metric-card" onClick={() => openAction({kind:"report-drilldown",label:metric[0]})} key={metric[0]}><span className={`metric-icon metric-${index}`}><Icon>{metric[3]}</Icon></span><div><small>{metric[0]}</small><strong>{metric[1]}</strong><span className={index === 3 ? "neutral-change" : ""}>{metric[2]} <i>{index === 3 ? "payout ratio" : "view breakdown →"}</i></span></div></button>)}</div>
    <div className="dashboard-grid">
      <section className="admin-card revenue-chart"><div className="card-title"><div><h2>Revenue & payouts</h2><p>Last 7 days · USD</p></div><select><option>7 days</option><option>30 days</option></select></div><div className="chart-legend"><span><i className="legend-violet" />Revenue <b>$286.4k</b></span><span><i className="legend-mint" />Payouts <b>$184.2k</b></span></div><div className="line-chart"><div className="chart-y"><span>$60k</span><span>$45k</span><span>$30k</span><span>$15k</span><span>$0</span></div><div className="chart-canvas"><div className="grid-lines"><i /><i /><i /><i /><i /></div><div className="dual-bars" aria-label="Revenue and payout trend">{[[44,30],[58,38],[52,35],[76,48],[66,43],[88,58],[96,61]].map((pair,index)=><div key={index}><i className="revenue-bar" style={{height:`${pair[0]}%`}} /><i className="payout-bar" style={{height:`${pair[1]}%`}} /></div>)}</div><div className="chart-x"><span>Fri 15</span><span>Sat 16</span><span>Sun 17</span><span>Mon 18</span><span>Tue 19</span><span>Wed 20</span><span>Today</span></div></div></div></section>
      <section className="admin-card live-ops"><div className="card-title"><div><h2>Live operations</h2><p>3 games currently calling</p></div><button onClick={() => openAction({kind:"live-control"})}>Open control center →</button></div>{[["Diamond 75", "B-12", "286", "28/75", "$2,000"], ["Turbo 30", "24", "84", "11/30", "$300"], ["Quick 80", "52", "136", "42/80", "$750"]].map((game, index) => <div className="live-game-row" key={game[0]}><span className={`live-game-orb orb-${index}`}>{game[1]}</span><div><b>{game[0]}</b><small><i /> LIVE · {game[3]} called</small></div><span><small>PLAYERS</small><b>{game[2]}</b></span><span><small>PRIZE</small><b>{game[4]}</b></span><button onClick={() => openAction({kind:"live-control",label:game[0]})}>Manage</button></div>)}</section>
      <section className="admin-card room-performance"><div className="card-title"><div><h2>Top rooms</h2><p>By ticket revenue today</p></div><button onClick={() => openAction({kind:"report-drilldown",label:"Room performance"})}>View report →</button></div><table><thead><tr><th>Room</th><th>Games</th><th>Tickets</th><th>Revenue</th><th>GGR</th><th>Trend</th></tr></thead><tbody>{[["Mega Trueig Jackpot", "22", "8,420", "$42,100", "$12,840", "+18%"], ["Diamond 75", "34", "6,812", "$13,624", "$4,218", "+9%"], ["Trueig 90 Classic", "48", "18,240", "$9,120", "$2,680", "+12%"], ["Turbo 30", "96", "8,450", "$8,450", "$2,210", "−3%"]].map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{index === 0 ? <b>{cell}</b> : index === 5 ? <span className={cell.startsWith("−") ? "negative" : "positive"}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></section>
      <section className="admin-card activity-feed"><div className="card-title"><div><h2>Operational feed</h2><p>Live system events</p></div><button>•••</button></div>{[["claim", "Bingo claim validated", "Diamond 75 · Card #284201", "14:32"], ["jackpot", "Jackpot contribution", "+$42.10 · Mega Trueig Jackpot", "14:31"], ["player", "High-value player joined", "TrueigQueen · VIP Gold Room", "14:29"], ["alert", "Claim rejected", "Turbo 30 · Invalid pattern", "14:26"]].map((event) => <div className="feed-row" key={event[2]}><span className={`feed-icon ${event[0]}`}>{event[0] === "claim" ? "✓" : event[0] === "jackpot" ? "✦" : event[0] === "player" ? "+" : "!"}</span><div><b>{event[1]}</b><small>{event[2]}</small></div><time>{event[3]}</time></div>)}</section>
    </div>
  </>;
}

function RoomManagement({ rooms, setRooms, openAction, notify }: { rooms: BingoRoomData[]; setRooms: (rooms: BingoRoomData[]) => void; openAction: (action: AdminAction) => void; notify: (message: string) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [price, setPrice] = useState(0);
  const savePrice = (id: string) => { setRooms(rooms.map((room) => room.id === id ? { ...room, ticketPrice: price } : room)); setEditing(null); notify("Ticket pricing updated and audit log created."); };
  return <div className="admin-card data-card"><div className="data-toolbar"><div className="search-box compact"><Icon>⌕</Icon><input placeholder="Search rooms" aria-label="Search rooms" /></div><div><select><option>All variants</option><option>75-Ball</option><option>90-Ball</option><option>80-Ball</option><option>30-Ball</option></select><select><option>All statuses</option><option>Live</option><option>Open</option></select><button>☷ Columns</button></div></div><div className="responsive-table"><table><thead><tr><th>Room</th><th>Status</th><th>Variant</th><th>Ticket</th><th>Players</th><th>Prize / Jackpot</th><th>Winning stages</th><th>Actions</th></tr></thead><tbody>{rooms.map((room) => <tr key={room.id}><td><div className="table-room"><span className={`mini-orb accent-${room.accent}`}>{room.variant.match(/\d+/)?.[0] ?? "T"}</span><div><b>{room.name}</b><small>{room.id.toUpperCase()}</small></div></div></td><td><StatusPill status={room.status} /></td><td>{room.variant}</td><td>{editing === room.id ? <span className="inline-edit"><input type="number" value={price} min="0" step="0.5" onChange={(event) => setPrice(Number(event.target.value))} /><button onClick={() => savePrice(room.id)}>✓</button></span> : <button className="table-link" onClick={() => { setEditing(room.id); setPrice(room.ticketPrice); }}>{room.ticketPrice ? money(room.ticketPrice) : "Free"} ✎</button>}</td><td>{room.players} / {room.maxPlayers}</td><td><b>{money(room.jackpot ?? room.prize)}</b></td><td><span className="speed-label">{room.winningStages?.length ?? 1} · {room.winningStages?.map(stage=>stage.name).join(" → ") ?? room.pattern}</span></td><td><div className="table-actions"><button onClick={() => { setRooms([...rooms, { ...room, id: `${room.id}-copy`, name: `${room.name} Copy`, status: "Open" }]); notify(`${room.name} duplicated.`); }}>Duplicate</button><button onClick={() => openAction({kind:"edit-room",room})}>Edit</button><button onClick={() => openAction({kind:"edit-room",room})}>Configure</button></div></td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing {rooms.length} playable rooms</span><button className="admin-primary" onClick={() => openAction({kind:"create-room"})}>+ Create another room</button></div></div>;
}

function LiveControl({ notify, openAction }: { notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  const [state,setState]=useState<"live"|"paused"|"stopped"|"cancelled">("live");
  const [ball,setBall]=useState(28);
  const [speed,setSpeed]=useState("Fast · 1.2 sec");
  const [claim,setClaim]=useState<"pending"|"approved"|"rejected">("pending");
  const [refunded,setRefunded]=useState(false);
  const nextBall=()=>{const next=BingoEngine.nextNumber(Array.from({length:ball},(_,i)=>i+1))??ball;setBall(next);notify(`${BingoEngine.label(next)} called manually.`)};
  const changeState=(next:typeof state,message:string)=>{setState(next);notify(message)};
  return <div className="control-grid"><section className="admin-card control-stage"><div className="control-stage-head"><div><span className={`status ${state==="live"?"status-live":"status-starting-soon"}`}><i/>{state}</span><h2>Diamond 75 · TRUEIG-2842</h2><p>Stage 2 of 3 · One Line · Game continues after win</p></div><div><select value={speed} onChange={event=>{setSpeed(event.target.value);notify(`Calling speed changed to ${event.target.value}.`)}}><option>Slow · 3.2 sec</option><option>Normal · 2.1 sec</option><option>Fast · 1.2 sec</option><option>Turbo · 0.6 sec</option></select><button className="danger-button" onClick={()=>changeState("stopped","Game stopped. State preserved for operator review.")}>Stop game</button></div></div><div className="operator-caller"><div className={state!=="live"?"paused":""}><small>CURRENT BALL</small><strong>{BingoEngine.label(ball)}</strong><span>{state==="live"?`Next call in ${speed.split(" · ")[1]}`:state.toUpperCase()}</span></div><div className="operator-stats"><span><small>BALLS CALLED</small><b>{ball} / 75</b></span><span><small>PLAYERS</small><b>300</b></span><span><small>CARDS SOLD</small><b>934</b></span><span><small>REVENUE</small><b>$1,868</b></span><span><small>PRIZE POOL</small><b>$2,000</b></span><span><small>ACTIVE STAGE</small><b>One Line</b></span></div></div><div className="operator-controls"><button className={state==="paused"?"resume":""} onClick={()=>state==="paused"?changeState("live","Automatic calling resumed."):changeState("paused","Number caller paused.")}>{state==="paused"?"▶ Resume":"Ⅱ Pause game"}</button><button onClick={nextBall}>Call next ball →</button><button onClick={()=>openAction({kind:"manual-call"})}>Manual call</button><button onClick={()=>{setBall(1);setState("live");setClaim("pending");notify("Round restarted from Ball 1.")}}>Restart game</button><button onClick={()=>changeState("cancelled","Round cancelled. Refund review opened.")}>Cancel round</button><button onClick={()=>openAction({kind:"declare-winner"})}>Declare winner</button><button onClick={()=>{setRefunded(true);notify("934 card purchases queued for refund.")}}>{refunded?"✓ Refund queued":"Refund players"}</button></div><div className="operator-board">{Array.from({length:75},(_,index)=>index+1).map(number=><span className={number<=ball?"called":""} key={number}>{number}</span>)}</div></section><aside className="admin-card claim-review"><div className="card-title"><div><h2>Bingo claims</h2><p>1 requires review · Stage 2</p></div><span className="nav-badge">1</span></div><div className={`claim-card claim-${claim}`}><div><span className="claim-player">LS</span><div><b>LuckyStar</b><small>Card #284237 · just now</small></div><span className={`table-status ${claim==="approved"?"success":claim==="rejected"?"danger":"warning"}`}>{claim}</span></div><div className="claim-pattern"><div className="mini-pattern">{Array.from({length:25},(_,index)=><i className={index<5?"marked":""} key={index}/>)}</div><span><small>PATTERN</small><b>One Line</b><small>5 of 5 cells called</small></span></div>{claim==="pending"?<div className="claim-actions"><button onClick={()=>{setClaim("rejected");notify("Bingo rejected and player notified.")}}>Reject Bingo</button><button onClick={()=>{setClaim("approved");notify("Winner validated. $400 payout queued; game continues.")}}>✓ Validate winner</button></div>:<button className="full-outline" onClick={()=>setClaim("pending")}>Reopen claim</button>}</div><div className="live-audit"><h3>Live audit trail</h3>{[["14:32:10","Ball B-12 called"],["14:32:08","LuckyStar claim received"],["14:31:54",`Speed set to ${speed}`],["14:31:40","MikaK bought 2 cards"]].map(row=><p key={row[0]}><time>{row[0]}</time><span>{row[1]}</span></p>)}</div></aside></div>;
}

function LegacyLiveControl({ notify, openAction }: { notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  const [paused, setPaused] = useState(false);
  const [ball, setBall] = useState(12);
  const [claim, setClaim] = useState<"pending" | "approved" | "rejected">("pending");
  const [gameState, setGameState] = useState<"live" | "stopped" | "cancelled">("live");
  return <div className="control-grid"><section className="admin-card control-stage"><div className="control-stage-head"><div><span className="status status-live"><i /> LIVE</span><h2>Diamond 75 · Round #2842</h2><p>75-Ball Pattern · Four Corners</p></div><div><select><option>Fast · 1.6 sec</option><option>Normal · 2.8 sec</option><option>Turbo · 0.8 sec</option></select><button className="danger-button" onClick={() => notify("Stop request requires secondary approval.")}>Stop game</button></div></div><div className="operator-caller"><div className={paused ? "paused" : ""}><small>CURRENT BALL</small><strong>{BingoEngine.label(ball)}</strong><span>{paused ? "CALLING PAUSED" : "Next call in 01.2s"}</span></div><div className="operator-stats"><span><small>BALLS CALLED</small><b>28 / 75</b></span><span><small>PLAYERS</small><b>300</b></span><span><small>CARDS IN PLAY</small><b>934</b></span><span><small>PRIZE POOL</small><b>$5,000</b></span></div></div><div className="operator-controls"><button className={paused ? "resume" : ""} onClick={() => { setPaused(!paused); notify(paused ? "Automatic calling resumed." : "Number caller paused."); }}>{paused ? "▶ Resume calling" : "Ⅱ Pause calling"}</button><button onClick={() => { const next = BingoEngine.nextNumber([ball]) ?? ball; setBall(next); notify(`${BingoEngine.label(next)} called manually.`); }}>Call next ball →</button><button>Manual call</button><button>Restart round</button></div><div className="operator-board">{Array.from({ length: 75 }, (_, index) => index + 1).map((number) => <span className={number <= 28 || number === ball ? "called" : ""} key={number}>{number}</span>)}</div></section><aside className="admin-card claim-review"><div className="card-title"><div><h2>Bingo claims</h2><p>1 requires review</p></div><span className="nav-badge">1</span></div><div className={`claim-card claim-${claim}`}><div><span className="claim-player">AR</span><div><b>Ari.R</b><small>Card #284201 · just now</small></div><span className={`table-status ${claim === "approved" ? "success" : claim === "rejected" ? "danger" : "warning"}`}>{claim}</span></div><div className="claim-pattern"><div className="mini-pattern">{Array.from({ length: 25 }, (_, index) => <i className={[0, 4, 20, 24].includes(index) ? "marked" : ""} key={index} />)}</div><span><small>PATTERN</small><b>Four Corners</b><small>All 4 cells called</small></span></div>{claim === "pending" ? <div className="claim-actions"><button onClick={() => { setClaim("rejected"); notify("Claim rejected and player notified."); }}>Reject</button><button onClick={() => { setClaim("approved"); notify("Winner validated and $1,250 payout queued."); }}>✓ Validate winner</button></div> : <button className="full-outline" onClick={() => setClaim("pending")}>Reopen claim</button>}</div><div className="player-list"><div className="card-title"><div><h2>Players in room</h2><p>300 active · 934 cards</p></div><button>View all</button></div>{[["NQ", "TrueigQueen", "8 cards", "$12,480"], ["MK", "MikaK", "6 cards", "$4,820"], ["AR", "Ari.R", "3 cards", "$2,840"]].map((player) => <div key={player[1]}><span>{player[0]}</span><b>{player[1]}<small>{player[2]}</small></b><strong>{player[3]}<small>LTV</small></strong></div>)}</div></aside></div>;
}

function Scheduler({ notify, openAction }: { notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  const [view, setView] = useState("Week");
  const events = [["08:00", "Trueig 90 Classic", "90-Ball", "teal", "Recurring"], ["09:00", "Turbo 30", "Speed", "coral", "Hourly"], ["10:00", "Diamond 75", "Pattern", "violet", "Daily"], ["12:00", "Free Bingo Party", "Community", "blue", "Daily"], ["18:00", "Mega Trueig Jackpot", "Progressive", "gold", "Daily"], ["20:00", "Trueigtech Weekend Cup", "Tournament", "pink", "Weekly"]];
  return <div className="scheduler-layout"><section className="admin-card calendar-card"><div className="calendar-toolbar"><div><button>‹</button><h2>August 18–24, 2026</h2><button>›</button><button className="today">Today</button></div><div>{["Day", "Week", "Month"].map((item) => <button onClick={() => setView(item)} className={view === item ? "active" : ""} key={item}>{item}</button>)}</div></div><div className="calendar-grid"><div className="time-column"><span /><span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span><span>20:00</span></div>{["MON 18", "TUE 19", "WED 20", "THU 21", "FRI 22", "SAT 23", "SUN 24"].map((day, dayIndex) => <div className={`calendar-day ${dayIndex === 3 ? "today-col" : ""}`} key={day}><b>{day}</b>{events.filter((_, index) => (index + dayIndex) % 3 !== 1).map((event, index) => <button onClick={() => notify(`${event[1]} schedule opened.`)} className={`calendar-event accent-${event[3]}`} style={{ top: `${58 + ((Number(event[0].split(":")[0]) - 8) * 39)}px`, height: event[4] === "Hourly" ? "68px" : "36px" }} key={`${day}-${event[0]}-${event[1]}`}><strong>{event[0]} · {event[1]}</strong><small>{event[2]} · {event[4]}</small></button>)}</div>)}</div></section><aside className="admin-card schedule-list"><div className="card-title"><div><h2>Thursday, Aug 21</h2><p>24 scheduled games</p></div><button>•••</button></div>{events.map((event) => <div className="schedule-row" key={event[1]}><time>{event[0]}</time><i className={`accent-bg-${event[3]}`} /><div><b>{event[1]}</b><small>{event[2]} · {event[4]}</small></div><button>•••</button></div>)}<button className="full-outline" onClick={() => notify("18:00 Mega Trueig Jackpot schedule added.")}>+ Add game</button></aside></div>;
}

function PatternBuilder({ notify }: { notify: (message: string) => void }) {
  const [selected, setSelected] = useState([2, 6, 8, 10, 12, 14, 16, 18, 22]);
  const [patternName, setPatternName] = useState("Diamond");
  const toggle = (index: number) => setSelected((cells) => cells.includes(index) ? cells.filter((cell) => cell !== index) : [...cells, index]);
  const savedPatterns: Array<[string, number[]]> = [
    ["Four Corners", [0, 4, 20, 24]],
    ["Diamond", [2, 6, 8, 10, 12, 14, 16, 18, 22]],
    ["X Shape", [0, 4, 6, 8, 12, 16, 18, 20, 24]],
    ["Full House", Array.from({ length: 25 }, (_, index) => index)],
  ];
  return <div className="pattern-layout"><section className="admin-card pattern-builder"><div className="pattern-config"><label>Pattern name<input value={patternName} onChange={(event) => setPatternName(event.target.value)} /></label><div className="form-row"><label>Card layout<select><option>5 × 5 · 75-Ball</option><option>3 × 9 · 90-Ball</option><option>3 × 3 · 30-Ball</option></select></label><label>Minimum cells<input type="number" value={selected.length} readOnly /></label></div><div className="toggle-row"><span><b>Allow rotations</b><small>Match at 90°, 180° and 270°</small></span><button className="toggle on"><i /></button></div><div className="toggle-row"><span><b>Allow mirroring</b><small>Match horizontal reflections</small></span><button className="toggle"><i /></button></div><div className="pattern-actions"><button className="outline-button" onClick={() => setSelected([])}>Reset</button><button className="outline-button" onClick={() => notify(`${patternName} preview: ${selected.length} required cells.`)}>Preview</button><button className="admin-primary" onClick={() => notify(`${patternName} pattern saved with ${selected.length} marked cells.`)}>Save pattern</button></div></div><div className="pattern-canvas-wrap"><div className="pattern-canvas-head"><span><b>Pattern canvas</b><small>Click cells to mark or unmark</small></span><button onClick={() => setSelected([0, 4, 20, 24])}>Load Four Corners</button></div><div className="large-pattern-grid">{Array.from({ length: 25 }, (_, index) => <button className={selected.includes(index) ? "selected" : ""} onClick={() => toggle(index)} key={index}>{selected.includes(index) ? "✓" : index === 12 ? "FREE" : ""}</button>)}</div><div className="pattern-summary"><span><b>{selected.length}</b> marked cells</span><span><b>4</b> supported rotations</span><span><b>75-Ball</b> compatible</span></div></div></section><aside className="admin-card saved-patterns"><div className="card-title"><div><h2>Pattern library</h2><p>18 active patterns</p></div><button>Filter</button></div>{savedPatterns.map(([name, cells]) => <button key={name} onClick={() => { setPatternName(name); setSelected(cells); }}><div className="mini-pattern">{Array.from({ length: 25 }, (_, index) => <i className={cells.includes(index) ? "marked" : ""} key={index} />)}</div><span><b>{name}</b><small>{cells.length} cells · Active</small></span><i>→</i></button>)}</aside></div>;
}

function JackpotManagement({ notify, openAction }: { notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  const [jackpot, setJackpot] = useState(125480.6);
  const [enabled, setEnabled] = useState(true);
  return <><div className="jackpot-admin-hero"><div><span className="section-kicker">PRIMARY PROGRESSIVE</span><h2>Mega Trueig Jackpot</h2><p>JP-MEGA-001 · 75-Ball Progressive</p></div><div><small>CURRENT JACKPOT</small><strong>{money(jackpot)}</strong><span>+$842.30 today</span></div><div className="jackpot-hero-actions"><button className={`toggle ${enabled ? "on" : ""}`} onClick={() => setEnabled(!enabled)}><i /></button><span>{enabled ? "Enabled" : "Disabled"}</span><button onClick={() => { setJackpot(jackpot + 1000); notify("Manual $1,000 contribution recorded."); }}>+ Add contribution</button></div></div><div className="jackpot-admin-grid"><section className="admin-card jackpot-config"><div className="card-title"><div><h2>Configuration</h2><p>Contribution and qualification rules</p></div><button onClick={() => openAction({kind:"edit-jackpot"})}>✎ Edit</button></div><div className="config-grid"><span><small>STARTING VALUE</small><b>$50,000</b></span><span><small>CONTRIBUTION</small><b>2.5% of ticket sales</b></span><span><small>MAXIMUM</small><b>$250,000</b></span><span><small>RESET VALUE</small><b>$50,000</b></span><span><small>QUALIFYING PATTERN</small><b>Full House</b></span><span><small>BALL REQUIREMENT</small><b>Within 42 calls</b></span><span><small>FALLBACK PRIZE</small><b>$10,000</b></span><span><small>LINKED ROOMS</small><b>4 rooms</b></span></div><div className="liability-meter"><div><span>Liability vs maximum</span><b>50.2%</b></div><i><span style={{width:"50.2%"}} /></i></div></section><section className="admin-card jackpot-history"><div className="card-title"><div><h2>Contribution history</h2><p>Recent jackpot movement</p></div><button>View all</button></div>{[["Ticket contribution", "+$42.10", "14:31"], ["Ticket contribution", "+$38.65", "14:26"], ["Game contribution", "+$100.00", "14:15"], ["Manual adjustment", "+$500.00", "12:00"]].map((row) => <div key={row[2]}><span>↗</span><b>{row[0]}<small>{row[2]} · John Dawson</small></b><strong>{row[1]}</strong></div>)}</section></div></>;
}

function VariantManagement({ notify, openAction }: { notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  const variants = [["75", "75-Ball Classic", "5 × 5", "Free center", "14 patterns", "violet"], ["90", "90-Ball", "3 × 9", "15 numbers", "3 stages", "teal"], ["80", "80-Ball Grid", "4 × 4", "No free cell", "8 patterns", "pink"], ["30", "Speed Bingo", "3 × 3", "Coverall", "Turbo caller", "coral"], ["50", "50-Ball", "5 × 3", "Configurable", "6 patterns", "blue"]];
  return <><div className="variant-grid">{variants.map((variant) => <article className="admin-card variant-card" key={variant[0]}><div className={`variant-ball accent-${variant[5]}`}>{variant[0]}</div><span className="table-status success">Active</span><h2>{variant[1]}</h2><p>{variant[2]} card layout</p><div><span><small>FREE SQUARES</small><b>{variant[3]}</b></span><span><small>WIN RULES</small><b>{variant[4]}</b></span></div><button onClick={() => openAction({kind:"variants",label:variant[1]})}>Configure variant →</button></article>)}</div><button className="new-variant-card" onClick={() => openAction({kind:"variants",label:"Create custom variant"})}><span>+</span><b>Create custom variant</b><small>Define any ball count, card layout and calling rule</small></button></>;
}

function PlayersTable({ notify, openAction }: { notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  const players = [["USR-10482", "TrueigQueen", "VIP", "Today · 14:29", "842", "$18,420", "$24,860", "$12,480", "Active"], ["USR-09814", "MikaK", "Standard", "Today · 14:18", "420", "$8,260", "$7,980", "$4,820", "Active"], ["USR-11804", "Ari.R", "Standard", "Today · 14:21", "128", "$2,180", "$2,840", "$248", "Active"], ["USR-07226", "RiskyB", "Restricted", "Yesterday", "294", "$12,840", "$8,250", "$0", "Restricted"]];
  return <div className="admin-card data-card"><div className="data-toolbar"><div className="search-box compact"><Icon>⌕</Icon><input placeholder="Search by username or ID" /></div><div><select><option>All account statuses</option></select><button>Advanced filters</button></div></div><div className="responsive-table"><table><thead><tr><th>Player</th><th>Tier</th><th>Last login</th><th>Games</th><th>Total entry</th><th>Winnings</th><th>Balance</th><th>Status</th><th /></tr></thead><tbody>{players.map((player) => <tr key={player[0]}><td><div className="table-player"><span>{player[1].slice(0,2).toUpperCase()}</span><b>{player[1]}<small>{player[0]}</small></b></div></td>{player.slice(2).map((cell, index) => <td key={index}>{index === 5 ? <span className={`table-status ${cell === "Active" ? "success" : "warning"}`}>{cell}</span> : index === 6 ? <button onClick={() => openAction({kind:"player",label:player[1]})}>View →</button> : cell}</td>)}</tr>)}</tbody></table></div></div>;
}

function TransactionsTable() {
  const transactions = [["TXN-854201", "TrueigQueen", "Mega Trueig Jackpot", "Ticket purchase", "−$40.00", "Completed", "14:32:08"], ["PAY-284201", "Ari.R", "Diamond 75", "Prize payout", "+$1,250.00", "Processing", "14:31:44"], ["JP-684212", "System", "Mega Trueig Jackpot", "Jackpot contribution", "+$42.10", "Completed", "14:31:02"], ["REF-128492", "MikaK", "Trueig 90 Classic", "Refund", "+$3.00", "Completed", "14:28:16"], ["PROMO-48311", "SkyJump", "Free Bingo Party", "Promotional credit", "+$5.00", "Completed", "14:24:54"]];
  return <div className="admin-card data-card"><div className="data-toolbar"><div className="search-box compact"><Icon>⌕</Icon><input placeholder="Transaction ID, player or room" /></div><div><select><option>All types</option><option>Ticket purchase</option><option>Prize payout</option></select><select><option>Today</option><option>Last 7 days</option></select></div></div><div className="transaction-summary"><span><small>TICKET PURCHASES</small><b>$48,620</b></span><span><small>PRIZE PAYOUTS</small><b>$31,840</b></span><span><small>REFUNDS</small><b>$1,242</b></span><span><small>NET FLOW</small><b className="positive">+$15,538</b></span></div><div className="responsive-table"><table><thead><tr><th>Reference</th><th>Player</th><th>Room</th><th>Type</th><th>Amount</th><th>Status</th><th>Time</th></tr></thead><tbody>{transactions.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{index === 0 ? <button className="table-link">{cell}</button> : index === 4 ? <b className={cell.startsWith("+") ? "positive" : ""}>{cell}</b> : index === 5 ? <span className={`table-status ${cell === "Completed" ? "success" : "warning"}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div></div>;
}

function ReportsPanel({ openAction }: { openAction: (action: AdminAction) => void }) {
  const bars = [68, 82, 58, 92, 74, 88, 96, 79, 90, 84, 100, 86];
  return <><div className="report-filters"><label>Date range<select><option>Aug 1–21, 2026</option></select></label><label>Room<select><option>All rooms</option></select></label><label>Bingo type<select><option>All variants</option></select></label><label>Currency<select><option>USD</option></select></label><button className="admin-primary">Apply filters</button></div><div className="report-grid"><section className="admin-card report-main"><div className="card-title"><div><h2>Ticket sales performance</h2><p>Daily ticket revenue · August 2026</p></div><button>Download CSV</button></div><div className="report-total"><strong>$842,620</strong><span>+12.8% vs prior period</span></div><div className="bar-chart">{bars.map((height, index) => <div key={index}><i style={{height:`${height}%`}}><span>${Math.round(height * 0.62)}k</span></i><small>{index + 10}</small></div>)}</div></section><aside className="admin-card report-breakdown"><div className="card-title"><div><h2>Revenue by variant</h2><p>Share of total</p></div></div><div className="donut"><div><strong>$842k</strong><small>TOTAL</small></div></div>{[["75-Ball", "42%", "#7768ff"], ["90-Ball", "28%", "#19bd9b"], ["Speed", "18%", "#fb745e"], ["Other", "12%", "#8fa0b8"]].map((item) => <p className="breakdown-row" key={item[0]}><i style={{background:item[2]}} /><span>{item[0]}</span><b>{item[1]}</b></p>)}</aside></div><div className="report-cards">{[["Prize payout", "$548,280", "65.1% payout ratio"], ["Average entry", "$4.82", "+$0.42 vs prior"], ["Claims validated", "4,284", "98.6% valid"], ["Games completed", "1,842", "99.8% completion"]].map((item) => <div className="admin-card" key={item[0]}><small>{item[0]}</small><strong>{item[1]}</strong><span>{item[2]}</span></div>)}</div></>;
}

function TournamentAdmin({ notify, openAction }: { notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  return <div className="tournament-admin-grid"><section className="admin-card tournament-admin-feature"><div><span className="status status-selling-tickets"><i /> Registration open</span><h2>Trueigtech Weekend Cup</h2><p>TRN-2026-0822 · 5-round progressive elimination</p></div><div className="tournament-admin-stats"><span><small>ENTRY FEE</small><b>$8.00</b></span><span><small>PRIZE POOL</small><b>$25,000</b></span><span><small>PLAYERS</small><b>384 / 512</b></span><span><small>STARTS</small><b>22 Aug · 20:00</b></span></div><div className="tournament-rounds">{["Qualifiers", "Round of 256", "Round of 128", "Semi Final", "Grand Final"].map((item,index)=><div className={index === 0 ? "active" : ""} key={item}><i>{index+1}</i><span><b>{item}</b><small>{index===0?"512 players":"Top half advance"}</small></span></div>)}</div><div className="pattern-actions"><button className="outline-button" onClick={() => openAction({kind:"edit-tournament"})}>Edit tournament</button><button className="admin-primary" onClick={()=>notify("Tournament registration promoted to all eligible players.")}>Promote tournament</button></div></section><aside className="admin-card"><div className="card-title"><div><h2>Points rules</h2><p>Current scoring model</p></div><button onClick={() => openAction({kind:"edit-tournament"})}>Edit</button></div><div className="points-list">{[["Line win","10 pts"],["Pattern win","25 pts"],["Full house","50 pts"],["Fast Bingo bonus","+15 pts"],["Round winner","+40 pts"]].map(row=><div key={row[0]}><span>{row[0]}</span><b>{row[1]}</b></div>)}</div><button className="full-outline" onClick={()=>openAction({kind:"create-tournament"})}>+ Create tournament</button></aside></div>;
}

function GenericAdminPanel({ module, notify, openAction }: { module: string; notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  const title = adminNav.find(([key]) => key === module)?.[1] ?? "Module";
  const itemsByModule: Record<string, string[]> = {
    cards: ["Card generation rules", "Minimum and maximum cards", "Card purchase deadline", "Favorite card settings"], caller: ["Initial countdown · 10s", "Time between balls · 1.6s", "Voice caller · Trueigtech Nova", "Validation delay · 2s"], prizes: ["Fixed prizes", "Percentage prizes", "Shared winner rules", "Guaranteed pools"], promotions: ["First game free", "Happy Hour Bingo", "VIP access pass", "Tournament ticket reward"], chat: ["Message queue", "Muted players", "Slow mode", "Blocked phrases"], history: ["Completed rounds", "Cancelled games", "Refunded rounds", "Archived calls"], risk: ["Velocity alerts", "Collusion signals", "Suspicious claims", "Exposure thresholds"], responsible: ["Deposit limits", "Session reminders", "Self-exclusion", "Reality checks"], roles: ["Super Admin", "Bingo Manager", "Game Operator", "Read Only"], audit: ["Room configuration changes", "Game interventions", "Payout approvals", "Permission changes"], settings: ["Platform identity", "Currency & locale", "Integration endpoints", "Notification rules"],
  };
  const items = itemsByModule[module] ?? ["Configuration", "Automation rules", "Visibility", "Permissions"];
  return <div className="generic-grid"><section className="admin-card generic-list"><div className="card-title"><div><h2>{title} configuration</h2><p>Platform-wide settings and controls</p></div><button onClick={()=>openAction({kind:module,label:`New ${title} rule`})}>+ Add rule</button></div>{items.map((item,index)=><div className="setting-row" key={item}><span className={`setting-icon metric-${index}`}>{index+1}</span><div><b>{item}</b><small>Configured · Last updated by John Dawson</small></div><button className="toggle on" onClick={(event)=>{event.currentTarget.classList.toggle("on");notify(`${item} ${event.currentTarget.classList.contains("on")?"enabled":"disabled"}.`)}}><i /></button><button onClick={()=>openAction({kind:module,label:item})}>Configure →</button></div>)}</section><aside className="admin-card module-health"><span>✓</span><h2>All systems operational</h2><p>{title} policies are synced across 18 active rooms.</p><div><small>LAST CONFIGURATION SYNC</small><b>Today · 14:28:42</b></div><button className="full-outline" onClick={()=>notify("Configuration health check completed successfully.")}>Run health check</button></aside></div>;
}

function GameManagement({ rooms, openAction, notify }: { rooms: BingoRoomData[]; openAction: (action: AdminAction) => void; notify: (message: string) => void }) {
  const [states,setStates]=useState<Record<string,string>>({"trueig-90":"Scheduled","turbo-30":"Live","diamond-75":"Live","mega-jackpot":"Selling"});
  return <div className="admin-card data-card"><div className="game-builder-banner"><div><span className="section-kicker">MULTI-STAGE GAME ENGINE</span><h2>Build a complete Bingo game</h2><p>Choose a room, configure winning stages, then schedule or start immediately.</p></div><button className="admin-primary" onClick={()=>openAction({kind:"create-game"})}>+ Create Bingo game</button></div><div className="responsive-table"><table><thead><tr><th>Game</th><th>Room</th><th>Variant</th><th>Winning stages</th><th>Start</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rooms.slice(0,8).map((room,index)=><tr key={room.id}><td><button className="table-link" onClick={()=>openAction({kind:"create-game",room})}>TRUEIG-{3000+index}</button></td><td><b>{room.name}</b></td><td>{room.variant}</td><td><span className="speed-label">{room.winningStages?.map(stage=>stage.name).join(" → ")??room.pattern}</span></td><td>{index<2?"Today · 18:00":`Today · ${19+index}:00`}</td><td><span className={`table-status ${states[room.id]==="Live"?"success":"warning"}`}>{states[room.id]??"Scheduled"}</span></td><td><div className="table-actions"><button onClick={()=>openAction({kind:"create-game",room})}>Configure</button><button onClick={()=>{setStates(items=>({...items,[room.id]:"Scheduled"}));notify(`${room.name} scheduled.`)}}>Schedule</button><button onClick={()=>{setStates(items=>({...items,[room.id]:"Live"}));notify(`${room.name} started immediately.`)}}>Start now</button></div></td></tr>)}</tbody></table></div></div>;
}

function PromotionManagement({ notify, openAction }: { notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  const promotions=[["Free Bingo","Hourly free 75-ball card","Active"],["Buy 3 Get 1","Fourth eligible card free","Active"],["Happy Hour","50% ticket discount · 18:00–19:00","Scheduled"],["Cashback","10% Bingo cashback","Active"],["Tournament Entry","Weekend Cup ticket reward","Draft"],["VIP Access","Unlock VIP Gold Room","Active"],["Daily Reward","One card after first login","Paused"]];
  const [states,setStates]=useState<Record<string,string>>(Object.fromEntries(promotions.map(item=>[item[0],item[2]])));
  return <div className="promotion-admin-grid">{promotions.map((promo,index)=><article className="admin-card promotion-admin-card" key={promo[0]}><span className={`promotion-icon promo-${index}`}>{index%2?"%":"★"}</span><span className={`table-status ${states[promo[0]]==="Active"?"success":"warning"}`}>{states[promo[0]]}</span><h2>{promo[0]}</h2><p>{promo[1]}</p><div><button onClick={()=>openAction({kind:"promotion",label:promo[0]})}>Edit</button><button onClick={()=>{const next=states[promo[0]]==="Active"?"Paused":"Active";setStates(items=>({...items,[promo[0]]:next}));notify(`${promo[0]} ${next.toLowerCase()}.`)}}>{states[promo[0]]==="Active"?"Pause":"Activate"}</button></div></article>)}</div>;
}

function ChatModeration({ notify, openAction }: { notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  const initial=[["14:32","Diamond 75","LuckyStar","BINGO!! That was close 🎉"],["14:31","Turbo 30","SpeedySam","ready for another one"],["14:31","Trueig 90 Classic","RiskyB","check out my promo link"],["14:30","Mega Trueig Jackpot","MikaK","good luck all"],["14:29","Quick 80","TrueigQueen","one line away!"]];
  const [messages,setMessages]=useState(initial);const [muted,setMuted]=useState<string[]>(["RiskyB"]);const [chatEnabled,setChatEnabled]=useState(true);const [adminMessage,setAdminMessage]=useState("");
  return <div className="chat-admin-layout"><section className="admin-card chat-moderation-card"><div className="card-title"><div><h2>Live room chat</h2><p>{messages.length} messages visible · 12 flagged today</p></div><label className="inline-toggle">Room chat <button className={`toggle ${chatEnabled?"on":""}`} onClick={()=>{setChatEnabled(!chatEnabled);notify(`Room chat ${chatEnabled?"disabled":"enabled"}.`)}}><i/></button></label></div>{messages.map((message,index)=><div className="moderation-message" key={`${message[0]}-${index}`}><time>{message[0]}</time><span className="table-status neutral">{message[1]}</span><b>{message[2]}{muted.includes(message[2])&&<small>Muted</small>}</b><p>{message[3]}</p><div><button onClick={()=>{setMessages(items=>items.filter((_,itemIndex)=>itemIndex!==index));notify("Message deleted and audit log updated.")}}>Delete</button><button onClick={()=>{setMuted(items=>items.includes(message[2])?items.filter(item=>item!==message[2]):[...items,message[2]]);notify(`${message[2]} ${muted.includes(message[2])?"unmuted":"muted for 30 minutes"}.`)}}>{muted.includes(message[2])?"Unmute":"Mute 30m"}</button><button onClick={()=>openAction({kind:"player",label:message[2]})}>View player</button></div></div>)}</section><aside className="admin-card admin-broadcast"><h2>Operator broadcast</h2><p>Send a message to the active room or every player.</p><textarea value={adminMessage} onChange={event=>setAdminMessage(event.target.value)} placeholder="Type an admin message…"/><select><option>Diamond 75</option><option>All active rooms</option></select><button className="admin-primary" onClick={()=>{if(!adminMessage.trim())return;setMessages(items=>[["now","Diamond 75","Trueigtech Admin",adminMessage],...items]);setAdminMessage("");notify("Admin message sent.")}}>Send admin message</button><button className="outline-button" onClick={()=>openAction({kind:"announcement"})}>Create system announcement</button><div className="moderation-summary"><span><small>MUTED USERS</small><b>{muted.length}</b></span><span><small>BLOCKED TODAY</small><b>3</b></span><span><small>DELETED</small><b>{initial.length-messages.length}</b></span></div></aside></div>;
}

function BackofficeDrawer({ action, close, rooms, setRooms, notify }: { action: AdminAction; close: () => void; rooms: BingoRoomData[]; setRooms: (rooms: BingoRoomData[]) => void; notify: (message: string) => void }) {
  const editingRoom=action.room; const [name,setName]=useState(editingRoom?.name??"Trueigtech Sunrise 75");const [variant,setVariant]=useState(editingRoom?.variant??"75-Ball Pattern");const [price,setPrice]=useState(editingRoom?.ticketPrice??2);const [prize,setPrize]=useState(editingRoom?.prize??2000);const [confirm,setConfirm]=useState<"delete"|"disable"|null>(null);const [stages,setStages]=useState(editingRoom?.winningStages??[{name:"One Line",prize:100,continueAfterWin:true},{name:"Full House",prize:1000,continueAfterWin:false}]);
  const titleMap:Record<string,string>={"create-room":"Create Bingo Room","edit-room":`Edit ${editingRoom?.name??"Room"}`,"create-game":"Create Bingo Game","caller-config":"Number Caller Configuration","create-jackpot":"Create Jackpot","edit-jackpot":"Edit Mega Trueig Jackpot","create-tournament":"Create Tournament","edit-tournament":"Edit Tournament",player:`Player Profile · ${action.label??"Ari.R"}`,promotion:`${action.label?"Edit":"Create"} Promotion`,announcement:"Create System Announcement",notifications:"Notification Center","manual-call":"Manual Ball Call","declare-winner":"Declare Winner","report-drilldown":`${action.label??"Performance"} Breakdown`,report:"Report Builder",settings:"Trueigtech Platform Settings","live-control":`Live Control · ${action.label??"Diamond 75"}`};
  const title=titleMap[action.kind]??action.label??"Configure Module";
  const submit=(event:FormEvent)=>{event.preventDefault();if(action.kind==="create-room"){const id=name.toLowerCase().replace(/[^a-z0-9]+/g,"-");setRooms([...rooms,{id,name,variant,status:"Open",ticketPrice:price,prize,players:0,maxPlayers:300,cardsSold:0,startsIn:"15:00",pattern:stages.map(stage=>stage.name).join(" → "),accent:"violet",tag:"NEW",frequency:"Every 10 min",cardRows:variant.includes("90")?3:variant.includes("30")?3:variant.includes("80")?4:5,cardColumns:variant.includes("90")?9:variant.includes("30")?3:variant.includes("80")?4:5,winningStages:stages}])}else if(action.kind==="edit-room"&&editingRoom){setRooms(rooms.map(room=>room.id===editingRoom.id?{...room,name,variant,ticketPrice:price,prize,winningStages:stages,pattern:stages.map(stage=>stage.name).join(" → ")}:room))}notify(`${title} saved successfully.`);close()};
  const moveStage=(index:number,direction:number)=>{const target=index+direction;if(target<0||target>=stages.length)return;setStages(items=>{const next=[...items];[next[index],next[target]]=[next[target],next[index]];return next})};
  const stagesEditor=<div className="stage-editor"><div className="drawer-section-title"><div><h3>Winning stage configuration</h3><p>Winners can be paid without ending the round.</p></div><button type="button" onClick={()=>setStages(items=>[...items,{name:"New Stage",prize:100,continueAfterWin:true}])}>+ Add winning stage</button></div>{stages.map((stage,index)=><div className="stage-editor-row" key={`${stage.name}-${index}`}><i>{index+1}</i><label>Pattern<select value={stage.name} onChange={event=>setStages(items=>items.map((item,itemIndex)=>itemIndex===index?{...item,name:event.target.value}:item))}><option>One Line</option><option>Two Lines</option><option>Four Corners</option><option>Horizontal Line</option><option>Diamond</option><option>X Pattern</option><option>Cross</option><option>Full House</option><option>Blackout</option></select></label><label>Prize<input type="number" value={stage.prize} onChange={event=>setStages(items=>items.map((item,itemIndex)=>itemIndex===index?{...item,prize:Number(event.target.value)}:item))}/></label><label className="stage-check"><input type="checkbox" checked={stage.continueAfterWin} onChange={event=>setStages(items=>items.map((item,itemIndex)=>itemIndex===index?{...item,continueAfterWin:event.target.checked}:item))}/> Continue after win</label><div><button type="button" onClick={()=>moveStage(index,-1)}>↑</button><button type="button" onClick={()=>moveStage(index,1)}>↓</button><button type="button" onClick={()=>setStages(items=>items.filter((_,itemIndex)=>itemIndex!==index))}>×</button></div></div>)}</div>;
  const formFooter=<div className="drawer-footer"><button type="button" className="outline-button" onClick={close}>Cancel</button>{action.kind==="create-room"&&<button type="button" className="outline-button" onClick={()=>notify("Room saved as draft.")}>Save draft</button>}<button className="admin-primary">{action.kind==="edit-room"?"Save changes":action.kind==="create-game"?"Create game":"Save configuration"}</button></div>;
  if(action.kind==="notifications")return <div className="admin-drawer-backdrop" onMouseDown={event=>event.target===event.currentTarget&&close()}><aside className="admin-drawer"><DrawerHeader title={title} close={close}/><div className="drawer-body">{[["Game starts in 1 minute","Trueig 90 Classic · 14:31"],["High-value claim needs review","Mega Trueig Jackpot · 14:29"],["Jackpot passed $126,000","Automatic threshold alert"],["Tournament Round 2 opened","Trueigtech Weekend Cup"]].map((item,index)=><div className="admin-notification" key={item[0]}><i>{index+1}</i><span><b>{item[0]}</b><small>{item[1]}</small></span><button onClick={()=>notify("Notification opened.")}>Open →</button></div>)}</div></aside></div>;
  if(action.kind==="player")return <div className="admin-drawer-backdrop"><aside className="admin-drawer wide"><DrawerHeader title={title} close={close}/><div className="drawer-body"><div className="player-profile-head"><span>{(action.label??"AR").slice(0,2).toUpperCase()}</span><div><h2>{action.label??"Ari.R"}</h2><p>TRUEIG-11804 · Active · Standard tier</p></div><b>$248.50<small>BALANCE</small></b></div><div className="player-profile-stats">{[["Games played","128"],["Cards purchased","346"],["Bingo wins","18"],["Win percentage","14.1%"],["Total prizes","$2,840"],["Current restrictions","None"]].map(item=><span key={item[0]}><small>{item[0]}</small><b>{item[1]}</b></span>)}</div><div className="player-action-grid">{["Suspend","Block","Restrict Bingo","Add Bonus Card","Add Promotional Ticket","View Cards","View Game History","View Transactions"].map(item=><button key={item} onClick={()=>notify(`${item} action applied to ${action.label??"Ari.R"}.`)}>{item}</button>)}</div><div className="drawer-section"><h3>Recent Bingo activity</h3><table><tbody>{[["TRUEIG-2842","Diamond 75","3 cards","+$400"],["TRUEIG-2838","Trueig 90 Classic","6 cards","+$150"],["TRUEIG-2812","Turbo 30","2 cards","$0"]].map(row=><tr key={row[0]}>{row.map(cell=><td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div></div></aside></div>;
  if(action.kind==="report-drilldown"||action.kind==="report")return <div className="admin-drawer-backdrop"><aside className="admin-drawer wide"><DrawerHeader title={title} close={close}/><div className="drawer-body"><div className="report-drill-stats">{[["Total","$48,620"],["Transactions","12,842"],["Average","$3.78"],["Change","+12.4%"]].map(item=><span key={item[0]}><small>{item[0]}</small><b>{item[1]}</b></span>)}</div><div className="drawer-form-grid"><label>Date range<input type="date" defaultValue="2026-08-21"/></label><label>Room<select><option>All Trueigtech rooms</option>{rooms.map(room=><option key={room.id}>{room.name}</option>)}</select></label><label>Report type<select><option>Revenue</option><option>Ticket Sales</option><option>Player Activity</option><option>Game Performance</option><option>Winning Patterns</option><option>Prize Payouts</option><option>Jackpot</option><option>Refunds</option></select></label></div><table className="drawer-table"><thead><tr><th>Reference</th><th>Room</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>{[["TXN-854201","Mega Trueig Jackpot","Ticket revenue","$42,100","Complete"],["PAY-284201","Diamond 75","Prize payout","$2,000","Complete"],["REF-128492","Trueig 90 Classic","Refund","$3.00","Complete"]].map(row=><tr key={row[0]}>{row.map(cell=><td key={cell}>{cell}</td>)}</tr>)}</tbody></table><div className="drawer-footer"><button className="outline-button" onClick={()=>notify("Report exported to XLSX.")}>Export XLSX</button><button className="admin-primary" onClick={()=>notify("Report filters applied.")}>Run report</button></div></div></aside></div>;
  const isRoom=action.kind==="create-room"||action.kind==="edit-room"; const isGame=action.kind==="create-game";
  return <div className="admin-drawer-backdrop" onMouseDown={event=>event.target===event.currentTarget&&close()}><aside className={`admin-drawer ${(isRoom||isGame)?"wide":""}`}><DrawerHeader title={title} close={close}/><form className="drawer-body" onSubmit={submit}>
    {isRoom&&<><div className="drawer-section"><h3>Basic information</h3><div className="drawer-form-grid"><label>Room name<input required value={name} onChange={event=>setName(event.target.value)}/></label><label>Room code<input defaultValue={editingRoom?.id.toUpperCase()??"TRUEIG-SUN75"}/></label><label className="full">Description<textarea defaultValue="A premium Trueigtech multi-stage Bingo room."/></label><label>Thumbnail<input type="file" accept="image/*"/></label><label>Banner<input type="file" accept="image/*"/></label><label>Room type<select><option>Public</option><option>VIP</option><option>Community</option><option>Tournament</option></select></label><label>Status<select><option>Open</option><option>Draft</option><option>Scheduled</option><option>Disabled</option></select></label></div></div><div className="drawer-section"><h3>Bingo configuration</h3><div className="drawer-form-grid"><label>Bingo variant<select value={variant} onChange={event=>setVariant(event.target.value)}><option>90-Ball Classic</option><option>75-Ball Pattern</option><option>30-Ball Speed</option><option>80-Ball Grid</option><option>75-Ball Progressive</option></select></label><label>Ball count<input value={variant.includes("90")?90:variant.includes("30")?30:variant.includes("80")?80:75} readOnly/></label><label>Card layout<select><option>{variant.includes("90")?"3 × 9":variant.includes("30")?"3 × 3":variant.includes("80")?"4 × 4":"5 × 5"}</option></select></label><label>Number range<input defaultValue={`1–${variant.includes("90")?90:variant.includes("30")?30:variant.includes("80")?80:75}`}/></label><label>Free space<select><option>{variant.includes("75")?"Center free":"None"}</option></select></label><label>Winning format<select><option>Multiple stages</option><option>Single pattern</option><option>Progressive</option></select></label></div></div><div className="drawer-section"><h3>Ticket & player configuration</h3><div className="drawer-form-grid"><label>Ticket price<input type="number" step="0.5" value={price} onChange={event=>setPrice(Number(event.target.value))}/></label><label>Minimum cards<input type="number" defaultValue="1"/></label><label>Maximum cards<input type="number" defaultValue="8"/></label><label>Cards per strip<input type="number" defaultValue={variant.includes("90")?6:1}/></label><label>Sales start time<input type="time" defaultValue="17:45"/></label><label>Sales close time<input type="time" defaultValue="17:59"/></label><label>Minimum players<input type="number" defaultValue="2"/></label><label>Maximum players<input type="number" defaultValue={editingRoom?.maxPlayers??300}/></label><label>VIP requirement<select><option>None</option><option>Gold</option><option>Platinum</option></select></label><label>Country restrictions<input placeholder="None or comma-separated ISO codes"/></label></div></div><div className="drawer-section"><h3>Game configuration</h3><div className="drawer-form-grid"><label>Countdown<input type="number" defaultValue="5"/></label><label>Ball calling speed<select><option>Fast · 1.2s</option><option>Turbo · 0.6s</option><option>Normal · 2.1s</option><option>Slow · 3.2s</option></select></label>{["Auto Daub","Manual Daub","Auto Bingo","Manual Bingo Claim","Chat"].map(item=><label className="check-field" key={item}><input type="checkbox" defaultChecked={item!=="Auto Bingo"}/>{item}</label>)}</div></div>{stagesEditor}<div className="drawer-section"><h3>Prize & multiple winners</h3><div className="drawer-form-grid"><label>Prize type<select><option>Fixed prize</option><option>Prize pool</option><option>Progressive</option></select></label><label>Prize amount<input type="number" value={prize} onChange={event=>setPrize(Number(event.target.value))}/></label><label>Multiple winners<select><option>Allowed</option><option>First validated only</option></select></label><label>Prize split rule<select><option>Split equally</option><option>Fixed per winner</option><option>Shared jackpot</option><option>Carry over remainder</option></select></label><label>Maximum winner count<input type="number" defaultValue="10"/></label><label className="check-field"><input type="checkbox" defaultChecked={Boolean(editingRoom?.jackpot)}/> Enable jackpot</label><label>Jackpot type<select><option>Progressive</option><option>Guaranteed</option><option>Community</option></select></label><label>Starting amount<input type="number" defaultValue="50000"/></label><label>Contribution %<input type="number" step="0.1" defaultValue="2.5"/></label><label>Winning condition<input defaultValue="Full House within 42 balls"/></label><label>Reset amount<input type="number" defaultValue="50000"/></label></div></div>{action.kind==="edit-room"&&<div className="destructive-row"><button type="button" onClick={()=>{const copy={...editingRoom!,id:`${editingRoom!.id}-copy`,name:`${editingRoom!.name} Copy`,status:"Open" as BingoStatus};setRooms([...rooms,copy]);notify("Room duplicated.")}}>Duplicate room</button><button type="button" onClick={()=>setConfirm("disable")}>Disable room</button><button type="button" onClick={()=>setConfirm("delete")}>Delete room</button></div>}</>}
    {isGame&&<><div className="drawer-section"><h3>Game details</h3><div className="drawer-form-grid"><label>Room<select defaultValue={editingRoom?.name}>{rooms.map(room=><option key={room.id}>{room.name}</option>)}</select></label><label>Bingo type<select defaultValue={editingRoom?.variant}><option>90-Ball Classic</option><option>75-Ball Pattern</option><option>30-Ball Speed</option><option>80-Ball Grid</option></select></label><label>Date<input type="date" defaultValue="2026-08-22"/></label><label>Start time<input type="time" defaultValue="18:00"/></label><label>Ticket price<input type="number" step="0.5" value={price} onChange={event=>setPrice(Number(event.target.value))}/></label><label>Prize<input type="number" value={prize} onChange={event=>setPrize(Number(event.target.value))}/></label><label>Call speed<select><option>Fast</option><option>Turbo</option><option>Normal</option><option>Slow</option></select></label><label>Maximum players<input type="number" defaultValue="300"/></label><label>Card limit<input type="number" defaultValue="8"/></label><label>Jackpot<select><option>None</option><option>Mega Trueig Jackpot</option></select></label><label>Promotion<select><option>None</option><option>Buy 3 Get 1</option><option>Happy Hour</option></select></label><label>Game frequency<select><option>One time</option><option>Hourly</option><option>Daily</option><option>Weekly</option></select></label></div></div>{stagesEditor}<div className="game-form-actions"><button type="button" className="outline-button" onClick={()=>notify("Game scheduled for 18:00.")}>Schedule game</button><button type="button" className="admin-primary" onClick={()=>{notify("Game started immediately and opened in Live Control.");close()}}>Start immediately</button></div></>}
    {!isRoom&&!isGame&&<DrawerSpecialForm kind={action.kind} notify={notify}/>} {confirm&&<div className="confirm-box"><b>{confirm==="delete"?"Delete this room permanently?":"Disable this room?"}</b><p>{confirm==="delete"?"The demo room will be removed from the lobby.":"Players will no longer be able to enter new rounds."}</p><button type="button" onClick={()=>setConfirm(null)}>Keep room</button><button type="button" className="danger-button" onClick={()=>{if(editingRoom){if(confirm==="delete")setRooms(rooms.filter(room=>room.id!==editingRoom.id));else setRooms(rooms.map(room=>room.id===editingRoom.id?{...room,status:"Scheduled"}:room))}notify(`Room ${confirm==="delete"?"deleted":"disabled"}.`);close()}}>Confirm {confirm}</button></div>} {formFooter}
  </form></aside></div>;
}

function DrawerHeader({title,close}:{title:string;close:()=>void}){return <div className="drawer-header"><div><span className="section-kicker">TRUEIGTECH BACKOFFICE</span><h2>{title}</h2><p>Changes update the connected demo state immediately.</p></div><button onClick={close}>×</button></div>}

function DrawerSpecialForm({kind,notify}:{kind:string;notify:(message:string)=>void}){
  if(kind==="caller-config")return <div className="drawer-section"><h3>Caller behavior</h3><div className="drawer-form-grid"><label>Initial countdown<input type="number" defaultValue="5"/></label><label>Time between balls<input type="number" step="0.1" defaultValue="1.2"/></label><label>Voice caller<select><option>Trueigtech Nova</option><option>Trueigtech Max</option><option>Off</option></select></label><label>Animation<select><option>Premium ball motion</option><option>Minimal</option><option>Off</option></select></label>{["Auto call","Manual call enabled","Pause on Bingo claim","Resume after winner"].map(item=><label className="check-field" key={item}><input type="checkbox" defaultChecked/>{item}</label>)}<label>Game end delay<input type="number" defaultValue="4"/></label></div><button type="button" className="full-outline" onClick={()=>notify("Caller preview: B-17. Voice and animation settings applied.")}>Preview B-17 call</button></div>;
  if(kind.includes("jackpot"))return <div className="drawer-section"><h3>Jackpot configuration</h3><div className="drawer-form-grid"><label>Jackpot name<input defaultValue="Mega Trueig Jackpot"/></label><label>Jackpot type<select><option>Progressive</option><option>Guaranteed</option><option>Community</option></select></label><label>Starting amount<input type="number" defaultValue="50000"/></label><label>Current amount<input type="number" defaultValue="125480"/></label><label>Contribution %<input type="number" step="0.1" defaultValue="2.5"/></label><label>Maximum amount<input type="number" defaultValue="250000"/></label><label>Qualifying Bingo type<select><option>75-Ball Progressive</option><option>90-Ball</option></select></label><label>Qualifying pattern<select><option>Full House</option><option>Blackout</option></select></label><label>Maximum ball count<input type="number" defaultValue="42"/></label><label>Reset amount<input type="number" defaultValue="50000"/></label><label>Start date<input type="date" defaultValue="2026-08-21"/></label><label>End date<input type="date" defaultValue="2026-12-31"/></label><label>Status<select><option>Active</option><option>Paused</option></select></label></div><div className="special-actions"><button type="button" onClick={()=>notify("Jackpot paused.")}>Pause</button><button type="button" onClick={()=>notify("Jackpot resumed.")}>Resume</button><button type="button" className="danger-button" onClick={()=>notify("Jackpot reset to $50,000 after confirmation.")}>Reset jackpot</button></div></div>;
  if(kind.includes("tournament"))return <div className="drawer-section"><h3>Tournament configuration</h3><div className="drawer-form-grid"><label>Tournament name<input defaultValue="Trueigtech Weekend Cup"/></label><label className="full">Description<textarea defaultValue="Five-round progressive elimination tournament."/></label><label>Bingo rooms<select multiple><option>Diamond 75</option><option>Trueig 90 Classic</option><option>Turbo 30</option></select></label><label>Start date<input type="date" defaultValue="2026-08-22"/></label><label>End date<input type="date" defaultValue="2026-08-24"/></label><label>Entry fee<input type="number" defaultValue="8"/></label><label>Maximum players<input type="number" defaultValue="512"/></label><label>Number of rounds<input type="number" defaultValue="5"/></label><label>Prize pool<input type="number" defaultValue="25000"/></label><label>Points rules<textarea defaultValue="Line 10 · Pattern 25 · Full House 50"/></label><label>Qualification rules<textarea defaultValue="Top 50% advance each round"/></label><label>Leaderboard rules<textarea defaultValue="Points, wins, fastest Bingo"/></label></div></div>;
  if(kind==="promotion")return <div className="drawer-section"><h3>Promotion builder</h3><div className="drawer-form-grid"><label>Promotion name<input defaultValue="Trueigtech Happy Hour"/></label><label>Promotion type<select><option>Free Bingo</option><option>Free Cards</option><option>Buy 3 Get 1</option><option>Happy Hour</option><option>Cashback</option><option>Tournament Entry</option><option>VIP Access</option><option>Deposit Bonus</option><option>Daily Reward</option></select></label><label>Start date<input type="date" defaultValue="2026-08-22"/></label><label>End date<input type="date" defaultValue="2026-09-22"/></label><label>Eligible rooms<select><option>All rooms</option><option>Diamond 75</option><option>Turbo 30</option></select></label><label>Reward value<input type="number" defaultValue="10"/></label><label>Maximum claims<input type="number" defaultValue="5000"/></label><label>Status<select><option>Active</option><option>Draft</option><option>Paused</option></select></label></div></div>;
  if(kind==="announcement")return <div className="drawer-section"><h3>In-app announcement</h3><div className="drawer-form-grid"><label>Audience<select><option>All players</option><option>Active rooms</option><option>VIP players</option><option>Tournament entrants</option></select></label><label>Priority<select><option>Normal</option><option>Important</option><option>Urgent</option></select></label><label className="full">Message<textarea defaultValue="Free Bingo starts in 5 minutes. Claim your Trueigtech card now!"/></label><label>Action label<input defaultValue="Claim free card"/></label><label>Linked screen<select><option>Free Bingo Party</option><option>Promotions</option><option>Lobby</option></select></label><label>Schedule<input type="datetime-local" defaultValue="2026-08-21T18:00"/></label></div><button type="button" className="full-outline" onClick={()=>notify("Test announcement sent to your admin account.")}>Send test notification</button></div>;
  if(kind==="manual-call")return <div className="drawer-section"><h3>Manual ball call</h3><label>Ball number<input type="number" min="1" max="75" defaultValue="17"/></label><p className="form-hint">The number is checked against call history before broadcast.</p></div>;
  if(kind==="declare-winner")return <div className="drawer-section"><h3>Manual winner declaration</h3><div className="drawer-form-grid"><label>Player<input defaultValue="LuckyStar"/></label><label>Card ID<input defaultValue="284237"/></label><label>Winning stage<select><option>One Line</option><option>Diamond</option><option>Full House</option></select></label><label>Prize<input type="number" defaultValue="400"/></label><label>Winner count<input type="number" defaultValue="1"/></label><label>Split rule<select><option>Split equally</option><option>Fixed per winner</option></select></label></div></div>;
  return <div className="drawer-section"><h3>Configuration</h3><div className="drawer-form-grid"><label>Setting name<input defaultValue="Trueigtech default"/></label><label>Status<select><option>Enabled</option><option>Disabled</option></select></label><label className="full">Description<textarea defaultValue="Operational configuration for the Trueigtech Bingo platform."/></label></div></div>;
}

function CreateRoomModal({ close, create }: { close: () => void; create: (room: BingoRoomData) => void }) {
  const [name, setName] = useState("Starlight 75");
  const [variant, setVariant] = useState("75-Ball Pattern");
  const [price, setPrice] = useState(2.5);
  const [pattern, setPattern] = useState("X Shape");
  const submit = (event: FormEvent) => { event.preventDefault(); create({ id: name.toLowerCase().replaceAll(" ", "-"), name, variant, status: "Open", ticketPrice: price, prize: 4000, players: 0, maxPlayers: 300, cardsSold: 0, startsIn: "15:00", pattern, accent: "violet", tag: "NEW" }); };
  return <div className="admin-modal-backdrop"><form className="admin-modal" onSubmit={submit}><div className="modal-header"><div><span className="section-kicker">NEW BINGO ROOM</span><h2>Create room</h2><p>Configure the core game rules. Advanced controls remain editable after creation.</p></div><button type="button" onClick={close}>×</button></div><div className="form-grid"><label className="wide">Room name<input required value={name} onChange={(event)=>setName(event.target.value)} /></label><label>Game variant<select value={variant} onChange={(event)=>setVariant(event.target.value)}><option>75-Ball Pattern</option><option>90-Ball Classic</option><option>30-Ball Speed</option><option>80-Ball Grid</option></select></label><label>Currency<select><option>USD</option><option>EUR</option><option>GBP</option></select></label><label>Ticket price<input type="number" min="0" step="0.5" value={price} onChange={(event)=>setPrice(Number(event.target.value))} /></label><label>Maximum players<input type="number" defaultValue="300" /></label><label>Winning pattern<select value={pattern} onChange={(event)=>setPattern(event.target.value)}><option>X Shape</option><option>Four Corners</option><option>Diamond</option><option>Full House</option></select></label><label>Calling speed<select><option>Fast · 1.6 seconds</option><option>Normal · 2.8 seconds</option><option>Turbo · 0.8 seconds</option></select></label></div><div className="modal-switches"><div><span><b>Auto daub</b><small>Mark called numbers automatically</small></span><button type="button" className="toggle on"><i /></button></div><div><span><b>Room chat</b><small>Enable social messages</small></span><button type="button" className="toggle on"><i /></button></div><div><span><b>Progressive jackpot</b><small>Attach a jackpot pool</small></span><button type="button" className="toggle"><i /></button></div></div><div className="modal-footer"><button type="button" className="outline-button" onClick={close}>Cancel</button><button className="admin-primary">Create & open room</button></div></form></div>;
}
