import type { Card, EntryResponse, UserCard } from "../../entities/game";
import { normalizeRarity } from "../lib/rarity";

interface ApiCard {
  id: number | string;
  name: string;
  rarity: string;
  image_url?: string;
  image?: string;
  count?: number | string;
}

interface ApiEntryResponse {
  next_claim_at: string;
  spins_balance: number | string;
}

export function mapCard(card: ApiCard): Card {
  return {
    id: Number(card.id),
    name: card.name,
    rarity: normalizeRarity(card.rarity),
    imageUrl: card.image_url ?? card.image ?? "",
  };
}

export function mapUserCard(card: ApiCard): UserCard {
  return {
    ...mapCard(card),
    count: Number(card.count ?? 1),
  };
}

export function mapEntryResponse(response: ApiEntryResponse): EntryResponse {
  return {
    nextClaimAt: response.next_claim_at,
    spinsBalance: Number(response.spins_balance),
  };
}
