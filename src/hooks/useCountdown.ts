import { useEffect, useMemo, useState } from "react";
import { COOLDOWN_MS } from "../entities/game";
import { clamp, formatCountdown } from "../shared/lib/format";

export function useCountdown(nextClaimAt?: string) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => {
    const target = nextClaimAt ? new Date(nextClaimAt).getTime() : now;
    const remainingMs = Math.max(0, target - now);
    const isReady = remainingMs <= 0;
    const progress = clamp(1 - remainingMs / COOLDOWN_MS);

    return {
      isReady,
      remainingMs,
      progress,
      label: isReady ? "Готово к сбору" : formatCountdown(remainingMs),
    };
  }, [nextClaimAt, now]);
}
