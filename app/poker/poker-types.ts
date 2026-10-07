export type SuitIndex = 0 | 1 | 2 | 3; // s, h, d, c
export type CardModel = { r: number; s: number }; // r: 2..14, s: 0..3

export type VariantCode = 'NLH' | 'FLH' | 'PLO4' | 'PLO5' | 'PLO8' | 'SD';

export interface VariantDef {
  code: VariantCode;
  name: string;
  hole: number;
  eval: 'holdem' | 'omaha';
  limit: 'NL' | 'PL' | 'FL';
  hilo?: boolean;
  shortDeck?: boolean;
}

export interface HandEvalResult {
  score: number;
  cat: number;
  kick: number[];
  cards?: CardModel[];
  name?: string;
}

export interface LowEvalResult {
  score: number;
  ranks: number[];
  cards: CardModel[];
  name: string;
}

export interface TableConfig {
  variant: VariantCode;
  seats: number;
  sb?: number;
  bb?: number;
  ante?: number;
  buttonBlind?: number;
  mode?: 'cash' | 'tourney';
  rakePct?: number;
  rakeCapBB?: number;
  unit?: number;
  heroSeat?: number;
  nfnd?: boolean;
  clock?: number;
}

export interface PlayerState {
  name: string;
  stack: number;
  hero?: boolean;
  bot?: boolean;
  sittingOut?: boolean;
  dealt?: boolean;
  cards: CardModel[];
  folded?: boolean;
  allIn?: boolean;
  bet: number;
  total: number;
  acted?: boolean;
  last?: string;
  lastType?: string;
  startStack?: number;
  won: number;
  persona?: { aggr: number; loose: number };
}

export interface LegalActions {
  fold: boolean;
  check: boolean;
  call: number;
  raise: { minTo: number; maxTo: number; isBet: boolean } | null;
  toCall: number;
}

export interface PotResult {
  amount: number;
  winners: number[];
  hi?: number[];
  lo?: number[];
}

export interface HandResults {
  pot: number;
  rake: number;
  uncontested?: boolean;
  winners: (number | { seat: number; amount: number; hand: HandEvalResult | null })[];
  pots: PotResult[];
  hands?: Record<number, HandEvalResult>;
  lows?: Record<number, LowEvalResult>;
}

export type TableTurnEvent =
  | { type: 'turn'; seat: number }
  | { type: 'street'; street: number; runout?: boolean; last?: boolean; seat?: number }
  | { type: 'handEnd'; results: HandResults }
  | { type: 'error'; msg: string };

export interface CashGameDef {
  id: string;
  v: VariantCode;
  sb?: number;
  bb?: number;
  ante?: number;
  buttonBlind?: number;
  seats: number;
  cat: 'cash' | 'blitz' | 'club';
  tag?: string;
  club?: string;
  code?: string;
  clock?: number;
  rake?: number;
}

export interface SngDef {
  id: string;
  name: string;
  v: VariantCode;
  seats: number;
  field: number;
  buy: number;
  fee: number;
  stack: number;
  levels: number[][];
  hpl: number;
  pay: number[];
  spin?: boolean;
}

export interface MttDef {
  id: string;
  name: string;
  v: VariantCode;
  seats: number;
  field: number;
  buy: number;
  fee: number;
  stack: number;
  levels: number[][];
  hpl: number;
  bounty?: boolean;
  gtd?: number;
  start?: number;
  satellite?: number;
  added?: number;
  status?: string;
}

export interface LiveEventDef {
  name: string;
  when: string;
  buy: string;
  sat: string;
}

export interface TicketModel {
  name: string;
  value: number;
  cur: string;
  from: string;
  ts: number;
  code: string;
}

export interface TransactionModel {
  ts: number;
  type: string;
  amount: number;
  cur: string;
  note?: string;
  bal: number;
}

export interface HandRecordModel {
  id: string;
  ts: number;
  kind: string;
  game: string;
  v: VariantCode;
  stakes: string;
  cur: string;
  unit: number;
  hole: string[];
  board: string[];
  pot: number;
  rake: number;
  net: number;
  result: string;
  hand: string;
  log: string[];
  seed: string;
  hash: string;
  deck: string[];
  variantShort: boolean;
  heroRake: number;
}

export interface TourneyRecordModel {
  ts: number;
  name: string;
  game: string;
  kind: string;
  buy: number;
  cur: string;
  place: number;
  field: number;
  prize: number;
  bounties: number;
  ticket: string | null;
  mult: number | null;
  quit: boolean;
}

export interface ActiveTournamentState extends Partial<MttDef & SngDef> {
  kind: 'sng' | 'spin' | 'mtt';
  cur: string;
  level: number;
  handsInLevel: number;
  remaining: number;
  prize: number;
  startedAt: number;
  bounties: number;
  mult?: number;
  env?: number[];
  bountyPool?: number;
  seatsWon?: number;
  leftover?: number;
  pays?: number[] | null;
  skipped?: boolean;
  done?: boolean;
}

export interface PokerSessionState {
  kind: 'cash' | 'blitz' | 'sng' | 'spin' | 'mtt';
  def: any;
  cur: string;
  table: any; // PokerTable
  hero: number;
  timers: NodeJS.Timeout[];
  clock?: NodeJS.Timeout;
  buyInTotal: number;
  handsHere: number;
  T?: ActiveTournamentState;
  pre?: { checkFold: boolean; callAny: boolean };
  pendingAdd?: number;
  newTable?: boolean;
  prevBoard?: number;
  recorded?: boolean;
  turnStart?: number;
}
