import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { Apolice, RamoSeguro } from "../types";

interface ApolicesResponse {
  data: Apolice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApolicesFilters {
  cliente_id?: string;
  ramo?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface CreateApoliceData {
  cliente_id: string;
  ramo: RamoSeguro;
  seguradora: string;
  numero_apolice: string;
  valor_premio: number;
  data_inicio: string;
  data_vencimento: string;
  status?: "vigente" | "vencida" | "cancelada";
  dados?: Record<string, unknown>;
  coberturas?: CoberturaData[];
}

// Tipos para Coberturas
export interface Cobertura {
  id: string;
  apolice_id: string;
  nome: string;
  descricao?: string;
  limite: number;
  franquia: number;
  premio?: number;
  carencia_dias?: number;
  ativa: boolean;
  created_at: string;
}

export interface CoberturaData {
  nome: string;
  descricao?: string;
  limite: number;
  franquia: number;
  premio?: number;
  carencia_dias?: number;
  ativa?: boolean;
}

// Tipos para Endossos
export interface Endosso {
  id: string;
  apolice_id: string;
  numero_endosso: string;
  tipo: "inclusao" | "exclusao" | "alteracao" | "cancelamento" | "renovacao";
  descricao: string;
  data_emissao: string;
  data_vigencia_inicio?: string;
  data_vigencia_fim?: string;
  diferenca_premio?: number;
  status:
    | "pendente"
    | "aprovado"
    | "rejeitado"
    | "cancelado"
    | "rascunho"
    | "enviado"
    | "aceito"
    | "emitido";
  observacao?: string;
  usuario_id: string;
  usuario?: { nome: string };
  created_at: string;
}

export interface EndossoData {
  tipo: "inclusao" | "exclusao" | "alteracao" | "cancelamento" | "renovacao";
  descricao: string;
  data_emissao: string;
  data_vigencia_inicio?: string;
  data_vigencia_fim?: string;
  diferenca_premio?: number;
  observacao?: string;
}

// Tipos para Historico
export interface ApoliceHistorico {
  id: string;
  apolice_id: string;
  usuario_id: string;
  tipo_evento:
    | "criacao"
    | "atualizacao"
    | "cobertura_adicionada"
    | "cobertura_atualizada"
    | "cobertura_removida"
    | "endosso_criado"
    | "endosso_atualizado";
  descricao: string;
  dados_anteriores?: Record<string, unknown>;
  dados_novos?: Record<string, unknown>;
  usuario?: { nome: string };
  created_at: string;
}

// GET - Listar apolices
export function useApolices(filters?: ApolicesFilters) {
  const params = new URLSearchParams();
  if (filters?.cliente_id) params.set("cliente_id", filters.cliente_id);
  if (filters?.ramo) params.set("ramo", filters.ramo);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  return useQuery<ApolicesResponse>({
    queryKey: ["apolices", filters],
    queryFn: () => api.get(`/apolices${params.toString() ? `?${params}` : ""}`),
  });
}

// GET - Apolice por ID (com coberturas, endossos e historico)
export function useApolice(id?: string) {
  return useQuery<
    Apolice & {
      apolice_coberturas: Cobertura[];
      apolice_endossos: Endosso[];
      apolice_historico: ApoliceHistorico[];
    }
  >({
    queryKey: ["apolice", id],
    queryFn: () => api.get(`/apolices/${id}`),
    enabled: !!id,
  });
}

// GET - Coberturas da apolice
export function useApoliceCoberturas(apoliceId?: string) {
  return useQuery<{ data: Cobertura[] }>({
    queryKey: ["apolice-coberturas", apoliceId],
    queryFn: () => api.get(`/apolices/${apoliceId}/coberturas`),
    enabled: !!apoliceId,
  });
}

// GET - Endossos da apolice
export function useApoliceEndossos(apoliceId?: string) {
  return useQuery<{ data: Endosso[] }>({
    queryKey: ["apolice-endossos", apoliceId],
    queryFn: () => api.get(`/apolices/${apoliceId}/endossos`),
    enabled: !!apoliceId,
  });
}

// GET - Historico da apolice
export function useApoliceHistorico(apoliceId?: string) {
  return useQuery<{ data: ApoliceHistorico[] }>({
    queryKey: ["apolice-historico", apoliceId],
    queryFn: () => api.get(`/apolices/${apoliceId}/historico`),
    enabled: !!apoliceId,
  });
}

// GET - Stats
export function useApolicesStats() {
  return useQuery<{
    total: number;
    vigentes: number;
    vencidas: number;
    vencendo: number;
    premioTotal: number;
  }>({
    queryKey: ["apolices-stats"],
    queryFn: () => api.get("/apolices/stats/summary"),
  });
}

// POST - Criar apolice
export function useCreateApolice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApoliceData) =>
      api.post<Apolice>("/apolices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apolices"] });
      queryClient.invalidateQueries({ queryKey: ["apolices-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cliente-apolices"] });
    },
  });
}

