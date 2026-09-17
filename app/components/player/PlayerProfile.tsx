export function PlayerProfile() {
  return (
    <div className="simple-player-page">
      <div className="page-title-block">
        <span className="section-kicker">TRUEIGTECH PLAYER</span>
        <h1>Player profile</h1>
        <p>Account, Bingo activity, balances and notification preferences.</p>
      </div>
      <div className="profile-grid">
        <section className="standings-card profile-summary">
          <span className="profile-avatar">AR</span>
          <h2>Ari R.</h2>
          <p>Player ID · TRUEIG-11804</p>
          <span className="table-status success">Verified account</span>
          <div>
            <span><small>CURRENT BALANCE</small><b>$248.50</b></span>
            <span><small>BINGO WINS</small><b>18</b></span>
            <span><small>WIN RATE</small><b>14.1%</b></span>
            <span><small>CARDS PLAYED</small><b>346</b></span>
          </div>
        </section>
        <section className="standings-card profile-activity">
          <div className="table-header">
            <div>
              <h2>Notification center</h2>
              <p>Live alerts from your favorite rooms</p>
            </div>
            <button className="outline-button">Mark all read</button>
          </div>
          {[
            ["1 MIN", "Your Trueig 90 Classic game starts in 1 minute."],
            ["WIN", "You won $250 in Diamond 75!"],
            ["JP", "Mega Trueig Jackpot increased to $126,240."],
            ["FREE", "Free Bingo starts in 5 minutes."],
            ["CUP", "Tournament Round 2 is now open."],
          ].map((item) => (
            <div className="profile-notification" key={item[1]}>
              <i>{item[0]}</i>
              <span>
                <b>{item[1]}</b>
                <small>Trueigtech Bingo · just now</small>
              </span>
              <button>Open →</button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
