import { Logo } from "../shared/Logo";
import { money, type PlayerView } from "../shared/types";

export function PlayerHeader({
  view,
  setView,
  wallet,
  onAddFunds,
}: {
  view: PlayerView;
  setView: (view: PlayerView) => void;
  wallet: number;
  onAddFunds?: () => void;
}) {
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
          className="avatar-button"
          aria-label="Open profile"
          onClick={() => setView("profile")}
        >
          <span>AR</span>
          <i />
        </button>
      </div>
    </header>
  );
}
