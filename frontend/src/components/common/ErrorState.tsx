import { type LucideIcon, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: LucideIcon;
  className?: string;
}

export function ErrorState({
  title = "Ops! Algo deu errado",
  description = "Ocorreu um erro ao carregar os dados. Por favor, tente novamente.",
  action,
  icon: Icon = AlertCircle,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        py-16 px-8
        text-center
        ${className}
      `}
    >
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-red-500" />
      </div>

      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-slate-500 max-w-md mb-6">{description}</p>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
