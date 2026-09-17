import { useState } from "react";

export function Scheduler({ notify }: { notify: (message: string) => void }) {
  const [view, setView] = useState("Week");
  const events = [
    { time: "08:00", name: "Trueig 90 Classic", variant: "90-Ball Classic", accent: "teal", type: "Recurring", prize: "$275" },
    { time: "09:00", name: "Turbo 30", variant: "30-Ball Speed", accent: "coral", type: "Hourly", prize: "$220" },
    { time: "10:00", name: "Diamond 75", variant: "75-Ball Pattern", accent: "violet", type: "Daily", prize: "$2,000" },
    { time: "12:00", name: "Free Bingo Party", variant: "Community Free Card", accent: "blue", type: "Daily", prize: "$100" },
    { time: "18:00", name: "Mega Trueig Jackpot", variant: "Progressive Coverall", accent: "gold", type: "Daily", prize: "$125,480" },
    { time: "20:00", name: "Trueigtech Weekend Cup", variant: "Multi-Stage Tournament", accent: "pink", type: "Weekly", prize: "$25,000" },
  ];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="admin-card scheduler-card">
      <div className="card-title">
        <div>
          <h2>Game schedule</h2>
          <p>Automated, recurring and tournament game timetable</p>
        </div>
        <div className="filter-tabs">
          {["Day", "Week", "Month"].map((item) => (
            <button
              className={view === item ? "active" : ""}
              onClick={() => {
                setView(item);
                notify(`Scheduler switched to ${item} view.`);
              }}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {view === "Week" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "8px",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {days.map((day, idx) => (
            <div
              key={day}
              style={{
                textAlign: "center",
                padding: "8px 4px",
                borderRadius: "8px",
                background: idx === 3 ? "rgba(79, 70, 229, 0.15)" : "rgba(255,255,255,0.02)",
                border: idx === 3 ? "1px solid #4f46e5" : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <small style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700 }}>{day}</small>
              <b style={{ display: "block", fontSize: "14px", marginTop: "2px", color: idx === 3 ? "#818cf8" : "inherit" }}>
                {18 + idx}
              </b>
            </div>
          ))}
        </div>
      )}

      <div className="schedule-timeline" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {events.map((event) => (
          <div
            className="schedule-row"
            key={event.time}
            style={{
              display: "grid",
              gridTemplateColumns: "55px 4px 1fr auto",
              alignItems: "center",
              gap: "16px",
              padding: "14px 18px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
              margin: 0,
            }}
          >
            <time style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)" }}>{event.time}</time>
            <i
              className={`accent-${event.accent}`}
              style={{ width: "4px", height: "36px", borderRadius: "4px", display: "block" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <b style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{event.name}</b>
              <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                {event.variant} · Prize: <b>{event.prize}</b> · Cadence: <b>{event.type}</b>
              </small>
            </div>
            <div className="table-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="speed-label">{event.type}</span>
              <button onClick={() => notify(`${event.name} schedule edited.`)}>Edit</button>
              <button onClick={() => notify(`${event.name} timetable session duplicated.`)}>Duplicate</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
