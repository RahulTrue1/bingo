"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BasepokerTableItem,
  getStoredPokerTables,
  findPokerTable,
} from "../../poker/poker-tables-store";
import { PlayerHeader } from "../../components/player/PlayerHeader";
import { AuthModal } from "../../components/player/AuthModal";
import { apiClient, type PlayerModel } from "../../api-client";
import "../../poker/poker.css";
import { Bet888LiveTable } from "../../poker/Bet888LiveTable";

export default function BasepokerHoldemTablesView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const codeParam = searchParams.get("code") || "";
  const [allTables, setAllTables] = useState<BasepokerTableItem[]>([]);
  const [activeTableCode, setActiveTableCode] = useState<string>(codeParam);
  const [openTableCodes, setOpenTableCodes] = useState<string[]>([]);
  const [showAddTableModal, setShowAddTableModal] = useState(false);

  // Unified Player Wallet & User State (matching Bingo)
  const [wallet, setWallet] = useState(10000);
  const [currentUser, setCurrentUser] = useState<PlayerModel | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const refreshWallet = useCallback((targetUsername?: string) => {
    const user = targetUsername || currentUser?.username || apiClient.auth.getStoredUsername();
    apiClient.wallet.get(user || undefined).then((w) => {
      if (w && typeof w.balance === "number") setWallet(w.balance);
    }).catch(() => {});
  }, [currentUser?.username]);

  const refreshUser = useCallback((targetUsername?: string) => {
    const user = targetUsername || currentUser?.username || apiClient.auth.getStoredUsername();
    apiClient.auth.me(user || undefined).then((res) => {
      if (res?.user) {
        setCurrentUser(res.user);
        if (typeof res.wallet === "number") setWallet(res.wallet);
      }
    }).catch(() => {});
  }, [currentUser?.username]);

  useEffect(() => {
    refreshWallet();
    refreshUser();
    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "wallet") {
        refreshWallet();
        refreshUser();
      }
    });
    return unsub;
  }, [refreshWallet, refreshUser]);

  const handleAuthSuccess = (user: PlayerModel, newWallet: number) => {
    apiClient.auth.setStoredUsername(user.username);
    setCurrentUser(user);
    setWallet(newWallet);
    setAuthModalOpen(false);
  };

  const handleLogout = () => {
    apiClient.auth.logout();
    setCurrentUser(null);
    refreshWallet();
  };

  // Load tables on mount
  useEffect(() => {
    const list = getStoredPokerTables();
    setAllTables(list);

    let initialCode = codeParam;
    if (!initialCode && list.length > 0) {
      initialCode = list[0].inviteCode || list[0].id;
    }

    setActiveTableCode(initialCode);
    if (initialCode && !openTableCodes.includes(initialCode)) {
      setOpenTableCodes([initialCode]);
    }
  }, [codeParam]);

  // Synchronize when URL codeParam changes
  useEffect(() => {
    if (codeParam) {
      setActiveTableCode(codeParam);
      setOpenTableCodes((prev) => (prev.includes(codeParam) ? prev : [...prev, codeParam]));
    }
  }, [codeParam]);

  // Resolve current active table
  const activeTable = useMemo<BasepokerTableItem>(() => {
    if (activeTableCode) {
      const match = findPokerTable(activeTableCode);
      if (match) return match;
    }
    if (allTables.length > 0) return allTables[0];

    // Fallback default table if store is empty
    return {
      id: "tbl-fallback",
      name: "Hold'em Cash 5/10",
      feeType: "RAKE",
      feeLabel: "RAKE 5%",
      sb: 5,
      bb: 10,
      minBuyIn: 200,
      maxBuyIn: 2000,
      maxSeats: 6,
      seatsOccupied: 4,
      status: "playing",
      isPrivate: false,
      theme: "green",
      tier: "medium",
    };
  }, [activeTableCode, allTables]);

  // Switch to another open table tab
  const handleSelectTab = (code: string) => {
    setActiveTableCode(code);
    router.replace(`/holdem/tables?code=${encodeURIComponent(code)}`);
  };

  // Close a table tab
  const handleCloseTab = (e: React.MouseEvent, codeToClose: string) => {
    e.stopPropagation();
    const remaining = openTableCodes.filter((c) => c !== codeToClose);
    if (remaining.length === 0) {
      router.push("/cashgame");
      return;
    }
    setOpenTableCodes(remaining);
    if (activeTableCode === codeToClose) {
      const nextActive = remaining[0];
      setActiveTableCode(nextActive);
      router.replace(`/holdem/tables?code=${encodeURIComponent(nextActive)}`);
    }
  };

  // Open additional table from "+ Add Table"
  const handleAddTableSelect = (table: BasepokerTableItem) => {
    const code = table.inviteCode || table.id;
    if (!openTableCodes.includes(code)) {
      setOpenTableCodes((prev) => [...prev, code]);
    }
    setActiveTableCode(code);
    setShowAddTableModal(false);
    router.replace(`/holdem/tables?code=${encodeURIComponent(code)}`);
  };

  // Stand up / leave table handler
  const handleLeaveTable = (cashedOutStack?: number) => {
    const remaining = openTableCodes.filter((c) => c !== activeTableCode);
    if (remaining.length === 0) {
      router.push("/cashgame");
    } else {
      setOpenTableCodes(remaining);
      setActiveTableCode(remaining[0]);
      router.replace(`/holdem/tables?code=${encodeURIComponent(remaining[0])}`);
    }
  };

  return (
    <div className="player-shell bp-holdem-page-root">
      {/* ================= BINGO UNIFIED PLAYER HEADER ================= */}
      <PlayerHeader
        wallet={wallet}
        currentUser={currentUser}
        currentApp="poker"
        onOpenAuth={() => setAuthModalOpen(true)}
        openAuthModal={() => setAuthModalOpen(true)}
        handleLogout={handleLogout}
        activePokerTab="holdem"
        onPokerTabChange={(tab) => {
          if (typeof window !== "undefined") {
            window.location.href = `/cashgame?mode=${tab}`;
          }
        }}
      />

      {/* ================= MULTI-TABLE TOP BAR ================= */}
      <header className="bp-top-multibar">
        {/* Left: Back to Cash Game */}
        <div className="bp-multibar-left">
          <Link href="/cashgame" className="bp-btn-back-lobby">
            <span>←</span>
            <span>Cash Game Lobby</span>
          </Link>

          <div className="bp-sep" />

          {/* Multi-Table Tabs */}
          <div className="bp-tabs-strip">
            {openTableCodes.map((code) => {
              const tbl = findPokerTable(code);
              const isActive = activeTableCode === code;
              return (
                <div
                  key={code}
                  className={`bp-table-tab ${isActive ? "active" : ""}`}
                  onClick={() => handleSelectTab(code)}
                >
                  <span className="bp-tab-spade">♠</span>
                  <span className="bp-tab-name">{tbl?.name || `Table ${code}`}</span>
                  <span className="bp-tab-blinds">
                    {tbl ? `${tbl.sb}/${tbl.bb}` : ""}
                  </span>
                  <button
                    type="button"
                    className="bp-tab-close"
                    onClick={(e) => handleCloseTab(e, code)}
                    title="Close Table"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {/* Add Table Button */}
            <button
              type="button"
              className="bp-add-table-btn"
              onClick={() => setShowAddTableModal(true)}
              title="Open Another Table (Multi-Table)"
            >
              + Add Table
            </button>
          </div>
        </div>
      </header>

      {/* ================= LIVE STADIUM TABLE VIEW ================= */}
      <div className="bp-table-workspace">
        <Bet888LiveTable
          table={activeTable}
          onLeaveTable={handleLeaveTable}
          walletBalance={wallet}
          userName={currentUser?.displayName || currentUser?.username || "Hero"}
          embedded={true}
        />
      </div>

      {/* ================= AUTH MODAL ================= */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* ================= ADD TABLE MODAL (MULTI-TABLE PICKER) ================= */}
      {showAddTableModal && (
        <div className="bp-modal-backdrop" onClick={() => setShowAddTableModal(false)}>
          <div className="bp-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="bp-modal-head">
              <h3>Select Table to Open (Multi-Table)</h3>
              <button className="bp-modal-close" onClick={() => setShowAddTableModal(false)}>
                ×
              </button>
            </div>

            <div className="bp-modal-list">
              {allTables.map((tbl) => {
                const code = tbl.inviteCode || tbl.id;
                const isAlreadyOpen = openTableCodes.includes(code);
                return (
                  <div
                    key={tbl.id}
                    className={`bp-modal-table-item ${isAlreadyOpen ? "is-open" : ""}`}
                    onClick={() => handleAddTableSelect(tbl)}
                  >
                    <div className="bp-modal-item-info">
                      <div className="title">
                        <strong>{tbl.name}</strong>
                        <span className={`tag tag-${tbl.theme}`}>{tbl.feeLabel}</span>
                      </div>
                      <div className="sub">
                        Blinds €{tbl.sb} / €{tbl.bb} • {tbl.seatsOccupied}/{tbl.maxSeats} Players • Buy-in €{tbl.minBuyIn}+
                      </div>
                    </div>
                    <button type="button" className="bp-modal-select-btn">
                      {isAlreadyOpen ? "Switch" : "Open"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= INLINE STYLES ================= */}
      <style jsx>{`
        .bp-holdem-page-root {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #0c0920;
          display: flex;
          flex-direction: column;
        }

        /* Multi-Table Top Bar */
        .bp-top-multibar {
          height: 48px;
          background: #0e0a24;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          flex-shrink: 0;
          z-index: 40;
        }

        .bp-multibar-left {
          display: flex;
          align-items: center;
          gap: 12px;
          overflow-x: auto;
        }

        .bp-btn-back-lobby {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #928ca7;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .bp-btn-back-lobby:hover {
          color: #fff;
          background: rgba(120, 104, 255, 0.15);
          border-color: rgba(120, 104, 255, 0.35);
        }

        .bp-sep {
          width: 1px;
          height: 20px;
          background: rgba(255, 255, 255, 0.1);
        }

        .bp-tabs-strip {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .bp-table-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #17122f;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 700;
          color: #928ca7;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .bp-table-tab:hover {
          background: #1f1742;
          color: #fff;
        }

        .bp-table-tab.active {
          background: #23194a;
          border-color: #7868ff;
          color: #fff;
          box-shadow: 0 2px 10px rgba(120, 104, 255, 0.35);
        }

        .bp-tab-spade {
          color: #8a78ff;
          font-size: 11px;
        }

        .bp-tab-blinds {
          font-size: 10px;
          color: #f6bd49;
          font-weight: 800;
        }

        .bp-tab-close {
          background: none;
          border: none;
          color: #928ca7;
          cursor: pointer;
          font-size: 14px;
          padding: 0 2px;
          margin-left: 4px;
          transition: color 0.15s ease;
        }

        .bp-tab-close:hover {
          color: #ff725e;
        }

        .bp-add-table-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px dashed rgba(255, 255, 255, 0.18);
          color: #928ca7;
          border-radius: 8px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .bp-add-table-btn:hover {
          background: rgba(120, 104, 255, 0.12);
          border-color: #7868ff;
          color: #fff;
        }

        .bp-multibar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .bp-wallet-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 800;
          color: #f6bd49;
        }

        .bp-link-bo {
          color: #928ca7;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.2s ease;
        }

        .bp-link-bo:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }

        /* Workspace */
        .bp-table-workspace {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        /* Modal */
        .bp-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 7, 30, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 16px;
        }

        .bp-modal-box {
          background: #17122f;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
        }

        .bp-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #120e28;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .bp-modal-head h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #fff;
        }

        .bp-modal-close {
          background: none;
          border: none;
          color: #928ca7;
          font-size: 20px;
          cursor: pointer;
        }

        .bp-modal-list {
          overflow-y: auto;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bp-modal-table-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .bp-modal-table-item:hover {
          background: rgba(120, 104, 255, 0.12);
          border-color: #7868ff;
        }

        .bp-modal-table-item.is-open {
          border-left: 3px solid #7868ff;
        }

        .bp-modal-item-info .title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
        }

        .bp-modal-item-info .sub {
          font-size: 11px;
          color: #928ca7;
          margin-top: 3px;
        }

        .tag {
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .tag-green {
          background: rgba(39, 215, 173, 0.15);
          color: #27d7ad;
        }

        .tag-blue {
          background: rgba(120, 104, 255, 0.15);
          color: #a496ff;
        }

        .tag-red {
          background: rgba(255, 114, 94, 0.15);
          color: #ff725e;
        }

        .tag-purple {
          background: rgba(120, 104, 255, 0.25);
          color: #c4b5fd;
        }

        .bp-modal-select-btn {
          background: linear-gradient(135deg, #7868ff, #5943e9);
          border: none;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          padding: 7px 16px;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(120, 104, 255, 0.35);
        }
      `}</style>
    </div>
  );
}
