import { BingoRoomData, demoRooms } from "./bingo-core";

const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || "/api")
  : (process.env.INTERNAL_API_URL || "http://127.0.0.1:4000/api");

export interface GameStateModel {
  roomId: string;
  gameId: string;
  variant: string;
  status: string;
  calledNumbers: number[];
  currentBall: number | null;
  totalBalls: number;
  callIntervalMs: number;
  phase: string;
  round: number;
  currentStageIndex: number;
  winnerCount: number;
  isPaused: boolean;
  history: Array<{ ball: number; label: string; time: string }>;
  recentCalls: Array<{ ball: number; label: string }>;
  winningStages?: Array<{ name: string; prize: number; pattern: string }>;
  uncalledCount?: number;
}

export interface ClaimResultModel {
  claimId: string;
  valid: boolean;
  winner: boolean;
  pattern: string;
  prize: number;
  message: string;
}

export interface BingoCardModel {
  id: string;
  roomId?: string;
  player?: string;
  variant?: string;
  price?: number;
  numbers: number[][];
  daubed: boolean[][];
  rows?: number;
  columns?: number;
}

export interface WalletTransaction {
  id: string;
  player: string;
  room: string;
  type: string;
  amount: number;
  status: string;
  time: string;
  timestamp: number;
}

export interface JackpotModel {
  id: string;
  name: string;
  type: string;
  currentAmount: number;
  startingAmount: number;
  maxAmount: number;
  contributionPercent: number;
  active: boolean;
  history?: Array<{ type: string; amount: number; time: string; player?: string }>;
}

export interface TournamentModel {
  id: string;
  name: string;
  prizePool: number;
  entryFee: number;
  maxPlayers: number;
  registeredPlayers: string[];
  rounds: number;
  status: string;
  standings?: Array<{ rank: number; player: string; points: number; wins: number; fast: string; status: string }>;
}

export interface PromotionModel {
  id: string;
  code: string;
  title: string;
  description: string;
  reward: string;
  category: string;
  active: boolean;
}

export interface ChatMessageModel {
  id: string;
  sender: string;
  role: string;
  text: string;
  time: string;
  timestamp: number;
}

export interface PatternModel {
  id: string;
  name: string;
  cells: number[];
  layout?: string;
  allowRotations?: boolean;
  allowMirroring?: boolean;
}

export interface PlayerModel {
  id: string;
  username: string;
  tier: string;
  lastLogin: string;
  gamesPlayed: number;
  totalEntry: number;
  winnings: number;
  balance: number;
  status: string;
}

export interface DashboardMetricModel {
  label: string;
  value: string;
  change: string;
  icon: string;
  description: string;
}

export interface LiveOpModel {
  name: string;
  ball: string;
  players: string;
  progress: string;
  prize: string;
}

export interface TopRoomModel {
  name: string;
  games: string;
  tickets: string;
  revenue: string;
  ggr: string;
  trend: string;
}

export interface ActivityFeedModel {
  type: string;
  title: string;
  detail: string;
  time: string;
}

