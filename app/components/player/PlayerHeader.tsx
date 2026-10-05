"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowsClockwise,
  CaretDown,
  ClockCounterClockwise,
  Diamond,
  Gift,
  Ticket,
  Trophy,
  User,
} from "@phosphor-icons/react";
import type { PlayerModel } from "../../api-client";
import { Logo } from "../shared/Logo";
import { money, type PlayerView } from "../shared/types";

export function PlayerHeader({
  view,
  setView,
  wallet,
  currentUser,
  onOpenAuth,
  openAuthModal,
}: {
  view: PlayerView;
  setView: (view: PlayerView) => void;
  wallet: number;
  currentUser?: PlayerModel | null;
  onOpenAuth?: (tab?: "login" | "signup") => void;
  openAuthModal?: (tab?: "login" | "signup") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const handleOpenAuth = onOpenAuth || openAuthModal;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const isBingoActive = view === "lobby" || view === "room";

  return (
    <header className="player-header">
      <button className="brand-button" onClick={() => setView("lobby")} aria-label="Go to lobby">
        <Logo />
      </button>

      {/* Main navigation: Only Games and Bingo */}
      <nav className="main-nav" aria-label="Player navigation">
        <a
          href="http://14.96.241.250:8005"
          className="main-nav-link"
          title="Go to Games Portal"
        >
          Games
        </a>
        <button
          className={isBingoActive ? "active" : ""}
          onClick={() => setView("lobby")}
          title="Bingo Lobby"
        >
          Bingo
        </button>
      </nav>

      <div className="header-actions">
        <div className="wallet">
          <small>WALLET</small>
          <strong>{money(wallet)}</strong>
        </div>

        {/* User icon with tooltip dropdown containing all moved options */}
        <div className="user-menu-wrapper" ref={menuRef}>
          <button
            className={`user-auth-button ${menuOpen ? "open" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            title="User Menu"
          >
            <span>👤</span>
            <b>{currentUser?.username || "Sign In"}</b>
            <CaretDown size={11} weight="bold" className={`menu-caret ${menuOpen ? "rotated" : ""}`} />
          </button>

          {/* <button
            className="avatar-button"
            aria-label="Open user menu"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            title={currentUser ? `${currentUser.username} (${currentUser.tier})` : "User Menu"}
          >
            <span>{(currentUser?.username || "AR").slice(0, 2).toUpperCase()}</span>
            <i />
          </button> */}

          {menuOpen && (
            <div className="user-dropdown-tooltip" role="menu">
              {/* Profile summary */}
              <div className="tooltip-user-summary">
                <div className="tooltip-user-avatar">
                  {(currentUser?.username || "AR").slice(0, 2).toUpperCase()}
                  <span className="tooltip-online-dot" />
                </div>
                <div className="tooltip-user-meta">
                  <span className="tooltip-username">{currentUser?.username || "Guest Player"}</span>
                  <span className="tooltip-tier-badge">{currentUser?.tier || "Bronze"} VIP</span>
                </div>
              </div>

              {/* Wallet info */}
              <div className="tooltip-wallet-row">
                <span className="tooltip-wallet-label">Balance</span>
                <strong className="tooltip-wallet-amount">{money(wallet)}</strong>
              </div>

              <div className="tooltip-divider" />

              {/* All moved options from header */}
              <div className="tooltip-nav-section">
                <div className="tooltip-section-title">GAME SECTIONS</div>
                <button
                  className={`tooltip-item ${view === "tickets" ? "active" : ""}`}
                  onClick={() => {
                    setView("tickets");
                    setMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <Ticket size={18} weight="fill" className="tooltip-icon" />
                  <span className="tooltip-item-label">Tickets</span>
                </button>
                <button
                  className={`tooltip-item ${view === "jackpots" ? "active" : ""}`}
                  onClick={() => {
                    setView("jackpots");
                    setMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <Diamond size={18} weight="fill" className="tooltip-icon" />
                  <span className="tooltip-item-label">Jackpots</span>
                  <span className="tooltip-badge">Live</span>
                </button>
                <button
                  className={`tooltip-item ${view === "tournaments" ? "active" : ""}`}
                  onClick={() => {
                    setView("tournaments");
                    setMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <Trophy size={18} weight="fill" className="tooltip-icon" />
                  <span className="tooltip-item-label">Tournaments</span>
                </button>
                <button
                  className={`tooltip-item ${view === "promotions" ? "active" : ""}`}
                  onClick={() => {
                    setView("promotions");
                    setMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <Gift size={18} weight="fill" className="tooltip-icon" />
                  <span className="tooltip-item-label">Promotions</span>
                </button>
                <button
                  className={`tooltip-item ${view === "history" ? "active" : ""}`}
                  onClick={() => {
                    setView("history");
                    setMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <ClockCounterClockwise size={18} weight="bold" className="tooltip-icon" />
                  <span className="tooltip-item-label">History</span>
                </button>
              </div>

              <div className="tooltip-divider" />

              {/* Account management */}
              <div className="tooltip-nav-section">
                <div className="tooltip-section-title">ACCOUNT</div>
                <button
                  className={`tooltip-item ${view === "profile" ? "active" : ""}`}
                  onClick={() => {
                    setView("profile");
                    setMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <User size={18} weight="fill" className="tooltip-icon" />
                  <span className="tooltip-item-label">Profile</span>
                </button>
                <button
                  className="tooltip-item tooltip-action-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    if (handleOpenAuth) handleOpenAuth("login");
                  }}
                  role="menuitem"
                >
                  <ArrowsClockwise size={18} weight="bold" className="tooltip-icon" />
                  <span className="tooltip-item-label">Switch User / Sign In</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .player-header {
          display: grid !important;
          grid-template-columns: 1fr auto 1fr !important;
          align-items: center !important;
        }
        .brand-button {
          justify-self: start !important;
        }
        .main-nav {
          justify-self: center !important;
          display: flex !important;
          justify-content: center !important;
          align-items: stretch !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          gap: 8px !important;
          height: 70px !important;
        }
        .header-actions {
          justify-self: end !important;
          display: flex !important;
          align-items: center !important;
          gap: 9px !important;
        }
        .user-menu-wrapper {
          position: relative !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .user-auth-button .menu-caret {
          color: #8f8aa8 !important;
          margin-left: 2px !important;
          transition: transform 0.2s ease !important;
        }
        .user-auth-button.open .menu-caret {
          transform: rotate(180deg) !important;
        }
        .user-dropdown-tooltip {
          position: absolute !important;
          top: calc(100% + 12px) !important;
          right: 0 !important;
          width: 270px !important;
          background: #140e32 !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          border-radius: 16px !important;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(138, 120, 255, 0.2) !important;
          padding: 14px !important;
          z-index: 9999 !important;
          backdrop-filter: blur(24px) !important;
          -webkit-backdrop-filter: blur(24px) !important;
          display: flex !important;
          flex-direction: column !important;
          box-sizing: border-box !important;
          text-align: left !important;
        }
        .tooltip-user-summary {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          padding: 4px 4px 10px !important;
        }
        .tooltip-user-avatar {
          width: 38px !important;
          height: 38px !important;
          border-radius: 50% !important;
          background: linear-gradient(135deg, #f1a7b7, #9e73ff) !important;
          color: #211631 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 13px !important;
          font-weight: 900 !important;
          position: relative !important;
          flex-shrink: 0 !important;
        }
        .tooltip-online-dot {
          position: absolute !important;
          bottom: 0 !important;
          right: 0 !important;
          width: 10px !important;
          height: 10px !important;
          background: #2cdda9 !important;
          border: 2px solid #140e32 !important;
          border-radius: 50% !important;
        }
        .tooltip-user-meta {
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }
        .tooltip-username {
          font-size: 14px !important;
          font-weight: 800 !important;
          color: #ffffff !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .tooltip-tier-badge {
          font-size: 10px !important;
          font-weight: 700 !important;
          color: #a794ff !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          margin-top: 1px !important;
        }
        .tooltip-wallet-row {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 10px !important;
          padding: 8px 12px !important;
          margin-bottom: 6px !important;
        }
        .tooltip-wallet-label {
          font-size: 10px !important;
          font-weight: 800 !important;
          color: #8e88a6 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.6px !important;
        }
        .tooltip-wallet-amount {
          font-size: 14px !important;
          font-weight: 800 !important;
          color: #27d7ad !important;
        }
        .tooltip-divider {
          height: 1px !important;
          background: rgba(255, 255, 255, 0.08) !important;
          margin: 6px 0 !important;
          width: 100% !important;
        }
        .tooltip-nav-section {
          display: flex !important;
          flex-direction: column !important;
          gap: 3px !important;
          width: 100% !important;
        }
        .tooltip-section-title {
          font-size: 9px !important;
          font-weight: 800 !important;
          color: #726a92 !important;
          letter-spacing: 0.8px !important;
          padding: 6px 8px 3px !important;
          text-transform: uppercase !important;
        }
        .tooltip-item {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 12px !important;
          width: 100% !important;
          padding: 9px 12px !important;
          border-radius: 10px !important;
          background: transparent !important;
          border: 0 !important;
          color: #ccc6e4 !important;
          font-family: inherit !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          text-align: left !important;
          transition: all 0.15s ease !important;
          box-sizing: border-box !important;
        }
        .tooltip-item:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
          transform: translateX(2px) !important;
        }
        .tooltip-item.active {
          background: rgba(138, 120, 255, 0.2) !important;
          border: 1px solid rgba(138, 120, 255, 0.4) !important;
          color: #ffffff !important;
          font-weight: 700 !important;
        }
        .tooltip-icon {
          flex-shrink: 0 !important;
          color: #9a8cff !important;
        }
        .tooltip-item.active .tooltip-icon {
          color: #c4b5fd !important;
        }
        .tooltip-item-label {
          flex: 1 !important;
          color: inherit !important;
        }
        .tooltip-badge {
          font-size: 9px !important;
          font-weight: 800 !important;
          background: #ff5277 !important;
          color: #ffffff !important;
          padding: 2px 7px !important;
          border-radius: 999px !important;
          letter-spacing: 0.5px !important;
          text-transform: uppercase !important;
        }
        .tooltip-action-btn {
          color: #a894ff !important;
        }
        .tooltip-action-btn:hover {
          color: #ffffff !important;
          background: rgba(138, 120, 255, 0.18) !important;
        }
      `}</style>
    </header>
  );
}
