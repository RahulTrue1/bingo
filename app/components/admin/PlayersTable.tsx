import { useEffect, useState } from "react";
import { apiClient, type PlayerModel } from "../../api-client";
import { Icon } from "../shared/Icon";
import type { AdminAction } from "../shared/types";

export function PlayersTable({ openAction }: { openAction: (action: AdminAction) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All account statuses");
  const [playersList, setPlayersList] = useState<PlayerModel[]>([]);

  useEffect(() => {
    apiClient.admin.players().then((data) => {
      if (data && data.length > 0) setPlayersList(data);
    }).catch(() => {});
  }, []);

  const defaultPlayers = [
    ["USR-10482", "TrueigQueen", "VIP", "Today · 14:29", "842", "$18,420", "$24,860", "$12,480", "Active"],
    ["USR-09814", "MikaK", "Standard", "Today · 14:18", "420", "$8,260", "$7,980", "$4,820", "Active"],
    ["USR-11804", "Ari.R", "Standard", "Today · 14:21", "128", "$2,180", "$2,840", "$248", "Active"],
    ["USR-07226", "RiskyB", "Restricted", "Yesterday", "294", "$12,840", "$8,250", "$0", "Restricted"],
  ];

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

  return (
    <div className="admin-card data-card">
      <div className="data-toolbar">
        <div className="search-box compact">
          <Icon>⌕</Icon>
          <input
            placeholder="Search by username or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All account statuses</option>
            <option>Active</option>
            <option>Restricted</option>
          </select>
          <button>Advanced filters</button>
        </div>
      </div>
      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Tier</th>
              <th>Last login</th>
              <th>Games</th>
              <th>Total entry</th>
              <th>Winnings</th>
              <th>Balance</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((player) => (
              <tr key={player[0]}>
                <td>
                  <div className="table-player">
                    <span>{player[1].slice(0, 2).toUpperCase()}</span>
                    <b>
                      {player[1]}
                      <small>{player[0]}</small>
                    </b>
                  </div>
                </td>
                {player.slice(2).map((cell, index) => (
                  <td key={index}>
                    {index === 5 ? (
                      <span className={`table-status ${cell === "Active" ? "success" : "warning"}`}>
                        {cell}
                      </span>
                    ) : index === 6 ? (
                      <button onClick={() => openAction({ kind: "player", label: player[1] })}>
                        View →
                      </button>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
