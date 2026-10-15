"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowsClockwise,
  Cards,
  CaretDown,
  ClockCounterClockwise,
  Diamond,
  DiamondsFour,
  Fire,
  GearSix,
  Gift,
  Lightning,
  PokerChip,
  ShieldCheck,
  Ticket,
  Trophy,
  User,
} from "@phosphor-icons/react";
import type { PlayerModel } from "../../api-client";
import { Logo } from "../shared/Logo";
import { money, type PlayerView } from "../shared/types";
import { PlayerHistoryModal } from "./PlayerHistoryModal";

export function PlayerHeader({
  view,
  setView,
  wallet,
  currentUser,
  onOpenAuth,
  openAuthModal,
  currentApp = "bingo",
  pokerActiveView,
  onPokerViewChange,
  pokerMode,
  onPokerModeChange,
  pokerSweepsCur,
  onPokerSweepsCurChange,
  walletDisplay,
  activePokerTab = "holdem",
  onPokerTabChange,
  showPokerModesBar,
  handleLogout,
  onLogout,
}: {
  view?: PlayerView;
  setView?: (view: PlayerView) => void;
  wallet: number;
  currentUser?: PlayerModel | null;
  onOpenAuth?: (tab?: "login" | "signup") => void;
  openAuthModal?: (tab?: "login" | "signup") => void;
  currentApp?: "bingo" | "poker";
  pokerActiveView?: "lobby" | "history" | "wallet" | "live" | "ops" | "settings";
  onPokerViewChange?: (view: "lobby" | "history" | "wallet" | "live" | "ops" | "settings") => void;
  pokerMode?: "real" | "sweeps";
  onPokerModeChange?: (mode: "real" | "sweeps") => void;
  pokerSweepsCur?: string;
  onPokerSweepsCurChange?: (cur: string) => void;
  walletDisplay?: string;
  activePokerTab?: "holdem" | "plo" | "spin" | "aof" | "tournaments";
  onPokerTabChange?: (tab: "holdem" | "plo" | "spin" | "aof" | "tournaments") => void;
  showPokerModesBar?: boolean;
  handleLogout?: () => void;
  onLogout?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [liveWallet, setLiveWallet] = useState<number | null>(null);
  const [internalPokerTab, setInternalPokerTab] = useState<"holdem" | "plo" | "spin" | "aof" | "tournaments">(
    activePokerTab || "holdem"
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const handleOpenAuth = onOpenAuth || openAuthModal;

  useEffect(() => {
    if (activePokerTab) {
      setInternalPokerTab(activePokerTab);
    }
  }, [activePokerTab]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const tabParam = new URLSearchParams(window.location.search).get("tab") as any;
      if (tabParam && ["holdem", "plo", "spin", "aof", "tournaments"].includes(tabParam)) {
        setInternalPokerTab(tabParam);
      }
    }
  }, []);

  const currentPokerTab = activePokerTab || internalPokerTab;

  const handlePokerTabClick = (tab: "holdem" | "plo" | "spin" | "aof" | "tournaments") => {
    setInternalPokerTab(tab);
    if (onPokerTabChange) {
      onPokerTabChange(tab);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        window.history.replaceState({}, "", url.toString());
      }
    } else if (typeof window !== "undefined") {
      window.location.href = `/cashgame?tab=${tab}`;
    }
    setMenuOpen(false);
  };

  useEffect(() => {
    setLiveWallet(null);
  }, [wallet]);

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ balance: number }>;
      if (typeof ce.detail?.balance === "number") {
        setLiveWallet(ce.detail.balance);
      }
    };
    window.addEventListener("wallet_balance_updated", onUpdate);
    return () => window.removeEventListener("wallet_balance_updated", onUpdate);
  }, []);

  const activeWalletAmount = liveWallet ?? wallet;

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

  const isBingoActive = currentApp === "bingo" && (view === "lobby" || view === "room");
  const isPokerActive = currentApp === "poker";

  return (
    <>
      <header className="player-header">
      <button
        className="brand-button"
        onClick={() => {
          if (currentApp === "poker") {
            onPokerViewChange?.("lobby");
          } else {
            setView?.("lobby");
          }
        }}
        aria-label="Go to lobby"
      >
        <Logo />
      </button>

      {/* Main navigation: Games, Casino, Bingo, Poker */}
      <nav className="main-nav" aria-label="Player navigation">
        <a
          href="http://14.96.241.250:8005"
          className="main-nav-link"
          title="Go to Games Portal"
        >
          Games
        </a>
        {/* <a
          href="http://14.96.241.250:8005"
          className="main-nav-link"
          title="Go to Casino Portal"
        >
          Casino
        </a> */}
        <button
          className={isBingoActive ? "active" : ""}
          onClick={() => {
            if (currentApp === "poker" || (typeof window !== "undefined" && window.location.pathname !== "/")) {
              window.location.href = "/";
            } else {
              setView?.("lobby");
            }
          }}
          title="Bingo Lobby"
        >
          Bingo
        </button>
        <Link
          href="/cashgame"
          className={`main-nav-link ${currentApp === "poker" ? "active" : ""}`}
          title="Basepoker Cash Game Live"
        >
        Poker
        </Link>
      </nav>

      <div className="header-actions">
        {/* Real / Sweeps Mode Switch for Poker */}
        {currentApp === "poker" && onPokerModeChange && (
          <div className="header-poker-modeswitch" role="group" aria-label="Play mode">
            <button
              className={pokerMode === "real" ? "active" : ""}
              onClick={() => onPokerModeChange("real")}
              title="Real Money Mode"
            >
              Real
            </button>
            <button
              className={pokerMode === "sweeps" ? "active" : ""}
              onClick={() => onPokerModeChange("sweeps")}
              title="Sweepstakes Mode (SC / GC)"
            >
              Sweeps
            </button>
          </div>
        )}

        {currentApp === "poker" && pokerMode === "sweeps" && onPokerSweepsCurChange && (
          <div className="header-poker-modeswitch" role="group" aria-label="Sweeps Currency">
            <button
              className={pokerSweepsCur === "SC" ? "active" : ""}
              onClick={() => onPokerSweepsCurChange("SC")}
              title="Sweeps Coins (Redeemable)"
            >
              SC
            </button>
            <button
              className={pokerSweepsCur === "GC" ? "active" : ""}
              onClick={() => onPokerSweepsCurChange("GC")}
              title="Gold Coins (Play Fun)"
            >
              GC
            </button>
          </div>
        )}

        <div className="wallet">
          <small>WALLET</small>
          <strong>{walletDisplay || money(activeWalletAmount)}</strong>
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
                <strong className="tooltip-wallet-amount">{walletDisplay || money(activeWalletAmount)}</strong>
              </div>

              <div className="tooltip-divider" />

              {/* DYNAMIC SECTIONS BASED ON currentApp */}
              {/* POKER GAME MODES (Available on both Home and Cashgame) */}
              <div className="tooltip-nav-section">
                <div className="tooltip-section-title">POKER GAME MODES</div>
                <button
                  className={`tooltip-item ${currentPokerTab === "holdem" ? "active" : ""}`}
                  onClick={() => handlePokerTabClick("holdem")}
                  role="menuitem"
                >
                  <Cards size={18} weight="fill" className="tooltip-icon" />
                  <span className="tooltip-item-label">Hold&apos;em</span>
                  <span className="tooltip-badge" style={{ background: "#ef4444", color: "#fff" }}>Live</span>
                </button>
                <button
                  className={`tooltip-item ${currentPokerTab === "plo" ? "active" : ""}`}
                  onClick={() => handlePokerTabClick("plo")}
                  role="menuitem"
                >
                  <DiamondsFour size={18} weight="fill" className="tooltip-icon" />
                  <span className="tooltip-item-label">PLO (Omaha)</span>
                </button>
                <button
                  className={`tooltip-item ${currentPokerTab === "spin" ? "active" : ""}`}
                  onClick={() => handlePokerTabClick("spin")}
                  role="menuitem"
                >
                  <Lightning size={18} weight="fill" className="tooltip-icon" />
                  <span className="tooltip-item-label">Spin &amp; Cash</span>
                </button>
                <button
                  className={`tooltip-item ${currentPokerTab === "aof" ? "active" : ""}`}
                  onClick={() => handlePokerTabClick("aof")}
                  role="menuitem"
                >
                  <Fire size={18} weight="fill" className="tooltip-icon" />
                  <span className="tooltip-item-label">All In or Fold</span>
                </button>
                <button
                  className={`tooltip-item ${currentPokerTab === "tournaments" ? "active" : ""}`}
                  onClick={() => handlePokerTabClick("tournaments")}
                  role="menuitem"
                >
                  <Trophy size={18} weight="fill" className="tooltip-icon" />
                  <span className="tooltip-item-label">Tournaments</span>
                </button>
              </div>

              <div className="tooltip-divider" />

              {/* Bingo Sections if currentApp is bingo */}
              {currentApp === "bingo" ? (
                <>
                  <div className="tooltip-nav-section">
                    <div className="tooltip-section-title">BINGO SECTIONS</div>
                    <button
                      className={`tooltip-item ${view === "tickets" ? "active" : ""}`}
                      onClick={() => {
                        setView?.("tickets");
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
                        setView?.("jackpots");
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
                        setView?.("tournaments");
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
                        setView?.("promotions");
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
                        setView?.("history");
                        setMenuOpen(false);
                      }}
                      role="menuitem"
                    >
                      <ClockCounterClockwise size={18} weight="bold" className="tooltip-icon" />
                      <span className="tooltip-item-label">History</span>
                    </button>
                  </div>

                  <div className="tooltip-divider" />

                  {/* Switch Game */}
                  <div className="tooltip-nav-section">
                    <div className="tooltip-section-title">QUICK PLAY</div>
                    <Link
                      href="/cashgame"
                      className="tooltip-item"
                      onClick={() => setMenuOpen(false)}
                      role="menuitem"
                    >
                      <Cards size={18} weight="fill" className="tooltip-icon" />
                      <span className="tooltip-item-label">Play Poker Cash Games</span>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  {/* Switch Game */}
                  <div className="tooltip-nav-section">
                    <div className="tooltip-section-title">SWITCH GAME</div>
                    <Link
                      href="/"
                      className="tooltip-item"
                      onClick={() => setMenuOpen(false)}
                      role="menuitem"
                    >
                      <DiamondsFour size={18} weight="fill" className="tooltip-icon" />
                      <span className="tooltip-item-label">Play Bingo</span>
                    </Link>
                    <a
                      href="http://14.96.241.250:8005"
                      className="tooltip-item"
                      onClick={() => setMenuOpen(false)}
                      role="menuitem"
                    >
                      <Cards size={18} weight="fill" className="tooltip-icon" />
                      <span className="tooltip-item-label">Games Portal</span>
                    </a>
                  </div>
                </>
              )}

              <div className="tooltip-divider" />

              {/* Account management */}
              <div className="tooltip-nav-section">
                <div className="tooltip-section-title">ACCOUNT</div>
                <button
                  className={`tooltip-item ${view === "profile" ? "active" : ""}`}
                  onClick={() => {
                    if (setView) {
                      setView("profile");
                    } else {
                      setHistoryModalOpen(true);
                    }
                    setMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <User size={18} weight="fill" className="tooltip-icon" />
                  <span className="tooltip-item-label">Profile</span>
                </button>
                <button
                  className="tooltip-item"
                  onClick={() => {
                    setHistoryModalOpen(true);
                    setMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <ClockCounterClockwise size={18} weight="bold" className="tooltip-icon" />
                  <span className="tooltip-item-label">Transaction History</span>
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

      {/* Unified Player History & Profile Modal */}
      <PlayerHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        currentUser={currentUser}
        walletBalance={wallet}
      />

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
        .header-poker-modeswitch {
          display: flex !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-radius: 999px !important;
          padding: 2px !important;
          gap: 2px !important;
          margin-right: 6px !important;
        }
        .header-poker-modeswitch button {
          background: transparent !important;
          border: 0 !important;
          color: #9d9ab5 !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          padding: 4px 10px !important;
          border-radius: 999px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }
        .header-poker-modeswitch button:hover {
          color: #ffffff !important;
        }
        .header-poker-modeswitch button.active {
          background: linear-gradient(135deg, #7868ff, #5943e9) !important;
          color: #ffffff !important;
          box-shadow: 0 2px 8px rgba(120, 104, 255, 0.4) !important;
        }

        /* ================= POKER GAME MODES TOP BAR ================= */
        .poker-game-modes-bar {
          position: sticky;
          top: 70px;
          z-index: 45;
          background: rgba(13, 9, 36, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
          width: 100%;
        }
        .poker-modes-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 24px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .poker-modes-container::-webkit-scrollbar {
          display: none;
        }
        .poker-mode-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          text-decoration: none;
        }
        .poker-mode-tab:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.16);
          transform: translateY(-1px);
        }
        .poker-mode-tab.active {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.32), rgba(99, 102, 241, 0.24));
          border-color: rgba(167, 139, 250, 0.7);
          color: #ffffff;
          box-shadow: 0 0 16px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        .poker-tab-icon {
          color: #a78bfa;
          transition: transform 0.2s ease;
        }
        .poker-mode-tab.active .poker-tab-icon {
          color: #c4b5fd;
          transform: scale(1.1);
        }
        .poker-tab-name {
          letter-spacing: -0.2px;
        }
        .poker-tab-badge {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.5px;
          padding: 2px 7px;
          border-radius: 999px;
          text-transform: uppercase;
        }
        .poker-tab-badge.live-pulse {
          background: linear-gradient(135deg, #ef4444, #ec4899);
          color: #ffffff;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
          animation: bpLivePulse 2s infinite ease-in-out;
        }
        @keyframes bpLivePulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(0.96);
          }
        }
        .poker-tab-badge.plo-badge {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.4);
        }
        .poker-tab-badge.jackpot-badge {
          background: linear-gradient(135deg, #f59e0b, #eab308);
          color: #1a1003;
          font-weight: 900;
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
        }
        .poker-tab-badge.action-badge {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }
        .poker-tab-badge.mtt-badge {
          background: rgba(168, 85, 247, 0.2);
          color: #c084fc;
          border: 1px solid rgba(168, 85, 247, 0.4);
        }
      `}</style>
    </header>
    {(showPokerModesBar ?? true) && (
      <nav className="poker-game-modes-bar" aria-label="Poker Game Modes Navigation">
        <div className="poker-modes-container">
          <button
            type="button"
            className={`poker-mode-tab ${currentPokerTab === "holdem" ? "active" : ""}`}
            onClick={() => handlePokerTabClick("holdem")}
          >
            <Cards size={16} weight="fill" className="poker-tab-icon" />
            <span className="poker-tab-name">Hold&apos;em</span>
            <span className="poker-tab-badge live-pulse">LIVE</span>
          </button>

          <button
            type="button"
            className={`poker-mode-tab ${currentPokerTab === "plo" ? "active" : ""}`}
            onClick={() => handlePokerTabClick("plo")}
          >
            <DiamondsFour size={16} weight="fill" className="poker-tab-icon" />
            <span className="poker-tab-name">PLO (Omaha)</span>
            <span className="poker-tab-badge plo-badge">4-Card</span>
          </button>

          <button
            type="button"
            className={`poker-mode-tab ${currentPokerTab === "spin" ? "active" : ""}`}
            onClick={() => handlePokerTabClick("spin")}
          >
            <Lightning size={16} weight="fill" className="poker-tab-icon" />
            <span className="poker-tab-name">Spin &amp; Cash</span>
            <span className="poker-tab-badge jackpot-badge">Jackpot</span>
          </button>

          <button
            type="button"
            className={`poker-mode-tab ${currentPokerTab === "aof" ? "active" : ""}`}
            onClick={() => handlePokerTabClick("aof")}
          >
            <Fire size={16} weight="fill" className="poker-tab-icon" />
            <span className="poker-tab-name">All In or Fold</span>
            <span className="poker-tab-badge action-badge">Action</span>
          </button>

          <button
            type="button"
            className={`poker-mode-tab ${currentPokerTab === "tournaments" ? "active" : ""}`}
            onClick={() => handlePokerTabClick("tournaments")}
          >
            <Trophy size={16} weight="fill" className="poker-tab-icon" />
            <span className="poker-tab-name">Tournaments</span>
            <span className="poker-tab-badge mtt-badge">MTT</span>
          </button>
        </div>
      </nav>
    )}
  </>
  );
}
