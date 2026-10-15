"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BasepokerTableItem,
  StakeTier,
  INITIAL_BASEPOKER_TABLES,
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

  const codeParam = searchParams?.get("code") || "";
  const tableIdParam = searchParams?.get("tableId") || "";
  const initialTarget = tableIdParam || codeParam;

  const [allTables, setAllTables] = useState<BasepokerTableItem[]>(() => {
    if (typeof window !== "undefined") {
      return getStoredPokerTables();
    }
    return INITIAL_BASEPOKER_TABLES;
  });

  const [activeTableCode, setActiveTableCode] = useState<string>(() => {
    if (initialTarget) return initialTarget;
    if (typeof window !== "undefined") {
      const list = getStoredPokerTables();
      if (list.length > 0) return list[0].inviteCode || list[0].id;
    }
    return "micro-001-002";
  });

  const [openTableCodes, setOpenTableCodes] = useState<string[]>(() => {
    const initial =
      initialTarget ||
      (typeof window !== "undefined"
        ? getStoredPokerTables()[0]?.inviteCode || getStoredPokerTables()[0]?.id
        : "micro-001-002") ||
      "micro-001-002";
    return [initial];
  });
  const [showAddTableModal, setShowAddTableModal] = useState(false);

  // Unified Player Wallet & User State (matching Bingo)
  const [wallet, setWallet] = useState(10000);
  const [currentUser, setCurrentUser] = useState<PlayerModel | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Private table access control
  const [unlockedCodes, setUnlockedCodes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (codeParam) initial.add(codeParam.trim().toLowerCase());
    if (tableIdParam) initial.add(tableIdParam.trim().toLowerCase());
    return initial;
  });
  const [privateTableToUnlock, setPrivateTableToUnlock] = useState<BasepokerTableItem | null>(null);
  const [privateCodeInput, setPrivateCodeInput] = useState("");
  const [privateCodeError, setPrivateCodeError] = useState("");

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

    const handleWalletUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ balance: number }>;
      if (typeof custom.detail?.balance === "number") {
        setWallet(custom.detail.balance);
      }
    };
    window.addEventListener("wallet_balance_updated", handleWalletUpdate);

    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "wallet") {
        refreshWallet();
        refreshUser();
      }
    });

    return () => {
      window.removeEventListener("wallet_balance_updated", handleWalletUpdate);
      unsub();
    };
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

  const isCurrentUserBlocked = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.status === "Restricted" ||
      currentUser.status === "Suspended"
    );
  }, [currentUser]);

  // Ensure poker access is enabled for active user
  useEffect(() => {
    if (currentUser && currentUser.poker_enabled === false) {
      apiClient.poker.enableAccess(currentUser.username).then(() => {
        refreshUser();
      }).catch(() => {});
    }
  }, [currentUser, refreshUser]);

  // Synchronize server poker tables with local store
  const loadServerTables = useCallback(async () => {
    try {
      const res = await apiClient.poker.getTables();
      const stored = getStoredPokerTables();
      if (res?.success && Array.isArray(res.tables)) {
        const mappedServer: BasepokerTableItem[] = res.tables.map((t: any) => {
          const tier =
            t.bb <= 0.1 ? "micro" : t.bb <= 2 ? "low" : t.bb <= 20 ? "medium" : t.bb <= 100 ? "high" : "vip";
          const feeLabel =
            t.feeType === "HAND_FEE"
              ? `€${t.handFeeAmount || 2} / HAND`
              : t.feeType === "TABLE_FEE"
              ? `€${t.tableFeeAmount || 20} / ${t.tableFeeIntervalMinutes || 30}MIN`
              : t.rakeCap
              ? `RAKE ${t.rakePercent || 5}% (max €${t.rakeCap})`
              : `RAKE ${t.rakePercent || 5}%`;
          const theme =
            t.isPrivate
              ? "purple"
              : t.feeType === "HAND_FEE"
              ? "blue"
              : t.feeType === "TABLE_FEE"
              ? "red"
              : "green";

          return {
            id: t.id,
            name: t.name,
            feeType: t.feeType,
            feeLabel,
            sb: t.sb,
            bb: t.bb,
            minBuyIn: t.minBuyIn,
            maxBuyIn: t.maxBuyIn,
            maxSeats: t.maxSeats,
            seatsOccupied: (t.seats || []).filter((s: any) => Boolean(s.player)).length,
            status: t.status === "paused" ? "paused" : t.status === "closed" ? "waiting" : "playing",
            isPrivate: t.isPrivate,
            inviteCode: t.inviteCode || "",
            theme,
            tier,
            avgPot: t.pot || t.bb * 8,
            handsPerHour: 60,
            waitlist: 0,
            currency: "EUR",
            seats: t.seats || [],
          };
        });

        const serverIds = new Set(mappedServer.map((s) => s.id));
        const uniqueStored = stored.filter((st) => !serverIds.has(st.id));
        setAllTables([...mappedServer, ...uniqueStored]);
      } else {
        setAllTables(stored);
      }
    } catch (_) {
      setAllTables(getStoredPokerTables());
    }
  }, []);

  useEffect(() => {
    loadServerTables();
  }, [loadServerTables]);

  // Synchronize when codeParam or tableIdParam in URL changes
  useEffect(() => {
    const target = tableIdParam || codeParam;
    if (!target) return;
    setActiveTableCode(target);
    setOpenTableCodes((prev) => {
      const alreadyOpen = prev.some((c) => c.toLowerCase() === target.toLowerCase());
      return alreadyOpen ? prev : [...prev, target];
    });
    if (codeParam) {
      setUnlockedCodes((prev) => {
        const next = new Set(prev);
        next.add(codeParam.trim().toLowerCase());
        if (tableIdParam) next.add(tableIdParam.trim().toLowerCase());
        return next;
      });
    }
  }, [codeParam, tableIdParam]);

  // Listen to store & server fleet updates (table create/delete/status from backoffice)
  useEffect(() => {
    const syncTables = async () => {
      let list = getStoredPokerTables();
      try {
        const res = await apiClient.poker.getTables();
        if (res?.success && Array.isArray(res.tables)) {
          const mappedServer: BasepokerTableItem[] = res.tables.map((t: any) => {
            const tier: StakeTier =
              t.bb <= 0.1 ? "micro" : t.bb <= 2 ? "low" : t.bb <= 20 ? "medium" : t.bb <= 100 ? "high" : "vip";
            const feeLabel =
              t.feeType === "HAND_FEE"
                ? `€${t.handFeeAmount || 2} / HAND`
                : t.feeType === "TABLE_FEE"
                ? `€${t.tableFeeAmount || 20} / ${t.tableFeeIntervalMinutes || 30}MIN`
                : t.rakeCap
                ? `RAKE ${t.rakePercent || 5}% (max €${t.rakeCap})`
                : `RAKE ${t.rakePercent || 5}%`;
            const theme: "green" | "blue" | "red" | "purple" =
              t.isPrivate
                ? "purple"
                : t.feeType === "HAND_FEE"
                ? "blue"
                : t.feeType === "TABLE_FEE"
                ? "red"
                : "green";

            return {
              id: t.id,
              name: t.name,
              feeType: t.feeType,
              feeLabel,
              sb: t.sb,
              bb: t.bb,
              minBuyIn: t.minBuyIn,
              maxBuyIn: t.maxBuyIn,
              maxSeats: t.maxSeats,
              seatsOccupied: (t.seats || []).filter((s: any) => Boolean(s.player)).length,
              status: t.status === "paused" ? "paused" : t.status === "closed" ? "waiting" : "playing",
              isPrivate: t.isPrivate,
              inviteCode: t.inviteCode || "",
              theme,
              tier,
              avgPot: t.pot || t.bb * 8,
              handsPerHour: 60,
              waitlist: 0,
              currency: "EUR",
              seats: t.seats || [],
            };
          });
          const serverIds = new Set(mappedServer.map((s) => s.id));
          const serverNames = new Set(mappedServer.map((s) => s.name.toLowerCase()));
          const uniqueStored = list.filter((st) => !serverIds.has(st.id) && !serverNames.has(st.name.toLowerCase()));
          list = [...mappedServer, ...uniqueStored];
        }
      } catch (_) {}

      setAllTables(list);

      // Clean up openTableCodes if tables were deleted in backoffice
      setOpenTableCodes((prev) => {
        const validCodes = prev.filter((c) =>
          list.some(
            (t) =>
              t.id.toLowerCase() === c.toLowerCase() ||
              (t.inviteCode && t.inviteCode.toLowerCase() === c.toLowerCase())
          )
        );
        if (validCodes.length === 0 && list.length > 0) {
          return [list[0].inviteCode || list[0].id];
        }
        return validCodes.length > 0 ? validCodes : prev;
      });
    };

    syncTables();

    window.addEventListener("basepoker_tables_updated", syncTables);
    window.addEventListener("storage", syncTables);

    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "rooms" || event.action?.includes("poker")) {
        syncTables();
      }
    });

    return () => {
      window.removeEventListener("basepoker_tables_updated", syncTables);
      window.removeEventListener("storage", syncTables);
      unsub();
    };
  }, []);

  // Compute guaranteed effective active table code (never blank / out of sync)
  const effectiveActiveCode = useMemo(() => {
    if (openTableCodes.length === 0) return activeTableCode;
    const found = openTableCodes.find(
      (c) => c.toLowerCase() === (activeTableCode || "").toLowerCase()
    );
    return found || openTableCodes[0];
  }, [openTableCodes, activeTableCode]);

  // Resolve current active table
  const activeTable = useMemo<BasepokerTableItem>(() => {
    if (effectiveActiveCode) {
      const match =
        allTables.find(
          (t) =>
            t.id.toLowerCase() === effectiveActiveCode.toLowerCase() ||
            (t.inviteCode && t.inviteCode.toLowerCase() === effectiveActiveCode.toLowerCase())
        ) || findPokerTable(effectiveActiveCode);
      if (match) return match;
    }
    if (allTables.length > 0) return allTables[0];

    // Fallback default table if store is empty
    return INITIAL_BASEPOKER_TABLES[0] || {
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
  }, [effectiveActiveCode, allTables]);

  // Switch to another open table tab
  const handleSelectTab = (code: string) => {
    setActiveTableCode(code);
    router.replace(`/holdem/tables?code=${encodeURIComponent(code)}`);
  };

  // Close a table tab
  const handleCloseTab = (e: React.MouseEvent, codeToClose: string) => {
    e.stopPropagation();
    const remaining = openTableCodes.filter(
      (c) => c.toLowerCase() !== codeToClose.toLowerCase()
    );
    if (remaining.length === 0) {
      router.push("/cashgame");
      return;
    }
    setOpenTableCodes(remaining);
    const nextActive = remaining[0];
    setActiveTableCode(nextActive);
    router.replace(`/holdem/tables?code=${encodeURIComponent(nextActive)}`);
  };

  // Open additional table from "+ Add Table"
  const handleAddTableSelect = (table: BasepokerTableItem) => {
    if (table.isPrivate) {
      const isAlreadyUnlocked =
        unlockedCodes.has(table.id.toLowerCase()) ||
        (table.inviteCode && unlockedCodes.has(table.inviteCode.toLowerCase()));
      if (!isAlreadyUnlocked) {
        setPrivateTableToUnlock(table);
        setPrivateCodeInput("");
        setPrivateCodeError("");
        return;
      }
    }
    const code = table.inviteCode || table.id;
    if (!openTableCodes.some((c) => c.toLowerCase() === code.toLowerCase())) {
      setOpenTableCodes((prev) => [...prev, code]);
    }
    setActiveTableCode(code);
    setShowAddTableModal(false);
    router.replace(`/holdem/tables?code=${encodeURIComponent(code)}`);
  };

  const handleUnlockPrivateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateTableToUnlock) return;
    const cleanInput = privateCodeInput.trim().toUpperCase();

    if (!cleanInput) {
      setPrivateCodeError("Please enter the invite code.");
      return;
    }

    try {
      const res = await apiClient.poker.joinPrivateTable(cleanInput);
      if (res?.success && res.table) {
        const table = privateTableToUnlock;
        const code = cleanInput;
        setUnlockedCodes((prev) => {
          const next = new Set(prev);
          next.add(table.id.toLowerCase());
          next.add(code.toLowerCase());
          return next;
        });
        if (!openTableCodes.some((c) => c.toLowerCase() === code.toLowerCase() || c.toLowerCase() === table.id.toLowerCase())) {
          setOpenTableCodes((prev) => [...prev, table.id]);
        }
        setActiveTableCode(table.id);
        setPrivateTableToUnlock(null);
        setPrivateCodeInput("");
        setPrivateCodeError("");
        setShowAddTableModal(false);
        router.replace(`/holdem/tables?tableId=${encodeURIComponent(table.id)}&code=${encodeURIComponent(code)}`);
        return;
      }
    } catch (_) {}

    const actualCode = (privateTableToUnlock.inviteCode || "").trim().toUpperCase();
    if (cleanInput === actualCode) {
      const table = privateTableToUnlock;
      const code = table.inviteCode || table.id;
      setUnlockedCodes((prev) => {
        const next = new Set(prev);
        next.add(table.id.toLowerCase());
        if (table.inviteCode) next.add(table.inviteCode.toLowerCase());
        return next;
      });
      if (!openTableCodes.some((c) => c.toLowerCase() === code.toLowerCase())) {
        setOpenTableCodes((prev) => [...prev, code]);
      }
      setActiveTableCode(code);
      setPrivateTableToUnlock(null);
      setPrivateCodeInput("");
      setPrivateCodeError("");
      setShowAddTableModal(false);
      router.replace(`/holdem/tables?code=${encodeURIComponent(code)}`);
    } else {
      setPrivateCodeError("Incorrect code. Please enter the valid table code to join.");
    }
  };

  // Stand up / leave table handler
  const handleLeaveTable = (cashedOutStack?: number) => {
    if (cashedOutStack && cashedOutStack > 0) {
      apiClient.wallet
        .pokerTransaction({
          username: currentUser?.username,
          type: "Poker Cashout",
          amount: cashedOutStack,
          tableName: activeTable.name,
          detail: `Cashed out ${cashedOutStack} chips`,
        })
        .then((res) => {
          if (res?.success && typeof res.balance === "number") {
            setWallet(res.balance);
          }
        })
        .catch(() => {});
    }
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
        showPokerModesBar={false}
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

          <Link
            href="/poker-guide"
            className="bp-btn-back-lobby"
            title="Read Rules & How to Play"
            style={{ color: "#f6bd49", borderColor: "rgba(246, 189, 73, 0.35)", background: "rgba(246, 189, 73, 0.08)" }}
          >
            <span>📖</span>
            <span>Poker Guide</span>
          </Link>

          <div className="bp-sep" />

          {/* Multi-Table Tabs */}
          <div className="bp-tabs-strip">
            {openTableCodes.map((code) => {
              const tbl =
                allTables.find(
                  (t) =>
                    t.id.toLowerCase() === code.toLowerCase() ||
                    (t.inviteCode && t.inviteCode.toLowerCase() === code.toLowerCase())
                ) || findPokerTable(code);
              const isActive = code.toLowerCase() === effectiveActiveCode.toLowerCase();
              return (
                <div
                  key={code}
                  className={`bp-table-tab ${isActive ? "active" : ""}`}
                  onClick={() => handleSelectTab(code)}
                >
                  <span className="bp-tab-spade">♠</span>
                  <span className="bp-tab-name">{tbl?.name || `Table ${code}`}</span>
                  {tbl?.status === "paused" && (
                    <span style={{
                      fontSize: 8,
                      fontWeight: 800,
                      padding: "1px 4px",
                      borderRadius: 3,
                      background: "rgba(245, 158, 11, 0.2)",
                      border: "1px solid #f59e0b",
                      color: "#fbbf24",
                      marginLeft: 4,
                    }}>
                      ⏸ PAUSED
                    </span>
                  )}
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

      {/* ================= LIVE STADIUM TABLE VIEW (MULTI-TABLE CONCURRENT) ================= */}
      <div className="bp-table-workspace" style={{ display: "flex", flex: 1, position: "relative", overflow: "hidden", width: "100%", height: "100%" }}>
        {openTableCodes.map((code) => {
          const tbl =
            allTables.find(
              (t) =>
                t.id.toLowerCase() === code.toLowerCase() ||
                (t.inviteCode && t.inviteCode.toLowerCase() === code.toLowerCase())
            ) ||
            findPokerTable(code) ||
            activeTable;
          const isVisible = code.toLowerCase() === effectiveActiveCode.toLowerCase();
          const isUnlocked =
            !tbl.isPrivate ||
            unlockedCodes.has(tbl.id.toLowerCase()) ||
            (tbl.inviteCode && unlockedCodes.has(tbl.inviteCode.toLowerCase())) ||
            (codeParam && tbl.inviteCode && codeParam.trim().toLowerCase() === tbl.inviteCode.toLowerCase());

          return (
            <div
              key={code}
              style={{
                display: isVisible ? "flex" : "none",
                width: "100%",
                height: "100%",
                flex: 1,
                flexDirection: "column",
              }}
            >
              {!isUnlocked ? (
                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#0c0920",
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      background: "linear-gradient(180deg, #1f153a 0%, #100b24 100%)",
                      border: "1px solid rgba(168, 85, 247, 0.45)",
                      borderRadius: 18,
                      maxWidth: 440,
                      width: "100%",
                      padding: 28,
                      textAlign: "center",
                      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(168, 85, 247, 0.25)",
                    }}
                  >
                    <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
                    <h3 style={{ color: "#fff", margin: "0 0 6px", fontSize: 20, fontWeight: 800 }}>
                      Private Table Access
                    </h3>
                    <p style={{ color: "#c4b5fd", fontSize: 13, margin: "0 0 14px", fontWeight: 600 }}>
                      {tbl.name} • €{tbl.sb}/€{tbl.bb} NLH
                    </p>
                    <p style={{ color: "#a5a2bb", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
                      This table is private. Please enter the invite code provided by the table host to join.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setPrivateTableToUnlock(tbl);
                        handleUnlockPrivateTable(e);
                      }}
                      style={{ display: "flex", flexDirection: "column", gap: 14 }}
                    >
                      <input
                        type="text"
                        placeholder="Enter Invite Code (e.g. 7KJ8P9)"
                        maxLength={12}
                        value={privateCodeInput}
                        onChange={(e) => {
                          setPrivateCodeInput(e.target.value.toUpperCase());
                          setPrivateCodeError("");
                        }}
                        style={{
                          width: "100%",
                          background: "#090616",
                          border: "1.5px solid rgba(168, 85, 247, 0.4)",
                          borderRadius: 10,
                          padding: "12px 16px",
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#f6bd49",
                          textAlign: "center",
                          letterSpacing: 2,
                          textTransform: "uppercase",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      {privateCodeError && (
                        <div
                          style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            color: "#fca5a5",
                            fontSize: 12,
                            padding: "8px 12px",
                            borderRadius: 8,
                            fontWeight: 600,
                          }}
                        >
                          ⚠️ {privateCodeError}
                        </div>
                      )}
                      <button
                        type="submit"
                        style={{
                          background: "linear-gradient(135deg, #7868ff 0%, #a855f7 100%)",
                          border: "none",
                          color: "#ffffff",
                          padding: "12px 24px",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 800,
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(120, 104, 255, 0.4)",
                        }}
                      >
                        Unlock & Enter Table
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <Bet888LiveTable
                  table={tbl}
                  onLeaveTable={handleLeaveTable}
                  walletBalance={wallet}
                  userName={currentUser?.displayName || currentUser?.username || apiClient.auth.getStoredUsername() || "Ari.R"}
                  embedded={true}
                  isUserBlocked={isCurrentUserBlocked}
                  onWalletChange={(newBal) => setWallet(newBal)}
                  allowBots={true}
                />
              )}
            </div>
          );
        })}
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
                        {tbl.isPrivate ? (
                          <span
                            className="tag"
                            style={{
                              background: "rgba(168,85,247,0.2)",
                              color: "#c084fc",
                              border: "1px solid #a855f7",
                            }}
                          >
                            🔒 PRIVATE
                          </span>
                        ) : (
                          <span className={`tag tag-${tbl.theme}`}>{tbl.feeLabel}</span>
                        )}
                        {tbl.status === "paused" && (
                          <span
                            className="tag"
                            style={{
                              background: "rgba(245,158,11,0.2)",
                              color: "#fbbf24",
                              border: "1px solid #f59e0b",
                              fontWeight: 800,
                            }}
                          >
                            ⏸ PAUSED
                          </span>
                        )}
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

      {/* ================= PRIVATE TABLE PASSCODE MODAL (FROM ADD TABLE) ================= */}
      {privateTableToUnlock && (
        <div
          className="bp-modal-backdrop"
          onClick={() => {
            setPrivateTableToUnlock(null);
            setPrivateCodeInput("");
            setPrivateCodeError("");
          }}
        >
          <div
            className="bp-modal-box"
            style={{ maxWidth: 440, padding: 26, textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
            <h3 style={{ color: "#fff", margin: "0 0 6px", fontSize: 18, fontWeight: 800 }}>
              Private Table Access
            </h3>
            <p style={{ color: "#c4b5fd", fontSize: 12, margin: "0 0 14px", fontWeight: 600 }}>
              {privateTableToUnlock.name} • €{privateTableToUnlock.sb}/€{privateTableToUnlock.bb} NLH
            </p>
            <p style={{ color: "#a5a2bb", fontSize: 13, margin: "0 0 16px", lineHeight: 1.4 }}>
              This table is private. Please enter the invite code provided by the table host to join.
            </p>
            <form onSubmit={handleUnlockPrivateTable} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                placeholder="Enter Invite Code (e.g. 7KJ8P9)"
                maxLength={12}
                autoFocus
                value={privateCodeInput}
                onChange={(e) => {
                  setPrivateCodeInput(e.target.value.toUpperCase());
                  setPrivateCodeError("");
                }}
                style={{
                  width: "100%",
                  background: "#090616",
                  border: "1.5px solid rgba(168, 85, 247, 0.4)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#f6bd49",
                  textAlign: "center",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {privateCodeError && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#fca5a5",
                    fontSize: 12,
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  ⚠️ {privateCodeError}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    setPrivateTableToUnlock(null);
                    setPrivateCodeInput("");
                    setPrivateCodeError("");
                  }}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#d1cddb",
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "linear-gradient(135deg, #7868ff 0%, #a855f7 100%)",
                    border: "none",
                    color: "#ffffff",
                    padding: "8px 20px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Unlock & Join
                </button>
              </div>
            </form>
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
