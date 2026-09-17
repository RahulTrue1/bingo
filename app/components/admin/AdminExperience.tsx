import { useState } from "react";
import type { BingoRoomData } from "../../bingo-core";
import { Icon } from "../shared/Icon";
import { Logo } from "../shared/Logo";
import type { AdminAction } from "../shared/types";
import { AdminDashboard } from "./AdminDashboard";
import { BackofficeDrawer } from "./BackofficeDrawer";
import { ChatModeration } from "./ChatModeration";
import { GameManagement } from "./GameManagement";
import { adminNav, GenericAdminPanel } from "./GenericAdminPanel";
import { JackpotManagement } from "./JackpotManagement";
import { LiveControl } from "./LiveControl";
import { PatternBuilder } from "./PatternBuilder";
import { PlayersTable } from "./PlayersTable";
import { PromotionManagement } from "./PromotionManagement";
import { ReportsPanel } from "./ReportsPanel";
import { RoomManagement } from "./RoomManagement";
import { RTPManagement } from "./RTPManagement";
import { Scheduler } from "./Scheduler";
import { TournamentAdmin } from "./TournamentAdmin";
import { TransactionsTable } from "./TransactionsTable";
import { VariantManagement } from "./VariantManagement";

export function adminSubtitle(module: string) {
  const subtitles: Record<string, string> = {
    dashboard: "Live platform health, player activity and commercial performance.",
    rooms: "Create and configure every player-facing Bingo room.",
    rtp: "Manage return-to-player percentages, target winning rates and house margins globally or per room.",
    gamebuilder: "Create, schedule and start games with multiple winning stages.",
    games: "Monitor active rounds and intervene in real time.",
    scheduler: "Plan one-off, recurring and tournament game sessions.",
    patterns: "Build and validate reusable winning patterns.",
    jackpots: "Control contributions, qualification rules and liability.",
    reports: "Explore validated performance across rooms and game types.",
    players: "Review player activity, value and account status.",
    transactions: "Trace every ticket, payout, refund and promotional credit.",
    variants: "Configure extensible Bingo engines and card layouts.",
  };
  return subtitles[module] ?? `Configure ${adminNav.find(([key]) => key === module)?.[1].toLowerCase()} across the platform.`;
}

export function AdminModule({
  module,
  rooms,
  setRooms,
  notify,
  openAction,
}: {
  module: string;
  rooms: BingoRoomData[];
  setRooms: (rooms: BingoRoomData[]) => void;
  notify: (message: string) => void;
  openAction: (action: AdminAction) => void;
}) {
  if (module === "dashboard") return <AdminDashboard openAction={openAction} />;
  if (module === "rooms") return <RoomManagement rooms={rooms} setRooms={setRooms} openAction={openAction} notify={notify} />;
  if (module === "rtp") return <RTPManagement rooms={rooms} setRooms={setRooms} notify={notify} openAction={openAction} />;
  if (module === "gamebuilder") return <GameManagement rooms={rooms} openAction={openAction} notify={notify} />;
  if (module === "games") return <LiveControl notify={notify} openAction={openAction} />;
  if (module === "scheduler") return <Scheduler notify={notify} />;
  if (module === "patterns") return <PatternBuilder notify={notify} />;
  if (module === "jackpots") return <JackpotManagement notify={notify} openAction={openAction} />;
  if (module === "variants") return <VariantManagement openAction={openAction} />;
  if (module === "players") return <PlayersTable openAction={openAction} />;
  if (module === "transactions") return <TransactionsTable />;
  if (module === "reports") return <ReportsPanel />;
  if (module === "tournaments") return <TournamentAdmin notify={notify} openAction={openAction} />;
  if (module === "promotions") return <PromotionManagement notify={notify} openAction={openAction} />;
  if (module === "chat") return <ChatModeration notify={notify} openAction={openAction} />;
  return <GenericAdminPanel module={module} notify={notify} openAction={openAction} />;
}

export function AdminExperience({
  rooms,
  setRooms,
  notify,
}: {
  rooms: BingoRoomData[];
  setRooms: (rooms: BingoRoomData[]) => void;
  notify: (message: string) => void;
}) {
  const [module, setModule] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [action, setAction] = useState<AdminAction | null>(null);
  const currentLabel = adminNav.find(([key]) => key === module)?.[1] ?? "Overview";
  const primaryActions: Record<string, [string, string]> = {
    rooms: ["+ Create room", "create-room"],
    rtp: ["Apply Global RTP", "apply-global-rtp"],
    gamebuilder: ["+ Create game", "create-game"],
    scheduler: ["+ Schedule game", "create-game"],
    variants: ["+ Create variant", "variants"],
    caller: ["Configure caller", "caller-config"],
    jackpots: ["+ Create jackpot", "create-jackpot"],
    tournaments: ["+ Create tournament", "create-tournament"],
    players: ["Open player profile", "player"],
    promotions: ["+ Create promotion", "promotion"],
    chat: ["+ Announcement", "announcement"],
    reports: ["Build report", "report"],
    settings: ["Configure platform", "settings"],
  };

  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-logo">
          <Logo dark />
          <button onClick={() => setSidebarOpen(false)}>×</button>
        </div>
        <nav>
          {adminNav.map(([key, label, glyph]) => (
            <button
              key={key}
              className={module === key ? "active" : ""}
              onClick={() => {
                setModule(key);
                setSidebarOpen(false);
              }}
            >
              <Icon>{glyph}</Icon>
              <span>{label}</span>
              {key === "games" && <i className="nav-badge">3</i>}
              {key === "chat" && <i className="nav-badge muted">12</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <span>JD</span>
          <div>
            <b>John Dawson</b>
            <small>Super Admin</small>
          </div>
          <button>•••</button>
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-header">
          <div>
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)}>☰</button>
            <span>Trueigtech Operations /</span>
            <b>{currentLabel}</b>
          </div>
        </header>
        <div className="admin-content">
          <div className="admin-page-title">
            <div>
              <span className="section-kicker">TRUEIGTECH BINGO OPERATIONS</span>
              <h1>{currentLabel}</h1>
              <p>{adminSubtitle(module)}</p>
            </div>
            <div className="admin-title-actions">
              <button className="outline-button" onClick={() => notify(`${currentLabel} data exported to CSV.`)}>
                ↓ Export
              </button>
              {primaryActions[module] && (
                <button className="admin-primary" onClick={() => setAction({ kind: primaryActions[module][1] })}>
                  {primaryActions[module][0]}
                </button>
              )}
            </div>
          </div>
          <AdminModule
            module={module}
            rooms={rooms}
            setRooms={setRooms}
            notify={notify}
            openAction={(next) => setAction(next)}
          />
        </div>
      </section>
      {action && (
        <BackofficeDrawer
          action={action}
          close={() => setAction(null)}
          rooms={rooms}
          setRooms={setRooms}
          notify={notify}
        />
      )}
    </div>
  );
}
