import { useEffect, useState, type CSSProperties, type PointerEvent } from "react";
import cardBackUrl from "../../assets/images/card-back.jpg";
import type { Card } from "../../entities/game";

interface CardRevealOverlayProps {
  card: Card;
  onClose: () => void;
}

export function CardRevealOverlay({ card, onClose }: CardRevealOverlayProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const flipTimer = window.setTimeout(() => setIsFlipped(true), 220);

    function handleOrientation(event: DeviceOrientationEvent) {
      const gamma = event.gamma ?? 0;
      const beta = event.beta ?? 0;

      setTilt({
        x: Math.max(-10, Math.min(10, (beta - 45) / 4)),
        y: Math.max(-14, Math.min(14, gamma)),
      });
    }

    window.addEventListener("deviceorientation", handleOrientation);

    return () => {
      window.clearTimeout(flipTimer);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    setTilt({ x: y * -10, y: x * 14 });
  }

  function resetTilt() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      className="reward-overlay"
      role="button"
      tabIndex={0}
      aria-label="Закрыть карточку"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " " || event.key === "Escape") {
          onClose();
        }
      }}
    >
      <div
        className={`reward-card reward-card--${card.rarity.toLowerCase()}`}
        onClick={(event) => event.stopPropagation()}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        style={
          {
            "--tilt-x": `${tilt.x}deg`,
            "--tilt-y": `${tilt.y}deg`,
          } as CSSProperties
        }
      >
        <div className={`reward-card__tilt ${isFlipped ? "is-flipped" : ""}`}>
          <div className="reward-card__inner">
            <div className="reward-card__side reward-card__back">
              <img src={cardBackUrl} alt="Рубашка карты" />
            </div>
            <div className="reward-card__side reward-card__front">
              <img src={card.imageUrl || cardBackUrl} alt={card.name} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
