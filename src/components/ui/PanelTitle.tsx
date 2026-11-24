import { ChevronRight } from "lucide-react";

interface PanelTitleProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function PanelTitle({ title, action, onAction }: PanelTitleProps) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      {action && (
        <button onClick={onAction}>
          {action}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
