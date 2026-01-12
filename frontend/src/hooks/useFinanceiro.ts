import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { Comissao, StatusComissao, ComissaoConfiguracao } from "../types";

interface ComissoesResponse {
  data: ComissaoComRelacionamentos[];
  total: number;
}

interface ComissaoComRelacionamentos extends Omit<Comissao, "apolices"> {
  apolices: {
    numero_apolice: string;
    ramo: string;
    seguradora: string;
    clientes: {
      nome: string;
    };
  };
}

interface FinanceiroStats {
  receitaMes: number;
  comissoesPendentes: number;
  totalRecebido: number;
  valorPendente: number;
}

interface ComissoesFilters {
  status?: StatusComissao | "todos";
  apolice_id?: string;
  mes?: string; // formato YYYY-MM
  inicio?: string; // YYYY-MM-DD
  fim?: string; // YYYY-MM-DD
}

interface CreateComissaoData {
  apolice_id: string;
  valor_bruto: number;
  valor_liquido: number;
  data_receita: string;
  status?: StatusComissao;
}

interface ComissaoConfigFilters {
  seguradora?: string;
  ramo?: string;
  ativo?: boolean;
}

interface ComissaoConfigResponse {
  data: ComissaoConfiguracao[];
  total: number;
}

interface CreateComissaoConfigData {
  seguradora: string;
  ramo: string;
  percentual_comissao: number;
  percentual_repasse?: number;
  percentual_imposto?: number;
  observacoes?: string;
  ativo?: boolean;
}

interface CalcularComissaoResponse {
  message: string;
  comissao: Comissao;
  calculo: {
    premio: number;
    percentual_comissao: number;
    valor_bruto: number;
    percentual_repasse: number;
    valor_repasse: number;
    percentual_imposto: number;
    valor_imposto: number;
    valor_liquido: number;
  };
}

interface RecalcularComissoesResponse {
  message: string;
  resultados: {
    processadas: number;
    criadas: number;
    erros: string[];
  };
}

// GET - Dashboard financeiro (stats)
export function useFinanceiroStats() {
  return useQuery<FinanceiroStats>({
    queryKey: ["financeiro-stats"],
    queryFn: () => api.get("/financeiro/dashboard"),
  });
}

// Alias para compatibilidade
export function useFinanceiroDashboard() {
  return useFinanceiroStats();
}

// GET - Listar comissoes
export function useComissoes(filters?: ComissoesFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.apolice_id) params.set("apolice_id", filters.apolice_id);
  if (filters?.mes) params.set("mes", filters.mes);

  return useQuery<ComissoesResponse>({
    queryKey: ["comissoes", filters],
    queryFn: () =>
      api.get(`/financeiro/comissoes${params.toString() ? `?${params}` : ""}`),
  });
}

// GET - Comissao por ID
export function useComissao(id?: string) {
  return useQuery<Comissao>({
    queryKey: ["comissao", id],
    queryFn: () => api.get(`/financeiro/comissoes/${id}`),
    enabled: !!id,
  });
}

// POST - Criar comissao
export function useCreateComissao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateComissaoData) =>
      api.post<Comissao>("/financeiro/comissoes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comissoes"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-stats"] });
    },
  });
}

// PUT - Atualizar comissao
export function useUpdateComissao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateComissaoData>;
    }) => api.put<Comissao>(`/financeiro/comissoes/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comissoes"] });
      queryClient.invalidateQueries({ queryKey: ["comissao", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-stats"] });
    },
  });
}

// DELETE - Excluir comissao
export function useDeleteComissao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/financeiro/comissoes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comissoes"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-stats"] });
    },
  });
}

// PUT - Marcar comissao como recebida
export function useMarcarComissaoRecebida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.put<Comissao>(`/financeiro/comissoes/${id}`, {
        status: "recebida",
        data_receita: new Date().toISOString().split("T")[0],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comissoes"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-stats"] });
    },
  });
}

// =====================================================
// CONFIGURACOES DE COMISSAO
// =====================================================

// GET - Listar configuracoes de comissao
export function useComissaoConfiguracoes(filters?: ComissaoConfigFilters) {
  const params = new URLSearchParams();
  if (filters?.seguradora) params.set("seguradora", filters.seguradora);
  if (filters?.ramo) params.set("ramo", filters.ramo);
  if (filters?.ativo !== undefined) params.set("ativo", String(filters.ativo));

  return useQuery<ComissaoConfigResponse>({
    queryKey: ["comissao-config", filters],
    queryFn: () =>
      api.get(
        `/financeiro/comissao-config${params.toString() ? `?${params}` : ""}`
      ),
  });
}

// GET - Configuracao de comissao por ID
export function useComissaoConfiguracao(id?: string) {
  return useQuery<ComissaoConfiguracao>({
    queryKey: ["comissao-config", id],
    queryFn: () => api.get(`/financeiro/comissao-config/${id}`),
    enabled: !!id,
  });
}

// POST - Criar configuracao de comissao
export function useCreateComissaoConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateComissaoConfigData) =>
      api.post<ComissaoConfiguracao>("/financeiro/comissao-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comissao-config"] });
    },
  });
}

// PUT - Atualizar configuracao de comissao
export function useUpdateComissaoConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateComissaoConfigData>;
    }) =>
      api.put<ComissaoConfiguracao>(`/financeiro/comissao-config/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comissao-config"] });
      queryClient.invalidateQueries({
        queryKey: ["comissao-config", variables.id],
      });
    },
  });
}

