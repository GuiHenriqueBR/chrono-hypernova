import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  Cotacao,
  Proposta,
  StatusPipelineCotacao,
  CotacaoHistorico,
  PipelineStats,
  ApiResponse,
} from "../types";

export interface PipelineFase {
  id: string;
  nome: string;
  chave: string;
  cor: string;
  ordem: number;
  sistema: boolean;
}

// ============ PIPELINE CONFIG ============

export function usePipelineFases() {
  return useQuery<PipelineFase[]>({
    queryKey: ["pipeline-fases"],
    queryFn: () => api.get("/pipeline/fases"),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

// ============ COTAÇÕES ============

export function useCotacoes(filters?: Record<string, any>) {
  const params = new URLSearchParams(filters);
  return useQuery({
    queryKey: ["cotacoes", filters],
    queryFn: () =>
      api.get<ApiResponse<Cotacao[]>>(`/cotacoes?${params.toString()}`),
  });
}

export function useCotacao(id?: string) {
  return useQuery({
    queryKey: ["cotacao", id],
    queryFn: () => api.get<Cotacao>(`/cotacoes/${id}`),
    enabled: !!id,
  });
}

export function useCreateCotacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Cotacao>) => api.post("/cotacoes", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cotacoes"] }),
  });
}

export function useUpdateCotacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Cotacao> }) =>
      api.put(`/cotacoes/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cotacoes"] });
      queryClient.invalidateQueries({ queryKey: ["cotacao", variables.id] });
    },
  });
}

export function useConverterCotacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, proposta }: { id: string; proposta: unknown }) =>
      api.post(`/cotacoes/${id}/converter-proposta`, {
        proposta_escolhida: proposta,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cotacoes"] });
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-vendas"] });
    },
  });
}

// ============================================
// PIPELINE CRM - Status & Follow-up
// ============================================

// Atualizar status do pipeline
export function useUpdateCotacaoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status_pipeline,
      motivo_perda,
      notas,
      dados_cliente,
    }: {
      id: string;
      status_pipeline: StatusPipelineCotacao;
      motivo_perda?: string;
      notas?: string;
      dados_cliente?: any;
    }) =>
      api.patch(`/cotacoes/${id}/status`, {
        status_pipeline,
        motivo_perda,
        notas,
        dados_cliente,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cotacoes"] });
      queryClient.invalidateQueries({ queryKey: ["cotacao", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-vendas"] });
      queryClient.invalidateQueries({ queryKey: ["foco-do-dia"] });
      queryClient.invalidateQueries({ queryKey: ["metricas-conversao"] });
    },
  });
}

// Agendar follow-up
export function useAgendarFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      proximo_contato,
      notas,
    }: {
      id: string;
      proximo_contato: string;
      notas?: string;
    }) =>
      api.patch(`/cotacoes/${id}/agendar-followup`, { proximo_contato, notas }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cotacoes"] });
      queryClient.invalidateQueries({ queryKey: ["cotacao", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-vendas"] });
      queryClient.invalidateQueries({ queryKey: ["foco-do-dia"] });
    },
  });
}

// ============================================
// HISTÓRICO DE NEGOCIAÇÃO
// ============================================

// Buscar histórico de uma cotação
export function useCotacaoHistorico(cotacaoId?: string) {
  return useQuery<CotacaoHistorico[]>({
    queryKey: ["cotacao-historico", cotacaoId],
    queryFn: () => api.get(`/cotacoes/${cotacaoId}/historico`),
    enabled: !!cotacaoId,
  });
}

// Adicionar entrada no histórico
export function useAddCotacaoHistorico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cotacaoId,
      tipo_evento,
      notas,
      resultado,
    }: {
      cotacaoId: string;
      tipo_evento: string;
      notas: string;
      resultado?: "positivo" | "neutro" | "negativo";
    }) =>
      api.post(`/cotacoes/${cotacaoId}/historico`, {
        tipo_evento,
        notas,
        resultado,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cotacao-historico", variables.cotacaoId],
      });
      queryClient.invalidateQueries({
        queryKey: ["cotacao", variables.cotacaoId],
      });
    },
  });
}

// ============================================
// ESTATÍSTICAS DO PIPELINE
// ============================================

export function usePipelineStats() {
  return useQuery<PipelineStats>({
    queryKey: ["pipeline-stats"],
    queryFn: () => api.get("/cotacoes/stats/pipeline"),
    staleTime: 30000,
  });
}

// ============ PROPOSTAS ============

export function usePropostas(filters?: Record<string, any>) {
  const params = new URLSearchParams(filters);
  return useQuery({
    queryKey: ["propostas", filters],
    queryFn: () =>
      api.get<ApiResponse<Proposta[]>>(`/propostas?${params.toString()}`),
  });
}

export function useProposta(id?: string) {
  return useQuery({
    queryKey: ["proposta", id],
    queryFn: () => api.get<Proposta>(`/propostas/${id}`),
    enabled: !!id,
  });
}

export function useUpdatePropostaStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/propostas/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      queryClient.invalidateQueries({ queryKey: ["proposta", variables.id] });
    },
  });
}

export function useEmitirProposta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      api.post(`/propostas/${id}/emitir`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      queryClient.invalidateQueries({ queryKey: ["apolices"] });
    },
  });
}
