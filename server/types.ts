export type BingoStatus = "Live" | "Selling Tickets" | "Starting Soon" | "Open" | "Scheduled";
export type RtpMode = "dynamic" | "fixed";
export type GamePhase = "selling" | "countdown" | "live" | "review" | "winner" | "results";

export interface WinningStage {
  name: string;
  prize: number;
  continueAfterWin: boolean;
}

export interface BingoRoomData {
  id: string;
  name: string;
  variant: string;
  status: BingoStatus;
  ticketPrice: number;
  prize: number;
  jackpot?: number;
  players: number;
  maxPlayers: number;
  cardsSold: number;
  startsIn: string;
  pattern: string;
  accent: string;
  featured?: boolean;
  tag: string;
  frequency?: string;
  winningStages?: WinningStage[];
  cardRows?: number;
  cardColumns?: number;
  callDelay?: number;
  vipOnly?: boolean;
  progressiveBallLimit?: number;
  rtp?: number;
  rtpMode?: RtpMode;
  customRtp?: boolean;
  cardLimit?: number;
  promotion?: string;
  gameDate?: string;
}

export interface BingoCardCell {
  value: number | "FREE";
  column: string;
}

export interface PlayerTicket {
  id: string;
  ticketIndex: number;
  roomId: string;
  userId: string;
  variant: string;
  cells: BingoCardCell[];
  daubed: number[];
  purchasedAt: string;
}

export interface GameSession {
  roomId: string;
  phase: GamePhase;
  countdown: number;
  called: number[];
  current: number | null;
  speed: string;
  paused: boolean;
  stageIndex: number;
  patternRound: number;
  winnerNames: string[];
  winnerPrize: number;
  winnerPattern: string;
  livePlayers: number;
  liveCards: number;
  liveJackpot: number;
  lastWinner: string;
}

export interface BingoClaim {
  id: string;
  roomId: string;
  ticketId: string;
  playerName: string;
  pattern: string;
  status: "pending" | "approved" | "rejected";
  prize: number;
  timestamp: string;
  cells: number[];
}

export interface Transaction {
  id: string;
  player: string;
  room: string;
  type: "Ticket purchase" | "Prize payout" | "Jackpot contribution" | "Refund" | "Promotional credit" | "Deposit" | "Withdrawal";
  amount: number;
  status: "Completed" | "Processing" | "Failed";
  timestamp: string;
}

export interface Jackpot {
  id: string;
  name: string;
  variant: string;
  currentAmount: number;
  startingAmount: number;
  maximumAmount: number;
  resetAmount: number;
  contributionPercent: number;
  qualifyingPattern: string;
  qualifyingBallLimit: number;
  enabled: boolean;
  linkedRooms: string[];
  key?: string;
  price?: number;
  players?: number;
  difficulty?: string;
  reward?: string;
  iconKey?: "diamond" | "star" | "club";
  history: Array<{
    type: string;
    amount: number;
    time: string;
    user: string;
  }>;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  entryFee: number;
  prizePool: number;
  playersCount: number;
  maxPlayers: number;
  startsAt: string;
  status: "Registration open" | "Live" | "Completed";
  rounds: string[];
  registeredPlayers?: string[];
  currentRoundIndex?: number;
  currentStageName?: string;
  stageStatus?: "waiting" | "in_progress" | "scored" | "completed";
  winner?: string;
  prizeDistribution?: Record<string, number>;
  scoringRules: Record<string, string>;
  standings: Array<{
    rank: number;
    player: string;
    points: number;
    wins: number;
    status: string;
    fast?: string;
  }>;
}

export interface Promotion {
  id: string;
  code: string;
  title: string;
  shortTitle?: string;
  description: string;
  status: "Active" | "Scheduled" | "Draft" | "Paused";
  category: "All offers" | "Free cards" | "Ticket deals" | "VIP" | "Tournaments" | "Deposit bonus" | "Cashback";
  badge: string;
  rewardType: "credits" | "free_cards" | "cashback" | "vip_pass";
  rewardValue: number;
  reward?: string;
  image?: string;
  accent?: string;
  roomId?: string;
  ends?: string;
  featured?: boolean;
  claimedBy: string[];
}

export interface HeroBanner {
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

export interface ChatMessage {
  id: string;
  roomId: string;
  user: string;
  text: string;
  time: string;
  role: "player" | "admin" | "system";
}

export interface SavedPattern {
  name: string;
  cells: number[];
  layout: string;
  allowRotations: boolean;
  allowMirroring: boolean;
}

export interface PlayerProfile {
  id: string;
  username: string;
  tier: "Standard" | "VIP" | "Restricted";
  balance: number;
  gamesPlayed: number;
  cardsPurchased: number;
  wins: number;
  totalPrizes: number;
  restrictions: string[];
  lastLogin: string;
  status: "Active" | "Restricted" | "Suspended";
}

export interface PlatformSettings {
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
  updatedAt: string;
  updatedBy: string;
}

