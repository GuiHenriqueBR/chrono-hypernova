import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Consorcio, ConsorcioParcela, ConsorcioLance } from '../types';

// ============================================
// TIPOS
// ============================================

interface ConsorciosResponse {
  data: Consorcio[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ConsorciosFilters {
  cliente_id?: string;
  status?: string;
  tipo_bem?: string;
  administradora?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface ConsorcioStats {
  total: number;
  ativos: number;
  contemplados: number;
  encerrados: number;
  valorCreditoTotal: number;
  valorParcelasTotal: number;
}

interface CreateConsorcioData {
  cliente_id: string;
  administradora: string;
  grupo?: string;
  cota?: string;
  numero_cota: string;
  valor_credito: number;
  valor_parcela: number;
  prazo_meses: number;
  tipo_bem: 'imovel' | 'veiculo' | 'servicos' | 'outros';
  data_adesao: string;
  data_proxima_assembleia?: string;
  observacoes?: string;
}

interface ConsorcioHistorico {
  id: string;
  consorcio_id: string;
  usuario_id: string;
  tipo_evento: string;
  descricao: string;
  dados_anteriores?: Record<string, unknown>;
  dados_novos?: Record<string, unknown>;
  usuario?: { nome: string };
  created_at: string;
}

// ============================================
// HOOKS - CONSÓRCIOS
// ============================================

// GET - Listar consórcios
export function useConsorcios(filters?: ConsorciosFilters) {
  const params = new URLSearchParams();
  if (filters?.cliente_id) params.set('cliente_id', filters.cliente_id);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.tipo_bem) params.set('tipo_bem', filters.tipo_bem);
  if (filters?.administradora) params.set('administradora', filters.administradora);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  return useQuery<ConsorciosResponse>({
    queryKey: ['consorcios', filters],
    queryFn: () => api.get(`/consorcios${params.toString() ? `?${params}` : ''}`),
  });
}

// GET - Consórcio por ID
export function useConsorcio(id?: string) {
  return useQuery<Consorcio & {
    consorcio_parcelas: ConsorcioParcela[];
    consorcio_lances: ConsorcioLance[];
    consorcio_historico: ConsorcioHistorico[];
  }>({
    queryKey: ['consorcio', id],
    queryFn: () => api.get(`/consorcios/${id}`),
    enabled: !!id,
  });
}

// GET - Parcelas do consórcio
export function useConsorcioParcelas(consorcioId?: string) {
  return useQuery<{ data: ConsorcioParcela[] }>({
    queryKey: ['consorcio-parcelas', consorcioId],
    queryFn: () => api.get(`/consorcios/${consorcioId}/parcelas`),
    enabled: !!consorcioId,
  });
}

// GET - Lances do consórcio
export function useConsorcioLances(consorcioId?: string) {
  return useQuery<{ data: ConsorcioLance[] }>({
    queryKey: ['consorcio-lances', consorcioId],
    queryFn: () => api.get(`/consorcios/${consorcioId}/lances`),
    enabled: !!consorcioId,
  });
}

// GET - Stats
export function useConsorciosStats() {
  return useQuery<ConsorcioStats>({
    queryKey: ['consorcios-stats'],
    queryFn: () => api.get('/consorcios/stats/summary'),
  });
}

// POST - Criar consórcio
export function useCreateConsorcio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConsorcioData) => api.post<Consorcio>('/consorcios', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consorcios'] });
      queryClient.invalidateQueries({ queryKey: ['consorcios-stats'] });
    },
  });
}

// PUT - Atualizar consórcio
export function useUpdateConsorcio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateConsorcioData> }) =>
      api.put<Consorcio>(`/consorcios/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consorcios'] });
      queryClient.invalidateQueries({ queryKey: ['consorcio', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['consorcios-stats'] });
    },
  });
}

// DELETE - Excluir consórcio
export function useDeleteConsorcio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/consorcios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consorcios'] });
      queryClient.invalidateQueries({ queryKey: ['consorcios-stats'] });
    },
  });
}

// ============================================
// HOOKS - PARCELAS
// ============================================

// POST - Registrar parcela paga
export function useRegistrarPagamentoParcela() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ consorcioId, parcelaId, data }: {
      consorcioId: string;
      parcelaId: string;
      data: { data_pagamento: string; valor_pago: number; observacao?: string };
    }) => api.patch(`/consorcios/${consorcioId}/parcelas/${parcelaId}/pagar`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consorcio', variables.consorcioId] });
      queryClient.invalidateQueries({ queryKey: ['consorcio-parcelas', variables.consorcioId] });
      queryClient.invalidateQueries({ queryKey: ['consorcios-stats'] });
    },
  });
}

// POST - Gerar parcelas
export function useGerarParcelas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ consorcioId }: { consorcioId: string }) =>
      api.post(`/consorcios/${consorcioId}/parcelas/gerar`, {}),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consorcio', variables.consorcioId] });
      queryClient.invalidateQueries({ queryKey: ['consorcio-parcelas', variables.consorcioId] });
    },
  });
}

// ============================================
// HOOKS - LANCES
// ============================================

// POST - Registrar lance
export function useRegistrarLance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ consorcioId, data }: {
      consorcioId: string;
      data: {
        data_assembleia: string;
        tipo_lance: 'livre' | 'fixo' | 'embutido';
        valor_lance: number;
        percentual_lance?: number;
        observacao?: string;
      };
    }) => api.post(`/consorcios/${consorcioId}/lances`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consorcio', variables.consorcioId] });
      queryClient.invalidateQueries({ queryKey: ['consorcio-lances', variables.consorcioId] });
    },
  });
}

// PATCH - Atualizar resultado do lance
export function useAtualizarResultadoLance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ consorcioId, lanceId, resultado }: {
      consorcioId: string;
      lanceId: string;
      resultado: 'contemplado' | 'nao_contemplado';
    }) => api.patch(`/consorcios/${consorcioId}/lances/${lanceId}`, { resultado }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consorcio', variables.consorcioId] });
      queryClient.invalidateQueries({ queryKey: ['consorcio-lances', variables.consorcioId] });
      queryClient.invalidateQueries({ queryKey: ['consorcios'] });
      queryClient.invalidateQueries({ queryKey: ['consorcios-stats'] });
    },
  });
}

// PATCH - Marcar como contemplado
export function useMarcarContemplado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data_contemplacao }: { id: string; data_contemplacao: string }) =>
      api.patch(`/consorcios/${id}/contemplar`, { data_contemplacao }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consorcios'] });
      queryClient.invalidateQueries({ queryKey: ['consorcio', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['consorcios-stats'] });
    },
  });
}
