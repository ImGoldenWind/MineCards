export const ADMIN_TELEGRAM_ID = Number(import.meta.env.VITE_ADMIN_TELEGRAM_ID ?? 0);
export const COOLDOWN_MS = 6 * 60 * 60 * 1000;

export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
export type LoadStatus = "idle" | "loading" | "success" | "error";
export type ToastTone = "success" | "error" | "info";

export interface Player {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  initData?: string;
  isMock: boolean;
}

export interface Card {
  id: number;
  name: string;
  rarity: Rarity;
  imageUrl: string;
}

export interface UserCard extends Card {
  count: number;
}

export interface EntryResponse {
  nextClaimAt: string;
  spinsBalance: number;
}

export interface ClaimResponse {
  card: Card;
}

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

export interface AdminRewardPayload {
  telegramId: string;
  count: number;
}

export interface ApiClient {
  entry(player: Player): Promise<EntryResponse>;
  claim(player: Player, type: "free" | "paid"): Promise<ClaimResponse>;
  getUserCards(player: Player): Promise<UserCard[]>;
  rewardUser(payload: AdminRewardPayload): Promise<string>;
  rewardAll(count: number): Promise<string>;
}
