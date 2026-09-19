import { useCallback, useEffect, useState } from "react";
import { apiClient, type JackpotModel } from "../../api-client";
import { money, type AdminAction } from "../shared/types";

export function JackpotManagement({
  notify,
  openAction,
}: {
  notify: (message: string) => void;
  openAction: (action: AdminAction) => void;
}) {
  const [jackpots, setJackpots] = useState<JackpotModel[]>([]);
  const [selectedId, setSelectedId] = useState<string>("mega-trueig");
  const [enabled, setEnabled] = useState(true);

  const refreshJackpots = useCallback(() => {
    apiClient.jackpots.list().then((list) => {
      if (list && list.length > 0) {
        setJackpots(list);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshJackpots();
    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "jackpots") {
        refreshJackpots();
      }
    });
    return unsub;
  }, [refreshJackpots]);

  const active = jackpots.find((j) => j.id === selectedId) || jackpots[0] || {
    id: "mega-trueig",
    name: "Mega Trueig Jackpot",
    variant: "75-Ball Progressive",
    currentAmount: 125480.6,
    startingAmount: 50000,
    contributionPercent: 2.5,
    maximumAmount: 250000,
    resetAmount: 50000,
    qualifyingPattern: "Full House in 42 balls",
    qualifyingBallLimit: 42,
  };

  const liabilityPct = Math.min(100, Math.round(((active.currentAmount) / (active.maximumAmount || 250000)) * 1000) / 10);

  return (
    <>
      <div className="jackpot-admin-hero">
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
            <span className="section-kicker">PROGRESSIVE JACKPOT</span>
            {jackpots.length > 1 && (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", padding: "4px 8px" }}
              >
                {jackpots.map((j) => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            )}
          </div>
          <h2>{active.name}</h2>
          <p>{active.id.toUpperCase()} · {active.variant || "75-Ball Progressive"}</p>
        </div>
        <div>
          <small>CURRENT JACKPOT</small>
          <strong>{money(active.currentAmount)}</strong>
          <span>+${((active.contributionPercent || 2.5) * 34).toFixed(2)} today</span>
        </div>
        <div className="jackpot-hero-actions">
          <button
            className={`toggle ${enabled ? "on" : ""}`}
            onClick={() => setEnabled(!enabled)}
          >
            <i />
          </button>
          <span>{enabled ? "Enabled" : "Disabled"}</span>
          <button
            onClick={async () => {
              await apiClient.jackpots.contribute(active.id, 1000);
              refreshJackpots();
              notify(`✓ Manual $1,000 contribution added to ${active.name}!`);
            }}
          >
            + Add contribution
          </button>
        </div>
      </div>
      <div className="jackpot-admin-grid">
        <section className="admin-card jackpot-config">
          <div className="card-title">
            <div>
              <h2>Configuration</h2>
              <p>Contribution and qualification rules</p>
            </div>
            <button onClick={() => openAction({ kind: "edit-jackpot" })}>✎ Edit</button>
          </div>
          <div className="config-grid">
            <span><small>STARTING VALUE</small><b>$50,000</b></span>
            <span><small>CONTRIBUTION</small><b>2.5% of ticket sales</b></span>
            <span><small>MAXIMUM</small><b>$250,000</b></span>
            <span><small>RESET VALUE</small><b>$50,000</b></span>
            <span><small>QUALIFYING PATTERN</small><b>Full House</b></span>
            <span><small>BALL REQUIREMENT</small><b>Within 42 calls</b></span>
            <span><small>FALLBACK PRIZE</small><b>$10,000</b></span>
            <span><small>LINKED ROOMS</small><b>4 rooms</b></span>
          </div>
          <div className="liability-meter">
            <div>
              <span>Liability vs maximum</span>
              <b>50.2%</b>
            </div>
            <i><span style={{ width: "50.2%" }} /></i>
          </div>
        </section>
        <section className="admin-card jackpot-history">
          <div className="card-title">
            <div>
              <h2>Contribution history</h2>
              <p>Recent jackpot movement</p>
            </div>
            <button>View all</button>
          </div>
          {[
            ["Ticket contribution", "+$42.10", "14:31"],
            ["Ticket contribution", "+$38.65", "14:26"],
            ["Game contribution", "+$100.00", "14:15"],
            ["Manual adjustment", "+$500.00", "12:00"],
          ].map((row) => (
            <div key={row[2]}>
              <span>↗</span>
              <b>
                {row[0]}
                <small>{row[2]} · John Dawson</small>
              </b>
              <strong>{row[1]}</strong>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
