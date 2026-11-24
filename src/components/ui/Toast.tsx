import { CheckCircle2, X } from "lucide-react";

interface ToastProps {
  message: string;
  onClose?: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  return (
    <div className={`toast ${message ? "show" : ""}`}>
      <CheckCircle2 size={18} />
      <span>{message}</span>
      <button onClick={onClose} aria-label="Close notification" type="button">
        <X size={15} />
      </button>
    </div>
  );
}
