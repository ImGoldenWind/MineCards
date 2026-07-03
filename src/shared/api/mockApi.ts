import creeperSparkUrl from "../../assets/images/cards/creeper-spark.svg";
import diamondSentinelUrl from "../../assets/images/cards/diamond-sentinel.svg";
import enderCrownUrl from "../../assets/images/cards/ender-crown.svg";
import netherArchitectUrl from "../../assets/images/cards/nether-architect.svg";
import redstoneCourierUrl from "../../assets/images/cards/redstone-courier.svg";
import type {
  AdminRewardPayload,
  ApiClient,
  Card,
  Player,
  UserCard,
} from "../../entities/game";

const MOCK_STORAGE_KEY = "minecards_mock_collection";
const MOCK_COOLDOWN_KEY = "minecards_mock_next_claim";
const MOCK_SPINS_KEY = "minecards_mock_spins";

const mockCards: Card[] = [
  {
    id: 1,
    name: "Creeper Spark",
    rarity: "Common",
    imageUrl: creeperSparkUrl,
  },
  {
    id: 2,
    name: "Redstone Courier",
    rarity: "Uncommon",
    imageUrl: redstoneCourierUrl,
  },
  {
    id: 3,
    name: "Diamond Sentinel",
    rarity: "Rare",
    imageUrl: diamondSentinelUrl,
  },
  {
    id: 4,
    name: "Nether Architect",
    rarity: "Epic",
    imageUrl: netherArchitectUrl,
  },
  {
    id: 5,
    name: "Ender Crown",
    rarity: "Legendary",
    imageUrl: enderCrownUrl,
  },
];

const mockCardById = new Map(mockCards.map((card) => [card.id, card]));

function delay<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(value), ms));
}

function readCollection(): UserCard[] {
  const raw = localStorage.getItem(MOCK_STORAGE_KEY);

  if (!raw) return [];

  try {
    const cards = JSON.parse(raw) as UserCard[];

    return cards.map((card) => ({
      ...card,
      imageUrl: mockCardById.get(card.id)?.imageUrl ?? card.imageUrl,
    }));
  } catch {
    return [];
  }
}

function writeCollection(cards: UserCard[]): void {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(cards));
}

function pickCard(): Card {
  const roll = Math.random();

  if (roll > 0.985) return mockCards[4];
  if (roll > 0.91) return mockCards[3];
  if (roll > 0.72) return mockCards[2];
  if (roll > 0.42) return mockCards[1];

  return mockCards[0];
}

export const mockApi: ApiClient = {
  async entry(_player: Player) {
    const nextClaimAt =
      localStorage.getItem(MOCK_COOLDOWN_KEY) ?? new Date().toISOString();
    const spinsBalance = Number(localStorage.getItem(MOCK_SPINS_KEY) ?? 2);

    return delay({ nextClaimAt, spinsBalance });
  },

  async claim(_player: Player, type) {
    if (type === "paid") {
      const spins = Number(localStorage.getItem(MOCK_SPINS_KEY) ?? 2);

      if (spins <= 0) {
        throw new Error("Недостаточно донатных круток");
      }

      localStorage.setItem(MOCK_SPINS_KEY, String(spins - 1));
    }

    const card = pickCard();
    const collection = readCollection();
    const existing = collection.find((item) => item.id === card.id);

    if (existing) {
      existing.count += 1;
    } else {
      collection.push({ ...card, count: 1 });
    }

    writeCollection(collection);

    if (type === "free") {
      localStorage.setItem(
        MOCK_COOLDOWN_KEY,
        new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      );
    }

    return delay({ card });
  },

  async getUserCards(_player: Player) {
    return delay(readCollection());
  },

  async rewardUser(payload: AdminRewardPayload) {
    const current = Number(localStorage.getItem(MOCK_SPINS_KEY) ?? 2);
    localStorage.setItem(MOCK_SPINS_KEY, String(current + payload.count));

    return delay(`Выдано ${payload.count} круток пользователю ${payload.telegramId}`);
  },

  async rewardAll(count: number) {
    const current = Number(localStorage.getItem(MOCK_SPINS_KEY) ?? 2);
    localStorage.setItem(MOCK_SPINS_KEY, String(current + count));

    return delay(`Выдано ${count} круток всем игрокам демо-среды`);
  },
};
