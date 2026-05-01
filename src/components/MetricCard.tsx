type AccentColor = "teal" | "red" | "blue" | "purple" | "slate";

const accentStyles: Record<
  AccentColor,
  { border: string; label: string; value: string }
> = {
  teal: {
    border: "border-teal-700/40",
    label: "text-teal-400",
    value: "text-teal-200",
  },
  red: {
    border: "border-red-700/40",
    label: "text-red-400",
    value: "text-red-200",
  },
  blue: {
    border: "border-blue-700/40",
    label: "text-blue-400",
    value: "text-blue-200",
  },
  purple: {
    border: "border-purple-700/40",
    label: "text-purple-400",
    value: "text-purple-200",
  },
  slate: {
    border: "border-slate-700/40",
    label: "text-slate-400",
    value: "text-slate-200",
  },
};

interface MetricCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: string;
  accent?: AccentColor;
  className?: string;
}

export default function MetricCard({
  label,
  value,
  description,
  icon,
  accent = "slate",
  className = "",
}: MetricCardProps) {
  const styles = accentStyles[accent];
  return (
    <div
      className={[
        "rounded-2xl bg-gray-800/60 border p-5",
        styles.border,
        className,
      ].join(" ")}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-xl">{icon}</span>}
        <p className={["text-xs font-semibold uppercase tracking-widest", styles.label].join(" ")}>
          {label}
        </p>
      </div>
      <p className={["text-3xl font-extrabold", styles.value].join(" ")}>{value}</p>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
}
