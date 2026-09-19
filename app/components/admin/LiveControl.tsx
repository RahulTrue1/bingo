import { useEffect, useState } from "react";
import { apiClient } from "../../api-client";
import { BingoEngine } from "../../bingo-core";
import type { AdminAction } from "../shared/types";

interface LiveGameEntry {
  id: string;
  roomId?: string;
  name: string;
  controller: string;
  state: string;
  ball: number;
  players: number;
  cardsSold: number;
  revenue: string;
  prize: string;
  stage: string;
}

const defaultLiveGames: LiveGameEntry[] = [
  { id: "TRUEIG-2842", roomId: "diamond-75", name: "Diamond 75", controller: "Nora Tran", state: "live", ball: 28, players: 300, cardsSold: 934, revenue: "$1,868", prize: "$2,000", stage: "One Line" },
  { id: "TRUEIG-3011", roomId: "turbo-30", name: "Turbo 30", controller: "Evan Wu", state: "paused", ball: 11, players: 184, cardsSold: 412, revenue: "$680", prize: "$300", stage: "Final Line" },
  { id: "TRUEIG-3197", roomId: "quick-80", name: "Quick 80", controller: "Mika K", state: "live", ball: 52, players: 136, cardsSold: 310, revenue: "$750", prize: "$750", stage: "Four Corners" },
];

