import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { 
  FocoDoDiaResponse, 
  PipelineVendasResponse, 
  MetricasConversaoResponse 
} from "../types";

interface DashboardStats {
  clientes: {
    total: number;
    ativos: number;
    pf?: number;
    pj?: number;
  };
  apolices: {
    total: number;
    vigentes: number;
    vencidas?: number;
    vencendo: number;
    premioTotal?: number;
  };
  sinistros: {
    total: number;
    abertos: number;
    em_regulacao?: number;
    pagos: number;
    recusados?: number;
  };
}

interface Activity {
  id: string;
  type: "cliente" | "apolice" | "sinistro" | "financeiro";
  action: string;
  name: string;
  timestamp: string;
}

interface UpcomingRenewal {
  id: string;
  cliente: string;
  apolice: string;
  numero?: string;
  vencimento: string;
  dias: number;
  valor?: number;
}

interface ChartDataItem {
  label: string;
  value: number;
  color?: string;
}

interface DashboardCharts {
  apolicesPorRamo: ChartDataItem[];
  totalApolices: number;
  sinistrosMensais: ChartDataItem[];
  comissoesMensais: ChartDataItem[];
  premiosMensais: ChartDataItem[];
}

// GET - Stats do Dashboard (agregado)
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const [clientesRes, apolicesRes, sinistrosRes] = await Promise.all([
        api.get("/clientes/stats/summary"),
        api.get("/apolices/stats/summary"),
        api.get("/sinistros/stats/summary"),
      ]);

      return {
        clientes: clientesRes as DashboardStats["clientes"],
        apolices: apolicesRes as DashboardStats["apolices"],
        sinistros: sinistrosRes as DashboardStats["sinistros"],
      };
    },
    staleTime: 30000, // 30 seconds cache
  });
}

// GET - Dados dos graficos do Dashboard
export function useDashboardCharts() {
  return useQuery<DashboardCharts>({
    queryKey: ["dashboard-charts"],
    queryFn: async (): Promise<DashboardCharts> => {
      const response = await api.get("/dashboard/charts");
      return response as DashboardCharts;
    },
    staleTime: 60000, // 1 minute cache
  });
}

// GET - Atividades recentes (usando endpoint dedicado)
export function useRecentActivities() {
  return useQuery<Activity[]>({
    queryKey: ["recent-activities"],
    queryFn: async () => {
      const response = await api.get("/dashboard/atividades?limit=5");
      return response as Activity[];
    },
    staleTime: 60000, // 1 minute cache
  });
}

// GET - Renovacoes proximas (usando endpoint dedicado)
export function useUpcomingRenewals() {
  return useQuery<UpcomingRenewal[]>({
    queryKey: ["upcoming-renewals"],
    queryFn: async () => {
      const response = await api.get("/dashboard/renovacoes?limit=5");
      return response as UpcomingRenewal[];
    },
    staleTime: 60000, // 1 minute cache
  });
}

// ============================================
// NOVOS HOOKS - CRM Pipeline & Foco do Dia
// ============================================

// GET - Foco do Dia (Smart Feed de itens urgentes)
export function useFocoDoDia() {
  return useQuery<FocoDoDiaResponse>({
    queryKey: ["foco-do-dia"],
    queryFn: async () => {
      const response = await api.get("/dashboard/foco-do-dia");
      return response as FocoDoDiaResponse;
    },
    staleTime: 30000, // 30 seconds - needs to be fresh
    refetchInterval: 60000, // Auto-refresh every minute
  });
}

// GET - Pipeline de Vendas (Kanban de cotações)
export function usePipelineVendas() {
  return useQuery<PipelineVendasResponse>({
    queryKey: ["pipeline-vendas"],
    queryFn: async () => {
      const response = await api.get("/dashboard/pipeline-vendas");
      return response as PipelineVendasResponse;
    },
    staleTime: 30000,
  });
}

// GET - Métricas de Conversão
export function useMetricasConversao(periodo: number = 30) {
  return useQuery<MetricasConversaoResponse>({
    queryKey: ["metricas-conversao", periodo],
    queryFn: async () => {
      const response = await api.get(`/dashboard/metricas-conversao?periodo=${periodo}`);
      return response as MetricasConversaoResponse;
    },
    staleTime: 60000,
  });
}
