import React, { ReactNode } from "react";

interface PropertySectionProps {
  title: string;
  children: ReactNode;
}

export function PropertySection({ title, children }: PropertySectionProps) {
  return (
    <section className="property-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
