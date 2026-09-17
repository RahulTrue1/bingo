import { useState } from "react";
import { apiClient } from "../../api-client";
import { BingoRoomData, RTPEngine } from "../../bingo-core";

export function DrawerSpecialForm({
  kind,
  notify,
  rooms,
  setRooms,
  close,
}: {
  kind: string;
  notify: (message: string) => void;
  rooms: BingoRoomData[];
  setRooms: (rooms: BingoRoomData[]) => void;
  close: () => void;
}) {
  const [policyRtp, setPolicyRtp] = useState(80);
  const [syncMode, setSyncMode] = useState("all");

  if (kind === "caller-config")
    return (
      <div className="drawer-section">
        <h3>Caller behavior</h3>
        <div className="drawer-form-grid">
          <label>Initial countdown<input type="number" defaultValue="5" /></label>
          <label>Time between balls<input type="number" step="0.1" defaultValue="1.2" /></label>
          <label>
            Voice caller
            <select><option>Trueigtech Nova</option><option>Trueigtech Max</option><option>Off</option></select>
          </label>
          <label>
            Animation
            <select><option>Premium ball motion</option><option>Minimal</option><option>Off</option></select>
          </label>
          {["Auto call", "Manual call enabled", "Pause on Bingo claim", "Resume after winner"].map((item) => (
            <label className="check-field" key={item}>
              <input type="checkbox" defaultChecked />{item}
            </label>
          ))}
          <label>Game end delay<input type="number" defaultValue="4" /></label>
        </div>
        <button
          type="button"
          className="full-outline"
          onClick={() => notify("Caller preview: B-17. Voice and animation settings applied.")}
        >
          Preview B-17 call
        </button>
      </div>
    );

  if (kind.includes("jackpot"))
    return (
      <div className="drawer-section">
        <h3>Jackpot configuration</h3>
        <div className="drawer-form-grid">
          <label>Jackpot name<input defaultValue="Mega Trueig Jackpot" /></label>
          <label>
            Jackpot type
            <select><option>Progressive</option><option>Guaranteed</option><option>Community</option></select>
          </label>
          <label>Starting amount<input type="number" defaultValue="50000" /></label>
          <label>Current amount<input type="number" defaultValue="125480" /></label>
          <label>Contribution %<input type="number" step="0.1" defaultValue="2.5" /></label>
          <label>Maximum amount<input type="number" defaultValue="250000" /></label>
          <label>
            Qualifying Bingo type
            <select><option>75-Ball Progressive</option><option>90-Ball</option></select>
          </label>
          <label>
            Qualifying pattern
            <select><option>Full House</option><option>Blackout</option></select>
          </label>
          <label>Maximum ball count<input type="number" defaultValue="42" /></label>
          <label>Reset amount<input type="number" defaultValue="50000" /></label>
          <label>Start date<input type="date" defaultValue="2026-08-21" /></label>
          <label>End date<input type="date" defaultValue="2026-12-31" /></label>
          <label>
            Status
            <select><option>Active</option><option>Paused</option></select>
          </label>
        </div>
        <div className="special-actions">
          <button type="button" onClick={() => notify("Jackpot paused.")}>Pause</button>
          <button type="button" onClick={() => notify("Jackpot resumed.")}>Resume</button>
          <button
            type="button"
            className="danger-button"
            onClick={() => {
              apiClient.jackpots.reset("mega-trueig", 50000);
              notify("Jackpot reset to $50,000 after confirmation.");
            }}
          >
            Reset jackpot
          </button>
        </div>
      </div>
    );

  if (kind.includes("tournament"))
    return (
      <div className="drawer-section">
        <h3>Tournament configuration</h3>
        <div className="drawer-form-grid">
          <label>Tournament name<input defaultValue="Trueigtech Weekend Cup" /></label>
          <label className="full">Description<textarea defaultValue="Five-round progressive elimination tournament." /></label>
          <label>
            Bingo rooms
            <select multiple><option>Diamond 75</option><option>Trueig 90 Classic</option><option>Turbo 30</option></select>
          </label>
          <label>Start date<input type="date" defaultValue="2026-08-22" /></label>
          <label>End date<input type="date" defaultValue="2026-08-24" /></label>
          <label>Entry fee<input type="number" defaultValue="8" /></label>
          <label>Maximum players<input type="number" defaultValue="512" /></label>
          <label>Number of rounds<input type="number" defaultValue="5" /></label>
          <label>Prize pool<input type="number" defaultValue="25000" /></label>
          <label>Points rules<textarea defaultValue="Line 10 · Pattern 25 · Full House 50" /></label>
          <label>Qualification rules<textarea defaultValue="Top 50% advance each round"/></label>
          <label>Leaderboard rules<textarea defaultValue="Points, wins, fastest Bingo"/></label>
        </div>
      </div>
    );

  if (kind === "promotion")
    return (
      <div className="drawer-section">
        <h3>Promotion builder</h3>
        <div className="drawer-form-grid">
          <label>Promotion name<input defaultValue="Trueigtech Happy Hour" /></label>
          <label>
            Promotion type
            <select>
              <option>Free Bingo</option>
              <option>Free Cards</option>
              <option>Buy 3 Get 1</option>
              <option>Happy Hour</option>
              <option>Cashback</option>
              <option>Tournament Entry</option>
              <option>VIP Access</option>
              <option>Deposit Bonus</option>
              <option>Daily Reward</option>
            </select>
          </label>
          <label>Start date<input type="date" defaultValue="2026-08-22" /></label>
          <label>End date<input type="date" defaultValue="2026-09-22" /></label>
          <label>
            Eligible rooms
            <select><option>All rooms</option><option>Diamond 75</option><option>Turbo 30</option></select>
          </label>
          <label>
            Status
            <select><option>Active</option><option>Draft</option><option>Paused</option></select>
          </label>
        </div>
      </div>
    );

  if (kind === "announcement")
    return (
      <div className="drawer-section">
        <h3>In-app announcement</h3>
        <div className="drawer-form-grid">
          <label>
            Audience
            <select><option>All players</option><option>Active rooms</option><option>VIP players</option><option>Tournament entrants</option></select>
          </label>
          <label>
            Priority
            <select><option>Normal</option><option>Important</option><option>Urgent</option></select>
          </label>
          <label className="full">
            Message
            <textarea defaultValue="Free Bingo starts in 5 minutes. Claim your Trueigtech card now!" />
          </label>
          <label>Action label<input defaultValue="Claim free card" /></label>
          <label>
            Linked screen
            <select><option>Free Bingo Party</option><option>Promotions</option><option>Lobby</option></select>
          </label>
          <label>Schedule<input type="datetime-local" defaultValue="2026-08-21T18:00" /></label>
        </div>
        <button
          type="button"
          className="full-outline"
          onClick={() => notify("Test announcement sent to your admin account.")}
        >
          Send test notification
        </button>
      </div>
    );

  if (kind === "manual-call")
    return (
      <div className="drawer-section">
        <h3>Manual ball call</h3>
        <label>Ball number<input type="number" min="1" max="75" defaultValue="17" /></label>
        <p className="form-hint">The number is checked against call history before broadcast.</p>
      </div>
    );

  if (kind === "declare-winner")
    return (
      <div className="drawer-section">
        <h3>Manual winner declaration</h3>
        <div className="drawer-form-grid">
          <label>Player<input defaultValue="LuckyStar" /></label>
          <label>Card ID<input defaultValue="284237" /></label>
          <label>
            Winning stage
            <select><option>One Line</option><option>Diamond</option><option>Full House</option></select>
          </label>
          <label>Prize<input type="number" defaultValue="400" /></label>
          <label>Winner count<input type="number" defaultValue="1" /></label>
          <label>
            Split rule
            <select><option>Split equally</option><option>Fixed per winner</option></select>
          </label>
        </div>
      </div>
    );

  if (kind === "apply-global-rtp") {
    const margin = RTPEngine.calculateHouseMargin(policyRtp);
    return (
      <div className="drawer-section">
        <h3>Network-Wide RTP Policy</h3>
        <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "14px" }}>
          Establish the default return-to-player percentage and operator profit margin across all connected games.
        </p>
        <div className="drawer-form-grid">
          <label>
            Global Target RTP (%)
            <input
              type="number"
              min="65"
              max="95"
              value={policyRtp}
              onChange={(e) => setPolicyRtp(Number(e.target.value))}
            />
          </label>
          <label>
            Expected House Profit
            <input readOnly value={`${margin}% GGR hold`} />
          </label>
          <label>
            Sync Mode
            <select value={syncMode} onChange={(e) => setSyncMode(e.target.value)}>
              <option value="all">Update all {rooms.length} rooms immediately</option>
              <option value="non-custom">Update rooms without custom overrides</option>
            </select>
          </label>
          <label className="full">
            Policy Description
            <textarea defaultValue="Standard network payout policy ensuring positive operator house margin across all active games." />
          </label>
        </div>

        <div className="drawer-footer" style={{ marginTop: "24px" }}>
          <button type="button" className="outline-button" onClick={close}>Cancel</button>
          <button
            type="button"
            className="admin-primary"
            onClick={async () => {
              const updated = rooms.map((r) => {
                if (syncMode === "non-custom" && r.customRtp) return r;
                const dynamicPrize =
                  r.rtpMode === "dynamic"
                    ? RTPEngine.calculateDynamicPrize(r.cardsSold, r.ticketPrice, policyRtp, r.jackpot ? 2.5 : 0)
                    : r.prize;
                return {
                  ...r,
                  rtp: policyRtp,
                  customRtp: false,
                  prize: dynamicPrize > 0 ? Math.round(dynamicPrize) : r.prize,
                };
              });
              setRooms(updated);
              await apiClient.rooms.applyRtpPolicy(policyRtp, syncMode === "all");
              notify(`✓ Network RTP policy set to ${policyRtp}%. Updated ${updated.length} rooms.`);
              close();
            }}
          >
            Apply Policy to Network
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="drawer-section">
      <h3>Module configuration</h3>
      <p>Configure parameters, notifications and automation rules for this operational domain.</p>
      <div className="drawer-form-grid">
        <label>Configuration preset<input defaultValue="Default Platform Configuration" /></label>
        <label>Sync mode<select><option>Instant broadcast</option><option>Next round</option></select></label>
      </div>
    </div>
  );
}
