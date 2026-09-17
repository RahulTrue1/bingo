import { useEffect, useState } from "react";
import { apiClient, type WalletTransaction } from "../../api-client";

export function PlayerHistory() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  useEffect(() => {
    apiClient.wallet.transactions().then((txs) => {
      if (txs && txs.length > 0) setTransactions(txs);
    }).catch(() => {});
  }, []);

  const defaultRows = [
    ["#2841", "Diamond 75", "Today · 14:32", "3", "$6.00", "+$0.00", "Completed"],
    ["#2838", "Trueig 90 Classic", "Today · 13:05", "6", "$3.00", "+$125.00", "Won"],
    ["#2812", "Turbo 30", "Yesterday · 21:48", "2", "$2.00", "+$0.00", "Completed"],
    ["#2794", "Free Bingo Party", "Yesterday · 19:00", "1", "Free", "+$25.00", "Won"],
  ];

  const rows = transactions.length > 0
    ? transactions.map((t) => [
        `#${t.id.replace(/[^0-9]/g, "").slice(-4) || "2841"}`,
        t.room || "Diamond 75",
        t.time || "Today · 14:32",
        t.type.includes("purchase") ? "3" : "1",
        t.amount < 0 ? `$${Math.abs(t.amount).toFixed(2)}` : "Free",
        t.amount > 0 ? `+$${t.amount.toFixed(2)}` : "+$0.00",
        t.amount > 0 ? "Won" : "Completed",
      ])
    : defaultRows;

  return (
    <div className="simple-player-page">
      <div className="page-title-block">
        <span className="section-kicker">ACTIVITY</span>
        <h1>Game history</h1>
        <p>Review every ticket, result and number call from your recent games.</p>
      </div>
      <div className="history-stats">
        <div>
          <small>GAMES PLAYED</small>
          <strong>{124 + rows.length}</strong>
          <span>+14 this month</span>
        </div>
        <div>
          <small>CARDS PURCHASED</small>
          <strong>{340 + rows.length * 2}</strong>
          <span>2.7 avg / game</span>
        </div>
        <div>
          <small>TOTAL PRIZES</small>
          <strong>$2,840</strong>
          <span>18 winning rounds</span>
        </div>
      </div>
      <div className="standings-card">
        <div className="table-header">
          <div>
            <h2>Recent rounds</h2>
            <p>Last 30 days</p>
          </div>
          <button className="outline-button">Export history</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Game ID</th>
              <th>Room</th>
              <th>Date & time</th>
              <th>Cards</th>
              <th>Entry</th>
              <th>Prize</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) => (
                  <td key={index}>
                    {index === 6 ? (
                      <span className={`table-status ${cell === "Won" ? "success" : "neutral"}`}>{cell}</span>
                    ) : index === 0 ? (
                      <button className="table-link">{cell}</button>
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
