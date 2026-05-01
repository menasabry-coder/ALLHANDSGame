type Role = "Participant" | "Presenter" | "Admin";

const roleStyles: Record<Role, string> = {
  Participant:
    "bg-teal-900/60 text-teal-300 border border-teal-700/50",
  Presenter:
    "bg-blue-900/60 text-blue-300 border border-blue-700/50",
  Admin:
    "bg-purple-900/60 text-purple-300 border border-purple-700/50",
};

const roleIcons: Record<Role, string> = {
  Participant: "👤",
  Presenter: "📽️",
  Admin: "⚙️",
};

interface RoleBadgeProps {
  role: Role;
  className?: string;
}

export default function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        roleStyles[role],
        className,
      ].join(" ")}
    >
      <span>{roleIcons[role]}</span>
      {role}
    </span>
  );
}
