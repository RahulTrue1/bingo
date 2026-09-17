import { useState } from "react";
import { apiClient } from "../../api-client";
import type { BingoRoomData } from "../../bingo-core";
import { Icon } from "../shared/Icon";
import { StatusPill } from "../shared/StatusPill";
import { money, type AdminAction } from "../shared/types";

export function RoomManagement({
  rooms,
  setRooms,
  openAction,
  notify,
}: {
  rooms: BingoRoomData[];
  setRooms: (rooms: BingoRoomData[]) => void;
  openAction: (action: AdminAction) => void;
  notify: (message: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [price, setPrice] = useState(0);

  const savePrice = (id: string) => {
    apiClient.rooms.update(id, { ticketPrice: price });
    setRooms(rooms.map((room) => (room.id === id ? { ...room, ticketPrice: price } : room)));
    setEditing(null);
    notify("Ticket pricing updated and audit log created.");
  };

  return (
    <div className="admin-card data-card">
      <div className="data-toolbar">
        <div className="search-box compact">
          <Icon>⌕</Icon>
          <input placeholder="Search rooms" aria-label="Search rooms" />
        </div>
        <div>
          <select>
            <option>All variants</option>
            <option>75-Ball</option>
            <option>90-Ball</option>
            <option>80-Ball</option>
            <option>30-Ball</option>
          </select>
          <select>
            <option>All statuses</option>
            <option>Live</option>
            <option>Open</option>
          </select>
          <button>☷ Columns</button>
        </div>
      </div>
      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Status</th>
              <th>Variant</th>
              <th>Ticket</th>
              <th>Players</th>
              <th>Target RTP</th>
              <th>Prize / Jackpot</th>
              <th>Winning stages</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td>
                  <div className="table-room">
                    <span className={`mini-orb accent-${room.accent}`}>{room.variant.match(/\d+/)?.[0] ?? "T"}</span>
                    <div>
                      <b>{room.name}</b>
                      <small>{room.id.toUpperCase()}</small>
                    </div>
                  </div>
                </td>
                <td><StatusPill status={room.status} /></td>
                <td>{room.variant}</td>
                <td>
                  {editing === room.id ? (
                    <span className="inline-edit">
                      <input
                        type="number"
                        value={price}
                        min="0"
                        step="0.5"
                        onChange={(event) => setPrice(Number(event.target.value))}
                      />
                      <button onClick={() => savePrice(room.id)}>✓</button>
                    </span>
                  ) : (
                    <button
                      className="table-link"
                      onClick={() => {
                        setEditing(room.id);
                        setPrice(room.ticketPrice);
                      }}
                    >
                      {room.ticketPrice ? money(room.ticketPrice) : "Free"} ✎
                    </button>
                  )}
                </td>
                <td>{room.players} / {room.maxPlayers}</td>
                <td>
                  <span className="speed-label">
                    {room.rtp ?? 78}% · {room.rtpMode === "dynamic" ? "Dynamic" : "Fixed"}
                  </span>
                </td>
                <td><b>{money(room.jackpot ?? room.prize)}</b></td>
                <td>
                  <span className="speed-label">
                    {room.winningStages?.length ?? 1} · {room.winningStages?.map((stage) => stage.name).join(" → ") ?? room.pattern}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      onClick={() => {
                        apiClient.rooms.duplicate(room.id);
                        setRooms([...rooms, { ...room, id: `${room.id}-copy`, name: `${room.name} Copy`, status: "Open" }]);
                        notify(`${room.name} duplicated.`);
                      }}
                    >
                      Duplicate
                    </button>
                    <button onClick={() => openAction({ kind: "edit-room", room })}>Edit</button>
                    <button onClick={() => openAction({ kind: "edit-room", room })}>Configure</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>Showing {rooms.length} playable rooms</span>
        <button className="admin-primary" onClick={() => openAction({ kind: "create-room" })}>
          + Create another room
        </button>
      </div>
    </div>
  );
}
