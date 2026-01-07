import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Financiamento, FinanciamentoParcela } from '../types';

// ============================================
// TIPOS
// ============================================

interface FinanciamentosResponse {
  data: Financiamento[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FinanciamentosFilters {
  cliente_id?: string;
  status?: string;
  tipo_financiamento?: string;
  instituicao_financeira?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface FinanciamentoStats {
  total: number;
  ativos: number;
  quitados: number;
  atrasados: number;
  valorFinanciadoTotal: number;
  saldoDevedorTotal: number;
}

interface CreateFinanciamentoData {
  cliente_id: string;
  instituicao_financeira: string;
  numero_contrato: string;
  tipo_financiamento: 'imovel' | 'veiculo' | 'pessoal' | 'consignado' | 'outros';
  bem_financiado?: string;
  valor_financiado: number;
  valor_entrada?: number;
  valor_parcela: number;
  taxa_juros?: number;
  cet?: number;
  prazo_meses: number;
  saldo_devedor: number;
  data_contratacao: string;
  data_vencimento_parcela?: number;
  data_primeira_parcela?: string;
  sistema_amortizacao?: 'SAC' | 'PRICE' | 'SACRE' | 'outro';
  garantia?: string;
  observacoes?: string;
}

interface FinanciamentoAmortizacao {
  id: string;
  financiamento_id: string;
  data_amortizacao: string;
  valor_amortizacao: number;
  tipo_amortizacao?: 'parcial' | 'quitacao';
  reducao_tipo?: 'prazo' | 'parcela';
  saldo_devedor_antes?: number;
  saldo_devedor_depois?: number;
  observacao?: string;
  created_at: string;
}

interface FinanciamentoHistorico {
  id: string;
  financiamento_id: string;
  usuario_id: string;
  tipo_evento: string;
  descricao: string;
  dados_anteriores?: Record<string, unknown>;
  dados_novos?: Record<string, unknown>;
  usuario?: { nome: string };
  created_at: string;
}

// ============================================
// HOOKS - FINANCIAMENTOS
// ============================================

// GET - Listar financiamentos
export function useFinanciamentos(filters?: FinanciamentosFilters) {
  const params = new URLSearchParams();
  if (filters?.cliente_id) params.set('cliente_id', filters.cliente_id);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.tipo_financiamento) params.set('tipo_financiamento', filters.tipo_financiamento);
  if (filters?.instituicao_financeira) params.set('instituicao_financeira', filters.instituicao_financeira);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  return useQuery<FinanciamentosResponse>({
    queryKey: ['financiamentos', filters],
    queryFn: () => api.get(`/financiamentos${params.toString() ? `?${params}` : ''}`),
  });
}

// GET - Financiamento por ID
export function useFinanciamento(id?: string) {
  return useQuery<Financiamento & {
    financiamento_parcelas: FinanciamentoParcela[];
    financiamento_amortizacoes: FinanciamentoAmortizacao[];
    financiamento_historico: FinanciamentoHistorico[];
  }>({
    queryKey: ['financiamento', id],
    queryFn: () => api.get(`/financiamentos/${id}`),
    enabled: !!id,
  });
}

// GET - Parcelas do financiamento
export function useFinanciamentoParcelas(financiamentoId?: string) {
  return useQuery<{ data: FinanciamentoParcela[] }>({
    queryKey: ['financiamento-parcelas', financiamentoId],
    queryFn: () => api.get(`/financiamentos/${financiamentoId}/parcelas`),
    enabled: !!financiamentoId,
  });
}

// GET - Amortizações do financiamento
export function useFinanciamentoAmortizacoes(financiamentoId?: string) {
  return useQuery<{ data: FinanciamentoAmortizacao[] }>({
    queryKey: ['financiamento-amortizacoes', financiamentoId],
    queryFn: () => api.get(`/financiamentos/${financiamentoId}/amortizacoes`),
    enabled: !!financiamentoId,
  });
}

// GET - Stats
export function useFinanciamentosStats() {
  return useQuery<FinanciamentoStats>({
    queryKey: ['financiamentos-stats'],
    queryFn: () => api.get('/financiamentos/stats/summary'),
  });
}

// POST - Criar financiamento
export function useCreateFinanciamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFinanciamentoData) => api.post<Financiamento>('/financiamentos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financiamentos'] });
      queryClient.invalidateQueries({ queryKey: ['financiamentos-stats'] });
    },
  });
}

