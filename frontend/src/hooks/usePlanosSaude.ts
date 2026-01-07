import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { PlanoSaude, PlanoBeneficiario, PlanoCarencia } from '../types';

// ============================================
// TIPOS
// ============================================

interface PlanosSaudeResponse {
  data: PlanoSaude[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PlanosSaudeFilters {
  cliente_id?: string;
  status?: string;
  tipo_plano?: string;
  operadora?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface PlanoSaudeStats {
  total: number;
  ativos: number;
  suspensos: number;
  cancelados: number;
  totalBeneficiarios: number;
  mensalidadeTotal: number;
}

interface CreatePlanoSaudeData {
  cliente_id: string;
  operadora: string;
  numero_contrato: string;
  tipo_plano: 'individual' | 'familiar' | 'empresarial' | 'adesao';
  acomodacao: 'enfermaria' | 'apartamento';
  abrangencia: 'municipal' | 'estadual' | 'nacional';
  valor_mensalidade: number;
  data_contratacao: string;
  data_vencimento?: string;
  coparticipacao?: boolean;
  percentual_coparticipacao?: number;
  ans_registro?: string;
  observacoes?: string;
}

interface PlanoReajuste {
  id: string;
  plano_id: string;
  data_reajuste: string;
  valor_anterior: number;
  valor_novo: number;
  percentual_reajuste: number;
  tipo_reajuste?: string;
  observacao?: string;
  created_at: string;
}

interface PlanoCobertura {
  id: string;
  plano_id: string;
  procedimento: string;
  descricao?: string;
  limite_quantidade?: number;
  limite_valor?: number;
  coparticipacao_valor?: number;
  coberto: boolean;
  observacao?: string;
}

interface PlanoHistorico {
  id: string;
  plano_id: string;
  usuario_id: string;
  tipo_evento: string;
  descricao: string;
  dados_anteriores?: Record<string, unknown>;
  dados_novos?: Record<string, unknown>;
  usuario?: { nome: string };
  created_at: string;
}

// ============================================
// HOOKS - PLANOS DE SAÚDE
// ============================================

// GET - Listar planos
export function usePlanosSaude(filters?: PlanosSaudeFilters) {
  const params = new URLSearchParams();
  if (filters?.cliente_id) params.set('cliente_id', filters.cliente_id);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.tipo_plano) params.set('tipo_plano', filters.tipo_plano);
  if (filters?.operadora) params.set('operadora', filters.operadora);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  return useQuery<PlanosSaudeResponse>({
    queryKey: ['planos-saude', filters],
    queryFn: () => api.get(`/planos-saude${params.toString() ? `?${params}` : ''}`),
  });
}

// GET - Plano por ID
export function usePlanoSaude(id?: string) {
  return useQuery<PlanoSaude & {
    plano_beneficiarios: PlanoBeneficiario[];
    plano_carencias: PlanoCarencia[];
    plano_coberturas: PlanoCobertura[];
    plano_reajustes: PlanoReajuste[];
    plano_historico: PlanoHistorico[];
  }>({
    queryKey: ['plano-saude', id],
    queryFn: () => api.get(`/planos-saude/${id}`),
    enabled: !!id,
  });
}

// GET - Beneficiários do plano
export function usePlanoBeneficiarios(planoId?: string) {
  return useQuery<{ data: PlanoBeneficiario[] }>({
    queryKey: ['plano-beneficiarios', planoId],
    queryFn: () => api.get(`/planos-saude/${planoId}/beneficiarios`),
    enabled: !!planoId,
  });
}

// GET - Carências do plano
export function usePlanoCarencias(planoId?: string) {
  return useQuery<{ data: PlanoCarencia[] }>({
    queryKey: ['plano-carencias', planoId],
    queryFn: () => api.get(`/planos-saude/${planoId}/carencias`),
    enabled: !!planoId,
  });
}

// GET - Stats
export function usePlanosSaudeStats() {
  return useQuery<PlanoSaudeStats>({
    queryKey: ['planos-saude-stats'],
    queryFn: () => api.get('/planos-saude/stats/summary'),
  });
}

// POST - Criar plano
export function useCreatePlanoSaude() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlanoSaudeData) => api.post<PlanoSaude>('/planos-saude', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-saude'] });
      queryClient.invalidateQueries({ queryKey: ['planos-saude-stats'] });
    },
  });
}

