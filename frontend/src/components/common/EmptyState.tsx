import type { ReactNode } from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        py-16 px-8
        text-center
        ${className}
      `}
    >
      {icon && (
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-slate-500 max-w-md mb-6">{description}</p>
      )}

      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}
