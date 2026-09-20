import type { PlayerModel } from "../../api-client";
import { Logo } from "../shared/Logo";
import { money, type PlayerView } from "../shared/types";

export function PlayerHeader({
  view,
  setView,
  wallet,
  currentUser,
  onAddFunds,
  onOpenAuth,
  openAuthModal,
}: {
  view: PlayerView;
  setView: (view: PlayerView) => void;
  wallet: number;
  currentUser?: PlayerModel | null;
  onAddFunds?: () => void;
  onOpenAuth?: (tab?: "login" | "signup") => void;
  openAuthModal?: (tab?: "login" | "signup") => void;
}) {
  const handleOpenAuth = onOpenAuth || openAuthModal;
  const links: Array<[PlayerView, string]> = [
    ["lobby", "Lobby"],
    ["tickets", "Tickets"],
    ["jackpots", "Jackpots"],
    ["tournaments", "Tournaments"],
    ["promotions", "Promotions"],
    ["history", "History"],
  ];

  return (
    <header className="player-header">
      <button className="brand-button" onClick={() => setView("lobby")} aria-label="Go to lobby">
        <Logo />
      </button>
      <nav className="main-nav" aria-label="Player navigation">
        {links.map(([key, label]) => (
          <button
            key={key}
            className={view === key ? "active" : ""}
            onClick={() => setView(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="header-actions">
        <div className="wallet">
          <small>WALLET</small>
          <strong>{money(wallet)}</strong>
          <button aria-label="Add funds" onClick={onAddFunds}>+</button>
        </div>
        <button
          className="user-auth-button"
          onClick={() => handleOpenAuth ? handleOpenAuth("login") : setView("profile")}
          title="Switch User or Log In"
        >
          <span>👤</span>
          <b>{currentUser?.username || "Sign In"}</b>
        </button>
        <button
          className="avatar-button"
          aria-label="Open profile"
          onClick={() => setView("profile")}
          title={currentUser ? `${currentUser.username} (${currentUser.tier})` : "Profile"}
        >
          <span>{(currentUser?.username || "AR").slice(0, 2).toUpperCase()}</span>
          <i />
        </button>
      </div>
    </header>
  );
}
