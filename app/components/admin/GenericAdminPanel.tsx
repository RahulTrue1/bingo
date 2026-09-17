import type { AdminAction } from "../shared/types";

export const adminNav = [
  ["dashboard", "Dashboard", "⌂"],
  ["rooms", "Bingo rooms", "▦"],
  ["rtp", "RTP & Margins", "%"],
  ["gamebuilder", "Games", "◫"],
  ["scheduler", "Scheduler", "□"],
  ["games", "Live control", "●"],
  ["variants", "Bingo variants", "⬡"],
  ["patterns", "Winning patterns", "◇"],
  ["jackpots", "Jackpots", "✦"],
  ["tournaments", "Tournaments", "♜"],
  ["players", "Players", "♙"],
  ["transactions", "Transactions", "⇄"],
  ["promotions", "Promotions", "★"],
  ["chat", "Chat moderation", "◌"],
];

export function GenericAdminPanel({
  module,
  notify,
  openAction,
}: {
  module: string;
  notify: (message: string) => void;
  openAction: (action: AdminAction) => void;
}) {
  const title = adminNav.find(([key]) => key === module)?.[1] ?? "Module";
  const itemsByModule: Record<string, string[]> = {
    cards: ["Card generation rules", "Minimum and maximum cards", "Card purchase deadline", "Favorite card settings"],
    caller: ["Initial countdown · 10s", "Time between balls · 1.6s", "Voice caller · Trueigtech Nova", "Validation delay · 2s"],
    prizes: ["Fixed prizes", "Percentage prizes", "Shared winner rules", "Guaranteed pools"],
    promotions: ["First game free", "Happy Hour Bingo", "VIP access pass", "Tournament ticket reward"],
    chat: ["Message queue", "Muted players", "Slow mode", "Blocked phrases"],
    history: ["Completed rounds", "Cancelled games", "Refunded rounds", "Archived calls"],
    risk: ["Velocity alerts", "Collusion signals", "Suspicious claims", "Exposure thresholds"],
    responsible: ["Deposit limits", "Session reminders", "Self-exclusion", "Reality checks"],
    roles: ["Super Admin", "Bingo Manager", "Game Operator", "Read Only"],
    audit: ["Room configuration changes", "Game interventions", "Payout approvals", "Permission changes"],
    settings: ["Platform identity", "Currency & locale", "Integration endpoints", "Notification rules"],
  };
  const items = itemsByModule[module] ?? ["Configuration", "Automation rules", "Visibility", "Permissions"];

  return (
    <div className="generic-grid">
      <section className="admin-card generic-list">
        <div className="card-title">
          <div>
            <h2>{title} configuration</h2>
            <p>Platform-wide settings and controls</p>
          </div>
          <button onClick={() => openAction({ kind: module, label: `New ${title} rule` })}>+ Add rule</button>
        </div>
        {items.map((item, index) => (
          <div className="setting-row" key={item}>
            <span className={`setting-icon metric-${index}`}>{index + 1}</span>
            <div>
              <b>{item}</b>
              <small>Configured · Last updated by John Dawson</small>
            </div>
            <button
              className="toggle on"
              onClick={(event) => {
                event.currentTarget.classList.toggle("on");
                notify(`${item} ${event.currentTarget.classList.contains("on") ? "enabled" : "disabled"}.`);
              }}
            >
              <i />
            </button>
            <button onClick={() => openAction({ kind: module, label: item })}>Configure →</button>
          </div>
        ))}
      </section>
      <aside className="admin-card module-health">
        <span>✓</span>
        <h2>All systems operational</h2>
        <p>{title} policies are synced across 18 active rooms.</p>
        <div>
          <small>LAST CONFIGURATION SYNC</small>
          <b>Today · 14:28:42</b>
        </div>
        <button className="full-outline" onClick={() => notify("Configuration health check completed successfully.")}>
          Run health check
        </button>
      </aside>
    </div>
  );
}
