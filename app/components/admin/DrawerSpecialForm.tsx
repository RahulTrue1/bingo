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

  // Caller state
  const [countdown, setCountdown] = useState(5);
  const [delay, setDelay] = useState(1.2);
  const [voice, setVoice] = useState<"Trueigtech Nova" | "Trueigtech Max" | "Off">("Trueigtech Nova");
  const [autoDaub, setAutoDaub] = useState(true);

  // Jackpot state
  const [jpAmount, setJpAmount] = useState(125480);
  const [jpReset, setJpReset] = useState(50000);
  const [jpContribution, setJpContribution] = useState(2.5);

  // Promotion state
  const [promoTitle, setPromoTitle] = useState("Happy Hour Bingo");
  const [promoCategory, setPromoCategory] = useState<"All offers" | "Free cards" | "Ticket deals" | "VIP" | "Tournaments" | "Deposit bonus" | "Cashback">("Ticket deals");
  const [promoRewardVal, setPromoRewardVal] = useState(15);
  const [promoRoom, setPromoRoom] = useState("diamond-75");

  // Announcement state
  const [announcementMsg, setAnnouncementMsg] = useState("Free Bingo starts in 5 minutes. Claim your Trueigtech card now!");
  const [audience, setAudience] = useState("all");

  // Manual Call state
  const [manualBall, setManualBall] = useState(17);
  const [manualRoom, setManualRoom] = useState(rooms[0]?.id || "diamond-75");

  // Declare Winner state
  const [winPlayer, setWinPlayer] = useState("LuckyStar");
  const [winPrize, setWinPrize] = useState(400);
  const [winPattern, setWinPattern] = useState("One Line");
  const [winRoom, setWinRoom] = useState(rooms[0]?.id || "diamond-75");

  // Banner state
  const [bannerTitle, setBannerTitle] = useState("Weekend Super Cup");
  const [bannerKicker, setBannerKicker] = useState("SPECIAL EVENT");
  const [bannerBody, setBannerBody] = useState("Join thousands of players and win huge jackpot prizes.");
  const [bannerCta, setBannerCta] = useState("Play now");
  const [bannerValue, setBannerValue] = useState("$25,000");
  const [bannerRoom, setBannerRoom] = useState(rooms[0]?.id || "diamond-75");
  const [bannerTheme, setBannerTheme] = useState("tournament");
  const [bannerImage, setBannerImage] = useState("/banners/weekend-cup-jackpot.png");

  if (kind === "caller-config")
    return (
      <div className="drawer-section">
        <h3>Caller behavior</h3>
        <div className="drawer-form-grid">
          <label>Initial countdown (s)<input type="number" value={countdown} onChange={(e) => setCountdown(Number(e.target.value))} /></label>
          <label>Time between balls (s)<input type="number" step="0.1" value={delay} onChange={(e) => setDelay(Number(e.target.value))} /></label>
          <label>
            Voice caller
            <select value={voice} onChange={(e) => setVoice(e.target.value as "Trueigtech Nova" | "Trueigtech Max" | "Off")}>
              <option>Trueigtech Nova</option>
              <option>Trueigtech Max</option>
              <option>Off</option>
            </select>
          </label>
          <label className="check-field">
            <input type="checkbox" checked={autoDaub} onChange={(e) => setAutoDaub(e.target.checked)} />
            Auto-daub default
          </label>
        </div>
        <div className="special-actions" style={{ marginTop: "20px" }}>
          <button
            type="button"
            className="admin-primary"
            onClick={async () => {
              await apiClient.settings.update({
                initialCountdown: countdown,
                timeBetweenBalls: delay,
                voiceCaller: voice,
                autoDaubDefault: autoDaub,
              });
              notify("✓ Caller settings saved and synchronized across all rooms.");
              close();
            }}
          >
            Save caller settings
          </button>
        </div>
      </div>
    );

  if (kind.includes("jackpot"))
    return (
      <div className="drawer-section">
        <h3>Jackpot configuration</h3>
        <div className="drawer-form-grid">
          <label>Jackpot name<input defaultValue="Mega Trueig Jackpot" /></label>
          <label>Current amount ($)<input type="number" value={jpAmount} onChange={(e) => setJpAmount(Number(e.target.value))} /></label>
          <label>Reset amount ($)<input type="number" value={jpReset} onChange={(e) => setJpReset(Number(e.target.value))} /></label>
          <label>Contribution %<input type="number" step="0.1" value={jpContribution} onChange={(e) => setJpContribution(Number(e.target.value))} /></label>
        </div>
        <div className="special-actions" style={{ marginTop: "20px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="admin-primary"
            onClick={async () => {
              await apiClient.jackpots.update("mega-trueig", {
                currentAmount: jpAmount,
                resetAmount: jpReset,
                contributionPercent: jpContribution,
              });
              notify("✓ Jackpot configuration updated and broadcast to player ladder.");
              close();
            }}
          >
            Save jackpot
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={async () => {
              await apiClient.jackpots.reset("mega-trueig", jpReset);
              notify(`✓ Jackpot reset to $${jpReset.toLocaleString()}!`);
              close();
            }}
          >
            Reset jackpot
          </button>
        </div>
      </div>
    );

  if (kind === "promotion")
    return (
      <div className="drawer-section">
        <h3>Promotion builder</h3>
        <div className="drawer-form-grid">
          <label>Promotion name<input value={promoTitle} onChange={(e) => setPromoTitle(e.target.value)} /></label>
          <label>
            Category
            <select value={promoCategory} onChange={(e) => setPromoCategory(e.target.value as typeof promoCategory)}>
              <option value="Ticket deals">Ticket deals</option>
              <option value="Free cards">Free cards</option>
              <option value="Deposit bonus">Deposit bonus</option>
              <option value="Cashback">Cashback</option>
              <option value="VIP">VIP</option>
              <option value="Tournaments">Tournaments</option>
            </select>
          </label>
          <label>Reward value ($)<input type="number" value={promoRewardVal} onChange={(e) => setPromoRewardVal(Number(e.target.value))} /></label>
          <label>
            Target Room
            <select value={promoRoom} onChange={(e) => setPromoRoom(e.target.value)}>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
        </div>
        <div className="special-actions" style={{ marginTop: "20px" }}>
          <button
            type="button"
            className="admin-primary"
            onClick={async () => {
              await apiClient.promotions.create({
                title: promoTitle,
                category: promoCategory,
                rewardValue: promoRewardVal,
                roomId: promoRoom,
                reward: `$${promoRewardVal} bonus`,
                badge: "NEW",
                status: "Active",
                featured: true,
              });
              notify(`✓ Promotion "${promoTitle}" created and visible to players!`);
              close();
            }}
          >
            Create promotion
          </button>
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
            <select value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="all">All players</option>
              <option value="diamond-75">Diamond 75 room</option>
              <option value="trueig-90">Trueig 90 Classic room</option>
              <option value="turbo-30">Turbo 30 room</option>
            </select>
          </label>
          <label className="full">
            Message
            <textarea value={announcementMsg} onChange={(e) => setAnnouncementMsg(e.target.value)} />
          </label>
        </div>
        <div className="special-actions" style={{ marginTop: "20px" }}>
          <button
            type="button"
            className="admin-primary"
            onClick={async () => {
              if (audience === "all") {
                await apiClient.chat.broadcast(announcementMsg);
              } else {
                await apiClient.chat.send(audience, announcementMsg, "System", "admin");
              }
              notify("✓ Announcement broadcast to all player screens!");
              close();
            }}
          >
            Broadcast announcement now
          </button>
        </div>
      </div>
    );

  if (kind === "manual-call")
    return (
      <div className="drawer-section">
        <h3>Manual ball call</h3>
        <div className="drawer-form-grid">
          <label>
            Room
            <select value={manualRoom} onChange={(e) => setManualRoom(e.target.value)}>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label>Ball number (1-75)<input type="number" min="1" max="75" value={manualBall} onChange={(e) => setManualBall(Number(e.target.value))} /></label>
        </div>
        <p className="form-hint">The ball will be drawn immediately and pushed to all player cards.</p>
        <div className="special-actions" style={{ marginTop: "20px" }}>
          <button
            type="button"
            className="admin-primary"
            onClick={async () => {
              await apiClient.game.manualCall(manualRoom, manualBall);
              notify(`✓ Ball ${manualBall} manually called in ${manualRoom}.`);
              close();
            }}
          >
            Call ball number
          </button>
        </div>
      </div>
    );

  if (kind === "declare-winner")
    return (
      <div className="drawer-section">
        <h3>Manual winner declaration</h3>
        <div className="drawer-form-grid">
          <label>
            Room
            <select value={winRoom} onChange={(e) => setWinRoom(e.target.value)}>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label>Player username<input value={winPlayer} onChange={(e) => setWinPlayer(e.target.value)} /></label>
          <label>
            Winning stage
            <select value={winPattern} onChange={(e) => setWinPattern(e.target.value)}>
              <option>One Line</option>
              <option>Diamond</option>
              <option>Full House</option>
            </select>
          </label>
          <label>Prize ($)<input type="number" value={winPrize} onChange={(e) => setWinPrize(Number(e.target.value))} /></label>
        </div>
        <div className="special-actions" style={{ marginTop: "20px" }}>
          <button
            type="button"
            className="admin-primary"
            onClick={async () => {
              await apiClient.game.declareWinner(winRoom, {
                player: winPlayer,
                prize: winPrize,
                pattern: winPattern,
              });
              notify(`✓ Winner ${winPlayer} declared with $${winPrize} prize!`);
              close();
            }}
          >
            Declare winner & award prize
          </button>
        </div>
      </div>
    );

  if (kind === "create-banner" || kind === "edit-banner" || kind === "banners")
    return (
      <div className="drawer-section">
        <h3>Hero Lobby Banner</h3>
        <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "14px" }}>
          Configure top promotional carousel banner shown to all players in the main lobby.
        </p>
        <div className="drawer-form-grid">
          <label>
            Banner Title
            <input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} required />
          </label>
          <label>
            Kicker / Tagline
            <input value={bannerKicker} onChange={(e) => setBannerKicker(e.target.value)} />
          </label>
          <label>
            Featured Prize / Value
            <input value={bannerValue} onChange={(e) => setBannerValue(e.target.value)} />
          </label>
          <label>
            Call To Action (CTA)
            <input value={bannerCta} onChange={(e) => setBannerCta(e.target.value)} />
          </label>
          <label>
            Target Room
            <select value={bannerRoom} onChange={(e) => setBannerRoom(e.target.value)}>
              <option value="tournament">Tournament (Trueigtech Cup)</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Theme Style
            <select value={bannerTheme} onChange={(e) => setBannerTheme(e.target.value)}>
              <option value="tournament">Tournament (Gold & Trophy)</option>
              <option value="host">Host (Vibrant Teal)</option>
              <option value="speed">Speed (Turbo Violet)</option>
              <option value="jackpot">Jackpot (Diamond High Roller)</option>
            </select>
          </label>
          <label className="full">
            Image Preset or URL
            <select
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              style={{ marginBottom: "8px" }}
            >
              <option value="/banners/weekend-cup-jackpot.png">Weekend Cup Jackpot (/banners/weekend-cup-jackpot.png)</option>
              <option value="/banners/fun-is-calling.png">Fun is Calling (/banners/fun-is-calling.png)</option>
            </select>
            <input
              value={bannerImage}
              placeholder="Or enter custom image path e.g. /banners/my-banner.png"
              onChange={(e) => setBannerImage(e.target.value)}
            />
          </label>
          <label className="full">
            Description
            <textarea value={bannerBody} onChange={(e) => setBannerBody(e.target.value)} />
          </label>
        </div>
        <div className="special-actions" style={{ marginTop: "20px" }}>
          <button
            type="button"
            className="admin-primary"
            onClick={async () => {
              await apiClient.banners.create({
                title: bannerTitle,
                kicker: bannerKicker,
                body: bannerBody,
                cta: bannerCta,
                value: bannerValue,
                roomId: bannerRoom,
                theme: bannerTheme,
                image: bannerImage,
                imageAlt: bannerTitle,
                active: true,
              });
              notify(`✓ Banner "${bannerTitle}" saved and published to player lobby!`);
              close();
            }}
          >
            Save & publish banner
          </button>
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