// PUT - Atualizar financiamento
export function useUpdateFinanciamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateFinanciamentoData> }) =>
      api.put<Financiamento>(`/financiamentos/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['financiamentos'] });
      queryClient.invalidateQueries({ queryKey: ['financiamento', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['financiamentos-stats'] });
    },
  });
}

// DELETE - Excluir financiamento
export function useDeleteFinanciamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/financiamentos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financiamentos'] });
      queryClient.invalidateQueries({ queryKey: ['financiamentos-stats'] });
    },
  });
}

// ============================================
// HOOKS - PARCELAS
// ============================================

// POST - Gerar parcelas
export function useGerarParcelasFinanciamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ financiamentoId }: { financiamentoId: string }) =>
      api.post(`/financiamentos/${financiamentoId}/parcelas/gerar`, {}),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['financiamento', variables.financiamentoId] });
      queryClient.invalidateQueries({ queryKey: ['financiamento-parcelas', variables.financiamentoId] });
    },
  });
}

// PATCH - Registrar pagamento de parcela
export function useRegistrarPagamentoParcelaFinanciamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ financiamentoId, parcelaId, data }: {
      financiamentoId: string;
      parcelaId: string;
      data: {
        data_pagamento: string;
        valor_pago: number;
        multa?: number;
        juros_mora?: number;
        observacao?: string;
      };
    }) => api.patch(`/financiamentos/${financiamentoId}/parcelas/${parcelaId}/pagar`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['financiamento', variables.financiamentoId] });
      queryClient.invalidateQueries({ queryKey: ['financiamento-parcelas', variables.financiamentoId] });
      queryClient.invalidateQueries({ queryKey: ['financiamentos'] });
      queryClient.invalidateQueries({ queryKey: ['financiamentos-stats'] });
    },
  });
}

// ============================================
// HOOKS - AMORTIZAÇÕES
// ============================================

// POST - Registrar amortização
export function useRegistrarAmortizacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ financiamentoId, data }: {
      financiamentoId: string;
      data: {
        data_amortizacao: string;
        valor_amortizacao: number;
        tipo_amortizacao?: 'parcial' | 'quitacao';
        reducao_tipo?: 'prazo' | 'parcela';
        observacao?: string;
      };
    }) => api.post(`/financiamentos/${financiamentoId}/amortizacoes`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['financiamento', variables.financiamentoId] });
      queryClient.invalidateQueries({ queryKey: ['financiamento-amortizacoes', variables.financiamentoId] });
      queryClient.invalidateQueries({ queryKey: ['financiamento-parcelas', variables.financiamentoId] });
      queryClient.invalidateQueries({ queryKey: ['financiamentos'] });
      queryClient.invalidateQueries({ queryKey: ['financiamentos-stats'] });
    },
  });
}

// ============================================
// HOOKS - REFINANCIAMENTO
// ============================================

// POST - Refinanciar
export function useRefinanciar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ financiamentoId, data }: {
      financiamentoId: string;
      data: {
        novo_valor_parcela: number;
        novo_prazo_meses: number;
        nova_taxa_juros?: number;
        novo_saldo_devedor: number;
        data_refinanciamento: string;
        observacao?: string;
      };
    }) => api.post(`/financiamentos/${financiamentoId}/refinanciar`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['financiamento', variables.financiamentoId] });
      queryClient.invalidateQueries({ queryKey: ['financiamento-parcelas', variables.financiamentoId] });
      queryClient.invalidateQueries({ queryKey: ['financiamentos'] });
      queryClient.invalidateQueries({ queryKey: ['financiamentos-stats'] });
    },
  });
}

// PATCH - Marcar como quitado
export function useMarcarQuitado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.patch(`/financiamentos/${id}/quitar`, {}),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['financiamentos'] });
      queryClient.invalidateQueries({ queryKey: ['financiamento', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['financiamentos-stats'] });
    },
  });
}
