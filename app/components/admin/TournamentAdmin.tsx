import { useEffect, useState } from "react";
import { apiClient } from "../../api-client";
import type { AdminAction } from "../shared/types";

export function TournamentAdmin({
  notify,
  openAction,
}: {
  notify: (message: string) => void;
  openAction: (action: AdminAction) => void;
}) {
  const [tournament, setTournament] = useState<{
    entryFee: number;
    prizePool: number;
    registeredPlayers: string[];
    maxPlayers: number;
  } | null>(null);

  useEffect(() => {
    apiClient.tournaments.list().then((list) => {
      const found = list?.find((t) => t.id === "weekend-cup") || list?.[0];
      if (found) {
        setTournament({
          entryFee: found.entryFee,
          prizePool: found.prizePool,
          registeredPlayers: found.registeredPlayers || [],
          maxPlayers: found.maxPlayers || 512,
        });
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="tournament-admin-grid">
      <section className="admin-card tournament-admin-feature">
        <div>
          <span className="status status-selling-tickets"><i /> Registration open</span>
          <h2>Trueigtech Weekend Cup</h2>
          <p>TRN-2026-0822 · 5-round progressive elimination</p>
        </div>
        <div className="tournament-admin-stats">
          <span>
            <small>ENTRY FEE</small>
            <b>{tournament ? `$${tournament.entryFee.toFixed(2)}` : "$8.00"}</b>
          </span>
          <span>
            <small>PRIZE POOL</small>
            <b>{tournament ? `$${tournament.prizePool.toLocaleString()}` : "$25,000"}</b>
          </span>
          <span>
            <small>PLAYERS</small>
            <b>{tournament ? `${tournament.registeredPlayers.length} / ${tournament.maxPlayers}` : "384 / 512"}</b>
          </span>
          <span>
            <small>STARTS</small>
            <b>22 Aug · 20:00</b>
          </span>
        </div>
        <div className="tournament-rounds">
          {["Qualifiers", "Round of 256", "Round of 128", "Semi Final", "Grand Final"].map((item, index) => (
            <div className={index === 0 ? "active" : ""} key={item}>
              <i>{index + 1}</i>
              <span>
                <b>{item}</b>
                <small>{index === 0 ? "512 players" : "Top half advance"}</small>
              </span>
            </div>
          ))}
        </div>
        <div className="pattern-actions">
          <button className="outline-button" onClick={() => openAction({ kind: "edit-tournament" })}>
            Edit tournament
          </button>
          <button className="admin-primary" onClick={() => notify("Tournament registration promoted to all eligible players.")}>
            Promote tournament
          </button>
        </div>
      </section>
      <aside className="admin-card">
        <div className="card-title">
          <div>
            <h2>Points rules</h2>
            <p>Current scoring model</p>
          </div>
          <button onClick={() => openAction({ kind: "edit-tournament" })}>Edit</button>
        </div>
        <div className="points-list">
          {[
            ["Line win", "10 pts"],
            ["Pattern win", "25 pts"],
            ["Full house", "50 pts"],
            ["Fast Bingo bonus", "+15 pts"],
            ["Round winner", "+40 pts"],
          ].map((row) => (
            <div key={row[0]}>
              <span>{row[0]}</span>
              <b>{row[1]}</b>
            </div>
          ))}
        </div>
        <button className="full-outline" onClick={() => openAction({ kind: "create-tournament" })}>
          + Create tournament
        </button>
      </aside>
    </div>
  );
}