export interface DashboardResponse {
  success: boolean;
  metrics: DashboardMetricModel[];
  liveOps: LiveOpModel[];
  topRooms: TopRoomModel[];
  activityFeed: ActivityFeedModel[];
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const errJson = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(errJson.error || `Request failed with status ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`[API] Error on ${endpoint}:`, error);
    return null;
  }
}

export const apiClient = {
  rooms: {
    async list(params?: { variant?: string; status?: string; search?: string }): Promise<BingoRoomData[]> {
      const query = new URLSearchParams();
      if (params?.variant) query.set("variant", params.variant);
      if (params?.status) query.set("status", params.status);
      if (params?.search) query.set("search", params.search);
      const data = await request<{ success: boolean; rooms: BingoRoomData[] }>(`/rooms?${query.toString()}`);
      return data?.rooms ?? demoRooms;
    },
    async get(id: string): Promise<BingoRoomData | null> {
      const data = await request<{ success: boolean; room: BingoRoomData }>(`/rooms/${id}`);
      return data?.room ?? null;
    },
    async create(room: Partial<BingoRoomData>): Promise<BingoRoomData | null> {
      const data = await request<{ success: boolean; room: BingoRoomData }>("/rooms", {
        method: "POST",
        body: JSON.stringify(room),
      });
      return data?.room ?? null;
    },
    async update(id: string, updates: Partial<BingoRoomData>): Promise<BingoRoomData | null> {
      const data = await request<{ success: boolean; room: BingoRoomData }>(`/rooms/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      return data?.room ?? null;
    },
    async duplicate(id: string): Promise<BingoRoomData | null> {
      const data = await request<{ success: boolean; room: BingoRoomData }>(`/rooms/${id}/duplicate`, {
        method: "POST",
      });
      return data?.room ?? null;
    },
    async delete(id: string): Promise<boolean> {
      const data = await request<{ success: boolean }>(`/rooms/${id}`, {
        method: "DELETE",
      });
      return Boolean(data?.success);
    },
    async applyRtpPolicy(targetRtp: number, syncMode = "all"): Promise<BingoRoomData[] | null> {
      const data = await request<{ success: boolean; rooms: BingoRoomData[] }>("/rooms/rtp-policy", {
        method: "POST",
        body: JSON.stringify({ targetRtp, syncMode }),
      });
      return data?.rooms ?? null;
    },
  },

  game: {
    async getState(roomId: string) {
      return request<{ success: boolean; state: GameStateModel; room?: BingoRoomData }>(`/game/${roomId}/state`);
    },
    async callNext(roomId: string) {
      return request<{ success: boolean; ball: number; label: string; state: GameStateModel }>(`/game/${roomId}/call-next`, {
        method: "POST",
      });
    },
    async manualCall(roomId: string, number: number) {
      return request<{ success: boolean; ball: number; label: string; state: GameStateModel }>(`/game/${roomId}/manual-call`, {
        method: "POST",
        body: JSON.stringify({ number }),
      });
    },
    async pause(roomId: string) {
      return request<{ success: boolean; state: GameStateModel }>(`/game/${roomId}/pause`, {
        method: "POST",
      });
    },
    async resume(roomId: string) {
      return request<{ success: boolean; state: GameStateModel }>(`/game/${roomId}/resume`, {
        method: "POST",
      });
    },
    async restart(roomId: string) {
      return request<{ success: boolean; state: GameStateModel }>(`/game/${roomId}/restart`, {
        method: "POST",
      });
    },
    async cancel(roomId: string) {
      return request<{ success: boolean; message: string; refundAmount: number; state: GameStateModel }>(`/game/${roomId}/cancel`, {
        method: "POST",
      });
    },
    async claim(roomId: string, payload: { ticketId?: string; playerName?: string; manualPattern?: string }) {
      return request<{
        success: boolean;
        claim: ClaimResultModel;
        state: GameStateModel;
        wallet: number;
        message: string;
      }>(`/game/${roomId}/claim`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    async declareWinner(roomId: string, payload: { player: string; prize: number; pattern: string }) {
      return request<{ success: boolean; state: GameStateModel; message: string }>(`/game/${roomId}/declare-winner`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    async reviewClaim(roomId: string, claimId: string, action: "approve" | "reject") {
      return request<{ success: boolean; claim: ClaimResultModel; wallet: number }>(`/game/${roomId}/claims/${claimId}/review`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
    },
  },

  tickets: {
    async list(roomId?: string) {
      const q = roomId ? `?roomId=${encodeURIComponent(roomId)}` : "";
      const res = await request<{ success: boolean; count: number; tickets: BingoCardModel[] }>(`/tickets${q}`);
      return res?.tickets ?? [];
    },
    async buy(roomId: string, count = 1) {
      return request<{
        success: boolean;
        purchasedCount: number;
        totalCost: number;
        wallet: number;
        tickets: BingoCardModel[];
        message: string;
      }>("/tickets/buy", {
        method: "POST",
        body: JSON.stringify({ roomId, count }),
      });
    },
  },

  wallet: {
    async get() {
      return request<{
        success: boolean;
        balance: number;
        currency: string;
        totalSpent: number;
        totalWon: number;
        transactionCount: number;
      }>("/wallet");
    },
    async deposit(amount: number) {
      return request<{ success: boolean; balance: number; message: string }>("/wallet/deposit", {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
    },
    async withdraw(amount: number) {
      return request<{ success: boolean; balance: number; message: string }>("/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
    },
    async transactions(type?: string) {
      const q = type ? `?type=${encodeURIComponent(type)}` : "";
      const res = await request<{ success: boolean; count: number; transactions: WalletTransaction[] }>(`/wallet/transactions${q}`);
      return res?.transactions ?? [];
    },
  },

  jackpots: {
    async list() {
      const res = await request<{ success: boolean; jackpots: JackpotModel[] }>("/jackpots");
      return res?.jackpots ?? [];
    },
    async contribute(id: string, amount: number) {
      return request<{ success: boolean; jackpot: JackpotModel; message: string }>(`/jackpots/${id}/contribute`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
    },
  },

  tournaments: {
    async list() {
      const res = await request<{ success: boolean; tournaments: TournamentModel[] }>("/tournaments");
      return res?.tournaments ?? [];
    },
    async register(id: string, playerName = "Ari.R") {
      return request<{ success: boolean; tournament: TournamentModel; wallet: number; message: string }>(
        `/tournaments/${id}/register`,
        {
          method: "POST",
          body: JSON.stringify({ playerName }),
        }
      );
    },
  },

  promotions: {
    async list(category?: string) {
      const q = category ? `?category=${encodeURIComponent(category)}` : "";
      const res = await request<{ success: boolean; promotions: PromotionModel[] }>(`/promotions${q}`);
      return res?.promotions ?? [];
    },
    async claim(id: string, playerName = "Ari.R") {
      return request<{ success: boolean; promotion: PromotionModel; wallet: number; message: string }>(
        `/promotions/${id}/claim`,
        {
          method: "POST",
          body: JSON.stringify({ playerName }),
        }
      );
    },
    async update(id: string, updates: Partial<PromotionModel>) {
      return request<{ success: boolean; promotion: PromotionModel }>(`/promotions/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    },
  },

  chat: {
    async get(roomId: string) {
      return request<{ success: boolean; roomId: string; messages: ChatMessageModel[]; mutedUsers: string[] }>(`/chat/${roomId}`);
    },
    async send(roomId: string, text: string, user = "Ari.R", role = "player") {
      return request<{ success: boolean; message: ChatMessageModel }>(`/chat/${roomId}`, {
        method: "POST",
        body: JSON.stringify({ text, user, role }),
      });
    },
    async mute(user: string) {
      return request<{ success: boolean; message: string }>("/chat/mute", {
        method: "POST",
        body: JSON.stringify({ user }),
      });
    },
    async delete(roomId: string, messageId: string) {
      return request<{ success: boolean }>(`/chat/${roomId}/${messageId}`, {
        method: "DELETE",
      });
    },
    async broadcast(text: string, target = "all") {
      return request<{ success: boolean; message: string }>("/chat/broadcast", {
        method: "POST",
        body: JSON.stringify({ text, target }),
      });
    },
  },

  patterns: {
    async list() {
      const res = await request<{ success: boolean; patterns: PatternModel[] }>("/patterns");
      return res?.patterns ?? [];
    },
    async save(pattern: { name: string; cells: number[]; layout?: string; allowRotations?: boolean; allowMirroring?: boolean }) {
      return request<{ success: boolean; pattern: PatternModel; message: string }>("/patterns", {
        method: "POST",
        body: JSON.stringify(pattern),
      });
    },
  },

  admin: {
    async dashboard() {
      return request<DashboardResponse>("/admin/dashboard");
    },
    async players(search?: string, status?: string) {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (status) q.set("status", status);
      const res = await request<{ success: boolean; count: number; players: PlayerModel[] }>(`/admin/players?${q.toString()}`);
      return res?.players ?? [];
    },
    async playerAction(id: string, action: string) {
      return request<{ success: boolean; player: PlayerModel; message: string }>(`/admin/players/${id}/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
    },
    async liveControl() {
      return request<{ success: boolean; liveGames: GameStateModel[] }>("/admin/live-control");
    },
  },
};
