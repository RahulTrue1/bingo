import { BingoRoomData, demoRooms } from "./bingo-core";

const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || "/api")
  : (process.env.INTERNAL_API_URL || "http://127.0.0.1:4000/api");

export interface GameStateModel {
  roomId: string;
  gameId?: string;
  variant?: string;
  status?: string;
  calledNumbers?: number[];
  called?: number[];
  currentBall?: number | null;
  current?: number | null;
  totalBalls?: number;
  callIntervalMs?: number;
  phase: string;
  round?: number;
  currentStageIndex?: number;
  winnerCount?: number;
  isPaused?: boolean;
  paused?: boolean;
  history?: Array<{ ball: number; label: string; time: string }>;
  recentCalls?: Array<{ ball: number; label: string }>;
  winningStages?: Array<{ name: string; prize: number; pattern: string }>;
  uncalledCount?: number;
  countdown?: number;
  speed?: string;
  stageIndex?: number;
  patternRound?: number;
  winnerNames?: string[];
  winnerPrize?: number;
  winnerPattern?: string;
  livePlayers?: number;
  liveCards?: number;
  liveJackpot?: number;
  lastWinner?: string;
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
  userId?: string;
  variant?: string;
  price?: number;
  numbers?: number[][];
  cells?: Array<{ value: number | "FREE"; column: string }>;
  daubed?: boolean[][] | number[];
  ticketIndex?: number;
  purchasedAt?: string;
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
  key?: string;
  name: string;
  variant?: string;
  type?: string;
  currentAmount: number;
  startingAmount: number;
  maximumAmount?: number;
  maxAmount?: number;
  resetAmount?: number;
  contributionPercent: number;
  qualifyingPattern?: string;
  qualifyingBallLimit?: number;
  enabled?: boolean;
  active?: boolean;
  linkedRooms?: string[];
  price?: number;
  players?: number;
  difficulty?: string;
  reward?: string;
  iconKey?: "diamond" | "star" | "club";
  history?: Array<{ type: string; amount: number; time: string; player?: string; user?: string }>;
}

export interface TournamentEngineConfig {
  autoMode: boolean;
  roundDuration: number;
  stageSecondsRemaining: number;
  scheduledStartSeconds: number | null;
  startsAtText?: string;
  isPaused?: boolean;
}

export interface TournamentModel {
  id: string;
  name: string;
  description?: string;
  prizePool: number;
  entryFee: number;
  maxPlayers: number;
  playersCount?: number;
  registeredPlayers: string[];
  rounds: any;
  variant?: "75-Ball Pattern" | "90-Ball Classic" | "30-Ball Speed" | "80-Ball Shutter";
  cardsPerPlayer?: number;
  maxOpenBalls?: number;
  stagePatterns?: string[];
  currentRoundIndex?: number;
  currentStageName?: string;
  stageStatus?: "waiting" | "in_progress" | "scored" | "completed";
  winner?: string;
  prizeDistribution?: Record<string, number>;
  startsAt?: string;
  status: string;
  engine?: TournamentEngineConfig;
  standings?: Array<{ rank: number; player: string; points: number; wins: number; fast: string; status: string }>;
}

export interface PromotionModel {
  id: string;
  code: string;
  title: string;
  shortTitle?: string;
  description: string;
  reward?: string;
  category: string;
  badge?: string;
  rewardType?: string;
  rewardValue?: number;
  image?: string;
  accent?: string;
  roomId?: string;
  ends?: string;
  featured?: boolean;
  status?: string;
  active?: boolean;
  claimedBy?: string[];
}

export interface HeroBannerModel {
  id: string;
  roomId: string;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  alt: string;
  seconds: number;
  theme: string;
  value: string;
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  active: boolean;
}

