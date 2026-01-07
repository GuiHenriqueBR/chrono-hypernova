import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Tarefa, PrioridadeTarefa, TipoTarefa } from '../types';

// ========== CALENDAR TYPES ==========

export interface EventoCalendario {
  id: string;
  tipo: 'tarefa' | 'followup' | 'renovacao';
  titulo: string;
  subtitulo?: string;
  data: string;
  cor: 'red' | 'amber' | 'emerald' | 'violet' | 'cyan' | 'slate';
  concluido: boolean;
  prioridade?: PrioridadeTarefa;
  tipo_tarefa?: TipoTarefa;
  status_pipeline?: string;
  cliente?: string;
  cliente_id?: string;
  referencia_id: string;
  referencia_tipo: 'tarefa' | 'cotacao' | 'apolice';
}

interface CalendarioResponse {
  data: EventoCalendario[];
  total: number;
  periodo: {
    inicio: string;
    fim: string;
  };
}

interface DiaCalendarioResponse {
  data: string;
  tarefas: TarefaComRelacionamentos[];
  followups: any[];
  renovacoes: any[];
  resumo: {
    total_tarefas: number;
    total_followups: number;
    total_renovacoes: number;
    tarefas_pendentes: number;
  };
}

// ========== CALENDAR HOOKS ==========

// GET - Eventos do calendario por periodo
export function useEventosCalendario(inicio: string, fim: string) {
  return useQuery<CalendarioResponse>({
    queryKey: ['calendario-eventos', inicio, fim],
    queryFn: () => api.get(`/agenda/calendario?inicio=${inicio}&fim=${fim}`),
    enabled: !!inicio && !!fim,
  });
}

// GET - Resumo de um dia especifico
export function useDiaCalendario(data: string | null) {
  return useQuery<DiaCalendarioResponse>({
    queryKey: ['calendario-dia', data],
    queryFn: () => api.get(`/agenda/calendario/dia/${data}`),
    enabled: !!data,
  });
}

interface TarefasResponse {
  data: TarefaComRelacionamentos[];
  total: number;
}

interface TarefaComRelacionamentos extends Tarefa {
  clientes?: {
    nome: string;
  };
  apolices?: {
    numero_apolice: string;
  };
}

interface TarefasFilters {
  usuario_id?: string;
  status?: 'concluidas' | 'pendentes';
  prioridade?: PrioridadeTarefa;
  tipo?: TipoTarefa;
}

interface CreateTarefaData {
  tipo: TipoTarefa;
  descricao: string;
  data_vencimento: string;
  prioridade: PrioridadeTarefa;
  cliente_id?: string;
  apolice_id?: string;
  concluida?: boolean;
}

interface TarefasStats {
  total: number;
  pendentes: number;
  concluidas: number;
  hoje: number;
  atrasadas: number;
  alta_prioridade: number;
}

// GET - Listar tarefas
export function useTarefas(filters?: TarefasFilters) {
  const params = new URLSearchParams();
  if (filters?.usuario_id) params.set('usuario_id', filters.usuario_id);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.prioridade) params.set('prioridade', filters.prioridade);
  if (filters?.tipo) params.set('tipo', filters.tipo);

  return useQuery<TarefasResponse>({
    queryKey: ['tarefas', filters],
    queryFn: () => api.get(`/agenda/tarefas${params.toString() ? `?${params}` : ''}`),
  });
}

// GET - Tarefa por ID
export function useTarefa(id?: string) {
  return useQuery<Tarefa>({
    queryKey: ['tarefa', id],
    queryFn: () => api.get(`/agenda/tarefas/${id}`),
    enabled: !!id,
  });
}

// GET - Stats de tarefas
export function useTarefasStats() {
  return useQuery<TarefasStats>({
    queryKey: ['tarefas-stats'],
    queryFn: () => api.get('/agenda/tarefas/stats/summary'),
  });
}

// POST - Criar tarefa
export function useCriarTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTarefaData) => api.post<Tarefa>('/agenda/tarefas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-stats'] });
    },
  });
}

// PUT - Atualizar tarefa
export function useAtualizarTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTarefaData> }) =>
      api.put<Tarefa>(`/agenda/tarefas/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefa', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-stats'] });
    },
  });
}

// DELETE - Deletar tarefa
export function useDeletarTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/agenda/tarefas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-stats'] });
    },
  });
}

// PATCH - Toggle concluida
export function useToggleTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.patch<Tarefa>(`/agenda/tarefas/${id}/toggle`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-stats'] });
    },
  });
}
