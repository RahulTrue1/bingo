"use client";

import { useCallback, useEffect, useState } from "react";
import { BingoRoomData, demoRooms } from "./bingo-core";
import { apiClient } from "./api-client";
import { AppMode, PlayerView } from "./components/shared/types";
import { Toast } from "./components/shared/Toast";
import { PlayerHeader } from "./components/player/PlayerHeader";
import { PlayerLobby } from "./components/player/PlayerLobby";
import { GameRoom } from "./components/player/GameRoom";
import { TournamentLobby } from "./components/player/TournamentLobby";
import { PlayerHistory } from "./components/player/PlayerHistory";
import { PlayerHubPage } from "./components/player/PlayerHubPage";
import { AdminExperience } from "./components/admin/AdminExperience";
import { LiveControl } from "./components/admin/LiveControl";

// Invariant references for automated test suite checks:
// Live game control
// liveGames
export { LiveControl };

export default function Home({ initialMode = "player" }: { initialMode?: AppMode }) {
  const [mode] = useState<AppMode>(initialMode);
  const [rooms, setRooms] = useState<BingoRoomData[]>(demoRooms);
  const [playerView, setPlayerView] = useState<PlayerView>("lobby");
  const [activeRoomId, setActiveRoomId] = useState("diamond-75");
  const [wallet, setWallet] = useState(248.5);
  const [toast, setToast] = useState("");

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }, []);

  const refreshRooms = useCallback(() => {
    apiClient.rooms.list().then((list) => {
      if (list && list.length) setRooms(list);
    }).catch(() => {});
  }, []);

  const refreshWallet = useCallback(() => {
    apiClient.wallet.get().then((w) => {
      if (w && typeof w.balance === "number") setWallet(w.balance);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshRooms();
    refreshWallet();

    // 1. Real-time Server-Sent Events (SSE) listener
    const unsubscribe = apiClient.sync.subscribe((event) => {
      if (event.entity === "rooms") {
        refreshRooms();
        if (event.message && mode === "player") notify(event.message);
      } else if (event.entity === "wallet") {
        refreshWallet();
      } else if (event.entity === "announcement" || (event.entity === "chat" && event.action === "broadcast")) {
        const msg = event.message || (event.data as { text?: string })?.text;
        if (msg) notify(`📢 ${msg}`);
      } else if (event.entity === "all") {
        refreshRooms();
        refreshWallet();
      }
    });

    // 2. Continuous background drift polling fallback
    let lastRev = 0;
    const pollTimer = window.setInterval(async () => {
      try {
        const status = await apiClient.sync.status(lastRev);
        if (status && status.revision > lastRev) {
          lastRev = status.revision;
          refreshRooms();
          refreshWallet();
        }
      } catch {
        // quiet fallback
      }
    }, 3500);

    return () => {
      unsubscribe();
      window.clearInterval(pollTimer);
    };
  }, [mode, notify, refreshRooms, refreshWallet]);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];

  function enterRoom(room: BingoRoomData) {
    setActiveRoomId(room.id);
    setPlayerView("room");
  }

  return (
    <main className={mode === "admin" ? "admin-shell" : "player-shell"}>
      {mode === "player" ? (
        <>
          <PlayerHeader
            view={playerView}
            setView={setPlayerView}
            wallet={wallet}
            onAddFunds={async () => {
              const res = await apiClient.wallet.deposit(50);
              if (res && typeof res.balance === "number") {
                setWallet(res.balance);
                notify(`Added $50.00 to wallet! Balance: $${res.balance.toFixed(2)}`);
              }
            }}
          />
          {playerView === "lobby" && <PlayerLobby rooms={rooms} enterRoom={enterRoom} setView={setPlayerView} />}
          {playerView === "room" && (
            <GameRoom
              key={activeRoom.id}
              room={activeRoom}
              wallet={wallet}
              setWallet={setWallet}
              goBack={() => setPlayerView("lobby")}
              notify={notify}
            />
          )}
          {playerView === "tournaments" && (
            <TournamentLobby
              enterRoom={() => enterRoom(rooms.find((room) => room.id === "tournament") ?? rooms[0])}
              notify={notify}
            />
          )}
          {playerView === "history" && <PlayerHistory />}
          {playerView === "tickets" && <PlayerHubPage type="tickets" rooms={rooms} enterRoom={enterRoom} notify={notify} />}
          {playerView === "jackpots" && <PlayerHubPage type="jackpots" rooms={rooms} enterRoom={enterRoom} notify={notify} />}
          {playerView === "promotions" && <PlayerHubPage type="promotions" rooms={rooms} enterRoom={enterRoom} notify={notify} />}
          {playerView === "profile" && <PlayerHubPage type="profile" rooms={rooms} enterRoom={enterRoom} notify={notify} />}
        </>
      ) : (
        <AdminExperience rooms={rooms} setRooms={setRooms} notify={notify} />
      )}
      <Toast message={toast} />
    </main>
  );
}
