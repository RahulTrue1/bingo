import { useEffect, useState } from "react";
import { apiClient, type BingoCardModel } from "../../api-client";
import type { BingoRoomData } from "../../bingo-core";

export function PlayerTicketsView({
  rooms,
  enterRoom,
}: {
  rooms: BingoRoomData[];
  enterRoom: (room: BingoRoomData) => void;
}) {
  const [tickets, setTickets] = useState<BingoCardModel[]>([]);

  useEffect(() => {
    apiClient.tickets
      .list()
      .then((list) => {
        if (list && list.length > 0) setTickets(list);
      })
      .catch(() => {});
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
            const room =
              rooms.find((r) => r.id === ticket.roomId) ??
              rooms[0] ?? {
                id: ticket.roomId || "diamond-75",
                name: "Diamond 75",
                variant: ticket.variant || "75-Ball Pattern",
                status: "Live" as const,
                ticketPrice: 2,
                prize: 1500,
                players: 100,
                maxPlayers: 400,
                cardsSold: 200,
                startsIn: "Soon",
                pattern: "Diamond",
                accent: "violet",
                tag: "PATTERN",
              };

            // Safely extract card numbers whether from 2D numbers, 1D numbers, cells array, or fallback
            const flatNums: Array<number | "FREE" | string | null> = (() => {
              if (Array.isArray(ticket.numbers) && ticket.numbers.length > 0) {
                return Array.isArray(ticket.numbers[0])
                  ? (ticket.numbers as unknown as Array<Array<number | string | null>>).flat()
                  : (ticket.numbers as unknown as Array<number | string | null>);
              }
              if (Array.isArray(ticket.cells) && ticket.cells.length > 0) {
                return ticket.cells.map((c) => c.value);
              }
              const len = room.cardRows && room.cardColumns ? Math.min(25, room.cardRows * room.cardColumns) : 25;
              return Array.from({ length: len }, (_, cell) => (cell * 7 + index * 3) % 75 + 1);
            })();

            // Safely determine if a cell is marked
            const isMarked = (num: number | "FREE" | string | null, cellIndex: number): boolean => {
              if (num === "FREE" || num === 0) return true;
              if (!ticket.daubed || !Array.isArray(ticket.daubed) || ticket.daubed.length === 0) return false;

              // If 2D boolean array
              if (Array.isArray(ticket.daubed[0])) {
                const flat = (ticket.daubed as unknown as boolean[][]).flat();
                return Boolean(flat[cellIndex]);
              }

              // If 1D boolean array
              if (typeof ticket.daubed[0] === "boolean") {
                return Boolean(ticket.daubed[cellIndex]);
              }

              // If array of called numbers (backend format: number[])
              if (typeof num === "number") {
                return (ticket.daubed as number[]).includes(num);
              }

              return false;
            };

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
                  {flatNums.slice(0, 25).map((num, cell) => (
                    <i className={isMarked(num, cell) ? "marked" : ""} key={cell}>
                      {num === 0 || num === "FREE" ? "★" : num === null ? "" : num}
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
