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

  const handleTogglePoker = (id: string, currentEnabled: boolean) => {
    const nextVal = !currentEnabled;
    apiClient.admin.updatePlayerPokerAccess(id, nextVal).then((res) => {
      if (res?.success) {
        setPlayersList((prev) =>
          prev.map((p) => (p.id === id || p.username === id ? { ...p, poker_enabled: nextVal } : p))
        );
      }
    }).catch(() => {});
  };

  const filtered = playersList.filter((p) => {
    const matchSearch =
      (p.id || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.username || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.tier || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All account statuses" || (p.status || "Active") === statusFilter;
    const matchTier = tierFilter === "All tiers" || (p.tier || "Standard") === tierFilter;
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
              <th>Poker</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((player) => (
              <tr key={player.id}>
                <td>
                  <div className="table-player">
                    <span>{player.username.slice(0, 2).toUpperCase()}</span>
                    <b>
                      {player.username}
                      <small>{player.id}</small>
                    </b>
                  </div>
                </td>
                <td>{player.tier}</td>
                <td>{player.lastLogin || "Recently"}</td>
                <td>{player.gamesPlayed ?? 0}</td>
                <td>${Number(player.totalEntry ?? 0).toLocaleString()}</td>
                <td>${Number(player.winnings ?? player.totalPrizes ?? 0).toLocaleString()}</td>
                <td>${Number(player.balance ?? 0).toLocaleString()}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleTogglePoker(player.id, Boolean(player.poker_enabled))}
                    style={{
                      background: player.poker_enabled ? "rgba(34, 197, 94, 0.2)" : "rgba(148, 163, 184, 0.15)",
                      border: `1px solid ${player.poker_enabled ? "#22c55e" : "#64748b"}`,
                      color: player.poker_enabled ? "#4ade80" : "#94a3b8",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    title={player.poker_enabled ? "Poker Online Active - Click to disable" : "Poker Online Disabled - Click to enable"}
                  >
                    <span style={{ fontSize: "9px" }}>{player.poker_enabled ? "●" : "○"}</span>
                    {player.poker_enabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
                <td>
                  <span className={`table-status ${player.status === "Active" ? "success" : "warning"}`}>
                    {player.status}
                  </span>
                </td>
                <td>
                  <button onClick={() => openAction({ kind: "player", label: player.username })}>
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

