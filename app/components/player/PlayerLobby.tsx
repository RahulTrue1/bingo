import { useEffect, useState } from "react";
import type { BingoRoomData } from "../../bingo-core";
import { Icon } from "../shared/Icon";
import type { PlayerView } from "../shared/types";
import { money } from "../shared/types";
import { HeroCarousel } from "./HeroCarousel";
import { RoomCard } from "./RoomCard";
import { apiClient, type JackpotModel } from "../../api-client";

export function PlayerLobby({
  rooms,
  enterRoom,
  setView,
}: {
  rooms: BingoRoomData[];
  enterRoom: (room: BingoRoomData) => void;
  setView: (view: PlayerView) => void;
}) {
  const [filter, setFilter] = useState("All games");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(["diamond-75"]);
  const [topJackpotAmount, setTopJackpotAmount] = useState<number>(127480);

  useEffect(() => {
    const fetchTopJackpot = () => {
      apiClient.jackpots.list().then((list) => {
        if (list && list.length > 0) {
          const maxVal = Math.max(...list.map((j) => j.currentAmount));
          setTopJackpotAmount(maxVal);
        }
      }).catch(() => {});
    };
    fetchTopJackpot();
    const unsub = apiClient.sync.subscribe((e) => {
      if (e.entity === "jackpots") fetchTopJackpot();
    });
    return unsub;
  }, []);

  const [sortBy, setSortBy] = useState<"popular" | "prize" | "price" | "name">("popular");

  const filters = ["All games", "Live now", "75-Ball", "90-Ball", "Speed", "Jackpots", "Free"];
  const filtered = rooms
    .filter((room) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        `${room.name} ${room.variant} ${room.id} ${room.pattern || ""} ${room.tag || ""}`
          .toLowerCase()
          .includes(q);
      const matchesFilter =
        filter === "All games" ||
        (filter === "Live now" && room.status === "Live") ||
        (filter === "Jackpots" && Boolean(room.jackpot)) ||
        (filter === "Free" && room.ticketPrice === 0) ||
        room.variant.toLowerCase().includes(filter.replace("-Ball", "").toLowerCase());
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "popular") return b.players - a.players;
      if (sortBy === "prize") return (b.jackpot ?? b.prize ?? 0) - (a.jackpot ?? a.prize ?? 0);
      if (sortBy === "price") return a.ticketPrice - b.ticketPrice;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

  const cycleSort = () => {
    const cycle: Record<string, "popular" | "prize" | "price" | "name"> = {
      popular: "prize",
      prize: "price",
      price: "name",
      name: "popular",
    };
    setSortBy((prev) => cycle[prev]);
  };

  const sortLabels: Record<string, string> = {
    popular: "Popular",
    prize: "Highest Prize",
    price: "Lowest Price",
    name: "A–Z",
  };

  const toggleFavorite = (id: string) =>
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <div className="lobby-page">
      <HeroCarousel rooms={rooms} enterRoom={enterRoom} setView={setView} />

      <section className="lobby-content">
        <div className="section-heading">
          <div>
            <span className="section-kicker">DISCOVER</span>
            <h2>Find your next game</h2>
          </div>
          <div className="search-box">
            <Icon>⌕</Icon>
            <input
              aria-label="Search rooms"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search rooms or variants"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#8a94a6",
                  cursor: "pointer",
                  padding: "0 8px",
                  fontSize: "14px",
                }}
                title="Clear search"
              >
                ×
              </button>
            ) : (
              <kbd>⌘ K</kbd>
            )}
          </div>
        </div>
        <div className="filter-row">
          <div className="filter-tabs">
            {filters.map((item) => (
              <button
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
          <button className="sort-button" type="button" onClick={cycleSort} title="Change sort order">
            <Icon>↕</Icon> Sort: {sortLabels[sortBy]}
          </button>
        </div>
        <div className="lobby-section-chips">
          {[
            ["♠", "Hold'em Live", "NLH Cash Games", "holdem"],
            ["🃘", "PLO (Omaha)", "4-Card Action", "plo"],
            ["⚡", "Spin & Cash", "Up to 12,000x", "spin"],
            ["🔥", "All In or Fold", "High-Action Blitz", "aof"],
            ["🏆", "Tournaments", "Sunday Millions", "tournaments"],
            ["✦", "Jackpot Bingo", `${money(topJackpotAmount)} live`, "bingo_jackpot"],
          ].map((item) => (
            <button
              key={item[1]}
              onClick={() => {
                if (["holdem", "plo", "spin", "aof", "tournaments"].includes(item[3])) {
                  window.location.href = `/cashgame?tab=${item[3]}`;
                  return;
                }
                setFilter(
                  item[1].includes("Jackpot")
                    ? "Jackpots"
                    : item[1].includes("Speed")
                      ? "Speed"
                      : item[1].includes("Live")
                        ? "Live now"
                        : "All games",
                );
              }}
            >
              <i>{item[0]}</i>
              <span>
                <b>{item[1]}</b>
                <small>{item[2]}</small>
              </span>
            </button>
          ))}
        </div>

        {/* ================= BASEPOKER GAME MODES SHOWCASE ON HOME ================= */}
        <div className="home-poker-modes-bar-wrapper">
          <div className="home-poker-modes-header">
            <div className="home-poker-modes-title">
              <span className="live-radar-dot" />
              <span className="kicker">BASEPOKER REAL-TIME NETWORK</span>
              <span className="badge">POKER MODES</span>
            </div>
            <a href="/cashgame" className="poker-view-all-link">
              Explore All Tables <span>→</span>
            </a>
          </div>

          <div className="home-poker-modes-grid">
            <a href="/cashgame?tab=holdem" className="home-poker-card">
              <div className="home-poker-card-top">
                <span className="poker-suit">♠</span>
                <span className="poker-mode-pill live">LIVE</span>
              </div>
              <div className="home-poker-card-content">
                <strong>Texas Hold&apos;em</strong>
                <span>No-Limit Cash Tables</span>
              </div>
              <div className="home-poker-card-cta">Play Now →</div>
            </a>

            <a href="/cashgame?tab=plo" className="home-poker-card">
              <div className="home-poker-card-top">
                <span className="poker-suit plo">🃘</span>
                <span className="poker-mode-pill plo">4-CARD</span>
              </div>
              <div className="home-poker-card-content">
                <strong>PLO (Omaha)</strong>
                <span>Pot-Limit Action</span>
              </div>
              <div className="home-poker-card-cta">Play Now →</div>
            </a>

            <a href="/cashgame?tab=spin" className="home-poker-card">
              <div className="home-poker-card-top">
                <span className="poker-suit spin">⚡</span>
                <span className="poker-mode-pill jackpot">12,000X</span>
              </div>
              <div className="home-poker-card-content">
                <strong>Spin &amp; Cash</strong>
                <span>3-Max Hyper Turbo</span>
              </div>
              <div className="home-poker-card-cta">Play Now →</div>
            </a>

            <a href="/cashgame?tab=aof" className="home-poker-card">
              <div className="home-poker-card-top">
                <span className="poker-suit aof">🔥</span>
                <span className="poker-mode-pill action">ACTION</span>
              </div>
              <div className="home-poker-card-content">
                <strong>All In or Fold</strong>
                <span>Fast Action Blitz</span>
              </div>
              <div className="home-poker-card-cta">Play Now →</div>
            </a>

            <a href="/cashgame?tab=tournaments" className="home-poker-card">
              <div className="home-poker-card-top">
                <span className="poker-suit mtt">🏆</span>
                <span className="poker-mode-pill mtt">MTT</span>
              </div>
              <div className="home-poker-card-content">
                <strong>Tournaments</strong>
                <span>€1,000,000 GTD Series</span>
              </div>
              <div className="home-poker-card-cta">View MTTs →</div>
            </a>
          </div>
        </div>

        <style>{`
          .home-poker-modes-bar-wrapper {
            background: linear-gradient(145deg, rgba(20, 14, 45, 0.85), rgba(12, 8, 30, 0.95));
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 18px 20px;
            margin-bottom: 26px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          }
          .home-poker-modes-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
            flex-wrap: wrap;
            gap: 10px;
          }
          .home-poker-modes-title {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .home-poker-modes-title .live-radar-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 8px #10b981;
          }
          .home-poker-modes-title .kicker {
            font-size: 11px;
            font-weight: 800;
            color: #a78bfa;
            letter-spacing: 1px;
          }
          .home-poker-modes-title .badge {
            font-size: 10px;
            font-weight: 800;
            background: rgba(168, 85, 247, 0.2);
            color: #c084fc;
            border: 1px solid rgba(168, 85, 247, 0.4);
            padding: 2px 8px;
            border-radius: 20px;
          }
          .poker-view-all-link {
            font-size: 12px;
            font-weight: 700;
            color: #c4b5fd;
            text-decoration: none;
            transition: color 0.15s ease;
          }
          .poker-view-all-link:hover {
            color: #ffffff;
          }
          .home-poker-modes-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
          }
          .home-poker-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 14px;
            text-decoration: none;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 110px;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .home-poker-card:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(168, 85, 247, 0.45);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          }
          .home-poker-card-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .poker-suit {
            font-size: 16px;
            color: #a78bfa;
          }
          .poker-suit.plo { color: #60a5fa; }
          .poker-suit.spin { color: #f59e0b; }
          .poker-suit.aof { color: #f87171; }
          .poker-suit.mtt { color: #c084fc; }
          .poker-mode-pill {
            font-size: 9px;
            font-weight: 900;
            padding: 2px 6px;
            border-radius: 20px;
            letter-spacing: 0.5px;
          }
          .poker-mode-pill.live {
            background: linear-gradient(135deg, #ef4444, #ec4899);
            color: #ffffff;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
          }
          .poker-mode-pill.plo {
            background: rgba(59, 130, 246, 0.2);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.4);
          }
          .poker-mode-pill.jackpot {
            background: linear-gradient(135deg, #f59e0b, #eab308);
            color: #1a1003;
            font-weight: 900;
          }
          .poker-mode-pill.action {
            background: rgba(239, 68, 68, 0.2);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.4);
          }
          .poker-mode-pill.mtt {
            background: rgba(168, 85, 247, 0.2);
            color: #c084fc;
            border: 1px solid rgba(168, 85, 247, 0.4);
          }
          .home-poker-card-content {
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin-bottom: 8px;
          }
          .home-poker-card-content strong {
            font-size: 13px;
            font-weight: 800;
            color: #ffffff;
          }
          .home-poker-card-content span {
            font-size: 11px;
            color: #94a3b8;
          }
          .home-poker-card-cta {
            font-size: 11px;
            font-weight: 700;
            color: #a78bfa;
            transition: color 0.15s ease;
          }
          .home-poker-card:hover .home-poker-card-cta {
            color: #ffffff;
          }
          @media (max-width: 900px) {
            .home-poker-modes-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (max-width: 600px) {
            .home-poker-modes-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
        <div className="room-grid">
          {filtered.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onEnter={() => enterRoom(room)}
              favorite={favorites.includes(room.id)}
              toggleFavorite={() => toggleFavorite(room.id)}
            />
          ))}
        </div>
        {!filtered.length && (
          <div className="empty-state">
            <span>⌕</span>
            <h3>No rooms found</h3>
            <p>Try a different game type or search term.</p>
          </div>
        )}
        <div className="lobby-lower-grid">
          <section className="tournament-promo">
            <div>
              <span className="eyebrow dark"><i /> FRIDAY · 20:00 UTC</span>
              <h3>Trueigtech Weekend Cup</h3>
              <p>Five rounds. One champion. The top 128 advance after every lightning-fast stage.</p>
            </div>
            <div className="promo-prize">
              <small>PRIZE POOL</small>
              <strong>$25,000</strong>
              <span>384 / 512 players</span>
              <div><i style={{ width: "75%" }} /></div>
            </div>
            <button onClick={() => setView("tournaments")}>View tournament <span>→</span></button>
          </section>
          <section className="recent-winners">
            <div className="mini-section-title">
              <div><span className="live-dot" /><h3>Live wins</h3></div>
              <button>View all</button>
            </div>
            {[
              ["MK", "MikaK", "Mega Trueig Jackpot", "+$2,840"],
              ["SJ", "SkyJump", "Trueig 90 Classic", "+$625"],
              ["LA", "LunaAce", "Turbo 30", "+$180"],
            ].map((winner, index) => (
              <div className="winner-row" key={`winner-${winner[1]}-${index}`}>
                <span className={`winner-avatar avatar-${index}`}>{winner[0]}</span>
                <div><strong>{winner[1]}</strong><small>{winner[2]}</small></div>
                <b>{winner[3]}</b>
              </div>
            ))}
          </section>
        </div>
      </section>
    </div>
  );
}
