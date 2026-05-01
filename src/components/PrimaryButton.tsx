import React from "react";

interface PrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "danger" | "secondary";
  size?: "sm" | "md" | "lg";
}

const variantClasses: Record<NonNullable<PrimaryButtonProps["variant"]>, string> =
  {
    default: "bg-blue-600 hover:bg-blue-500 text-white",
    danger: "bg-red-600 hover:bg-red-500 text-white",
    secondary: "bg-gray-700 hover:bg-gray-600 text-gray-200",
  };

const sizeClasses: Record<NonNullable<PrimaryButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-8 py-3 text-base",
};

export default function PrimaryButton({
  variant = "default",
  size = "md",
  className = "",
  disabled,
  children,
  ...rest
}: PrimaryButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={[
        "rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
        variantClasses[variant],
        sizeClasses[size],
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
