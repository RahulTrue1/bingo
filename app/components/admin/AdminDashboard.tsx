import { useEffect, useState } from "react";
import { apiClient, type DashboardResponse } from "../../api-client";
import { Icon } from "../shared/Icon";
import type { AdminAction } from "../shared/types";
import { DashboardInfo } from "./DashboardInfo";

export function AdminDashboard({ openAction }: { openAction: (action: AdminAction) => void }) {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    apiClient.admin.dashboard().then((res) => {
      if (res?.success) setDashboardData(res);
    }).catch(() => {});
  }, []);

  const metrics = dashboardData?.metrics
    ? dashboardData.metrics.map((m) => [m.label, m.value, m.change, m.icon, m.description])
    : [
        ["ACTIVE ROOMS", "18", "+2", "▦", "Rooms currently open, selling tickets or calling a live game."],
        ["ONLINE PLAYERS", "2,847", "+12.4%", "♙", "Unique players connected to the platform within the last five minutes."],
        ["TICKET REVENUE", "$48,620", "+8.2%", "$", "Gross ticket sales collected today before prizes, credits and jackpot contributions."],
        ["PRIZE PAYOUT", "$31,840", "65.5%", "◇", "Prizes paid or committed today. The percentage compares payouts with ticket revenue."],
        ["JACKPOT LIABILITY", "$142,280", "+$842", "✦", "Total prize value reserved across every active progressive jackpot."],
        ["GGR TODAY", "$16,780", "+11.6%", "↗", "Gross gaming revenue after prizes, bonuses and jackpot contributions are deducted."],
      ];

  const liveOps = dashboardData?.liveOps
    ? dashboardData.liveOps.map((g) => [g.name, g.ball, g.players, g.progress, g.prize])
    : [
        ["Diamond 75", "B-12", "286", "28/75", "$2,000"],
        ["Turbo 30", "24", "84", "11/30", "$300"],
        ["Quick 80", "52", "136", "42/80", "$750"],
      ];

  const topRooms = dashboardData?.topRooms
    ? dashboardData.topRooms.map((r) => [r.name, r.games, r.tickets, r.revenue, r.ggr, r.trend])
    : [
        ["Mega Trueig Jackpot", "22", "8,420", "$42,100", "$12,840", "+18%"],
        ["Diamond 75", "34", "6,812", "$13,624", "$4,218", "+9%"],
        ["Trueig 90 Classic", "48", "18,240", "$9,120", "$2,680", "+12%"],
        ["Turbo 30", "96", "8,450", "$8,450", "$2,210", "−3%"],
      ];

  const activityFeed = dashboardData?.activityFeed
    ? dashboardData.activityFeed.map((f) => [f.type, f.title, f.detail, f.time])
    : [
        ["claim", "Bingo claim validated", "Diamond 75 · Card #284201", "14:32"],
        ["jackpot", "Jackpot contribution", "+$42.10 · Mega Trueig Jackpot", "14:31"],
        ["player", "High-value player joined", "TrueigQueen · VIP Gold Room", "14:29"],
        ["alert", "Claim rejected", "Turbo 30 · Invalid pattern", "14:26"],
      ];

  return (
    <>
      <div className="metric-grid">
        {metrics.map((metric, index: number) => (
          <article className="metric-card" key={metric[0]}>
            <button
              className="metric-card-main"
              onClick={() => openAction({ kind: "report-drilldown", label: metric[0] })}
              aria-label={`View ${metric[0].toLowerCase()} breakdown`}
            >
              <span className={`metric-icon metric-${index}`}>
                <Icon>{metric[3]}</Icon>
              </span>
              <div>
                <small>{metric[0]}</small>
                <strong>{metric[1]}</strong>
                <span className={index === 3 ? "neutral-change" : ""}>
                  {metric[2]} <i>{index === 3 ? "payout ratio" : "view breakdown →"}</i>
                </span>
              </div>
            </button>
            <DashboardInfo label={metric[0]} description={metric[4]} />
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="admin-card revenue-chart">
          <div className="card-title">
            <div>
              <div className="dashboard-section-heading">
                <h2>Revenue & payouts</h2>
                <DashboardInfo
                  label="Revenue and payouts"
                  description="Compares gross ticket sales with prizes awarded so you can spot margin movement and unusual payout pressure."
                />
              </div>
              <p>Last 7 days · Daily ticket sales compared with awarded prizes · USD</p>
            </div>
            <select aria-label="Revenue chart date range">
              <option>7 days</option>
              <option>30 days</option>
            </select>
          </div>
          <div className="chart-legend">
            <span><i className="legend-violet" />Revenue <b>$286.4k</b></span>
            <span><i className="legend-mint" />Payouts <b>$184.2k</b></span>
          </div>
          <div className="line-chart">
            <div className="chart-y">
              <span>$60k</span>
              <span>$45k</span>
              <span>$30k</span>
              <span>$15k</span>
              <span>$0</span>
            </div>
            <div className="chart-canvas">
              <div className="grid-lines"><i /><i /><i /><i /><i /></div>
              <div className="dual-bars" aria-label="Revenue and payout trend">
                {[[44, 30], [58, 38], [52, 35], [76, 48], [66, 43], [88, 58], [96, 61]].map((pair, index) => (
                  <div key={index}>
                    <i className="revenue-bar" style={{ height: `${pair[0]}%` }} />
                    <i className="payout-bar" style={{ height: `${pair[1]}%` }} />
                  </div>
                ))}
              </div>
              <div className="chart-x">
                <span>Fri 15</span>
                <span>Sat 16</span>
                <span>Sun 17</span>
                <span>Mon 18</span>
                <span>Tue 19</span>
                <span>Wed 20</span>
                <span>Today</span>
              </div>
            </div>
          </div>
        </section>
        <section className="admin-card live-ops">
          <div className="card-title">
            <div>
              <div className="dashboard-section-heading">
                <h2>Live operations</h2>
                <DashboardInfo
                  label="Live operations"
                  description="Shows every game currently calling, its ball progress, active player count and prize exposure."
                />
              </div>
              <p>3 games currently calling · Monitor progress, players and prize exposure</p>
            </div>
            <button onClick={() => openAction({ kind: "live-control" })}>Open control center →</button>
          </div>
          {liveOps.map((game, index: number) => (
            <div className="live-game-row" key={game[0]}>
              <span className={`live-game-orb orb-${index}`}>{game[1]}</span>
              <div>
                <b>{game[0]}</b>
                <small><i /> LIVE · {game[3]} called</small>
              </div>
              <span><small>PLAYERS</small><b>{game[2]}</b></span>
              <span><small>PRIZE</small><b>{game[4]}</b></span>
              <button onClick={() => openAction({ kind: "live-control", label: game[0] })}>Manage</button>
            </div>
          ))}
        </section>
        <section className="admin-card room-performance">
          <div className="card-title">
            <div>
              <div className="dashboard-section-heading">
                <h2>Top rooms</h2>
                <DashboardInfo
                  label="Top rooms"
                  description="Ranks player rooms by today's ticket revenue and pairs volume with gross gaming revenue and trend."
                />
              </div>
              <p>Today’s highest-performing rooms · Revenue, ticket volume and GGR trend</p>
            </div>
            <button onClick={() => openAction({ kind: "report-drilldown", label: "Room performance" })}>View report →</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Room</th>
                <th>Games</th>
                <th>Tickets</th>
                <th>Revenue</th>
                <th>GGR</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {topRooms.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index: number) => (
                    <td key={index}>
                      {index === 0 ? <b>{cell}</b> : index === 5 ? <span className={String(cell).startsWith("−") ? "negative" : "positive"}>{cell}</span> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="admin-card activity-feed">
          <div className="card-title">
            <div>
              <div className="dashboard-section-heading">
                <h2>Operational feed</h2>
                <DashboardInfo
                  label="Operational feed"
                  description="A live audit stream of validated claims, jackpot movements, player activity and exceptions needing attention."
                />
              </div>
              <p>Newest platform events · Claims, jackpot activity and operational alerts</p>
            </div>
            <button aria-label="Open operational feed options">•••</button>
          </div>
          {activityFeed.map((event) => (
            <div className="feed-row" key={event[2]}>
              <span className={`feed-icon ${event[0]}`}>{event[0] === "claim" ? "✓" : event[0] === "jackpot" ? "✦" : event[0] === "player" ? "+" : "!"}</span>
              <div>
                <b>{event[1]}</b>
                <small>{event[2]}</small>
              </div>
              <time>{event[3]}</time>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
