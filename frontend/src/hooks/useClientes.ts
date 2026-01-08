import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { Cliente, Apolice, Sinistro } from "../types";

interface ClienteResponse {
  data: Cliente[];
  total: number;
}

interface CreateClienteData {
  tipo: "PF" | "PJ";
  cpf_cnpj: string;
  nome: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  endereco?: {
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  notas?: string;
}

// GET - Listar clientes
export function useClientes(
  params?: string | { search?: string; limit?: number; page?: number }
) {
  const queryParams =
    typeof params === "string" ? { search: params } : params || {};

  const { search } = queryParams;
  return useQuery<ClienteResponse>({
    queryKey: ["clientes", search],
    queryFn: () => api.get(`/clientes${search ? `?search=${search}` : ""}`),
  });
}

// GET - Cliente por ID
export function useCliente(id?: string) {
  return useQuery<Cliente>({
    queryKey: ["cliente", id],
    queryFn: () => api.get(`/clientes/${id}`),
    enabled: !!id,
  });
}

// GET - Apolices do cliente
export function useClienteApolices(clienteId?: string) {
  return useQuery<{ data: Apolice[]; total: number }>({
    queryKey: ["cliente-apolices", clienteId],
    queryFn: () => api.get(`/clientes/${clienteId}/apolices`),
    enabled: !!clienteId,
  });
}

// GET - Sinistros do cliente
export function useClienteSinistros(clienteId?: string) {
  return useQuery<{ data: Sinistro[]; total: number }>({
    queryKey: ["cliente-sinistros", clienteId],
    queryFn: () => api.get(`/clientes/${clienteId}/sinistros`),
    enabled: !!clienteId,
  });
}

// GET - Consorcios do cliente
export function useClienteConsorcios(clienteId?: string) {
  return useQuery<{ data: unknown[]; total: number }>({
    queryKey: ["cliente-consorcios", clienteId],
    queryFn: () => api.get(`/consorcios?cliente_id=${clienteId}`),
    enabled: !!clienteId,
  });
}

// GET - Planos de Saude do cliente
export function useClientePlanosSaude(clienteId?: string) {
  return useQuery<{ data: unknown[]; total: number }>({
    queryKey: ["cliente-planos-saude", clienteId],
    queryFn: () => api.get(`/planos-saude?cliente_id=${clienteId}`),
    enabled: !!clienteId,
  });
}

// GET - Financiamentos do cliente
export function useClienteFinanciamentos(clienteId?: string) {
  return useQuery<{ data: unknown[]; total: number }>({
    queryKey: ["cliente-financiamentos", clienteId],
    queryFn: () => api.get(`/financiamentos?cliente_id=${clienteId}`),
    enabled: !!clienteId,
  });
}

// GET - Cotacoes do cliente
export function useClienteCotacoes(clienteId?: string) {
  return useQuery<{ data: unknown[]; total: number }>({
    queryKey: ["cliente-cotacoes", clienteId],
    queryFn: () => api.get(`/cotacoes?cliente_id=${clienteId}`),
    enabled: !!clienteId,
  });
}

// GET - Resumo 360 do cliente (todos os produtos)
export function useClienteResumo360(clienteId?: string) {
  return useQuery<{
    apolices: { total: number; ativas: number; valor_total: number };
    sinistros: { total: number; abertos: number };
    consorcios: { total: number; ativos: number; valor_credito: number };
    planos_saude: { total: number; ativos: number; mensalidade_total: number };
    financiamentos: { total: number; ativos: number; saldo_devedor: number };
    cotacoes: { total: number; em_negociacao: number };
  }>({
    queryKey: ["cliente-resumo-360", clienteId],
    queryFn: () => api.get(`/clientes/${clienteId}/resumo-360`),
    enabled: !!clienteId,
  });
}

// GET - Stats
export function useClientesStats() {
  return useQuery<{ total: number; ativos: number; pf: number; pj: number }>({
    queryKey: ["clientes-stats"],
    queryFn: () => api.get("/clientes/stats/summary"),
  });
}

// POST - Criar cliente
export function useCreateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClienteData) =>
      api.post<Cliente>("/clientes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-stats"] });
    },
  });
}

// PUT - Atualizar cliente
export function useUpdateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateClienteData>;
    }) => api.put<Cliente>(`/clientes/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["cliente", variables.id] });
    },
  });
}

// DELETE - Excluir cliente
export function useDeleteCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/clientes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-stats"] });
    },
  });
}
