import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-primary-600 to-primary-500 
    hover:from-primary-500 hover:to-primary-400
    text-white shadow-lg shadow-primary-500/25
    border border-primary-400/20
  `,
  secondary: `
    bg-gradient-to-r from-secondary-600 to-secondary-500 
    hover:from-secondary-500 hover:to-secondary-400
    text-white shadow-lg shadow-secondary-500/25
    border border-secondary-400/20
  `,
  danger: `
    bg-gradient-to-r from-danger-600 to-danger-500 
    hover:from-danger-500 hover:to-danger-400
    text-white shadow-lg shadow-danger-500/25
    border border-danger-400/20
  `,
  ghost: `
    bg-transparent hover:bg-neutral-100
    text-neutral-600 hover:text-neutral-900
    border border-transparent
  `,
  outline: `
    bg-transparent hover:bg-neutral-50
    text-neutral-600 hover:text-neutral-900
    border border-neutral-200 hover:border-neutral-300
  `,
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center
          font-medium rounded-xl
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-white
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]}
          ${sizes[size]}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}

        {children}

        {rightIcon && !isLoading && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
