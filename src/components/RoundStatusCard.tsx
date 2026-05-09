type RoundStatus = "pending" | "active" | "complete";

interface Round {
  id: string;
  name: string;
  order: number;
}

interface RoundStatusCardProps {
  round: Round;
  status?: RoundStatus;
  className?: string;
}

const statusStyles: Record<
  RoundStatus,
  { badge: string; border: string; text: string }
> = {
  pending: {
    badge: "bg-slate-700 text-slate-400",
    border: "border-slate-700/30",
    text: "text-slate-400",
  },
  active: {
    badge: "bg-teal-700/60 text-teal-300",
    border: "border-teal-600/50",
    text: "text-white",
  },
  complete: {
    badge: "bg-gray-700 text-gray-400",
    border: "border-gray-700/30",
    text: "text-gray-400",
  },
};

const statusLabels: Record<RoundStatus, string> = {
  pending: "Pending",
  active: "● Live",
  complete: "✓ Complete",
};

export default function RoundStatusCard({
  round,
  status = "pending",
  className = "",
}: RoundStatusCardProps) {
  const styles = statusStyles[status];
  return (
    <div
      className={[
        "rounded-xl bg-gray-800/60 border p-4 flex items-center justify-between",
        styles.border,
        className,
      ].join(" ")}
    >
      <div>
        <p className="text-xs text-gray-500 mb-0.5">Round {round.order}</p>
        <p className={["font-semibold", styles.text].join(" ")}>{round.name}</p>
      </div>
      <span
        className={[
          "text-xs font-semibold px-2.5 py-1 rounded-full",
          styles.badge,
        ].join(" ")}
      >
        {statusLabels[status]}
      </span>
    </div>
  );
}
