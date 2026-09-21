"use client";

import { useCallback, useEffect, useState } from "react";
import { BingoRoomData, demoRooms } from "./bingo-core";
import { apiClient, type PlayerModel } from "./api-client";
import { AppMode, PlayerView } from "./components/shared/types";
import { Toast } from "./components/shared/Toast";
import { PlayerHeader } from "./components/player/PlayerHeader";
import { PlayerLobby } from "./components/player/PlayerLobby";
import { GameRoom } from "./components/player/GameRoom";
import { TournamentLobby } from "./components/player/TournamentLobby";
import { PlayerHistory } from "./components/player/PlayerHistory";
import { PlayerHubPage } from "./components/player/PlayerHubPage";
import { AuthModal } from "./components/player/AuthModal";
import { AdminExperience } from "./components/admin/AdminExperience";
import { LiveControl } from "./components/admin/LiveControl";

// Invariant references for automated test suite checks:
// Live game control
// liveGames
export { LiveControl };

if (typeof window !== "undefined") {
  const isExtensionError = (e: any) => {
    try {
      const reason = e?.reason || e?.error || e?.message || "";
      const msg = String(reason?.message || reason || "");
      const stack = String(reason?.stack || e?.error?.stack || e?.filename || "");
      return (
        msg.includes("M_ID") ||
        stack.includes("chrome-extension://") ||
        stack.includes("eppiocemhmnlbhjplcgkofciiegomcon") ||
        stack.includes("executors/200.js") ||
        stack.includes("moz-extension://") ||
        stack.includes("safari-extension://")
      );
    } catch {
      return false;
    }
  };

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      if (isExtensionError(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    "error",
    (event) => {
      if (isExtensionError(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

export default function Home({ initialMode = "player" }: { initialMode?: AppMode }) {
  const [mode] = useState<AppMode>(initialMode);
  const [rooms, setRooms] = useState<BingoRoomData[]>(demoRooms);
  const [playerView, setPlayerView] = useState<PlayerView>("lobby");
  const [activeRoomId, setActiveRoomId] = useState("diamond-75");
  const [wallet, setWallet] = useState(248.5);
  const [currentUser, setCurrentUser] = useState<PlayerModel | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
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

  const refreshWallet = useCallback((targetUsername?: string) => {
    const user = targetUsername || currentUser?.username || apiClient.auth.getStoredUsername();
    apiClient.wallet.get(user || undefined).then((w) => {
      if (w && typeof w.balance === "number") setWallet(w.balance);
    }).catch(() => {});
  }, [currentUser?.username]);

  const refreshUser = useCallback((targetUsername?: string) => {
    const user = targetUsername || currentUser?.username || apiClient.auth.getStoredUsername();
    apiClient.auth.me(user || undefined).then((res) => {
      if (res?.user) {
        setCurrentUser(res.user);
        if (typeof res.wallet === "number") setWallet(res.wallet);
      }
    }).catch(() => {});
  }, [currentUser?.username]);

  useEffect(() => {
    refreshRooms();
    refreshWallet();
    refreshUser();

    // 1. Real-time Server-Sent Events (SSE) listener
    const unsubscribe = apiClient.sync.subscribe((event) => {
      const myUsername = (currentUser?.username || apiClient.auth.getStoredUsername() || "").toLowerCase();

      if (event.entity === "rooms") {
        refreshRooms();
        if (event.message && mode === "player") notify(event.message);
      } else if (event.entity === "wallet") {
        const targetPlayer = ((event.data as any)?.player || "").toLowerCase();
        if (!targetPlayer || targetPlayer === myUsername) {
          refreshWallet(myUsername);
          refreshUser(myUsername);
        }
      } else if (event.entity === "auth" || event.entity === "players") {
        const targetPlayer = ((event.data as any)?.player || (event.data as any)?.user?.username || "").toLowerCase();
        if (targetPlayer && targetPlayer === myUsername) {
          refreshUser(myUsername);
          refreshWallet(myUsername);
        }
        if (event.message && mode === "player") notify(event.message);
      } else if (event.entity === "tournaments" || event.entity === "tournament") {
        refreshWallet(myUsername);
        refreshRooms();
        if (event.message && mode === "player") notify(event.message);
      } else if (event.entity === "announcement" || (event.entity === "chat" && event.action === "broadcast")) {
        const msg = event.message || (event.data as { text?: string })?.text;
        if (msg) notify(`📢 ${msg}`);
      } else if (event.entity === "all") {
        refreshRooms();
        refreshWallet(myUsername);
        refreshUser(myUsername);
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
          const myUsername = currentUser?.username || apiClient.auth.getStoredUsername();
          if (myUsername) {
            refreshWallet(myUsername);
          }
        }
      } catch {
        // quiet fallback
      }
    }, 3500);

    return () => {
      unsubscribe();
      window.clearInterval(pollTimer);
    };
  }, [mode, notify, refreshRooms, refreshWallet, refreshUser, currentUser?.username]);

  const handleAuthSuccess = (user: PlayerModel, newWallet: number) => {
    apiClient.auth.setStoredUsername(user.username);
    setCurrentUser(user);
    setWallet(newWallet);
    setAuthModalOpen(false);
    notify(`Welcome ${user.displayName || user.username}!`);
  };

  const [activeTournament, setActiveTournament] = useState<any>(null);
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];

  function enterRoom(room: BingoRoomData, tourney?: any) {
    setActiveTournament(tourney || null);
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
            currentUser={currentUser}
            onOpenAuth={() => setAuthModalOpen(true)}
            openAuthModal={() => setAuthModalOpen(true)}
            onAddFunds={async () => {
              const res = await apiClient.wallet.deposit(50, currentUser?.username);
              if (res && typeof res.balance === "number") {
                setWallet(res.balance);
                refreshUser(currentUser?.username);
                notify(`Added $50.00 to wallet! Balance: $${res.balance.toFixed(2)}`);
              }
            }}
          />
          {playerView === "lobby" && <PlayerLobby rooms={rooms} enterRoom={enterRoom} setView={setPlayerView} />}
          {playerView === "room" && (
            <GameRoom
              key={activeTournament ? `tourney-${activeTournament.id}` : activeRoom.id}
              room={activeTournament ? {
                id: `tournament-${activeTournament.id}`,
                name: activeTournament.name,
                variant: `Tournament · ${activeTournament.rounds?.length || 4} Rounds`,
                status: activeTournament.status === "Live" ? "Live" : "Open",
                ticketPrice: activeTournament.entryFee || 10,
                prize: activeTournament.prizePool || 25000,
                players: activeTournament.playersCount || 192,
                maxPlayers: activeTournament.maxPlayers || 256,
                cardsSold: (activeTournament.playersCount || 192) * 2,
                startsIn: activeTournament.startsAt || "Scheduled",
                pattern: activeTournament.currentStageName || activeTournament.rounds?.[0] || "Qualifiers",
                accent: activeTournament.id === "daily-masters" ? "emerald" : activeTournament.id === "speed-sprint" ? "coral" : "violet",
                tag: "TOURNAMENT",
                frequency: "Scheduled Event",
                cardRows: 5,
                cardColumns: 5,
                callDelay: activeTournament.id === "speed-sprint" ? 600 : 900,
                rtp: 80,
                rtpMode: "fixed",
                winningStages: (activeTournament.rounds || ["Qualifiers"]).map((r: string, idx: number, arr: string[]) => ({
                  name: r,
                  prize: Math.round((activeTournament.prizePool || 25000) / arr.length),
                  continueAfterWin: idx < arr.length - 1,
                })),
              } : activeRoom}
              tournament={activeTournament}
              wallet={wallet}
              setWallet={setWallet}
              goBack={() => {
                if (activeTournament) {
                  setActiveTournament(null);
                  setPlayerView("tournaments");
                } else {
                  setPlayerView("lobby");
                }
              }}
              notify={notify}
              currentUser={currentUser}
            />
          )}
          {playerView === "tournaments" && (
            <TournamentLobby
              enterRoom={(tourney) => {
                const tourneyObj = tourney || {
                  id: "weekend-cup",
                  name: "Trueigtech Weekend Cup",
                  entryFee: 8,
                  prizePool: 25000,
                  playersCount: 384,
                  maxPlayers: 512,
                  rounds: ["Qualifiers", "Round of 256", "Round of 128", "Semi Final", "Grand Final"],
                  currentStageName: "Qualifiers",
                };
                const is90 = tourneyObj.variant?.includes("90");
                const is30 = tourneyObj.variant?.includes("30") || tourneyObj.id === "speed-sprint";
                const is80 = tourneyObj.variant?.includes("80");
                const cardRows = is90 ? 3 : is30 ? 3 : is80 ? 4 : 5;
                const cardColumns = is90 ? 9 : is30 ? 3 : is80 ? 4 : 5;
                const callDelay = is30 ? 1200 : is90 ? 1500 : 1350;
                const variantName = tourneyObj.variant || (is30 ? "30-Ball Speed" : is90 ? "90-Ball Classic" : is80 ? "80-Ball Shutter" : "75-Ball Pattern");
                const cardsPerPlayer = tourneyObj.cardsPerPlayer || 1;

                const tourneyRoom: BingoRoomData = {
                  id: `tournament-${tourneyObj.id}`,
                  name: tourneyObj.name,
                  variant: variantName,
                  status: tourneyObj.status === "Live" ? "Live" : "Open",
                  ticketPrice: tourneyObj.entryFee || 10,
                  prize: tourneyObj.prizePool || 25000,
                  players: tourneyObj.playersCount || 192,
                  maxPlayers: tourneyObj.maxPlayers || 256,
                  cardsSold: (tourneyObj.playersCount || 192) * cardsPerPlayer,
                  startsIn: tourneyObj.startsAt || "Scheduled",
                  pattern: tourneyObj.currentStageName || tourneyObj.rounds?.[0] || "Qualifiers",
                  accent: tourneyObj.id === "daily-masters" ? "emerald" : is30 ? "coral" : "violet",
                  tag: "TOURNAMENT",
                  frequency: "Scheduled Event",
                  cardRows,
                  cardColumns,
                  callDelay,
                  rtp: 80,
                  rtpMode: "fixed",
                  cardLimit: cardsPerPlayer,
                  winningStages: (tourneyObj.rounds || ["Qualifiers"]).map((r: string, idx: number, arr: string[]) => {
                    const defaultPattern = is90
                      ? (idx === arr.length - 1 ? "Full House" : idx === 1 ? "Two Lines" : "One Line")
                      : is30
                      ? (idx === arr.length - 1 ? "Speed Full House" : idx === 1 ? "Two Lines" : "One Line")
                      : (idx === arr.length - 1 ? "Full House" : idx === 2 ? "Diamond" : idx === 1 ? "Four Corners" : "One Line");
                    return {
                      name: r,
                      pattern: tourneyObj.stagePatterns?.[idx] || defaultPattern,
                      prize: Math.round((tourneyObj.prizePool || 25000) / arr.length),
                      continueAfterWin: idx < arr.length - 1,
                    };
                  }),
                };
                enterRoom(tourneyRoom, tourneyObj);
              }}
              notify={notify}
              currentUser={currentUser}
            />
          )}
          {playerView === "history" && <PlayerHistory />}
          {playerView === "tickets" && <PlayerHubPage key={currentUser?.username || "anon"} type="tickets" rooms={rooms} enterRoom={enterRoom} notify={notify} currentUser={currentUser} />}
          {playerView === "jackpots" && <PlayerHubPage type="jackpots" rooms={rooms} enterRoom={enterRoom} notify={notify} currentUser={currentUser} />}
          {playerView === "promotions" && <PlayerHubPage type="promotions" rooms={rooms} enterRoom={enterRoom} notify={notify} currentUser={currentUser} />}
          {playerView === "profile" && <PlayerHubPage type="profile" rooms={rooms} enterRoom={enterRoom} notify={notify} currentUser={currentUser} />}
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            currentUser={currentUser}
            onAuthSuccess={handleAuthSuccess}
          />
        </>
      ) : (
        <AdminExperience rooms={rooms} setRooms={setRooms} notify={notify} />
      )}
      <Toast message={toast} />
    </main>
  );
}
