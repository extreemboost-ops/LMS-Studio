interface ProjectThumbProps {
  variant: string;
  compact?: boolean;
}

export function ProjectThumb({ variant, compact = false }: ProjectThumbProps) {
  return (
    <div className={`project-thumb ${variant} ${compact ? "compact" : ""}`}>
      <div className="thumb-top">
        <i />
        <i />
        <i />
      </div>
      <div className="thumb-content">
        <span className="thumb-tag">LEARNING MODULE</span>
        <b>
          {variant === "safety"
            ? "Safety at work"
            : variant === "privacy"
              ? "Your data matters"
              : variant === "customer"
                ? "Customer first"
                : variant === "quiz"
                  ? "Knowledge check"
                  : variant === "leadership"
                    ? "Lead inclusively"
                    : "Stay secure"}
        </b>
        <div>
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}
