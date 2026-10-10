import { useEffect, useState } from "react";
import { apiClient, type PlayerModel } from "../../api-client";
import { Icon } from "../shared/Icon";
import type { AdminAction } from "../shared/types";

export function PlayersTable({ openAction }: { openAction: (action: AdminAction) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All account statuses");
  const [tierFilter, setTierFilter] = useState("All tiers");
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
        p.id ?? "USR-000",
        p.username ?? "Anonymous",
        p.tier ?? "Standard",
        p.lastLogin ?? "Recently",
        String(p.gamesPlayed ?? 0),
        `$${Number(p.totalEntry ?? 0).toLocaleString()}`,
        `$${Number(p.winnings ?? 0).toLocaleString()}`,
        `$${Number(p.balance ?? 0).toLocaleString()}`,
        p.status ?? "Active",
      ])
    : defaultPlayers;

  const isFiltered = search.trim() !== "" || statusFilter !== "All account statuses" || tierFilter !== "All tiers";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All account statuses");
    setTierFilter("All tiers");
  };

  const filtered = rawRows.filter((p) => {
    const matchSearch =
      p[0].toLowerCase().includes(search.toLowerCase()) ||
      p[1].toLowerCase().includes(search.toLowerCase()) ||
      p[2].toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All account statuses" || p[8] === statusFilter;
    const matchTier = tierFilter === "All tiers" || p[2] === tierFilter;
    return matchSearch && matchStatus && matchTier;
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
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                background: "none",
                border: "none",
                color: "#8a94a6",
                cursor: "pointer",
                padding: "0 6px",
                fontSize: "14px",
                lineHeight: 1,
              }}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All account statuses</option>
            <option>Active</option>
            <option>Restricted</option>
          </select>
          <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
            <option>All tiers</option>
            <option>Standard</option>
            <option>VIP</option>
            <option>Restricted</option>
          </select>
          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              style={{
                background: "rgba(235, 87, 87, 0.15)",
                border: "1px solid rgba(235, 87, 87, 0.3)",
                color: "#ff7675",
                cursor: "pointer",
              }}
              title="Reset all filters"
            >
              ✕ Clear filters
            </button>
          )}
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