// PUT - Atualizar apolice
export function useUpdateApolice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateApoliceData>;
    }) => api.put<Apolice>(`/apolices/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["apolices"] });
      queryClient.invalidateQueries({ queryKey: ["apolice", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["apolices-stats"] });
    },
  });
}

// DELETE - Excluir apolice
export function useDeleteApolice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/apolices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apolices"] });
      queryClient.invalidateQueries({ queryKey: ["apolices-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cliente-apolices"] });
    },
  });
}

// ========== COBERTURAS ==========

// POST - Adicionar cobertura
export function useAddCobertura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      apoliceId,
      data,
    }: {
      apoliceId: string;
      data: CoberturaData;
    }) => api.post<Cobertura>(`/apolices/${apoliceId}/coberturas`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["apolice", variables.apoliceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["apolice-coberturas", variables.apoliceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["apolice-historico", variables.apoliceId],
      });
    },
  });
}

// PUT - Atualizar cobertura
export function useUpdateCobertura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      apoliceId,
      coberturaId,
      data,
    }: {
      apoliceId: string;
      coberturaId: string;
      data: Partial<CoberturaData>;
    }) =>
      api.put<Cobertura>(
        `/apolices/${apoliceId}/coberturas/${coberturaId}`,
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["apolice", variables.apoliceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["apolice-coberturas", variables.apoliceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["apolice-historico", variables.apoliceId],
      });
    },
  });
}

// DELETE - Remover cobertura
export function useRemoveCobertura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      apoliceId,
      coberturaId,
    }: {
      apoliceId: string;
      coberturaId: string;
    }) => api.delete(`/apolices/${apoliceId}/coberturas/${coberturaId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["apolice", variables.apoliceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["apolice-coberturas", variables.apoliceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["apolice-historico", variables.apoliceId],
      });
    },
  });
}

// ========== ENDOSSOS ==========

// POST - Criar endosso
export function useCreateEndosso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      apoliceId,
      data,
    }: {
      apoliceId: string;
      data: EndossoData;
    }) => api.post<Endosso>(`/apolices/${apoliceId}/endossos`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["apolice", variables.apoliceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["apolice-endossos", variables.apoliceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["apolice-historico", variables.apoliceId],
      });
      queryClient.invalidateQueries({ queryKey: ["apolices"] }); // Premio pode ter mudado
    },
  });
}

// PATCH - Atualizar status do endosso
export function useUpdateEndossoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      apoliceId,
      endossoId,
      status,
      observacao,
    }: {
      apoliceId: string;
      endossoId: string;
      status: string;
      observacao?: string;
    }) =>
      api.patch(`/apolices/${apoliceId}/endossos/${endossoId}`, {
        status,
        observacao,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["apolice", variables.apoliceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["apolice-endossos", variables.apoliceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["apolice-historico", variables.apoliceId],
      });
    },
  });
}
