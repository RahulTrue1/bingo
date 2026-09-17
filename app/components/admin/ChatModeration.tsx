import { useEffect, useState } from "react";
import { apiClient } from "../../api-client";
import type { AdminAction } from "../shared/types";

export function ChatModeration({
  notify,
  openAction,
}: {
  notify: (message: string) => void;
  openAction: (action: AdminAction) => void;
}) {
  const initial = [
    ["14:32", "Diamond 75", "LuckyStar", "BINGO!! That was close 🎉"],
    ["14:31", "Turbo 30", "SpeedySam", "ready for another one"],
    ["14:31", "Trueig 90 Classic", "RiskyB", "check out my promo link"],
    ["14:30", "Mega Trueig Jackpot", "MikaK", "good luck all"],
    ["14:29", "Quick 80", "TrueigQueen", "one line away!"],
  ];
  const [messages, setMessages] = useState(initial);
  const [muted, setMuted] = useState<string[]>(["RiskyB"]);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [adminMessage, setAdminMessage] = useState("");

  useEffect(() => {
    apiClient.chat.get("diamond-75").then((res) => {
      if (res && res.messages && res.messages.length > 0) {
        setMessages(res.messages.map((m) => [m.time || "14:32", "Diamond 75", m.sender, m.text]));
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="chat-admin-layout">
      <section className="admin-card chat-moderation-card">
        <div className="card-title">
          <div>
            <h2>Live room chat</h2>
            <p>{messages.length} messages visible · 12 flagged today</p>
          </div>
          <div className="inline-toggle">
            <span>Room chat</span>
            <button
              type="button"
              className={`toggle ${chatEnabled ? "on" : ""}`}
              aria-label="Toggle room chat"
              aria-pressed={chatEnabled}
              onClick={() => {
                setChatEnabled(!chatEnabled);
                notify(`Room chat ${chatEnabled ? "disabled" : "enabled"}.`);
              }}
            >
              <i />
            </button>
          </div>
        </div>
        {messages.map((message, index) => (
          <div className="moderation-message" key={`${message[0]}-${index}`}>
            <time>{message[0]}</time>
            <span className="table-status neutral">{message[1]}</span>
            <b>
              {message[2]}
              {muted.includes(message[2]) && <small>Muted</small>}
            </b>
            <p>{message[3]}</p>
            <div>
              <button
                onClick={() => {
                  setMessages((items) => items.filter((_, itemIndex) => itemIndex !== index));
                  notify("Message deleted and audit log updated.");
                }}
              >
                Delete
              </button>
              <button
                onClick={() => {
                  const isMuted = muted.includes(message[2]);
                  setMuted((items) => (isMuted ? items.filter((item) => item !== message[2]) : [...items, message[2]]));
                  if (!isMuted) apiClient.chat.mute(message[2]);
                  notify(`${message[2]} ${isMuted ? "unmuted" : "muted for 30 minutes"}.`);
                }}
              >
                {muted.includes(message[2]) ? "Unmute" : "Mute 30m"}
              </button>
              <button onClick={() => openAction({ kind: "player", label: message[2] })}>View player</button>
            </div>
          </div>
        ))}
      </section>
      <aside className="admin-card admin-broadcast">
        <h2>Operator broadcast</h2>
        <p>Send a message to the active room or every player.</p>
        <textarea
          value={adminMessage}
          onChange={(event) => setAdminMessage(event.target.value)}
          placeholder="Type an admin message…"
        />
        <select>
          <option>Diamond 75</option>
          <option>All active rooms</option>
        </select>
        <button
          className="admin-primary"
          onClick={async () => {
            if (!adminMessage.trim()) return;
            const text = adminMessage;
            setMessages((items) => [["now", "Diamond 75", "Trueigtech Admin", text], ...items]);
            setAdminMessage("");
            await apiClient.chat.send("diamond-75", "Trueigtech Admin", text);
            notify("Admin message sent.");
          }}
        >
          Send admin message
        </button>
        <button className="outline-button" onClick={() => openAction({ kind: "announcement" })}>
          Create system announcement
        </button>
        <div className="moderation-summary">
          <span><small>MUTED USERS</small><b>{muted.length}</b></span>
          <span><small>BLOCKED TODAY</small><b>3</b></span>
          <span><small>DELETED</small><b>{initial.length - messages.length}</b></span>
        </div>
      </aside>
    </div>
  );
}
