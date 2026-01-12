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
    success: "bg-success-50 text-success-700 border-success-200/60",
    warning: "bg-warning-50 text-warning-700 border-warning-200/60",
    error: "bg-error-50 text-error-700 border-error-200/60",
    info: "bg-info-50 text-info-700 border-info-200/60",
    neutral: "bg-neutral-50 text-neutral-700 border-neutral-200/60",
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
