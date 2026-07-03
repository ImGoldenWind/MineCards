import type { Rarity } from "../../entities/game";

export const RARITIES: Rarity[] = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
];

export const rarityLabels: Record<Rarity, string> = {
  Common: "Обычная",
  Uncommon: "Необычная",
  Rare: "Редкая",
  Epic: "Эпическая",
  Legendary: "Легендарная",
};

export const rarityOrder: Record<Rarity, number> = {
  Legendary: 1,
  Epic: 2,
  Rare: 3,
  Uncommon: 4,
  Common: 5,
};

export function normalizeRarity(value: string): Rarity {
  const normalized = value.trim().toLowerCase();

  if (normalized === "legendary") return "Legendary";
  if (normalized === "epic") return "Epic";
  if (normalized === "rare") return "Rare";
  if (normalized === "uncommon") return "Uncommon";

  return "Common";
}
