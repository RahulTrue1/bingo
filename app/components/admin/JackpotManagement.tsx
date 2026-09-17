import { useEffect, useState } from "react";
import { apiClient } from "../../api-client";
import { money, type AdminAction } from "../shared/types";

export function JackpotManagement({
  notify,
  openAction,
}: {
  notify: (message: string) => void;
  openAction: (action: AdminAction) => void;
}) {
  const [jackpot, setJackpot] = useState(125480.6);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    apiClient.jackpots.list().then((list) => {
      if (list && list.length > 0) {
        const found = list.find((j) => j.id === "mega-trueig");
        if (found) setJackpot(found.currentAmount);
      }
    }).catch(() => {});
  }, []);

  return (
    <>
      <div className="jackpot-admin-hero">
        <div>
          <span className="section-kicker">PRIMARY PROGRESSIVE</span>
          <h2>Mega Trueig Jackpot</h2>
          <p>JP-MEGA-001 · 75-Ball Progressive</p>
        </div>
        <div>
          <small>CURRENT JACKPOT</small>
          <strong>{money(jackpot)}</strong>
          <span>+$842.30 today</span>
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
            onClick={() => {
              apiClient.jackpots.contribute("mega-trueig", 1000);
              setJackpot(jackpot + 1000);
              notify("Manual $1,000 contribution recorded.");
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
