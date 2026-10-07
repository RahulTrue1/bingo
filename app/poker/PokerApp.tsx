"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlayerHeader } from "../components/player/PlayerHeader";
import "./poker.css";
import {
  CardModel,
  CashGameDef,
  HandRecordModel,
  LiveEventDef,
  MttDef,
  PokerSessionState,
  SngDef,
  TicketModel,
  TourneyRecordModel,
  TransactionModel,
  VariantCode,
} from "./poker-types";
import {
  bestHand,
  bestLow,
  botDecide,
  buildDeck,
  cardStr,
  newSeed,
  parseCard,
  PokerTable,
  RANKCH,
  seededRng,
  sha256,
  shuffle,
  VARIANTS,
} from "./poker-engine";

/* ---------- Catalogue & Defaults ---------- */
const CASH: CashGameDef[] = [
  { id: 'nlh-10', v: 'NLH', sb: 5, bb: 10, seats: 6, cat: 'cash' },
  { id: 'nlh-50', v: 'NLH', sb: 25, bb: 50, seats: 6, cat: 'cash' },
  { id: 'nlh-200', v: 'NLH', sb: 100, bb: 200, seats: 6, cat: 'cash' },
  { id: 'nlh-fr', v: 'NLH', sb: 50, bb: 100, seats: 9, cat: 'cash', tag: 'Full ring' },
  { id: 'plo-50', v: 'PLO4', sb: 25, bb: 50, seats: 6, cat: 'cash' },
  { id: 'plo-200', v: 'PLO4', sb: 100, bb: 200, seats: 6, cat: 'cash' },
  { id: 'plo5-100', v: 'PLO5', sb: 50, bb: 100, seats: 6, cat: 'cash' },
  { id: 'plo8-100', v: 'PLO8', sb: 50, bb: 100, seats: 6, cat: 'cash', tag: 'Split pot' },
  { id: 'sd-100', v: 'SD', ante: 100, buttonBlind: 100, seats: 6, cat: 'cash', tag: 'Ante' },
  { id: 'flh-100', v: 'FLH', sb: 50, bb: 100, seats: 6, cat: 'cash', tag: 'Limit' },
  { id: 'bz-nlh-50', v: 'NLH', sb: 25, bb: 50, seats: 6, cat: 'blitz' },
  { id: 'bz-nlh-200', v: 'NLH', sb: 100, bb: 200, seats: 6, cat: 'blitz' },
  { id: 'bz-plo-50', v: 'PLO4', sb: 25, bb: 50, seats: 6, cat: 'blitz' },
];

const LV_SNG = [[10, 20], [15, 30], [25, 50], [50, 100], [75, 150], [100, 200], [150, 300], [200, 400], [300, 600], [500, 1000], [800, 1600], [1200, 2400]];
const LV_HYPER = [[10, 20], [15, 30], [20, 40], [30, 60], [40, 80], [50, 100], [75, 150], [100, 200], [150, 300]];
const LV_MTT = [[25, 50, 0], [50, 100, 0], [75, 150, 15], [100, 200, 25], [150, 300, 40], [200, 400, 50], [300, 600, 75], [400, 800, 100], [500, 1000, 125], [700, 1400, 175], [1000, 2000, 250], [1500, 3000, 400], [2000, 4000, 500], [3000, 6000, 750]];

const SNGS: SngDef[] = [
  { id: 'sng6', name: '6-Max Turbo', v: 'NLH', seats: 6, field: 6, buy: 1000, fee: 100, stack: 1500, levels: LV_SNG, hpl: 5, pay: [0.65, 0.35] },
  { id: 'hu', name: 'Heads-Up Hyper', v: 'NLH', seats: 2, field: 2, buy: 2500, fee: 100, stack: 500, levels: LV_HYPER, hpl: 3, pay: [1] },
  { id: 'sngplo', name: 'PLO 6-Max Turbo', v: 'PLO4', seats: 6, field: 6, buy: 1000, fee: 100, stack: 1500, levels: LV_SNG, hpl: 5, pay: [0.65, 0.35] },
  { id: 'sngsd', name: 'Short Deck Sprint', v: 'SD', seats: 6, field: 6, buy: 500, fee: 50, stack: 1500, levels: LV_SNG, hpl: 5, pay: [0.65, 0.35] },
];

const SPINS: SngDef[] = [
  { id: 'spin1', name: 'Jackpot Spin', v: 'NLH', seats: 3, field: 3, buy: 100, fee: 7, stack: 500, levels: LV_HYPER, hpl: 3, pay: [1], spin: true },
  { id: 'spin5', name: 'Jackpot Spin', v: 'NLH', seats: 3, field: 3, buy: 500, fee: 35, stack: 500, levels: LV_HYPER, hpl: 3, pay: [1], spin: true },
  { id: 'spin25', name: 'Jackpot Spin', v: 'NLH', seats: 3, field: 3, buy: 2500, fee: 175, stack: 500, levels: LV_HYPER, hpl: 3, pay: [1], spin: true },
];

const MTTS: MttDef[] = [
  { id: 'mb', name: 'Daily Mystery Bounty', v: 'NLH', seats: 6, field: 180, buy: 2000, fee: 200, stack: 5000, levels: LV_MTT, hpl: 4, bounty: true, gtd: 300000, start: 3 },
  { id: 'sat', name: 'Road to the Live Main Event — Satellite', v: 'NLH', seats: 6, field: 140, buy: 5000, fee: 500, stack: 5000, levels: LV_MTT, hpl: 4, satellite: 350000, start: 12 },
  { id: 'plot', name: 'PLO Turbo', v: 'PLO4', seats: 6, field: 120, buy: 1000, fee: 100, stack: 5000, levels: LV_MTT, hpl: 3, start: 25 },
  { id: 'sds', name: 'Short Deck Sunday', v: 'SD', seats: 6, field: 90, buy: 2000, fee: 200, stack: 5000, levels: LV_MTT, hpl: 4, start: 41 },
  { id: 'free', name: 'Sunday Freeroll', v: 'NLH', seats: 6, field: 300, buy: 0, fee: 0, stack: 3000, levels: LV_MTT, hpl: 3, added: 50000, start: 58 },
];

const LIVE_EVENTS: LiveEventDef[] = [
  { name: 'Live Main Event — Las Vegas', when: 'Dec 2026', buy: '$10,400', sat: 'sat' },
  { name: 'Tour Stop — Cyprus', when: 'Oct 2026', buy: '$3,500', sat: 'sat' },
  { name: 'Prime Series — Seoul', when: 'Nov 2026', buy: '$1,500', sat: 'sat' },
];

const BOT_NAMES = [
  'RiverRat', 'NutsOrNothing', 'SnapCall_88', 'FoldEquity', 'TiltProof', 'ColdDeck',
  'BluffCatcher', 'GutshotGus', 'LaNina77', 'ValueTown', 'OverbetOlga', 'Kasparov_AK',
  'MuckMaster', 'SuitedConn', 'DonkBet', 'ThreeBetTina', 'HeroCallHank', 'PocketRockets',
  'SlowRollSam', 'BigSlick', 'IceVeins', 'Polarized', 'MinRaiseMo', 'DeepStackDee',
  'ChipLeaderCJ', 'Aussie_Ace', 'SaoPauloShark', 'SeoulSolver', 'LisbonLimp', 'VegasVince',
  'MaltaMav', 'NitNora', 'CheckRaiseCarl', 'FlopZilla', 'TurnCard_Tom', 'Rivered',
  'WheelDraw', 'QuadQueen', 'ShipIt', 'BoatBuilder',
];

const AV_COLORS = ['#3B6FB6', '#8E4DB0', '#B0543F', '#2E8B77', '#A1782F', '#4E5FC7', '#B03C6E', '#3D8F3F'];
const avColor = (n: string) => AV_COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];
const SUIT_GLYPH = ['♠', '♥', '♦', '♣'];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randi = (a: number, b: number) => Math.floor(rand(a, b + 1));
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const hashStable = (str: string) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

const payoutTable = (field: number, pct = 0.15) => {
  const n = Math.max(1, Math.ceil(field * pct));
  const w: number[] = [];
  for (let i = 0; i < n; i++) w.push(1 / Math.pow(i + 1, 1.05));
  const s = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / s);
};

const spinRTP = (t: number[][]) => {
  const tot = t.reduce((a, [, w]) => a + w, 0);
  const e = t.reduce((a, [m, w]) => a + m * w, 0) / (tot || 1);
  return { tot, e, rtp: (e / 3) * 100 };
};

const ROLES = ['Admin', 'Risk', 'Finance', 'Support'];
const US_STATES = ['AL', 'AZ', 'CA', 'CO', 'CT', 'FL', 'GA', 'ID', 'IL', 'IN', 'LA', 'MA', 'MI', 'MN', 'MT', 'NJ', 'NV', 'NY', 'OH', 'PA', 'TN', 'TX', 'VA', 'WA'];

