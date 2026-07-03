import { FormEvent, useState } from "react";
import { Send, Users } from "lucide-react";
import { Button } from "../shared/ui/Button";
import { ConfirmDialog } from "../shared/ui/ConfirmDialog";
import { Input } from "../shared/ui/Input";
import { Loader } from "../shared/ui/Loader";
import { useGameStore } from "../store/gameStore";

interface FormErrors {
  telegramId?: string;
  count?: string;
  massCount?: string;
}

function validateCount(value: number): string | undefined {
  if (!Number.isFinite(value) || value <= 0) return "Введите число больше 0";
  if (value > 1000) return "Максимум 1000 за одну операцию";

  return undefined;
}

export function AdminPage() {
  const adminStatus = useGameStore((state) => state.adminStatus);
  const rewardUser = useGameStore((state) => state.rewardUser);
  const rewardAll = useGameStore((state) => state.rewardAll);
  const [telegramId, setTelegramId] = useState("");
  const [count, setCount] = useState("1");
  const [massCount, setMassCount] = useState("1");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  async function handleRewardUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {
      telegramId: /^\d{5,}$/.test(telegramId) ? undefined : "Telegram ID должен быть числом",
      count: validateCount(Number(count)),
    };

    setErrors(nextErrors);

    if (nextErrors.telegramId || nextErrors.count) return;

    await rewardUser(telegramId, Number(count));
  }

  function handleMassSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {
      massCount: validateCount(Number(massCount)),
    };

    setErrors(nextErrors);

    if (nextErrors.massCount) return;

    setIsConfirmOpen(true);
  }

  async function confirmRewardAll() {
    setIsConfirmOpen(false);
    await rewardAll(Number(massCount));
  }

  return (
    <div className="page page--admin">
      <header className="page-header">
        <span className="eyebrow">Backoffice</span>
        <h1>Админ-панель</h1>
      </header>

      <div className="admin-grid">
        <form className="form-panel" onSubmit={(event) => void handleRewardUser(event)}>
          <h2>Выдать игроку</h2>
          <Input
            label="Telegram ID"
            value={telegramId}
            onChange={(event) => setTelegramId(event.target.value)}
            error={errors.telegramId}
            inputMode="numeric"
            placeholder="7212088382"
          />
          <Input
            label="Количество круток"
            value={count}
            onChange={(event) => setCount(event.target.value)}
            error={errors.count}
            type="number"
            min={1}
          />
          <Button disabled={adminStatus === "loading"} icon={<Send size={18} />}>
            Выдать
          </Button>
        </form>

        <form className="form-panel" onSubmit={handleMassSubmit}>
          <h2>Массовая выдача</h2>
          <Input
            label="Круток всем"
            value={massCount}
            onChange={(event) => setMassCount(event.target.value)}
            error={errors.massCount}
            type="number"
            min={1}
          />
          <Button variant="danger" disabled={adminStatus === "loading"} icon={<Users size={18} />}>
            Выдать всем
          </Button>
        </form>
      </div>

      {adminStatus === "loading" ? <Loader label="Отправляем запрос" /> : null}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Подтвердите выдачу"
        description={`Выдать ${massCount} круток всем игрокам?`}
        confirmLabel="Выдать"
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => void confirmRewardAll()}
      />
    </div>
  );
}