export function LiveControl({
  notify,
  openAction,
}: {
  notify: (message: string) => void;
  openAction: (action: AdminAction) => void;
}) {
  // Backoffice Live game control liveGames state
  const [liveGames, setLiveGames] = useState<LiveGameEntry[]>(defaultLiveGames);
  const [selectedGameId, setSelectedGameId] = useState(defaultLiveGames[0].id);

  const refreshLiveGames = () => {
    apiClient.admin.liveControl().then((res) => {
      if (res?.success && Array.isArray(res.liveGames) && res.liveGames.length > 0) {
        setLiveGames(res.liveGames as unknown as LiveGameEntry[]);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    refreshLiveGames();
    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "game" || event.entity === "rooms") {
        refreshLiveGames();
      }
    });
    return unsub;
  }, []);

  const selectedGame = liveGames.find((game) => game.id === selectedGameId) ?? liveGames[0] ?? defaultLiveGames[0];
  const [state, setState] = useState<"live" | "paused" | "stopped" | "cancelled">(selectedGame.state as "live" | "paused" | "stopped" | "cancelled");
  const [ball, setBall] = useState(selectedGame.ball);
  const [speed, setSpeed] = useState("Fast · 1.2 sec");
  const [claim, setClaim] = useState<"pending" | "approved" | "rejected">("pending");

  const targetRoomId = selectedGame.roomId || (
    selectedGame.name.toLowerCase().includes("turbo")
      ? "turbo-30"
      : selectedGame.name.toLowerCase().includes("quick")
      ? "quick-80"
      : "diamond-75"
  );

  const nextBall = () => {
    const next = BingoEngine.nextNumber(Array.from({ length: ball }, (_, index) => index + 1)) ?? ball;
    setBall(next);
    apiClient.game.manualCall(targetRoomId, next);
    notify(`${BingoEngine.label(next)} called manually.`);
  };

  const changeState = (next: typeof state, message: string) => {
    setState(next);
    if (next === "paused") apiClient.game.pause(targetRoomId);
    else if (next === "live") apiClient.game.resume(targetRoomId);
    else if (next === "cancelled") apiClient.game.cancel(targetRoomId);
    notify(message);
  };

  const selectGame = (gameId: string) => {
    const picked = liveGames.find((game) => game.id === gameId) ?? liveGames[0];
    setSelectedGameId(gameId);
    setBall(picked.ball);
    setState(picked.state as "live" | "paused" | "stopped" | "cancelled");
    notify(`${picked.name} selected in live control. Controller: ${picked.controller}.`);
  };

  return (
    <div className="control-grid">
      <section className="admin-card control-stage">
        <div className="live-control-overview">
          <div className="card-title">
            <div>
              <h2>Live game control</h2>
              <p>{liveGames.length} games currently live</p>
            </div>
          </div>
          <div className="live-game-list">
            {liveGames.map((game) => (
              <button
                type="button"
                key={game.id}
                className={`live-game-item ${selectedGameId === game.id ? "active" : ""}`}
                onClick={() => selectGame(game.id)}
              >
                <span className="live-game-item-name">{game.name}</span>
                <small>{game.controller}</small>
                <strong>{game.state.toUpperCase()}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className="control-stage-head">
          <div>
            <span className={`status ${state === "live" ? "status-live" : "status-starting-soon"}`}>
              <i />{state}
            </span>
            <h2>{selectedGame.name} · {selectedGame.id}</h2>
            <p>Controller: {selectedGame.controller} · Stage 2 of 3 · {selectedGame.stage} · Game continues after win</p>
          </div>
          <div>
            <select
              value={speed}
              onChange={(event) => {
                setSpeed(event.target.value);
                notify(`Calling speed changed to ${event.target.value}.`);
              }}
            >
              <option>Slow · 3.2 sec</option>
              <option>Normal · 2.1 sec</option>
              <option>Fast · 1.2 sec</option>
              <option>Turbo · 0.6 sec</option>
            </select>
            <button
              className="danger-button"
              onClick={() => changeState("stopped", "Game stopped. State preserved for operator review.")}
            >
              Stop game
            </button>
          </div>
        </div>
        <div className="operator-caller">
          <div className={state !== "live" ? "paused" : ""}>
            <small>CURRENT BALL</small>
            <strong>{BingoEngine.label(ball)}</strong>
            <span>{state === "live" ? `Next call in ${speed.split(" · ")[1]}` : state.toUpperCase()}</span>
          </div>
          <div className="operator-stats">
            <span><small>BALLS CALLED</small><b>{ball} / 75</b></span>
            <span><small>PLAYERS</small><b>{selectedGame.players}</b></span>
            <span><small>CARDS SOLD</small><b>{selectedGame.cardsSold}</b></span>
            <span><small>REVENUE</small><b>{selectedGame.revenue}</b></span>
            <span><small>PRIZE POOL</small><b>{selectedGame.prize}</b></span>
            <span><small>ACTIVE STAGE</small><b>{selectedGame.stage}</b></span>
          </div>
        </div>
        <div className="operator-controls">
          <button
            className={state === "paused" ? "resume" : ""}
            onClick={() =>
              state === "paused"
                ? changeState("live", "Automatic calling resumed.")
                : changeState("paused", "Number caller paused.")
            }
          >
            {state === "paused" ? "▶ Resume" : "Ⅱ Pause game"}
          </button>
          <button onClick={nextBall}>Call next ball →</button>
          <button onClick={() => openAction({ kind: "manual-call" })}>Manual call</button>
          <button
            onClick={() => {
              apiClient.game.restart(targetRoomId);
              setBall(1);
              setState("live");
              setClaim("pending");
              notify(`Round restarted from Ball 1 for ${selectedGame.name}.`);
            }}
          >
            Restart game
          </button>
          <button onClick={() => changeState("cancelled", "Round cancelled. Refund review opened.")}>
            Cancel round
          </button>
          <button onClick={() => openAction({ kind: "declare-winner" })}>Declare winner</button>
        </div>
        <div className="operator-board">
          {Array.from({ length: 75 }, (_, index) => index + 1).map((number) => (
            <span className={number <= ball ? "called" : ""} key={number}>{number}</span>
          ))}
        </div>
      </section>
      <aside className="admin-card claim-review">
        <div className="card-title">
          <div>
            <h2>Bingo claims</h2>
            <p>1 requires review</p>
          </div>
          <span className="nav-badge">1</span>
        </div>
        <div className={`claim-card claim-${claim}`}>
          <div>
            <span className="claim-player">AR</span>
            <div>
              <b>Ari.R</b>
              <small>Card #284201 · just now</small>
            </div>
            <span className={`table-status ${claim === "approved" ? "success" : claim === "rejected" ? "danger" : "warning"}`}>
              {claim === "approved" ? "Approved" : claim === "rejected" ? "Rejected" : "Pending"}
            </span>
          </div>
          <div className="claim-pattern">
            <div className="mini-pattern pattern-5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].map((index) => (
                <i
                  className={
                    index === 6 || index === 7 || index === 8 || index === 11 || index === 12 || index === 13 || index === 16 || index === 17 || index === 18
                      ? "active"
                      : ""
                  }
                  key={index}
                />
              ))}
            </div>
            <span><b>One Line</b><small>Across center row</small></span>
          </div>
          <div className="claim-actions">
            <button
              onClick={() => {
                setClaim("rejected");
                apiClient.game.reviewClaim("diamond-75", "CLM-284201", "reject");
                notify("Claim rejected after validation review.");
              }}
            >
              Reject Bingo
            </button>
            <button
              onClick={() => {
                setClaim("approved");
                apiClient.game.reviewClaim("diamond-75", "CLM-284201", "approve");
                notify("Winner validated and prize locked.");
              }}
            >
              Validate winner
            </button>
          </div>
        </div>
        <div className="player-list">
          <div className="card-title">
            <div>
              <h2>Recent payouts</h2>
              <p>Last reviewed</p>
            </div>
          </div>
          {[
            ["LuckyStar", "$400", "14:24"],
            ["MikaK", "$250", "14:17"],
            ["Ari.R", "$1,250", "14:09"],
          ].map((entry) => (
            <div key={entry[0]}>
              <span>{entry[0].slice(0, 2).toUpperCase()}</span>
              <div>
                <b>{entry[0]}</b>
                <small>{entry[2]}</small>
              </div>
              <strong>{entry[1]}</strong>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
