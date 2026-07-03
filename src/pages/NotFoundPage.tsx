import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { EmptyState } from "../shared/ui/EmptyState";

export function NotFoundPage() {
  return (
    <div className="page page--center">
      <EmptyState
        title="Страница не найдена"
        description="Такого раздела в Mini App нет."
        action={
          <Link className="button button--primary" to="/">
            <Home size={18} />
            <span>
            На главную
            </span>
          </Link>
        }
      />
    </div>
  );
}
