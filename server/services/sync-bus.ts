import { EventEmitter } from "node:events";

export type SyncEntityType =
  | "rooms"
  | "game"
  | "jackpots"
  | "promotions"
  | "banners"
  | "chat"
  | "wallet"
  | "tournaments"
  | "players"
  | "settings"
  | "announcement"
  | "all";

export interface SyncEvent<T = unknown> {
  id: string;
  revision: number;
  timestamp: string;
  entity: SyncEntityType;
  action: string;
  roomId?: string;
  data?: T;
  message?: string;
}

class SyncBus extends EventEmitter {
  private revision = 1;
  private history: SyncEvent[] = [];

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  get currentRevision(): number {
    return this.revision;
  }

  public emitChange<T = unknown>(
    entity: SyncEntityType,
    action: string,
    data?: T,
    roomId?: string,
    message?: string,
  ): SyncEvent<T> {
    this.revision += 1;
    const event: SyncEvent<T> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      revision: this.revision,
      timestamp: new Date().toISOString(),
      entity,
      action,
      roomId,
      data,
      message,
    };

    this.history.unshift(event);
    if (this.history.length > 100) {
      this.history.pop();
    }

    this.emit("change", event);
    return event;
  }

  public getHistory(sinceRevision = 0): SyncEvent[] {
    if (!sinceRevision) return this.history.slice(0, 30);
    return this.history.filter((e) => e.revision > sinceRevision);
  }
}

export const syncBus = new SyncBus();
