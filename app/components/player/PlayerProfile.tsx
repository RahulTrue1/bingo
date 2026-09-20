import { useCallback, useEffect, useState } from "react";
import { apiClient, type PlayerModel } from "../../api-client";

export function PlayerProfile({ currentUser }: { currentUser?: PlayerModel | null }) {
  const [profile, setProfile] = useState<PlayerModel | null>(currentUser || null);
  const [balance, setBalance] = useState(currentUser?.balance ?? 248.5);
  const [winsCount, setWinsCount] = useState(currentUser?.wins ?? 18);
  const [cardsCount, setCardsCount] = useState(currentUser?.cardsPurchased ?? 346);
  const [notifications, setNotifications] = useState<Array<[string, string]>>([
    ["1 MIN", "Your Trueig 90 Classic game starts in 1 minute."],
    ["WIN", "You won $250 in Diamond 75!"],
    ["JP", "Mega Trueig Jackpot increased to $126,240."],
    ["FREE", "Free Bingo starts in 5 minutes."],
    ["CUP", "Tournament Round 2 is now open."],
  ]);

  const activeUser = currentUser || profile;

  const refreshProfile = useCallback(() => {
    const targetUsername = activeUser?.username || "Ari.R";
    apiClient.auth.me(targetUsername).then((res) => {
      if (res?.user) {
        setProfile(res.user);
        if (typeof res.user.balance === "number") {
          setBalance(res.user.balance);
        }
        if (typeof res.user.wins === "number") {
          setWinsCount(res.user.wins);
        }
        if (typeof res.user.cardsPurchased === "number") {
          setCardsCount(res.user.cardsPurchased);
        }
      }
    }).catch(() => {});

    apiClient.wallet.get(targetUsername).then((w) => {
      if (w && typeof w.balance === "number") {
        setBalance(w.balance);
      }
    }).catch(() => {});

    apiClient.wallet.transactions().then((txs) => {
      if (txs && txs.length > 0) {
        const userTxs = txs.filter((t) => !t.player || t.player.toLowerCase() === targetUsername.toLowerCase());
        const sourceTxs = userTxs.length > 0 ? userTxs : txs;
        const wins = sourceTxs.filter((t) => t.type === "Prize payout" || t.amount > 0).length;
        const purchases = sourceTxs.filter((t) => t.type === "Ticket purchase").length;
        if (!activeUser?.wins) setWinsCount(18 + wins);
        if (!activeUser?.cardsPurchased) setCardsCount(346 + purchases * 3);

        const newNotifs: Array<[string, string]> = sourceTxs.slice(0, 5).map((t) => {
          if (t.type === "Prize payout") return ["WIN", `You won $${t.amount.toFixed(2)} in ${t.room}!`];
          if (t.type === "Refund") return ["REF", `Refund of $${Math.abs(t.amount).toFixed(2)} for ${t.room} credited.`];
          return ["TXN", `${t.type}: $${Math.abs(t.amount).toFixed(2)} · ${t.room}`];
        });
        if (newNotifs.length > 0) setNotifications(newNotifs);
      }
    }).catch(() => {});
  }, [activeUser?.cardsPurchased, activeUser?.username, activeUser?.wins]);

  useEffect(() => {
    refreshProfile();
    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "wallet" || event.entity === "tickets" || event.entity === "players" || event.entity === "all") {
        const myUser = (activeUser?.username || "").toLowerCase();
        const targetPlayer = ((event.data as any)?.player || (event.data as any)?.username || "").toLowerCase();
        if (!targetPlayer || !myUser || targetPlayer === myUser) {
          refreshProfile();
        }
      }
    });
    return unsub;
  }, [refreshProfile, activeUser?.username]);

  const initials = (activeUser?.username || "AR").slice(0, 2).toUpperCase();
  const displayName = activeUser?.displayName || activeUser?.username || "Player";
  const playerId = activeUser?.id || "USR-11804";
  const userTier = activeUser?.tier || "Standard";
  const userStatus = activeUser?.status || "Active";

  return (
    <div className="simple-player-page">
      <div className="page-title-block">
        <span className="section-kicker">TRUEIGTECH PLAYER</span>
        <h1>Player profile</h1>
        <p>Account, Bingo activity, balances and notification preferences.</p>
      </div>
      <div className="profile-grid">
        <section className="standings-card profile-summary">
          <span className="profile-avatar">{initials}</span>
          <h2>{displayName}</h2>
          <p>Player ID · {playerId} · {userTier} tier</p>
          <span className={`table-status ${userStatus === "Active" ? "success" : "warning"}`}>
            {userStatus} account
          </span>
          <div>
            <span><small>CURRENT BALANCE</small><b>${balance.toFixed(2)}</b></span>
            <span><small>BINGO WINS</small><b>{winsCount}</b></span>
            <span><small>WIN RATE</small><b>{((winsCount / Math.max(1, cardsCount)) * 100).toFixed(1)}%</b></span>
            <span><small>CARDS PLAYED</small><b>{cardsCount}</b></span>
          </div>
        </section>
        <section className="standings-card profile-activity">
          <div className="table-header">
            <div>
              <h2>Notification center</h2>
              <p>Live alerts from your favorite rooms</p>
            </div>
            <button className="outline-button" onClick={() => setNotifications([])}>Mark all read</button>
          </div>
          {notifications.map((item, index) => (
            <div className="profile-notification" key={`${item[1]}-${index}`}>
              <i>{item[0]}</i>
              <span>
                <b>{item[1]}</b>
                <small>Trueigtech Bingo · live</small>
              </span>
              <button>Open →</button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
