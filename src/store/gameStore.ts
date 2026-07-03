import { create } from "zustand";
import type {
  ApiClient,
  Card,
  LoadStatus,
  Player,
  ToastMessage,
  UserCard,
} from "../entities/game";
import { getApiClient, getCurrentPlayer } from "../shared/api/client";

interface GameState {
  api: ApiClient;
  player: Player;
  entryStatus: LoadStatus;
  cardsStatus: LoadStatus;
  claimStatus: LoadStatus;
  adminStatus: LoadStatus;
  error?: string;
  nextClaimAt?: string;
  spinsBalance: number;
  cards: UserCard[];
  lastCard?: Card;
  toast?: ToastMessage;
  initialize: () => Promise<void>;
  loadCards: () => Promise<void>;
  claimCard: (type: "free" | "paid") => Promise<void>;
  rewardUser: (telegramId: string, count: number) => Promise<void>;
  rewardAll: (count: number) => Promise<void>;
  dismissToast: () => void;
  clearLastCard: () => void;
}

function createToast(
  tone: ToastMessage["tone"],
  title: string,
  description?: string,
): ToastMessage {
  return {
    id: Date.now(),
    tone,
    title,
    description,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Неизвестная ошибка";
}

export const useGameStore = create<GameState>((set, get) => {
  const player = getCurrentPlayer();

  return {
    api: getApiClient(player),
    player,
    entryStatus: "idle",
    cardsStatus: "idle",
    claimStatus: "idle",
    adminStatus: "idle",
    spinsBalance: 0,
    cards: [],

    async initialize() {
      set({ entryStatus: "loading", error: undefined });

      try {
        const entry = await get().api.entry(get().player);

        set({
          entryStatus: "success",
          nextClaimAt: entry.nextClaimAt,
          spinsBalance: entry.spinsBalance,
        });
      } catch (error) {
        set({
          entryStatus: "error",
          error: errorMessage(error),
          toast: createToast("error", "Не удалось загрузить профиль", errorMessage(error)),
        });
      }
    },

    async loadCards() {
      set({ cardsStatus: "loading", error: undefined });

      try {
        const cards = await get().api.getUserCards(get().player);

        set({ cardsStatus: "success", cards });
      } catch (error) {
        set({
          cardsStatus: "error",
          error: errorMessage(error),
          toast: createToast("error", "Коллекция не загрузилась", errorMessage(error)),
        });
      }
    },

    async claimCard(type) {
      set({ claimStatus: "loading", error: undefined });

      try {
        const response = await get().api.claim(get().player, type);
        const entry = await get().api.entry(get().player);

        set({
          claimStatus: "success",
          nextClaimAt: entry.nextClaimAt,
          spinsBalance: entry.spinsBalance,
          lastCard: response.card,
        });
      } catch (error) {
        set({
          claimStatus: "error",
          error: errorMessage(error),
          toast: createToast("error", "Крутка не выполнена", errorMessage(error)),
        });
      }
    },

    async rewardUser(telegramId, count) {
      set({ adminStatus: "loading", error: undefined });

      try {
        const message = await get().api.rewardUser({ telegramId, count });
        const entry = await get().api.entry(get().player);

        set({
          adminStatus: "success",
          spinsBalance: entry.spinsBalance,
          toast: createToast("success", "Операция выполнена", message),
        });
      } catch (error) {
        set({
          adminStatus: "error",
          error: errorMessage(error),
          toast: createToast("error", "Админ-запрос отклонён", errorMessage(error)),
        });
      }
    },

    async rewardAll(count) {
      set({ adminStatus: "loading", error: undefined });

      try {
        const message = await get().api.rewardAll(count);
        const entry = await get().api.entry(get().player);

        set({
          adminStatus: "success",
          spinsBalance: entry.spinsBalance,
          toast: createToast("success", "Массовая выдача готова", message),
        });
      } catch (error) {
        set({
          adminStatus: "error",
          error: errorMessage(error),
          toast: createToast("error", "Массовая выдача не выполнена", errorMessage(error)),
        });
      }
    },

    dismissToast() {
      set({ toast: undefined });
    },

    clearLastCard() {
      set({ lastCard: undefined });
    },
  };
});
