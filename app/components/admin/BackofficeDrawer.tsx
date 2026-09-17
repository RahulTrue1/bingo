import { FormEvent, useState } from "react";
import { apiClient } from "../../api-client";
import { BingoRoomData, BingoStatus, RTPEngine, RtpMode } from "../../bingo-core";
import type { AdminAction } from "../shared/types";
import { DrawerSpecialForm } from "./DrawerSpecialForm";

export function DrawerHeader({ title, close }: { title: string; close: () => void }) {
  return (
    <div className="drawer-header">
      <div>
        <span className="section-kicker">TRUEIGTECH BACKOFFICE</span>
        <h2>{title}</h2>
        <p>Changes update the connected demo state immediately.</p>
      </div>
      <button onClick={close}>×</button>
    </div>
  );
}

export function BackofficeDrawer({
  action,
  close,
  rooms,
  setRooms,
  notify,
}: {
  action: AdminAction;
  close: () => void;
  rooms: BingoRoomData[];
  setRooms: (rooms: BingoRoomData[]) => void;
  notify: (message: string) => void;
}) {
  const editingRoom = action.room;
  const isGame = action.kind === "create-game";
  const isCreatingNew = isGame && !editingRoom;
  const [name, setName] = useState(editingRoom?.name ?? (isCreatingNew ? "Trueig Mega 75" : "Trueig 90 Classic"));
  const [variant, setVariant] = useState(editingRoom?.variant ?? (isCreatingNew ? "75-Ball Pattern" : "90-Ball Classic"));
  const [status, setStatus] = useState<BingoStatus>(editingRoom?.status ?? (isGame ? "Live" : "Open"));
  const [gameRoomId, setGameRoomId] = useState(editingRoom?.id ?? (isCreatingNew ? "new" : rooms[0]?.id ?? "trueig-90"));
  const [price, setPrice] = useState(editingRoom?.ticketPrice ?? (isCreatingNew ? 1 : 0.5));
  const [prize, setPrize] = useState(editingRoom?.prize ?? (isCreatingNew ? 500 : 274));
  const [confirm, setConfirm] = useState<"delete" | "disable" | null>(null);
  const [stages, setStages] = useState(
    editingRoom?.winningStages ?? [
      { name: "One Line", prize: isCreatingNew ? 100 : 50, continueAfterWin: true },
      { name: "Two Lines", prize: 80, continueAfterWin: true },
      { name: "Full House", prize: isCreatingNew ? 400 : 140, continueAfterWin: false },
    ],
  );
  const [rtp, setRtp] = useState(editingRoom?.rtp ?? 80);
  const [rtpMode, setRtpMode] = useState<RtpMode>(editingRoom?.rtpMode ?? "dynamic");
  const [customRtp, setCustomRtp] = useState(editingRoom?.customRtp ?? Boolean(editingRoom?.rtp));

  // Game specific state
  const [gameDate, setGameDate] = useState("2026-08-22");
  const [gameStartTime, setGameStartTime] = useState(editingRoom?.startsIn ?? "18:00");
  const [gameSpeed, setGameSpeed] = useState(editingRoom?.callDelay === 600 ? "Turbo" : "Fast");
  const [gameMaxPlayers, setGameMaxPlayers] = useState(editingRoom?.maxPlayers ?? 300);
  const [gameCardLimit, setGameCardLimit] = useState(8);
  const [gameJackpot, setGameJackpot] = useState(editingRoom?.jackpot ? "Mega Trueig Jackpot" : "None");
  const [gamePromotion, setGamePromotion] = useState("None");
  const [gameFrequency, setGameFrequency] = useState(editingRoom?.frequency ?? (isCreatingNew ? "Every 10 min" : "One time"));

  const handleSelectGameRoom = (targetId: string) => {
    setGameRoomId(targetId);
    if (targetId === "new") {
      setName("Trueig Mega 75");
      setVariant("75-Ball Pattern");
      setPrice(1);
      setPrize(500);
      setStatus("Live");
      setStages([
        { name: "One Line", prize: 100, continueAfterWin: true },
        { name: "Full House", prize: 400, continueAfterWin: false },
      ]);
      setGameMaxPlayers(300);
      setGameCardLimit(8);
      setGameJackpot("None");
      setGamePromotion("None");
      setGameFrequency("Every 10 min");
      setGameStartTime("18:00");
    } else {
      const selected = rooms.find((r) => r.id === targetId);
      if (selected) {
        setName(selected.name);
        setVariant(selected.variant);
        setPrice(selected.ticketPrice);
        setPrize(selected.prize);
        setStatus(selected.status);
        if (selected.winningStages && selected.winningStages.length > 0) {
          setStages(selected.winningStages);
        }
        if (selected.maxPlayers) setGameMaxPlayers(selected.maxPlayers);
        if (selected.startsIn) setGameStartTime(selected.startsIn);
        setGameJackpot(selected.jackpot ? "Mega Trueig Jackpot" : "None");
        if (selected.frequency) setGameFrequency(selected.frequency);
        if (selected.callDelay) setGameSpeed(selected.callDelay <= 700 ? "Turbo" : selected.callDelay <= 1300 ? "Fast" : "Normal");
      }
    }
  };

  const saveGameWithStatus = async (customStatus?: BingoStatus) => {
    const finalStatus: BingoStatus = customStatus || status || "Live";
    if (gameRoomId === "new") {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `game-${Date.now()}`;
      const newGame: BingoRoomData = {
        id,
        name,
        variant,
        status: finalStatus,
        ticketPrice: Number(price) || 0,
        prize: Number(prize) || 0,
        players: 0,
        maxPlayers: Number(gameMaxPlayers) || 300,
        cardsSold: 0,
        startsIn: gameStartTime || "18:00",
        pattern: stages.map((stage) => stage.name).join(" → ") || "One Line",
        accent: variant.includes("90") ? "teal" : variant.includes("30") ? "coral" : variant.includes("80") ? "blue" : "violet",
        tag: "NEW",
        frequency: gameFrequency || "Every 10 min",
        cardRows: variant.includes("90") ? 3 : variant.includes("30") ? 3 : variant.includes("80") ? 4 : 5,
        cardColumns: variant.includes("90") ? 9 : variant.includes("30") ? 3 : variant.includes("80") ? 4 : 5,
        callDelay: gameSpeed === "Turbo" ? 600 : gameSpeed === "Fast" ? 1200 : 1800,
        winningStages: stages,
        rtp: 80,
        rtpMode: "dynamic",
        customRtp: false,
        jackpot: gameJackpot !== "None" ? 125480 : undefined,
      };
      await apiClient.rooms.create(newGame);
      setRooms([...rooms, newGame]);
      notify(`✓ New Bingo game "${newGame.name}" created (${finalStatus}) and published to player lobby!`);
    } else {
      const target = rooms.find((r) => r.id === gameRoomId);
      const updates: Partial<BingoRoomData> = {
        name,
        variant,
        status: finalStatus,
        ticketPrice: Number(price) || 0,
        prize: Number(prize) || 0,
        maxPlayers: Number(gameMaxPlayers) || 300,
        callDelay: gameSpeed === "Turbo" ? 600 : gameSpeed === "Fast" ? 1200 : 1800,
        winningStages: stages,
        pattern: stages.map((stage) => stage.name).join(" → ") || "One Line",
        jackpot: gameJackpot !== "None" ? 125480 : undefined,
        startsIn: gameStartTime || target?.startsIn || "18:00",
        frequency: gameFrequency || target?.frequency,
      };
      const res = await apiClient.rooms.update(gameRoomId, updates);
      setRooms(
        rooms.map((r) => (r.id === gameRoomId ? (res?.room ?? { ...r, ...updates }) : r)),
      );
      notify(`✓ Game "${target?.name ?? gameRoomId}" updated (${finalStatus}) and synced across player screens!`);
    }
  };

  const titleMap: Record<string, string> = {
    "create-room": "Create Bingo Room",
    "edit-room": `Edit ${editingRoom?.name ?? "Room"}`,
    "create-game": editingRoom || (gameRoomId && gameRoomId !== "new") ? `Configure Game · ${name}` : "Create Bingo Game",
    "caller-config": "Number Caller Configuration",
    "create-jackpot": "Create Jackpot",
    "edit-jackpot": "Edit Mega Trueig Jackpot",
    "create-tournament": "Create Tournament",
    "edit-tournament": "Edit Tournament",
    "create-banner": "Create Hero Banner",
    "edit-banner": "Edit Hero Banner",
    player: `Player Profile · ${action.label ?? "Ari.R"}`,
    promotion: `${action.label ? "Edit" : "Create"} Promotion`,
    announcement: "Create System Announcement",
    notifications: "Notification Center",
    "manual-call": "Manual Ball Call",
    "declare-winner": "Declare Winner",
    "report-drilldown": `${action.label ?? "Performance"} Breakdown`,
    report: "Report Builder",
    settings: "Trueigtech Platform Settings",
    "live-control": `Live Control · ${action.label ?? "Diamond 75"}`,
    "apply-global-rtp": "Network RTP Settings",
  };
  const title = titleMap[action.kind] ?? action.label ?? "Configure Module";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (action.kind === "create-room") {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const newRoom: BingoRoomData = {
        id,
        name,
        variant,
        status: status || "Open",
        ticketPrice: price,
        prize,
        players: 0,
        maxPlayers: 300,
        cardsSold: 0,
        startsIn: "15:00",
        pattern: stages.map((stage) => stage.name).join(" → "),
        accent: "violet",
        tag: "NEW",
        frequency: "Every 10 min",
        cardRows: variant.includes("90") ? 3 : variant.includes("30") ? 3 : variant.includes("80") ? 4 : 5,
        cardColumns: variant.includes("90") ? 9 : variant.includes("30") ? 3 : variant.includes("80") ? 4 : 5,
        winningStages: stages,
        rtp,
        rtpMode,
        customRtp,
      };
      await apiClient.rooms.create(newRoom);
      setRooms([...rooms, newRoom]);
      notify(`✓ Room "${newRoom.name}" created and added to lobby.`);
    } else if (action.kind === "edit-room" && editingRoom) {
      const res = await apiClient.rooms.update(editingRoom.id, {
        name,
        variant,
        status,
        ticketPrice: price,
        prize,
        winningStages: stages,
        pattern: stages.map((stage) => stage.name).join(" → "),
        rtp,
        rtpMode,
        customRtp,
      });
      setRooms(
        rooms.map((room) =>
          room.id === editingRoom.id
            ? (res?.room ?? {
                ...room,
                name,
                variant,
                status,
                ticketPrice: price,
                prize,
                winningStages: stages,
                pattern: stages.map((stage) => stage.name).join(" → "),
                rtp,
                rtpMode,
                customRtp,
              })
            : room,
        ),
      );
      notify(`✓ Room "${editingRoom.name}" saved successfully.`);
    } else if (action.kind === "create-game") {
      await saveGameWithStatus();
    }
    close();
  };

  const moveStage = (index: number, direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    setStages((items) => {
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const stagesEditor = (
    <div className="stage-editor">
      <div className="drawer-section-title">
        <div>
          <h3>Winning stage configuration</h3>
          <p>Winners can be paid without ending the round.</p>
        </div>
        <button
          type="button"
          onClick={() => setStages((items) => [...items, { name: "New Stage", prize: 100, continueAfterWin: true }])}
        >
          + Add winning stage
        </button>
      </div>
      {stages.map((stage, index) => (
        <div className="stage-editor-row" key={`${stage.name}-${index}`}>
          <i>{index + 1}</i>
          <label>
            Pattern
            <select
              value={stage.name}
              onChange={(event) =>
                setStages((items) =>
                  items.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)),
                )
              }
            >
              <option>One Line</option>
              <option>Two Lines</option>
              <option>Four Corners</option>
              <option>Horizontal Line</option>
              <option>Diamond</option>
              <option>X Pattern</option>
              <option>Cross</option>
              <option>Full House</option>
              <option>Blackout</option>
            </select>
          </label>
          <label>
            Prize
            <input
              type="number"
              value={stage.prize}
              onChange={(event) =>
                setStages((items) =>
                  items.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, prize: Number(event.target.value) } : item,
                  ),
                )
              }
            />
          </label>
          <label className="stage-check">
            <input
              type="checkbox"
              checked={stage.continueAfterWin}
              onChange={(event) =>
                setStages((items) =>
                  items.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, continueAfterWin: event.target.checked } : item,
                  ),
                )
              }
            />
            Continue after win
          </label>
          <div>
            <button type="button" onClick={() => moveStage(index, -1)}>↑</button>
            <button type="button" onClick={() => moveStage(index, 1)}>↓</button>
            <button type="button" onClick={() => setStages((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button>
          </div>
        </div>
      ))}
    </div>
  );

  const formFooter = (
    <div className="drawer-footer">
      <button type="button" className="outline-button" onClick={close}>Cancel</button>
      {action.kind === "create-room" && (
        <button type="button" className="outline-button" onClick={() => notify("Room saved as draft.")}>Save draft</button>
      )}
      <button className="admin-primary" type="submit">
        {action.kind === "edit-room"
          ? "Save changes"
          : action.kind === "create-game"
            ? (gameRoomId === "new" ? "+ Create game" : "Save & apply game")
            : "Save configuration"}
      </button>
    </div>
  );

  if (action.kind === "notifications")
    return (
      <div className="admin-drawer-backdrop">
        <button type="button" className="admin-drawer-scrim" aria-label="Close notifications" onClick={close} />
        <aside className="admin-drawer">
          <DrawerHeader title={title} close={close} />
          <div className="drawer-body">
            {[
              ["Game starts in 1 minute", "Trueig 90 Classic · 14:31"],
              ["High-value claim needs review", "Mega Trueig Jackpot · 14:29"],
              ["Jackpot passed $126,000", "Automatic threshold alert"],
              ["Tournament Round 2 opened", "Trueigtech Weekend Cup"],
            ].map((item, index) => (
              <div className="admin-notification" key={item[0]}>
                <i>{index + 1}</i>
                <span><b>{item[0]}</b><small>{item[1]}</small></span>
                <button onClick={() => notify("Notification opened.")}>Open →</button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    );

  if (action.kind === "player")
    return (
      <div className="admin-drawer-backdrop">
        <aside className="admin-drawer wide">
          <DrawerHeader title={title} close={close} />
          <div className="drawer-body">
            <div className="player-profile-head">
              <span>{(action.label ?? "AR").slice(0, 2).toUpperCase()}</span>
              <div>
                <h2>{action.label ?? "Ari.R"}</h2>
                <p>TRUEIG-11804 · Active · Standard tier</p>
              </div>
              <b>$248.50<small>BALANCE</small></b>
            </div>
            <div className="player-profile-stats">
              {[
                ["Games played", "128"],
                ["Cards purchased", "346"],
                ["Bingo wins", "18"],
                ["Win percentage", "14.1%"],
                ["Total prizes", "$2,840"],
                ["Current restrictions", "None"],
              ].map((item) => (
                <span key={item[0]}><small>{item[0]}</small><b>{item[1]}</b></span>
              ))}
            </div>
            <div className="player-action-grid">
              {[
                "Suspend",
                "Block",
                "Restrict Bingo",
                "Add Bonus Card",
                "Add Promotional Ticket",
                "View Cards",
                "View Game History",
                "View Transactions",
              ].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    apiClient.admin.playerAction(action.label ?? "Ari.R", item);
                    notify(`${item} action applied to ${action.label ?? "Ari.R"}.`);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="drawer-section">
              <h3>Recent Bingo activity</h3>
              <table>
                <tbody>
                  {[
                    ["TRUEIG-2842", "Diamond 75", "3 cards", "+$400"],
                    ["TRUEIG-2838", "Trueig 90 Classic", "6 cards", "+$150"],
                    ["TRUEIG-2812", "Turbo 30", "2 cards", "$0"],
                  ].map((row) => (
                    <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </aside>
      </div>
    );

  if (action.kind === "report-drilldown" || action.kind === "report")
    return (
      <div className="admin-drawer-backdrop">
        <aside className="admin-drawer wide">
          <DrawerHeader title={title} close={close} />
          <div className="drawer-body">
            <div className="report-drill-stats">
              {[
                ["Total", "$48,620"],
                ["Transactions", "12,842"],
                ["Average", "$3.78"],
                ["Change", "+12.4%"],
              ].map((item) => (
                <span key={item[0]}><small>{item[0]}</small><b>{item[1]}</b></span>
              ))}
            </div>
            <div className="drawer-form-grid">
              <label>Date range<input type="date" defaultValue="2026-08-21" /></label>
              <label>
                Room
                <select>
                  <option>All Trueigtech rooms</option>
                  {rooms.map((room) => <option key={room.id}>{room.name}</option>)}
                </select>
              </label>
              <label>
                Report type
                <select>
                  <option>Revenue</option>
                  <option>Ticket Sales</option>
                  <option>Player Activity</option>
                  <option>Game Performance</option>
                  <option>Winning Patterns</option>
                  <option>Prize Payouts</option>
                  <option>Jackpot</option>
                  <option>Refunds</option>
                </select>
              </label>
            </div>
            <table className="drawer-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Room</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["TXN-854201", "Mega Trueig Jackpot", "Ticket revenue", "$42,100", "Complete"],
                  ["PAY-284201", "Diamond 75", "Prize payout", "$2,000", "Complete"],
                  ["REF-128492", "Trueig 90 Classic", "Refund", "$3.00", "Complete"],
                ].map((row) => (
                  <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
            <div className="drawer-footer">
              <button className="outline-button" onClick={() => notify("Report exported to XLSX.")}>Export XLSX</button>
              <button className="admin-primary" onClick={() => notify("Report filters applied.")}>Run report</button>
            </div>
          </div>
        </aside>
      </div>
    );

  const isRoom = action.kind === "create-room" || action.kind === "edit-room";

  return (
    <div className="admin-drawer-backdrop">
      <button type="button" className="admin-drawer-scrim" aria-label="Close configuration drawer" onClick={close} />
      <aside className={`admin-drawer ${isRoom || isGame ? "wide" : ""}`}>
        <DrawerHeader title={title} close={close} />
        <form className="drawer-body" onSubmit={submit}>
          {isRoom && (
            <>
              <div className="drawer-section">
                <h3>Basic information</h3>
                <div className="drawer-form-grid">
                  <label>Room name<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
                  <label>Room code<input defaultValue={editingRoom?.id.toUpperCase() ?? "TRUEIG-SUN75"} /></label>
                  <label className="full">Description<textarea defaultValue="A premium Trueigtech multi-stage Bingo room." /></label>
                  <label>Thumbnail<input type="file" accept="image/*" /></label>
                  <label>Banner<input type="file" accept="image/*" /></label>
                  <label>
                    Room type
                    <select><option>Public</option><option>VIP</option><option>Community</option><option>Tournament</option></select>
                  </label>
                  <label>
                    Status
                    <select value={status} onChange={(e) => setStatus(e.target.value as BingoStatus)}>
                      <option value="Open">Open</option>
                      <option value="Live">Live</option>
                      <option value="Starting Soon">Starting Soon</option>
                      <option value="Selling Tickets">Selling Tickets</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Paused">Paused</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="drawer-section">
                <h3>Bingo configuration</h3>
                <div className="drawer-form-grid">
                  <label>
                    Bingo variant
                    <select value={variant} onChange={(event) => setVariant(event.target.value)}>
                      <option>90-Ball Classic</option>
                      <option>75-Ball Pattern</option>
                      <option>30-Ball Speed</option>
                      <option>80-Ball Grid</option>
                      <option>75-Ball Progressive</option>
                    </select>
                  </label>
                  <label>Ball count<input value={variant.includes("90") ? 90 : variant.includes("30") ? 30 : variant.includes("80") ? 80 : 75} readOnly /></label>
                  <label>
                    Card layout
                    <select>
                      <option>{variant.includes("90") ? "3 × 9" : variant.includes("30") ? "3 × 3" : variant.includes("80") ? "4 × 4" : "5 × 5"}</option>
                    </select>
                  </label>
                  <label>Number range<input defaultValue={`1–${variant.includes("90") ? 90 : variant.includes("30") ? 30 : variant.includes("80") ? 80 : 75}`} /></label>
                  <label>Free space<select><option>{variant.includes("75") ? "Center free" : "None"}</option></select></label>
                  <label>
                    Winning format
                    <select><option>Multiple stages</option><option>Single pattern</option><option>Progressive</option></select>
                  </label>
                </div>
              </div>
              <div className="drawer-section">
                <h3>Ticket & player configuration</h3>
                <div className="drawer-form-grid">
                  <label>Ticket price<input type="number" step="0.5" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label>
                  <label>Minimum cards<input type="number" defaultValue="1" /></label>
                  <label>Maximum cards<input type="number" defaultValue="8" /></label>
                  <label>Cards per strip<input type="number" defaultValue={variant.includes("90") ? 6 : 1} /></label>
                  <label>Sales start time<input type="time" defaultValue="17:45" /></label>
                  <label>Sales close time<input type="time" defaultValue="17:59" /></label>
                  <label>Minimum players<input type="number" defaultValue="2" /></label>
                  <label>Maximum players<input type="number" defaultValue={editingRoom?.maxPlayers ?? 300} /></label>
                  <label>VIP requirement<select><option>None</option><option>Gold</option><option>Platinum</option></select></label>
                  <label>Country restrictions<input placeholder="None or comma-separated ISO codes" /></label>
                </div>
              </div>
              <div className="drawer-section">
                <h3>Game configuration</h3>
                <div className="drawer-form-grid">
                  <label>Countdown<input type="number" defaultValue="5" /></label>
                  <label>
                    Ball calling speed
                    <select>
                      <option>Fast · 1.2s</option>
                      <option>Turbo · 0.6s</option>
                      <option>Normal · 2.1s</option>
                      <option>Slow · 3.2s</option>
                    </select>
                  </label>
                  {["Auto Daub", "Manual Daub", "Auto Bingo", "Manual Bingo Claim", "Chat"].map((item) => (
                    <label className="check-field" key={item}>
                      <input type="checkbox" defaultChecked={item !== "Auto Bingo"} />{item}
                    </label>
                  ))}
                </div>
              </div>
              {stagesEditor}
              <div className="drawer-section">
                <h3>RTP & Winning Margins</h3>
                <div className="drawer-form-grid">
                  <label>
                    Target RTP (%)
                    <input type="number" min="50" max="98" step="1" value={rtp} onChange={(event) => setRtp(Number(event.target.value))} />
                  </label>
                  <label>
                    Payout Mode
                    <select value={rtpMode} onChange={(event) => setRtpMode(event.target.value as RtpMode)}>
                      <option value="dynamic">Dynamic (Scales with ticket sales)</option>
                      <option value="fixed">Guaranteed Fixed (Minimum prize)</option>
                    </select>
                  </label>
                  <label>
                    RTP Policy
                    <select value={customRtp ? "custom" : "global"} onChange={(event) => setCustomRtp(event.target.value === "custom")}>
                      <option value="global">Follow Global Platform Target (78%)</option>
                      <option value="custom">Custom Room Override</option>
                    </select>
                  </label>
                  <label>
                    House Margin Retention
                    <input readOnly value={`${RTPEngine.calculateHouseMargin(rtp)}%`} />
                  </label>
                </div>
              </div>
              <div className="drawer-section">
                <h3>Prize & multiple winners</h3>
                <div className="drawer-form-grid">
                  <label>Prize type<select><option>Fixed prize</option><option>Prize pool</option><option>Progressive</option></select></label>
                  <label>Prize amount<input type="number" value={prize} onChange={(event) => setPrize(Number(event.target.value))} /></label>
                  <label>Multiple winners<select><option>Allowed</option><option>First validated only</option></select></label>
                  <label>Prize split rule<select><option>Split equally</option><option>Fixed per winner</option><option>Shared jackpot</option><option>Carry over remainder</option></select></label>
                  <label>Maximum winner count<input type="number" defaultValue="10" /></label>
                  <label className="check-field">
                    <input type="checkbox" defaultChecked={Boolean(editingRoom?.jackpot)} /> Enable jackpot
                  </label>
                  <label>Jackpot type<select><option>Progressive</option><option>Guaranteed</option><option>Community</option></select></label>
                  <label>Starting amount<input type="number" defaultValue="50000" /></label>
                  <label>Contribution %<input type="number" step="0.1" defaultValue="2.5" /></label>
                  <label>Winning condition<input defaultValue="Full House within 42 balls" /></label>
                  <label>Reset amount<input type="number" defaultValue="50000" /></label>
                </div>
              </div>
              {action.kind === "edit-room" && (
                <div className="destructive-row">
                  <button
                    type="button"
                    onClick={() => {
                      const copy = {
                        ...editingRoom!,
                        id: `${editingRoom!.id}-copy`,
                        name: `${editingRoom!.name} Copy`,
                        status: "Open" as BingoStatus,
                      };
                      apiClient.rooms.create(copy);
                      setRooms([...rooms, copy]);
                      notify("Room duplicated.");
                    }}
                  >
                    Duplicate room
                  </button>
                  <button type="button" onClick={() => setConfirm("disable")}>Disable room</button>
                  <button type="button" onClick={() => setConfirm("delete")}>Delete room</button>
                </div>
              )}
            </>
          )}
          {isGame && (
            <>
              <div className="drawer-section">
                <h3>Game details</h3>
                <div className="drawer-form-grid">
                  <label>
                    Room / Target
                    <select value={gameRoomId} onChange={(e) => handleSelectGameRoom(e.target.value)}>
                      <option value="new">+ Create New Game Room</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} ({room.status})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Game / Room Name
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Trueig Gold 75"
                      required
                    />
                  </label>
                  <label>
                    Bingo type
                    <select value={variant} onChange={(e) => setVariant(e.target.value)}>
                      <option>90-Ball Classic</option>
                      <option>75-Ball Pattern</option>
                      <option>30-Ball Speed</option>
                      <option>80-Ball Grid</option>
                    </select>
                  </label>
                  <label>
                    Status
                    <select value={status} onChange={(e) => setStatus(e.target.value as BingoStatus)}>
                      <option value="Live">Live</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Open">Open</option>
                      <option value="Paused">Paused</option>
                      <option value="Closing">Closing</option>
                    </select>
                  </label>
                  <label>
                    Date
                    <input type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} />
                  </label>
                  <label>
                    Start time
                    <input type="time" value={gameStartTime} onChange={(e) => setGameStartTime(e.target.value)} />
                  </label>
                  <label>
                    Ticket price
                    <input type="number" step="0.5" value={price} onChange={(event) => setPrice(Number(event.target.value))} />
                  </label>
                  <label>
                    Prize
                    <input type="number" value={prize} onChange={(event) => setPrize(Number(event.target.value))} />
                  </label>
                  <label>
                    Call speed
                    <select value={gameSpeed} onChange={(e) => setGameSpeed(e.target.value)}>
                      <option>Fast</option>
                      <option>Turbo</option>
                      <option>Normal</option>
                      <option>Slow</option>
                    </select>
                  </label>
                  <label>
                    Maximum players
                    <input
                      type="number"
                      value={gameMaxPlayers}
                      onChange={(e) => setGameMaxPlayers(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Card limit
                    <input
                      type="number"
                      value={gameCardLimit}
                      onChange={(e) => setGameCardLimit(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Jackpot
                    <select value={gameJackpot} onChange={(e) => setGameJackpot(e.target.value)}>
                      <option>None</option>
                      <option>Mega Trueig Jackpot</option>
                    </select>
                  </label>
                  <label>
                    Promotion
                    <select value={gamePromotion} onChange={(e) => setGamePromotion(e.target.value)}>
                      <option>None</option>
                      <option>Buy 3 Get 1</option>
                      <option>Happy Hour</option>
                    </select>
                  </label>
                  <label>
                    Game frequency
                    <select value={gameFrequency} onChange={(e) => setGameFrequency(e.target.value)}>
                      <option>One time</option>
                      <option>Every 10 min</option>
                      <option>Hourly</option>
                      <option>Daily</option>
                      <option>Weekly</option>
                    </select>
                  </label>
                </div>
              </div>
              {stagesEditor}
              <div className="game-form-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={async () => {
                    await saveGameWithStatus("Scheduled");
                    close();
                  }}
                >
                  Schedule game
                </button>
                <button
                  type="button"
                  className="admin-primary"
                  onClick={async () => {
                    await saveGameWithStatus("Live");
                    close();
                  }}
                >
                  Start immediately
                </button>
              </div>
            </>
          )}
          {!isRoom && !isGame && (
            <DrawerSpecialForm kind={action.kind} notify={notify} rooms={rooms} setRooms={setRooms} close={close} />
          )}
          {confirm && (
            <div className="confirm-box">
              <b>{confirm === "delete" ? "Delete this room permanently?" : "Disable this room?"}</b>
              <p>{confirm === "delete" ? "The demo room will be removed from the lobby." : "Players will no longer be able to enter new rounds."}</p>
              <button type="button" onClick={() => setConfirm(null)}>Keep room</button>
              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  if (editingRoom) {
                    if (confirm === "delete") {
                      apiClient.rooms.delete(editingRoom.id);
                      setRooms(rooms.filter((room) => room.id !== editingRoom.id));
                    } else {
                      apiClient.rooms.update(editingRoom.id, { status: "Scheduled" });
                      setRooms(rooms.map((room) => (room.id === editingRoom.id ? { ...room, status: "Scheduled" } : room)));
                    }
                  }
                  notify(`Room ${confirm === "delete" ? "deleted" : "disabled"}.`);
                  close();
                }}
              >
                Confirm {confirm}
              </button>
            </div>
          )}
          {formFooter}
        </form>
      </aside>
    </div>
  );
}
