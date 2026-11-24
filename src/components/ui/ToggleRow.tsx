import { useState } from "react";

interface ToggleRowProps {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export function ToggleRow({ label, checked = false, onChange }: ToggleRowProps) {
  const [on, setOn] = useState(checked);

  const toggle = () => {
    const next = !on;
    setOn(next);
    onChange?.(next);
  };

  return (
    <div className="toggle-row">
      <span>{label}</span>
      <button onClick={toggle} className={`switch ${on ? "on" : ""}`} type="button" aria-pressed={on}>
        <i />
      </button>
    </div>
  );
}
