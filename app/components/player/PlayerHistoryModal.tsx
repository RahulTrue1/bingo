"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient, type WalletTransaction, type PlayerModel } from "../../api-client";
import { X, MagnifyingGlass, Wallet, Trophy, ClockCounterClockwise, ArrowDownLeft, ArrowUpRight } from "@phosphor-icons/react";

interface PlayerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: PlayerModel | null;
  walletBalance: number;
}

export function PlayerHistoryModal({
  isOpen,
  onClose,
  currentUser,
  walletBalance,
}: PlayerHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<"all" | "poker" | "wins" | "cashier">("all");
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveBalance, setLiveBalance] = useState(walletBalance);

  const username = currentUser?.username || apiClient.auth.getStoredUsername() || "Ari.R";

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const [walletRes, txList] = await Promise.all([
        apiClient.wallet.get(username),
        apiClient.wallet.transactions({ player: username, limit: 100 }),
      ]);
      if (walletRes && typeof walletRes.balance === "number") {
        setLiveBalance(walletRes.balance);
      }
      setTransactions(txList || []);
    } catch {
      // Keep existing state
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (isOpen) {
      setLiveBalance(walletBalance);
      loadHistory();
    }
  }, [isOpen, walletBalance, loadHistory]);

  // Real-time synchronization
  useEffect(() => {
    if (!isOpen) return;
    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "wallet" || event.entity === "players") {
        loadHistory();
      }
    });
    return unsub;
  }, [isOpen, loadHistory]);

  if (!isOpen) return null;

  // Filter transactions
  const filtered = transactions.filter((t) => {
    // Tab filter
    if (activeTab === "poker" && !t.type.toLowerCase().includes("poker")) return false;
    if (activeTab === "wins" && !(t.type.toLowerCase().includes("win") || t.type.toLowerCase().includes("payout") || t.amount > 0)) return false;
    if (activeTab === "cashier" && !(t.type.toLowerCase().includes("deposit") || t.type.toLowerCase().includes("withdraw") || t.type.toLowerCase().includes("refund"))) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId = t.id.toLowerCase().includes(q);
      const matchType = t.type.toLowerCase().includes(q);
      const matchRoom = (t.room || "").toLowerCase().includes(q);
      return matchId || matchType || matchRoom;
    }
    return true;
  });

  const totalWon = transactions
    .filter((t) => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);

  const totalWagered = transactions
    .filter((t) => t.amount < 0)
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  return (
    <div className="player-history-modal-backdrop" onClick={onClose}>
      <div className="player-history-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ph-modal-header">
          <div className="ph-user-badge">
            <div className="ph-avatar">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="ph-user-info">
              <div className="ph-username-row">
                <h3>{username}</h3>
                <span className="ph-tier-badge">{currentUser?.tier || "Standard"} VIP</span>
              </div>
              <span className="ph-player-id">ID: {currentUser?.id || "USR-11804"} · Active Player</span>
            </div>
          </div>
          <button className="ph-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Live Wallet & Performance KPI Strip */}
        <div className="ph-kpi-strip">
          <div className="ph-kpi-card highlight">
            <div className="kpi-icon-box gold">
              <Wallet size={20} weight="fill" />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">WALLET BALANCE</span>
              <strong className="kpi-val gold">${liveBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <div className="ph-kpi-card">
            <div className="kpi-icon-box green">
              <Trophy size={20} weight="fill" />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">TOTAL WON</span>
              <strong className="kpi-val green">+${totalWon.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <div className="ph-kpi-card">
            <div className="kpi-icon-box purple">
              <ClockCounterClockwise size={20} weight="fill" />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">TOTAL WAGERED</span>
              <strong className="kpi-val">${totalWagered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          </div>
        </div>

        {/* Toolbar: Filter Pills & Search Box */}
        <div className="ph-toolbar">
          <div className="ph-filter-pills">
            <button
              className={`ph-pill ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All History ({transactions.length})
            </button>
            <button
              className={`ph-pill ${activeTab === "poker" ? "active" : ""}`}
              onClick={() => setActiveTab("poker")}
            >
              ♠ Poker Only
            </button>
            <button
              className={`ph-pill ${activeTab === "wins" ? "active" : ""}`}
              onClick={() => setActiveTab("wins")}
            >
              🏆 Wins & Payouts
            </button>
            <button
              className={`ph-pill ${activeTab === "cashier" ? "active" : ""}`}
              onClick={() => setActiveTab("cashier")}
            >
              💳 Cashier
            </button>
          </div>

          <div className="ph-search-box">
            <MagnifyingGlass size={16} weight="bold" className="search-icon" />
            <input
              type="text"
              placeholder="Search by ID, Table, Type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="ph-clear-search" onClick={() => setSearch("")}>
                ×
              </button>
            )}
          </div>
        </div>

        {/* Transactions Ledger Table */}
        <div className="ph-table-container">
          {loading && transactions.length === 0 ? (
            <div className="ph-empty-state">Loading transaction history...</div>
          ) : filtered.length === 0 ? (
            <div className="ph-empty-state">
              <ClockCounterClockwise size={36} weight="duotone" />
              <p>No transaction records found matching your filter.</p>
            </div>
          ) : (
            <table className="ph-table">
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>TRANSACTION ID</th>
                  <th>TYPE</th>
                  <th>ROOM / TABLE</th>
                  <th style={{ textAlign: "right" }}>AMOUNT</th>
                  <th style={{ textAlign: "center" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <tr key={tx.id}>
                      <td className="ph-time-cell">
                        {tx.time || (typeof tx.timestamp === "string" ? tx.timestamp : "Just now")}
                      </td>
                      <td className="ph-id-cell">
                        <code>{tx.id}</code>
                      </td>
                      <td>
                        <span className={`ph-type-tag ${tx.type.toLowerCase().includes("win") ? "tag-win" : tx.type.toLowerCase().includes("poker") ? "tag-poker" : "tag-default"}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="ph-room-cell">{tx.room || "Cash Table"}</td>
                      <td className="ph-amt-cell" style={{ textAlign: "right" }}>
                        <span className={`ph-amt ${isPositive ? "is-pos" : "is-neg"}`}>
                          {isPositive ? (
                            <><ArrowDownLeft size={13} weight="bold" /> +${Math.abs(tx.amount).toFixed(2)}</>
                          ) : (
                            <><ArrowUpRight size={13} weight="bold" /> -${Math.abs(tx.amount).toFixed(2)}</>
                          )}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`ph-status-tag ${tx.status === "Completed" ? "status-ok" : "status-pending"}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
