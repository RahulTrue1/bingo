export function ReportsPanel() {
  const bars = [68, 82, 58, 92, 74, 88, 96, 79, 90, 84, 100, 86];

  return (
    <>
      <div className="report-filters">
        <label>
          Date range
          <select><option>Aug 1–21, 2026</option></select>
        </label>
        <label>
          Room
          <select><option>All rooms</option></select>
        </label>
        <label>
          Bingo type
          <select><option>All variants</option></select>
        </label>
        <label>
          Currency
          <select><option>USD</option></select>
        </label>
        <button className="admin-primary">Apply filters</button>
      </div>
      <div className="report-grid">
        <section className="admin-card report-main">
          <div className="card-title">
            <div>
              <h2>Ticket sales performance</h2>
              <p>Daily ticket revenue · August 2026</p>
            </div>
            <button>Download CSV</button>
          </div>
          <div className="report-total">
            <strong>$842,620</strong>
            <span>+12.8% vs prior period</span>
          </div>
          <div className="bar-chart">
            {bars.map((height, index) => (
              <div key={index}>
                <i style={{ height: `${height}%` }}>
                  <span>${Math.round(height * 0.62)}k</span>
                </i>
                <small>{index + 10}</small>
              </div>
            ))}
          </div>
        </section>
        <aside className="admin-card report-breakdown">
          <div className="card-title">
            <div>
              <h2>Revenue by variant</h2>
              <p>Share of total</p>
            </div>
          </div>
          <div className="donut">
            <div>
              <strong>$842k</strong>
              <small>TOTAL</small>
            </div>
          </div>
          {[
            ["75-Ball", "42%", "#7768ff"],
            ["90-Ball", "28%", "#19bd9b"],
            ["Speed", "18%", "#fb745e"],
            ["Other", "12%", "#8fa0b8"],
          ].map((item) => (
            <p className="breakdown-row" key={item[0]}>
              <i style={{ background: item[2] }} />
              <span>{item[0]}</span>
              <b>{item[1]}</b>
            </p>
          ))}
        </aside>
      </div>
      <div className="report-cards">
        {[
          ["Prize payout", "$548,280", "65.1% payout ratio"],
          ["Average entry", "$4.82", "+$0.42 vs prior"],
          ["Claims validated", "4,284", "98.6% valid"],
          ["Games completed", "1,842", "99.8% completion"],
        ].map((item) => (
          <div className="admin-card" key={item[0]}>
            <small>{item[0]}</small>
            <strong>{item[1]}</strong>
            <span>{item[2]}</span>
          </div>
        ))}
      </div>
    </>
  );
}
