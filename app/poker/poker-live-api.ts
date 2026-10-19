import { getStoredSessionToken } from "../api-client";
import type {
  PokerLobbyTable,
  PokerSessionItem,
  PokerHandSummaryItem,
  PokerHandDetail,
  PokerApiErrorDetail,
} from "./poker-live-types";

const RAW_API_HOST =
  process.env.NEXT_PUBLIC_POKER_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.bet888cash.com/api/v1";

// Ensure clean base url without trailing slash
export const POKER_API_BASE = RAW_API_HOST.replace(/\/+$/, "");

export interface ApiResponse<T> {
  data: T;
  errors: any;
  error?: string;
  statusCode?: number;
}

export interface UserDetailsResponse {
  userId: number;
  username: string;
  isCasinoEnabled?: boolean;
  isPokerEnabled: boolean;
  [key: string]: any;
}

export interface TablesResponseData {
  tables: PokerLobbyTable[];
  seatedTableIds: number[];
}

export interface CreatePrivateTableData {
  table: {
    id: number;
    name: string;
    feeType: "RAKE";
    rakePercent: number;
    rakeCap: number;
    sb: number;
    bb: number;
    minBuyIn: number;
    maxBuyIn: number;
    maxSeats: number;
    private: boolean;
    inviteCode: string;
    players: number;
    status: "open" | "paused";
  };
}

export interface SessionsResponseData {
  count?: number;
  pageNo: number;
  limit: number;
  sessions: PokerSessionItem[];
}

export interface HandsResponseData {
  pageNo: number;
  limit: number;
  hands: PokerHandSummaryItem[];
}

export interface HandDetailResponseData {
  hand: PokerHandDetail;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    getStoredSessionToken() ||
    localStorage.getItem("tig_session_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    null
  );
}

async function pokerFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ data: T | null; error: PokerApiErrorDetail | null }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string>),
    };

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${POKER_API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const json: any = await res.json().catch(() => null);

    if (!res.ok || (json && json.errors && !Array.isArray(json.errors) && Object.keys(json.errors).length > 0)) {
      const errObj: PokerApiErrorDetail =
        json?.errors && typeof json.errors === "object" && !Array.isArray(json.errors)
          ? json.errors
          : {
              statusCode: res.status,
              error: json?.errors?.[0]?.code || json?.error || `HTTP_${res.status}`,
              message: json?.errors?.[0]?.message || json?.message || `Request failed (${res.status})`,
            };
      return { data: null, error: errObj };
    }

    return { data: (json?.data ?? json) as T, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: {
        statusCode: 0,
        error: "NETWORK_ERROR",
        message: err?.message || "Network request failed",
      },
    };
  }
}

export const pokerLiveApi = {
  /**
   * Check user status and whether Poker Live is enabled
   * GET /user
   */
  async getUserDetails(): Promise<{ user: UserDetailsResponse | null; error: PokerApiErrorDetail | null }> {
    const res = await pokerFetch<UserDetailsResponse>("/user");
    return { user: res.data, error: res.error };
  },

  /**
   * List open public tables and caller's own private tables
   * GET /poker/tables
   */
  async getTables(): Promise<{
    tables: PokerLobbyTable[];
    seatedTableIds: number[];
    error: PokerApiErrorDetail | null;
  }> {
    const res = await pokerFetch<TablesResponseData>("/poker/tables");
    if (res.data) {
      return {
        tables: Array.isArray(res.data.tables) ? res.data.tables : [],
        seatedTableIds: Array.isArray(res.data.seatedTableIds) ? res.data.seatedTableIds : [],
        error: null,
      };
    }
    return {
      tables: [],
      seatedTableIds: [],
      error: res.error,
    };
  },

  /**
   * Create a private table ("Table for friends")
   * POST /poker/private-tables
   */
  async createPrivateTable(params: {
    name: string;
    sb: number;
    bb: number;
    maxSeats: number;
  }): Promise<{ table: CreatePrivateTableData["table"] | null; error: PokerApiErrorDetail | null }> {
    const res = await pokerFetch<CreatePrivateTableData>("/poker/private-tables", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return { table: res.data?.table ?? null, error: res.error };
  },

  /**
   * Join a private table with invite code
   * POST /poker/private-tables/join
   */
  async joinPrivateTable(code: string): Promise<{ tableId: number | null; error: PokerApiErrorDetail | null }> {
    const res = await pokerFetch<{ tableId: number }>("/poker/private-tables/join", {
      method: "POST",
      body: JSON.stringify({ code: code.trim() }),
    });
    return { tableId: res.data?.tableId ?? null, error: res.error };
  },

  /**
   * Close a private table (owner only)
   * DELETE /poker/private-tables/:id
   */
  async closePrivateTable(tableId: number): Promise<{ success: boolean; error: PokerApiErrorDetail | null }> {
    const res = await pokerFetch<{ success: boolean; tableId: number }>(`/poker/private-tables/${tableId}`, {
      method: "DELETE",
    });
    return { success: Boolean(res.data?.success), error: res.error };
  },

  /**
   * Get user's poker sessions history
   * GET /poker/me/sessions
   */
  async getMySessions(
    pageNo: number = 1,
    limit: number = 20
  ): Promise<{
    sessions: PokerSessionItem[];
    count: number;
    pageNo: number;
    limit: number;
    error: PokerApiErrorDetail | null;
  }> {
    const res = await pokerFetch<SessionsResponseData>(`/poker/me/sessions?pageNo=${pageNo}&limit=${limit}`);
    return {
      sessions: res.data?.sessions || [],
      count: res.data?.count || 0,
      pageNo: res.data?.pageNo || pageNo,
      limit: res.data?.limit || limit,
      error: res.error,
    };
  },

  /**
   * Get user's poker hands history
   * GET /poker/me/hands
   */
  async getMyHands(
    pageNo: number = 1,
    limit: number = 20
  ): Promise<{
    hands: PokerHandSummaryItem[];
    pageNo: number;
    limit: number;
    error: PokerApiErrorDetail | null;
  }> {
    const res = await pokerFetch<HandsResponseData>(`/poker/me/hands?pageNo=${pageNo}&limit=${limit}`);
    return {
      hands: res.data?.hands || [],
      pageNo: res.data?.pageNo || pageNo,
      limit: res.data?.limit || limit,
      error: res.error,
    };
  },

  /**
   * Get single hand replay / details
   * GET /poker/me/hands/:id
   */
  async getMyHandDetails(handId: number | string): Promise<{
    hand: PokerHandDetail | null;
    error: PokerApiErrorDetail | null;
  }> {
    const res = await pokerFetch<HandDetailResponseData>(`/poker/me/hands/${handId}`);
    return {
      hand: res.data?.hand ?? null,
      error: res.error,
    };
  },
};
