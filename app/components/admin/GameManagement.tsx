import { useState } from "react";
import type { BingoRoomData } from "../../bingo-core";
import type { AdminAction } from "../shared/types";

export function GameManagement({
  rooms,
  openAction,
  notify,
}: {
  rooms: BingoRoomData[];
  openAction: (action: AdminAction) => void;
  notify: (message: string) => void;
}) {
  const [states, setStates] = useState<Record<string, string>>({
    "trueig-90": "Scheduled",
    "turbo-30": "Live",
    "diamond-75": "Live",
    "mega-jackpot": "Selling",
  });

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
              <th>Winning stages</th>
              <th>Start</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.slice(0, 8).map((room, index) => (
              <tr key={room.id}>
                <td>
                  <button className="table-link" onClick={() => openAction({ kind: "create-game", room })}>
                    TRUEIG-{3000 + index}
                  </button>
                </td>
                <td><b>{room.name}</b></td>
                <td>{room.variant}</td>
                <td>
                  <span className="speed-label">
                    {room.winningStages?.map((stage) => stage.name).join(" → ") ?? room.pattern}
                  </span>
                </td>
                <td>{index < 2 ? "Today · 18:00" : `Today · ${19 + index}:00`}</td>
                <td>
                  <span className={`table-status ${states[room.id] === "Live" ? "success" : "warning"}`}>
                    {states[room.id] ?? "Scheduled"}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button onClick={() => openAction({ kind: "create-game", room })}>Configure</button>
                    <button
                      onClick={() => {
                        setStates((items) => ({ ...items, [room.id]: "Scheduled" }));
                        notify(`${room.name} scheduled.`);
                      }}
                    >
                      Schedule
                    </button>
                    <button
                      onClick={() => {
                        setStates((items) => ({ ...items, [room.id]: "Live" }));
                        notify(`${room.name} started immediately.`);
                      }}
                    >
                      Start now
                    </button>
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