// PUT - Atualizar plano
export function useUpdatePlanoSaude() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePlanoSaudeData> }) =>
      api.put<PlanoSaude>(`/planos-saude/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['planos-saude'] });
      queryClient.invalidateQueries({ queryKey: ['plano-saude', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['planos-saude-stats'] });
    },
  });
}

// DELETE - Excluir plano
export function useDeletePlanoSaude() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/planos-saude/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-saude'] });
      queryClient.invalidateQueries({ queryKey: ['planos-saude-stats'] });
    },
  });
}

// ============================================
// HOOKS - BENEFICIÁRIOS
// ============================================

// POST - Adicionar beneficiário
export function useAddBeneficiario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planoId, data }: {
      planoId: string;
      data: {
        nome: string;
        cpf: string;
        data_nascimento: string;
        tipo_beneficiario: 'titular' | 'dependente';
        parentesco?: string;
        numero_carteirinha?: string;
        valor_mensalidade_individual?: number;
      };
    }) => api.post(`/planos-saude/${planoId}/beneficiarios`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plano-saude', variables.planoId] });
      queryClient.invalidateQueries({ queryKey: ['plano-beneficiarios', variables.planoId] });
      queryClient.invalidateQueries({ queryKey: ['planos-saude-stats'] });
    },
  });
}

// PUT - Atualizar beneficiário
export function useUpdateBeneficiario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planoId, beneficiarioId, data }: {
      planoId: string;
      beneficiarioId: string;
      data: Partial<{
        nome: string;
        cpf: string;
        data_nascimento: string;
        parentesco: string;
        numero_carteirinha: string;
        valor_mensalidade_individual: number;
        ativo: boolean;
      }>;
    }) => api.put(`/planos-saude/${planoId}/beneficiarios/${beneficiarioId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plano-saude', variables.planoId] });
      queryClient.invalidateQueries({ queryKey: ['plano-beneficiarios', variables.planoId] });
    },
  });
}

// DELETE - Remover beneficiário
export function useRemoveBeneficiario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planoId, beneficiarioId }: { planoId: string; beneficiarioId: string }) =>
      api.delete(`/planos-saude/${planoId}/beneficiarios/${beneficiarioId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plano-saude', variables.planoId] });
      queryClient.invalidateQueries({ queryKey: ['plano-beneficiarios', variables.planoId] });
      queryClient.invalidateQueries({ queryKey: ['planos-saude-stats'] });
    },
  });
}

// ============================================
// HOOKS - CARÊNCIAS
// ============================================

// POST - Adicionar carência
export function useAddCarencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planoId, data }: {
      planoId: string;
      data: {
        procedimento: string;
        data_inicio_carencia: string;
        data_fim_carencia: string;
        dias_carencia?: number;
        observacao?: string;
      };
    }) => api.post(`/planos-saude/${planoId}/carencias`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plano-saude', variables.planoId] });
      queryClient.invalidateQueries({ queryKey: ['plano-carencias', variables.planoId] });
    },
  });
}

// PATCH - Marcar carência como cumprida
export function useMarcarCarenciaCumprida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planoId, carenciaId }: { planoId: string; carenciaId: string }) =>
      api.patch(`/planos-saude/${planoId}/carencias/${carenciaId}/cumprida`, {}),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plano-saude', variables.planoId] });
      queryClient.invalidateQueries({ queryKey: ['plano-carencias', variables.planoId] });
    },
  });
}

// ============================================
// HOOKS - REAJUSTES
// ============================================

// POST - Registrar reajuste
export function useRegistrarReajuste() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planoId, data }: {
      planoId: string;
      data: {
        data_reajuste: string;
        valor_novo: number;
        tipo_reajuste?: 'anual' | 'faixa_etaria' | 'sinistralidade' | 'outros';
        observacao?: string;
      };
    }) => api.post(`/planos-saude/${planoId}/reajustes`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plano-saude', variables.planoId] });
      queryClient.invalidateQueries({ queryKey: ['planos-saude'] });
      queryClient.invalidateQueries({ queryKey: ['planos-saude-stats'] });
    },
  });
}

// ============================================
// HOOKS - COBERTURAS
// ============================================

// POST - Adicionar cobertura
export function useAddPlanoCobertura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planoId, data }: {
      planoId: string;
      data: {
        procedimento: string;
        descricao?: string;
        limite_quantidade?: number;
        limite_valor?: number;
        coparticipacao_valor?: number;
        coberto?: boolean;
        observacao?: string;
      };
    }) => api.post(`/planos-saude/${planoId}/coberturas`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plano-saude', variables.planoId] });
    },
  });
}

// PUT - Atualizar cobertura
export function useUpdatePlanoCobertura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planoId, coberturaId, data }: {
      planoId: string;
      coberturaId: string;
      data: Partial<{
        procedimento: string;
        descricao: string;
        limite_quantidade: number;
        limite_valor: number;
        coparticipacao_valor: number;
        coberto: boolean;
        observacao: string;
      }>;
    }) => api.put(`/planos-saude/${planoId}/coberturas/${coberturaId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plano-saude', variables.planoId] });
    },
  });
}

// DELETE - Remover cobertura
export function useRemovePlanoCobertura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planoId, coberturaId }: { planoId: string; coberturaId: string }) =>
      api.delete(`/planos-saude/${planoId}/coberturas/${coberturaId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plano-saude', variables.planoId] });
    },
  });
}
