import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Gift, RotateCw, Sparkles } from "lucide-react";
import commonSoundUrl from "../assets/sounds/common.ogg";
import epicSoundUrl from "../assets/sounds/epic.ogg";
import legendarySoundUrl from "../assets/sounds/legendary.ogg";
import rareSoundUrl from "../assets/sounds/rare.ogg";
import type { Rarity } from "../entities/game";
import { useCountdown } from "../hooks/useCountdown";
import { Button } from "../shared/ui/Button";
import { CardRevealOverlay } from "../shared/ui/CardRevealOverlay";
import { Loader } from "../shared/ui/Loader";
import { useGameStore } from "../store/gameStore";

const soundMap: Partial<Record<Rarity, string>> = {
  Common: commonSoundUrl,
  Rare: rareSoundUrl,
  Epic: epicSoundUrl,
  Legendary: legendarySoundUrl,
};

const confettiColors: Record<Rarity, string[]> = {
  Common: ["#a9b4c2", "#f4f7fb"],
  Uncommon: ["#36d792", "#a8ffd6"],
  Rare: ["#3f8cff", "#9ed0ff"],
  Epic: ["#9b5cff", "#d7b5ff"],
  Legendary: ["#ffcf5a", "#ff8c32", "#fff0a3"],
};

function playRewardSound(rarity: Rarity) {
  const url = soundMap[rarity];

  if (!url) return;

  const audio = new Audio(url);
  audio.volume = 0.45;
  void audio.play().catch(() => undefined);
}

function fireRewardConfetti(rarity: Rarity) {
  const colors = confettiColors[rarity];
  const burstCount = rarity === "Legendary" ? 220 : rarity === "Epic" ? 170 : 125;

  void confetti({
    particleCount: burstCount,
    spread: rarity === "Legendary" ? 88 : 68,
    origin: { y: 0.62 },
    colors,
    scalar: rarity === "Legendary" ? 1.12 : 0.96,
  });

  if (rarity === "Legendary") {
    void confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.72 },
      colors,
    });
    void confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.72 },
      colors,
    });
  }
}

export function HomePage() {
  const entryStatus = useGameStore((state) => state.entryStatus);
  const claimStatus = useGameStore((state) => state.claimStatus);
  const nextClaimAt = useGameStore((state) => state.nextClaimAt);
  const spinsBalance = useGameStore((state) => state.spinsBalance);
  const lastCard = useGameStore((state) => state.lastCard);
  const claimCard = useGameStore((state) => state.claimCard);
  const clearLastCard = useGameStore((state) => state.clearLastCard);
  const countdown = useCountdown(nextClaimAt);
  const isBusy = claimStatus === "loading";

  useEffect(() => {
    if (!lastCard) return;

    playRewardSound(lastCard.rarity);
    fireRewardConfetti(lastCard.rarity);
  }, [lastCard]);

  async function handleClaim(type: "free" | "paid") {
    await claimCard(type);
  }

  return (
    <div className="page page--home">
      <header className="topbar">
        <div>
          <span className="eyebrow">MineCards</span>
          <h1>Коллекция шахтёра</h1>
        </div>
      </header>

      <section className="claim-panel">
        {entryStatus === "loading" ? (
          <Loader label="Загружаем профиль" />
        ) : (
          <>
            <div className="timer-block">
              <span>Следующая бесплатная крутка</span>
              <strong>{countdown.label}</strong>
            </div>

            <div className="progress-track" aria-label="Прогресс кулдауна">
              <span style={{ width: `${countdown.progress * 100}%` }} />
            </div>

            <Button
              className="claim-button"
              disabled={!countdown.isReady || isBusy}
              icon={isBusy ? <RotateCw className="spin" size={18} /> : <Gift size={18} />}
              onClick={() => void handleClaim("free")}
            >
              {isBusy ? "Открываем" : "Собрать карточку"}
            </Button>

            <Button
              variant="secondary"
              disabled={spinsBalance <= 0 || isBusy}
              icon={<Sparkles size={18} />}
              onClick={() => void handleClaim("paid")}
            >
              Донатная крутка: {spinsBalance}
            </Button>
          </>
        )}
      </section>

      <section className="stats-row" aria-label="Сводка">
        <div>
          <span>Баланс</span>
          <strong>{spinsBalance}</strong>
        </div>
        <div>
          <span>Статус</span>
          <strong>{countdown.isReady ? "Ready" : "Cooldown"}</strong>
        </div>
      </section>

      {lastCard ? (
        <CardRevealOverlay card={lastCard} onClose={clearLastCard} />
      ) : null}
    </div>
  );
}
