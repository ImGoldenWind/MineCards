import type { Rarity } from "../../entities/game";
import { rarityLabels } from "../lib/rarity";

interface BadgeProps {
  rarity: Rarity;
}

export function Badge({ rarity }: BadgeProps) {
  return <span className={`badge badge--${rarity.toLowerCase()}`}>{rarityLabels[rarity]}</span>;
}
