import type {
  AdminRewardPayload,
  ApiClient,
  ClaimResponse,
  Player,
  UserCard,
} from "../../entities/game";
import { mapCard, mapEntryResponse, mapUserCard } from "./mappers";
import { mockApi } from "./mockApi";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const API_MODE = import.meta.env.VITE_API_MODE ?? "auto";

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & ApiErrorResponse) : undefined;

  if (!response.ok) {
    throw new Error(data?.message ?? data?.error ?? "Ошибка запроса");
  }

  return data as T;
}

async function postText(url: string, body: unknown): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "Ошибка запроса");
  }

  return text;
}

function telegramHeaders(): HeadersInit {
  const initData = window.Telegram?.WebApp?.initData;

  return initData ? { "X-Telegram-Init-Data": initData } : {};
}

function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...telegramHeaders(),
  };
}

const realApi: ApiClient = {
  async entry(player: Player) {
    const response = await requestJson<{
      next_claim_at: string;
      spins_balance: number | string;
    }>(`${API_BASE}/entry.php`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({}),
    });

    return mapEntryResponse(response);
  },

  async claim(player: Player, type: "free" | "paid"): Promise<ClaimResponse> {
    const response = await requestJson<{
      card: {
        id: number | string;
        name: string;
        rarity: string;
        image_url?: string;
        image?: string;
      };
    }>(`${API_BASE}/claim.php`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ type }),
    });

    return { card: mapCard(response.card) };
  },

  async getUserCards(player: Player): Promise<UserCard[]> {
    const response = await requestJson<
      Array<{
        id: number | string;
        name: string;
        rarity: string;
        image_url?: string;
        count?: number | string;
      }>
    >(`${API_BASE}/get_user_cards.php`, {
      headers: telegramHeaders(),
    });

    return response.map(mapUserCard);
  },

  async rewardUser(payload: AdminRewardPayload) {
    return postText(`${API_BASE}/admin.php`, {
      telegram_id: payload.telegramId,
      count: payload.count,
    });
  },

  async rewardAll(count: number) {
    return postText(`${API_BASE}/admin.php`, {
      mass: "give_all",
      count,
    });
  },
};

export function getCurrentPlayer(): Player {
  const telegramWebApp = window.Telegram?.WebApp;
  const telegramUser = telegramWebApp?.initDataUnsafe?.user;

  if (telegramUser) {
    return {
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      initData: telegramWebApp?.initData,
      isMock: false,
    };
  }

  return {
    telegramId: 0,
    username: "local_preview",
    firstName: "Local",
    isMock: true,
  };
}

export function getApiClient(player: Player): ApiClient {
  if (API_MODE === "mock") return mockApi;
  if (API_MODE === "real") return realApi;

  return player.isMock ? mockApi : realApi;
}