export interface ChatMessageModel {
  id: string;
  sender?: string;
  user?: string;
  role: string;
  text: string;
  time: string;
  timestamp?: number;
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
  displayName?: string;
  email?: string;
  password?: string;
  joinedDate?: string;
  tier: string;
  lastLogin: string;
  gamesPlayed: number;
  cardsPurchased?: number;
  totalEntry?: number;
  totalPrizes?: number;
  winnings?: number;
  wins?: number;
  balance: number;
  status: string;
  restrictions?: string[];
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

export interface PlatformSettingsModel {
  initialCountdown: number;
  timeBetweenBalls: number;
  voiceCaller: "Trueigtech Nova" | "Trueigtech Max" | "Off";
  animation: "Premium ball motion" | "Minimal" | "Off";
  autoCall: boolean;
  manualCallEnabled: boolean;
  pauseOnBingoClaim: boolean;
  resumeAfterWinner: boolean;
  gameEndDelay: number;
  autoDaubDefault: boolean;
  soundEffects: boolean;
  maintenanceMode: boolean;
  platformName: string;
  currencySymbol: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SyncEventModel<T = unknown> {
  id: string;
  revision: number;
  timestamp: string;
  entity: string;
  action: string;
  roomId?: string;
  data?: T;
  message?: string;
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

const SESSION_TOKEN_KEY = "tig_session_token";
const SESSION_USER_KEY = "tig_session_user";

export function getStoredSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredSessionToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {}
}

export function getStoredSessionUser(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SESSION_USER_KEY);
  } catch {
    return null;
  }
}

