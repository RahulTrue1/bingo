import { FormEvent, useEffect, useState } from "react";
import { apiClient, type PlayerModel } from "../../api-client";
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

function AdminPlayerDrawer({
  action,
  title,
  close,
  notify,
}: {
  action: AdminAction;
  title: string;
  close: () => void;
  notify: (message: string) => void;
}) {
  const [player, setPlayer] = useState<PlayerModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [addAmount, setAddAmount] = useState<string>("50");
  const [reason, setReason] = useState<string>("Operator deposit to play game");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const [copiedPassword, setCopiedPassword] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    apiClient.admin
      .players()
      .then((list) => {
        if (cancelled) return;
        const target = action.label ?? "";
        const found = list.find(
          (p) =>
            p.id?.toLowerCase() === target.toLowerCase() ||
            p.username?.toLowerCase() === target.toLowerCase()
        );
        if (found) {
          setPlayer(found);
        } else {
          setPlayer({
            id: "USR-" + Math.floor(10000 + Math.random() * 90000),
            username: target || "Ari.R",
            password: "demo123",
            tier: "Standard",
            balance: 248.5,
            status: "Active",
            lastLogin: "Just now",
            gamesPlayed: 128,
            totalEntry: 2180,
            winnings: 2840,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [action.label]);

  const handleAddFunds = async (customAmount?: number) => {
    const val = customAmount ?? parseFloat(addAmount);
    if (isNaN(val) || val <= 0) {
      notify("Please enter a valid amount greater than 0.");
      return;
    }
    const playerId = player?.id || player?.username || action.label || "Ari.R";
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await apiClient.admin.addPlayerFunds(playerId, val, reason);
      if (res && res.success) {
        setPlayer({
          ...res.player,
          password: res.player.password || player?.password || "demo123",
        });
        setStatusMessage(`+$${val.toFixed(2)} added! New balance: $${Number(res.wallet ?? res.player.balance).toFixed(2)}`);
        notify(`+$${val.toFixed(2)} credited to ${res.player.username}'s wallet.`);
      }
    } catch (err: any) {
      notify(err?.message || "Failed to add funds.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (item: string) => {
    const target = player?.id || action.label || "Ari.R";
    try {
      const res = await apiClient.admin.playerAction(target, item);
      if (res?.player) {
        setPlayer({
          ...res.player,
          password: res.player.password || player?.password || "demo123",
        });
      }
      notify(`${item} action applied to ${player?.username ?? action.label}.`);
    } catch {
      notify(`${item} action applied to ${action.label}.`);
    }
  };

  const username = player?.username ?? action.label ?? "Ari.R";
  const userPassword = player?.password || "demo123";
  const initials = username.slice(0, 2).toUpperCase();
  const balance = Number(player?.balance ?? 248.5).toFixed(2);
  const tier = player?.tier ?? "Standard";
  const status = player?.status ?? "Active";
  const id = player?.id ?? "USR-11804";
  const gamesPlayed = player?.gamesPlayed ?? 128;
  const winnings = Number(player?.winnings ?? 2840).toLocaleString();
  const totalEntry = Number(player?.totalEntry ?? 2180).toLocaleString();

  const handleCopyPassword = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(userPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  return (
    <div className="admin-drawer-backdrop">
      <aside className="admin-drawer wide">
        <DrawerHeader title={title} close={close} />
        <div className="drawer-body">
          <div className="player-profile-head">
            <span>{initials}</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2>{username}</h2>
                <div className="player-password-inline-pill">
                  <span className="pwd-icon">🔑</span>
                  <span className="pwd-label">Password:</span>
                  <code className="pwd-code">{showPassword ? userPassword : "••••••••••••"}</code>
                  <button
                    type="button"
                    className="pwd-action-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className={`pwd-action-btn copy-btn ${copiedPassword ? "copied" : ""}`}
                    onClick={handleCopyPassword}
                    title="Copy password to clipboard"
                  >
                    {copiedPassword ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <p>
                {id} · {status} · {tier} tier {player?.email ? `· ${player.email}` : ""}
              </p>
            </div>
            <b>
              ${balance}
              <small>BALANCE</small>
            </b>
          </div>

          <div className="player-credentials-banner">
            <div className="player-credentials-left">
              <span className="cred-icon">🔑</span>
              <div>
                <span className="cred-title">PLAYER AUTHENTICATION CREDENTIALS</span>
                <div className="cred-val-row">
                  <span className="cred-label">Login Password:</span>
                  <code className="cred-code">{showPassword ? userPassword : "••••••••••••"}</code>
                  <button
                    type="button"
                    className="cred-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className="cred-copy-btn"
                    onClick={handleCopyPassword}
                    title="Copy password"
                  >
                    {copiedPassword ? "✓ Copied!" : "Copy Password"}
                  </button>
                </div>
              </div>
            </div>
            <div className="player-credentials-meta">
              <span>Username: <b>{username}</b></span>
              <span>Account ID: <b>{id}</b></span>
              {player?.email && <span>Email: <b>{player.email}</b></span>}
            </div>
          </div>

          <div className="operator-wallet-box">
            <h3>💰 Operator Wallet Management</h3>
            <p>Directly credit playing funds or bonus amounts to player's wallet in real-time.</p>
            <div className="operator-preset-grid">
              {[25, 50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="operator-preset-btn"
                  onClick={() => {
                    setAddAmount(String(amt));
                    handleAddFunds(amt);
                  }}
                  disabled={isSubmitting}
                >
                  +${amt}
                </button>
              ))}
            </div>
            <div className="operator-wallet-row">
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Amount"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                disabled={isSubmitting}
              />
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="Operator deposit to play game">Operator deposit to play game</option>
                <option value="Welcome / Onboarding bonus">Welcome / Onboarding bonus</option>
                <option value="Tournament entry credit">Tournament entry credit</option>
                <option value="Customer support goodwill">Customer support goodwill</option>
                <option value="VIP High Roller boost">VIP High Roller boost</option>
              </select>
              <button
                type="button"
                onClick={() => handleAddFunds()}
                disabled={isSubmitting || !addAmount || Number(addAmount) <= 0}
              >
                {isSubmitting ? "Crediting..." : "+ Add to Player Wallet"}
              </button>
            </div>
            {statusMessage && (
              <div className="operator-wallet-success">
                ✓ {statusMessage}
              </div>
            )}
          </div>

          <div className="player-profile-stats">
            {[
              ["Games played", String(gamesPlayed)],
              ["Cards purchased", String(gamesPlayed * 3)],
              ["Total entry", `$${totalEntry}`],
              ["Total prizes / Winnings", `$${winnings}`],
              ["Account status", status],
              ["Tier", tier],
            ].map((item) => (
              <span key={item[0]}>
                <small>{item[0]}</small>
                <b>{item[1]}</b>
              </span>
            ))}
          </div>

          <div className="player-action-grid">
            {[
              status === "Active" ? "Block" : "Activate / Unblock",
              status === "Suspended" ? "Activate / Unblock" : "Suspend",
              "Restrict Bingo",
              "Add Bonus Card",
              "Add Promotional Ticket",
              "View Cards",
              "View Game History",
              "View Transactions",
            ].filter((v, i, a) => a.indexOf(v) === i).map((item) => (
              <button
                key={item}
                onClick={() => handleAction(item)}
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
                  [`${id}-G1`, "Trueig 90 Classic", "4 cards", "+$150"],
                  [`${id}-G2`, "Diamond 75", "2 cards", "$0"],
                  [`${id}-G3`, "Turbo 30", "1 card", "+$50"],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell) => (
                      <td key={cell}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </aside>
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
  const [gameDate, setGameDate] = useState(editingRoom?.gameDate ?? "2026-08-22");
  const [gameStartTime, setGameStartTime] = useState(editingRoom?.startsIn ?? "18:00");
  const [gameSpeed, setGameSpeed] = useState(
    editingRoom?.callDelay && editingRoom.callDelay <= 700
      ? "Turbo"
      : editingRoom?.callDelay && editingRoom.callDelay <= 1300
        ? "Fast"
        : editingRoom?.callDelay && editingRoom.callDelay <= 2200
          ? "Normal"
          : editingRoom?.variant?.includes("30")
            ? "Turbo"
            : "Fast",
  );
  const [gameMaxPlayers, setGameMaxPlayers] = useState(editingRoom?.maxPlayers ?? 300);
  const [gameCardLimit, setGameCardLimit] = useState(editingRoom?.cardLimit ?? 8);
  const [gameJackpot, setGameJackpot] = useState(editingRoom?.jackpot ? "Mega Trueig Jackpot" : "None");
  const [gamePromotion, setGamePromotion] = useState(editingRoom?.promotion ?? "None");
  const [gameFrequency, setGameFrequency] = useState(editingRoom?.frequency ?? (isCreatingNew ? "Every 10 min" : "One time"));
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const scrollToField = (fieldId: string) => {
    setTimeout(() => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if ("focus" in el && typeof (el as HTMLElement).focus === "function") {
          (el as HTMLElement).focus();
        }
        el.classList.add("field-attention-highlight");
        setTimeout(() => {
          el.classList.remove("field-attention-highlight");
        }, 2200);
      }
    }, 50);
  };

  const handleSelectGameRoom = (targetId: string) => {
    setFormError(null);
    setFieldErrors({});
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
        if (selected.cardLimit) setGameCardLimit(selected.cardLimit);
        if (selected.promotion) setGamePromotion(selected.promotion);
        if (selected.gameDate) setGameDate(selected.gameDate);
        if (selected.startsIn) setGameStartTime(selected.startsIn);
        setGameJackpot(selected.jackpot ? "Mega Trueig Jackpot" : "None");
        if (selected.frequency) setGameFrequency(selected.frequency);
        if (selected.callDelay) setGameSpeed(selected.callDelay <= 700 ? "Turbo" : selected.callDelay <= 1300 ? "Fast" : selected.callDelay <= 2200 ? "Normal" : "Slow");
      }
    }
  };

  const handleVariantChange = (newVariant: string) => {
    setVariant(newVariant);
    if (newVariant.includes("30")) {
      setGameSpeed("Turbo");
    } else if (newVariant.includes("90")) {
      setGameSpeed("Fast");
    } else if (newVariant.includes("80")) {
      setGameSpeed("Fast");
    } else {
      setGameSpeed("Normal");
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let firstInvalid: string | null = null;

    if (!name.trim() || name.trim().length < 2) {
      errors.name = "Game / Room name is required (minimum 2 characters).";
      firstInvalid = firstInvalid || "field-game-name";
    }
    if (Number(price) < 0) {
      errors.price = "Ticket price cannot be negative.";
      firstInvalid = firstInvalid || "field-ticket-price";
    }
    if (Number(prize) <= 0) {
      errors.prize = "Prize pool must be greater than $0.";
      firstInvalid = firstInvalid || "field-prize";
    }
    if (stages.length === 0) {
      errors.stages = "At least one winning stage must be configured.";
      firstInvalid = firstInvalid || "field-stages";
    }
    const stagesSum = stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0);
    if (stagesSum > Number(prize)) {
      errors.prize = `Prize pool ($${prize}) cannot be less than winning stages total ($${stagesSum}).`;
      errors.stages = `Winning stage prizes ($${stagesSum}) exceed the prize pool ($${prize}).`;
      firstInvalid = firstInvalid || "field-prize";
    }
    for (const s of stages) {
      if (!s.name.trim()) {
        errors.stages = "All winning stages must have a name.";
        firstInvalid = firstInvalid || "field-stages";
        break;
      }
      if (Number(s.prize) <= 0) {
        errors.stages = "Each winning stage must have a prize greater than $0.";
        firstInvalid = firstInvalid || "field-stages";
        break;
      }
    }
    if (Number(gameMaxPlayers) < 1) {
      errors.maxPlayers = "Maximum players must be at least 1.";
      firstInvalid = firstInvalid || "field-max-players";
    }
    if (Number(gameCardLimit) < 1) {
      errors.cardLimit = "Card limit must be at least 1.";
      firstInvalid = firstInvalid || "field-card-limit";
    }

    setFieldErrors(errors);
    if (firstInvalid) {
      const topErrorMsg = Object.values(errors)[0];
      setFormError(topErrorMsg);
      scrollToField(firstInvalid);
      return false;
    }
    setFormError(null);
    setFieldErrors({});
    return true;
  };

  const saveGameWithStatus = async (customStatus?: BingoStatus): Promise<boolean> => {
    if (!validateForm()) return false;
    const finalStatus: BingoStatus = customStatus || status || "Live";
    if (gameRoomId === "new") {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `game-${Date.now()}`;
      const newGame: BingoRoomData = {
        id,
        name: name.trim(),
        variant,
        status: finalStatus,
        ticketPrice: Math.max(0, Number(price) || 0),
        prize: Math.max(1, Number(prize) || 500),
        players: 0,
        maxPlayers: Number(gameMaxPlayers) || 300,
        cardLimit: Math.max(1, Number(gameCardLimit) || 8),
        promotion: gamePromotion !== "None" ? gamePromotion : undefined,
        gameDate,
        cardsSold: 0,
        startsIn: gameStartTime || "18:00",
        pattern: stages.map((stage) => stage.name).join(" → ") || "One Line",
        accent: variant.includes("90") ? "teal" : variant.includes("30") ? "coral" : variant.includes("80") ? "blue" : "violet",
        tag: "NEW",
        frequency: gameFrequency || "Every 10 min",
        cardRows: variant.includes("90") ? 3 : variant.includes("30") ? 3 : variant.includes("80") ? 4 : 5,
        cardColumns: variant.includes("90") ? 9 : variant.includes("30") ? 3 : variant.includes("80") ? 4 : 5,
        callDelay: gameSpeed === "Turbo" ? 600 : gameSpeed === "Fast" ? 1200 : gameSpeed === "Slow" ? 3200 : 1800,
        winningStages: stages,
        rtp: 80,
        rtpMode: "dynamic",
        customRtp: false,
        jackpot: gameJackpot !== "None" ? 125480 : undefined,
      };
      await apiClient.rooms.create(newGame);
      setRooms([...rooms, newGame]);
      notify(`✓ New Bingo game "${newGame.name}" created (${finalStatus}) - Ticket: $${newGame.ticketPrice}, Prize: $${newGame.prize}, Card Limit: ${newGame.cardLimit}!`);
    } else {
      const target = rooms.find((r) => r.id === gameRoomId);
      const updates: Partial<BingoRoomData> = {
        name: name.trim(),
        variant,
        status: finalStatus,
        ticketPrice: Math.max(0, Number(price) || 0),
        prize: Math.max(1, Number(prize) || (target?.prize ?? 500)),
        maxPlayers: Number(gameMaxPlayers) || 300,
        cardLimit: Math.max(1, Number(gameCardLimit) || 8),
        promotion: gamePromotion !== "None" ? gamePromotion : undefined,
        gameDate,
        callDelay: gameSpeed === "Turbo" ? 600 : gameSpeed === "Fast" ? 1200 : gameSpeed === "Slow" ? 3200 : 1800,
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
      notify(`✓ Game "${name || target?.name || gameRoomId}" updated (${finalStatus}) - Ticket: $${updates.ticketPrice}, Prize: $${updates.prize}, Card Limit: ${updates.cardLimit}!`);
    }
    return true;
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
      if (!validateForm()) return;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const newRoom: BingoRoomData = {
        id,
        name,
        variant,
        status: status || "Open",
        ticketPrice: price,
        prize,
        players: 0,
        maxPlayers: Number(gameMaxPlayers) || 300,
        cardLimit: Math.max(1, Number(gameCardLimit) || 8),
        cardsSold: 0,
        startsIn: "15:00",
        pattern: stages.map((stage) => stage.name).join(" → "),
        accent: "violet",
        tag: "NEW",
        frequency: "Every 10 min",
        cardRows: variant.includes("90") ? 3 : variant.includes("30") ? 3 : variant.includes("80") ? 4 : 5,
        cardColumns: variant.includes("90") ? 9 : variant.includes("30") ? 3 : variant.includes("80") ? 4 : 5,
        callDelay: gameSpeed === "Turbo" ? 600 : gameSpeed === "Fast" ? 1200 : 1800,
        winningStages: stages,
        rtp,
        rtpMode,
        customRtp,
      };
      await apiClient.rooms.create(newRoom);
      setRooms([...rooms, newRoom]);
      notify(`✓ Room "${newRoom.name}" created and added to lobby.`);
    } else if (action.kind === "edit-room" && editingRoom) {
      if (!validateForm()) return;
      const res = await apiClient.rooms.update(editingRoom.id, {
        name,
        variant,
        status,
        ticketPrice: price,
        prize,
        maxPlayers: Number(gameMaxPlayers) || 300,
        cardLimit: Math.max(1, Number(gameCardLimit) || 8),
        callDelay: gameSpeed === "Turbo" ? 600 : gameSpeed === "Fast" ? 1200 : 1800,
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
                maxPlayers: Number(gameMaxPlayers) || 300,
                cardLimit: Math.max(1, Number(gameCardLimit) || 8),
                callDelay: gameSpeed === "Turbo" ? 600 : gameSpeed === "Fast" ? 1200 : 1800,
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
      const ok = await saveGameWithStatus();
      if (!ok) return;
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
    <div
      id="field-stages"
      className="stage-editor"
      style={
        fieldErrors.stages
          ? {
              border: "1px solid #ff5c7a",
              borderRadius: "12px",
              padding: "12px",
              background: "rgba(255, 92, 122, 0.04)",
            }
          : undefined
      }
    >
      <div className="drawer-section-title">
        <div>
          <h3>Winning stage configuration</h3>
          <p>Winners can be paid without ending the round.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setStages((items) => [...items, { name: "New Stage", prize: 100, continueAfterWin: true }]);
            setFieldErrors((prev) => {
              const n = { ...prev };
              delete n.stages;
              return n;
            });
            setFormError(null);
          }}
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
              onChange={(event) => {
                const val = Number(event.target.value);
                setStages((items) =>
                  items.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, prize: val } : item,
                  ),
                );
                setFieldErrors((prev) => {
                  const n = { ...prev };
                  delete n.stages;
                  return n;
                });
                setFormError(null);
              }}
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          marginTop: "12px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: "12px",
        }}
      >
        <span>
          Stage prizes total:{" "}
          <strong
            style={{
              color:
                stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0) > prize
                  ? "#ff5c7a"
                  : "#2bddaa",
            }}
          >
            ${stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0).toLocaleString()}
          </strong>{" "}
          / Prize pool: <strong>${prize.toLocaleString()}</strong>
        </span>
        {stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0) !== prize && (
          <button
            type="button"
            className="outline-button"
            style={{ fontSize: "11px", padding: "4px 8px" }}
            onClick={() => {
              const sum = stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0);
              setPrize(sum);
              setFieldErrors((prev) => {
                const n = { ...prev };
                delete n.prize;
                delete n.stages;
                return n;
              });
              setFormError(null);
            }}
          >
            Auto-sync prize to match stages ($
            {stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0)})
          </button>
        )}
      </div>
      {fieldErrors.stages && (
        <div
          style={{
            color: "#ff5c7a",
            fontSize: "12px",
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: 600,
          }}
        >
          <span>⚠️</span>
          <span>{fieldErrors.stages}</span>
        </div>
      )}
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
    return <AdminPlayerDrawer action={action} title={title} close={close} notify={notify} />;

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
          {formError && (
            <div
              style={{
                background: "rgba(255, 92, 122, 0.14)",
                border: "1px solid rgba(255, 92, 122, 0.4)",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "#ff8499",
                fontSize: "12px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "15px" }}>⚠️</span>
                <span>{formError}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0) > prize && (
                  <button
                    type="button"
                    onClick={() => {
                      const sum = stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0);
                      setPrize(sum);
                      setFieldErrors((prev) => {
                        const n = { ...prev };
                        delete n.prize;
                        delete n.stages;
                        return n;
                      });
                      setFormError(null);
                    }}
                    style={{
                      background: "rgba(43, 221, 170, 0.2)",
                      border: "1px solid #2bddaa",
                      color: "#2bddaa",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Auto-sync Prize to ${stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0)}
                  </button>
                )}
                {Object.keys(fieldErrors).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const idMap: Record<string, string> = {
                        name: "field-game-name",
                        price: "field-ticket-price",
                        prize: "field-prize",
                        stages: "field-stages",
                        maxPlayers: "field-max-players",
                        cardLimit: "field-card-limit",
                      };
                      const firstKey = Object.keys(fieldErrors)[0];
                      if (idMap[firstKey]) scrollToField(idMap[firstKey]);
                    }}
                    style={{
                      background: "rgba(255, 92, 122, 0.2)",
                      border: "1px solid rgba(255, 92, 122, 0.5)",
                      color: "#ff8499",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    View invalid field ↓
                  </button>
                )}
              </div>
            </div>
          )}
          {isRoom && (
            <>
              <div className="drawer-section">
                <h3>Basic information</h3>
                <div className="drawer-form-grid">
                  <label>
                    Room name
                    <input
                      id="field-game-name"
                      required
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        setFormError(null);
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.name;
                          return n;
                        });
                      }}
                      style={fieldErrors.name ? { borderColor: "#ff5c7a", background: "rgba(255,92,122,0.06)" } : undefined}
                    />
                    {fieldErrors.name && (
                      <span style={{ color: "#ff5c7a", fontSize: "11px", marginTop: "4px", display: "block" }}>
                        ⚠️ {fieldErrors.name}
                      </span>
                    )}
                  </label>
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
                  <label>
                    Ticket price
                    <input
                      id="field-ticket-price"
                      type="number"
                      step="0.5"
                      value={price}
                      onChange={(event) => {
                        setPrice(Number(event.target.value));
                        setFormError(null);
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.price;
                          return n;
                        });
                      }}
                      style={fieldErrors.price ? { borderColor: "#ff5c7a", background: "rgba(255,92,122,0.06)" } : undefined}
                    />
                    {fieldErrors.price && (
                      <span style={{ color: "#ff5c7a", fontSize: "11px", marginTop: "4px", display: "block" }}>
                        ⚠️ {fieldErrors.price}
                      </span>
                    )}
                  </label>
                  <label>Minimum cards<input type="number" defaultValue="1" /></label>
                  <label>
                    Maximum cards
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={gameCardLimit}
                      onChange={(e) => setGameCardLimit(Number(e.target.value))}
                    />
                  </label>
                  <label>Cards per strip<input type="number" defaultValue={variant.includes("90") ? 6 : 1} /></label>
                  <label>Sales start time<input type="time" defaultValue="17:45" /></label>
                  <label>Sales close time<input type="time" defaultValue="17:59" /></label>
                  <label>Minimum players<input type="number" defaultValue="2" /></label>
                  <label>
                    Maximum players
                    <input
                      type="number"
                      min="1"
                      value={gameMaxPlayers}
                      onChange={(e) => setGameMaxPlayers(Number(e.target.value))}
                    />
                  </label>
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
                    <select value={gameSpeed} onChange={(e) => setGameSpeed(e.target.value)}>
                      <option value="Fast">Fast · 1.2s</option>
                      <option value="Turbo">Turbo · 0.6s</option>
                      <option value="Normal">Normal · 1.8s</option>
                      <option value="Slow">Slow · 3.2s</option>
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
                  <label>
                    Prize amount
                    <input
                      id="field-prize"
                      type="number"
                      value={prize}
                      onChange={(event) => {
                        const val = Number(event.target.value);
                        setPrize(val);
                        setFormError(null);
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.prize;
                          const stagesSum = stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0);
                          if (stagesSum <= val) {
                            delete n.stages;
                          }
                          return n;
                        });
                      }}
                      style={fieldErrors.prize ? { borderColor: "#ff5c7a", background: "rgba(255,92,122,0.06)" } : undefined}
                    />
                    {fieldErrors.prize && (
                      <span style={{ color: "#ff5c7a", fontSize: "11px", marginTop: "4px", display: "block" }}>
                        ⚠️ {fieldErrors.prize}
                      </span>
                    )}
                  </label>
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
                      id="field-game-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setFormError(null);
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.name;
                          return n;
                        });
                      }}
                      placeholder="e.g. Trueig Gold 75"
                      style={fieldErrors.name ? { borderColor: "#ff5c7a", background: "rgba(255,92,122,0.06)" } : undefined}
                      required
                    />
                    {fieldErrors.name && (
                      <span style={{ color: "#ff5c7a", fontSize: "11px", marginTop: "4px", display: "block" }}>
                        ⚠️ {fieldErrors.name}
                      </span>
                    )}
                  </label>
                  <label>
                    Bingo type
                    <select
                      value={variant}
                      onChange={(e) => {
                        handleVariantChange(e.target.value);
                        setFormError(null);
                      }}
                    >
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
                    Ticket price ($)
                    <input
                      id="field-ticket-price"
                      type="number"
                      step="any"
                      min="0"
                      value={price}
                      onChange={(event) => {
                        setPrice(Math.max(0, Number(event.target.value)));
                        setFormError(null);
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.price;
                          return n;
                        });
                      }}
                      style={fieldErrors.price ? { borderColor: "#ff5c7a", background: "rgba(255,92,122,0.06)" } : undefined}
                      required
                    />
                    {fieldErrors.price && (
                      <span style={{ color: "#ff5c7a", fontSize: "11px", marginTop: "4px", display: "block" }}>
                        ⚠️ {fieldErrors.price}
                      </span>
                    )}
                  </label>
                  <label>
                    Prize ($)
                    <input
                      id="field-prize"
                      type="number"
                      step="any"
                      min="1"
                      value={prize}
                      onChange={(event) => {
                        const val = Math.max(1, Number(event.target.value));
                        setPrize(val);
                        setFormError(null);
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.prize;
                          const stagesSum = stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0);
                          if (stagesSum <= val) {
                            delete n.stages;
                          }
                          return n;
                        });
                      }}
                      style={fieldErrors.prize ? { borderColor: "#ff5c7a", background: "rgba(255,92,122,0.06)" } : undefined}
                      required
                    />
                    {fieldErrors.prize && (
                      <div style={{ marginTop: "4px" }}>
                        <span style={{ color: "#ff5c7a", fontSize: "11px", display: "block", marginBottom: "4px" }}>
                          ⚠️ {fieldErrors.prize}
                        </span>
                        {stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0) > prize && (
                          <button
                            type="button"
                            className="outline-button"
                            style={{ fontSize: "10px", padding: "2px 8px", color: "#2bddaa", borderColor: "#2bddaa", background: "rgba(43,221,170,0.1)" }}
                            onClick={() => {
                              const sum = stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0);
                              setPrize(sum);
                              setFieldErrors((prev) => {
                                const n = { ...prev };
                                delete n.prize;
                                delete n.stages;
                                return n;
                              });
                              setFormError(null);
                            }}
                          >
                            Set Prize to ${stages.reduce((acc, s) => acc + (Number(s.prize) || 0), 0)}
                          </button>
                        )}
                      </div>
                    )}
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
                      id="field-max-players"
                      type="number"
                      min="1"
                      value={gameMaxPlayers}
                      onChange={(e) => {
                        setGameMaxPlayers(Number(e.target.value));
                        setFormError(null);
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.maxPlayers;
                          return n;
                        });
                      }}
                      style={fieldErrors.maxPlayers ? { borderColor: "#ff5c7a", background: "rgba(255,92,122,0.06)" } : undefined}
                    />
                    {fieldErrors.maxPlayers && (
                      <span style={{ color: "#ff5c7a", fontSize: "11px", marginTop: "4px", display: "block" }}>
                        ⚠️ {fieldErrors.maxPlayers}
                      </span>
                    )}
                  </label>
                  <label>
                    Card limit
                    <input
                      id="field-card-limit"
                      type="number"
                      min="1"
                      max="100"
                      value={gameCardLimit}
                      onChange={(e) => {
                        setGameCardLimit(Number(e.target.value));
                        setFormError(null);
                        setFieldErrors((prev) => {
                          const n = { ...prev };
                          delete n.cardLimit;
                          return n;
                        });
                      }}
                      style={fieldErrors.cardLimit ? { borderColor: "#ff5c7a", background: "rgba(255,92,122,0.06)" } : undefined}
                    />
                    {fieldErrors.cardLimit && (
                      <span style={{ color: "#ff5c7a", fontSize: "11px", marginTop: "4px", display: "block" }}>
                        ⚠️ {fieldErrors.cardLimit}
                      </span>
                    )}
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
                    const ok = await saveGameWithStatus("Scheduled");
                    if (ok) close();
                  }}
                >
                  Schedule game
                </button>
                <button
                  type="button"
                  className="admin-primary"
                  onClick={async () => {
                    const ok = await saveGameWithStatus("Live");
                    if (ok) close();
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
