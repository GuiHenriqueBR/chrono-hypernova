import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { ApiResponse } from "../types";

// Tipos
export type TipoAlerta =
  | "renovacao_apolice"
  | "vencimento_parcela"
  | "sinistro_pendente"
  | "tarefa_atrasada"
  | "comissao_pendente"
  | "aniversario_cliente"
  | "consorcio_parcela"
  | "plano_saude_reajuste"
  | "financiamento_parcela"
  | "documento_pendente";

export type PrioridadeAlerta = "baixa" | "media" | "alta" | "urgente";

export interface Alerta {
  id: string;
  usuario_id: string;
  tipo: TipoAlerta;
  titulo: string;
  mensagem: string;
  prioridade: PrioridadeAlerta;
  entidade_tipo?: string;
  entidade_id?: string;
  metadados?: Record<string, any>;
  data_referencia?: string;
  lido: boolean;
  enviado_email: boolean;
  enviado_whatsapp: boolean;
  created_at: string;
}

export interface ResumoAlertas {
  urgentes: number;
  alta_prioridade: number;
  media_prioridade: number;
  baixa_prioridade: number;
  total_nao_lidos: number;
  alertas: Alerta[];
}

export interface ContagemAlertas {
  total: number;
  por_tipo: Record<string, number>;
}

export interface AlertasFiltros {
  tipo?: TipoAlerta;
  nao_lidos?: boolean;
  page?: number;
  limite?: number;
}

// ========== QUERIES ==========

// Listar alertas
export function useAlertas(filtros: AlertasFiltros = {}) {
  return useQuery({
    queryKey: ["alertas", filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.tipo) params.append("tipo", filtros.tipo);
      if (filtros.nao_lidos) params.append("nao_lidos", "true");
      if (filtros.page) params.append("page", String(filtros.page));
      if (filtros.limite) params.append("limite", String(filtros.limite));

      const { data } = await api.get<
        ApiResponse<{
          data: Alerta[];
          total: number;
          page: number;
          limite: number;
        }>
      >(`/alertas?${params.toString()}`);
      return data; // Assuming ApiResponse wraps the actual data in a 'data' property
    },
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  });
}

// Buscar resumo de alertas
export function useResumoAlertas() {
  return useQuery({
    queryKey: ["alertas", "resumo"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ResumoAlertas>>(
        "/alertas/resumo"
      );
      return data;
    },
    refetchInterval: 60000,
  });
}

// Buscar contagem de alertas
export function useContagemAlertas() {
  return useQuery({
    queryKey: ["alertas", "contagem"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ContagemAlertas>>(
        "/alertas/contagem"
      );
      return data;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });
}

// Buscar alerta especifico
export function useAlerta(id: string) {
  return useQuery({
    queryKey: ["alertas", id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Alerta>>(`/alertas/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// Status do scheduler (admin)
export function useSchedulerStatus() {
  return useQuery({
    queryKey: ["alertas", "scheduler-status"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>(
        "/alertas/admin/scheduler-status"
      );
      return data;
    },
  });
}

// Estatisticas de alertas (admin)
export function useEstatisticasAlertas() {
  return useQuery({
    queryKey: ["alertas", "estatisticas"],
    queryFn: async () => {
      const data = await api.get("/alertas/admin/estatisticas");
      return data;
    },
  });
}

// ========== MUTATIONS ==========

// Marcar alerta como lido
export function useMarcarAlertaLido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertaId: string) => {
      const data = await api.patch(`/alertas/${alertaId}/lido`, {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas"] });
    },
  });
}

// Marcar todos como lidos
export function useMarcarTodosAlertasLidos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const data = await api.post("/alertas/marcar-todos-lidos", {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas"] });
    },
  });
}

// Criar alerta manual
export function useCriarAlerta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alerta: {
      tipo: TipoAlerta;
      titulo: string;
      mensagem: string;
      prioridade?: PrioridadeAlerta;
      entidade_tipo?: string;
      entidade_id?: string;
      data_referencia?: string;
    }) => {
      const data = await api.post("/alertas", alerta);
      return data as Alerta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas"] });
    },
  });
}

// Deletar alerta
export function useDeletarAlerta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertaId: string) => {
      await api.delete(`/alertas/${alertaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas"] });
    },
  });
}

// Deletar todos os lidos
export function useDeletarAlertasLidos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const data = await api.delete("/alertas/lidos/todos");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas"] });
    },
  });
}

// Executar verificacao manual (admin)
export function useExecutarVerificacaoAlertas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const data = await api.post("/alertas/admin/verificar", {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas"] });
    },
  });
}

// ========== HELPERS ==========

// Retorna cor baseada na prioridade
export function getCorPrioridade(prioridade: PrioridadeAlerta): string {
  switch (prioridade) {
    case "urgente":
      return "red";
    case "alta":
      return "orange";
    case "media":
      return "yellow";
    case "baixa":
      return "blue";
    default:
      return "gray";
  }
}

// Retorna icone baseado no tipo
export function getIconeTipoAlerta(tipo: TipoAlerta): string {
  switch (tipo) {
    case "renovacao_apolice":
      return "FileText";
    case "vencimento_parcela":
      return "Calendar";
    case "sinistro_pendente":
      return "AlertTriangle";
    case "tarefa_atrasada":
      return "Clock";
    case "comissao_pendente":
      return "DollarSign";
    case "aniversario_cliente":
      return "Gift";
    case "consorcio_parcela":
      return "Users";
    case "plano_saude_reajuste":
      return "Heart";
    case "financiamento_parcela":
      return "Home";
    case "documento_pendente":
      return "File";
    default:
      return "Bell";
  }
}

// Retorna label do tipo
export function getLabelTipoAlerta(tipo: TipoAlerta): string {
  const labels: Record<TipoAlerta, string> = {
    renovacao_apolice: "Renovacao de Apolice",
    vencimento_parcela: "Vencimento de Parcela",
    sinistro_pendente: "Sinistro Pendente",
    tarefa_atrasada: "Tarefa Atrasada",
    comissao_pendente: "Comissao Pendente",
    aniversario_cliente: "Aniversario de Cliente",
    consorcio_parcela: "Parcela de Consorcio",
    plano_saude_reajuste: "Reajuste Plano de Saude",
    financiamento_parcela: "Parcela de Financiamento",
    documento_pendente: "Documento Pendente",
  };
  return labels[tipo] || tipo;
}