export function setStoredSessionUser(username: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (username) {
      localStorage.setItem(SESSION_USER_KEY, username);
    } else {
      localStorage.removeItem(SESSION_USER_KEY);
    }
  } catch {}
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const token = getStoredSessionToken();
    const storedUser = getStoredSessionUser();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { "x-session-token": token, Authorization: `Bearer ${token}` } : {}),
      ...(storedUser ? { "x-player-username": storedUser } : {}),
      ...(options?.headers as Record<string, string>),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (data && typeof data === "object") {
        return data as T;
      }
      throw new Error(`Request failed with status ${res.status}`);
    }
    return data as T;
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
    async list(roomId?: string, username?: string) {
      const params = new URLSearchParams();
      if (roomId) params.set("roomId", roomId);
      const effectiveUser = username || getStoredSessionUser();
      if (effectiveUser) params.set("username", effectiveUser);
      const q = params.toString() ? `?${params.toString()}` : "";
      const res = await request<{ success: boolean; count: number; tickets: BingoCardModel[] }>(`/tickets${q}`);
      return res?.tickets ?? [];
    },
    async buy(roomId: string, count = 1, username?: string, userId?: string) {
      return request<{
        success: boolean;
        purchasedCount?: number;
        totalCost?: number;
        wallet?: number;
        tickets?: BingoCardModel[];
        message?: string;
        error?: string;
      }>("/tickets/buy", {
        method: "POST",
        body: JSON.stringify({
          roomId,
          count,
          username: username || getStoredSessionUser() || undefined,
          userId,
        }),
      });
    },
  },

  wallet: {
    async get(username?: string) {
      const effectiveUser = username || getStoredSessionUser();
      const q = effectiveUser ? `?username=${encodeURIComponent(effectiveUser)}` : "";
      return request<{
        success: boolean;
        balance: number;
        currency: string;
        totalSpent: number;
        totalWon: number;
        transactionCount: number;
      }>(`/wallet${q}`);
    },
    async deposit(amount: number, username?: string) {
      return request<{ success: boolean; balance: number; message: string }>("/wallet/deposit", {
        method: "POST",
        body: JSON.stringify({
          amount,
          username: username || getStoredSessionUser() || undefined,
        }),
      });
    },
    async withdraw(amount: number, username?: string) {
      return request<{ success: boolean; balance: number; message: string }>("/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({
          amount,
          username: username || getStoredSessionUser() || undefined,
        }),
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
    async create(data: Partial<JackpotModel>) {
      return request<{ success: boolean; jackpot: JackpotModel; message: string }>("/jackpots", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    async contribute(id: string, amount: number) {
      return request<{ success: boolean; jackpot: JackpotModel; message: string }>(`/jackpots/${id}/contribute`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
    },
    async trigger(id: string, winnerName?: string) {
      return request<{ success: boolean; jackpot: JackpotModel; winner: string; payout: number; wallet: number; message: string }>(`/jackpots/${id}/trigger`, {
        method: "POST",
        body: JSON.stringify({ winnerName }),
      });
    },
    async update(id: string, updates: Partial<JackpotModel>) {
      return request<{ success: boolean; jackpot: JackpotModel }>(`/jackpots/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    },
    async reset(id: string, resetAmount?: number) {
      return request<{ success: boolean; jackpot: JackpotModel; message: string }>(`/jackpots/${id}/reset`, {
        method: "POST",
        body: JSON.stringify({ resetAmount }),
      });
    },
    async delete(id: string) {
      return request<{ success: boolean; message: string }>(`/jackpots/${id}`, {
        method: "DELETE",
      });
    },
  },

  tournaments: {
    async list() {
      const res = await request<{ success: boolean; tournaments: TournamentModel[] }>("/tournaments");
      return res?.tournaments ?? [];
    },
    async register(id: string, playerName = "Ari.R") {
      return request<{ success: boolean; tournament?: TournamentModel; wallet?: number; message?: string; error?: string }>(
        `/tournaments/${id}/register`,
        {
          method: "POST",
          body: JSON.stringify({ playerName }),
        }
      );
    },
    async create(data: Partial<TournamentModel>) {
      return request<{ success: boolean; tournament: TournamentModel }>("/tournaments", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    async update(id: string, data: Partial<TournamentModel>) {
      return request<{ success: boolean; tournament: TournamentModel }>(`/tournaments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    async get(id: string) {
      const res = await request<{ success: boolean; tournament: TournamentModel }>(`/tournaments/${id}`);
      return res?.tournament;
    },
    async start(id: string) {
      return request<{ success: boolean; tournament: TournamentModel }>(`/tournaments/${id}/start`, {
        method: "POST",
      });
    },
    async scoreStage(id: string, playerScores?: Array<{ player: string; points: number; wins?: number; fast?: string }>) {
      return request<{ success: boolean; tournament: TournamentModel }>(`/tournaments/${id}/score-stage`, {
        method: "POST",
        body: JSON.stringify({ playerScores }),
      });
    },
    async advance(id: string) {
      return request<{ success: boolean; tournament: TournamentModel }>(`/tournaments/${id}/advance`, {
        method: "POST",
      });
    },
    async complete(id: string, winnerName?: string) {
      return request<{ success: boolean; tournament: TournamentModel; champion: string; payout: number; wallet: number }>(
        `/tournaments/${id}/complete`,
        {
          method: "POST",
          body: JSON.stringify({ winnerName }),
        }
      );
    },
    async reset(id: string) {
      return request<{ success: boolean; tournament: TournamentModel }>(`/tournaments/${id}/reset`, {
        method: "POST",
      });
    },
    async schedule(id: string, delaySeconds: number, cancel = false) {
      return request<{ success: boolean; tournament: TournamentModel; message: string }>(
        `/tournaments/${id}/schedule`,
        {
          method: "POST",
          body: JSON.stringify({ delaySeconds, cancel }),
        }
      );
    },
    async setAutoConfig(id: string, config: { autoMode?: boolean; roundDuration?: number; isPaused?: boolean }) {
      return request<{ success: boolean; tournament: TournamentModel; engine: TournamentEngineConfig; message: string }>(
        `/tournaments/${id}/auto-config`,
        {
          method: "POST",
          body: JSON.stringify(config),
        }
      );
    },
    async getEngine(id: string) {
      const res = await request<{ success: boolean; engine: TournamentEngineConfig }>(`/tournaments/${id}/engine`);
      return res?.engine;
    },
    async delete(id: string) {
      return request<{ success: boolean; message: string }>(`/tournaments/${id}`, {
        method: "DELETE",
      });
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
    async create(data: Partial<PromotionModel>) {
      return request<{ success: boolean; promotion: PromotionModel }>("/promotions", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  banners: {
    async list() {
      const res = await request<{ success: boolean; count: number; banners: HeroBannerModel[] }>("/banners");
      return res?.banners ?? [];
    },
    async create(data: Partial<HeroBannerModel>) {
      return request<{ success: boolean; banner: HeroBannerModel }>("/banners", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    async update(id: string, data: Partial<HeroBannerModel>) {
      return request<{ success: boolean; banner: HeroBannerModel }>(`/banners/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    async delete(id: string) {
      return request<{ success: boolean; banner?: HeroBannerModel }>(`/banners/${id}`, {
        method: "DELETE",
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
    async player(id: string) {
      const res = await request<{ success: boolean; player: PlayerModel }>(`/admin/players/${encodeURIComponent(id)}`);
      return res?.player;
    },
    async playerAction(id: string, action: string) {
      return request<{ success: boolean; player: PlayerModel; message: string }>(`/admin/players/${id}/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
    },
    async addPlayerFunds(id: string, amount: number, reason?: string) {
      return request<{ success: boolean; player: PlayerModel; wallet: number; amount: number; message: string }>(
        `/admin/players/${id}/add-funds`,
        {
          method: "POST",
          body: JSON.stringify({ amount, reason }),
        }
      );
    },
    async liveControl() {
      return request<{ success: boolean; liveGames: GameStateModel[] }>("/admin/live-control");
    },
  },

  auth: {
    getStoredToken: getStoredSessionToken,
    getStoredUsername: getStoredSessionUser,
    setStoredUsername: setStoredSessionUser,
    async me(username?: string) {
      const q = username ? `?username=${encodeURIComponent(username)}` : "";
      const res = await request<{ success: boolean; user: PlayerModel; wallet: number }>(`/auth/me${q}`);
      if (res?.user?.username) {
        setStoredSessionUser(res.user.username);
      }
      return res ?? null;
    },
    async login(username: string, password?: string) {
      const res = await request<{ success: boolean; token?: string; user?: PlayerModel; wallet?: number; message?: string; error?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (res?.success) {
        if (res.token) setStoredSessionToken(res.token);
        if (res.user?.username) setStoredSessionUser(res.user.username);
      }
      return res;
    },
    async signup(data: { username: string; password?: string; email?: string; displayName?: string; bonus?: number }) {
      const res = await request<{ success: boolean; token?: string; user?: PlayerModel; wallet?: number; message?: string; error?: string }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (res?.success) {
        if (res.token) setStoredSessionToken(res.token);
        if (res.user?.username) setStoredSessionUser(res.user.username);
      }
      return res;
    },
    async logout() {
      await request<{ success: boolean }>("/auth/logout", { method: "POST" });
      setStoredSessionToken(null);
      setStoredSessionUser(null);
    },
    async users() {
      const res = await request<{ success: boolean; users: PlayerModel[]; activeUsername: string }>("/auth/users");
      return res?.users ?? [];
    },
  },

  settings: {
    async get() {
      const res = await request<{ success: boolean; settings: PlatformSettingsModel }>("/settings");
      return res?.settings ?? null;
    },
    async update(settings: Partial<PlatformSettingsModel>) {
      return request<{ success: boolean; settings: PlatformSettingsModel; message: string }>("/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
    },
  },

  sync: {
    subscribe(onEvent: (event: SyncEventModel) => void): () => void {
      if (typeof window === "undefined") return () => {};
      const url = `${API_BASE}/sync/events`;
      let es: EventSource | null = null;
      let closed = false;
      let reconnectTimer: number | null = null;

      function connect() {
        if (closed) return;
        try {
          es = new EventSource(url);
          es.onmessage = (e) => {
            try {
              const parsed = JSON.parse(e.data);
              onEvent(parsed);
            } catch {
              // ignore ping/comments
            }
          };
          es.onerror = () => {
            if (es) {
              es.close();
              es = null;
            }
            if (!closed) {
              reconnectTimer = window.setTimeout(connect, 3000);
            }
          };
        } catch {
          if (!closed) {
            reconnectTimer = window.setTimeout(connect, 4000);
          }
        }
      }

      connect();

      return () => {
        closed = true;
        if (reconnectTimer) window.clearTimeout(reconnectTimer);
        if (es) es.close();
      };
    },
    async status(since = 0) {
      return request<{
        success: boolean;
        revision: number;
        events: SyncEventModel[];
        summary: Record<string, unknown>;
      }>(`/sync/status?since=${since}`);
    },
    async broadcast(message: string, entity = "announcement", action = "broadcast", data?: unknown, roomId?: string) {
      return request<{ success: boolean; event: SyncEventModel }>("/sync/broadcast", {
        method: "POST",
        body: JSON.stringify({ message, entity, action, data, roomId }),
      });
    },
  },
};
