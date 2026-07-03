import { useEffect } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { Home, Library, Shield } from "lucide-react";
import { ADMIN_TELEGRAM_ID } from "../entities/game";
import { AdminPage } from "../pages/AdminPage";
import { CardsPage } from "../pages/CardsPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { Toast } from "../shared/ui/Toast";
import { useGameStore } from "../store/gameStore";

export function App() {
  const initialize = useGameStore((state) => state.initialize);
  const player = useGameStore((state) => state.player);
  const toast = useGameStore((state) => state.toast);
  const dismissToast = useGameStore((state) => state.dismissToast);
  const isAdmin = !player.isMock && player.telegramId === ADMIN_TELEGRAM_ID;

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
    void initialize();
  }, [initialize]);

  return (
    <main className="shell">
      <section className="app-frame">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/cards" element={<CardsPage />} />
          {isAdmin ? <Route path="/admin" element={<AdminPage />} /> : null}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        <nav className="bottom-nav" aria-label="Основная навигация">
          <NavLink to="/" className="nav-link" aria-label="Главная">
            <Home size={21} />
          </NavLink>
          <NavLink to="/cards" className="nav-link" aria-label="Коллекция">
            <Library size={21} />
          </NavLink>
          {isAdmin ? (
            <NavLink to="/admin" className="nav-link" aria-label="Админ-панель">
              <Shield size={21} />
            </NavLink>
          ) : null}
        </nav>
      </section>

      <Toast toast={toast} onClose={dismissToast} />
    </main>
  );
}
