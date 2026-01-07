import type { ReactNode } from "react";

interface TimelineItemProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  date?: string;
  status?: "completed" | "current" | "pending" | "error" | "warning";
  children?: ReactNode;
}

interface TimelineProps {
  children: ReactNode;
  className?: string;
}

export function Timeline({ children, className = "" }: TimelineProps) {
  return (
    <div className={`relative pl-8 ${className}`}>
      <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-slate-200" />
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export function TimelineItem({
  title,
  description,
  date,
  status = "completed",
  children,
}: TimelineItemProps) {
  const statusStyles = {
    completed: "bg-emerald-500 border-emerald-500 text-white",
    current: "bg-violet-500 border-violet-500 text-white",
    pending: "bg-white border-slate-300 text-slate-400",
    error: "bg-red-500 border-red-500 text-white",
    warning: "bg-amber-500 border-amber-500 text-white",
  };

  return (
    <div className="relative">
      {/* Dot */}
      <div
        className={`absolute -left-[23px] w-4 h-4 rounded-full border-4 ${statusStyles[status]}`}
      />

      {/* Content */}
      <div>
        <div className="flex items-start justify-between mb-1">
          <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
          {date && <span className="text-xs text-slate-500">{date}</span>}
        </div>

        {description && (
          <div className="text-sm text-slate-600 mb-2">{description}</div>
        )}

        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  );
}
