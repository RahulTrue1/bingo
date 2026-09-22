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
            <kbd>⌘ K</kbd>
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
          <button className="sort-button">
            <Icon>↕</Icon> Sort: Popular
          </button>
        </div>
        <div className="lobby-section-chips">
          {[
            ["●", "Live now", `${rooms.filter((r) => r.status === "Live").length} rooms`],
            ["◷", "Starting soon", `${rooms.filter((r) => r.status === "Open" || r.status === "Scheduled").length} rooms`],
            ["✦", "Jackpot Bingo", `${money(topJackpotAmount)} live`],
            ["⚡", "Speed Bingo", "Next in 00:17"],
            ["♛", "VIP Bingo", "Tonight 21:00"],
          ].map((item) => (
            <button
              key={item[1]}
              onClick={() =>
                setFilter(
                  item[1].includes("Jackpot")
                    ? "Jackpots"
                    : item[1].includes("Speed")
                      ? "Speed"
                      : item[1].includes("Live")
                        ? "Live now"
                        : "All games",
                )
              }
            >
              <i>{item[0]}</i>
              <span>
                <b>{item[1]}</b>
                <small>{item[2]}</small>
              </span>
            </button>
          ))}
        </div>
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
