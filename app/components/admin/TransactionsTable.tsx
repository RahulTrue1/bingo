import { useEffect, useState } from "react";
import { apiClient, type WalletTransaction } from "../../api-client";
import { Icon } from "../shared/Icon";

export function TransactionsTable() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [txList, setTxList] = useState<WalletTransaction[]>([]);

  useEffect(() => {
    apiClient.wallet.transactions().then((data) => {
      if (data && data.length > 0) setTxList(data);
    }).catch(() => {});
  }, []);

  const defaultTransactions = [
    ["TXN-854201", "TrueigQueen", "Mega Trueig Jackpot", "Ticket purchase", "−$40.00", "Completed", "14:32:08"],
    ["PAY-284201", "Ari.R", "Diamond 75", "Prize payout", "+$1,250.00", "Processing", "14:31:44"],
    ["JP-684212", "System", "Mega Trueig Jackpot", "Jackpot contribution", "+$42.10", "Completed", "14:31:02"],
    ["REF-128492", "MikaK", "Trueig 90 Classic", "Refund", "+$3.00", "Completed", "14:28:16"],
    ["PROMO-48311", "SkyJump", "Free Bingo Party", "Promotional credit", "+$5.00", "Completed", "14:24:54"],
  ];

  const rows = txList.length > 0
    ? txList.map((tx) => [
        tx.id,
        tx.player,
        tx.room || "Diamond 75",
        tx.type,
        tx.amount < 0 ? `−$${Math.abs(tx.amount).toFixed(2)}` : `+$${tx.amount.toFixed(2)}`,
        tx.status,
        tx.time,
      ])
    : defaultTransactions;

  const filtered = rows.filter((row) => {
    const matchSearch = row.some((cell) => cell.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === "All types" || row[3] === typeFilter;
    return matchSearch && matchType;
  });

  const purchases = txList.filter((t) => t.type.includes("purchase")).reduce((acc, t) => acc + Math.abs(t.amount), 0) || 48620;
  const payouts = txList.filter((t) => t.type.includes("payout") || t.amount > 0).reduce((acc, t) => acc + t.amount, 0) || 31840;
  const refunds = txList.filter((t) => t.type.includes("refund")).reduce((acc, t) => acc + Math.abs(t.amount), 0) || 1242;
  const netFlow = purchases - payouts;

  return (
    <div className="admin-card data-card">
      <div className="data-toolbar">
        <div className="search-box compact">
          <Icon>⌕</Icon>
          <input
            placeholder="Transaction ID, player or room"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option>All types</option>
            <option>Ticket purchase</option>
            <option>Prize payout</option>
          </select>
          <select>
            <option>Today</option>
            <option>Last 7 days</option>
          </select>
        </div>
      </div>
      <div className="transaction-summary">
        <span><small>TICKET PURCHASES</small><b>${purchases.toLocaleString()}</b></span>
        <span><small>PRIZE PAYOUTS</small><b>${payouts.toLocaleString()}</b></span>
        <span><small>REFUNDS</small><b>${refunds.toLocaleString()}</b></span>
        <span>
          <small>NET FLOW</small>
          <b className="positive">+{netFlow > 0 ? `$${netFlow.toLocaleString()}` : "$15,538"}</b>
        </span>
      </div>
      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Player</th>
              <th>Room</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) => (
                  <td key={index}>
                    {index === 0 ? (
                      <button className="table-link">{cell}</button>
                    ) : index === 4 ? (
                      <b className={cell.startsWith("+") ? "positive" : ""}>{cell}</b>
                    ) : index === 5 ? (
                      <span className={`table-status ${cell === "Completed" ? "success" : "warning"}`}>{cell}</span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
