"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, type PlayerModel } from "../api-client";
import { Bet888CasinoLobby } from "../components/casino/Bet888CasinoLobby";
import { AuthModal } from "../components/player/AuthModal";

export function Bet888CasinoLobbyWrapper() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PlayerModel | null>(null);
  const [wallet, setWallet] = useState(10000);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const username = apiClient.auth.getStoredUsername();
    if (username) {
      apiClient.auth.me(username).then((res) => {
        if (res?.user) {
          setCurrentUser(res.user);
          if (typeof res.wallet === "number") setWallet(res.wallet);
        }
      }).catch(() => {});
    }
  }, []);

  const handleAuthSuccess = (user: PlayerModel, newWallet: number) => {
    setCurrentUser(user);
    setWallet(newWallet);
    setAuthModalOpen(false);
  };

  return (
    <>
      <Bet888CasinoLobby
        currentUser={currentUser}
        wallet={wallet}
        onOpenAuth={() => setAuthModalOpen(true)}
        onNavigateToBingo={() => router.push("/")}
      />
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
