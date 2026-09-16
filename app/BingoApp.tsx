"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Bell, ChartLineUp, CheckCircle, Clock, Club, Diamond, Heart, House, Info, Lightning, Pulse, Star, Ticket, Trophy, UsersThree, X } from "@phosphor-icons/react";
import {
  BingoEngine,
  BingoRoomData,
  BingoStatus,
  RTPEngine,
  RtpMode,
  TransactionManager,
  demoRooms,
  makeGridCard,
  make90Ticket,
  make75Card,
} from "./bingo-core";
import {
  apiClient,
  type BingoCardModel,
  type DashboardResponse,
  type PlayerModel,
  type WalletTransaction,
} from "./api-client";

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
      {/* This local SVG is already the final brand asset; image optimization would add no value. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
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

export default function Home({ initialMode = "player" }: { initialMode?: AppMode }) {
  const [mode] = useState<AppMode>(initialMode);
  const [rooms, setRooms] = useState(demoRooms);
  const [playerView, setPlayerView] = useState<PlayerView>("lobby");
  const [activeRoomId, setActiveRoomId] = useState("diamond-75");
  const [wallet, setWallet] = useState(248.5);
  const [toast, setToast] = useState("");

  useEffect(() => {
    apiClient.rooms.list().then((list) => {
      if (list && list.length) setRooms(list);
    });
    apiClient.wallet.get().then((w) => {
      if (w && typeof w.balance === "number") setWallet(w.balance);
    });
  }, []);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

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
            wallet={wallet}
            onAddFunds={async () => {
              const res = await apiClient.wallet.deposit(50);
              if (res && typeof res.balance === "number") {
                setWallet(res.balance);
                notify(`Added $50.00 to wallet! Balance: $${res.balance.toFixed(2)}`);
              }
            }}
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
          {playerView === "tournaments" && <TournamentLobby enterRoom={() => enterRoom(rooms.find((room) => room.id === "tournament") ?? rooms[0])} notify={notify} />}
          {playerView === "history" && <PlayerHistory />}
          {playerView === "tickets" && <PlayerHubPage type="tickets" rooms={rooms} enterRoom={enterRoom} notify={notify} />}
          {playerView === "jackpots" && <PlayerHubPage type="jackpots" rooms={rooms} enterRoom={enterRoom} notify={notify} />}
          {playerView === "promotions" && <PlayerHubPage type="promotions" rooms={rooms} enterRoom={enterRoom} notify={notify} />}
          {playerView === "profile" && <PlayerHubPage type="profile" rooms={rooms} enterRoom={enterRoom} notify={notify} />}
        </>
      ) : (
        <AdminExperience rooms={rooms} setRooms={setRooms} notify={notify} />
      )}
      <Toast message={toast} />
    </main>
  );
}

function PlayerHeader({ view, setView, wallet, onAddFunds }: { view: PlayerView; setView: (view: PlayerView) => void; wallet: number; onAddFunds?: () => void }) {
  const links: Array<[PlayerView, string]> = [["lobby", "Lobby"], ["tickets", "Tickets"], ["jackpots", "Jackpots"], ["tournaments", "Tournaments"], ["promotions", "Promotions"], ["history", "History"]];
  return (
    <header className="player-header">
      <button className="brand-button" onClick={() => setView("lobby")} aria-label="Go to lobby"><Logo /></button>
      <nav className="main-nav" aria-label="Player navigation">
        {links.map(([key, label]) => <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>{label}</button>)}
      </nav>
      <div className="header-actions">
        <div className="wallet"><small>WALLET</small><strong>{money(wallet)}</strong><button aria-label="Add funds" onClick={onAddFunds}>+</button></div>
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
    { id: "tournament", kicker: "TRUEIGTECH WEEKEND CUP", title: <>Five rounds.<br /><em>One champion.</em></>, body: "Build points across patterns and Full House wins. The top 128 advance after every stage.", cta: "Play now", alt: "View games", seconds: 3000, theme: "tournament", value: "$25,000", image: "/banners/weekend-cup-jackpot.png", imageAlt: "Trueigtech Bingo Weekend Cup. Five rounds, one champion, with a $25,000 jackpot prize this round.", imageWidth: 1880, imageHeight: 836 },
    { id: "trueig-90", kicker: "BINGO FUN IS CALLING", title: <>Fun is calling,<br />are <em>you</em> in?</>, body: "Join thousands of players and win amazing rewards.", cta: "Play now", alt: "", seconds: 480, theme: "host", value: "$1,500", image: "/banners/fun-is-calling.png", imageAlt: "Trueigtech Bingo. Fun is calling, are you in? Join thousands of players and win amazing rewards.", imageWidth: 1672, imageHeight: 941 },
     { id: "tournament", kicker: "TRUEIGTECH WEEKEND CUP", title: <>Five rounds.<br /><em>One champion.</em></>, body: "Build points across patterns and Full House wins. The top 128 advance after every stage.", cta: "Play now", alt: "View games", seconds: 3000, theme: "tournament", value: "$25,000", image: "/banners/weekend-cup-jackpot.png", imageAlt: "Trueigtech Bingo Weekend Cup. Five rounds, one champion, with a $25,000 jackpot prize this round.", imageWidth: 1880, imageHeight: 836 },
    { id: "trueig-90", kicker: "BINGO FUN IS CALLING", title: <>Fun is calling,<br />are <em>you</em> in?</>, body: "Join thousands of players and win amazing rewards.", cta: "Play now", alt: "", seconds: 480, theme: "host", value: "$1,500", image: "/banners/fun-is-calling.png", imageAlt: "Trueigtech Bingo. Fun is calling, are you in? Join thousands of players and win amazing rewards.", imageWidth: 1672, imageHeight: 941 },
    { id: "tournament", kicker: "TRUEIGTECH WEEKEND CUP", title: <>Five rounds.<br /><em>One champion.</em></>, body: "Build points across patterns and Full House wins. The top 128 advance after every stage.", cta: "Play now", alt: "View games", seconds: 3000, theme: "tournament", value: "$25,000", image: "/banners/weekend-cup-jackpot.png", imageAlt: "Trueigtech Bingo Weekend Cup. Five rounds, one champion, with a $25,000 jackpot prize this round.", imageWidth: 1880, imageHeight: 836 },
    { id: "trueig-90", kicker: "BINGO FUN IS CALLING", title: <>Fun is calling,<br />are <em>you</em> in?</>, body: "Join thousands of players and win amazing rewards.", cta: "Play now", alt: "", seconds: 480, theme: "host", value: "$1,500", image: "/banners/fun-is-calling.png", imageAlt: "Trueigtech Bingo. Fun is calling, are you in? Join thousands of players and win amazing rewards.", imageWidth: 1672, imageHeight: 941 },
    // { id: "mega-jackpot", kicker: "MEGA TRUEIG JACKPOT", title: <>The next call could<br />change <em>everything.</em></>, body: "Complete Full House within 42 balls for the progressive. Miss the limit and the $5,000 house prize is still live.", cta: "Play now", alt: "View jackpot", seconds: 151, theme: "jackpot", value: "$125,480" },
    // { id: "turbo-30", kicker: "SPEED BINGO", title: <>Thirty balls.<br /><em>Full speed.</em></>, body: "Grab a 3×3 card, count down from five and race to a full house in under two minutes.", cta: "Join round", alt: "How it works", seconds: 17, theme: "speed", value: "00:17" },
    // { id: "free-party", kicker: "FREE BINGO EVERY HOUR", title: <>Your next card<br />is <em>on us.</em></>, body: "Claim a free 75-ball card and play Four Corners for a $100 community prize.", cta: "Claim free card", alt: "View schedule", seconds: 2380, theme: "free", value: "18:00" },
    // { id: "vip-gold", kicker: "VIP BINGO NIGHT", title: <>Premium cards.<br /><em>Golden prizes.</em></>, body: "A private X Pattern to Blackout progression for Trueigtech VIP players.", cta: "Enter VIP room", alt: "View benefits", seconds: 4200, theme: "vip", value: "$20,000" },
  ];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => setIndex((value) => (value + 2) % slides.length), 8000);
    return () => window.clearTimeout(timer);
  }, [index, paused, slides.length]);

  const visibleSlides = [slides[index], slides[(index + 1) % slides.length]];

  return <section className="lobby-hero-carousel" aria-label="Featured Bingo promotions" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    {visibleSlides.map((slide) => {
      const room = rooms.find((item) => item.id === slide.id) ?? rooms[0];
      const showTournamentGames = slide.id === "tournament";
      const secondaryAction = () => showTournamentGames ? setView("tournaments") : slide.id === "mega-jackpot" ? setView("jackpots") : enterRoom(room);

      return <article className={`lobby-banner-card hero-slide-${slide.theme} ${slide.image ? "lobby-banner-card-image" : "lobby-banner-card-copy"}`} key={slide.id}>
        {slide.image ? <>
          {/* Keep the supplied campaign artwork byte-for-byte instead of routing it through an image transform. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lobby-banner-image" src={slide.image} alt={slide.imageAlt} width={slide.imageWidth} height={slide.imageHeight} fetchPriority="high" />
          <div className="lobby-banner-hotspots">
            <button className="banner-play-hotspot" onClick={() => enterRoom(room)} aria-label={showTournamentGames ? "Play the Trueigtech Weekend Cup" : "Play Bingo now"} />
            {showTournamentGames && <button className="banner-games-hotspot" onClick={() => setView("tournaments")} aria-label="View tournament games" />}
          </div>
        </> : <>
          <div className="compact-banner-copy">
            <span className="eyebrow"><i /> {slide.kicker}</span>
            <h2>{slide.title}</h2>
            <p>{slide.body}</p>
            <div className="compact-banner-actions"><button className="primary-button" onClick={() => enterRoom(room)}>{slide.cta} <span>→</span></button><button className="glass-button" onClick={secondaryAction}>{slide.alt}</button></div>
          </div>
          <div className="compact-banner-prize"><small>{slide.theme === "speed" ? "NEXT ROUND" : "FEATURED PRIZE"}</small><strong>{slide.value}</strong><span>{room.pattern}</span></div>
        </>}
      </article>;
    })}
  </section>;
}

function patternCells(name: string, rows: number, columns: number, ballCount: number): number[] {
  if (ballCount === 90) return name.includes("Two") ? Array.from({ length: 18 }, (_, index) => index) : name.includes("Full") ? Array.from({ length: 27 }, (_, index) => index) : Array.from({ length: 9 }, (_, index) => index);
  if (ballCount === 30 || name.includes("Full") || name.includes("Blackout")) return Array.from({ length: rows * columns }, (_, index) => index);
  if (name.includes("Four")) return [0, columns - 1, (rows - 1) * columns, rows * columns - 1];
  if (name.includes("Diamond")) return rows === 5 ? [2, 6, 8, 10, 12, 14, 16, 18, 22] : [1, 4, 7, 10, 13];
  if (name.includes("X")) return Array.from({ length: rows }, (_, index) => [index * columns + index, index * columns + (columns - 1 - index)]).flat();
  if (name.includes("Cross")) return Array.from({ length: rows }, (_, index) => [Math.floor(rows / 2) * columns + index, index * columns + Math.floor(columns / 2)]).flat();
  if (name.includes("Two")) return Array.from({ length: columns * 2 }, (_, index) => index);
  return Array.from({ length: columns }, (_, index) => index);
}

const roomArtwork: Record<string, string> = {
  "trueig-90": "/rooms/trueig-90-classic.png",
  "turbo-30": "/rooms/turbo-30.png",
  "diamond-75": "/rooms/diamond-75.png",
  "mega-jackpot": "/rooms/mega-trueig-jackpot.png",
  "quick-80": "/rooms/quick-80.png",
  "pattern-arena": "/rooms/trueig-pattern-arena.png",
  "free-party": "/rooms/free-bingo-party.png",
  "midnight-90": "/rooms/midnight-bingo.png",
  "vip-gold": "/rooms/mega-trueig-jackpot.png",
  tournament: "/rooms/trueig-pattern-arena.png",
};

function RoomCard({ room, onEnter, favorite, toggleFavorite }: { room: BingoRoomData; onEnter: () => void; favorite: boolean; toggleFavorite: () => void }) {
  const occupancy = Math.min(100, Math.round((room.players / room.maxPlayers) * 100));
  const entryLabel = room.status === "Live"
    ? "Join live"
    : room.status === "Selling Tickets" || room.status === "Starting Soon"
      ? "Buy tickets"
      : room.status === "Scheduled"
        ? "View schedule"
        : room.ticketPrice === 0
          ? "Play free"
          : "Enter room";
  const roundLabel = room.status === "Live" ? room.startsIn.replace("LIVE · ", "") : room.startsIn;

  return (
    <article className={`room-card room-card-media accent-${room.accent}`}>
      <div className="room-card-artwork">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={roomArtwork[room.id] ?? "/rooms/diamond-75.png"} alt={`${room.name} themed Bingo room preview`} width="960" height="540" loading="lazy" />
        <div className="room-card-top">
          <span className="room-tag">{room.tag}</span>
          <button className={`favorite-button ${favorite ? "active" : ""}`} onClick={toggleFavorite} aria-label={favorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={favorite}>
            <Heart size={17} weight={favorite ? "fill" : "regular"} />
          </button>
        </div>
        <div className="room-card-artwork-footer">
          <StatusPill status={room.status} />
          <span className="room-card-round"><Clock size={13} weight="bold" />{roundLabel}</span>
        </div>
      </div>
      <div className="room-card-content">
        <div className="room-card-title-row">
          <div><h3>{room.name}</h3><p>{room.variant}</p></div>
          <div className="room-card-prize"><small>{room.jackpot ? "JACKPOT" : "PRIZE"}</small><strong>{money(room.jackpot ?? room.prize)}</strong></div>
        </div>
        <div className="room-card-facts">
          <span><Ticket size={16} weight="duotone" /><span><small>TICKET</small><b>{room.ticketPrice ? money(room.ticketPrice) : "FREE"}</b></span></span>
          <span><UsersThree size={16} weight="duotone" /><span><small>PLAYERS</small><b>{room.players} / {room.maxPlayers}</b></span></span>
          <span><Lightning size={16} weight="duotone" /><span><small>PACE</small><b>{room.frequency ?? "Every 10 min"}</b></span></span>
        </div>
        <div className="room-card-capacity">
          <div><span>{occupancy}% full</span><span>{room.cardsSold.toLocaleString()} cards sold</span></div>
          <div className="sales-progress" aria-label={`${occupancy}% of player capacity filled`}><span style={{ width: `${occupancy}%` }} /></div>
        </div>
        <div className="room-card-bottom">
          <div className="room-card-pattern"><small>WINNING</small><span>{room.pattern}</span></div>
          <button onClick={onEnter}>{entryLabel}<ArrowRight size={15} weight="bold" /></button>
        </div>
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

  const ballLabel = useCallback((value: number) => ballCount === 75 ? BingoEngine.label(value) : `${value}`, [ballCount]);
  const targetCells = (name: string) => patternCells(name, rows, columns, ballCount);

  useEffect(() => {
    if (phase !== "countdown") return;
    const timer = window.setTimeout(() => {
      if (countdown <= 0) {
        setPhase("live");
        notify(`${room.name} is live — ${activeStage.name} is the first stage.`);
        return;
      }
      setCountdown((value) => value - 1);
    }, countdown <= 0 ? 0 : 1000);
    return () => window.clearTimeout(timer);
  }, [phase, countdown, activeStage.name, notify, room.name]);

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
  }, [phase, paused, speed, ballCount, room.callDelay, ballLabel]);

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
    // triggerWinner intentionally reads the current render state. Depending on its
    // identity would restart this winner detector after every state transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [called.length, phase, stageIndex, claimLocked, ballCount, stages.length]);

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
      if (names.includes("Ari.R")) {
        apiClient.game.claim(room.id, { ticketId: `CARD-${activeCard}`, playerName: "Ari.R", manualPattern: activeStage.name }).then((res) => {
          if (res?.wallet !== undefined) setWallet(res.wallet);
        });
      }
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
    apiClient.tickets.buy(room.id, selectedCards.length).then((res) => {
      if (res?.wallet !== undefined) setWallet(res.wallet);
    });
    notify(`${selectedCards.length} card${selectedCards.length > 1 ? "s" : ""} secured · ${TransactionManager.reference("TRUEIG")}`);
  };

  const nextRound = () => {
    setCalled([]); setCurrent(null); setManualMarks([]); setPhase("selling"); setCountdown(5); setPaused(false); setStageIndex(0); setClaimLocked(false); setWinnerNames([]);
    if (room.id === "pattern-arena") setPatternRound((value) => (value + 1) % patternSeries.length);
    notify(room.id === "pattern-arena" ? `Next pattern loaded: ${patternSeries[(patternRound + 1) % patternSeries.length]}.` : "Next round is open for tickets.");
  };

  const sendChat = (event: FormEvent) => {
    event.preventDefault();
    if (!chat.trim()) return;
    const text = chat.trim();
    setMessages((items) => [...items, ["Ari.R", text, "now"]]);
    setChat("");
    apiClient.chat.send(room.id, text, "Ari.R");
  };
  const toggleCard = (index: number) => {
    if (phase !== "selling") return setActiveCard(index);
    setSelectedCards((cards) => cards.includes(index) ? cards.filter((item) => item !== index) : cards.length < 8 ? [...cards, index] : cards);
    setActiveCard(index);
  };
  // Copy before sorting: .sort() mutates in place, and sorting `selectedCards`
  // directly rewrites state during render.
  const visibleCards = [...(phase === "selling" ? Array.from({ length: 8 }, (_, index) => index) : selectedCards)].sort((a, b) => sortDirection === "asc" ? a - b : b - a);

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
        <div className={`ticket-grid  ${!multiView?"single":""}`}>{visibleCards.map(index=><TrueigTicket key={index} index={index} values={cardValues[index]} rows={rows} columns={columns} ballCount={ballCount} selected={selectedCards.includes(index)} active={activeCard===index} selling={phase==="selling"} called={called} manualMarks={manualMarks} autoDaub={autoDaub} targetCells={targetCells(activeStage.name)} onSelect={()=>toggleCard(index)} onPreview={()=>setActiveCard(index)} onMark={(value)=>{if(!called.includes(value))return notify("That number has not been called yet.");setManualMarks(values=>values.includes(value)?values.filter(item=>item!==value):[...values,value])}}/>)}</div>
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

const tournamentStages = [
  { name: "Open qualifier", detail: "512 → 256 players", date: "Aug 22 · 2:00 PM" },
  { name: "Pattern sprint", detail: "256 → 128 players", date: "Aug 22 · 7:00 PM" },
  { name: "Quarterfinal", detail: "128 → 16 players", date: "Aug 23 · 7:00 PM" },
  { name: "Semifinal", detail: "16 → 8 players", date: "Aug 24 · 5:00 PM" },
  { name: "Grand final", detail: "8 players · one champion", date: "Aug 24 · 8:00 PM" },
] as const;

const tournamentPlayers = [
  { rank: 1, player: "TrueigQueen", points: 480, wins: 4, fast: "18 balls", status: "Advanced", friend: true },
  { rank: 2, player: "BallisticB", points: 455, wins: 3, fast: "21 balls", status: "Advanced", friend: false },
  { rank: 3, player: "MikaK", points: 438, wins: 3, fast: "19 balls", status: "Advanced", friend: true },
  { rank: 18, player: "LuckyStar", points: 348, wins: 2, fast: "24 balls", status: "In play", friend: true },
  { rank: 42, player: "Ari.R", points: 286, wins: 1, fast: "28 balls", status: "In play", friend: true },
  { rank: 97, player: "SkyJump", points: 224, wins: 1, fast: "31 balls", status: "In play", friend: false },
];

function TournamentLobby({ enterRoom, notify }: { enterRoom: () => void; notify: (message: string) => void }) {
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
            <button className="primary-button" onClick={handleEntry}>{registered ? "Open tournament room" : "Enter for $8"}</button>
            <button className="glass-button" onClick={() => setRulesOpen(true)}>View rules</button>
          </div>
          {registered && <span className="tourney-confirmation">Entry confirmed · Seat 385</span>}
        </div>
        <div className="tourney-prize-panel">
          <small>$25,000 guaranteed</small>
          <strong>$25,000</strong>
          <span>guaranteed</span>
          <div className="tourney-seat-progress" role="progressbar" aria-label="Tournament seats filled" aria-valuemin={0} aria-valuemax={512} aria-valuenow={registered ? 385 : 384}><i style={{ width: registered ? "75.2%" : "75%" }} /></div>
          <div className="tourney-seat-copy"><span>{registered ? 385 : 384} / 512 seats filled</span><b>{registered ? "75.2%" : "75%"}</b></div>
        </div>
      </section>

      <nav className="tourney-stage-rail" aria-label="Tournament rounds">
        {tournamentStages.map((stage, index) => {
          const round = index + 1;
          const state = round < 3 ? "complete" : round === 3 ? "current" : "upcoming";
          return <button key={stage.name} className={`${state} ${activeRound === round ? "selected" : ""}`} aria-pressed={activeRound === round} onClick={() => setActiveRound(round)}><span className="tourney-stage-number">{round}</span><span><b>{stage.name}</b><em>{stage.detail}</em><small>{stage.date}</small></span></button>;
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
            <div><h2 id="standings-title">Live standings</h2><p><i />Round 3 of 5 · <span>Top 128 advance</span></p></div>
            <div className="tourney-table-controls">
              <label><span className="sr-only">Search player</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player" /></label>
              <div className="tourney-scope" aria-label="Standings scope">
                <button className={scope === "friends" ? "active" : ""} onClick={() => { setScope("friends"); setStandingsPage(1); }}>Friends</button>
                <button className={scope === "global" ? "active" : ""} onClick={() => setScope("global")}>Global</button>
              </div>
            </div>
          </div>
          <div className="tourney-table-wrap">
            <table>
              <thead><tr><th>Rank</th><th>Player</th><th>Points</th><th>Wins</th><th>Fast bingo</th><th>Status</th></tr></thead>
              <tbody>
                {visiblePlayers.map((player) => <tr key={player.rank} className={player.rank === 42 ? "is-player" : ""}><td>{player.rank}</td><td>{player.rank === 42 ? "You" : player.player}</td><td>{player.points}</td><td>{player.wins}</td><td>{player.fast}</td><td><span className={`table-status ${player.status === "Advanced" ? "success" : "warning"}`}>{player.status}</span></td></tr>)}
                {!visiblePlayers.length && <tr><td colSpan={6} className="tourney-empty">No players match your search.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="tourney-table-footer"><span>{scope === "friends" ? `Showing ${visiblePlayers.length} friends` : `Page ${standingsPage} of 11 · 512 players`}</span><div><button disabled={scope === "friends" || standingsPage === 1} onClick={() => setStandingsPage((page) => Math.max(1, page - 1))}>Previous</button>{[1, 2, 3, 11].map((page) => <button key={page} className={standingsPage === page ? "active" : ""} disabled={scope === "friends"} onClick={() => setStandingsPage(page)}>{page}</button>)}<button disabled={scope === "friends" || standingsPage === 11} onClick={() => setStandingsPage((page) => Math.min(11, page + 1))}>Next</button></div></footer>
        </section>

        <aside className="tourney-player-card" aria-label="Your tournament status">
          <div className="tourney-position"><span>My position</span><strong>#42</strong></div>
          <h2>286 <small>points</small></h2>
          <p>164 points behind #128 cut line</p>
          <div className="tourney-status-divider" />
          <span className="tourney-card-label">Next round</span>
          <strong className="tourney-countdown" aria-label={`${countdown} until next round`}>{countdown}</strong>
          <p>Tomorrow · 7:00 PM ET</p>
          <button className="tourney-reminder" role="switch" aria-checked={reminder} onClick={toggleReminder}><span>Remind me</span><i className={reminder ? "on" : ""}><b /></i></button>
          <div className="tourney-prize-breakdown">
            <button aria-expanded={prizesOpen} onClick={() => setPrizesOpen((value) => !value)}><span>Prize pool <b>$25,000 guaranteed</b></span><em>{prizesOpen ? "Hide" : "Show"}</em></button>
            {prizesOpen && <div><span><b>1st</b><em>$7,500</em></span><span><b>2nd</b><em>$4,000</em></span><span><b>3rd</b><em>$2,500</em></span><span><b>4th</b><em>$1,500</em></span><span><b>5th–8th</b><em>$1,000</em></span><button onClick={() => setRulesOpen(true)}>View full prize breakdown</button></div>}
          </div>
        </aside>
      </div>

      {rulesOpen && <div className="tourney-modal-backdrop"><button className="tourney-modal-scrim" aria-label="Close tournament rules" onClick={() => setRulesOpen(false)} /><section className="tourney-rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title"><button className="tourney-modal-close" onClick={() => setRulesOpen(false)}>Close</button><span className="section-kicker">Tournament guide</span><h2 id="rules-title">Weekend Cup rules</h2><p>Score points across five progressive rounds. Your highest valid card result in each game counts toward the stage total.</p><ol><li>Entry includes one card per round. Extra cards are not available.</li><li>The qualification cut is applied after each stage: 512, 128, 16, then 8 players.</li><li>Ties are resolved by wins, fastest bingo, then earliest registration.</li><li>The final champion receives $7,500 from the guaranteed $25,000 pool.</li></ol><button className="primary-button" onClick={() => { setRulesOpen(false); handleEntry(); }}>{registered ? "Open tournament room" : "Enter for $8"}</button></section></div>}
    </div>
  );
}

function PlayerHistory() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  useEffect(() => {
    apiClient.wallet.transactions().then((txs) => {
      if (txs && txs.length > 0) setTransactions(txs);
    }).catch(() => {});
  }, []);

  const defaultRows = [["#2841", "Diamond 75", "Today · 14:32", "3", "$6.00", "+$0.00", "Completed"], ["#2838", "Trueig 90 Classic", "Today · 13:05", "6", "$3.00", "+$125.00", "Won"], ["#2812", "Turbo 30", "Yesterday · 21:48", "2", "$2.00", "+$0.00", "Completed"], ["#2794", "Free Bingo Party", "Yesterday · 19:00", "1", "Free", "+$25.00", "Won"]];

  const rows = transactions.length > 0
    ? transactions.map((t) => [
        `#${t.id.replace(/[^0-9]/g, "").slice(-4) || "2841"}`,
        t.room || "Diamond 75",
        t.time || "Today · 14:32",
        t.type.includes("purchase") ? "3" : "1",
        t.amount < 0 ? `$${Math.abs(t.amount).toFixed(2)}` : "Free",
        t.amount > 0 ? `+$${t.amount.toFixed(2)}` : "+$0.00",
        t.amount > 0 ? "Won" : "Completed",
      ])
    : defaultRows;

  return <div className="simple-player-page"><div className="page-title-block"><span className="section-kicker">ACTIVITY</span><h1>Game history</h1><p>Review every ticket, result and number call from your recent games.</p></div><div className="history-stats"><div><small>GAMES PLAYED</small><strong>{124 + rows.length}</strong><span>+14 this month</span></div><div><small>CARDS PURCHASED</small><strong>{340 + rows.length * 2}</strong><span>2.7 avg / game</span></div><div><small>TOTAL PRIZES</small><strong>$2,840</strong><span>18 winning rounds</span></div></div><div className="standings-card"><div className="table-header"><div><h2>Recent rounds</h2><p>Last 30 days</p></div><button className="outline-button">Export history</button></div><table><thead><tr><th>Game ID</th><th>Room</th><th>Date & time</th><th>Cards</th><th>Entry</th><th>Prize</th><th>Result</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{index === 6 ? <span className={`table-status ${cell === "Won" ? "success" : "neutral"}`}>{cell}</span> : index === 0 ? <button className="table-link">{cell}</button> : cell}</td>)}</tr>)}</tbody></table></div></div>;
}

function PlayerTicketsView({ rooms, enterRoom }: { rooms: BingoRoomData[]; enterRoom: (room: BingoRoomData) => void }) {
  const [tickets, setTickets] = useState<BingoCardModel[]>([]);

  useEffect(() => {
    apiClient.tickets.list().then((list) => {
      if (list && list.length > 0) setTickets(list);
    }).catch(() => {});
  }, []);

  return (
    <div className="simple-player-page">
      <div className="page-title-block">
        <span className="section-kicker">CARD WALLET</span>
        <h1>My tickets</h1>
        <p>Preview purchased cards and rejoin upcoming games.</p>
      </div>
      <div className="ticket-wallet-grid">
        {tickets.length > 0 ? (
          tickets.map((ticket, index) => {
            const room = rooms.find((r) => r.id === ticket.roomId) ?? rooms[0];
            const flatNums = ticket.numbers.flat();
            const flatDaubed = ticket.daubed ? ticket.daubed.flat() : [];
            return (
              <article className="standings-card wallet-ticket" key={ticket.id || index}>
                <div>
                  <span className={`mini-orb accent-${room.accent}`}>{room.variant.match(/\d+/)?.[0] ?? "75"}</span>
                  <span>
                    <b>{room.name}</b>
                    <small>{room.variant} · Ticket {ticket.id}</small>
                  </span>
                  <span className="table-status warning">Active</span>
                </div>
                <div className="wallet-card-preview">
                  {flatNums.map((num, cell) => (
                    <i className={flatDaubed[cell] ? "marked" : ""} key={cell}>
                      {num === 0 ? "★" : num}
                    </i>
                  ))}
                </div>
                <button className="primary-button" onClick={() => enterRoom(room)}>Rejoin room →</button>
              </article>
            );
          })
        ) : (
          rooms.slice(0, 4).map((room, index) => (
            <article className="standings-card wallet-ticket" key={room.id}>
              <div>
                <span className={`mini-orb accent-${room.accent}`}>{room.variant.match(/\d+/)?.[0]}</span>
                <span>
                  <b>{room.name}</b>
                  <small>{room.variant} · Card #0{index + 1}</small>
                </span>
                <span className="table-status warning">Starts {room.startsIn}</span>
              </div>
              <div className="wallet-card-preview">
                {Array.from({ length: room.cardRows && room.cardColumns ? Math.min(25, room.cardRows * room.cardColumns) : 25 }, (_, cell) => (
                  <i className={cell % 6 === 0 ? "marked" : ""} key={cell}>
                    {(cell * 7 + index * 3) % 75 + 1}
                  </i>
                ))}
              </div>
              <button className="primary-button" onClick={() => enterRoom(room)}>Rejoin room →</button>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function PlayerHubPage({ type, rooms, enterRoom, notify }: { type: "tickets" | "jackpots" | "promotions" | "profile"; rooms: BingoRoomData[]; enterRoom: (room: BingoRoomData) => void; notify: (message: string) => void }) {
  const title = type === "tickets" ? "My tickets" : type === "jackpots" ? "Trueigtech Jackpots" : type === "promotions" ? "Promotions" : "Player profile";
  const subtitle = type === "tickets" ? "Preview purchased cards and rejoin upcoming games." : type === "jackpots" ? "Track live progressives and their qualifying rules." : type === "promotions" ? "Claim rewards and use them in eligible Bingo rooms." : "Account, Bingo activity, balances and notification preferences.";
  if (type === "profile") return <div className="simple-player-page"><div className="page-title-block"><span className="section-kicker">TRUEIGTECH PLAYER</span><h1>{title}</h1><p>{subtitle}</p></div><div className="profile-grid"><section className="standings-card profile-summary"><span className="profile-avatar">AR</span><h2>Ari R.</h2><p>Player ID · TRUEIG-11804</p><span className="table-status success">Verified account</span><div><span><small>CURRENT BALANCE</small><b>$248.50</b></span><span><small>BINGO WINS</small><b>18</b></span><span><small>WIN RATE</small><b>14.1%</b></span><span><small>CARDS PLAYED</small><b>346</b></span></div></section><section className="standings-card profile-activity"><div className="table-header"><div><h2>Notification center</h2><p>Live alerts from your favorite rooms</p></div><button className="outline-button">Mark all read</button></div>{[["1 MIN","Your Trueig 90 Classic game starts in 1 minute."],["WIN","You won $250 in Diamond 75!"],["JP","Mega Trueig Jackpot increased to $126,240."],["FREE","Free Bingo starts in 5 minutes."],["CUP","Tournament Round 2 is now open."]].map(item=><div className="profile-notification" key={item[1]}><i>{item[0]}</i><span><b>{item[1]}</b><small>Trueigtech Bingo · just now</small></span><button>Open →</button></div>)}</section></div></div>;
  if (type === "tickets") return <PlayerTicketsView rooms={rooms} enterRoom={enterRoom} />;
  if (type === "jackpots") return <JackpotExperience rooms={rooms} enterRoom={enterRoom} notify={notify} />;
  return <PromotionExperience rooms={rooms} enterRoom={enterRoom} notify={notify} />;
}

type PromotionCategory = "All offers" | "Free cards" | "Ticket deals" | "VIP" | "Tournaments";

const playerPromotions = [
  { code: "FREE75", title: "Free Bingo every hour", shortTitle: "Free card. Real prizes.", description: "Claim one 75-ball card every hour and play Four Corners for the $100 community prize.", roomId: "free-party", category: "Free cards" as PromotionCategory, image: "/promotions/free-bingo-reward.png", accent: "cyan", reward: "1 free card", ends: "Renews hourly", featured: true },
  { code: "VIP", title: "VIP Gold access", shortTitle: "Tonight belongs to Gold.", description: "Unlock the private VIP room, premium cards and tonight’s $20,000 guaranteed prize pool.", roomId: "vip-gold", category: "VIP" as PromotionCategory, image: "/promotions/vip-gold-access.png", accent: "gold", reward: "$20,000 room", ends: "Tonight · 9 PM", featured: true },
  { code: "CUP", title: "Weekend Cup ticket", shortTitle: "Five rounds. One champion.", description: "Complete five eligible games to unlock an $8 tournament entry at no extra cost.", roomId: "tournament", category: "Tournaments" as PromotionCategory, image: "/promotions/weekend-cup.png", accent: "violet", reward: "Free $8 entry", ends: "Ends Sunday", featured: true },
  { code: "BUY3", title: "Buy 3, get 1 free", shortTitle: "More cards. More chances.", description: "Add three Diamond 75 cards to your basket and your fourth qualifying card is free.", roomId: "diamond-75", category: "Ticket deals" as PromotionCategory, image: "/rooms/diamond-75.png", accent: "mint", reward: "4th card free", ends: "3 days left", featured: false },
  { code: "HAPPY", title: "Happy Hour Bingo", shortTitle: "Half-price happy hour.", description: "Enjoy 50% off Trueig 90 Classic tickets between 18:00 and 19:00 every weekday.", roomId: "trueig-90", category: "Ticket deals" as PromotionCategory, image: "/rooms/trueig-90-classic.png", accent: "amber", reward: "50% off", ends: "Starts 18:00", featured: false },
  { code: "CASH", title: "10% Bingo cashback", shortTitle: "Play today. Get some back.", description: "Receive 10% of eligible ticket spend as playable credit after your final game today.", roomId: "turbo-30", category: "Ticket deals" as PromotionCategory, image: "/rooms/turbo-30.png", accent: "coral", reward: "Up to $25", ends: "Resets midnight", featured: false },
];

function PromotionExperience({ rooms, enterRoom, notify }: { rooms: BingoRoomData[]; enterRoom: (room: BingoRoomData) => void; notify: (message: string) => void }) {
  const [claimed, setClaimed] = useState<string[]>([]);
  const [category, setCategory] = useState<PromotionCategory>("All offers");
  const visiblePromotions = category === "All offers" ? playerPromotions : playerPromotions.filter((promotion) => promotion.category === category);
  const featured = playerPromotions.filter((promotion) => promotion.featured);

  function activatePromotion(code: string, roomId: string) {
    if (claimed.includes(code)) {
      const room = rooms.find((item) => item.id === roomId);
      if (room) enterRoom(room);
      else notify("This reward is ready. Its eligible room opens with the next scheduled round.");
      return;
    }
    setClaimed((items) => [...items, code]);
    apiClient.promotions.claim(code.toLowerCase(), "Ari.R");
    notify(`${code} added to your rewards wallet.`);
  }

  return (
    <div className="simple-player-page promotions-experience">
      <header className="promotions-page-header">
        <div><span className="section-kicker">TRUEIGTECH REWARDS</span><h1>More ways to play. More reasons to win.</h1><p>Fresh Bingo rewards, ticket offers and member-only events — all in one place.</p></div>
        <div className="promotions-wallet"><span><Ticket size={18} weight="duotone" /></span><div><small>FEATURED OFFERS</small><strong>3</strong></div><button onClick={() => setCategory("All offers")}>My rewards</button></div>
      </header>

      <section className="promotion-feature-grid" aria-label="Featured promotions">
        <article className="promotion-feature-main">
          {/* Generated campaign artwork is served directly to preserve its intended crop and detail. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={featured[0].image} alt="Aqua Bingo ball, Bingo cards and a gold gift ribbon in a purple celebration lounge" width="1672" height="941" fetchPriority="high" />
          <div className="promotion-banner-shade" />
          <div className="promotion-feature-copy"><span className="promotion-live-badge"><Lightning size={13} weight="fill" />Available now</span><small>{featured[0].code} · {featured[0].ends}</small><h2>{featured[0].shortTitle}</h2><p>{featured[0].description}</p><div><button className={claimed.includes(featured[0].code) ? "claimed" : ""} onClick={() => activatePromotion(featured[0].code, featured[0].roomId)}>{claimed.includes(featured[0].code) ? "Play with reward" : "Claim free card"} <ArrowRight size={16} weight="bold" /></button><span><CheckCircle size={15} weight="fill" />No deposit required</span></div></div>
        </article>

        <div className="promotion-feature-stack">
          {featured.slice(1).map((promotion) => <article className={`promotion-feature-small accent-${promotion.accent}`} key={promotion.code}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={promotion.image} alt={`${promotion.title} Bingo campaign artwork`} width="1672" height="941" loading="eager" />
            <div className="promotion-banner-shade" />
            <div><span>{promotion.code} · {promotion.ends}</span><h2>{promotion.shortTitle}</h2><p>{promotion.reward}</p><button className={claimed.includes(promotion.code) ? "claimed" : ""} onClick={() => activatePromotion(promotion.code, promotion.roomId)}>{claimed.includes(promotion.code) ? "Use reward" : "Unlock offer"} <ArrowRight size={14} weight="bold" /></button></div>
          </article>)}
        </div>
      </section>

      <section className="promotions-offers" aria-labelledby="offers-title">
        <div className="promotions-offers-head"><div><h2 id="offers-title">Offers picked for you</h2><p>Claim an offer now, then use it in any eligible Bingo round.</p></div><div className="promotion-category-tabs" aria-label="Filter promotions">{(["All offers", "Free cards", "Ticket deals", "VIP", "Tournaments"] as PromotionCategory[]).map((item) => <button key={item} className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
        <div className="promotion-offer-grid">
          {visiblePromotions.map((promotion) => <article className={`promotion-offer-card accent-${promotion.accent}`} key={promotion.code}>
            <div className="promotion-offer-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={promotion.image} alt="" width="960" height="540" loading="lazy" />
              <span>{promotion.code}</span><small><Clock size={12} weight="bold" />{promotion.ends}</small>
            </div>
            <div className="promotion-offer-body"><span className="promotion-reward-label"><Star size={13} weight="fill" />{promotion.reward}</span><h3>{promotion.title}</h3><p>{promotion.description}</p><div><span><CheckCircle size={14} weight="fill" />Eligible reward</span><button className={claimed.includes(promotion.code) ? "claimed" : ""} onClick={() => activatePromotion(promotion.code, promotion.roomId)}>{claimed.includes(promotion.code) ? "Use now" : "Claim"} <ArrowRight size={14} weight="bold" /></button></div></div>
          </article>)}
        </div>
        {!visiblePromotions.length && <div className="promotion-empty"><Trophy size={28} weight="duotone" /><h3>No offers in this category yet</h3><p>Fresh rewards are added throughout the week.</p></div>}
      </section>
    </div>
  );
}

const jackpotTiers = [
  { key: "mega", name: "Mega Trueig Jackpot", amount: 125480, reset: 50000, contribution: 2.5, price: 5, players: 127, variant: "75-Ball", pattern: "Full House in 42 balls", difficulty: "Legendary", reward: "Life-changing", icon: Diamond },
  { key: "major", name: "Major Trueig Jackpot", amount: 24375, reset: 25000, contribution: 2, price: 2, players: 98, variant: "90-Ball", pattern: "Coverall in 50 balls", difficulty: "Hard", reward: "Huge", icon: Star },
  { key: "minor", name: "Minor Trueig Jackpot", amount: 6250, reset: 10000, contribution: 1.5, price: 1, players: 63, variant: "75-Ball", pattern: "4 Corners in 20 balls", difficulty: "Medium", reward: "Great", icon: Diamond },
  { key: "mini", name: "Mini Trueig Jackpot", amount: 1540, reset: 5000, contribution: 1, price: .5, players: 42, variant: "75-Ball", pattern: "Any Line in 15 balls", difficulty: "Easy", reward: "Nice", icon: Club },
];

function JackpotExperience({ rooms, enterRoom, notify }: { rooms: BingoRoomData[]; enterRoom: (room: BingoRoomData) => void; notify: (message: string) => void }) {
  const [selectedTier, setSelectedTier] = useState(0);
  const [liveBump, setLiveBump] = useState(0);
  const [reminder, setReminder] = useState(true);
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const active = jackpotTiers[selectedTier];
  const ActiveIcon = active.icon;
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
        <div><h1>Trueigtech Jackpots</h1><span className="jackpot-live"><i />Progressive active</span><span className="jackpot-updated">Live update · just now</span></div>
      </header>

      <section className="jackpot-feature" aria-labelledby="jackpot-feature-title">
        <div className="jackpot-feature-main">
          <span className="jackpot-growth"><Lightning size={15} weight="fill" />Live +${42 + liveBump}</span>
          <h2 id="jackpot-feature-title">{active.name}</h2>
          <strong aria-live="polite">{money(active.amount + liveBump)}</strong>
          <p>Rising with every ticket. Win with <b>{active.pattern}</b>.</p>
          <button className="jackpot-play-button" onClick={() => play()}>Play for {money(active.price)} <ArrowRight size={17} weight="bold" /></button>
          <small>Minimum 1 ticket</small>
        </div>

        <div className="jackpot-qualify">
          <h3>Your path to qualify</h3>
          <ol>
            <li><span>1</span><div><House size={18} weight="duotone" /><p><b>Choose an eligible {active.variant} room</b><small>Look for rooms marked “Contributing”.</small></p></div></li>
            <li><span>2</span><div><Ticket size={18} weight="duotone" /><p><b>Buy a qualifying ticket</b><small>Each purchased ticket boosts this jackpot.</small></p></div></li>
            <li><span>3</span><div><CheckCircle size={18} weight="duotone" /><p><b>Complete the pattern</b><small>Win with {active.pattern.toLowerCase()}.</small></p></div></li>
          </ol>
          <button className="jackpot-text-button" onClick={() => setRulesOpen(true)}>View full rules & eligibility <ArrowRight size={14} /></button>
        </div>

        <aside className="jackpot-pulse">
          <h3><Pulse size={20} />Jackpot pulse</h3>
          <dl>
            <div><dt><Clock size={16} />Reset amount</dt><dd>{money(active.reset)}</dd></div>
            <div><dt><Ticket size={16} />Contribution per ticket</dt><dd>+{active.contribution}%<small>of ticket price</small></dd></div>
            <div><dt><UsersThree size={16} />Active contributors</dt><dd>{active.players}<small>players</small></dd></div>
            <div><dt><Clock size={16} />Next qualifying game</dt><dd>Today<small>11:59 PM</small></dd></div>
          </dl>
          <button className="jackpot-reminder" role="switch" aria-checked={reminder} onClick={toggleReminder}><span><Bell size={16} />Player reminder</span><i className={reminder ? "on" : ""}><b /></i></button>
          <button className="jackpot-text-button" onClick={() => setRulesOpen(true)}>View full eligibility rules <ArrowRight size={14} /></button>
        </aside>
      </section>

      <section className="jackpot-ladder" aria-labelledby="jackpot-ladder-title">
        <div className="jackpot-section-title"><h2 id="jackpot-ladder-title"><ChartLineUp size={20} />Jackpot ladder</h2><p>Four jackpots. Four rewards. One thrilling chase.</p></div>
        <div className="jackpot-tier-grid">
          {jackpotTiers.map((tier, index) => {
            const TierIcon = tier.icon;
            return <button key={tier.key} className={`jackpot-tier-card tier-${tier.key} ${selectedTier === index ? "selected" : ""}`} onClick={() => { setSelectedTier(index); setLiveBump(0); }} aria-pressed={selectedTier === index}><span className="jackpot-tier-icon"><TierIcon size={27} weight="duotone" /></span><span className="jackpot-tier-copy"><b>{tier.name}</b><strong>{money(tier.amount)}</strong></span><span className="jackpot-tier-live"><i />Live</span><span className="jackpot-tier-meta"><small>Difficulty<b>{tier.difficulty}</b></small><small>Reward<b>{tier.reward}</b></small></span><em>{tier.variant} · {tier.pattern} · +{tier.contribution}% per ticket</em></button>;
          })}
        </div>
      </section>

      <section className="jackpot-rooms" aria-labelledby="jackpot-rooms-title">
        <div className="jackpot-section-title"><h2 id="jackpot-rooms-title"><Pulse size={20} />Games contributing now</h2><p>Join these {active.variant} rooms to contribute to the {active.name}.</p><button onClick={() => { setLiveBump((value) => value + 7); notify("Jackpot room data refreshed."); }}>Refresh</button></div>
        <div className="jackpot-room-table"><table><thead><tr><th>Room</th><th>Ticket price</th><th>Players</th><th>Jackpot contribution</th><th>Game type</th><th>Next game</th><th>Join</th></tr></thead><tbody>{visibleRooms.map((room, index) => <tr key={`${room.id}-${index}`}><td><span className="jackpot-room-ball">{room.variant.match(/\d+/)?.[0] ?? "75"}</span><span><b>{room.name}</b><small>Contributing</small></span></td><td>{money(room.ticketPrice || active.price)}</td><td><UsersThree size={15} />{room.players}</td><td><b>+{active.contribution}%</b><small>({money((room.ticketPrice || active.price) * active.contribution / 100)} per ticket)</small></td><td>{active.pattern}</td><td>{["11:59 PM", "12:14 AM", "12:29 AM", "12:44 AM"][index % 4]}</td><td><button onClick={() => play(room)}>Join room</button></td></tr>)}</tbody></table></div>
        <button className="jackpot-show-rooms" onClick={() => setShowAllRooms((value) => !value)}>{showAllRooms ? "Show fewer rooms" : "View all contributing rooms"} <ArrowRight size={14} /></button>
      </section>

      <aside className="jackpot-winner-strip">
        <Trophy size={24} weight="fill" />
        <span className="jackpot-winner-label">Recent winner</span>
        {/* Small supplied avatar artwork; preserving its exact pixels avoids a needless transform. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/jackpots/winner-owl.png" alt="LuckyLyn88 winner avatar" />
        <span><b>LuckyLyn88</b><small>{active.name}</small></span>
        <strong>$104,250</strong>
        <span><small>Room</small><b>{active.variant} · Full House ≤ 42 balls</b></span>
        <span><small>Pattern</small><b>Full House in 38 balls</b></span>
        <span><small>Won on</small><b>August 22, 2026 · 9:17 PM</b></span>
      </aside>

      {rulesOpen && <div className="jackpot-modal-backdrop"><button className="jackpot-modal-scrim" aria-label="Close jackpot rules" onClick={() => setRulesOpen(false)} /><section className="jackpot-rules-modal" role="dialog" aria-modal="true" aria-labelledby="jackpot-rules-title"><button className="jackpot-modal-close" onClick={() => setRulesOpen(false)} aria-label="Close jackpot rules"><X size={18} /></button><ActiveIcon size={32} weight="duotone" /><span className="section-kicker">Progressive guide</span><h2 id="jackpot-rules-title">How {active.name} works</h2><p>Every eligible ticket contributes {active.contribution}% of its price to the live jackpot. The prize resets to {money(active.reset)} after a verified win.</p><ol><li>Join an eligible {active.variant} room marked “Contributing”.</li><li>Buy at least one ticket before sales close.</li><li>Complete {active.pattern.toLowerCase()} with called balls only.</li><li>Qualified claims are validated automatically and paid to your wallet.</li></ol><button className="primary-button" onClick={() => { setRulesOpen(false); play(); }}>Play for {money(active.price)}</button></section></div>}
    </div>
  );
}

const adminNav = [
  ["dashboard", "Dashboard", "⌂"], ["rooms", "Bingo rooms", "▦"], ["rtp", "RTP & Margins", "%"], ["gamebuilder", "Games", "◫"], ["scheduler", "Scheduler", "□"], ["games", "Live control", "●"], ["variants", "Bingo variants", "⬡"],  ["patterns", "Winning patterns", "◇"], ["jackpots", "Jackpots", "✦"], ["tournaments", "Tournaments", "♜"], ["players", "Players", "♙"], ["transactions", "Transactions", "⇄"], ["promotions", "Promotions", "★"], ["chat", "Chat moderation", "◌"],
];

type AdminAction = { kind: string; room?: BingoRoomData; label?: string };

function AdminExperience({ rooms, setRooms, notify }: { rooms: BingoRoomData[]; setRooms: (rooms: BingoRoomData[]) => void; notify: (message: string) => void }) {
  const [module, setModule] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [action, setAction] = useState<AdminAction | null>(null);
  const currentLabel = adminNav.find(([key]) => key === module)?.[1] ?? "Overview";
  const primaryActions: Record<string, [string, string]> = { rooms: ["+ Create room", "create-room"], rtp: ["Apply Global RTP", "apply-global-rtp"], gamebuilder: ["+ Create game", "create-game"], scheduler: ["+ Schedule game", "create-game"], variants: ["+ Create variant", "variants"], caller: ["Configure caller", "caller-config"], jackpots: ["+ Create jackpot", "create-jackpot"], tournaments: ["+ Create tournament", "create-tournament"], players: ["Open player profile", "player"], promotions: ["+ Create promotion", "promotion"], chat: ["+ Announcement", "announcement"], reports: ["Build report", "report"], settings: ["Configure platform", "settings"] };
  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-logo"><Logo dark /><button onClick={() => setSidebarOpen(false)}>×</button></div>
        <nav>{adminNav.map(([key, label, glyph]) => <button key={key} className={module === key ? "active" : ""} onClick={() => { setModule(key); setSidebarOpen(false); }}><Icon>{glyph}</Icon><span>{label}</span>{key === "games" && <i className="nav-badge">3</i>}{key === "chat" && <i className="nav-badge muted">12</i>}</button>)}</nav>
        <div className="sidebar-user"><span>JD</span><div><b>John Dawson</b><small>Super Admin</small></div><button>•••</button></div>
      </aside>
      <section className="admin-main">
        <header className="admin-header"><div><button className="mobile-menu" onClick={() => setSidebarOpen(true)}>☰</button><span>Trueigtech Operations /</span><b>{currentLabel}</b></div></header>
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
    dashboard: "Live platform health, player activity and commercial performance.", rooms: "Create and configure every player-facing Bingo room.", rtp: "Manage return-to-player percentages, target winning rates and house margins globally or per room.", gamebuilder: "Create, schedule and start games with multiple winning stages.", games: "Monitor active rounds and intervene in real time.", scheduler: "Plan one-off, recurring and tournament game sessions.", patterns: "Build and validate reusable winning patterns.", jackpots: "Control contributions, qualification rules and liability.", reports: "Explore validated performance across rooms and game types.", players: "Review player activity, value and account status.", transactions: "Trace every ticket, payout, refund and promotional credit.", variants: "Configure extensible Bingo engines and card layouts.",
  };
  return subtitles[module] ?? `Configure ${adminNav.find(([key]) => key === module)?.[1].toLowerCase()} across the platform.`;
}

function AdminModule({ module, rooms, setRooms, notify, openAction }: { module: string; rooms: BingoRoomData[]; setRooms: (rooms: BingoRoomData[]) => void; notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  if (module === "dashboard") return <AdminDashboard openAction={openAction} />;
  if (module === "rooms") return <RoomManagement rooms={rooms} setRooms={setRooms} openAction={openAction} notify={notify} />;
  if (module === "rtp") return <RTPManagement rooms={rooms} setRooms={setRooms} notify={notify} openAction={openAction} />;
  if (module === "gamebuilder") return <GameManagement rooms={rooms} openAction={openAction} notify={notify} />;
  if (module === "games") return <LiveControl notify={notify} openAction={openAction} />;
  if (module === "scheduler") return <Scheduler notify={notify} />;
  if (module === "patterns") return <PatternBuilder notify={notify} />;
  if (module === "jackpots") return <JackpotManagement notify={notify} openAction={openAction} />;
  if (module === "variants") return <VariantManagement openAction={openAction} />;
  if (module === "players") return <PlayersTable openAction={openAction} />;
  if (module === "transactions") return <TransactionsTable />;
  if (module === "reports") return <ReportsPanel />;
  if (module === "tournaments") return <TournamentAdmin notify={notify} openAction={openAction} />;
  if (module === "promotions") return <PromotionManagement notify={notify} openAction={openAction} />;
  if (module === "chat") return <ChatModeration notify={notify} openAction={openAction} />;
  return <GenericAdminPanel module={module} notify={notify} openAction={openAction} />;
}

function AdminDashboard({ openAction }: { openAction: (action: AdminAction) => void }) {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    apiClient.admin.dashboard().then((res) => {
      if (res?.success) setDashboardData(res);
    });
  }, []);

  const metrics = dashboardData?.metrics
    ? dashboardData.metrics.map((m) => [m.label, m.value, m.change, m.icon, m.description])
    : [
        ["ACTIVE ROOMS", "18", "+2", "▦", "Rooms currently open, selling tickets or calling a live game."],
        ["ONLINE PLAYERS", "2,847", "+12.4%", "♙", "Unique players connected to the platform within the last five minutes."],
        ["TICKET REVENUE", "$48,620", "+8.2%", "$", "Gross ticket sales collected today before prizes, credits and jackpot contributions."],
        ["PRIZE PAYOUT", "$31,840", "65.5%", "◇", "Prizes paid or committed today. The percentage compares payouts with ticket revenue."],
        ["JACKPOT LIABILITY", "$142,280", "+$842", "✦", "Total prize value reserved across every active progressive jackpot."],
        ["GGR TODAY", "$16,780", "+11.6%", "↗", "Gross gaming revenue after prizes, bonuses and jackpot contributions are deducted."],
      ];

  const liveOps = dashboardData?.liveOps
    ? dashboardData.liveOps.map((g) => [g.name, g.ball, g.players, g.progress, g.prize])
    : [["Diamond 75", "B-12", "286", "28/75", "$2,000"], ["Turbo 30", "24", "84", "11/30", "$300"], ["Quick 80", "52", "136", "42/80", "$750"]];

  const topRooms = dashboardData?.topRooms
    ? dashboardData.topRooms.map((r) => [r.name, r.games, r.tickets, r.revenue, r.ggr, r.trend])
    : [["Mega Trueig Jackpot", "22", "8,420", "$42,100", "$12,840", "+18%"], ["Diamond 75", "34", "6,812", "$13,624", "$4,218", "+9%"], ["Trueig 90 Classic", "48", "18,240", "$9,120", "$2,680", "+12%"], ["Turbo 30", "96", "8,450", "$8,450", "$2,210", "−3%"]];

  const activityFeed = dashboardData?.activityFeed
    ? dashboardData.activityFeed.map((f) => [f.type, f.title, f.detail, f.time])
    : [["claim", "Bingo claim validated", "Diamond 75 · Card #284201", "14:32"], ["jackpot", "Jackpot contribution", "+$42.10 · Mega Trueig Jackpot", "14:31"], ["player", "High-value player joined", "TrueigQueen · VIP Gold Room", "14:29"], ["alert", "Claim rejected", "Turbo 30 · Invalid pattern", "14:26"]];

  return <>
    <div className="metric-grid">{metrics.map((metric, index: number) => <article className="metric-card" key={metric[0]}><button className="metric-card-main" onClick={() => openAction({kind:"report-drilldown",label:metric[0]})} aria-label={`View ${metric[0].toLowerCase()} breakdown`}><span className={`metric-icon metric-${index}`}><Icon>{metric[3]}</Icon></span><div><small>{metric[0]}</small><strong>{metric[1]}</strong><span className={index === 3 ? "neutral-change" : ""}>{metric[2]} <i>{index === 3 ? "payout ratio" : "view breakdown →"}</i></span></div></button><DashboardInfo label={metric[0]} description={metric[4]} /></article>)}</div>
    <div className="dashboard-grid">
      <section className="admin-card revenue-chart"><div className="card-title"><div><div className="dashboard-section-heading"><h2>Revenue & payouts</h2><DashboardInfo label="Revenue and payouts" description="Compares gross ticket sales with prizes awarded so you can spot margin movement and unusual payout pressure." /></div><p>Last 7 days · Daily ticket sales compared with awarded prizes · USD</p></div><select aria-label="Revenue chart date range"><option>7 days</option><option>30 days</option></select></div><div className="chart-legend"><span><i className="legend-violet" />Revenue <b>$286.4k</b></span><span><i className="legend-mint" />Payouts <b>$184.2k</b></span></div><div className="line-chart"><div className="chart-y"><span>$60k</span><span>$45k</span><span>$30k</span><span>$15k</span><span>$0</span></div><div className="chart-canvas"><div className="grid-lines"><i /><i /><i /><i /><i /></div><div className="dual-bars" aria-label="Revenue and payout trend">{[[44,30],[58,38],[52,35],[76,48],[66,43],[88,58],[96,61]].map((pair,index)=><div key={index}><i className="revenue-bar" style={{height:`${pair[0]}%`}} /><i className="payout-bar" style={{height:`${pair[1]}%`}} /></div>)}</div><div className="chart-x"><span>Fri 15</span><span>Sat 16</span><span>Sun 17</span><span>Mon 18</span><span>Tue 19</span><span>Wed 20</span><span>Today</span></div></div></div></section>
      <section className="admin-card live-ops"><div className="card-title"><div><div className="dashboard-section-heading"><h2>Live operations</h2><DashboardInfo label="Live operations" description="Shows every game currently calling, its ball progress, active player count and prize exposure." /></div><p>3 games currently calling · Monitor progress, players and prize exposure</p></div><button onClick={() => openAction({kind:"live-control"})}>Open control center →</button></div>{liveOps.map((game, index: number) => <div className="live-game-row" key={game[0]}><span className={`live-game-orb orb-${index}`}>{game[1]}</span><div><b>{game[0]}</b><small><i /> LIVE · {game[3]} called</small></div><span><small>PLAYERS</small><b>{game[2]}</b></span><span><small>PRIZE</small><b>{game[4]}</b></span><button onClick={() => openAction({kind:"live-control",label:game[0]})}>Manage</button></div>)}</section>
      <section className="admin-card room-performance"><div className="card-title"><div><div className="dashboard-section-heading"><h2>Top rooms</h2><DashboardInfo label="Top rooms" description="Ranks player rooms by today's ticket revenue and pairs volume with gross gaming revenue and trend." /></div><p>Today’s highest-performing rooms · Revenue, ticket volume and GGR trend</p></div><button onClick={() => openAction({kind:"report-drilldown",label:"Room performance"})}>View report →</button></div><table><thead><tr><th>Room</th><th>Games</th><th>Tickets</th><th>Revenue</th><th>GGR</th><th>Trend</th></tr></thead><tbody>{topRooms.map((row) => <tr key={row[0]}>{row.map((cell, index: number) => <td key={index}>{index === 0 ? <b>{cell}</b> : index === 5 ? <span className={String(cell).startsWith("−") ? "negative" : "positive"}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></section>
      <section className="admin-card activity-feed"><div className="card-title"><div><div className="dashboard-section-heading"><h2>Operational feed</h2><DashboardInfo label="Operational feed" description="A live audit stream of validated claims, jackpot movements, player activity and exceptions needing attention." /></div><p>Newest platform events · Claims, jackpot activity and operational alerts</p></div><button aria-label="Open operational feed options">•••</button></div>{activityFeed.map((event) => <div className="feed-row" key={event[2]}><span className={`feed-icon ${event[0]}`}>{event[0] === "claim" ? "✓" : event[0] === "jackpot" ? "✦" : event[0] === "player" ? "+" : "!"}</span><div><b>{event[1]}</b><small>{event[2]}</small></div><time>{event[3]}</time></div>)}</section>
    </div>
  </>;
}

function DashboardInfo({ label, description }: { label: string; description: string }) {
  return <details className="dashboard-info"><summary aria-label={`About ${label.toLowerCase()}`}><Info size={15} weight="bold" aria-hidden="true" /></summary><div className="dashboard-info-content" role="note"><b>{label}</b><p>{description}</p></div></details>;
}

function RoomManagement({ rooms, setRooms, openAction, notify }: { rooms: BingoRoomData[]; setRooms: (rooms: BingoRoomData[]) => void; openAction: (action: AdminAction) => void; notify: (message: string) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [price, setPrice] = useState(0);
  const savePrice = (id: string) => { apiClient.rooms.update(id, { ticketPrice: price }); setRooms(rooms.map((room) => room.id === id ? { ...room, ticketPrice: price } : room)); setEditing(null); notify("Ticket pricing updated and audit log created."); };
  return <div className="admin-card data-card"><div className="data-toolbar"><div className="search-box compact"><Icon>⌕</Icon><input placeholder="Search rooms" aria-label="Search rooms" /></div><div><select><option>All variants</option><option>75-Ball</option><option>90-Ball</option><option>80-Ball</option><option>30-Ball</option></select><select><option>All statuses</option><option>Live</option><option>Open</option></select><button>☷ Columns</button></div></div><div className="responsive-table"><table><thead><tr><th>Room</th><th>Status</th><th>Variant</th><th>Ticket</th><th>Players</th><th>Target RTP</th><th>Prize / Jackpot</th><th>Winning stages</th><th>Actions</th></tr></thead><tbody>{rooms.map((room) => <tr key={room.id}><td><div className="table-room"><span className={`mini-orb accent-${room.accent}`}>{room.variant.match(/\d+/)?.[0] ?? "T"}</span><div><b>{room.name}</b><small>{room.id.toUpperCase()}</small></div></div></td><td><StatusPill status={room.status} /></td><td>{room.variant}</td><td>{editing === room.id ? <span className="inline-edit"><input type="number" value={price} min="0" step="0.5" onChange={(event) => setPrice(Number(event.target.value))} /><button onClick={() => savePrice(room.id)}>✓</button></span> : <button className="table-link" onClick={() => { setEditing(room.id); setPrice(room.ticketPrice); }}>{room.ticketPrice ? money(room.ticketPrice) : "Free"} ✎</button>}</td><td>{room.players} / {room.maxPlayers}</td><td><span className="speed-label">{room.rtp ?? 78}% · {room.rtpMode === "dynamic" ? "Dynamic" : "Fixed"}</span></td><td><b>{money(room.jackpot ?? room.prize)}</b></td><td><span className="speed-label">{room.winningStages?.length ?? 1} · {room.winningStages?.map(stage=>stage.name).join(" → ") ?? room.pattern}</span></td><td><div className="table-actions"><button onClick={() => { apiClient.rooms.duplicate(room.id); setRooms([...rooms, { ...room, id: `${room.id}-copy`, name: `${room.name} Copy`, status: "Open" }]); notify(`${room.name} duplicated.`); }}>Duplicate</button><button onClick={() => openAction({kind:"edit-room",room})}>Edit</button><button onClick={() => openAction({kind:"edit-room",room})}>Configure</button></div></td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing {rooms.length} playable rooms</span><button className="admin-primary" onClick={() => openAction({kind:"create-room"})}>+ Create another room</button></div></div>;
}

function RTPManagement({ rooms, setRooms, notify, openAction }: { rooms: BingoRoomData[]; setRooms: (rooms: BingoRoomData[]) => void; notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  const [globalTargetRtp, setGlobalTargetRtp] = useState(80);
  const [filter, setFilter] = useState<"all" | "dynamic" | "fixed" | "custom">("all");
  const [search, setSearch] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const dynamicCount = rooms.filter(r => r.rtpMode === "dynamic").length;
  const fixedCount = rooms.filter(r => r.rtpMode === "fixed").length;
  const customCount = rooms.filter(r => r.customRtp).length;

  const avgTargetRtp = Math.round((rooms.reduce((sum, r) => sum + (r.rtp ?? globalTargetRtp), 0) / Math.max(1, rooms.length)) * 10) / 10;
  const houseMargin = RTPEngine.calculateHouseMargin(globalTargetRtp, 2.5);

  const applyGlobalRtp = (newRtp: number) => {
    setGlobalTargetRtp(newRtp);
    const updated = rooms.map(room => {
      const updatedPrize = room.rtpMode === "dynamic"
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
    const target = rooms.find(r => r.id === roomId);
    if (!target) return;
    const current = target.rtp ?? globalTargetRtp;
    const nextRtp = Math.max(65, Math.min(95, current + delta));
    if (nextRtp === current) return;

    const updated = rooms.map(room => {
      if (room.id !== roomId) return room;
      const isCustom = nextRtp !== globalTargetRtp;
      const updatedPrize = room.rtpMode === "dynamic"
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
    const targetRoom = rooms.find(r => r.id === roomId);
    if (!targetRoom) return;
    const nextMode: RtpMode = targetRoom.rtpMode === "dynamic" ? "fixed" : "dynamic";
    const targetRtp = targetRoom.rtp ?? globalTargetRtp;
    const updatedPrize = nextMode === "dynamic"
      ? RTPEngine.calculateDynamicPrize(targetRoom.cardsSold, targetRoom.ticketPrice, targetRtp, targetRoom.jackpot ? 2.5 : 0)
      : targetRoom.prize;
    const updated = rooms.map(room => room.id === roomId ? {
      ...room,
      rtpMode: nextMode,
      prize: updatedPrize > 0 ? Math.round(updatedPrize) : room.prize,
    } : room);
    setRooms(updated);
    notify(`${targetRoom.name} switched to ${nextMode === "dynamic" ? "Dynamic Pool (Auto-scaled)" : "Guaranteed Fixed"} mode.`);
  };

  const resetToGlobal = (roomId: string) => {
    const updated = rooms.map(room => {
      if (room.id !== roomId) return room;
      const updatedPrize = room.rtpMode === "dynamic"
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
    notify(`Reset ${rooms.find(r => r.id === roomId)?.name} to global target (${globalTargetRtp}%).`);
  };

  const recalcRoom = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const targetRtp = room.rtp ?? globalTargetRtp;
    const updatedPrize = RTPEngine.calculateDynamicPrize(room.cardsSold, room.ticketPrice, targetRtp, room.jackpot ? 2.5 : 0);
    const prize = updatedPrize > 0 ? Math.round(updatedPrize) : room.prize;
    setRooms(rooms.map(r => r.id === roomId ? { ...r, prize } : r));
    notify(`Prize pool refreshed for ${room.name} (${money(prize)}).`);
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = `${room.name} ${room.variant}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all"
      || (filter === "dynamic" && room.rtpMode === "dynamic")
      || (filter === "fixed" && room.rtpMode === "fixed")
      || (filter === "custom" && room.customRtp);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="rtp-management-page">
      {/* Operator Guide Toggle Banner */}
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
              <b>House Margin (GGR Hold %)</b>
              <p>The net casino gross profit. At <b>17.5% margin</b>, the house retains <b>$17.50</b> of every $100 ticket sales after prizes and jackpot reserve.</p>
            </div>
          </div>
          <div className="rtp-explainer-card">
            <span className="explainer-icon">🛡️</span>
            <div>
              <b>Dynamic vs Guaranteed</b>
              <p><b>Dynamic Pool:</b> Prize auto-scales to ticket sales (zero operator liability). <b>Guaranteed:</b> Fixed jackpot pot to attract players.</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-card-main">
            <span className="metric-icon metric-0"><Icon>%</Icon></span>
            <div>
              <small>NETWORK TARGET RTP</small>
              <strong>{avgTargetRtp}%</strong>
              <span className="positive">Player payout baseline</span>
            </div>
          </div>
          <DashboardInfo label="Target RTP" description="Average percentage of ticket wagers allocated to player prize pools across all rooms." />
        </article>
        <article className="metric-card">
          <div className="metric-card-main">
            <span className="metric-icon metric-2"><Icon>$</Icon></span>
            <div>
              <small>OPERATOR HOUSE MARGIN</small>
              <strong>{houseMargin}%</strong>
              <span className="positive">Net casino profit hold</span>
            </div>
          </div>
          <DashboardInfo label="House Margin" description="Gross gaming revenue retained by the operator after prizes and jackpot contributions." />
        </article>
        <article className="metric-card">
          <div className="metric-card-main">
            <span className="metric-icon metric-1"><Icon>✦</Icon></span>
            <div>
              <small>JACKPOT CONTRIBUTION</small>
              <strong>2.5%</strong>
              <span className="positive">Progressive prize fund</span>
            </div>
          </div>
          <DashboardInfo label="Jackpot Reserve" description="Percentage of ticket wagers set aside to fund progressive mega jackpots." />
        </article>
        <article className="metric-card">
          <div className="metric-card-main">
            <span className="metric-icon metric-3"><Icon>▦</Icon></span>
            <div>
              <small>ROOMS & PROTECTION</small>
              <strong>{rooms.length} Rooms</strong>
              <span className="positive">{dynamicCount} Dynamic (Zero Risk)</span>
            </div>
          </div>
          <DashboardInfo label="Risk Profile" description="Dynamic rooms guarantee house margin by scaling prizes directly from ticket sales." />
        </article>
      </div>

      {/* Global Bulk Controller */}
      <section className="admin-card rtp-global-controller">
        <div className="card-title rtp-card-header">
          <div>
            <h2>Global RTP &amp; Margin Policy</h2>
            <p>Set platform-wide player return and operator house profit. Changes apply immediately across all active rooms.</p>
          </div>
          <div className="rtp-header-badges">
            <span className="global-rtp-badge">{globalTargetRtp}% Target RTP</span>
            <span className="global-margin-badge">{houseMargin.toFixed(1)}% House Hold</span>
          </div>
        </div>

        {/* Visual 100% Breakdown Bar */}
        <div className="rtp-distribution-box">
          <div className="rtp-dist-header">
            <span className="dist-title">Ticket Revenue Breakdown (Per $100 Wagers)</span>
            <span className="dist-equation">
              <b>${globalTargetRtp}.00</b> Prizes + <b>${houseMargin.toFixed(1)}</b> Profit + <b>$2.50</b> Jackpot = <b>$100.00 Total</b>
            </span>
          </div>
          <div className="rtp-dist-bar-track" aria-label="Payout distribution track">
            <div className="bar-rtp" style={{ width: `${globalTargetRtp}%` }} title={`Player Return: ${globalTargetRtp}%`} />
            <div className="bar-margin" style={{ width: `${houseMargin}%` }} title={`House Margin: ${houseMargin}%`} />
            <div className="bar-jackpot" style={{ width: "2.5%" }} title="Jackpot Reserve: 2.5%" />
          </div>
          <div className="rtp-dist-legend">
            <div className="legend-chip legend-rtp">
              <i className="chip-dot" />
              <span className="chip-label">Player Prize Return:</span>
              <b className="chip-val">{globalTargetRtp}% (${globalTargetRtp}.00)</b>
            </div>
            <div className="legend-chip legend-margin">
              <i className="chip-dot" />
              <span className="chip-label">Operator Gross Profit:</span>
              <b className="chip-val">{houseMargin.toFixed(1)}% (${houseMargin.toFixed(1)})</b>
            </div>
            <div className="legend-chip legend-jackpot">
              <i className="chip-dot" />
              <span className="chip-label">Progressive Jackpot:</span>
              <b className="chip-val">2.5% ($2.50)</b>
            </div>
          </div>
        </div>

        {/* Controls and Presets */}
        <div className="rtp-global-body">
          <div className="rtp-slider-col">
            <div className="rtp-control-header">
              <div>
                <span className="control-label">TARGET RETURN TO PLAYER (RTP)</span>
                <span className="control-desc">Fine-tune the percentage paid back to winning players</span>
              </div>
              <div className="rtp-stepper-box">
                <button
                  type="button"
                  className="stepper-action-btn"
                  onClick={() => setGlobalTargetRtp(Math.max(65, globalTargetRtp - 1))}
                  aria-label="Decrease target RTP"
                >
                  −
                </button>
                <span className="stepper-number">{globalTargetRtp}%</span>
                <button
                  type="button"
                  className="stepper-action-btn"
                  onClick={() => setGlobalTargetRtp(Math.min(92, globalTargetRtp + 1))}
                  aria-label="Increase target RTP"
                >
                  +
                </button>
              </div>
            </div>

            <div className="rtp-slider-container">
              <input
                type="range"
                min="65"
                max="92"
                step="1"
                value={globalTargetRtp}
                onChange={(e) => setGlobalTargetRtp(Number(e.target.value))}
                className="rtp-range-slider"
                aria-label="Global Target RTP Slider"
              />
              <div className="slider-track-labels">
                <span>65% (Max House Margin)</span>
                <span>78% (Industry Average)</span>
                <span>92% (High Player Retention)</span>
              </div>
            </div>

            <div className="rtp-presets-container">
              <span className="presets-title">Recommended Strategies</span>
              <div className="rtp-presets-grid">
                {[
                  { val: 75, name: "Conservative", desc: "22.5% House Profit · High Margin" },
                  { val: 80, name: "Balanced", desc: "17.5% House Profit · Recommended" },
                  { val: 85, name: "Player Friendly", desc: "12.5% House Profit · Higher Retention" },
                  { val: 90, name: "Promotional", desc: "7.5% House Profit · High Payout Volume" },
                ].map((preset) => (
                  <button
                    type="button"
                    key={preset.val}
                    className={`preset-tile ${globalTargetRtp === preset.val ? "selected" : ""}`}
                    onClick={() => setGlobalTargetRtp(preset.val)}
                  >
                    <div className="preset-tile-top">
                      <b className="preset-val">{preset.val}%</b>
                      <span className="preset-name">{preset.name}</span>
                    </div>
                    <small className="preset-desc">{preset.desc}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rtp-global-summary">
            <div className="summary-header">
              <span className="summary-title">Live Payout Projection</span>
              <span className="summary-subtitle">Calculated on $1,000 gross ticket sales</span>
            </div>
            <div className="summary-metrics-list">
              <div className="summary-row">
                <div className="row-label">
                  <i className="dot-purple" />
                  <span>Player Prizes ({globalTargetRtp}%)</span>
                </div>
                <b>${globalTargetRtp * 10}.00</b>
              </div>
              <div className="summary-row">
                <div className="row-label">
                  <i className="dot-blue" />
                  <span>Operator Profit ({houseMargin.toFixed(1)}%)</span>
                </div>
                <b className="text-blue">${(houseMargin * 10).toFixed(0)}.00</b>
              </div>
              <div className="summary-row">
                <div className="row-label">
                  <i className="dot-amber" />
                  <span>Jackpot Fund (2.5%)</span>
                </div>
                <b>$25.00</b>
              </div>
            </div>
            <div className="summary-footer">
              <button
                type="button"
                className="admin-primary rtp-apply-all-btn"
                onClick={() => applyGlobalRtp(globalTargetRtp)}
              >
                ⚡ Apply {globalTargetRtp}% to All {rooms.length} Rooms
              </button>
              <span className="apply-hint">Automatically synchronizes and scales dynamic prize pools</span>
            </div>
          </div>
        </div>
      </section>

      {/* Room Table Section */}
      <section className="admin-card data-card rtp-table-section">
        <div className="data-toolbar rtp-table-toolbar">
          <div className="search-box compact rtp-search-box">
            <Icon>⌕</Icon>
            <input
              placeholder="Search rooms or variants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search rooms or variants"
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


function LiveControl({ notify, openAction }: { notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  const liveGames = [
    { id: "TRUEIG-2842", name: "Diamond 75", controller: "Nora Tran", state: "live", ball: 28, players: 300, cardsSold: 934, revenue: "$1,868", prize: "$2,000", stage: "One Line" },
    { id: "TRUEIG-3011", name: "Turbo 30", controller: "Evan Wu", state: "paused", ball: 11, players: 184, cardsSold: 412, revenue: "$680", prize: "$300", stage: "Final Line" },
    { id: "TRUEIG-3197", name: "Quick 80", controller: "Mika K", state: "live", ball: 52, players: 136, cardsSold: 310, revenue: "$750", prize: "$750", stage: "Four Corners" },
  ];
  const [selectedGameId, setSelectedGameId] = useState(liveGames[0].id);
  const selectedGame = liveGames.find((game) => game.id === selectedGameId) ?? liveGames[0];
  const [state, setState] = useState<"live" | "paused" | "stopped" | "cancelled">(selectedGame.state as "live" | "paused" | "stopped" | "cancelled");
  const [ball, setBall] = useState(selectedGame.ball);
  const [speed, setSpeed] = useState("Fast · 1.2 sec");
  const [claim, setClaim] = useState<"pending" | "approved" | "rejected">("pending");

  const nextBall = () => {
    const next = BingoEngine.nextNumber(Array.from({ length: ball }, (_, index) => index + 1)) ?? ball;
    setBall(next);
    apiClient.game.manualCall("diamond-75", next);
    notify(`${BingoEngine.label(next)} called manually.`);
  };

  const changeState = (next: typeof state, message: string) => {
    setState(next);
    if (next === "paused") apiClient.game.pause("diamond-75");
    else if (next === "live") apiClient.game.resume("diamond-75");
    else if (next === "cancelled") apiClient.game.cancel("diamond-75");
    notify(message);
  };

  const selectGame = (gameId: string) => {
    const picked = liveGames.find((game) => game.id === gameId) ?? liveGames[0];
    setSelectedGameId(gameId);
    setBall(picked.ball);
    setState(picked.state as "live" | "paused" | "stopped" | "cancelled");
    notify(`${picked.name} selected in live control. Controller: ${picked.controller}.`);
  };

  return <div className="control-grid"><section className="admin-card control-stage"><div className="live-control-overview"><div className="card-title"><div><h2>Live game control</h2><p>{liveGames.length} games currently live</p></div></div><div className="live-game-list">{liveGames.map((game) => <button type="button" key={game.id} className={`live-game-item ${selectedGameId === game.id ? "active" : ""}`} onClick={() => selectGame(game.id)}><span className="live-game-item-name">{game.name}</span><small>{game.controller}</small><strong>{game.state.toUpperCase()}</strong></button>)}</div></div><div className="control-stage-head"><div><span className={`status ${state === "live" ? "status-live" : "status-starting-soon"}`}><i />{state}</span><h2>{selectedGame.name} · {selectedGame.id}</h2><p>Controller: {selectedGame.controller} · Stage 2 of 3 · {selectedGame.stage} · Game continues after win</p></div><div><select value={speed} onChange={(event) => { setSpeed(event.target.value); notify(`Calling speed changed to ${event.target.value}.`); }}><option>Slow · 3.2 sec</option><option>Normal · 2.1 sec</option><option>Fast · 1.2 sec</option><option>Turbo · 0.6 sec</option></select><button className="danger-button" onClick={() => changeState("stopped", "Game stopped. State preserved for operator review.")}>Stop game</button></div></div><div className="operator-caller"><div className={state !== "live" ? "paused" : ""}><small>CURRENT BALL</small><strong>{BingoEngine.label(ball)}</strong><span>{state === "live" ? `Next call in ${speed.split(" · ")[1]}` : state.toUpperCase()}</span></div><div className="operator-stats"><span><small>BALLS CALLED</small><b>{ball} / 75</b></span><span><small>PLAYERS</small><b>{selectedGame.players}</b></span><span><small>CARDS SOLD</small><b>{selectedGame.cardsSold}</b></span><span><small>REVENUE</small><b>{selectedGame.revenue}</b></span><span><small>PRIZE POOL</small><b>{selectedGame.prize}</b></span><span><small>ACTIVE STAGE</small><b>{selectedGame.stage}</b></span></div></div><div className="operator-controls"><button className={state === "paused" ? "resume" : ""} onClick={() => state === "paused" ? changeState("live", "Automatic calling resumed.") : changeState("paused", "Number caller paused.")}>{state === "paused" ? "▶ Resume" : "Ⅱ Pause game"}</button><button onClick={nextBall}>Call next ball →</button><button onClick={() => openAction({ kind: "manual-call" })}>Manual call</button><button onClick={() => { apiClient.game.restart("diamond-75"); setBall(1); setState("live"); setClaim("pending"); notify("Round restarted from Ball 1."); }}>Restart game</button><button onClick={() => changeState("cancelled", "Round cancelled. Refund review opened.")}>Cancel round</button><button onClick={() => openAction({ kind: "declare-winner" })}>Declare winner</button></div><div className="operator-board">{Array.from({ length: 75 }, (_, index) => index + 1).map((number) => <span className={number <= ball ? "called" : ""} key={number}>{number}</span>)}</div></section><aside className="admin-card claim-review"><div className="card-title"><div><h2>Bingo claims</h2><p>1 requires review</p></div><span className="nav-badge">1</span></div><div className={`claim-card claim-${claim}`}><div><span className="claim-player">AR</span><div><b>Ari.R</b><small>Card #284201 · just now</small></div><span className={`table-status ${claim === "approved" ? "success" : claim === "rejected" ? "danger" : "warning"}`}>{claim === "approved" ? "Approved" : claim === "rejected" ? "Rejected" : "Pending"}</span></div><div className="claim-pattern"><div className="mini-pattern pattern-5">{[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25].map((index) => <i className={index === 6 || index === 7 || index === 8 || index === 11 || index === 12 || index === 13 || index === 16 || index === 17 || index === 18 ? "active" : ""} key={index} />)}</div><span><b>One Line</b><small>Across center row</small></span></div><div className="claim-actions"><button onClick={() => { setClaim("rejected"); apiClient.game.reviewClaim("diamond-75", "CLM-284201", "reject"); notify("Claim rejected after validation review."); }}>Reject Bingo</button><button onClick={() => { setClaim("approved"); apiClient.game.reviewClaim("diamond-75", "CLM-284201", "approve"); notify("Winner validated and prize locked."); }}>Validate winner</button></div></div><div className="player-list"><div className="card-title"><div><h2>Recent payouts</h2><p>Last reviewed</p></div></div>{[["LuckyStar","$400","14:24"],["MikaK","$250","14:17"],["Ari.R","$1,250","14:09"]].map((entry) => <div key={entry[0]}><span>{entry[0].slice(0,2).toUpperCase()}</span><div><b>{entry[0]}</b><small>{entry[2]}</small></div><strong>{entry[1]}</strong></div>)}</div></aside></div>;
}

function Scheduler({ notify }: { notify: (message: string) => void }) {
  const [view, setView] = useState("Week");
  const events = [["08:00", "Trueig 90 Classic", "90-Ball", "teal", "Recurring"], ["09:00", "Turbo 30", "Speed", "coral", "Hourly"], ["10:00", "Diamond 75", "Pattern", "violet", "Daily"], ["12:00", "Free Bingo Party", "Community", "blue", "Daily"], ["18:00", "Mega Trueig Jackpot", "Progressive", "gold", "Daily"], ["20:00", "Trueigtech Weekend Cup", "Tournament", "pink", "Weekly"]];
  return <div className="scheduler-layout"><section className="admin-card calendar-card"><div className="calendar-toolbar"><div><button>‹</button><h2>August 18–24, 2026</h2><button>›</button><button className="today">Today</button></div><div>{["Day", "Week", "Month"].map((item) => <button onClick={() => setView(item)} className={view === item ? "active" : ""} key={item}>{item}</button>)}</div></div><div className="calendar-grid"><div className="time-column"><span /><span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span><span>20:00</span></div>{["MON 18", "TUE 19", "WED 20", "THU 21", "FRI 22", "SAT 23", "SUN 24"].map((day, dayIndex) => <div className={`calendar-day ${dayIndex === 3 ? "today-col" : ""}`} key={day}><b>{day}</b>{events.filter((_, index) => (index + dayIndex) % 3 !== 1).map((event) => <button onClick={() => notify(`${event[1]} schedule opened.`)} className={`calendar-event accent-${event[3]}`} style={{ top: `${58 + ((Number(event[0].split(":")[0]) - 8) * 39)}px`, height: event[4] === "Hourly" ? "68px" : "36px" }} key={`${day}-${event[0]}-${event[1]}`}><strong>{event[0]} · {event[1]}</strong><small>{event[2]} · {event[4]}</small></button>)}</div>)}</div></section><aside className="admin-card schedule-list"><div className="card-title"><div><h2>Thursday, Aug 21</h2><p>24 scheduled games</p></div><button>•••</button></div>{events.map((event) => <div className="schedule-row" key={event[1]}><time>{event[0]}</time><i className={`accent-bg-${event[3]}`} /><div><b>{event[1]}</b><small>{event[2]} · {event[4]}</small></div><button>•••</button></div>)}<button className="full-outline" onClick={() => notify("18:00 Mega Trueig Jackpot schedule added.")}>+ Add game</button></aside></div>;
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
  return <div className="pattern-layout"><section className="admin-card pattern-builder"><div className="pattern-config"><label>Pattern name<input value={patternName} onChange={(event) => setPatternName(event.target.value)} /></label><div className="form-row"><label>Card layout<select><option>5 × 5 · 75-Ball</option><option>3 × 9 · 90-Ball</option><option>3 × 3 · 30-Ball</option></select></label><label>Minimum cells<input type="number" value={selected.length} readOnly /></label></div><div className="toggle-row"><span><b>Allow rotations</b><small>Match at 90°, 180° and 270°</small></span><button className="toggle on"><i /></button></div><div className="toggle-row"><span><b>Allow mirroring</b><small>Match horizontal reflections</small></span><button className="toggle"><i /></button></div><div className="pattern-actions"><button className="outline-button" onClick={() => setSelected([])}>Reset</button><button className="outline-button" onClick={() => notify(`${patternName} preview: ${selected.length} required cells.`)}>Preview</button><button className="admin-primary" onClick={() => { apiClient.patterns.save({ name: patternName, cells: selected, layout: "5 × 5" }); notify(`${patternName} pattern saved with ${selected.length} marked cells.`); }}>Save pattern</button></div></div><div className="pattern-canvas-wrap"><div className="pattern-canvas-head"><span><b>Pattern canvas</b><small>Click cells to mark or unmark</small></span><button onClick={() => setSelected([0, 4, 20, 24])}>Load Four Corners</button></div><div className="large-pattern-grid">{Array.from({ length: 25 }, (_, index) => <button className={selected.includes(index) ? "selected" : ""} onClick={() => toggle(index)} key={index}>{selected.includes(index) ? "✓" : index === 12 ? "FREE" : ""}</button>)}</div><div className="pattern-summary"><span><b>{selected.length}</b> marked cells</span><span><b>4</b> supported rotations</span><span><b>75-Ball</b> compatible</span></div></div></section><aside className="admin-card saved-patterns"><div className="card-title"><div><h2>Pattern library</h2><p>18 active patterns</p></div><button>Filter</button></div>{savedPatterns.map(([name, cells]) => <button key={name} onClick={() => { setPatternName(name); setSelected(cells); }}><div className="mini-pattern">{Array.from({ length: 25 }, (_, index) => <i className={cells.includes(index) ? "marked" : ""} key={index} />)}</div><span><b>{name}</b><small>{cells.length} cells · Active</small></span><i>→</i></button>)}</aside></div>;
}

function JackpotManagement({ notify, openAction }: { notify: (message: string) => void; openAction: (action: AdminAction) => void }) {
  const [jackpot, setJackpot] = useState(125480.6);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    apiClient.jackpots.list().then((list) => {
      if (list && list.length > 0) {
        const found = list.find((j) => j.id === "mega-trueig");
        if (found) setJackpot(found.currentAmount);
      }
    }).catch(() => {});
  }, []);
  return <><div className="jackpot-admin-hero"><div><span className="section-kicker">PRIMARY PROGRESSIVE</span><h2>Mega Trueig Jackpot</h2><p>JP-MEGA-001 · 75-Ball Progressive</p></div><div><small>CURRENT JACKPOT</small><strong>{money(jackpot)}</strong><span>+$842.30 today</span></div><div className="jackpot-hero-actions"><button className={`toggle ${enabled ? "on" : ""}`} onClick={() => setEnabled(!enabled)}><i /></button><span>{enabled ? "Enabled" : "Disabled"}</span><button onClick={() => { apiClient.jackpots.contribute("mega-trueig", 1000); setJackpot(jackpot + 1000); notify("Manual $1,000 contribution recorded."); }}>+ Add contribution</button></div></div><div className="jackpot-admin-grid"><section className="admin-card jackpot-config"><div className="card-title"><div><h2>Configuration</h2><p>Contribution and qualification rules</p></div><button onClick={() => openAction({kind:"edit-jackpot"})}>✎ Edit</button></div><div className="config-grid"><span><small>STARTING VALUE</small><b>$50,000</b></span><span><small>CONTRIBUTION</small><b>2.5% of ticket sales</b></span><span><small>MAXIMUM</small><b>$250,000</b></span><span><small>RESET VALUE</small><b>$50,000</b></span><span><small>QUALIFYING PATTERN</small><b>Full House</b></span><span><small>BALL REQUIREMENT</small><b>Within 42 calls</b></span><span><small>FALLBACK PRIZE</small><b>$10,000</b></span><span><small>LINKED ROOMS</small><b>4 rooms</b></span></div><div className="liability-meter"><div><span>Liability vs maximum</span><b>50.2%</b></div><i><span style={{width:"50.2%"}} /></i></div></section><section className="admin-card jackpot-history"><div className="card-title"><div><h2>Contribution history</h2><p>Recent jackpot movement</p></div><button>View all</button></div>{[["Ticket contribution", "+$42.10", "14:31"], ["Ticket contribution", "+$38.65", "14:26"], ["Game contribution", "+$100.00", "14:15"], ["Manual adjustment", "+$500.00", "12:00"]].map((row) => <div key={row[2]}><span>↗</span><b>{row[0]}<small>{row[2]} · John Dawson</small></b><strong>{row[1]}</strong></div>)}</section></div></>;
}

function VariantManagement({ openAction }: { openAction: (action: AdminAction) => void }) {
  const variants = [["75", "75-Ball Classic", "5 × 5", "Free center", "14 patterns", "violet"], ["90", "90-Ball", "3 × 9", "15 numbers", "3 stages", "teal"], ["80", "80-Ball Grid", "4 × 4", "No free cell", "8 patterns", "pink"], ["30", "Speed Bingo", "3 × 3", "Coverall", "Turbo caller", "coral"], ["50", "50-Ball", "5 × 3", "Configurable", "6 patterns", "blue"]];
  return <><div className="variant-grid">{variants.map((variant) => <article className="admin-card variant-card" key={variant[0]}><div className={`variant-ball accent-${variant[5]}`}>{variant[0]}</div><span className="table-status success">Active</span><h2>{variant[1]}</h2><p>{variant[2]} card layout</p><div><span><small>FREE SQUARES</small><b>{variant[3]}</b></span><span><small>WIN RULES</small><b>{variant[4]}</b></span></div><button onClick={() => openAction({kind:"variants",label:variant[1]})}>Configure variant →</button></article>)}</div><button className="new-variant-card" onClick={() => openAction({kind:"variants",label:"Create custom variant"})}><span>+</span><b>Create custom variant</b><small>Define any ball count, card layout and calling rule</small></button></>;
}

function PlayersTable({ openAction }: { openAction: (action: AdminAction) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All account statuses");
  const [playersList, setPlayersList] = useState<PlayerModel[]>([]);

  useEffect(() => {
    apiClient.admin.players().then((data) => {
      if (data && data.length > 0) setPlayersList(data);
    }).catch(() => {});
  }, []);

  const defaultPlayers = [["USR-10482", "TrueigQueen", "VIP", "Today · 14:29", "842", "$18,420", "$24,860", "$12,480", "Active"], ["USR-09814", "MikaK", "Standard", "Today · 14:18", "420", "$8,260", "$7,980", "$4,820", "Active"], ["USR-11804", "Ari.R", "Standard", "Today · 14:21", "128", "$2,180", "$2,840", "$248", "Active"], ["USR-07226", "RiskyB", "Restricted", "Yesterday", "294", "$12,840", "$8,250", "$0", "Restricted"]];

  const rawRows = playersList.length > 0
    ? playersList.map((p) => [
        p.id,
        p.username,
        p.tier,
        p.lastLogin,
        String(p.gamesPlayed),
        `$${p.totalEntry.toLocaleString()}`,
        `$${p.winnings.toLocaleString()}`,
        `$${p.balance.toLocaleString()}`,
        p.status,
      ])
    : defaultPlayers;

  const filtered = rawRows.filter((p) => {
    const matchSearch = p[0].toLowerCase().includes(search.toLowerCase()) || p[1].toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All account statuses" || p[8] === statusFilter;
    return matchSearch && matchStatus;
  });

  return <div className="admin-card data-card"><div className="data-toolbar"><div className="search-box compact"><Icon>⌕</Icon><input placeholder="Search by username or ID" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All account statuses</option><option>Active</option><option>Restricted</option></select><button>Advanced filters</button></div></div><div className="responsive-table"><table><thead><tr><th>Player</th><th>Tier</th><th>Last login</th><th>Games</th><th>Total entry</th><th>Winnings</th><th>Balance</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((player) => <tr key={player[0]}><td><div className="table-player"><span>{player[1].slice(0,2).toUpperCase()}</span><b>{player[1]}<small>{player[0]}</small></b></div></td>{player.slice(2).map((cell, index) => <td key={index}>{index === 5 ? <span className={`table-status ${cell === "Active" ? "success" : "warning"}`}>{cell}</span> : index === 6 ? <button onClick={() => openAction({kind:"player",label:player[1]})}>View →</button> : cell}</td>)}</tr>)}</tbody></table></div></div>;
}

function TransactionsTable() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [txList, setTxList] = useState<WalletTransaction[]>([]);

  useEffect(() => {
    apiClient.wallet.transactions().then((data) => {
      if (data && data.length > 0) setTxList(data);
    }).catch(() => {});
  }, []);

  const defaultTransactions = [["TXN-854201", "TrueigQueen", "Mega Trueig Jackpot", "Ticket purchase", "−$40.00", "Completed", "14:32:08"], ["PAY-284201", "Ari.R", "Diamond 75", "Prize payout", "+$1,250.00", "Processing", "14:31:44"], ["JP-684212", "System", "Mega Trueig Jackpot", "Jackpot contribution", "+$42.10", "Completed", "14:31:02"], ["REF-128492", "MikaK", "Trueig 90 Classic", "Refund", "+$3.00", "Completed", "14:28:16"], ["PROMO-48311", "SkyJump", "Free Bingo Party", "Promotional credit", "+$5.00", "Completed", "14:24:54"]];

  const rows = txList.length > 0
    ? txList.map((tx) => [
        tx.id,
        tx.player,
        tx.room || "Diamond 75",
        tx.type,
        tx.amount < 0 ? `−$${Math.abs(tx.amount).toFixed(2)}` : `+$${tx.amount.toFixed(2)}`,
        tx.status,
        tx.time,
      ])
    : defaultTransactions;

  const filtered = rows.filter((row) => {
    const matchSearch = row.some((cell) => cell.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === "All types" || row[3] === typeFilter;
    return matchSearch && matchType;
  });

  const purchases = txList.filter((t) => t.type.includes("purchase")).reduce((s, t) => s + Math.abs(t.amount), 0) || 48620;
  const payouts = txList.filter((t) => t.type.includes("payout") || t.type.includes("Prize")).reduce((s, t) => s + Math.abs(t.amount), 0) || 31840;
  const refunds = txList.filter((t) => t.type.includes("Refund")).reduce((s, t) => s + Math.abs(t.amount), 0) || 1242;
  const netFlow = purchases - payouts - refunds;

  return <div className="admin-card data-card"><div className="data-toolbar"><div className="search-box compact"><Icon>⌕</Icon><input placeholder="Transaction ID, player or room" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option>All types</option><option>Ticket purchase</option><option>Prize payout</option></select><select><option>Today</option><option>Last 7 days</option></select></div></div><div className="transaction-summary"><span><small>TICKET PURCHASES</small><b>${purchases.toLocaleString()}</b></span><span><small>PRIZE PAYOUTS</small><b>${payouts.toLocaleString()}</b></span><span><small>REFUNDS</small><b>${refunds.toLocaleString()}</b></span><span><small>NET FLOW</small><b className="positive">+{netFlow > 0 ? `$${netFlow.toLocaleString()}` : "$15,538"}</b></span></div><div className="responsive-table"><table><thead><tr><th>Reference</th><th>Player</th><th>Room</th><th>Type</th><th>Amount</th><th>Status</th><th>Time</th></tr></thead><tbody>{filtered.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{index === 0 ? <button className="table-link">{cell}</button> : index === 4 ? <b className={cell.startsWith("+") ? "positive" : ""}>{cell}</b> : index === 5 ? <span className={`table-status ${cell === "Completed" ? "success" : "warning"}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div></div>;
}

function ReportsPanel() {
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

  useEffect(() => {
    apiClient.chat.get("diamond-75").then((res) => {
      if (res && res.messages && res.messages.length > 0) {
        setMessages(res.messages.map((m) => [m.time || "14:32", "Diamond 75", m.sender, m.text]));
      }
    }).catch(() => {});
  }, []);

  return <div className="chat-admin-layout"><section className="admin-card chat-moderation-card"><div className="card-title"><div><h2>Live room chat</h2><p>{messages.length} messages visible · 12 flagged today</p></div><div className="inline-toggle"><span>Room chat</span><button type="button" className={`toggle ${chatEnabled?"on":""}`} aria-label="Toggle room chat" aria-pressed={chatEnabled} onClick={()=>{setChatEnabled(!chatEnabled);notify(`Room chat ${chatEnabled?"disabled":"enabled"}.`)}}><i/></button></div></div>{messages.map((message,index)=><div className="moderation-message" key={`${message[0]}-${index}`}><time>{message[0]}</time><span className="table-status neutral">{message[1]}</span><b>{message[2]}{muted.includes(message[2])&&<small>Muted</small>}</b><p>{message[3]}</p><div><button onClick={()=>{setMessages(items=>items.filter((_,itemIndex)=>itemIndex!==index));notify("Message deleted and audit log updated.")}}>Delete</button><button onClick={()=>{const isMuted=muted.includes(message[2]);setMuted(items=>isMuted?items.filter(item=>item!==message[2]):[...items,message[2]]);if(!isMuted)apiClient.chat.mute(message[2]);notify(`${message[2]} ${isMuted?"unmuted":"muted for 30 minutes"}.`)}}>{muted.includes(message[2])?"Unmute":"Mute 30m"}</button><button onClick={()=>openAction({kind:"player",label:message[2]})}>View player</button></div></div>)}</section><aside className="admin-card admin-broadcast"><h2>Operator broadcast</h2><p>Send a message to the active room or every player.</p><textarea value={adminMessage} onChange={event=>setAdminMessage(event.target.value)} placeholder="Type an admin message…"/><select><option>Diamond 75</option><option>All active rooms</option></select><button className="admin-primary" onClick={async ()=>{if(!adminMessage.trim())return;const text=adminMessage;setMessages(items=>[["now","Diamond 75","Trueigtech Admin",text],...items]);setAdminMessage("");await apiClient.chat.send("diamond-75","Trueigtech Admin",text);notify("Admin message sent.")}}>Send admin message</button><button className="outline-button" onClick={()=>openAction({kind:"announcement"})}>Create system announcement</button><div className="moderation-summary"><span><small>MUTED USERS</small><b>{muted.length}</b></span><span><small>BLOCKED TODAY</small><b>3</b></span><span><small>DELETED</small><b>{initial.length-messages.length}</b></span></div></aside></div>;
}

function BackofficeDrawer({ action, close, rooms, setRooms, notify }: { action: AdminAction; close: () => void; rooms: BingoRoomData[]; setRooms: (rooms: BingoRoomData[]) => void; notify: (message: string) => void }) {
  const editingRoom=action.room; const [name,setName]=useState(editingRoom?.name??"Trueigtech Sunrise 75");const [variant,setVariant]=useState(editingRoom?.variant??"75-Ball Pattern");const [price,setPrice]=useState(editingRoom?.ticketPrice??2);const [prize,setPrize]=useState(editingRoom?.prize??2000);const [confirm,setConfirm]=useState<"delete"|"disable"|null>(null);const [stages,setStages]=useState(editingRoom?.winningStages??[{name:"One Line",prize:100,continueAfterWin:true},{name:"Full House",prize:1000,continueAfterWin:false}]);
  const [rtp, setRtp] = useState(editingRoom?.rtp ?? 78);
  const [rtpMode, setRtpMode] = useState<RtpMode>(editingRoom?.rtpMode ?? "dynamic");
  const [customRtp, setCustomRtp] = useState(editingRoom?.customRtp ?? Boolean(editingRoom?.rtp));
  const titleMap:Record<string,string>={"create-room":"Create Bingo Room","edit-room":`Edit ${editingRoom?.name??"Room"}`,"create-game":"Create Bingo Game","caller-config":"Number Caller Configuration","create-jackpot":"Create Jackpot","edit-jackpot":"Edit Mega Trueig Jackpot","create-tournament":"Create Tournament","edit-tournament":"Edit Tournament",player:`Player Profile · ${action.label??"Ari.R"}`,promotion:`${action.label?"Edit":"Create"} Promotion`,announcement:"Create System Announcement",notifications:"Notification Center","manual-call":"Manual Ball Call","declare-winner":"Declare Winner","report-drilldown":`${action.label??"Performance"} Breakdown`,report:"Report Builder",settings:"Trueigtech Platform Settings","live-control":`Live Control · ${action.label??"Diamond 75"}`,"apply-global-rtp":"Network RTP Settings"};
  const title=titleMap[action.kind]??action.label??"Configure Module";
  const submit=(event:FormEvent)=>{event.preventDefault();if(action.kind==="create-room"){const id=name.toLowerCase().replace(/[^a-z0-9]+/g,"-");const newRoom: BingoRoomData={id,name,variant,status:"Open",ticketPrice:price,prize,players:0,maxPlayers:300,cardsSold:0,startsIn:"15:00",pattern:stages.map(stage=>stage.name).join(" → "),accent:"violet",tag:"NEW",frequency:"Every 10 min",cardRows:variant.includes("90")?3:variant.includes("30")?3:variant.includes("80")?4:5,cardColumns:variant.includes("90")?9:variant.includes("30")?3:variant.includes("80")?4:5,winningStages:stages,rtp,rtpMode,customRtp};apiClient.rooms.create(newRoom);setRooms([...rooms,newRoom])}else if(action.kind==="edit-room"&&editingRoom){apiClient.rooms.update(editingRoom.id,{name,variant,ticketPrice:price,prize,winningStages:stages,pattern:stages.map(stage=>stage.name).join(" → "),rtp,rtpMode,customRtp});setRooms(rooms.map(room=>room.id===editingRoom.id?{...room,name,variant,ticketPrice:price,prize,winningStages:stages,pattern:stages.map(stage=>stage.name).join(" → "),rtp,rtpMode,customRtp}:room))}notify(`${title} saved successfully.`);close()};
  const moveStage=(index:number,direction:number)=>{const target=index+direction;if(target<0||target>=stages.length)return;setStages(items=>{const next=[...items];[next[index],next[target]]=[next[target],next[index]];return next})};
  const stagesEditor=<div className="stage-editor"><div className="drawer-section-title"><div><h3>Winning stage configuration</h3><p>Winners can be paid without ending the round.</p></div><button type="button" onClick={()=>setStages(items=>[...items,{name:"New Stage",prize:100,continueAfterWin:true}])}>+ Add winning stage</button></div>{stages.map((stage,index)=><div className="stage-editor-row" key={`${stage.name}-${index}`}><i>{index+1}</i><label>Pattern<select value={stage.name} onChange={event=>setStages(items=>items.map((item,itemIndex)=>itemIndex===index?{...item,name:event.target.value}:item))}><option>One Line</option><option>Two Lines</option><option>Four Corners</option><option>Horizontal Line</option><option>Diamond</option><option>X Pattern</option><option>Cross</option><option>Full House</option><option>Blackout</option></select></label><label>Prize<input type="number" value={stage.prize} onChange={event=>setStages(items=>items.map((item,itemIndex)=>itemIndex===index?{...item,prize:Number(event.target.value)}:item))}/></label><label className="stage-check"><input type="checkbox" checked={stage.continueAfterWin} onChange={event=>setStages(items=>items.map((item,itemIndex)=>itemIndex===index?{...item,continueAfterWin:event.target.checked}:item))}/> Continue after win</label><div><button type="button" onClick={()=>moveStage(index,-1)}>↑</button><button type="button" onClick={()=>moveStage(index,1)}>↓</button><button type="button" onClick={()=>setStages(items=>items.filter((_,itemIndex)=>itemIndex!==index))}>×</button></div></div>)}</div>;
  const formFooter=<div className="drawer-footer"><button type="button" className="outline-button" onClick={close}>Cancel</button>{action.kind==="create-room"&&<button type="button" className="outline-button" onClick={()=>notify("Room saved as draft.")}>Save draft</button>}<button className="admin-primary">{action.kind==="edit-room"?"Save changes":action.kind==="create-game"?"Create game":"Save configuration"}</button></div>;
  if(action.kind==="notifications")return <div className="admin-drawer-backdrop"><button type="button" className="admin-drawer-scrim" aria-label="Close notifications" onClick={close}/><aside className="admin-drawer"><DrawerHeader title={title} close={close}/><div className="drawer-body">{[["Game starts in 1 minute","Trueig 90 Classic · 14:31"],["High-value claim needs review","Mega Trueig Jackpot · 14:29"],["Jackpot passed $126,000","Automatic threshold alert"],["Tournament Round 2 opened","Trueigtech Weekend Cup"]].map((item,index)=><div className="admin-notification" key={item[0]}><i>{index+1}</i><span><b>{item[0]}</b><small>{item[1]}</small></span><button onClick={()=>notify("Notification opened.")}>Open →</button></div>)}</div></aside></div>;
  if(action.kind==="player")return <div className="admin-drawer-backdrop"><aside className="admin-drawer wide"><DrawerHeader title={title} close={close}/><div className="drawer-body"><div className="player-profile-head"><span>{(action.label??"AR").slice(0,2).toUpperCase()}</span><div><h2>{action.label??"Ari.R"}</h2><p>TRUEIG-11804 · Active · Standard tier</p></div><b>$248.50<small>BALANCE</small></b></div><div className="player-profile-stats">{[["Games played","128"],["Cards purchased","346"],["Bingo wins","18"],["Win percentage","14.1%"],["Total prizes","$2,840"],["Current restrictions","None"]].map(item=><span key={item[0]}><small>{item[0]}</small><b>{item[1]}</b></span>)}</div><div className="player-action-grid">{["Suspend","Block","Restrict Bingo","Add Bonus Card","Add Promotional Ticket","View Cards","View Game History","View Transactions"].map(item=><button key={item} onClick={()=>notify(`${item} action applied to ${action.label??"Ari.R"}.`)}>{item}</button>)}</div><div className="drawer-section"><h3>Recent Bingo activity</h3><table><tbody>{[["TRUEIG-2842","Diamond 75","3 cards","+$400"],["TRUEIG-2838","Trueig 90 Classic","6 cards","+$150"],["TRUEIG-2812","Turbo 30","2 cards","$0"]].map(row=><tr key={row[0]}>{row.map(cell=><td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div></div></aside></div>;
  if(action.kind==="report-drilldown"||action.kind==="report")return <div className="admin-drawer-backdrop"><aside className="admin-drawer wide"><DrawerHeader title={title} close={close}/><div className="drawer-body"><div className="report-drill-stats">{[["Total","$48,620"],["Transactions","12,842"],["Average","$3.78"],["Change","+12.4%"]].map(item=><span key={item[0]}><small>{item[0]}</small><b>{item[1]}</b></span>)}</div><div className="drawer-form-grid"><label>Date range<input type="date" defaultValue="2026-08-21"/></label><label>Room<select><option>All Trueigtech rooms</option>{rooms.map(room=><option key={room.id}>{room.name}</option>)}</select></label><label>Report type<select><option>Revenue</option><option>Ticket Sales</option><option>Player Activity</option><option>Game Performance</option><option>Winning Patterns</option><option>Prize Payouts</option><option>Jackpot</option><option>Refunds</option></select></label></div><table className="drawer-table"><thead><tr><th>Reference</th><th>Room</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>{[["TXN-854201","Mega Trueig Jackpot","Ticket revenue","$42,100","Complete"],["PAY-284201","Diamond 75","Prize payout","$2,000","Complete"],["REF-128492","Trueig 90 Classic","Refund","$3.00","Complete"]].map(row=><tr key={row[0]}>{row.map(cell=><td key={cell}>{cell}</td>)}</tr>)}</tbody></table><div className="drawer-footer"><button className="outline-button" onClick={()=>notify("Report exported to XLSX.")}>Export XLSX</button><button className="admin-primary" onClick={()=>notify("Report filters applied.")}>Run report</button></div></div></aside></div>;
  const isRoom=action.kind==="create-room"||action.kind==="edit-room"; const isGame=action.kind==="create-game";
  return <div className="admin-drawer-backdrop"><button type="button" className="admin-drawer-scrim" aria-label="Close configuration drawer" onClick={close}/><aside className={`admin-drawer ${(isRoom||isGame)?"wide":""}`}><DrawerHeader title={title} close={close}/><form className="drawer-body" onSubmit={submit}>
    {isRoom&&<><div className="drawer-section"><h3>Basic information</h3><div className="drawer-form-grid"><label>Room name<input required value={name} onChange={event=>setName(event.target.value)}/></label><label>Room code<input defaultValue={editingRoom?.id.toUpperCase()??"TRUEIG-SUN75"}/></label><label className="full">Description<textarea defaultValue="A premium Trueigtech multi-stage Bingo room."/></label><label>Thumbnail<input type="file" accept="image/*"/></label><label>Banner<input type="file" accept="image/*"/></label><label>Room type<select><option>Public</option><option>VIP</option><option>Community</option><option>Tournament</option></select></label><label>Status<select><option>Open</option><option>Draft</option><option>Scheduled</option><option>Disabled</option></select></label></div></div><div className="drawer-section"><h3>Bingo configuration</h3><div className="drawer-form-grid"><label>Bingo variant<select value={variant} onChange={event=>setVariant(event.target.value)}><option>90-Ball Classic</option><option>75-Ball Pattern</option><option>30-Ball Speed</option><option>80-Ball Grid</option><option>75-Ball Progressive</option></select></label><label>Ball count<input value={variant.includes("90")?90:variant.includes("30")?30:variant.includes("80")?80:75} readOnly/></label><label>Card layout<select><option>{variant.includes("90")?"3 × 9":variant.includes("30")?"3 × 3":variant.includes("80")?"4 × 4":"5 × 5"}</option></select></label><label>Number range<input defaultValue={`1–${variant.includes("90")?90:variant.includes("30")?30:variant.includes("80")?80:75}`}/></label><label>Free space<select><option>{variant.includes("75")?"Center free":"None"}</option></select></label><label>Winning format<select><option>Multiple stages</option><option>Single pattern</option><option>Progressive</option></select></label></div></div><div className="drawer-section"><h3>Ticket & player configuration</h3><div className="drawer-form-grid"><label>Ticket price<input type="number" step="0.5" value={price} onChange={event=>setPrice(Number(event.target.value))}/></label><label>Minimum cards<input type="number" defaultValue="1"/></label><label>Maximum cards<input type="number" defaultValue="8"/></label><label>Cards per strip<input type="number" defaultValue={variant.includes("90")?6:1}/></label><label>Sales start time<input type="time" defaultValue="17:45"/></label><label>Sales close time<input type="time" defaultValue="17:59"/></label><label>Minimum players<input type="number" defaultValue="2"/></label><label>Maximum players<input type="number" defaultValue={editingRoom?.maxPlayers??300}/></label><label>VIP requirement<select><option>None</option><option>Gold</option><option>Platinum</option></select></label><label>Country restrictions<input placeholder="None or comma-separated ISO codes"/></label></div></div><div className="drawer-section"><h3>Game configuration</h3><div className="drawer-form-grid"><label>Countdown<input type="number" defaultValue="5"/></label><label>Ball calling speed<select><option>Fast · 1.2s</option><option>Turbo · 0.6s</option><option>Normal · 2.1s</option><option>Slow · 3.2s</option></select></label>{["Auto Daub","Manual Daub","Auto Bingo","Manual Bingo Claim","Chat"].map(item=><label className="check-field" key={item}><input type="checkbox" defaultChecked={item!=="Auto Bingo"}/>{item}</label>)}</div></div>{stagesEditor}<div className="drawer-section"><h3>RTP & Winning Margins</h3><div className="drawer-form-grid"><label>Target RTP (%)<input type="number" min="50" max="98" step="1" value={rtp} onChange={event=>setRtp(Number(event.target.value))}/></label><label>Payout Mode<select value={rtpMode} onChange={event=>setRtpMode(event.target.value as RtpMode)}><option value="dynamic">Dynamic (Scales with ticket sales)</option><option value="fixed">Guaranteed Fixed (Minimum prize)</option></select></label><label>RTP Policy<select value={customRtp ? "custom" : "global"} onChange={event=>setCustomRtp(event.target.value==="custom")}><option value="global">Follow Global Platform Target (78%)</option><option value="custom">Custom Room Override</option></select></label><label>House Margin Retention<input readOnly value={`${RTPEngine.calculateHouseMargin(rtp)}%`}/></label></div></div><div className="drawer-section"><h3>Prize & multiple winners</h3><div className="drawer-form-grid"><label>Prize type<select><option>Fixed prize</option><option>Prize pool</option><option>Progressive</option></select></label><label>Prize amount<input type="number" value={prize} onChange={event=>setPrize(Number(event.target.value))}/></label><label>Multiple winners<select><option>Allowed</option><option>First validated only</option></select></label><label>Prize split rule<select><option>Split equally</option><option>Fixed per winner</option><option>Shared jackpot</option><option>Carry over remainder</option></select></label><label>Maximum winner count<input type="number" defaultValue="10"/></label><label className="check-field"><input type="checkbox" defaultChecked={Boolean(editingRoom?.jackpot)}/> Enable jackpot</label><label>Jackpot type<select><option>Progressive</option><option>Guaranteed</option><option>Community</option></select></label><label>Starting amount<input type="number" defaultValue="50000"/></label><label>Contribution %<input type="number" step="0.1" defaultValue="2.5"/></label><label>Winning condition<input defaultValue="Full House within 42 balls"/></label><label>Reset amount<input type="number" defaultValue="50000"/></label></div></div>{action.kind==="edit-room"&&<div className="destructive-row"><button type="button" onClick={()=>{const copy={...editingRoom!,id:`${editingRoom!.id}-copy`,name:`${editingRoom!.name} Copy`,status:"Open" as BingoStatus};apiClient.rooms.create(copy);setRooms([...rooms,copy]);notify("Room duplicated.")}}>Duplicate room</button><button type="button" onClick={()=>setConfirm("disable")}>Disable room</button><button type="button" onClick={()=>setConfirm("delete")}>Delete room</button></div>}</>}
    {isGame&&<><div className="drawer-section"><h3>Game details</h3><div className="drawer-form-grid"><label>Room<select defaultValue={editingRoom?.name}>{rooms.map(room=><option key={room.id}>{room.name}</option>)}</select></label><label>Bingo type<select defaultValue={editingRoom?.variant}><option>90-Ball Classic</option><option>75-Ball Pattern</option><option>30-Ball Speed</option><option>80-Ball Grid</option></select></label><label>Date<input type="date" defaultValue="2026-08-22"/></label><label>Start time<input type="time" defaultValue="18:00"/></label><label>Ticket price<input type="number" step="0.5" value={price} onChange={event=>setPrice(Number(event.target.value))}/></label><label>Prize<input type="number" value={prize} onChange={event=>setPrize(Number(event.target.value))}/></label><label>Call speed<select><option>Fast</option><option>Turbo</option><option>Normal</option><option>Slow</option></select></label><label>Maximum players<input type="number" defaultValue="300"/></label><label>Card limit<input type="number" defaultValue="8"/></label><label>Jackpot<select><option>None</option><option>Mega Trueig Jackpot</option></select></label><label>Promotion<select><option>None</option><option>Buy 3 Get 1</option><option>Happy Hour</option></select></label><label>Game frequency<select><option>One time</option><option>Hourly</option><option>Daily</option><option>Weekly</option></select></label></div></div>{stagesEditor}<div className="game-form-actions"><button type="button" className="outline-button" onClick={()=>notify("Game scheduled for 18:00.")}>Schedule game</button><button type="button" className="admin-primary" onClick={()=>{notify("Game started immediately and opened in Live Control.");close()}}>Start immediately</button></div></>}
    {!isRoom&&!isGame&&<DrawerSpecialForm kind={action.kind} notify={notify} rooms={rooms} setRooms={setRooms} close={close}/>} {confirm&&<div className="confirm-box"><b>{confirm==="delete"?"Delete this room permanently?":"Disable this room?"}</b><p>{confirm==="delete"?"The demo room will be removed from the lobby.":"Players will no longer be able to enter new rounds."}</p><button type="button" onClick={()=>setConfirm(null)}>Keep room</button><button type="button" className="danger-button" onClick={()=>{if(editingRoom){if(confirm==="delete"){apiClient.rooms.delete(editingRoom.id);setRooms(rooms.filter(room=>room.id!==editingRoom.id));}else {apiClient.rooms.update(editingRoom.id, {status:"Scheduled"});setRooms(rooms.map(room=>room.id===editingRoom.id?{...room,status:"Scheduled"}:room));}}notify(`Room ${confirm==="delete"?"deleted":"disabled"}.`);close()}}>Confirm {confirm}</button></div>} {formFooter}
  </form></aside></div>;
}

function DrawerHeader({title,close}:{title:string;close:()=>void}){return <div className="drawer-header"><div><span className="section-kicker">TRUEIGTECH BACKOFFICE</span><h2>{title}</h2><p>Changes update the connected demo state immediately.</p></div><button onClick={close}>×</button></div>}

function DrawerSpecialForm({kind,notify,rooms,setRooms,close}:{kind:string;notify:(message:string)=>void;rooms:BingoRoomData[];setRooms:(rooms:BingoRoomData[])=>void;close:()=>void}){
  const [policyRtp, setPolicyRtp] = useState(80);
  const [syncMode, setSyncMode] = useState("all");

  if(kind==="caller-config")return <div className="drawer-section"><h3>Caller behavior</h3><div className="drawer-form-grid"><label>Initial countdown<input type="number" defaultValue="5"/></label><label>Time between balls<input type="number" step="0.1" defaultValue="1.2"/></label><label>Voice caller<select><option>Trueigtech Nova</option><option>Trueigtech Max</option><option>Off</option></select></label><label>Animation<select><option>Premium ball motion</option><option>Minimal</option><option>Off</option></select></label>{["Auto call","Manual call enabled","Pause on Bingo claim","Resume after winner"].map(item=><label className="check-field" key={item}><input type="checkbox" defaultChecked/>{item}</label>)}<label>Game end delay<input type="number" defaultValue="4"/></label></div><button type="button" className="full-outline" onClick={()=>notify("Caller preview: B-17. Voice and animation settings applied.")}>Preview B-17 call</button></div>;
  if(kind.includes("jackpot"))return <div className="drawer-section"><h3>Jackpot configuration</h3><div className="drawer-form-grid"><label>Jackpot name<input defaultValue="Mega Trueig Jackpot"/></label><label>Jackpot type<select><option>Progressive</option><option>Guaranteed</option><option>Community</option></select></label><label>Starting amount<input type="number" defaultValue="50000"/></label><label>Current amount<input type="number" defaultValue="125480"/></label><label>Contribution %<input type="number" step="0.1" defaultValue="2.5"/></label><label>Maximum amount<input type="number" defaultValue="250000"/></label><label>Qualifying Bingo type<select><option>75-Ball Progressive</option><option>90-Ball</option></select></label><label>Qualifying pattern<select><option>Full House</option><option>Blackout</option></select></label><label>Maximum ball count<input type="number" defaultValue="42"/></label><label>Reset amount<input type="number" defaultValue="50000"/></label><label>Start date<input type="date" defaultValue="2026-08-21"/></label><label>End date<input type="date" defaultValue="2026-12-31"/></label><label>Status<select><option>Active</option><option>Paused</option></select></label></div><div className="special-actions"><button type="button" onClick={()=>notify("Jackpot paused.")}>Pause</button><button type="button" onClick={()=>notify("Jackpot resumed.")}>Resume</button><button type="button" className="danger-button" onClick={()=>notify("Jackpot reset to $50,000 after confirmation.")}>Reset jackpot</button></div></div>;
  if(kind.includes("tournament"))return <div className="drawer-section"><h3>Tournament configuration</h3><div className="drawer-form-grid"><label>Tournament name<input defaultValue="Trueigtech Weekend Cup"/></label><label className="full">Description<textarea defaultValue="Five-round progressive elimination tournament."/></label><label>Bingo rooms<select multiple><option>Diamond 75</option><option>Trueig 90 Classic</option><option>Turbo 30</option></select></label><label>Start date<input type="date" defaultValue="2026-08-22"/></label><label>End date<input type="date" defaultValue="2026-08-24"/></label><label>Entry fee<input type="number" defaultValue="8"/></label><label>Maximum players<input type="number" defaultValue="512"/></label><label>Number of rounds<input type="number" defaultValue="5"/></label><label>Prize pool<input type="number" defaultValue="25000"/></label><label>Points rules<textarea defaultValue="Line 10 · Pattern 25 · Full House 50"/></label><label>Qualification rules<textarea defaultValue="Top 50% advance each round"/></label><label>Leaderboard rules<textarea defaultValue="Points, wins, fastest Bingo"/></label></div></div>;
  if(kind==="promotion")return <div className="drawer-section"><h3>Promotion builder</h3><div className="drawer-form-grid"><label>Promotion name<input defaultValue="Trueigtech Happy Hour"/></label><label>Promotion type<select><option>Free Bingo</option><option>Free Cards</option><option>Buy 3 Get 1</option><option>Happy Hour</option><option>Cashback</option><option>Tournament Entry</option><option>VIP Access</option><option>Deposit Bonus</option><option>Daily Reward</option></select></label><label>Start date<input type="date" defaultValue="2026-08-22"/></label><label>End date<input type="date" defaultValue="2026-09-22"/></label><label>Eligible rooms<select><option>All rooms</option><option>Diamond 75</option><option>Turbo 30</option></select></label><label>Status<select><option>Active</option><option>Draft</option><option>Paused</option></select></label></div></div>;
  if(kind==="announcement")return <div className="drawer-section"><h3>In-app announcement</h3><div className="drawer-form-grid"><label>Audience<select><option>All players</option><option>Active rooms</option><option>VIP players</option><option>Tournament entrants</option></select></label><label>Priority<select><option>Normal</option><option>Important</option><option>Urgent</option></select></label><label className="full">Message<textarea defaultValue="Free Bingo starts in 5 minutes. Claim your Trueigtech card now!"/></label><label>Action label<input defaultValue="Claim free card"/></label><label>Linked screen<select><option>Free Bingo Party</option><option>Promotions</option><option>Lobby</option></select></label><label>Schedule<input type="datetime-local" defaultValue="2026-08-21T18:00"/></label></div><button type="button" className="full-outline" onClick={()=>notify("Test announcement sent to your admin account.")}>Send test notification</button></div>;
  if(kind==="manual-call")return <div className="drawer-section"><h3>Manual ball call</h3><label>Ball number<input type="number" min="1" max="75" defaultValue="17"/></label><p className="form-hint">The number is checked against call history before broadcast.</p></div>;
  if(kind==="declare-winner")return <div className="drawer-section"><h3>Manual winner declaration</h3><div className="drawer-form-grid"><label>Player<input defaultValue="LuckyStar"/></label><label>Card ID<input defaultValue="284237"/></label><label>Winning stage<select><option>One Line</option><option>Diamond</option><option>Full House</option></select></label><label>Prize<input type="number" defaultValue="400"/></label><label>Winner count<input type="number" defaultValue="1"/></label><label>Split rule<select><option>Split equally</option><option>Fixed per winner</option></select></label></div></div>;
  if(kind==="apply-global-rtp") {
    const margin = RTPEngine.calculateHouseMargin(policyRtp);
    return (
      <div className="drawer-section">
        <h3>Network-Wide RTP Policy</h3>
        <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "14px" }}>
          Establish the default return-to-player percentage and operator profit margin across all connected games.
        </p>
        <div className="drawer-form-grid">
          <label>
            Global Target RTP (%)
            <input
              type="number"
              min="65"
              max="95"
              value={policyRtp}
              onChange={(e) => setPolicyRtp(Number(e.target.value))}
            />
          </label>
          <label>
            Expected House Profit
            <input readOnly value={`${margin}% GGR hold`} />
          </label>
          <label>
            Sync Mode
            <select value={syncMode} onChange={(e) => setSyncMode(e.target.value)}>
              <option value="all">Update all {rooms.length} rooms immediately</option>
              <option value="non-custom">Update rooms without custom overrides</option>
            </select>
          </label>
          <label className="full">
            Policy Description
            <textarea defaultValue="Standard network payout policy ensuring positive operator house margin across all active games." />
          </label>
        </div>
        <button
          type="button"
          className="admin-primary full-outline"
          onClick={() => {
            apiClient.rooms.applyRtpPolicy(policyRtp, syncMode);
            const updated = rooms.map(room => {
              if (syncMode === "non-custom" && room.customRtp) return room;
              const newPrize = room.rtpMode === "dynamic"
                ? RTPEngine.calculateDynamicPrize(room.cardsSold, room.ticketPrice, policyRtp, room.jackpot ? 2.5 : 0)
                : room.prize;
              return {
                ...room,
                rtp: policyRtp,
                customRtp: false,
                prize: newPrize > 0 ? Math.round(newPrize) : room.prize,
              };
            });
            setRooms(updated);
            notify(`Global ${policyRtp}% RTP policy distributed across rooms.`);
            close();
          }}
        >
          Broadcast {policyRtp}% Network Policy
        </button>
      </div>
    );
  }
  return <div className="drawer-section"><h3>Configuration</h3><div className="drawer-form-grid"><label>Setting name<input defaultValue="Trueigtech default"/></label><label>Status<select><option>Enabled</option><option>Disabled</option></select></label><label className="full">Description<textarea defaultValue="Operational configuration for the Trueigtech Bingo platform."/></label></div></div>;
}
