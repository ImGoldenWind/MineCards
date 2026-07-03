import { CheckCircle2, Info, XCircle } from "lucide-react";
import type { ToastMessage } from "../../entities/game";

interface ToastProps {
  toast?: ToastMessage;
  onClose: () => void;
}

const icons = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
};

export function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;

  return (
    <button className={`toast toast--${toast.tone}`} onClick={onClose} type="button">
      {icons[toast.tone]}
      <span>
        <strong>{toast.title}</strong>
        {toast.description ? <small>{toast.description}</small> : null}
      </span>
    </button>
  );
}
