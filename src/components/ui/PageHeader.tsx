import React, { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children && <div className="header-actions">{children}</div>}
    </div>
  );
}
