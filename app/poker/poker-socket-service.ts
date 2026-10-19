import { io, Socket } from "socket.io-client";
import { getStoredSessionToken } from "../api-client";
import type { PokerLiveState, PokerLobbyTable, PokerChatMessage } from "./poker-live-types";

const RAW_SOCKET_HOST =
  process.env.NEXT_PUBLIC_POKER_SOCKET_URL ||
  (process.env.NEXT_PUBLIC_POKER_API_URL
    ? process.env.NEXT_PUBLIC_POKER_API_URL.replace(/\/api\/v1\/?$/, "")
    : "https://api.bet888cash.com");

export const POKER_SOCKET_HOST = RAW_SOCKET_HOST.replace(/\/+$/, "");

export interface SocketAckResult<T = any> {
  data: T;
  errors: Array<{ code: string; message: string; errorCode?: number }>;
}

export type StateListener = (state: PokerLiveState) => void;
export type BalanceListener = (balance: number) => void;
export type ErrorListener = (err: { code: string; message: string; errorCode?: number }) => void;
export type ChatListener = (chat: PokerChatMessage) => void;
export type ClosedListener = (info: { tableId: number; reason: string }) => void;
export type LobbyUpdateListener = (update: { tables: PokerLobbyTable[]; removed: number[] }) => void;
export type ConnectErrorListener = (err: Error) => void;

class PokerSocketService {
  private socket: Socket | null = null;
  private joinedTables = new Map<number, string | undefined>();
  private isLobbySubscribed = false;

  private stateListeners = new Map<number, Set<StateListener>>();
  private balanceListeners = new Set<BalanceListener>();
  private errorListeners = new Set<ErrorListener>();
  private chatListeners = new Map<number, Set<ChatListener>>();
  private closedListeners = new Set<ClosedListener>();
  private lobbyUpdateListeners = new Set<LobbyUpdateListener>();
  private connectErrorListeners = new Set<ConnectErrorListener>();

  public getSocket(): Socket | null {
    return this.socket;
  }

  public isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return (
      getStoredSessionToken() ||
      localStorage.getItem("tig_session_token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      null
    );
  }

  public connect(explicitToken?: string): Socket {
    const accessToken = explicitToken || this.getToken();

    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    const socketUrl = `${POKER_SOCKET_HOST}/poker`;

    this.socket = io(socketUrl, {
      path: "/api/poker-socket",
      transports: ["websocket"],
      auth: { accessToken },
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      // Re-send join for every open table after each reconnect per Spec 6.3
      for (const [tableId, code] of this.joinedTables.entries()) {
        this.emitWithAck("join", { tableId, code }).catch(() => {});
      }

      if (this.isLobbySubscribed) {
        this.emitWithAck("lobby:subscribe", {}).catch(() => {});
      }
    });

    this.socket.on("connect_error", (err: any) => {
      console.warn("[PokerSocket] Connect error:", err?.message || err);
      for (const listener of this.connectErrorListeners) {
        listener(err);
      }
    });

    this.socket.on("state", (state: PokerLiveState) => {
      if (!state || typeof state.id !== "number") return;
      const listeners = this.stateListeners.get(state.id);
      if (listeners) {
        for (const cb of listeners) {
          try {
            cb(state);
          } catch (e) {
            console.error("[PokerSocket] State listener error:", e);
          }
        }
      }
    });

    this.socket.on("balance", (newBalance: number) => {
      if (typeof newBalance === "number") {
        for (const cb of this.balanceListeners) {
          cb(newBalance);
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("wallet_balance_updated", { detail: { balance: newBalance } })
          );
        }
      }
    });

    this.socket.on("err", (errPayload: { code: string; message: string; errorCode?: number }) => {
      for (const cb of this.errorListeners) {
        cb(errPayload);
      }
    });

    this.socket.on("chat", (chatMsg: PokerChatMessage) => {
      const tableId = chatMsg.tableId;
      if (typeof tableId === "number") {
        const listeners = this.chatListeners.get(tableId);
        if (listeners) {
          for (const cb of listeners) cb(chatMsg);
        }
      } else {
        // Broadcast to all chat listeners if no tableId specified
        for (const set of this.chatListeners.values()) {
          for (const cb of set) cb(chatMsg);
        }
      }
    });

    this.socket.on("closed", (closedEvt: { tableId: number; reason: string }) => {
      this.joinedTables.delete(closedEvt.tableId);
      for (const cb of this.closedListeners) {
        cb(closedEvt);
      }
    });