export default function PokerApp() {
  // App Mount State
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Load / Save persistent State
  const [state, setState] = useState(() => {
    const DEFAULT_STATE = {
      wallet: { USD: 100000, GC: 2500000, SC: 50000 } as Record<string, number>,
      tickets: [] as TicketModel[],
      tx: [] as TransactionModel[],
      hands: [] as HandRecordModel[],
      tourneys: [] as TourneyRecordModel[],
      ops: {
        handsDealt: 0,
        byVariant: {} as Record<string, number>,
        rake: { USD: 0, GC: 0, SC: 0 } as Record<string, number>,
        fees: { USD: 0, GC: 0, SC: 0 } as Record<string, number>,
        tourneysRun: 0,
      },
      decisions: [] as number[],
      settings: {
        skin: 'tig',
        fourColor: true,
        brand: 'TIG Poker',
        mode: 'real',
        sweepsCur: 'SC',
        rakePct: 5,
        rakeCapBB: 3,
        timeBank: 20,
        speed: 1,
        nextDelay: 2200,
      },
      bo: {
        section: 'overview',
        role: 'Admin',
        audit: [] as any[],
        adjustments: [] as any[],
        redemptions: [] as any[],
        clubs: [] as any[],
        alerts: {} as Record<string, string>,
        broadcast: '',
        geoState: 'NY',
        blockedStates: ['CT', 'LA', 'MI', 'MT', 'NJ', 'TN', 'WA'],
        frozen: false,
        withdrawHold: false,
        limits: { maxBuyInBB: 100, maxTables: 4, lossLimit: 0 },
        nfnd: true,
        rakeback: 20,
        rakebackPaid: 0,
        toggles: { straddle: false, rit: true, rabbit: false, anon: false, autoOpen: true, waitlist: true, disconnect: true, chat: true },
        spin: [[2, 8203], [3, 1100], [5, 500], [10, 162], [100, 33], [1000, 2]],
        mtt: {} as Record<string, any>,
        rakeByVariant: {} as Record<string, Record<string, number>>,
        bans: [] as string[],
        apart: [['RiverRat', 'ColdDeck']],
        vip: 'Silver',
        note: '',
        lobbyOrder: 'stakes',
        lang: 'en',
        jackpot: { badBeat: 250000, highHand: 50000 },
      },
    };
    return DEFAULT_STATE;
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tig_poker_demo_v1');
      if (raw) {
        const loaded = JSON.parse(raw);
        setState((prev) => ({
          ...prev,
          ...loaded,
          settings: { ...prev.settings, ...(loaded.settings || {}) },
          ops: { ...prev.ops, ...(loaded.ops || {}) },
          bo: { ...prev.bo, ...(loaded.bo || {}) },
        }));
      }
    } catch (_) {}
    setMounted(true);
  }, []);

  const saveState = useCallback((updater: (prev: typeof state) => typeof state) => {
    setState((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem('tig_poker_demo_v1', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  // View state
  const [activeView, setActiveView] = useState<'lobby' | 'history' | 'wallet' | 'live' | 'ops' | 'settings'>('lobby');

  // Synchronize with URL search params (?view=history, ?view=live, ?view=wallet, etc.)
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!searchParams) return;
    const v = searchParams.get('view');
    if (v && ['lobby', 'history', 'wallet', 'live', 'ops', 'settings'].includes(v)) {
      setActiveView(v as any);
    }
  }, [searchParams]);

  const [lobbyCat, setLobbyCat] = useState<'cash' | 'blitz' | 'sng' | 'spin' | 'mtt' | 'club'>('cash');
  const [historyTab, setHistoryTab] = useState<'hands' | 'tourneys'>('hands');
  const [historyFormat, setHistoryFormat] = useState('all');
  const [historyVariant, setHistoryVariant] = useState('all');
  const [historyResult, setHistoryResult] = useState('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string, ms = 2600) => {
    setToastMessage(msg);
    if (toastTimer) clearTimeout(toastTimer);
    const h = setTimeout(() => setToastMessage(null), ms);
    setToastTimer(h);
  }, [toastTimer]);

  // Modal State
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null);
  const [modalWide, setModalWide] = useState(false);
  const [modalLocked, setModalLocked] = useState(false);

  const closeModal = useCallback(() => {
    if (!modalLocked) setModalContent(null);
  }, [modalLocked]);

  // Active game session
  const [gameSession, setGameSession] = useState<PokerSessionState | null>(null);
  const sessionRef = useRef<PokerSessionState | null>(null);
  sessionRef.current = gameSession;

  // Render Table refresher key
  const [tableTick, setTableTick] = useState(0);
  const refreshTable = useCallback(() => setTableTick((k) => k + 1), []);

  // Side pane on table screen
  const [sidePane, setSidePane] = useState<'log' | 'info'>('log');

  // Currency helpers
  const cur = useCallback(
    () => (state.settings.mode === 'real' ? 'USD' : state.settings.sweepsCur),
    [state.settings.mode, state.settings.sweepsCur]
  );
  const unitOf = (c: string) => (c === 'GC' ? 1 : 100);

  const money = useCallback((v: number, c = cur()) => {
    if (c === 'USD') {
      return (
        (v < 0 ? '-' : '') +
        '$' +
        (Math.abs(v) / 100).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    }
    if (c === 'SC') {
      return (
        (v / 100).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + ' SC'
      );
    }
    return Math.round(v).toLocaleString('en-US') + ' GC';
  }, [cur]);

  const toCur = useCallback((cents: number, c = cur()) => (c === 'GC' ? cents * 10 : cents), [cur]);

  const addTx = useCallback(
    (type: string, amount: number, c: string, note?: string) => {
      saveState((prev) => {
        const nextTx = [
          { ts: Date.now(), type, amount, cur: c, note, bal: prev.wallet[c] || 0 },
          ...prev.tx,
        ].slice(0, 400);
        return { ...prev, tx: nextTx };
      });
    },
    [saveState]
  );

  const debit = useCallback(
    (amount: number, c: string, type: string, note?: string) => {
      const currentBal = stateRef.current.wallet[c] || 0;
      if (currentBal < amount) {
        showToast(`Not enough ${c === 'USD' ? 'funds' : c} for this buy-in`);
        return false;
      }
      saveState((prev) => {
        const nextWallet = { ...prev.wallet, [c]: (prev.wallet[c] || 0) - amount };
        const nextTx = [
          { ts: Date.now(), type, amount: -amount, cur: c, note, bal: nextWallet[c] },
          ...prev.tx,
        ].slice(0, 400);
        return { ...prev, wallet: nextWallet, tx: nextTx };
      });
      return true;
    },
    [saveState, showToast]
  );

  const credit = useCallback(
    (amount: number, c: string, type: string, note?: string) => {
      saveState((prev) => {
        const nextWallet = { ...prev.wallet, [c]: (prev.wallet[c] || 0) + amount };
        const nextTx = [
          { ts: Date.now(), type, amount, cur: c, note, bal: nextWallet[c] },
          ...prev.tx,
        ].slice(0, 400);
        return { ...prev, wallet: nextWallet, tx: nextTx };
      });
    },
    [saveState]
  );

  const audit = useCallback(
    (action: string, detail?: string) => {
      saveState((prev) => ({
        ...prev,
        bo: {
          ...prev.bo,
          audit: [
            { ts: Date.now(), role: prev.bo.role, action, detail },
            ...prev.bo.audit,
          ].slice(0, 300),
        },
      }));
    },
    [saveState]
  );

  const canPlay = useCallback(() => {
    if (stateRef.current.bo.frozen) {
      showToast('This account is frozen by the operator (Back office → Players)');
      return false;
    }
    if (
      stateRef.current.settings.mode === 'sweeps' &&
      stateRef.current.bo.blockedStates.includes(stateRef.current.bo.geoState)
    ) {
      showToast(`Sweepstakes play is not available in ${stateRef.current.bo.geoState} (Back office → Brand & market)`);
      return false;
    }
    return true;
  }, [showToast]);

  const stakesLabel = useCallback((d: CashGameDef, c = cur()) => {
    const f = (x?: number) => money(toCur(x || 0, c), c).replace(' SC', '').replace(' GC', '');
    const suffix = c === 'USD' ? '' : ' ' + c;
    if (d.v === 'SD') return `${f(d.ante)} ante${suffix}`;
    if (d.v === 'FLH') return `${f(d.bb)}/${f((d.bb || 0) * 2)} limit${suffix}`;
    return `${f(d.sb)}/${f(d.bb)}${suffix}`;
  }, [cur, money, toCur]);

  /* ---------- Card Render Helper ---------- */
  const renderCard = (c: CardModel | null, extra = '') => {
    if (!c) return <div className={`card back ${extra}`} />;
    return (
      <div className={`card s${c.s} ${extra}`} aria-label={cardStr(c)}>
        <span className="r">{RANKCH[c.r - 2] === 'T' ? '10' : RANKCH[c.r - 2]}</span>
        <span className="s">{SUIT_GLYPH[c.s]}</span>
      </div>
    );
  };

  /* ---------- Table Engine Handlers & Gameplay ---------- */
  const clearSessionTimers = useCallback(() => {
    const G = sessionRef.current;
    if (!G) return;
    G.timers.forEach((h) => clearTimeout(h));
    G.timers = [];
    if (G.clock) clearInterval(G.clock);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const G = sessionRef.current;
    if (!G) return null;
    const speed = stateRef.current.settings.speed || 1;
    const h = setTimeout(fn, ms / speed);
    G.timers.push(h);
    return h;
  }, []);

  const closeTable = useCallback(() => {
    clearSessionTimers();
    setGameSession(null);
    document.body.style.overflow = '';
  }, [clearSessionTimers]);

  const recordHand = useCallback((abandoned?: boolean) => {
    const G = sessionRef.current;
    if (!G || G.recorded) return;
    const tb = G.table as PokerTable;
    const hero = tb.players[G.hero];
    if (!hero || !hero.dealt) return;
    G.recorded = true;
    const res = tb.results;
    const net = hero.stack - (hero.startStack || 0);
    let result = hero.folded
      ? 'Folded'
      : res && res.winners.some((w: any) => (typeof w === 'number' ? w : w.seat) === G.hero)
      ? 'Won'
      : 'Lost';
    if (res && hero.won > 0 && net <= 0 && !hero.folded) result = 'Split';

    const rec: HandRecordModel = {
      id: tb.handId || '',
      ts: Date.now(),
      kind: G.kind,
      game: tb.v.name,
      v: tb.v.code,
      stakes: G.T ? `${G.T.name} · L${G.T.level + 1}` : stakesLabel(G.def, G.cur),
      cur: G.T ? 'CHIPS' : G.cur,
      unit: tb.cfg.unit,
      hole: hero.cards.map(cardStr),
      board: tb.board.map(cardStr),
      pot: res ? res.pot : tb.potTotal(),
      rake: res ? res.rake : 0,
      net: abandoned && !hero.folded ? -hero.total : net,
      result: abandoned && !hero.folded ? 'Left' : result,
      hand: res && res.hands && res.hands[G.hero] ? res.hands[G.hero].name || '' : '',
      log: tb.log.slice(),
      seed: tb.seed,
      hash: tb.seedHash,
      deck: tb.deckOrder.slice(0, 20),
      variantShort: !!tb.v.shortDeck,
      heroRake: res && res.rake && res.pot ? Math.round((res.rake * hero.total) / res.pot) : 0,
    };
    if (abandoned && G.kind === 'blitz') {
      rec.log.push('*** Fast-fold: hand continued without you ***', `Seed revealed: ${tb.seed}`);
    }

    saveState((prev) => ({
      ...prev,
      hands: [rec, ...prev.hands].slice(0, 400),
    }));
  }, [saveState, stakesLabel]);

  const finishTourney = useCallback(
    (place: number, quit?: boolean) => {
      const G = sessionRef.current;
      if (!G || !G.T) return;
      const T = G.T;
      T.done = true;
      clearSessionTimers();
      const c = T.cur;
      let prize = 0;
      let ticket: TicketModel | null = null;

      if (T.kind === 'mtt') {
        if (T.satellite) {
          if (place <= (T.seatsWon || 0)) {
            ticket = {
              name: 'Live Main Event package',
              value: toCur(T.satellite, c),
              cur: c,
              from: T.name || 'Satellite',
              ts: Date.now(),
              code: 'LIVE-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
            };
          } else if (place === (T.seatsWon || 0) + 1) {
            prize = T.leftover || 0;
          }
        } else if (T.pays && T.pays[place - 1]) {
          prize = Math.round(T.prize * T.pays[place - 1]);
        }
      } else {
        prize = T.pay && T.pay[place - 1] ? Math.round(T.prize * T.pay[place - 1]) : 0;
      }

      if (prize) credit(prize, c, 'Tournament prize', `${T.name}: finished #${place}`);
      if (ticket) {
        saveState((prev) => ({
          ...prev,
          tickets: [ticket!, ...prev.tickets],
        }));
        addTx('Live event ticket', 0, c, `${ticket.name} (${money(ticket.value, c)}) — ${ticket.code}`);
      }

      const rec: TourneyRecordModel = {
        ts: Date.now(),
        name: T.name || 'Tournament',
        game: VARIANTS[T.v || 'NLH'].name,
        kind: T.kind,
        buy: toCur((T.buy || 0) + (T.fee || 0), c),
        cur: c,
        place,
        field: T.field || 6,
        prize,
        bounties: T.bounties || 0,
        ticket: ticket ? ticket.code : null,
        mult: T.mult || null,
        quit: !!quit,
      };

      saveState((prev) => ({
        ...prev,
        tourneys: [rec, ...prev.tourneys],
      }));

      const suffix = (place % 100 > 10 && place % 100 < 14) ? 'th' : ['th', 'st', 'nd', 'rd'][place % 10] || 'th';
      const label = place === 1 ? 'You won the tournament!' : `You finished ${place}${suffix} of ${T.field}`;

      setModalLocked(true);
      setModalContent(
        <div>
          <h2>{label}</h2>
          <p className="muted">
            {T.name} · {VARIANTS[T.v || 'NLH'].name}
            {T.mult ? ` · ${T.mult}× multiplier` : ''}
          </p>
          {prize ? (
            <p style={{ fontSize: 22, fontWeight: 750 }}>
              Prize: <span className="pos">{money(prize, c)}</span>
            </p>
          ) : null}
          {T.bounties ? (
            <p>
              Mystery bounties collected: <b className="pos">{money(T.bounties, c)}</b>
            </p>
          ) : null}
          {ticket ? (
            <div className="ticket">
              <div>
                <b>{ticket.name}</b>
                <div className="muted">
                  Value {money(ticket.value, c)} · code {ticket.code}
                </div>
              </div>
              <span className="tag gold">Added to wallet</span>
            </div>
          ) : null}
          {!prize && !ticket ? (
            <p className="muted">No prize this time. Results are saved in Betting history.</p>
          ) : null}
          <div className="foot">
            <button
              className="btn primary"
              onClick={() => {
                setModalLocked(false);
                closeModal();
                closeTable();
              }}
            >
              Back to lobby
            </button>
          </div>
        </div>
      );
    },
    [addTx, clearSessionTimers, closeTable, closeModal, credit, money, saveState, toCur]
  );

  const tStake = (T: any) => {
    const lv = T.levels[Math.min(T.level, T.levels.length - 1)];
    const mul = T.level >= T.levels.length ? Math.pow(1.5, T.level - T.levels.length + 1) : 1;
    return lv.map((x: number) => Math.round((x * mul) / 5) * 5 || x);
  };

  const applyLevel = (G: PokerSessionState) => {
    const T = G.T;
    if (!T) return;
    const [sb, bb, ante = 0] = tStake(T);
    const c = G.table.cfg;
    if (G.table.v.shortDeck) {
      c.sb = 0;
      c.bb = 0;
      c.ante = Math.max(5, Math.round(bb / 2));
      c.buttonBlind = bb;
    } else {
      c.sb = sb;
      c.bb = bb;
      c.ante = ante;
    }
  };

  const nextHand = useCallback(() => {
    const G = sessionRef.current;
    if (!G) return;
    clearSessionTimers();
    const tb = G.table as PokerTable;
    const T = G.T;

    if (G.pendingAdd) {
      const a = G.pendingAdd;
      G.pendingAdd = 0;
      if (debit(a, G.cur, 'Add chips', VARIANTS[G.def.v as VariantCode].name)) {
        tb.players[G.hero]!.stack += a;
        G.buyInTotal += a;
      }
    }

    if (T) {
      applyLevel(G);
    } else {
      const bu = tb.bigUnit;
      tb.players.forEach((p, i) => {
        if (p && p.bot && (p.stack < bu * 15 || Math.random() < 0.04)) {
          tb.players[i] = null;
          tb.seat(i, makeBot(Math.round(bu * rand(60, 160)), G));
        }
      });
      for (let i = 1; i < tb.players.length; i++) {
        if (!tb.players[i] && Math.random() < 0.5) {
          tb.seat(i, makeBot(Math.round(bu * rand(60, 140)), G));
        }
      }
      if (tb.players.filter((p) => p && p.stack > 0).length < 2) {
        tb.seat(
          tb.players.findIndex((p, i) => i > 0 && (!p || p.stack === 0)),
          makeBot(bu * 100, G)
        );
      }
      const hero = tb.players[G.hero];
      if (hero && hero.stack <= 0) {
        askRebuy();
        return;
      }
    }

    if (G.kind === 'blitz' && G.newTable) {
      G.newTable = false;
      const bu = tb.bigUnit;
      for (let i = 1; i < tb.players.length; i++) {
        tb.players[i] = null;
        tb.seat(i, makeBot(Math.round(bu * rand(60, 160)), G));
      }
      tb.button = randi(0, tb.players.length - 1);
    }

    const id = 'TIG' + Date.now().toString(36).toUpperCase().slice(-6) + randi(10, 99);
    const r = tb.startHand(newSeed(), id);
    if (!r) {
      showToast('Waiting for players…');
      later(nextHand, 1500);
      return;
    }

    G.handsHere = (G.handsHere || 0) + 1;
    saveState((prev) => ({
      ...prev,
      ops: {
        ...prev.ops,
        handsDealt: prev.ops.handsDealt + 1,
        byVariant: {
          ...prev.ops.byVariant,
          [tb.v.code]: (prev.ops.byVariant[tb.v.code] || 0) + 1,
        },
      },
    }));

    G.prevBoard = 0;
    G.recorded = false;
    if (stateRef.current.bo.broadcast) {
      showToast('📣 ' + stateRef.current.bo.broadcast, 4000);
      saveState((prev) => ({ ...prev, bo: { ...prev.bo, broadcast: '' } }));
    }

    refreshTable();
    handleTurn(r);
  }, [clearSessionTimers, debit, later, refreshTable, saveState, showToast]);

  const askRebuy = useCallback(() => {
    const G = sessionRef.current;
    if (!G) return;
    const c = G.cur;
    setModalLocked(true);
    setModalContent(
      <div>
        <h2>You&apos;re out of chips</h2>
        <p className="muted">Buy back in to keep playing at this table, or return to the lobby.</p>
        <div className="foot">
          <button
            className="btn ghost"
            onClick={() => {
              setModalLocked(false);
              closeModal();
              closeTable();
            }}
          >
            Back to lobby
          </button>
          <button
            className="btn primary"
            onClick={() => {
              setModalLocked(false);
              closeModal();
              const bu = (G.table as PokerTable).bigUnit;
              const amt = Math.min(bu * 100, stateRef.current.wallet[c] || 0);
              if (amt < bu * 40) {
                showToast('Not enough balance to rebuy');
                closeTable();
                return;
              }
              if (debit(amt, c, 'Table buy-in', VARIANTS[G.def.v as VariantCode].name)) {
                (G.table as PokerTable).players[G.hero]!.stack = amt;
                G.buyInTotal += amt;
                nextHand();
              }
            }}
          >
            Buy in again
          </button>
        </div>
      </div>
    );
  }, [closeModal, closeTable, debit, nextHand, showToast]);

  const blitzFold = useCallback(() => {
    const G = sessionRef.current;
    if (!G) return;
    clearSessionTimers();
    recordHand(true);
    G.newTable = true;
    showToast('Fast-fold: moving to a new table', 1200);
    (G.table as PokerTable).phase = 'done';
    refreshTable();
    later(nextHand, 450);
  }, [clearSessionTimers, later, nextHand, recordHand, refreshTable, showToast]);

  const heroAct = useCallback(
    (type: string, amount?: number) => {
      const G = sessionRef.current;
      if (!G) return;
      if (G.clock) clearInterval(G.clock);
      const tb = G.table as PokerTable;
      if (tb.toAct !== G.hero) return;

      if (G.turnStart) {
        const delta = Date.now() - G.turnStart;
        saveState((prev) => ({
          ...prev,
          decisions: [...prev.decisions, delta].slice(-300),
        }));
        G.turnStart = 0;
      }

      const r = tb.act(G.hero, type, amount);
      if (G.kind === 'blitz' && type === 'fold') {
        blitzFold();
        return;
      }
      handleTurn(r);
    },
    [blitzFold, saveState]
  );

  const heroTurn = useCallback(() => {
    const G = sessionRef.current;
    if (!G) return;
    const tb = G.table as PokerTable;
    const L = tb.legal(G.hero);
    if (!L) return;

    if (G.pre?.checkFold) {
      G.pre.checkFold = false;
      heroAct(L.check ? 'check' : 'fold');
      return;
    }
    if (G.pre?.callAny) {
      G.pre.callAny = false;
      heroAct(L.check ? 'check' : 'call');
      return;
    }

    G.turnStart = Date.now();
    const limit = (G.def.clock || stateRef.current.settings.timeBank) * 1000;
    refreshTable();

    if (G.clock) clearInterval(G.clock);
    G.clock = setInterval(() => {
      const left = Math.max(0, limit - (Date.now() - (G.turnStart || 0)));
      const bar = document.querySelector('.tablescreen .seat.hero .timer') as HTMLElement;
      if (bar) bar.style.width = (left / limit) * 100 + '%';
      if (left <= 0) {
        clearInterval(G.clock);
        showToast('Time bank expired');
        heroAct(L.check ? 'check' : 'fold');
      }
    }, 250);
  }, [heroAct, refreshTable, showToast]);

  const tourneyAfterHand = useCallback(
    (r: any) => {
      const G = sessionRef.current;
      if (!G || !G.T) return;
      const tb = G.table as PokerTable;
      const T = G.T;
      const hero = tb.players[G.hero]!;

      T.handsInLevel++;
      if (T.handsInLevel >= (T.hpl || 5)) {
        T.level++;
        T.handsInLevel = 0;
        showToast(`Blinds up: level ${T.level + 1}`, 1500);
      }

      const busted = tb.players
        .map((p, i) => ({ p, i }))
        .filter((x) => x.p && x.p.stack === 0 && x.p.dealt);

      // Mystery bounty knockouts
      for (const b of busted) {
        if (b.p && b.p.bot && T.bounty && hero.won > 0 && T.env && T.env.length) {
          const draw = T.env.splice(Math.floor(Math.random() * T.env.length), 1)[0] || 0;
          if (draw) {
            T.bounties = (T.bounties || 0) + draw;
            credit(draw, T.cur, 'Mystery bounty', `${T.name}: knocked out ${b.p.name}`);
            later(
              () => showToast(`Mystery bounty opened: ${money(draw, T.cur)} for eliminating ${b.p!.name}`, 3200),
              600
            );
          }
        }
      }

      const heroOut = hero.stack === 0;

      if (T.kind === 'mtt') {
        const others = busted.filter((b) => b.p && b.p.bot).length;
        let elsewhere = 0;
        const atTable = tb.players.filter((p) => p && p.stack > 0).length;
        if (T.remaining - others - (heroOut ? 1 : 0) > atTable) {
          elsewhere = Math.min(
            T.remaining - others - (heroOut ? 1 : 0) - atTable,
            randi(1, Math.max(2, Math.ceil(T.remaining * 0.07)))
          );
        }
        const place = T.remaining - others;
        T.remaining -= others + elsewhere;

        if (heroOut) {
          T.remaining -= 1;
          later(() => finishTourney(place), 1400);
          return;
        }

        busted.forEach((b) => {
          if (b.p && b.p.bot) {
            if (T.remaining > tb.players.filter((p) => p && p.stack > 0).length) {
              const avg = Math.round(((T.stack || 5000) * (T.field || 100)) / T.remaining);
              tb.players[b.i] = null;
              tb.seat(b.i, makeBot(Math.round(avg * rand(0.4, 1.6)), G));
            } else {
              tb.players[b.i]!.sittingOut = true;
            }
          }
        });

        if (
          T.remaining <= 1 ||
          (tb.players.filter((p) => p && p.stack > 0 && !p.sittingOut).length === 1 &&
            T.remaining <= (T.seats || 6))
        ) {
          T.remaining = 1;
          later(() => finishTourney(1), 1400);
          return;
        }
      } else {
        busted.forEach((b) => {
          if (b.p && b.p.bot) b.p.sittingOut = true;
        });
        const alive = tb.players.filter((p) => p && p.stack > 0).length;
        if (heroOut) {
          later(() => finishTourney(alive + 1), 1400);
          return;
        }
        if (alive === 1) {
          later(() => finishTourney(1), 1400);
          return;
        }
        T.remaining = alive;
      }

      refreshTable();
      later(nextHand, stateRef.current.settings.nextDelay);
    },
    [credit, finishTourney, later, money, nextHand, refreshTable, showToast]
  );

  const onHandEnd = useCallback(
    (r: any) => {
      const G = sessionRef.current;
      if (!G) return;
      const tb = G.table as PokerTable;
      const T = G.T;
      const hero = tb.players[G.hero]!;

      if (!T && r.results.rake) {
        saveState((prev) => {
          const curRake = prev.ops.rake[G.cur] || 0;
          const rv = prev.bo.rakeByVariant[tb.v.code] || {};
          return {
            ...prev,
            ops: {
              ...prev.ops,
              rake: { ...prev.ops.rake, [G.cur]: curRake + r.results.rake },
            },
            bo: {
              ...prev.bo,
              rakeByVariant: {
                ...prev.bo.rakeByVariant,
                [tb.v.code]: { ...rv, [G.cur]: (rv[G.cur] || 0) + r.results.rake },
              },
            },
          };
        });
      }

      recordHand(false);
      refreshTable();

      const heroWon = hero.won > 0;
      if (heroWon && hero.dealt) {
        showToast(
          `You win ${
            tb.cfg.unit === 100 ? money(hero.won, G.cur) : hero.won.toLocaleString() + ' chips'
          }${r.results.hands && r.results.hands[G.hero] ? ' — ' + r.results.hands[G.hero].name : ''}`,
          2000
        );
      }

      if (T) {
        tourneyAfterHand(r);
        return;
      }

      later(nextHand, stateRef.current.settings.nextDelay);
    },
    [later, money, nextHand, recordHand, refreshTable, saveState, showToast, tourneyAfterHand]
  );

  const handleTurn = useCallback(
    (r: any) => {
      const G = sessionRef.current;
      if (!G || !r) return;
      const tb = G.table as PokerTable;

      if (r.type === 'turn') {
        refreshTable();
        if (r.seat === G.hero) {
          heroTurn();
        } else {
          later(() => {
            if (!sessionRef.current || sessionRef.current.table !== tb) return;
            const d = botDecide(tb, tb.toAct);
            if (d) handleTurn(tb.act(tb.toAct, d.type, d.amount));
          }, rand(550, 1150));
        }
      } else if (r.type === 'street') {
        refreshTable();
        if (r.runout) {
          later(() => sessionRef.current && handleTurn(tb.continueRunout()), 1000);
        } else {
          later(() => sessionRef.current && handleTurn({ type: 'turn', seat: tb.toAct }), 380);
        }
      } else if (r.type === 'handEnd') {
        onHandEnd(r);
      }
    },
    [heroTurn, later, onHandEnd, refreshTable]
  );

  function makeBot(stack: number, session = sessionRef.current) {
    const used = session ? (session.table as PokerTable).players.filter(Boolean).map((p) => p!.name) : [];
    let n = pick(BOT_NAMES);
    while (used.includes(n)) {
      n = pick(BOT_NAMES);
    }
    return {
      name: n,
      stack,
      persona: { aggr: rand(0.15, 0.85), loose: rand(0.1, 0.8) },
      bot: true,
      cards: [],
      bet: 0,
      total: 0,
      won: 0,
    };
  }

  /* ---------- Launchers ---------- */
  const openCash = useCallback(
    (d: CashGameDef, amt: number) => {
      const c = cur();
      if (!debit(amt, c, 'Table buy-in', `${VARIANTS[d.v].name} ${stakesLabel(d, c)}`)) return;

      const f = (x?: number) => toCur(x || 0, c);
      const table = new PokerTable({
        variant: d.v,
        seats: d.seats,
        sb: f(d.sb),
        bb: f(d.bb),
        ante: f(d.ante),
        buttonBlind: f(d.buttonBlind),
        mode: 'cash',
        unit: unitOf(c),
        rakePct: d.rake !== undefined ? d.rake : stateRef.current.settings.rakePct,
        rakeCapBB: d.rake === 3 ? 2 : stateRef.current.settings.rakeCapBB,
        nfnd: stateRef.current.bo.nfnd,
      });

      const G: PokerSessionState = {
        kind: d.cat === 'blitz' ? 'blitz' : 'cash',
        def: d,
        cur: c,
        table,
        hero: 0,
        timers: [],
        buyInTotal: amt,
        handsHere: 0,
        pre: { checkFold: false, callAny: false },
      };

      table.seat(0, { name: 'You', stack: amt, hero: true });
      const bu = table.bigUnit;
      const nb = d.cat === 'club' ? d.seats - 1 : Math.max(1, d.seats - randi(0, 1) - 1);
      for (let i = 1; i <= nb; i++) {
        table.seat(i, makeBot(Math.round(bu * rand(55, 160)), G));
      }

      setGameSession(G);
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        nextHand();
      }, 50);
    },
    [cur, debit, nextHand, stakesLabel, toCur]
  );

  const askBuyIn = useCallback(
    (d: CashGameDef) => {
      if (!canPlay()) return;
      if (stateRef.current.bo.bans.includes(d.v)) {
        showToast(`You are restricted from ${VARIANTS[d.v].name} tables`);
        return;
      }
      const c = cur();
      const bu = toCur(d.bb || (d.ante || 0) * 2, c);
      const min = bu * 40;
      const max = bu * Math.max(40, stateRef.current.bo.limits.maxBuyInBB);
      const bal = stateRef.current.wallet[c] || 0;
      if (bal < min) {
        showToast(`Minimum buy-in is ${money(min, c)}. Top up in Wallet.`);
        return;
      }
      const def = Math.min(max, bal);

      const BuyInModal = () => {
        const [val, setVal] = useState(def);
        return (
          <div>
            <h2>
              {d.club ? d.club + ' · ' : ''}
              {VARIANTS[d.v].name}
            </h2>
            <p className="muted">
              {stakesLabel(d, c)} · {d.seats}-max
              {d.cat === 'blitz' ? ' · fast-fold' : ''}
            </p>
            <label className="field" style={{ marginTop: 14 }}>
              Buy-in amount:{' '}
              <b className="money" style={{ color: 'var(--text)', fontSize: 18 }}>
                {money(val, c)}
              </b>
              <input
                type="range"
                min={min}
                max={Math.min(max, bal)}
                step={bu}
                value={val}
                onChange={(e) => setVal(+e.target.value)}
              />
            </label>
            <p className="muted" style={{ fontSize: 13 }}>
              Range {money(min, c)} – {money(max, c)} (40–
              {Math.max(40, stateRef.current.bo.limits.maxBuyInBB)} big blinds). Balance{' '}
              {money(bal, c)}.
            </p>
            <div className="foot">
              <button className="btn ghost" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  closeModal();
                  openCash(d, val);
                }}
              >
                Sit down
              </button>
            </div>
          </div>
        );
      };

      setModalContent(<BuyInModal />);
    },
    [canPlay, closeModal, cur, money, openCash, showToast, stakesLabel, toCur]
  );

  const startSNG = useCallback(
    (d: SngDef) => {
      if (!canPlay()) return;
      if (stateRef.current.bo.bans.includes(d.v)) {
        showToast(`You are restricted from ${VARIANTS[d.v].name}`);
        return;
      }
      const c = cur();
      const buyTotal = toCur(d.buy + d.fee, c);
      if (!debit(buyTotal, c, 'Tournament buy-in', `${d.name} (${VARIANTS[d.v].name})`)) return;

      saveState((prev) => ({
        ...prev,
        ops: {
          ...prev.ops,
          fees: { ...prev.ops.fees, [c]: (prev.ops.fees[c] || 0) + toCur(d.fee, c) },
          tourneysRun: prev.ops.tourneysRun + 1,
        },
      }));

      const T: any = {
        ...d,
        kind: d.spin ? 'spin' : 'sng',
        cur: c,
        level: 0,
        handsInLevel: 0,
        remaining: d.field,
        prize: toCur(d.buy * d.field, c),
        startedAt: Date.now(),
        bounties: 0,
      };

      const launch = (resolvedT = T) => {
        const table = new PokerTable({ variant: d.v, seats: d.seats, mode: 'tourney', unit: 1 });
        const G: PokerSessionState = {
          kind: resolvedT.kind,
          def: d,
          cur: c,
          table,
          hero: 0,
          timers: [],
          buyInTotal: buyTotal,
          handsHere: 0,
          T: resolvedT,
          pre: { checkFold: false, callAny: false },
        };
        table.seat(0, { name: 'You', stack: d.stack, hero: true });
        for (let i = 1; i < d.seats; i++) table.seat(i, makeBot(d.stack, G));
        setGameSession(G);
        document.body.style.overflow = 'hidden';
        setTimeout(() => nextHand(), 50);
      };

      if (d.spin) {
        const tableOdds = stateRef.current.bo.spin;
        let r = Math.random() * 10000;
        let mult = 2;
        for (const [m, w] of tableOdds) {
          if ((r -= w) < 0) {
            mult = m;
            break;
          }
        }
        T.mult = mult;
        T.prize = toCur(T.buy * mult, c);

        const SpinModal = () => {
          const [displayMult, setDisplayMult] = useState('2×');
          const [done, setDone] = useState(false);
          useEffect(() => {
            const opts = [2, 3, 5, 10, 100, 1000];
            let k = 0;
            const iv = setInterval(() => {
              setDisplayMult(opts[k++ % opts.length] + '×');
            }, 70);
            const tm = setTimeout(() => {
              clearInterval(iv);
              setDisplayMult(mult + '×');
              setDone(true);
            }, 1800);
            return () => {
              clearInterval(iv);
              clearTimeout(tm);
            };
          }, []);

          return (
            <div>
              <h2>Drawing the prize multiplier</h2>
              <p className="muted">
                Published odds:{' '}
                {tableOdds.map(([m, w]) => m.toLocaleString() + '× ' + (w / 100).toFixed(2) + '%').join(', ')}
                . Expected return {spinRTP(tableOdds).rtp.toFixed(1)}% of buy-ins.
              </p>
              <div className="reel">
                <div className={done ? 'hit' : ''}>{displayMult}</div>
              </div>
              <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, minHeight: 26 }}>
                {done ? `Prize: ${money(T.prize, c)} — winner takes all` : ''}
              </p>
              <div className="foot">
                <button
                  className="btn primary"
                  disabled={!done}
                  onClick={() => {
                    setModalLocked(false);
                    closeModal();
                    launch(T);
                  }}
                >
                  Start playing
                </button>
              </div>
            </div>
          );
        };

        setModalLocked(true);
        setModalContent(<SpinModal />);
      } else {
        launch();
      }
    },
    [canPlay, closeModal, cur, debit, money, nextHand, saveState, showToast, toCur]
  );

  const registerMTT = useCallback(
    (d: MttDef) => {
      if (!canPlay()) return;
      if (d.status === 'Paused' || d.status === 'Cancelled') {
        showToast(`${d.name} is ${d.status.toLowerCase()} by the operator`);
        return;
      }
      if (stateRef.current.bo.bans.includes(d.v)) {
        showToast(`You are restricted from ${VARIANTS[d.v].name}`);
        return;
      }
      const c = cur();
      const total = toCur(d.buy + d.fee, c);
      if (total && !debit(total, c, 'Tournament buy-in', d.name)) return;

      saveState((prev) => ({
        ...prev,
        ops: {
          ...prev.ops,
          fees: { ...prev.ops.fees, [c]: (prev.ops.fees[c] || 0) + toCur(d.fee, c) },
          tourneysRun: prev.ops.tourneysRun + 1,
        },
      }));

      const pool =
        Math.max(toCur(d.buy * d.field, c), toCur(d.gtd || 0, c)) + toCur(d.added || 0, c);
      const T: any = {
        ...d,
        kind: 'mtt',
        cur: c,
        level: 0,
        handsInLevel: 0,
        remaining: d.field,
        prize: pool,
        pays: d.satellite ? null : payoutTable(d.field),
        startedAt: Date.now(),
        bounties: 0,
      };

      if (d.bounty) {
        T.prize = Math.round(pool / 2);
        T.bountyPool = pool - T.prize;
        const n = d.field - 1;
        const top = Math.round(T.bountyPool * 0.1);
        const w = Array.from({ length: n - 1 }, () => pick([0.3, 0.3, 0.5, 0.5, 0.8, 1, 1, 1.5, 3, 6]));
        const s = w.reduce((a, b) => a + b, 0);
        const rest = T.bountyPool - top;
        T.env = w.map((x) => Math.floor((rest * x) / s));
        T.env.push(top);
        T.env[0] += T.bountyPool - T.env.reduce((a: number, b: number) => a + b, 0);
      }

      if (d.satellite) {
        T.seatsWon = Math.floor(toCur(d.buy * d.field, c) / toCur(d.satellite, c));
        T.leftover = toCur(d.buy * d.field, c) - T.seatsWon * toCur(d.satellite, c);
      }

      const table = new PokerTable({ variant: d.v, seats: d.seats, mode: 'tourney', unit: 1 });
      const G: PokerSessionState = {
        kind: 'mtt',
        def: d,
        cur: c,
        table,
        hero: 0,
        timers: [],
        buyInTotal: total,
        handsHere: 0,
        T,
        pre: { checkFold: false, callAny: false },
      };

      table.seat(0, { name: 'You', stack: d.stack, hero: true });
      for (let i = 1; i < d.seats; i++) table.seat(i, makeBot(d.stack, G));

      setGameSession(G);
      document.body.style.overflow = 'hidden';
      setTimeout(() => nextHand(), 50);
    },
    [canPlay, cur, debit, nextHand, saveState, showToast, toCur]
  );

  /* ---------- Keyboard Shortcuts for Hero Action ---------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sessionRef.current || modalContent || e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      const tb = sessionRef.current.table as PokerTable;
      const L = tb.legal(sessionRef.current.hero);
      if (!L) return;
      if (k === 'f' && L.fold) heroAct('fold');
      if (k === 'k' && L.check) heroAct('check');
      if (k === 'c') heroAct(L.check ? 'check' : 'call');
      if (k === 'r' && L.raise) heroAct('raise', L.raise.minTo);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [heroAct, modalContent]);

  /* ---------- CSV Export ---------- */
  const exportCSV = useCallback(() => {
    const rows = [
      ['hand_id', 'time', 'format', 'game', 'stakes', 'currency', 'hole', 'board', 'pot', 'rake', 'result', 'net', 'seed', 'seed_hash'],
    ];
    state.hands.forEach((h) =>
      rows.push([
        h.id,
        new Date(h.ts).toISOString(),
        h.kind,
        h.game,
        h.stakes,
        h.cur,
        h.hole.join(' '),
        h.board.join(' '),
        h.cur === 'CHIPS' ? String(h.pot) : (h.pot / h.unit).toFixed(2),
        h.cur === 'CHIPS' ? String(h.rake) : (h.rake / h.unit).toFixed(2),
        h.result,
        h.cur === 'CHIPS' ? String(h.net) : (h.net / h.unit).toFixed(2),
        h.seed,
        h.hash,
      ])
    );
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'tig-poker-betting-history.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [state.hands]);

  /* ---------- Hand Detail / Verify Modal ---------- */
  const showHandModal = (h: HandRecordModel) => {
    const VerifyDialog = () => {
      const [vLog, setVLog] = useState<string | null>(null);
      const runVerify = () => {
        const hashOk = sha256(h.seed) === h.hash;
        const deck = shuffle(buildDeck(h.variantShort), seededRng(h.seed))
          .map(cardStr)
          .slice(0, 20);
        const deckOk = deck.every((c, i) => c === h.deck[i]);
        setVLog(
          `Seed: ${h.seed}\nSHA-256(seed): ${sha256(h.seed)}\nCommitted hash: ${h.hash}\n` +
          `${hashOk ? '✓ Hash matches the pre-deal commitment' : '✗ Hash mismatch'}\n` +
          `${deckOk ? '✓ Re-shuffled deck matches the dealt order' : '✗ Deck mismatch'}\n` +
          `First 12 cards: ${deck.slice(0, 12).join(' ')}`
        );
      };

      return (
        <div>
          <h2>Hand #{h.id}</h2>
          <p className="muted">
            {h.game} · {h.stakes} · {new Date(h.ts).toLocaleString()}
          </p>
          <div className="row" style={{ margin: '12px 0', gap: 20, alignItems: 'flex-end' }}>
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                Your cards
              </div>
              <div className="row" style={{ gap: 4 }}>
                {h.hole.map((s, idx) => (
                  <React.Fragment key={idx}>{renderCard(parseCard(s))}</React.Fragment>
                ))}
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                Board
              </div>
              <div className="row" style={{ gap: 4 }}>
                {h.board.length ? (
                  h.board.map((s, idx) => (
                    <React.Fragment key={idx}>{renderCard(parseCard(s))}</React.Fragment>
                  ))
                ) : (
                  <span className="muted">No flop</span>
                )}
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>
                Result
              </div>
              <b className={h.net > 0 ? 'pos' : h.net < 0 ? 'neg' : ''} style={{ fontSize: 20 }}>
                {h.net > 0 ? '+' : ''}
                {h.cur === 'CHIPS' ? h.net.toLocaleString() + ' chips' : money(h.net, h.cur)}
              </b>
              {h.hand ? <div className="muted" style={{ fontSize: 13 }}>{h.hand}</div> : null}
            </div>
          </div>
          <div className="loglines">{h.log.join('\n')}</div>
          <h3 style={{ marginTop: 16 }}>Verify this shuffle</h3>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            Recomputes the SHA-256 of the revealed seed, re-runs the deterministic shuffle, and compares it with the cards that were dealt.
          </p>
          <div className="verify">
            {vLog ? (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{vLog}</pre>
            ) : (
              <>
                Seed: {h.seed}
                <br />
                Committed hash: {h.hash}
              </>
            )}
          </div>
          <div className="foot">
            <button className="btn" onClick={runVerify}>
              Run verification
            </button>
            <button className="btn primary" onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      );
    };

    setModalWide(true);
    setModalContent(<VerifyDialog />);
  };

  /* ---------- Render Top Nav & Header ---------- */
  const activeCur = cur();

  if (!mounted) return null;

  return (
    <div
      ref={rootRef}
      className={`poker-page ${state.settings.skin ? `data-skin="${state.settings.skin}"` : ''} ${
        !state.settings.fourColor ? 'two-color' : ''
      }`}
      data-skin={state.settings.skin}
    >
      {/* Unified Player Header matching Bingo */}
      <PlayerHeader
        currentApp="poker"
        wallet={state.wallet[activeCur] || 0}
        walletDisplay={money(state.wallet[activeCur] || 0, activeCur)}
        currentUser={{
          username: "Hero Player",
          tier: state.bo.vip || "Gold",
        } as any}
        pokerActiveView={activeView}
        onPokerViewChange={(v) => {
          setActiveView(v);
        }}
        pokerMode={state.settings.mode as "real" | "sweeps"}
        onPokerModeChange={(mode) => {
          if (sessionRef.current) {
            showToast('Leave the table before switching play mode');
            return;
          }
          saveState((prev) => ({
            ...prev,
            settings: { ...prev.settings, mode },
          }));
          audit('Mode switched', mode);
          showToast(`Switched to ${mode === 'real' ? 'Real Money (USD)' : 'Sweepstakes'}`);
        }}
        pokerSweepsCur={state.settings.sweepsCur}
        onPokerSweepsCurChange={(cur) => {
          saveState((prev) => ({
            ...prev,
            settings: { ...prev.settings, sweepsCur: cur },
          }));
          showToast(`Currency set to ${cur === 'SC' ? 'Sweeps Coins (SC)' : 'Gold Coins (GC)'}`);
        }}
      />

      {/* Main Views */}
      <main>
        {/* Lobby View */}
        {activeView === 'lobby' && (
          <section className="view on">
            <div className="feature">
              <div className="copy">
                <h1>Win a seat at the live main event from a $55 satellite</h1>
                <p>
                  Online satellites award live-event packages straight to the player&apos;s wallet.
                  Tickets carry over to on-site registration, so an online qualifier arrives already seated.
                </p>
                <div className="row">
                  <button
                    className="btn primary"
                    onClick={() => {
                      if (state.settings.mode !== 'real') {
                        saveState((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, mode: 'real' },
                        }));
                      }
                      registerMTT(MTTS[1]);
                    }}
                  >
                    Play the satellite
                  </button>
                  <button className="btn ghost" onClick={() => setActiveView('live')}>
                    See live events
                  </button>
                </div>
              </div>
              <div className="art" aria-hidden="true">
                <div className="fan">
                  {['As', 'Ks', 'Qs', 'Js', 'Ts'].map((cStr, i) => (
                    <div
                      key={cStr}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%,-50%) translateX(${(i - 2) * 38}px) translateY(${
                          Math.abs(i - 2) * 7
                        }px) rotate(${(i - 2) * 9}deg)`,
                      }}
                    >
                      <div style={{ ['--w' as any]: '64px' }} className={`card s${parseCard(cStr).s}`}>
                        <span className="r">{RANKCH[parseCard(cStr).r - 2]}</span>
                        <span className="s">{SUIT_GLYPH[parseCard(cStr).s]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lobby">
              <div className="cats" role="tablist" aria-label="Game categories">
                {[
                  ['cash', 'Cash games', CASH.filter((x) => x.cat === 'cash').length],
                  ['blitz', 'Fast-fold Blitz', CASH.filter((x) => x.cat === 'blitz').length],
                  ['sng', 'Sit & Go', SNGS.length],
                  ['spin', 'Jackpot Spin', SPINS.length],
                  ['mtt', 'Tournaments', MTTS.length],
                  ['club', 'Private clubs', ''],
                ].map(([k, label, count]) => (
                  <button
                    key={k}
                    role="tab"
                    aria-selected={lobbyCat === k}
                    onClick={() => setLobbyCat(k as any)}
                  >
                    {label}
                    {count !== '' && <span>{count}</span>}
                  </button>
                ))}
              </div>

              <div className="lobby-content">
                {(lobbyCat === 'cash' || lobbyCat === 'blitz') && (
                  <div>
                    <div className="listhead">
                      <div>
                        <h2>
                          {lobbyCat === 'blitz' ? 'Fast-fold Blitz' : 'Cash games'}{' '}
                          {state.settings.mode === 'sweeps' && (
                            <span className="tag gold">
                              {activeCur === 'SC'
                                ? 'Sweeps Coins · prizes redeemable'
                                : 'Gold Coins · social play'}
                            </span>
                          )}
                        </h2>
                        <p className="muted" style={{ margin: '4px 0 0' }}>
                          {lobbyCat === 'blitz'
                            ? 'Fold and you are dealt a new hand at a new table instantly.'
                            : "Hold'em, Omaha, Hi-Lo, Short Deck and Limit, all on one engine."}
                        </p>
                      </div>
                    </div>
                    <div className="tblwrap">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Game</th>
                            <th>Stakes</th>
                            <th>{lobbyCat === 'blitz' ? 'Pool' : 'Players'}</th>
                            <th>Avg pot</th>
                            <th>Players/flop</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {CASH.filter((x) => x.cat === lobbyCat).map((d) => {
                            const h = hashStable(d.id + activeCur);
                            const players =
                              lobbyCat === 'blitz' ? 40 + (h % 260) : 2 + (h % (d.seats - 1));
                            return (
                              <tr key={d.id}>
                                <td>
                                  <b>{VARIANTS[d.v].name}</b>
                                  {d.tag ? <span className="tag">{d.tag}</span> : null}
                                </td>
                                <td className="money">{stakesLabel(d, activeCur)}</td>
                                <td>{lobbyCat === 'blitz' ? `${players} in pool` : `${players}/${d.seats}`}</td>
                                <td className="money">
                                  {money(
                                    toCur(
                                      Math.round(((d.bb || (d.ante || 0) * 2) * (8 + (h % 30)))),
                                      activeCur
                                    ),
                                    activeCur
                                  )}
                                </td>
                                <td>{20 + (h % 35)}%</td>
                                <td>
                                  <button
                                    className="btn small primary"
                                    onClick={() => askBuyIn(d)}
                                  >
                                    {lobbyCat === 'blitz' ? 'Join pool' : 'Take a seat'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(lobbyCat === 'sng' || lobbyCat === 'spin') && (
                  <div>
                    <div className="listhead">
                      <div>
                        <h2>
                          {lobbyCat === 'sng' ? 'Sit & Go' : 'Jackpot Spin'}{' '}
                          {state.settings.mode === 'sweeps' && (
                            <span className="tag gold">
                              {activeCur === 'SC'
                                ? 'Sweeps Coins · prizes redeemable'
                                : 'Gold Coins · social play'}
                            </span>
                          )}
                        </h2>
                        <p className="muted" style={{ margin: '4px 0 0' }}>
                          {lobbyCat === 'sng'
                            ? 'Starts the moment the table fills. Payouts fixed up front.'
                            : 'Three players, hyper blinds. The prize multiplier is drawn before the first hand, from 2× up to 1,000×.'}
                        </p>
                      </div>
                    </div>
                    <div className="tblwrap">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Tournament</th>
                            <th>Game</th>
                            <th>Buy-in</th>
                            <th>Players</th>
                            <th>Starting stack</th>
                            <th>Prize</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {(lobbyCat === 'sng' ? SNGS : SPINS).map((d) => (
                            <tr key={d.id}>
                              <td>
                                <b>{d.name}</b>
                              </td>
                              <td>{VARIANTS[d.v].name}</td>
                              <td className="money">
                                {money(toCur(d.buy, activeCur), activeCur)} +{' '}
                                {money(toCur(d.fee, activeCur), activeCur)}
                              </td>
                              <td>{d.field}</td>
                              <td>{d.stack.toLocaleString()}</td>
                              <td className="money">
                                {d.spin
                                  ? 'Up to ' + money(toCur(d.buy * 1000, activeCur), activeCur)
                                  : money(toCur(d.buy * d.field, activeCur), activeCur)}
                              </td>
                              <td>
                                <button
                                  className="btn small primary"
                                  onClick={() => startSNG(d)}
                                >
                                  Register
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {lobbyCat === 'mtt' && (
                  <div>
                    <div className="listhead">
                      <div>
                        <h2>
                          Tournaments{' '}
                          {state.settings.mode === 'sweeps' && (
                            <span className="tag gold">
                              {activeCur === 'SC'
                                ? 'Sweeps Coins · prizes redeemable'
                                : 'Gold Coins · social play'}
                            </span>
                          )}
                        </h2>
                        <p className="muted" style={{ margin: '4px 0 0' }}>
                          Scheduled multi-table events. In this demo, registering seats you straight away at your starting table.
                        </p>
                      </div>
                    </div>
                    <div className="tblwrap">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Starts</th>
                            <th>Event</th>
                            <th>Game</th>
                            <th>Buy-in</th>
                            <th>Guarantee / prize</th>
                            <th>Entrants</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {MTTS.map((d) => (
                            <tr key={d.id}>
                              <td>in {d.start} min</td>
                              <td>
                                <b>{d.name}</b>
                                {d.bounty && <span className="tag gold">Mystery bounty</span>}
                                {d.satellite && <span className="tag gold">Live seats</span>}
                                {d.added && <span className="tag good">Freeroll</span>}
                              </td>
                              <td>{VARIANTS[d.v].name}</td>
                              <td className="money">
                                {d.buy
                                  ? money(toCur(d.buy, activeCur), activeCur) +
                                    ' + ' +
                                    money(toCur(d.fee, activeCur), activeCur)
                                  : 'Free'}
                              </td>
                              <td className="money">
                                {d.satellite
                                  ? Math.floor((d.buy * d.field) / d.satellite) +
                                    ' × ' +
                                    money(toCur(d.satellite, activeCur), activeCur) +
                                    ' packages'
                                  : d.gtd
                                  ? money(toCur(d.gtd, activeCur), activeCur) + ' GTD'
                                  : d.added
                                  ? money(toCur(d.added, activeCur), activeCur) + ' added'
                                  : money(toCur(d.buy * d.field, activeCur), activeCur)}
                              </td>
                              <td>{d.field}</td>
                              <td>
                                <button
                                  className="btn small primary"
                                  onClick={() => registerMTT(d)}
                                >
                                  Register
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {lobbyCat === 'club' && (
                  <div>
                    <div className="listhead">
                      <div>
                        <h2>Private clubs & home games</h2>
                        <p className="muted" style={{ margin: '4px 0 0' }}>
                          Players create their own tables with custom rules and share an invite code.
                        </p>
                      </div>
                    </div>
                    <div className="panel">
                      <div className="form">
                        <label className="field">
                          Club name
                          <input id="clName" defaultValue="Friday Night Game" maxLength={30} />
                        </label>
                        <label className="field">
                          Game
                          <select id="clVar" defaultValue="NLH">
                            {Object.values(VARIANTS).map((v) => (
                              <option key={v.code} value={v.code}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          Seats
                          <select id="clSeats" defaultValue="6">
                            <option>2</option>
                            <option>4</option>
                            <option>6</option>
                            <option>8</option>
                            <option>9</option>
                          </select>
                        </label>
                        <label className="field">
                          Big blind ({activeCur})
                          <select id="clBB" defaultValue="100">
                            {[10, 50, 100, 200, 500].map((x) => (
                              <option key={x} value={x}>
                                {money(toCur(x, activeCur), activeCur)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          Action clock (seconds)
                          <input id="clClock" type="number" min={8} max={60} defaultValue={15} />
                        </label>
                        <label className="field">
                          Rake
                          <select id="clRake" defaultValue="5">
                            <option value="0">No rake (club fee model)</option>
                            <option value="3">3%, cap 2 bb</option>
                            <option value="5">5%, cap 3 bb</option>
                          </select>
                        </label>
                      </div>
                      <div className="row" style={{ marginTop: 16 }}>
                        <button
                          className="btn primary"
                          onClick={() => {
                            const bb = +((document.getElementById('clBB') as HTMLInputElement | null)?.value || 100);
                            const v = ((document.getElementById('clVar') as HTMLInputElement | null)?.value || 'NLH') as VariantCode;
                            const clubName = (document.getElementById('clName') as HTMLInputElement | null)?.value || 'Club';
                            const code = 'TIG-' + Math.random().toString(36).slice(2, 7).toUpperCase();
                            const d: CashGameDef = {
                              id: 'club-' + code,
                              v,
                              seats: +((document.getElementById('clSeats') as HTMLInputElement | null)?.value || 6),
                              cat: 'club',
                              club: clubName,
                              code,
                              clock: +((document.getElementById('clClock') as HTMLInputElement | null)?.value || 15),
                              rake: +((document.getElementById('clRake') as HTMLInputElement | null)?.value || 5),
                            };
                            if (v === 'SD') {
                              d.ante = bb;
                              d.buttonBlind = bb;
                            } else {
                              d.sb = bb / 2;
                              d.bb = bb;
                            }
                            audit('Club created', `${clubName} ${code}`);
                            askBuyIn(d);
                          }}
                        >
                          Create club table
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Betting History View */}
        {activeView === 'history' && (
          <section className="view on">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h1>Betting history</h1>
              <div className="row">
                <button
                  className={`btn small ${historyTab === 'hands' ? 'primary' : ''}`}
                  onClick={() => setHistoryTab('hands')}
                >
                  Hands
                </button>
                <button
                  className={`btn small ${historyTab === 'tourneys' ? 'primary' : ''}`}
                  onClick={() => setHistoryTab('tourneys')}
                >
                  Tournaments
                </button>
                <button className="btn small" onClick={exportCSV}>
                  Export CSV
                </button>
              </div>
            </div>

            <div className="kpis">
              <div className="kpi">
                <div className="v">{state.hands.length}</div>
                <div className="k">Hands played</div>
              </div>
              <div className="kpi">
                <div className="v money" style={{ fontSize: 18 }}>
                  {(() => {
                    const cashHands = state.hands.filter((h) => h.cur !== 'CHIPS');
                    const byCur: Record<string, number> = {};
                    cashHands.forEach((h) => (byCur[h.cur] = (byCur[h.cur] || 0) + h.net));
                    return Object.entries(byCur).length
                      ? Object.entries(byCur).map(([c, v]) => (
                          <div key={c} className={v >= 0 ? 'pos' : 'neg'}>
                            {v >= 0 ? '+' : ''}
                            {money(v, c)}
                          </div>
                        ))
                      : '—';
                  })()}
                </div>
                <div className="k">Net result, cash & sweeps</div>
              </div>
              <div className="kpi">
                <div className="v money">
                  {(() => {
                    const bigPot = state.hands
                      .filter((h) => (h.result === 'Won' || h.result === 'Split') && h.cur !== 'CHIPS')
                      .reduce((m: any, h) => (!m || h.pot > m.pot ? h : m), null);
                    return bigPot ? money(bigPot.pot, bigPot.cur) : '—';
                  })()}
                </div>
                <div className="k">Biggest pot won</div>
              </div>
              <div className="kpi">
                <div className="v">
                  {state.hands.length
                    ? Math.round(
                        (state.hands.filter((h) =>
                          h.log.some((l) => /^You: (calls|raises|bets)/.test(l) && !/posts/.test(l))
                        ).length /
                          state.hands.length) *
                          100
                      )
                    : 0}
                  %
                </div>
                <div className="k">Hands you put money in voluntarily (VPIP)</div>
              </div>
            </div>

            {historyTab === 'hands' ? (
              <div>
                <div className="row" style={{ marginBottom: 12 }}>
                  <select
                    value={historyFormat}
                    onChange={(e) => setHistoryFormat(e.target.value)}
                  >
                    <option value="all">All formats</option>
                    <option value="cash">Cash & clubs</option>
                    <option value="blitz">Blitz</option>
                    <option value="tourney">Tournaments</option>
                  </select>
                  <select
                    value={historyVariant}
                    onChange={(e) => setHistoryVariant(e.target.value)}
                  >
                    <option value="all">All games</option>
                    {Object.values(VARIANTS).map((v) => (
                      <option key={v.code} value={v.code}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={historyResult}
                    onChange={(e) => setHistoryResult(e.target.value)}
                  >
                    <option value="all">All results</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                    <option value="Split">Split</option>
                    <option value="Folded">Folded</option>
                    <option value="Left">Left</option>
                  </select>
                  <span className="muted">
                    {state.hands.filter((h) => {
                      if (historyFormat === 'cash' && !(h.kind === 'cash' || h.kind === 'club'))
                        return false;
                      if (historyFormat === 'tourney' && h.cur !== 'CHIPS') return false;
                      if (historyFormat === 'blitz' && h.kind !== 'blitz') return false;
                      if (historyVariant !== 'all' && h.v !== historyVariant) return false;
                      if (historyResult !== 'all' && h.result !== historyResult) return false;
                      return true;
                    }).length}{' '}
                    hands
                  </span>
                </div>

                {state.hands.length ? (
                  <div className="tblwrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Hand</th>
                          <th>Game</th>
                          <th>Stakes</th>
                          <th>Your cards</th>
                          <th>Board</th>
                          <th>Pot</th>
                          <th>Result</th>
                          <th>Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.hands
                          .filter((h) => {
                            if (historyFormat === 'cash' && !(h.kind === 'cash' || h.kind === 'club'))
                              return false;
                            if (historyFormat === 'tourney' && h.cur !== 'CHIPS') return false;
                            if (historyFormat === 'blitz' && h.kind !== 'blitz') return false;
                            if (historyVariant !== 'all' && h.v !== historyVariant) return false;
                            if (historyResult !== 'all' && h.result !== historyResult) return false;
                            return true;
                          })
                          .slice(0, 200)
                          .map((h) => (
                            <tr
                              key={h.id}
                              style={{ cursor: 'pointer' }}
                              onClick={() => showHandModal(h)}
                            >
                              <td>
                                {new Date(h.ts).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </td>
                              <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{h.id}</td>
                              <td>
                                {h.game}
                                {h.kind === 'blitz' && <span className="tag">Blitz</span>}
                              </td>
                              <td className="money">{h.stakes}</td>
                              <td>
                                {h.hole.map((s, idx) => {
                                  const c = parseCard(s);
                                  const suitColor = ['var(--text)', '#C9252D', state.settings.fourColor ? '#1F63C6' : '#C9252D', state.settings.fourColor ? '#177A3E' : 'var(--text)'][c.s];
                                  return (
                                    <span key={idx} style={{ color: suitColor, fontWeight: 700, marginRight: 4 }}>
                                      {RANKCH[c.r - 2]}
                                      {SUIT_GLYPH[c.s]}
                                    </span>
                                  );
                                })}
                              </td>
                              <td>
                                {h.board.length ? (
                                  h.board.map((s, idx) => {
                                    const c = parseCard(s);
                                    const suitColor = ['var(--text)', '#C9252D', state.settings.fourColor ? '#1F63C6' : '#C9252D', state.settings.fourColor ? '#177A3E' : 'var(--text)'][c.s];
                                    return (
                                      <span key={idx} style={{ color: suitColor, fontWeight: 700, marginRight: 4 }}>
                                        {RANKCH[c.r - 2]}
                                        {SUIT_GLYPH[c.s]}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="muted">—</span>
                                )}
                              </td>
                              <td className="money">
                                {h.cur === 'CHIPS' ? h.pot.toLocaleString() + ' chips' : money(h.pot, h.cur)}
                              </td>
                              <td>
                                <span
                                  className={`tag ${
                                    h.result === 'Won' ? 'good' : h.result === 'Lost' ? 'bad' : ''
                                  }`}
                                >
                                  {h.result}
                                </span>
                              </td>
                              <td
                                className={`money ${
                                  h.net > 0 ? 'pos' : h.net < 0 ? 'neg' : ''
                                }`}
                              >
                                {h.net > 0 ? '+' : ''}
                                {h.cur === 'CHIPS' ? h.net.toLocaleString() + ' chips' : money(h.net, h.cur)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="panel">
                    <h3>No hands yet</h3>
                    <p className="muted">
                      Take a seat in the lobby. Every hand you play is recorded here with a full action log and a verifiable shuffle.
                    </p>
                    <button className="btn primary" onClick={() => setActiveView('lobby')}>
                      Open the lobby
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {state.tourneys.length ? (
                  <div className="tblwrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Tournament</th>
                          <th>Game</th>
                          <th>Buy-in</th>
                          <th>Finish</th>
                          <th>Prize</th>
                          <th>Bounties</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.tourneys.map((t, idx) => (
                          <tr key={idx}>
                            <td>
                              {new Date(t.ts).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td>
                              <b>{t.name}</b>
                              {t.mult && <span className="tag gold">{t.mult}×</span>}
                              {t.ticket && <span className="tag gold">Live seat won</span>}
                            </td>
                            <td>{t.game}</td>
                            <td className="money">{t.buy ? money(t.buy, t.cur) : 'Free'}</td>
                            <td>
                              {t.place} / {t.field}
                              {t.quit ? ' (left)' : ''}
                            </td>
                            <td className={`money ${t.prize ? 'pos' : ''}`}>
                              {t.prize ? money(t.prize, t.cur) : '—'}
                            </td>
                            <td className="money">{t.bounties ? money(t.bounties, t.cur) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="panel">
                    <h3>No tournaments yet</h3>
                    <p className="muted">
                      Register for a Sit & Go, Jackpot Spin or scheduled tournament from the lobby.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Wallet View */}
        {activeView === 'wallet' && (
          <section className="view on">
            <h1>Wallet</h1>
            <div className="grid3" style={{ margin: '16px 0 22px' }}>
              {[
                ['USD', 'Real-money balance', 'Cash tables, tournaments, withdrawals'],
                ['SC', 'Sweeps Coins', 'Redeemable for prizes where eligible'],
                ['GC', 'Gold Coins', 'Social play only, never redeemable'],
              ].map(([cCode, title, desc]) => (
                <div key={cCode} className="panel">
                  <div className="muted" style={{ fontSize: 13 }}>
                    {title}
                  </div>
                  <div
                    style={{ fontSize: 26, fontWeight: 750, fontStretch: '108%' }}
                    className="money"
                  >
                    {money(state.wallet[cCode] || 0, cCode)}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
                    {desc}
                  </div>
                  {cCode === 'SC' && (
                    <button
                      className="btn small"
                      style={{ marginRight: 6 }}
                      onClick={() => {
                        if (state.bo.withdrawHold) {
                          showToast('Redemptions are on hold for this account');
                          return;
                        }
                        if ((state.wallet.SC || 0) < 2500) {
                          showToast('Minimum redemption is 25 SC');
                          return;
                        }
                        saveState((prev) => ({
                          ...prev,
                          wallet: { ...prev.wallet, SC: prev.wallet.SC - 2500 },
                          bo: {
                            ...prev.bo,
                            redemptions: [
                              { ts: Date.now(), amount: 2500, status: 'Pending' },
                              ...prev.bo.redemptions,
                            ],
                          },
                        }));
                        addTx('Redemption requested', -2500, 'SC', 'Pending operator approval');
                        showToast('Redemption requested — approve it in Back office → Finance');
                      }}
                    >
                      Redeem 25 SC
                    </button>
                  )}
                  <button
                    className="btn small"
                    onClick={() => {
                      credit(
                        cCode === 'USD' ? 10000 : cCode === 'SC' ? 1000 : 100000,
                        cCode,
                        cCode === 'USD'
                          ? 'Deposit'
                          : cCode === 'SC'
                          ? 'Free entry (AMOE)'
                          : 'Gold Coin purchase',
                        'Demo top-up'
                      );
                      showToast(`Added ${money(cCode === 'USD' ? 10000 : cCode === 'SC' ? 1000 : 100000, cCode)} to wallet`);
                    }}
                  >
                    {cCode === 'USD'
                      ? 'Deposit $100 (demo)'
                      : cCode === 'SC'
                      ? 'Claim 10 SC free entry'
                      : 'Buy 100,000 GC (demo)'}
                  </button>
                </div>
              ))}
            </div>

            {state.tickets.length ? (
              <div>
                <h2>Live event tickets</h2>
                {state.tickets.map((t, idx) => (
                  <div key={idx} className="ticket">
                    <div>
                      <b>{t.name}</b>
                      <div className="muted">
                        Won in {t.from} · {money(t.value, t.cur)} · code {t.code}
                      </div>
                    </div>
                    <span className="tag gold">Ready for on-site check-in</span>
                  </div>
                ))}
                <div style={{ height: 22 }} />
              </div>
            ) : null}

            <h2 style={{ marginBottom: 10 }}>Transactions</h2>
            {state.tx.length ? (
              <div className="tblwrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Details</th>
                      <th>Amount</th>
                      <th>Balance after</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.tx.slice(0, 150).map((t, idx) => (
                      <tr key={idx}>
                        <td>
                          {new Date(t.ts).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>{t.type}</td>
                        <td className="muted">{t.note || ''}</td>
                        <td className={`money ${t.amount > 0 ? 'pos' : t.amount < 0 ? 'neg' : ''}`}>
                          {t.amount > 0 ? '+' : ''}
                          {money(t.amount, t.cur)}
                        </td>
                        <td className="money">{money(t.bal, t.cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="panel">
                <p className="muted" style={{ margin: 0 }}>
                  No transactions yet. Buy-ins, cash-outs, prizes and bounties will appear here.
                </p>
              </div>
            )}

            <div className="row" style={{ marginTop: 18 }}>
              <button
                className="btn ghost small"
                onClick={() => {
                  setModalContent(
                    <div>
                      <h2>Reset demo data?</h2>
                      <p className="muted">
                        Clears balances, betting history, tickets and back-office counters in this browser.
                      </p>
                      <div className="foot">
                        <button className="btn ghost" onClick={closeModal}>
                          Cancel
                        </button>
                        <button
                          className="btn primary"
                          onClick={() => {
                            try {
                              localStorage.removeItem('tig_poker_demo_v1');
                            } catch (_) {}
                            window.location.reload();
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  );
                }}
              >
                Reset demo data
              </button>
            </div>
          </section>
        )}

        {/* Live Events View */}
        {activeView === 'live' && (
          <section className="view on">
            <h1>Live events</h1>
            <p className="muted" style={{ maxWidth: '62ch' }}>
              One player account across online and live play. Satellite wins land here as tickets, and on-site registration reads the same wallet, so qualifiers skip the cage queue.
            </p>
            <div className="tblwrap" style={{ marginTop: 16 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>When</th>
                    <th>Buy-in</th>
                    <th>Qualify online</th>
                  </tr>
                </thead>
                <tbody>
                  {LIVE_EVENTS.map((e, idx) => (
                    <tr key={idx}>
                      <td>
                        <b>{e.name}</b>
                      </td>
                      <td>{e.when}</td>
                      <td className="money">{e.buy}</td>
                      <td>
                        <button
                          className="btn small primary"
                          onClick={() => {
                            if (state.settings.mode !== 'real') {
                              saveState((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, mode: 'real' },
                              }));
                            }
                            registerMTT(MTTS[1]);
                          }}
                        >
                          Play satellite
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid3" style={{ marginTop: 22 }}>
              <div className="panel">
                <h3>Digital check-in</h3>
                <p className="muted">
                  Ticket code scanned at registration; seat draw pushed to the player&apos;s phone.
                </p>
              </div>
              <div className="panel">
                <h3>Live chip counts</h3>
                <p className="muted">
                  Floor staff post counts from a tablet; the feed updates the app and the broadcast overlay together.
                </p>
              </div>
              <div className="panel">
                <h3>Online-to-live rewards</h3>
                <p className="muted">
                  Rake and tournament play earn points toward live packages, merchandise and hotel partners.
                </p>
              </div>
            </div>

            <h2 style={{ margin: '24px 0 10px' }}>Your tickets</h2>
            {state.tickets.length ? (
              state.tickets.map((t, idx) => (
                <div key={idx} className="ticket">
                  <div>
                    <b>{t.name}</b>
                    <div className="muted">
                      {t.code} · {money(t.value, t.cur)}
                    </div>
                  </div>
                  <span className="tag gold">Valid</span>
                </div>
              ))
            ) : (
              <div className="panel">
                <p className="muted" style={{ margin: 0 }}>
                  No tickets yet. Finish in the seats of a satellite to earn one.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Back Office View Redirect / Card */}
        {activeView === 'ops' && (
          <section className="view on">
            <div
              className="card"
              style={{
                maxWidth: 720,
                margin: '48px auto',
                padding: '44px 36px',
                textAlign: 'center',
                background: 'linear-gradient(180deg, rgba(23, 19, 46, 0.95), rgba(12, 9, 32, 0.98))',
                border: '1px solid rgba(120, 104, 255, 0.25)',
                borderRadius: 20,
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  margin: '0 auto 20px',
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, rgba(120, 104, 255, 0.2), rgba(39, 215, 173, 0.2))',
                  border: '1px solid rgba(120, 104, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                }}
              >
                🛡️
              </div>
              <h2
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  margin: '0 0 12px',
                  color: '#f5f3ff',
                  letterSpacing: '-0.02em',
                }}
              >
                Dedicated Poker Operator Backoffice
              </h2>
              <p
                style={{
                  color: '#9d9ab5',
                  fontSize: 15,
                  lineHeight: 1.6,
                  maxWidth: 540,
                  margin: '0 auto 28px',
                }}
              >
                All 15 operator management modules (Ring Tables, Dynamic Rake &amp; Caps, Tournaments, Bad Beat Jackpots, Player 360, Live Table Telemetry, Integrity &amp; Collusion alerts, and Multi-State Compliance) are now organized on their dedicated route matching the Bingo backoffice UI.
              </p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                  href="/poker-backoffice"
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 24px',
                    fontSize: 14,
                    textDecoration: 'none',
                    borderRadius: 10,
                  }}
                >
                  <span>Launch Poker Backoffice</span>
                  <span style={{ fontSize: 16 }}>→</span>
                </Link>
                <Link
                  href="/backoffice"
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 24px',
                    fontSize: 14,
                    textDecoration: 'none',
                    borderRadius: 10,
                  }}
                >
                  <span>Bingo Backoffice</span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Customise View */}
        {activeView === 'settings' && (
          <section className="view on">
            <h1>Customise</h1>
            <p className="muted" style={{ maxWidth: '60ch' }}>
              Operator branding and player preferences. Everything here is a configuration value.
            </p>
            <div className="grid2" style={{ marginTop: 16 }}>
              <div className="panel">
                <h3>Brand name</h3>
                <p className="muted" style={{ fontSize: 13 }}>
                  Shown in the header and printed on the felt.
                </p>
                <div className="row">
                  <input
                    defaultValue={state.settings.brand}
                    maxLength={24}
                    style={{ flex: 1 }}
                    id="brandInput"
                  />
                  <button
                    className="btn primary"
                    onClick={() => {
                      const val = (document.getElementById('brandInput') as HTMLInputElement)?.value.trim() || 'TIG Poker';
                      saveState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, brand: val },
                      }));
                      showToast('Brand name updated');
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
              <div className="panel">
                <h3>Theme</h3>
                <p className="muted" style={{ fontSize: 13 }}>
                  Colours, felt and card backs switch together.
                </p>
                <div className="row">
                  {[
                    ['tig', 'TIG Navy'],
                    ['tour', 'Tour Black & Gold'],
                    ['club', 'Club Teal'],
                  ].map(([skinCode, skinLabel]) => (
                    <button
                      key={skinCode}
                      className={`btn ${state.settings.skin === skinCode ? 'primary' : ''}`}
                      onClick={() =>
                        saveState((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, skin: skinCode },
                        }))
                      }
                    >
                      {skinLabel}
                    </button>
                  ))}
                </div>
              </div>
              <div className="panel">
                <h3>Card colours</h3>
                <p className="muted" style={{ fontSize: 13 }}>
                  Four-colour decks make flush draws easier to read on small screens.
                </p>
                <div className="row">
                  <button
                    className={`btn ${state.settings.fourColor ? 'primary' : ''}`}
                    onClick={() =>
                      saveState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, fourColor: true },
                      }))
                    }
                  >
                    Four-colour
                  </button>
                  <button
                    className={`btn ${!state.settings.fourColor ? 'primary' : ''}`}
                    onClick={() =>
                      saveState((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, fourColor: false },
                      }))
                    }
                  >
                    Classic two-colour
                  </button>
                </div>
              </div>
              <div className="panel">
                <h3>Between hands</h3>
                <p className="muted" style={{ fontSize: 13 }}>
                  Pause after each hand before the next deal.
                </p>
                <select
                  value={String(state.settings.nextDelay)}
                  onChange={(e) =>
                    saveState((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, nextDelay: +e.target.value },
                    }))
                  }
                >
                  <option value="1400">Short</option>
                  <option value="2200">Normal</option>
                  <option value="3500">Long</option>
                </select>
              </div>
            </div>
          </section>
        )}

        <p className="foot-note">
          TIG Poker demo environment · TrueIGTech Private Limited · Game logic runs locally in this page; production deployments run the same rules server-side with a certified RNG.
        </p>
      </main>

      {/* Full-screen Table Screen */}
      <section
        className={`tablescreen ${gameSession ? 'on' : ''}`}
        aria-label="Poker table"
        key={tableTick}
      >
        {gameSession && (
          <>
            <div className="tbar">
              <div>
                <div className="title">
                  {gameSession.T
                    ? `${gameSession.T.name}${
                        gameSession.T.kind === 'spin' ? ` · ${gameSession.T.mult}×` : ''
                      }`
                    : `${gameSession.def.club ? gameSession.def.club + ' · ' : ''}${
                        VARIANTS[gameSession.def.v as VariantCode].name
                      }`}
                </div>
                <div className="sub">
                  {gameSession.T
                    ? `${VARIANTS[gameSession.def.v as VariantCode].name} · Level ${
                        gameSession.T.level + 1
                      }`
                    : `${stakesLabel(gameSession.def, gameSession.cur)} · ${
                        gameSession.def.seats
                      }-max${gameSession.kind === 'blitz' ? ' · Blitz fast-fold' : ''}${
                        gameSession.def.code ? ' · Invite ' + gameSession.def.code : ''
                      }`}
                </div>
              </div>
              <div className="spacer" />
              <button
                className="hashchip"
                title="Shuffle commitment for the current hand"
                onClick={() => {
                  const tb = gameSession.table as PokerTable;
                  setModalContent(
                    <div>
                      <h2>Shuffle commitment</h2>
                      <p className="muted">
                        Hand #{tb.handId}. This hash was published before any card was dealt. The seed behind it is revealed when the hand ends.
                      </p>
                      <div className="verify">SHA-256: {tb.seedHash}</div>
                      <div className="foot">
                        <button className="btn primary" onClick={closeModal}>
                          Close
                        </button>
                      </div>
                    </div>
                  );
                }}
              >
                {gameSession.table.seedHash
                  ? `Shuffle hash ${gameSession.table.seedHash.slice(0, 12)}…`
                  : ''}
              </button>
              {gameSession.kind === 'mtt' && (
                <button
                  className="btn small"
                  onClick={() => {
                    const T = gameSession.T;
                    if (!T || T.remaining <= (gameSession.table as PokerTable).players.length) {
                      showToast('Already at the final table');
                      return;
                    }
                    T.remaining = gameSession.def.seats;
                    T.level = Math.max(T.level, 6);
                    const avg = Math.round(((gameSession.def.stack || 5000) * (gameSession.def.field || 100)) / T.remaining);
                    (gameSession.table as PokerTable).players.forEach((p) => {
                      if (p && p.bot) p.stack = Math.round(avg * rand(0.5, 1.5));
                    });
                    showToast('Fast-forwarded to the final table');
                    refreshTable();
                  }}
                >
                  Skip to final table
                </button>
              )}
              {(gameSession.kind === 'cash' || gameSession.kind === 'blitz') && (
                <button
                  className="btn small"
                  onClick={() => {
                    const tb = gameSession.table as PokerTable;
                    const hero = tb.players[gameSession.hero]!;
                    const max = tb.bigUnit * 100;
                    if (hero.stack >= max) {
                      showToast('You are already at the maximum buy-in');
                      return;
                    }
                    const add = Math.min(max - hero.stack, state.wallet[gameSession.cur] || 0);
                    if (add <= 0) {
                      showToast('No funds available to add');
                      return;
                    }
                    if (tb.phase === 'betting' && hero.dealt && !hero.folded) {
                      gameSession.pendingAdd = add;
                      showToast(`Adding ${money(add, gameSession.cur)} after this hand`);
                      return;
                    }
                    if (debit(add, gameSession.cur, 'Add chips', VARIANTS[gameSession.def.v as VariantCode].name)) {
                      hero.stack += add;
                      gameSession.buyInTotal += add;
                      refreshTable();
                    }
                  }}
                >
                  Add chips
                </button>
              )}
              <button
                className="btn small"
                onClick={() => {
                  const tb = gameSession.table as PokerTable;
                  const hero = tb.players[gameSession.hero]!;
                  if (gameSession.T) {
                    if (gameSession.T.done) {
                      closeTable();
                      return;
                    }
                    setModalContent(
                      <div>
                        <h2>Leave the tournament?</h2>
                        <p className="muted">
                          Your stack stays in and is blinded out. In this demo, leaving ends your run.
                        </p>
                        <div className="foot">
                          <button className="btn ghost" onClick={closeModal}>
                            Stay
                          </button>
                          <button
                            className="btn primary"
                            onClick={() => {
                              closeModal();
                              finishTourney(gameSession.T?.remaining || 1, true);
                            }}
                          >
                            Leave
                          </button>
                        </div>
                      </div>
                    );
                    return;
                  }
                  const inHand =
                    tb.phase !== 'done' && tb.phase !== 'idle' && hero.dealt && !hero.folded;
                  if (inHand) recordHand(true);
                  credit(
                    hero.stack,
                    gameSession.cur,
                    'Table cash-out',
                    `${VARIANTS[gameSession.def.v as VariantCode].name} ${stakesLabel(
                      gameSession.def,
                      gameSession.cur
                    )}`
                  );
                  showToast(`Cashed out ${money(hero.stack, gameSession.cur)}`);
                  closeTable();
                }}
              >
                Leave table
              </button>
            </div>

            <div className="tbody">
              <div className="stagewrap">
                {/* HUD */}
                <div className="hud">
                  {gameSession.T ? (
                    (() => {
                      const T = gameSession.T;
                      const tb = gameSession.table as PokerTable;
                      const [sb, bb, ante = 0] = tStake(T);
                      const alive = tb.players.filter((p) => p && p.stack > 0).length;
                      return (
                        <>
                          <span>
                            Blinds{' '}
                            <b>
                              {tb.v.shortDeck
                                ? `ante ${Math.max(5, Math.round(bb / 2))} · btn ${bb}`
                                : `${sb}/${bb}`}
                              {ante && !tb.v.shortDeck ? ` · ante ${ante}` : ''}
                            </b>
                          </span>
                          <span>
                            Next level in <b>{(T.hpl || 4) - T.handsInLevel} hands</b>
                          </span>
                          <span>
                            Players left{' '}
                            <b>
                              {T.kind === 'mtt' ? `${T.remaining} / ${T.field}` : `${alive} / ${T.field}`}
                            </b>
                          </span>
                          <span>
                            Prize pool <b>{money(T.prize, gameSession.cur)}</b>
                          </span>
                          {T.bounties ? (
                            <span>
                              Bounties won <b>{money(T.bounties, gameSession.cur)}</b>
                            </span>
                          ) : null}
                        </>
                      );
                    })()
                  ) : (
                    (() => {
                      const tb = gameSession.table as PokerTable;
                      const hero = tb.players[gameSession.hero]!;
                      const net = hero.stack + (gameSession.pendingAdd || 0) - gameSession.buyInTotal;
                      return (
                        <>
                          <span>
                            Hand <b>#{tb.handId || '—'}</b>
                          </span>
                          <span>
                            Hands at table <b>{gameSession.handsHere || 0}</b>
                          </span>
                          <span>
                            Session{' '}
                            <b className={net >= 0 ? 'pos' : 'neg'}>
                              {net >= 0 ? '+' : ''}
                              {money(net, gameSession.cur)}
                            </b>
                          </span>
                          <span>
                            Rake{' '}
                            <b>
                              {tb.cfg.rakePct}% cap {tb.cfg.rakeCapBB}bb
                            </b>
                          </span>
                        </>
                      );
                    })()
                  )}
                </div>

                {/* Felt & Seats */}
                <div className="stage">
                  <div className="felt">
                    <div className="mark">{state.settings.brand || 'TIG Poker'}</div>
                  </div>

                  {/* Pot */}
                  {(() => {
                    const tb = gameSession.table as PokerTable;
                    const pot = tb.potTotal();
                    const res = tb.results;
                    const fmt = (x: number) =>
                      tb.cfg.unit === 100 ? money(x, gameSession.cur) : x.toLocaleString();
                    if (!pot || tb.phase === 'idle') return null;
                    return (
                      <div className="pot money">
                        {tb.phase === 'done'
                          ? `Pot ${fmt(res ? res.pot : pot)}`
                          : `Pot ${fmt(pot)}`}
                        {res && res.rake ? ` · rake ${fmt(res.rake)}` : ''}
                      </div>
                    );
                  })()}

                  {/* Board Community Cards */}
                  <div className="board">
                    {(gameSession.table as PokerTable).board.map((cc, i) => (
                      <React.Fragment key={i}>
                        {renderCard(cc, (i >= (gameSession.prevBoard || 0) ? 'deal ' : ''))}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Seats */}
                  {(() => {
                    const tb = gameSession.table as PokerTable;
                    const n = tb.players.length;
                    const res = tb.results;
                    const showdown = tb.phase === 'done' && res && !res.uncontested;
                    const winSeats = res
                      ? new Set<number>(res.winners.map((w: any) => (typeof w === 'number' ? w : w.seat)))
                      : new Set<number>();
                    const winCards = new Set();
                    if (showdown) {
                      for (const s of winSeats) {
                        const h = res.hands?.[s];
                        if (h) h.cards?.forEach((cc: CardModel) => winCards.add(cardStr(cc)));
                      }
                    }

                    return tb.players.map((p, i) => {
                      const k = (i - gameSession.hero + n) % n;
                      const a = ((90 + (k * 360) / n) * Math.PI) / 180;
                      const pos = {
                        x: 50 + 43 * Math.cos(a),
                        y: 50 + 41 * Math.sin(a),
                        bx: 50 + 27 * Math.cos(a),
                        by: 47 + 24 * Math.sin(a),
                        dx: 50 + 32 * Math.cos(a + 0.28),
                        dy: 48 + 29 * Math.sin(a + 0.28),
                      };

                      if (!p) {
                        return (
                          <div
                            key={i}
                            className="seat"
                            style={{ left: `${pos.x}%`, top: `${pos.y}%`, opacity: 0.35 }}
                          >
                            <div className="box" style={{ gridTemplateColumns: '1fr', textAlign: 'center' }}>
                              <span className="nm">Open seat</span>
                            </div>
                          </div>
                        );
                      }

                      const isHero = i === gameSession.hero;
                      const reveal = isHero || (showdown && p.dealt && !p.folded);
                      const isActing = tb.toAct === i && tb.phase === 'betting';
                      const isFolded = p.folded || (!p.dealt && tb.phase !== 'idle');
                      const isWinner = tb.phase === 'done' && winSeats.has(i);

                      let hn = '';
                      if (isHero && p.dealt && tb.board.length >= 3) {
                        try {
                          hn = bestHand(p.cards, tb.board, tb.v).name || '';
                          if (tb.v.hilo) {
                            const lo = bestLow(p.cards, tb.board);
                            if (lo) hn += ' · ' + lo.name;
                          }
                        } catch (_) {}
                      }
                      if (showdown && res.hands && res.hands[i] && !isHero) {
                        hn = res.hands[i].name || '';
                      }

                      const last = tb.phase === 'done' && isWinner ? 'WIN' : p.last;
                      const fmt = (x: number) =>
                        tb.cfg.unit === 100 ? money(x, gameSession.cur) : x.toLocaleString();

                      return (
                        <React.Fragment key={i}>
                          <div
                            className={`seat ${isHero ? 'hero' : ''} ${tb.v.hole === 5 ? 'omaha5' : ''} ${
                              isActing ? 'act' : ''
                            } ${isFolded ? 'folded' : ''} ${isWinner ? 'winner' : ''}`}
                            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                          >
                            <div className="cards">
                              {p.dealt && (!p.folded || isHero)
                                ? p.cards.map((cc, cIdx) => (
                                    <React.Fragment key={cIdx}>
                                      {renderCard(
                                        reveal ? cc : null,
                                        showdown && isWinner
                                          ? winCards.has(cardStr(cc))
                                            ? 'win'
                                            : 'dim'
                                          : isHero && p.folded
                                          ? 'dim'
                                          : ''
                                      )}
                                    </React.Fragment>
                                  ))
                                : null}
                            </div>
                            <div className="box">
                              {last ? (
                                <span
                                  className="lastact"
                                  style={{ color: last === 'WIN' ? 'var(--good)' : undefined }}
                                >
                                  {last}
                                </span>
                              ) : null}
                              <div className="av" style={{ background: avColor(p.name) }}>
                                {p.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="nm">{p.name}</div>
                              <div className="st money">
                                {p.stack === 0 && p.allIn ? 'All-in' : fmt(p.stack)}
                              </div>
                              {isHero && isActing ? <div className="timer" style={{ width: '100%' }} /> : null}
                            </div>
                            <div className="handname">{hn}</div>
                          </div>

                          {p.bet > 0 && (
                            <div className="bet money" style={{ left: `${pos.bx}%`, top: `${pos.by}%` }}>
                              <span className="chip" />
                              {fmt(p.bet)}
                            </div>
                          )}

                          {i === tb.button && tb.phase !== 'idle' && (
                            <div className="dealer" style={{ left: `${pos.dx}%`, top: `${pos.dy}%` }}>
                              D
                            </div>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>

                {/* Action Bar */}
                <div className="actionbar">
                  {(() => {
                    const tb = gameSession.table as PokerTable;
                    const heroP = tb.players[gameSession.hero];
                    const L = tb.legal(gameSession.hero);
                    const fmt = (x: number) =>
                      tb.cfg.unit === 100 ? (x / 100).toFixed(2) : x.toLocaleString();

                    if (!L) {
                      const inHand =
                        heroP && heroP.dealt && !heroP.folded && !heroP.allIn && tb.phase === 'betting';
                      return (
                        <>
                          {inHand && (
                            <div className="preacts">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={gameSession.pre?.checkFold || false}
                                  onChange={(e) => {
                                    if (gameSession.pre) {
                                      gameSession.pre.checkFold = e.target.checked;
                                      if (e.target.checked) gameSession.pre.callAny = false;
                                      refreshTable();
                                    }
                                  }}
                                />{' '}
                                Check/fold
                              </label>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={gameSession.pre?.callAny || false}
                                  onChange={(e) => {
                                    if (gameSession.pre) {
                                      gameSession.pre.callAny = e.target.checked;
                                      if (e.target.checked) gameSession.pre.checkFold = false;
                                      refreshTable();
                                    }
                                  }}
                                />{' '}
                                Call any
                              </label>
                            </div>
                          )}
                          {inHand && gameSession.kind === 'blitz' && (
                            <button className="act fold" onClick={blitzFold}>
                              Fast fold
                            </button>
                          )}
                          {!inHand && (
                            <span className="muted">
                              {tb.phase === 'done'
                                ? 'Next hand starting…'
                                : heroP && heroP.folded
                                ? 'You folded this hand'
                                : heroP && heroP.allIn
                                ? 'You are all-in'
                                : 'Waiting…'}
                            </span>
                          )}
                        </>
                      );
                    }

                    const SizerControl = () => {
                      const [raiseAmt, setRaiseAmt] = useState(L.raise?.minTo || 0);
                      const minTo = L.raise?.minTo || 0;
                      const maxTo = L.raise?.maxTo || 0;
                      const pot = tb.potTotal();
                      const at = (f: number) =>
                        Math.max(minTo, Math.min(maxTo, Math.round(tb.currentBet + f * (pot + L.toCall))));
                      const presets: [string, number][] =
                        minTo === maxTo
                          ? []
                          : [
                              ['Min', minTo],
                              ['½ pot', at(0.5)],
                              ['¾ pot', at(0.75)],
                              ['Pot', at(1)],
                              [tb.v.limit === 'NL' ? 'All-in' : 'Max', maxTo],
                            ];

                      return (
                        <>
                          {L.fold && (
                            <button className="act fold" onClick={() => heroAct('fold')}>
                              Fold
                            </button>
                          )}
                          {L.check && (
                            <button className="act" onClick={() => heroAct('check')}>
                              Check
                            </button>
                          )}
                          {L.call > 0 && (
                            <button className="act" onClick={() => heroAct('call')}>
                              Call {fmt(L.call)}
                            </button>
                          )}
                          {L.raise && (
                            <>
                              <div className="sizer">
                                {presets.length > 0 && (
                                  <div className="presets">
                                    {presets.map(([l, v]) => (
                                      <button key={l} onClick={() => setRaiseAmt(v)}>
                                        {l}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <div className="line">
                                  <input
                                    type="range"
                                    min={minTo}
                                    max={maxTo}
                                    step={tb.cfg.unit === 100 ? 1 : 5}
                                    value={raiseAmt}
                                    onChange={(e) => setRaiseAmt(+e.target.value)}
                                  />
                                  <input
                                    type="number"
                                    min={minTo}
                                    max={maxTo}
                                    value={tb.cfg.unit === 100 ? (raiseAmt / 100).toFixed(2) : raiseAmt}
                                    onChange={(e) =>
                                      setRaiseAmt(
                                        tb.cfg.unit === 100
                                          ? Math.round(+e.target.value * 100)
                                          : +e.target.value
                                      )
                                    }
                                  />
                                </div>
                              </div>
                              <button
                                className="act raise"
                                onClick={() => heroAct('raise', raiseAmt)}
                              >
                                {raiseAmt === maxTo && tb.v.limit === 'NL'
                                  ? 'All-in'
                                  : tb.currentBet === 0
                                  ? 'Bet ' + fmt(raiseAmt)
                                  : 'Raise to ' + fmt(raiseAmt)}
                              </button>
                            </>
                          )}
                        </>
                      );
                    };

                    return <SizerControl />;
                  })()}
                </div>
              </div>

              {/* Side Panels (Hand Log & Table Info) */}
              <aside className="side">
                <div className="tabs">
                  <button
                    className={sidePane === 'log' ? 'on' : ''}
                    onClick={() => setSidePane('log')}
                  >
                    Hand log
                  </button>
                  <button
                    className={sidePane === 'info' ? 'on' : ''}
                    onClick={() => setSidePane('info')}
                  >
                    Table info
                  </button>
                </div>
                {sidePane === 'log' ? (
                  <div className="pane">
                    {(gameSession.table as PokerTable).log.join('\n')}
                  </div>
                ) : (
                  <div className="pane prose">
                    <h3>{VARIANTS[gameSession.def.v as VariantCode].name}</h3>
                    <p>
                      {{
                        NLH: 'Two hole cards, five community cards. Bet any amount up to your stack.',
                        FLH: 'Two hole cards. Bets and raises are fixed: one small bet pre-flop and flop, one big bet turn and river.',
                        PLO4: 'Four hole cards. You must use exactly two of them with three from the board.',
                        PLO5: 'Five hole cards, pot-limit. Exactly two hole cards plus three board cards make your hand.',
                        PLO8: 'Four hole cards, pot-limit. The pot is split between the best high hand and qualifying low (8 or lower).',
                        SD: 'Deck of 36 cards (6 through Ace). Everyone antes, button posts a blind. Flush beats full house; trips beat straight.',
                      }[gameSession.def.v as VariantCode]}
                    </p>
                    <h3 style={{ marginTop: 14 }}>Fair shuffle</h3>
                    <p>
                      Before each hand the server commits to a SHA-256 hash of the shuffle seed. The seed is revealed after the hand so anyone can confirm the deck was cryptographically fixed before dealing.
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </section>

      {/* Modal Dialog */}
      <div
        className={`poker-modal ${modalContent ? 'on' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget && !modalLocked) closeModal();
        }}
      >
        <div className={`dlg ${modalWide ? 'wide' : ''}`}>
          {modalContent}
        </div>
      </div>

      {/* Toast Notification */}
      <div className={`poker-toast ${toastMessage ? 'on' : ''}`} role="status">
        {toastMessage}
      </div>
    </div>
  );
}
