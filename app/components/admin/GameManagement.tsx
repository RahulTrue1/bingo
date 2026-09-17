import { useState } from "react";
import { apiClient } from "../../api-client";
import type { BingoRoomData, BingoStatus } from "../../bingo-core";
import { StatusPill } from "../shared/StatusPill";
import type { AdminAction } from "../shared/types";

const statusOptions: BingoStatus[] = [
  "Live",
  "Starting Soon",
  "Selling Tickets",
  "Open",
  "Scheduled",
  "Paused",
];

export function GameManagement({
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
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (roomId: string, newStatus: BingoStatus) => {
    setUpdatingId(roomId);
    try {
      const res = await apiClient.rooms.update(roomId, { status: newStatus });
      const updated = res?.room;
      setRooms(rooms.map((r) => (r.id === roomId ? (updated ?? { ...r, status: newStatus }) : r)));
      notify(`✓ ${rooms.find((r) => r.id === roomId)?.name ?? roomId} is now "${newStatus}". Synced to player lobby.`);
    } catch {
      notify(`Failed to update status for ${roomId}.`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-card data-card">
      <div className="game-builder-banner">
        <div>
          <span className="section-kicker">MULTI-STAGE GAME ENGINE</span>
          <h2>Build a complete Bingo game</h2>
          <p>Choose a room, configure winning stages, then schedule or start immediately.</p>
        </div>
        <button className="admin-primary" onClick={() => openAction({ kind: "create-game" })}>
          + Create Bingo game
        </button>
      </div>
      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>Game</th>
              <th>Room</th>
              <th>Variant</th>
              <th>Ticket</th>
              <th>Prize</th>
              <th>Card Limit</th>
              <th>Winning stages</th>
              <th>Start</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.slice(0, 10).map((room, index) => (
              <tr key={room.id}>
                <td>
                  <button className="table-link" onClick={() => openAction({ kind: "create-game", room })}>
                    TRUEIG-{3000 + index}
                  </button>
                </td>
                <td><b>{room.name}</b></td>
                <td>{room.variant}</td>
                <td><b style={{ color: "#2bddaa" }}>{room.ticketPrice > 0 ? `$${room.ticketPrice.toFixed(2)}` : "Free"}</b></td>
                <td><b style={{ color: "#f1c962" }}>${room.prize?.toLocaleString()}</b></td>
                <td><span style={{ color: "#74b9ff", fontSize: "12px", fontWeight: 600 }}>{room.cardLimit ?? 8} cards</span></td>
                <td>
                  <span className="speed-label">
                    {room.winningStages?.map((stage) => stage.name).join(" → ") ?? room.pattern}
                  </span>
                </td>
                <td>{index < 2 ? "Today · 18:00" : `Today · ${19 + index}:00`}</td>
                <td>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <StatusPill status={room.status} />
                    <select
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "inherit",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "6px",
                        fontSize: "11px",
                        padding: "2px 4px",
                        cursor: "pointer",
                      }}
                      value={room.status}
                      disabled={updatingId === room.id}
                      onChange={(e) => handleStatusChange(room.id, e.target.value as BingoStatus)}
                      title="Change live room status"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt} style={{ background: "#1c1b2f", color: "#fff" }}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td>
                  <div className="table-actions">
                    <button onClick={() => openAction({ kind: "create-game", room })}>Configure</button>
                    {room.status !== "Scheduled" && (
                      <button
                        disabled={updatingId === room.id}
                        onClick={() => handleStatusChange(room.id, "Scheduled")}
                      >
                        Schedule
                      </button>
                    )}
                    {room.status !== "Live" && (
                      <button
                        disabled={updatingId === room.id}
                        style={{ color: "var(--accent, #27d7ad)", fontWeight: 700 }}
                        onClick={() => handleStatusChange(room.id, "Live")}
                      >
                        Start now
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
