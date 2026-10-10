import { useEffect, useRef, useState } from "react";
import { apiClient } from "../../api-client";
import type { BingoRoomData, BingoStatus } from "../../bingo-core";
import { Icon } from "../shared/Icon";
import { StatusPill } from "../shared/StatusPill";
import { money, type AdminAction } from "../shared/types";

const statusList: BingoStatus[] = [
  "Live",
  "Starting Soon",
  "Selling Tickets",
  "Open",
  "Scheduled",
  "Paused",
];

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

  // Filters state
  const [search, setSearch] = useState("");
  const [variantFilter, setVariantFilter] = useState("All variants");
  const [statusFilter, setStatusFilter] = useState("All statuses");

  // Column visibility state
  const [columns, setColumns] = useState({
    room: true,
    status: true,
    variant: true,
    ticket: true,
    players: true,
    rtp: true,
    prize: true,
    stages: true,
    actions: true,
  });
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  // Sort state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Close columns dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(event.target as Node)) {
        setShowColumnsMenu(false);
      }
    }
    if (showColumnsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColumnsMenu]);

  const savePrice = (id: string) => {
    apiClient.rooms.update(id, { ticketPrice: price });
    setRooms(rooms.map((room) => (room.id === id ? { ...room, ticketPrice: price } : room)));
    setEditing(null);
    notify("Ticket pricing updated and audit log created.");
  };

  const saveStatus = async (id: string, newStatus: BingoStatus) => {
    try {
      const res = await apiClient.rooms.update(id, { status: newStatus });
      setRooms(rooms.map((room) => (room.id === id ? (res ?? { ...room, status: newStatus }) : room)));
      notify(`✓ ${rooms.find((r) => r.id === id)?.name ?? id} status changed to "${newStatus}". Synced to player lobby.`);
    } catch {
      notify(`Failed to update status for ${id}.`);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Filter logic
  const isFiltered = search.trim() !== "" || variantFilter !== "All variants" || statusFilter !== "All statuses";

  const resetFilters = () => {
    setSearch("");
    setVariantFilter("All variants");
    setStatusFilter("All statuses");
  };

  const filteredRooms = rooms.filter((room) => {
    // 1. Search text filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchSearch =
        room.name.toLowerCase().includes(q) ||
        room.id.toLowerCase().includes(q) ||
        room.variant.toLowerCase().includes(q) ||
        (room.pattern && room.pattern.toLowerCase().includes(q)) ||
        (room.tag && room.tag.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }

    // 2. Variant filter
    if (variantFilter !== "All variants") {
      const vf = variantFilter.toLowerCase().replace("-ball", "");
      const matchVariant =
        room.variant.toLowerCase().includes(vf) ||
        room.variant.toLowerCase().includes(variantFilter.toLowerCase());
      if (!matchVariant) return false;
    }

    // 3. Status filter
    if (statusFilter !== "All statuses") {
      if (room.status !== statusFilter) return false;
    }

    return true;
  });

  // Sort logic
  const sortedRooms = [...filteredRooms].sort((a, b) => {
    if (!sortKey) return 0;
    let valA: string | number = "";
    let valB: string | number = "";
    switch (sortKey) {
      case "room":
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
        break;
      case "status":
        valA = a.status;
        valB = b.status;
        break;
      case "variant":
        valA = a.variant;
        valB = b.variant;
        break;
      case "ticket":
        valA = a.ticketPrice;
        valB = b.ticketPrice;
        break;
      case "players":
        valA = a.players;
        valB = b.players;
        break;
      case "rtp":
        valA = a.rtp ?? 78;
        valB = b.rtp ?? 78;
        break;
      case "prize":
        valA = a.jackpot ?? a.prize ?? 0;
        valB = b.jackpot ?? b.prize ?? 0;
        break;
      default:
        return 0;
    }
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  return (
    <div className="admin-card data-card">
      <div className="data-toolbar">
        <div className="search-box compact">
          <Icon>⌕</Icon>
          <input
            placeholder="Search rooms"
            aria-label="Search rooms"
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
          <select
            value={variantFilter}
            onChange={(e) => setVariantFilter(e.target.value)}
            aria-label="Filter by variant"
          >
            <option>All variants</option>
            <option>75-Ball</option>
            <option>90-Ball</option>
            <option>80-Ball</option>
            <option>30-Ball</option>
            <option>Tournament</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option>All statuses</option>
            {statusList.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <div ref={columnsMenuRef} style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              onClick={() => setShowColumnsMenu((prev) => !prev)}
              style={{
                background: showColumnsMenu ? "rgba(255,255,255,0.14)" : undefined,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              ☷ Columns
            </button>
            {showColumnsMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 4px)",
                  background: "#1c1b2f",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  zIndex: 100,
                  minWidth: "175px",
                  padding: "8px 0",
                  color: "#fff",
                }}
              >
                <div
                  style={{
                    padding: "4px 12px 8px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 600,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>Toggle Columns</span>
                  <button
                    type="button"
                    onClick={() =>
                      setColumns({
                        room: true,
                        status: true,
                        variant: true,
                        ticket: true,
                        players: true,
                        rtp: true,
                        prize: true,
                        stages: true,
                        actions: true,
                      })
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "#74b9ff",
                      fontSize: "11px",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Reset
                  </button>
                </div>
                {(
                  [
                    ["room", "Room"],
                    ["status", "Status"],
                    ["variant", "Variant"],
                    ["ticket", "Ticket"],
                    ["players", "Players"],
                    ["rtp", "Target RTP"],
                    ["prize", "Prize / Jackpot"],
                    ["stages", "Winning stages"],
                    ["actions", "Actions"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={columns[key]}
                      onChange={(e) =>
                        setColumns((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      style={{ cursor: "pointer", accentColor: "#6c5ce7" }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
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
              {columns.room && (
                <th
                  onClick={() => handleSort("room")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Click to sort by room name"
                >
                  Room {sortKey === "room" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              )}
              {columns.status && (
                <th
                  onClick={() => handleSort("status")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Click to sort by status"
                >
                  Status {sortKey === "status" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              )}
              {columns.variant && (
                <th
                  onClick={() => handleSort("variant")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Click to sort by variant"
                >
                  Variant {sortKey === "variant" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              )}
              {columns.ticket && (
                <th
                  onClick={() => handleSort("ticket")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Click to sort by ticket price"
                >
                  Ticket {sortKey === "ticket" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              )}
              {columns.players && (
                <th
                  onClick={() => handleSort("players")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Click to sort by players count"
                >
                  Players {sortKey === "players" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              )}
              {columns.rtp && (
                <th
                  onClick={() => handleSort("rtp")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Click to sort by RTP"
                >
                  Target RTP {sortKey === "rtp" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              )}
              {columns.prize && (
                <th
                  onClick={() => handleSort("prize")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Click to sort by prize/jackpot"
                >
                  Prize / Jackpot {sortKey === "prize" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              )}
              {columns.stages && <th>Winning stages</th>}
              {columns.actions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedRooms.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumnCount || 1}
                  style={{ textAlign: "center", padding: "48px 20px" }}
                >
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#8a94a6", marginBottom: "8px" }}>
                    No rooms match your filter criteria
                  </div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "16px" }}>
                    Try clearing the search query or changing the variant and status dropdowns.
                  </div>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="admin-primary"
                    style={{ padding: "6px 14px", fontSize: "12px" }}
                  >
                    Reset all filters
                  </button>
                </td>
              </tr>
            ) : (
              sortedRooms.map((room) => (
                <tr key={room.id}>
                  {columns.room && (
                    <td>
                      <div className="table-room">
                        <span className={`mini-orb accent-${room.accent}`}>{room.variant.match(/\d+/)?.[0] ?? "T"}</span>
                        <div>
                          <b>{room.name}</b>
                          <small>{room.id.toUpperCase()}</small>
                        </div>
                      </div>
                    </td>
                  )}
                  {columns.status && (
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
                          onChange={(e) => saveStatus(room.id, e.target.value as BingoStatus)}
                          title="Change live room status"
                        >
                          {statusList.map((st) => (
                            <option key={st} value={st} style={{ background: "#1c1b2f", color: "#fff" }}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  )}
                  {columns.variant && <td>{room.variant}</td>}
                  {columns.ticket && (
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
                  )}
                  {columns.players && <td>{room.players} / {room.maxPlayers}</td>}
                  {columns.rtp && (
                    <td>
                      <span className="speed-label">
                        {room.rtp ?? 78}% · {room.rtpMode === "dynamic" ? "Dynamic" : "Fixed"}
                      </span>
                    </td>
                  )}
                  {columns.prize && <td><b>{money(room.jackpot ?? room.prize)}</b></td>}
                  {columns.stages && (
                    <td>
                      <span className="speed-label">
                        {room.winningStages?.length ?? 1} · {room.winningStages?.map((stage) => stage.name).join(" → ") ?? room.pattern}
                      </span>
                    </td>
                  )}
                  {columns.actions && (
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
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>
          Showing {sortedRooms.length} of {rooms.length} playable rooms
          {isFiltered && ` (filtered from ${rooms.length})`}
        </span>
        <button className="admin-primary" onClick={() => openAction({ kind: "create-room" })}>
          + Create another room
        </button>
      </div>
    </div>
  );
}
