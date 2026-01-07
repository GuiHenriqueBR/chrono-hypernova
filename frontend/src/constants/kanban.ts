export interface PipelineColumn {
  key: string;
  label: string;
  color: string; // "blue", "red", etc.
}

export const COLOR_MAP: Record<
  string,
  { color: string; bgColor: string; borderColor: string }
> = {
  slate: {
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-300",
  },
  blue: {
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
  },
  violet: {
    color: "text-violet-600",
    bgColor: "bg-violet-100",
    borderColor: "border-violet-300",
  },
  amber: {
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
  },
  emerald: {
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300",
  },
  red: {
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
  },
  pink: {
    color: "text-pink-600",
    bgColor: "bg-pink-100",
    borderColor: "border-pink-300",
  },
  cyan: {
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
    borderColor: "border-cyan-300",
  },
  orange: {
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-300",
  },
};

export const DEFAULT_COLUMNS: PipelineColumn[] = [
  { key: "nova", label: "Novas", color: "slate" },
  { key: "em_cotacao", label: "Em Cotação", color: "blue" },
  { key: "enviada", label: "Enviadas", color: "violet" },
  { key: "em_negociacao", label: "Em Negociação", color: "amber" },
  { key: "fechada_ganha", label: "Ganhas", color: "emerald" },
  { key: "fechada_perdida", label: "Perdidas", color: "red" },
];

export { DEFAULT_COLUMNS as PIPELINE_COLUMNS };
