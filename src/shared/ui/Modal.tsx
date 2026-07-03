import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  title: string;
  isOpen: boolean;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ title, isOpen, children, onClose }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal__panel">
        <div className="modal__header">
          <h2>{title}</h2>
          <Button variant="ghost" icon={<X size={18} />} onClick={onClose} aria-label="Закрыть">
            Закрыть
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
