import { ArrowRight, Clock, Heart, Lightning, Ticket, UsersThree } from "@phosphor-icons/react";
import type { BingoRoomData } from "../../bingo-core";
import { StatusPill } from "../shared/StatusPill";
import { money } from "../shared/types";

export const roomArtwork: Record<string, string> = {
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

export function RoomCard({
  room,
  onEnter,
  favorite,
  toggleFavorite,
}: {
  room: BingoRoomData;
  onEnter: () => void;
  favorite: boolean;
  toggleFavorite: () => void;
}) {
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
        <img
          src={roomArtwork[room.id] ?? "/rooms/diamond-75.png"}
          alt={`${room.name} themed Bingo room preview`}
          width="960"
          height="540"
          loading="lazy"
        />
        <div className="room-card-top">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span className="room-tag">{room.tag}</span>
            {room.promotion && room.promotion !== "None" && (
              <span style={{ background: "rgba(254, 202, 87, 0.2)", border: "1px solid rgba(254, 202, 87, 0.6)", color: "#feca57", fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "10px" }}>
                🎁 {room.promotion}
              </span>
            )}
          </div>
          <button
            className={`favorite-button ${favorite ? "active" : ""}`}
            onClick={toggleFavorite}
            aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={favorite}
          >
            <Heart size={17} weight={favorite ? "fill" : "regular"} />
          </button>
        </div>
        <div className="room-card-artwork-footer">
          <StatusPill status={room.status} />
          <span className="room-card-round">
            <Clock size={13} weight="bold" />
            {roundLabel}
          </span>
        </div>
      </div>
      <div className="room-card-content">
        <div className="room-card-title-row">
          <div>
            <h3>{room.name}</h3>
            <p>{room.variant}</p>
          </div>
          <div className="room-card-prize">
            <small>{room.jackpot ? "JACKPOT" : "PRIZE"}</small>
            <strong>{money(room.jackpot ?? room.prize)}</strong>
          </div>
        </div>
        <div className="room-card-facts">
          <span>
            <Ticket size={16} weight="duotone" />
            <span>
              <small>TICKET</small>
              <b>{room.ticketPrice ? money(room.ticketPrice) : "FREE"}</b>
            </span>
          </span>
          <span>
            <UsersThree size={16} weight="duotone" />
            <span>
              <small>PLAYERS</small>
              <b>{room.players} / {room.maxPlayers}</b>
            </span>
          </span>
          <span>
            <Ticket size={16} weight="duotone" />
            <span>
              <small>CARD LIMIT</small>
              <b>Max {room.cardLimit ?? 8}</b>
            </span>
          </span>
          <span>
            <Lightning size={16} weight="duotone" />
            <span>
              <small>PACE</small>
              <b>{room.frequency ?? "Every 10 min"}</b>
            </span>
          </span>
        </div>
        <div className="room-card-capacity">
          <div>
            <span>{occupancy}% full</span>
            <span>{room.cardsSold.toLocaleString()} cards sold</span>
          </div>
          <div className="sales-progress" aria-label={`${occupancy}% of player capacity filled`}>
            <span style={{ width: `${occupancy}%` }} />
          </div>
        </div>
        <div className="room-card-bottom">
          <div className="room-card-pattern">
            <small>WINNING</small>
            <span>{room.pattern}</span>
          </div>
          <button onClick={onEnter}>
            {entryLabel}
            <ArrowRight size={15} weight="bold" />
          </button>
        </div>
      </div>
    </article>
  );
}