    this.socket.on("lobby:update", (update: { tables: PokerLobbyTable[]; removed: number[] }) => {
      for (const cb of this.lobbyUpdateListeners) {
        cb(update);
      }
    });

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.joinedTables.clear();
    this.isLobbySubscribed = false;
  }

  private emitWithAck<T = any>(event: string, payload: any): Promise<SocketAckResult<T>> {
    return new Promise((resolve, reject) => {
      const s = this.socket || this.connect();
      s.emit(event, payload, (res: SocketAckResult<T>) => {
        if (!res) {
          resolve({ data: {} as T, errors: [] });
          return;
        }
        if (res.errors && res.errors.length > 0) {
          // Trigger global err listeners
          for (const err of res.errors) {
            for (const cb of this.errorListeners) cb(err);
          }
        }
        resolve(res);
      });
    });
  }

  // ===================== Table Actions =====================

  public async joinTable(tableId: number, code?: string): Promise<SocketAckResult<{ tableId: number; seat: number }>> {
    this.joinedTables.set(tableId, code);
    return this.emitWithAck("join", { tableId, code });
  }

  public async leaveTable(tableId: number): Promise<SocketAckResult<{}>> {
    this.joinedTables.delete(tableId);
    return this.emitWithAck("leave", { tableId });
  }

  public async sit(
    tableId: number,
    seat: number,
    buyIn: number
  ): Promise<SocketAckResult<{ seat: number; stack: number }>> {
    return this.emitWithAck("sit", { tableId, seat, buyIn });
  }

  public async action(
    tableId: number,
    type: "fold" | "check" | "call" | "raise" | "allin",
    amount?: number,
    handNo?: number
  ): Promise<SocketAckResult<{} | { ignored: boolean }>> {
    const payload: Record<string, any> = { tableId, type };
    if (amount != null && !isNaN(amount)) payload.amount = amount;
    if (handNo != null && !isNaN(handNo)) payload.handNo = handNo;
    return this.emitWithAck("action", payload);
  }

  public async stand(tableId: number): Promise<SocketAckResult<{}>> {
    return this.emitWithAck("stand", { tableId });
  }

  public async topup(tableId: number, amount: number): Promise<SocketAckResult<{ stack: number }>> {
    return this.emitWithAck("topup", { tableId, amount });
  }

  public async sitout(tableId: number): Promise<SocketAckResult<{}>> {
    return this.emitWithAck("sitout", { tableId });
  }

  public async sitin(tableId: number): Promise<SocketAckResult<{}>> {
    return this.emitWithAck("sitin", { tableId });
  }

  public async sendChat(tableId: number, text: string): Promise<SocketAckResult<{}>> {
    const trimmed = text.slice(0, 200).trim();
    if (!trimmed) return { data: {}, errors: [] };
    return this.emitWithAck("chat", { tableId, text: trimmed });
  }

  // ===================== Lobby Subscriptions =====================

  public async subscribeLobby(): Promise<SocketAckResult<{}>> {
    this.isLobbySubscribed = true;
    return this.emitWithAck("lobby:subscribe", {});
  }

  public async unsubscribeLobby(): Promise<SocketAckResult<{}>> {
    this.isLobbySubscribed = false;
    return this.emitWithAck("lobby:unsubscribe", {});
  }

  // ===================== Event Subscriptions =====================

  public onState(tableId: number, cb: StateListener): () => void {
    if (!this.stateListeners.has(tableId)) {
      this.stateListeners.set(tableId, new Set());
    }
    this.stateListeners.get(tableId)!.add(cb);
    return () => {
      const set = this.stateListeners.get(tableId);
      if (set) {
        set.delete(cb);
        if (set.size === 0) this.stateListeners.delete(tableId);
      }
    };
  }

  public onBalance(cb: BalanceListener): () => void {
    this.balanceListeners.add(cb);
    return () => {
      this.balanceListeners.delete(cb);
    };
  }

  public onError(cb: ErrorListener): () => void {
    this.errorListeners.add(cb);
    return () => {
      this.errorListeners.delete(cb);
    };
  }

  public onChat(tableId: number, cb: ChatListener): () => void {
    if (!this.chatListeners.has(tableId)) {
      this.chatListeners.set(tableId, new Set());
    }
    this.chatListeners.get(tableId)!.add(cb);
    return () => {
      const set = this.chatListeners.get(tableId);
      if (set) {
        set.delete(cb);
        if (set.size === 0) this.chatListeners.delete(tableId);
      }
    };
  }

  public onClosed(cb: ClosedListener): () => void {
    this.closedListeners.add(cb);
    return () => {
      this.closedListeners.delete(cb);
    };
  }

  public onLobbyUpdate(cb: LobbyUpdateListener): () => void {
    this.lobbyUpdateListeners.add(cb);
    return () => {
      this.lobbyUpdateListeners.delete(cb);
    };
  }

  public onConnectError(cb: ConnectErrorListener): () => void {
    this.connectErrorListeners.add(cb);
    return () => {
      this.connectErrorListeners.delete(cb);
    };
  }
}

export const pokerSocketService = new PokerSocketService();
