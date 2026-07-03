import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Rarity, UserCard } from "../entities/game";
import { rarityLabels, rarityOrder, RARITIES } from "../shared/lib/rarity";
import { Badge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { CardRevealOverlay } from "../shared/ui/CardRevealOverlay";
import { EmptyState } from "../shared/ui/EmptyState";
import { Input } from "../shared/ui/Input";
import { Loader } from "../shared/ui/Loader";
import { Select } from "../shared/ui/Select";
import { useGameStore } from "../store/gameStore";

type SortMode = "rarity" | "name" | "count";
type RarityFilter = "all" | Rarity;

export function CardsPage() {
  const cards = useGameStore((state) => state.cards);
  const cardsStatus = useGameStore((state) => state.cardsStatus);
  const loadCards = useGameStore((state) => state.loadCards);
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<RarityFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("rarity");
  const [selectedCard, setSelectedCard] = useState<UserCard | undefined>();

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  const filteredCards = useMemo(() => {
    return cards
      .filter((card) => {
        const matchesQuery = card.name.toLowerCase().includes(query.toLowerCase().trim());
        const matchesRarity = rarity === "all" || card.rarity === rarity;

        return matchesQuery && matchesRarity;
      })
      .sort((a, b) => {
        if (sortMode === "name") return a.name.localeCompare(b.name, "ru");
        if (sortMode === "count") return b.count - a.count;

        return rarityOrder[a.rarity] - rarityOrder[b.rarity];
      });
  }, [cards, query, rarity, sortMode]);

  return (
    <div className="page page--cards">
      <header className="page-header">
        <span className="eyebrow">Инвентарь</span>
        <h1>Мои карточки</h1>
      </header>

      <div className="toolbar">
        <Input
          label="Поиск"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Название карты"
        />
        <Select
          label="Редкость"
          value={rarity}
          onChange={(event) => setRarity(event.target.value as RarityFilter)}
          options={[
            { label: "Все", value: "all" },
            ...RARITIES.map((item) => ({ label: rarityLabels[item], value: item })),
          ]}
        />
        <Select
          label="Сортировка"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
          options={[
            { label: "По редкости", value: "rarity" },
            { label: "По имени", value: "name" },
            { label: "По количеству", value: "count" },
          ]}
        />
      </div>

      {cardsStatus === "loading" ? <Loader label="Загружаем коллекцию" /> : null}

      {cardsStatus === "success" && cards.length === 0 ? (
        <EmptyState
          title="Коллекция пуста"
          description="Соберите первую карточку на главном экране."
        />
      ) : null}

      {cardsStatus === "success" && cards.length > 0 && filteredCards.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description="Измените поиск или фильтр редкости."
          action={
            <Button
              variant="secondary"
              icon={<Search size={18} />}
              onClick={() => {
                setQuery("");
                setRarity("all");
              }}
            >
              Сбросить
            </Button>
          }
        />
      ) : null}

      {filteredCards.length > 0 ? (
        <div className="card-list">
          {filteredCards.map((card) => (
            <button className="collection-card" key={card.id} onClick={() => setSelectedCard(card)}>
              <img src={card.imageUrl} alt={card.name} />
              <span>
                <strong>{card.name}</strong>
                <Badge rarity={card.rarity} />
              </span>
              <em>x{card.count}</em>
            </button>
          ))}
        </div>
      ) : null}

      {selectedCard ? (
        <CardRevealOverlay card={selectedCard} onClose={() => setSelectedCard(undefined)} />
      ) : null}
    </div>
  );
}
