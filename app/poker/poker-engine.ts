import {
  CardModel,
  HandEvalResult,
  LowEvalResult,
  PlayerState,
  TableConfig,
  TableTurnEvent,
  VariantCode,
  VariantDef,
} from './poker-types';

export const RANKCH = '23456789TJQKA';
export const SUITCH = 'shdc';

export const RANK_NAME: Record<number, string> = {
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  10: 'Ten',
  11: 'Jack',
  12: 'Queen',
  13: 'King',
  14: 'Ace',
};

export const RANK_PL: Record<number, string> = {
  2: 'Twos',
  3: 'Threes',
  4: 'Fours',
  5: 'Fives',
  6: 'Sixes',
  7: 'Sevens',
  8: 'Eights',
  9: 'Nines',
  10: 'Tens',
  11: 'Jacks',
  12: 'Queens',
  13: 'Kings',
  14: 'Aces',
};

export const cardStr = (c: CardModel): string => RANKCH[c.r - 2] + SUITCH[c.s];
export const parseCard = (s: string): CardModel => ({
  r: RANKCH.indexOf(s[0]) + 2,
  s: SUITCH.indexOf(s[1]),
});

/* ---------- SHA-256 (for seed commitment) ---------- */
export function sha256(ascii: string): string {
  function rr(v: number, a: number): number {
    return (v >>> a) | (v << (32 - a));
  }
  const maxWord = Math.pow(2, 32);
  let result = '';
  const words: number[] = [];
  const bitLen = ascii.length * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let pc = 0;
  const comp: Record<number, boolean> = {};

  for (let cand = 2; pc < 64; cand++) {
    if (!comp[cand]) {
      for (let i = 0; i < 313; i += cand) comp[i] = true;
      hash[pc] = (Math.pow(cand, 0.5) * maxWord) | 0;
      k[pc++] = (Math.pow(cand, 1 / 3) * maxWord) | 0;
    }
  }

  hash = hash.slice(0, 8);
  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = (bitLen / maxWord) | 0;
  words[words.length] = bitLen;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const old = hash;
    hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const t1 =
        hash[7] +
        (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) |
              0);
      const t2 =
        (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(t1 + t2) | 0].concat(hash);
      hash[4] = (hash[4] + t1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/* ---------- Seeded PRNG (sfc32 over xmur3) – deterministic, verifiable shuffle ---------- */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export function sfc32(a: number, b: number, c: number, d: number): () => number {
  return function () {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function seededRng(seed: string): () => number {
  const h = xmur3(seed);
  return sfc32(h(), h(), h(), h());
}

export function newSeed(): string {
  const a = new Uint32Array(4);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(a);
  } else {
    for (let i = 0; i < 4; i++) a[i] = (Math.random() * 4294967296) >>> 0;
  }
  return Array.from(a, (x) => x.toString(16).padStart(8, '0')).join('');
}

export function buildDeck(shortDeck?: boolean): CardModel[] {
  const d: CardModel[] = [];
  for (let s = 0; s < 4; s++) {
    for (let r = shortDeck ? 6 : 2; r <= 14; r++) {
      d.push({ r, s });
    }
  }
  return d;
}

export function shuffle<T>(deck: T[], rng: () => number): T[] {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/* ---------- Variants ---------- */
export const VARIANTS: Record<VariantCode, VariantDef> = {
  NLH: { code: 'NLH', name: "No-Limit Hold'em", hole: 2, eval: 'holdem', limit: 'NL' },
  FLH: { code: 'FLH', name: "Fixed-Limit Hold'em", hole: 2, eval: 'holdem', limit: 'FL' },
  PLO4: { code: 'PLO4', name: 'Pot-Limit Omaha', hole: 4, eval: 'omaha', limit: 'PL' },
  PLO5: { code: 'PLO5', name: '5-Card PLO', hole: 5, eval: 'omaha', limit: 'PL' },
  PLO8: { code: 'PLO8', name: 'PLO Hi-Lo 8/b', hole: 4, eval: 'omaha', limit: 'PL', hilo: true },
  SD: { code: 'SD', name: 'Short Deck 6+', hole: 2, eval: 'holdem', limit: 'NL', shortDeck: true },
};

/* ---------- Combinatorics ---------- */
export function combos<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const n = arr.length;
  const idx: number[] = [];
  (function rec(start: number, depth: number) {
    if (depth === k) {
      out.push(idx.map((i) => arr[i]));
      return;
    }
    for (let i = start; i <= n - (k - depth); i++) {
      idx[depth] = i;
      rec(i + 1, depth + 1);
    }
  })(0, 0);
  return out;
}

/* ---------- Hand evaluator ---------- */
export const CAT_NAMES = [
  'High card',
  'Pair',
  'Two pair',
  'Three of a kind',
  'Straight',
  'Flush',
  'Full house',
  'Four of a kind',
  'Straight flush',
];

export const SD_ORDER: Record<number, number> = {
  8: 8,
  7: 7,
  5: 6,
  6: 5,
  3: 4,
  4: 3,
  2: 2,
  1: 1,
  0: 0,
}; // short deck: flush > full house, trips > straight

export function eval5(c: CardModel[], sd?: boolean): HandEvalResult {
  const rs = c.map((x) => x.r).sort((a, b) => b - a);
  const flush = c[0].s === c[1].s && c[1].s === c[2].s && c[2].s === c[3].s && c[3].s === c[4].s;
  const cnt: Record<number, number> = {};
  for (const r of rs) cnt[r] = (cnt[r] || 0) + 1;
  const groups = Object.keys(cnt)
    .map((r) => [cnt[+r], +r])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let sh = 0;
  if (groups.length === 5) {
    if (rs[0] - rs[4] === 4) sh = rs[0];
    else if (!sd && rs[0] === 14 && rs[1] === 5) sh = 5;
    else if (sd && rs[0] === 14 && rs[1] === 9 && rs[4] === 6) sh = 9;
  }
  let cat: number;
  let kick: number[];
  if (sh && flush) {
    cat = 8;
    kick = [sh];
  } else if (groups[0][0] === 4) {
    cat = 7;
    kick = [groups[0][1], groups[1][1]];
  } else if (groups[0][0] === 3 && groups[1][0] === 2) {
    cat = 6;
    kick = [groups[0][1], groups[1][1]];
  } else if (flush) {
    cat = 5;
    kick = rs;
  } else if (sh) {
    cat = 4;
    kick = [sh];
  } else if (groups[0][0] === 3) {
    cat = 3;
    kick = groups.map((g) => g[1]);
  } else if (groups[0][0] === 2 && groups[1][0] === 2) {
    cat = 2;
    kick = groups.map((g) => g[1]);
  } else if (groups[0][0] === 2) {
    cat = 1;
    kick = groups.map((g) => g[1]);
  } else {
    cat = 0;
    kick = rs;
  }
  const ord = sd ? SD_ORDER[cat] : cat;
  let score = ord;
  for (let i = 0; i < 5; i++) score = score * 16 + (kick[i] || 0);
  return { score, cat, kick };
}

export function describe(h: HandEvalResult): string {
  const k = h.kick;
  switch (h.cat) {
    case 8:
      return k[0] === 14 ? 'Royal flush' : `Straight flush, ${RANK_NAME[k[0]]} high`;
    case 7:
      return `Four of a kind, ${RANK_PL[k[0]]}`;
    case 6:
      return `Full house, ${RANK_PL[k[0]]} full of ${RANK_PL[k[1]]}`;
    case 5:
      return `Flush, ${RANK_NAME[k[0]]} high`;
    case 4:
      return `Straight, ${RANK_NAME[k[0]]} high`;
    case 3:
      return `Three of a kind, ${RANK_PL[k[0]]}`;
    case 2:
      return `Two pair, ${RANK_PL[k[0]]} and ${RANK_PL[k[1]]}`;
    case 1:
      return `Pair of ${RANK_PL[k[0]]}`;
    default:
      return `High card ${RANK_NAME[k[0]]}`;
  }
}

export function bestHand(hole: CardModel[], board: CardModel[], variant: VariantDef): HandEvalResult {
  const sd = !!variant.shortDeck;
  let best: HandEvalResult | null = null;
  let cands: CardModel[][];
  if (variant.eval === 'omaha') {
    cands = [];
    const hs = combos(hole, 2);
    const bs = combos(board, 3);
    for (const h of hs) {
      for (const b of bs) {
        cands.push(h.concat(b));
      }
    }
  } else {
    cands = combos(hole.concat(board), 5);
  }

  for (const c of cands) {
    const e = eval5(c, sd);
    if (!best || e.score > best.score) {
      best = e;
      best.cards = c;
    }
  }
  if (!best) {
    best = eval5(hole.slice(0, 5), sd);
  }
  best.name = describe(best);
  return best;
}

// Omaha 8-or-better low: exactly 2 hole + 3 board, 5 distinct ranks <= 8 (A = 1). Lower score wins.
export function bestLow(hole: CardModel[], board: CardModel[]): LowEvalResult | null {
  let best: LowEvalResult | null = null;
  for (const h of combos(hole, 2)) {
    for (const b of combos(board, 3)) {
      const rs = h.concat(b).map((c) => (c.r === 14 ? 1 : c.r));
      if (rs.some((r) => r > 8)) continue;
      if (new Set(rs).size !== 5) continue;
      const s = rs.sort((a, b) => b - a);
      let score = 0;
      for (const r of s) score = score * 16 + r;
      if (!best || score < best.score) {
        best = { score, ranks: s, cards: h.concat(b), name: '' };
      }
    }
  }
  if (best) {
    best.name = best.ranks.map((r) => (r === 1 ? 'A' : String(r))).join('-') + ' low';
  }
  return best;
}

/* ---------- Table engine ---------- */
export class PokerTable {
  cfg: TableConfig & {
    sb: number;
    bb: number;
    ante: number;
    buttonBlind: number;
    rakePct: number;
    rakeCapBB: number;
    unit: number;
    mode: 'cash' | 'tourney';
  };
  v: VariantDef;
  players: (PlayerState | null)[];
  button: number;
  handNo: number;
  handId: string | null;
  phase: 'idle' | 'betting' | 'runout' | 'showdown' | 'done';
  log: string[];
  events: any[];
  seed: string = '';
  seedHash: string = '';
  deck: CardModel[] = [];
  deckOrder: string[] = [];
  dp: number = 0;
  board: CardModel[] = [];
  street: number = 0;
  results: any = null;
  raises: number = 0;
  currentBet: number = 0;
  lastRaise: number = 0;
  toAct: number = -1;
  bigSeat: number = -1;
  sbSeat?: number;
  bbSeat?: number;

  constructor(cfg: TableConfig) {
    this.cfg = Object.assign(
      {
        sb: 0,
        bb: 0,
        ante: 0,
        buttonBlind: 0,
        rakePct: 0,
        rakeCapBB: 0,
        unit: 1,
        mode: 'cash' as const,
      },
      cfg
    );
    this.v = VARIANTS[this.cfg.variant];
    this.players = Array.from({ length: this.cfg.seats }, () => null);
    this.button = -1;
    this.handNo = 0;
    this.handId = null;
    this.phase = 'idle';
    this.log = [];
    this.events = [];
  }

  get bigUnit(): number {
    return Math.max(this.cfg.bb, this.cfg.buttonBlind, this.cfg.ante * 2, 1);
  }

  seat(i: number, p: Partial<PlayerState>) {
    this.players[i] = Object.assign(
      {
        name: 'Player',
        stack: 0,
        sittingOut: false,
        cards: [],
        bet: 0,
        total: 0,
        won: 0,
      },
      p
    ) as PlayerState;
  }

  inHand(): PlayerState[] {
    return this.players.filter((p): p is PlayerState => !!(p && p.dealt && !p.folded));
  }

  potTotal(): number {
    return this.players.reduce((s, p) => s + (p && p.dealt ? p.total : 0), 0);
  }

  collected(): number {
    return this.players.reduce((s, p) => s + (p && p.dealt ? p.total - p.bet : 0), 0);
  }

  next(i: number, pred: (p: PlayerState, idx: number) => boolean): number {
    const n = this.players.length;
    for (let k = 1; k <= n; k++) {
      const j = (i + k) % n;
      const p = this.players[j];
      if (p && pred(p, j)) return j;
    }
    return -1;
  }

  fmt(x: number): string {
    return this.cfg.unit === 100 ? (x / 100).toFixed(2) : String(x);
  }

  L(line: string) {
    this.log.push(line);
  }

  startHand(seed: string, handId?: string): TableTurnEvent | null {
    const eligible = (p: PlayerState | null): p is PlayerState =>
      !!(p && p.stack > 0 && !p.sittingOut);
    if (this.players.filter(eligible).length < 2) return null;
    this.handNo++;
    this.handId = handId || 'H' + Date.now().toString(36).toUpperCase();
    this.seed = seed;
    this.seedHash = sha256(seed);
    this.deck = shuffle(buildDeck(this.v.shortDeck), seededRng(seed));
    this.deckOrder = this.deck.map(cardStr);
    this.dp = 0;
    this.board = [];
    this.street = 0;
    this.log = [];
    this.results = null;
    this.raises = 0;

    this.players.forEach((p) => {
      if (p) {
        Object.assign(p, {
          dealt: eligible(p),
          cards: [],
          folded: false,
          allIn: false,
          bet: 0,
          total: 0,
          acted: false,
          last: '',
          startStack: p.stack,
          won: 0,
        });
      }
    });

    this.button = this.next(
      this.button < 0 ? this.players.length - 1 : this.button,
      eligible
    );
    const c = this.cfg;
    const fmt = (x: number) => this.fmt(x);

    this.L(
      `TIG Hand #${this.handId}: ${this.v.name} (${
        c.ante && !c.bb ? 'ante ' + fmt(c.ante) : fmt(c.sb) + '/' + fmt(c.bb)
      }${c.ante && c.bb ? ' ante ' + fmt(c.ante) : ''})`
    );
    this.L(`Seed hash (committed pre-deal): ${this.seedHash}`);

    this.players.forEach((p, i) => {
      if (p && p.dealt) {
        this.L(`Seat ${i + 1}: ${p.name} (${fmt(p.stack)})${i === this.button ? ' [BTN]' : ''}`);
      }
    });

    const post = (i: number, amt: number, live: boolean, label: string) => {
      const p = this.players[i]!;
      const a = Math.min(amt, p.stack);
      p.stack -= a;
      p.total += a;
      if (live) p.bet += a;
      if (p.stack === 0) p.allIn = true;
      this.L(`${p.name}: posts ${label} ${fmt(a)}`);
    };

    if (c.ante) {
      this.players.forEach((p, i) => {
        if (p && p.dealt) post(i, c.ante, false, 'ante');
      });
    }

    const dealtCount = this.players.filter((p) => p && p.dealt).length;
    let bigSeat = this.button;
    if (c.bb) {
      const sbSeat = dealtCount === 2 ? this.button : this.next(this.button, (p) => !!p.dealt);
      const bbSeat = this.next(sbSeat, (p) => !!p.dealt);
      if (c.sb) post(sbSeat, c.sb, true, 'small blind');
      post(bbSeat, c.bb, true, 'big blind');
      this.sbSeat = sbSeat;
      this.bbSeat = bbSeat;
      bigSeat = bbSeat;
    }
    if (c.buttonBlind) {
      post(this.button, c.buttonBlind, true, 'button blind');
      bigSeat = this.button;
    }

    this.currentBet = Math.max(...this.players.map((p) => (p && p.dealt ? p.bet : 0)));
    this.lastRaise = this.bigUnit;

    // deal hole cards one at a time starting left of button
    const order: number[] = [];
    let s = this.button;
    for (let k = 0; k < dealtCount; k++) {
      s = this.next(s, (p) => !!p.dealt);
      order.push(s);
    }
    for (let r = 0; r < this.v.hole; r++) {
      for (const i of order) {
        this.players[i]!.cards.push(this.deck[this.dp++]);
      }
    }

    this.L('*** HOLE CARDS ***');
    this.phase = 'betting';
    this.toAct = this.next(bigSeat, (p) => !!(p.dealt && !p.folded && !p.allIn));
    this.bigSeat = bigSeat;

    const res = this.checkRoundEnd(true);
    return res || { type: 'turn', seat: this.toAct };
  }

  legal(i: number) {
    const p = this.players[i];
    if (!p || this.toAct !== i || this.phase !== 'betting') return null;
    const toCall = Math.min(this.currentBet - p.bet, p.stack);
    const L: {
      fold: boolean;
      check: boolean;
      call: number;
      raise: { minTo: number; maxTo: number; isBet: boolean } | null;
      toCall: number;
    } = {
      fold: toCall > 0,
      check: toCall === 0,
      call: toCall > 0 ? toCall : 0,
      raise: null,
      toCall,
    };
    const others = this.inHand().filter((q) => q !== p && !q.allIn);
    if (p.stack > toCall && others.length > 0) {
      const cap = p.bet + p.stack;
      let minTo: number | undefined;
      let maxTo: number | undefined;
      if (this.v.limit === 'FL') {
        if (this.raises < 4) {
          const size = this.street < 2 ? this.bigUnit : this.bigUnit * 2;
          minTo = maxTo = Math.min(this.currentBet + size, cap);
        }
      } else {
        minTo = this.currentBet === 0 ? this.bigUnit : this.currentBet + this.lastRaise;
        maxTo = this.v.limit === 'PL' ? this.currentBet + this.potTotal() + toCall : cap;
        maxTo = Math.min(maxTo, cap);
        if (minTo > cap) minTo = cap;
        if (minTo > maxTo) minTo = maxTo;
      }
      if (maxTo !== undefined && minTo !== undefined && maxTo > this.currentBet) {
        L.raise = { minTo, maxTo, isBet: this.currentBet === 0 };
      }
    }
    return L;
  }

  act(i: number, type: string, amountTo?: number): TableTurnEvent {
    const L = this.legal(i);
    if (!L) return { type: 'error', msg: 'Not your turn' };
    const p = this.players[i]!;
    const fmt = (x: number) => this.fmt(x);
    if (type === 'fold' && !L.fold) type = 'check';
    if (type === 'check' && !L.check) type = L.fold ? 'fold' : 'call';
    if (type === 'raise' && !L.raise) type = L.check ? 'check' : 'call';

    if (type === 'fold') {
      p.folded = true;
      p.last = 'Fold';
      this.L(`${p.name}: folds`);
    } else if (type === 'check') {
      p.last = 'Check';
      this.L(`${p.name}: checks`);
    } else if (type === 'call') {
      const a = L.call;
      p.stack -= a;
      p.bet += a;
      p.total += a;
      if (p.stack === 0) p.allIn = true;
      p.last = p.allIn ? 'All-in' : 'Call';
      this.L(`${p.name}: calls ${fmt(a)}${p.allIn ? ' and is all-in' : ''}`);
    } else if (type === 'raise' && L.raise) {
      const to = Math.round(
        Math.max(L.raise.minTo, Math.min(L.raise.maxTo, amountTo || L.raise.minTo))
      );
      const add = to - p.bet;
      p.stack -= add;
      p.bet = to;
      p.total += add;
      if (p.stack === 0) p.allIn = true;
      const inc = to - this.currentBet;
      const wasBet = this.currentBet === 0;
      if (inc >= this.lastRaise) {
        this.lastRaise = inc;
        this.players.forEach((q) => {
          if (q && q !== p) q.acted = false;
        });
      }
      this.currentBet = to;
      this.raises++;
      p.last = p.allIn ? 'All-in' : wasBet ? 'Bet' : 'Raise';
      this.L(
        `${p.name}: ${wasBet ? 'bets ' + fmt(to) : 'raises to ' + fmt(to)}${
          p.allIn ? ' and is all-in' : ''
        }`
      );
    }
    p.acted = true;
    p.lastType = type;
    return this.checkRoundEnd(false, i);
  }

  checkRoundEnd(initial?: boolean, from?: number): TableTurnEvent {
    const live = this.inHand();
    if (live.length === 1) return this.finishUncontested(live[0]);
    const canAct = live.filter((p) => !p.allIn);
    let done = canAct.every((p) => p.acted && p.bet === this.currentBet);
    if (canAct.length === 0) done = true;
    if (
      canAct.length === 1 &&
      canAct[0].bet >= this.currentBet &&
      live.every((p) => p.allIn || p === canAct[0])
    ) {
      if (canAct[0].bet >= Math.max(...live.map((q) => q.bet))) done = true;
    }
    if (!done) {
      const start = initial ? this.toAct : from!;
      if (initial) {
        const p = this.players[this.toAct];
        if (p && !p.folded && !p.allIn && !(p.acted && p.bet === this.currentBet)) {
          return { type: 'turn', seat: this.toAct };
        }
      }
      this.toAct = this.next(
        start,
        (p) => !!(p.dealt && !p.folded && !p.allIn && !(p.acted && p.bet === this.currentBet))
      );
      return { type: 'turn', seat: this.toAct };
    }
    return this.endStreet();
  }

  endStreet(): TableTurnEvent {
    // return uncalled portion of the largest bet
    const bettors = this.players
      .filter((p): p is PlayerState => !!(p && p.dealt))
      .sort((a, b) => b.bet - a.bet);
    if (bettors.length > 1 && bettors[0].bet > bettors[1].bet) {
      const refund = bettors[0].bet - bettors[1].bet;
      bettors[0].stack += refund;
      bettors[0].bet -= refund;
      bettors[0].total -= refund;
      if (bettors[0].stack > 0) bettors[0].allIn = false;
      this.L(`Uncalled bet (${this.fmt(refund)}) returned to ${bettors[0].name}`);
    }
    this.players.forEach((p) => {
      if (p) {
        p.bet = 0;
        p.acted = false;
        if (!p.folded && p.dealt) p.last = '';
      }
    });
    this.currentBet = 0;
    this.lastRaise = this.bigUnit;
    this.raises = 0;
    const live = this.inHand();
    const canAct = live.filter((p) => !p.allIn);
    if (this.street === 3) return this.showdown();
    const runout = canAct.length <= 1;
    this.dealStreet();
    if (runout) {
      this.phase = 'runout';
      return { type: 'street', street: this.street, runout: true };
    }
    this.toAct = this.next(this.button, (p) => !!(p.dealt && !p.folded && !p.allIn));
    return { type: 'street', street: this.street, seat: this.toAct };
  }

  dealStreet() {
    this.dp++; // burn
    const n = this.street === 0 ? 3 : 1;
    for (let k = 0; k < n; k++) this.board.push(this.deck[this.dp++]);
    this.street++;
    const names = ['', 'FLOP', 'TURN', 'RIVER'];
    this.L(`*** ${names[this.street]} *** [${this.board.map(cardStr).join(' ')}]`);
  }

  continueRunout(): TableTurnEvent {
    if (this.street < 3) {
      this.dealStreet();
      return this.street === 3
        ? { type: 'street', street: 3, runout: true, last: true }
        : { type: 'street', street: this.street, runout: true };
    }
    return this.showdown();
  }

  rakeFor(pot: number): number {
    const c = this.cfg;
    if (c.mode !== 'cash' || !c.rakePct || (c.nfnd !== false && this.street === 0)) return 0;
    return Math.min(
      Math.floor((pot * c.rakePct) / 100),
      Math.round(c.rakeCapBB * this.bigUnit)
    );
  }

  finishUncontested(w: PlayerState): TableTurnEvent {
    this.players.forEach((p) => {
      if (p) p.bet = 0;
    });
    const pot = this.potTotal();
    const rake = this.rakeFor(pot);
    w.stack += pot - rake;
    w.won = pot - rake;
    this.L(
      `${w.name} collected ${this.fmt(pot - rake)} from pot${
        rake ? ' (rake ' + this.fmt(rake) + ')' : ''
      }`
    );
    this.results = {
      pot,
      rake,
      uncontested: true,
      winners: [{ seat: this.players.indexOf(w), amount: pot - rake, hand: null }],
      pots: [{ amount: pot - rake, winners: [this.players.indexOf(w)] }],
    };
    this.phase = 'done';
    this.summary();
    return { type: 'handEnd', results: this.results };
  }

  buildPots(): { amount: number; elig: number[] }[] {
    const dealt = this.players
      .map((p, i) => ({ p, i }))
      .filter((x): x is { p: PlayerState; i: number } => !!(x.p && x.p.dealt));
    const levels = [...new Set(dealt.map((x) => x.p.total).filter((t) => t > 0))].sort(
      (a, b) => a - b
    );
    const pots: { amount: number; elig: number[] }[] = [];
    let prev = 0;
    for (const lv of levels) {
      let amount = 0;
      for (const x of dealt) amount += Math.max(0, Math.min(x.p.total, lv) - prev);
      const elig = dealt.filter((x) => !x.p.folded && x.p.total >= lv).map((x) => x.i);
      if (amount > 0) {
        const last = pots[pots.length - 1];
        if (
          last &&
          (elig.length === 0 ||
            (last.elig.length === elig.length && last.elig.every((e, k) => e === elig[k])))
        ) {
          last.amount += amount;
        } else {
          pots.push({ amount, elig });
        }
      }
      prev = lv;
    }
    return pots.filter((p) => p.amount > 0);
  }

  showdown(): TableTurnEvent {
    this.phase = 'showdown';
    this.L('*** SHOWDOWN ***');
    const pots = this.buildPots();
    const total = pots.reduce((s, p) => s + p.amount, 0);
    const rake = this.rakeFor(total);
    let rakeLeft = rake;
    for (const p of pots) {
      const t = Math.min(rakeLeft, p.amount);
      p.amount -= t;
      rakeLeft -= t;
      if (!rakeLeft) break;
    }

    const hands: Record<number, HandEvalResult> = {};
    const lows: Record<number, LowEvalResult> = {};
    for (const p of this.inHand()) {
      const i = this.players.indexOf(p);
      hands[i] = bestHand(p.cards, this.board, this.v);
      if (this.v.hilo) {
        const lo = bestLow(p.cards, this.board);
        if (lo) lows[i] = lo;
      }
      this.L(
        `${p.name}: shows [${p.cards.map(cardStr).join(' ')}] (${hands[i].name}${
          lows[i] ? ', ' + lows[i].name : ''
        })`
      );
    }

    const order: number[] = [];
    let s = this.button;
    for (let k = 0; k < this.players.length; k++) {
      s = (s + 1) % this.players.length;
      order.push(s);
    }

    const award = (amt: number, seats: number[], label: string) => {
      const sorted = order.filter((o) => seats.includes(o));
      const share = Math.floor(amt / sorted.length);
      let odd = amt - share * sorted.length;
      for (const w of sorted) {
        const a = share + (odd-- > 0 ? 1 : 0);
        this.players[w]!.stack += a;
        this.players[w]!.won += a;
        this.L(`${this.players[w]!.name} collected ${this.fmt(a)} from ${label}`);
      }
    };

    const potResults: any[] = [];
    pots.forEach((pot, k) => {
      const label = k === 0 ? 'main pot' : `side pot-${k}`;
      const elig = pot.elig.length ? pot.elig : Object.keys(hands).map(Number);
      const hiBest = Math.max(...elig.map((e) => hands[e].score));
      const hiW = elig.filter((e) => hands[e].score === hiBest);
      if (this.v.hilo) {
        const lowElig = elig.filter((e) => lows[e]);
        if (lowElig.length) {
          const loBest = Math.min(...lowElig.map((e) => lows[e].score));
          const loW = lowElig.filter((e) => lows[e].score === loBest);
          const hiAmt = Math.ceil(pot.amount / 2);
          const loAmt = pot.amount - hiAmt;
          award(hiAmt, hiW, label + ' (high)');
          award(loAmt, loW, label + ' (low)');
          potResults.push({
            amount: pot.amount,
            winners: [...new Set(hiW.concat(loW))],
            hi: hiW,
            lo: loW,
          });
          return;
        }
      }
      award(pot.amount, hiW, label);
      potResults.push({ amount: pot.amount, winners: hiW, hi: hiW });
    });

    if (rake) this.L(`Rake: ${this.fmt(rake)}`);
    this.results = {
      pot: total,
      rake,
      hands,
      lows,
      pots: potResults,
      winners: potResults.flatMap((p) => p.winners),
    };
    this.phase = 'done';
    this.summary();
    return { type: 'handEnd', results: this.results };
  }

  summary() {
    this.L('*** SUMMARY ***');
    this.L(
      `Total pot ${this.fmt(this.results.pot)} | Rake ${this.fmt(this.results.rake || 0)}${
        this.board.length ? ' | Board [' + this.board.map(cardStr).join(' ') + ']' : ''
      }`
    );
    this.L(`Seed revealed: ${this.seed}`);
  }
}

/* ---------- Bot brain: Monte-Carlo equity + pot odds + personality ---------- */
export function estimateEquity(table: PokerTable, i: number, iters: number): number {
  const me = table.players[i];
  if (!me) return 0;
  const v = table.v;
  const opp = table.inHand().length - 1;
  const known = new Set(me.cards.concat(table.board).map(cardStr));
  const pool = buildDeck(v.shortDeck).filter((c) => !known.has(cardStr(c)));
  let win = 0;

  for (let it = 0; it < iters; it++) {
    const d = pool.slice();
    for (let k = d.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [d[k], d[j]] = [d[j], d[k]];
    }
    let di = 0;
    const board = table.board.concat(d.slice(0, 5 - table.board.length));
    di = 5 - table.board.length;
    const mine = bestHand(me.cards, board, v).score;
    let best = true;
    let tie = 0;
    for (let o = 0; o < opp; o++) {
      const oh = d.slice(di, di + v.hole);
      di += v.hole;
      const s = bestHand(oh, board, v).score;
      if (s > mine) {
        best = false;
        break;
      }
      if (s === mine) tie++;
    }
    if (best) win += tie ? 1 / (tie + 1) : 1;
  }
  return win / iters;
}

export function botDecide(table: PokerTable, i: number): { type: string; amount?: number } | null {
  const p = table.players[i];
  const L = table.legal(i);
  if (!p || !L) return null;
  const persona = p.persona || { aggr: 0.5, loose: 0.5 };
  const opp = Math.max(1, table.inHand().length - 1);
  const iters = table.v.eval === 'omaha' ? (table.v.hole === 5 ? 36 : 48) : 160;
  const eq = estimateEquity(table, i, iters);
  const rel = eq * (opp + 1);
  const pot = table.potTotal();
  const r = Math.random();
  const odds = L.toCall / (pot + L.toCall || 1);
  const sizeTo = (frac: number) => {
    if (!L.raise) return 0;
    const t = table.currentBet + frac * (pot + L.toCall);
    return Math.max(L.raise.minTo, Math.min(L.raise.maxTo, Math.round(t)));
  };

  if (L.check) {
    if (
      L.raise &&
      (rel > 1.55 - persona.aggr * 0.3 ||
        (rel > 1.1 && r < persona.aggr * 0.45) ||
        r < 0.06 + persona.aggr * 0.05)
    ) {
      return { type: 'raise', amount: sizeTo(0.45 + Math.random() * 0.4) };
    }
    return { type: 'check' };
  }
  if (L.raise && rel > 1.9 - persona.aggr * 0.4 && r < 0.35 + persona.aggr * 0.5) {
    return { type: 'raise', amount: sizeTo(0.6 + Math.random() * 0.5) };
  }
  if (
    eq + persona.loose * 0.08 > odds * 1.05 ||
    (table.street === 0 && rel > 0.95 - persona.loose * 0.25 && L.toCall <= table.bigUnit * 3)
  ) {
    return { type: 'call' };
  }
  if (L.raise && r < 0.03 * persona.aggr) {
    return { type: 'raise', amount: sizeTo(0.8) };
  }
  return { type: 'fold' };
}
