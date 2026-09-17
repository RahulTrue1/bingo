import { useState } from "react";

export function Scheduler({ notify }: { notify: (message: string) => void }) {
  const [view, setView] = useState("Week");
  const events = [
    ["08:00", "Trueig 90 Classic", "90-Ball", "teal", "Recurring"],
    ["09:00", "Turbo 30", "Speed", "coral", "Hourly"],
    ["10:00", "Diamond 75", "Pattern", "violet", "Daily"],
    ["12:00", "Free Bingo Party", "Community", "blue", "Daily"],
    ["18:00", "Mega Trueig Jackpot", "Progressive", "gold", "Daily"],
    ["20:00", "Trueigtech Weekend Cup", "Tournament", "pink", "Weekly"],
  ];

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
      <div className="schedule-timeline">
        {events.map((event) => (
          <div className="schedule-row" key={event[0]}>
            <time>{event[0]}</time>
            <div className={`schedule-pill accent-${event[3]}`}>
              <b>{event[1]}</b>
              <small>{event[2]} · {event[4]}</small>
            </div>
            <button onClick={() => notify(`${event[1]} edited in timetable.`)}>Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}
