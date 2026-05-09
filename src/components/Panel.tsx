import React from "react";

interface PanelProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

export default function Panel({
  title,
  subtitle,
  children,
  className = "",
  titleClassName = "",
}: PanelProps) {
  return (
    <section
      className={[
        "rounded-2xl bg-gray-800/50 border border-gray-700/40 p-6",
        className,
      ].join(" ")}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h2
              className={[
                "text-lg font-bold text-gray-100",
                titleClassName,
              ].join(" ")}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
