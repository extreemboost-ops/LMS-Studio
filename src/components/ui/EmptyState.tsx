import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, text, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div>
        <Icon size={24} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {actionLabel && onAction && (
        <button className="btn secondary" onClick={onAction} style={{ marginTop: 12 }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
