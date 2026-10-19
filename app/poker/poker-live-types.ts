export type PokerFeeType = "RAKE" | "HAND_FEE" | "TABLE_FEE";
export type PokerSuit = "c" | "d" | "h" | "s";
export type PokerStage = "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown";
export type PokerTableStatus = "open" | "paused";

export interface PokerCard {
  r: number; // 2..14 (11=J, 12=Q, 13=K, 14=A)
  s: PokerSuit;
}

export interface PokerFeeConfig {
  rakePercent: number;
  rakeCap: number;
  handFee: number;
  tableFee: number;
  tableFeeMinutes: number;
}

export interface PokerLobbyTable {
  id: number;
  name: string;
  feeType: PokerFeeType;
  feeLabel?: string;
  private: boolean;
  isOwner?: boolean;
  ownerUserId?: number;
  sb: number;
  bb: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxSeats: number;
  players: number;
  seatsTaken: boolean[] | null;
  inProgress: boolean;
  status: PokerTableStatus;
  fee: PokerFeeConfig;
  actionTimeoutSec?: number;
  inviteCode?: string;
}

export interface PokerSeatPlayer {
  userId: number;
  username: string;
  stack: number;
  bet: number;
  folded: boolean;
  allIn: boolean;
  inHand: boolean;
  sittingOut: boolean;
  disconnected: boolean;
  lastAction: string;
  cards: Array<PokerCard | null>;
  handName: string | null;
}

export interface PokerActions {
  toCall: number;
  canCheck: boolean;
  canRaise: boolean;
  minTo: number;
  maxTo: number;
  currentBet: number;
  myBet: number;
  potAfterCall: number;
}

export interface PokerWinner {
  seat: number;
  username: string;
  amount: number;
  handName: string | null;
  cards: PokerCard[];
}

export interface PokerLastResult {
  handNo: number;
  byFold: boolean;
  rake: number;
  winners: PokerWinner[];
}

export interface PokerLogEntry {
  t: number;
  type: "info" | "action";
  text: string;
}

export interface PokerLiveState {
  id: number;
  name: string;
  kind: PokerFeeType;
  feeLabel: string;
  private: boolean;
  inviteCode: string | null;
  sb: number;
  bb: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxSeats: number;
  stage: PokerStage;
  status: PokerTableStatus;
  handNo: number;
  board: PokerCard[];
  pot: number;
  dealer: number;
  sbIdx: number;
  bbIdx: number;
  current: number;
  timeLeft: number;
  actionMs: number;
  me: number;
  seats: Array<PokerSeatPlayer | null>;
  actions: PokerActions | null;
  lastResult: PokerLastResult | null;
  log: PokerLogEntry[];
}

export interface PokerChatMessage {
  tableId?: number;
  from: string;
  text: string;
  t: number;
}

export interface PokerSessionItem {
  id: number;
  tableId: number;
  tableName: string;
  feeType: PokerFeeType;
  private: boolean;
  blinds: string;
  status: "seated" | "sitout" | "left";
  buyIn: number;
  cashOut: number | null;
  onTable: number | null;
  profit: number;
  joinedAt: string;
  leftAt: string | null;
  durationSec: number;
}

export interface PokerHandSummaryItem {
  id: number;
  tableId: number;
  tableName: string;
  handNo: number;
  status: "complete" | "voided" | "running";
  startedAt: string;
  endedAt: string;
  contributed: number;
  won: number;
  net: number;
  handRank: string | null;
  folded: boolean;
}

export interface PokerHandActionItem {
  street: string;
  seat: number;
  username: string;
  action: "post_sb" | "post_bb" | "fold" | "check" | "call" | "bet" | "raise" | "allin" | "timeout";
  timeoutResult?: "check" | "fold";
  to: number;
  t: number;
}

export interface PokerHandPlayerItem {
  seatNo: number;
  username: string;
  isMe: boolean;
  startStack: number;
  endStack: number;
  contributed: number;
  won: number;
  handRank: string | null;
  folded: boolean;
  cards: string[] | null;
}

export interface PokerHandDetail {
  id: number;
  tableId: number;
  tableName: string;
  handNo: number;
  status: "complete" | "voided" | "running";
  dealerSeat: number;
  sbSeat: number;
  bbSeat: number;
  board: string[];
  totalPot: number;
  rake: number;
  startedAt: string;
  endedAt: string;
  actions: PokerHandActionItem[];
  players: PokerHandPlayerItem[];
}

export interface PokerApiErrorDetail {
  statusCode?: number;
  error?: string;
  message?: string;
  code?: number | string;
  explanation?: string;
}
