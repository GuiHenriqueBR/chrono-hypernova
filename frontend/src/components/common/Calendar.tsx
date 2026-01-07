import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MessageSquare,
  CheckCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export interface CalendarEvent {
  id: string;
  tipo: "tarefa" | "followup" | "renovacao";
  titulo: string;
  subtitulo?: string;
  data: string;
  cor: "red" | "amber" | "emerald" | "violet" | "cyan" | "slate";
  concluido: boolean;
  prioridade?: string;
  cliente?: string;
}

interface CalendarProps {
  events: CalendarEvent[];
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onMonthChange?: (start: Date, end: Date) => void;
  selectedDate?: Date | null;
  isLoading?: boolean;
}

const corClasses: Record<string, { bg: string; text: string; dot: string }> = {
  red: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  emerald: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  violet: {
    bg: "bg-violet-100",
    text: "text-violet-700",
    dot: "bg-violet-500",
  },
  cyan: { bg: "bg-cyan-100", text: "text-cyan-700", dot: "bg-cyan-500" },
  slate: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500" },
};

const tipoIcons: Record<string, React.ElementType> = {
  tarefa: CheckCircle,
  followup: MessageSquare,
  renovacao: RefreshCw,
};

export default function Calendar({
  events,
  onDateSelect,
  onEventClick,
  onMonthChange,
  selectedDate,
  isLoading = false,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");

  // Calculate month boundaries for API calls
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(monthStart, { locale: ptBR });
    const end = endOfWeek(monthEnd, { locale: ptBR });
    const days: Date[] = [];
    let day = start;

    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [monthStart, monthEnd]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const dateKey = event.data;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(startOfMonth(newMonth), endOfMonth(newMonth));
  };

  const goToNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(startOfMonth(newMonth), endOfMonth(newMonth));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onMonthChange?.(startOfMonth(today), endOfMonth(today));
    onDateSelect?.(today);
  };

  // Week days header
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800 capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
          >
            Hoje
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                view === "month"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                view === "week"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Semana
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Week days header */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`py-3 text-center text-xs font-semibold uppercase tracking-wide ${
              index === 0 || index === 6 ? "text-slate-400" : "text-slate-600"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={index}
              onClick={() => onDateSelect?.(day)}
              className={`
                min-h-[100px] p-2 border-b border-r border-slate-100 cursor-pointer transition-colors
                ${!isCurrentMonth ? "bg-slate-50/50" : "bg-white"}
                ${
                  isSelected
                    ? "bg-violet-50 ring-2 ring-violet-500 ring-inset"
                    : ""
                }
                ${!isSelected && isCurrentMonth ? "hover:bg-slate-50" : ""}
              `}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`
                    w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium
                    ${isTodayDate ? "bg-violet-600 text-white" : ""}
                    ${
                      !isTodayDate && isCurrentMonth
                        ? "text-slate-800"
                        : "text-slate-400"
                    }
                    ${isWeekend && !isTodayDate ? "text-slate-400" : ""}
                  `}
                >
                  {format(day, "d")}
                </span>
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    +{dayEvents.length - 3}
                  </span>
                )}
              </div>

              {/* Events (max 3 visible) */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => {
                  const cor = corClasses[event.cor] || corClasses.slate;
                  const Icon = tipoIcons[event.tipo] || CalendarIcon;

                  return (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className={`
                        px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1
                        ${cor.bg} ${cor.text}
                        ${event.concluido ? "opacity-50 line-through" : ""}
                        hover:opacity-80 transition-opacity cursor-pointer
                      `}
                      title={event.titulo}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      <span className="truncate">{event.titulo}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-t border-slate-200 flex items-center gap-4 flex-wrap">
        <span className="text-xs text-slate-500 font-medium">Legenda:</span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-slate-600">Alta Prioridade</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs text-slate-600">Media Prioridade</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-xs text-slate-600">Follow-up</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-cyan-500" />
          <span className="text-xs text-slate-600">Renovacao</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-600">Concluido</span>
        </div>
      </div>
    </div>
  );
}
