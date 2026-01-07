import { type LucideIcon, CheckCircle2, Circle, Clock } from "lucide-react";
import type { ReactNode } from "react";

interface Step {
  id: string;
  label: string;
  status: "completed" | "current" | "pending";
  icon?: LucideIcon;
}

interface StatusStepperProps {
  steps: Step[];
  className?: string;
}

export function StatusStepper({ steps, className = "" }: StatusStepperProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200">
          <div
            className="h-full bg-violet-500 transition-all duration-500"
            style={{
              width: `${
                (steps.filter((s) => s.status === "completed").length /
                  (steps.length - 1)) *
                100
              }%`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                {/* Circle */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-300 relative z-10
                    ${
                      step.status === "completed"
                        ? "bg-emerald-500 text-white"
                        : step.status === "current"
                        ? "bg-violet-500 text-white"
                        : "bg-white border-2 border-slate-300 text-slate-400"
                    }
                  `}
                >
                  {step.status === "completed" && !Icon && (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                  {step.status === "pending" && !Icon && (
                    <Circle className="w-5 h-5" />
                  )}
                  {step.status === "current" && !Icon && (
                    <Clock className="w-5 h-5 animate-pulse" />
                  )}
                  {Icon && <Icon className="w-5 h-5" />}
                </div>

                {/* Label */}
                <div className="text-center">
                  <p
                    className={`
                      text-xs font-medium transition-colors
                      ${
                        step.status === "completed"
                          ? "text-emerald-600"
                          : step.status === "current"
                          ? "text-violet-600"
                          : "text-slate-500"
                      }
                    `}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface VerticalStepperProps {
  steps: Step[];
  children?: ReactNode;
  className?: string;
}

export function VerticalStepper({
  steps,
  children,
  className = "",
}: VerticalStepperProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {steps.map((step) => {
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex gap-4">
            {/* Circle */}
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center
                shrink-0 transition-all
                ${
                  step.status === "completed"
                    ? "bg-emerald-500 text-white"
                    : step.status === "current"
                    ? "bg-violet-500 text-white"
                    : "bg-white border-2 border-slate-300 text-slate-400"
                }
              `}
            >
              {step.status === "completed" && !Icon && (
                <CheckCircle2 className="w-5 h-5" />
              )}
              {step.status === "pending" && !Icon && (
                <Circle className="w-4 h-4" />
              )}
              {step.status === "current" && !Icon && (
                <Clock className="w-4 h-4 animate-pulse" />
              )}
              {Icon && <Icon className="w-4 h-4" />}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <p
                className={`
                  text-sm font-medium transition-colors
                  ${
                    step.status === "completed"
                      ? "text-emerald-600"
                      : step.status === "current"
                      ? "text-violet-600"
                      : "text-slate-700"
                  }
                `}
              >
                {step.label}
              </p>
            </div>
          </div>
        );
      })}

      {children}
    </div>
  );
}