// DELETE - Excluir configuracao de comissao
export function useDeleteComissaoConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/financeiro/comissao-config/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comissao-config"] });
    },
  });
}

// GET - Listar seguradoras
export function useSeguradoras() {
  return useQuery<{ data: string[] }>({
    queryKey: ["seguradoras"],
    queryFn: () => api.get("/financeiro/seguradoras"),
  });
}

// GET - Listar ramos
export function useRamos() {
  return useQuery<{ data: { value: string; label: string }[] }>({
    queryKey: ["ramos"],
    queryFn: () => api.get("/financeiro/ramos"),
  });
}

// POST - Calcular comissao para uma apolice
export function useCalcularComissao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (apolice_id: string) =>
      api.post<CalcularComissaoResponse>("/financeiro/calcular-comissao", {
        apolice_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comissoes"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-stats"] });
    },
  });
}

// POST - Recalcular todas as comissoes
export function useRecalcularComissoes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<RecalcularComissoesResponse>(
        "/financeiro/recalcular-comissoes",
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comissoes"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-stats"] });
    },
  });
}

// =====================================================
// GRAFICOS DO DASHBOARD FINANCEIRO
// =====================================================

interface ComissaoMensalChart {
  label: string;
  mes: string;
  recebido: number;
  pendente: number;
  total: number;
}

interface ComissaoPorSeguradoraChart {
  label: string;
  value: number;
  color: string;
}

interface ComissaoPorRamoChart {
  label: string;
  value: number;
  color: string;
}

interface FinanceiroChartsResponse {
  comissoesMensais: ComissaoMensalChart[];
  comissoesPorSeguradora: ComissaoPorSeguradoraChart[];
  comissoesPorRamo: ComissaoPorRamoChart[];
  totais: {
    recebido: number;
    pendente: number;
    bruto: number;
    variacaoPercentual: number;
    periodoAnterior: number;
  };
}

export type PeriodoFiltro = "mes" | "trimestre" | "ano" | "todos";

// GET - Dados para gráficos do dashboard financeiro
export function useFinanceiroCharts(periodo: PeriodoFiltro = "ano") {
  return useQuery<FinanceiroChartsResponse>({
    queryKey: ["financeiro-charts", periodo],
    queryFn: () => api.get(`/financeiro/charts?periodo=${periodo}`),
  });
}

// Exportar relatório de comissões
export function useExportarComissoes() {
  return useMutation({
    mutationFn: async (periodo: PeriodoFiltro) => {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3001/api"
        }/financeiro/exportar?periodo=${periodo}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao exportar relatório");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `comissoes_${periodo}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

// =====================================================
// PROJECAO DE FLUXO DE CAIXA
// =====================================================

interface ProjecaoDetalhe {
  tipo: "renovacao" | "pendente";
  descricao: string;
  valor: number;
  data: string;
  seguradora: string;
}

interface ProjecaoMes {
  mes: string;
  label: string;
  renovacoes: number;
  renovacoesValor: number;
  comissaoEsperada: number;
  comissoesPendentes: number;
  totalProjetado: number;
  detalhes: ProjecaoDetalhe[];
}

interface RealizadoMes {
  mes: string;
  valor: number;
}

interface ProjecaoFluxoCaixaResponse {
  projecao: ProjecaoMes[];
  realizado: RealizadoMes[];
  totais: {
    renovacoes: number;
    comissaoEsperadaRenovacoes: number;
    comissoesPendentes: number;
    totalProjetado: number;
    mediaRealizadoMensal: number;
  };
}

export type { ProjecaoMes, ProjecaoDetalhe, ProjecaoFluxoCaixaResponse };

// GET - Projecao de fluxo de caixa
export function useProjecaoFluxoCaixa(meses: number = 6) {
  return useQuery<ProjecaoFluxoCaixaResponse>({
    queryKey: ["projecao-fluxo-caixa", meses],
    queryFn: () => api.get(`/financeiro/projecao?meses=${meses}`),
  });
}
