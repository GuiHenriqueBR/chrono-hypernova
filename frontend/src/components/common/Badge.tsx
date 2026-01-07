import { HTMLAttributes } from "react";

interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "size"> {
  variant?: "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md" | "lg";
}

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  className = "",
  ...rest
}: BadgeProps) {
  const variantStyles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    warning: "bg-amber-50 text-amber-700 border-amber-200/60",
    error: "bg-red-50 text-red-700 border-red-200/60",
    info: "bg-blue-50 text-blue-700 border-blue-200/60",
    neutral: "bg-slate-50 text-slate-700 border-slate-200/60",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] font-medium",
    md: "px-2.5 py-1 text-xs font-medium",
    lg: "px-3 py-1.5 text-sm font-medium",
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-lg border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...rest}
    >
      {children}
    </span>
  );
}
