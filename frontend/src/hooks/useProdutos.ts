import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Produto, ProdutoCampo, CategoriaProduto } from '../types';

// ============================================
// TIPOS
// ============================================

interface ProdutosResponse {
  data: Produto[];
  total: number;
}

interface ProdutosFilters {
  categoria?: CategoriaProduto;
  ativo?: boolean;
  search?: string;
}

interface CreateProdutoData {
  codigo: string;
  nome: string;
  descricao?: string;
  categoria: CategoriaProduto;
  icone?: string;
  cor?: string;
  ordem?: number;
}

interface CreateProdutoCampoData {
  nome_campo: string;
  label: string;
  tipo_campo: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'currency' | 'cpf_cnpj' | 'telefone' | 'email';
  obrigatorio?: boolean;
  opcoes?: { valor: string; label: string }[];
  valor_padrao?: string;
  validacao?: Record<string, unknown>;
  ordem?: number;
}

// ============================================
// HOOKS - PRODUTOS
// ============================================

// GET - Listar produtos
export function useProdutos(filters?: ProdutosFilters) {
  const params = new URLSearchParams();
  if (filters?.categoria) params.set('categoria', filters.categoria);
  if (filters?.ativo !== undefined) params.set('ativo', String(filters.ativo));
  if (filters?.search) params.set('search', filters.search);

  return useQuery<ProdutosResponse>({
    queryKey: ['produtos', filters],
    queryFn: () => api.get(`/produtos${params.toString() ? `?${params}` : ''}`),
  });
}

// GET - Produtos por categoria
export function useProdutosPorCategoria(categoria: CategoriaProduto) {
  return useQuery<{ data: Produto[] }>({
    queryKey: ['produtos-categoria', categoria],
    queryFn: () => api.get(`/produtos/categoria/${categoria}`),
  });
}

// GET - Produto por ID
export function useProduto(id?: string) {
  return useQuery<Produto & { produto_campos: ProdutoCampo[] }>({
    queryKey: ['produto', id],
    queryFn: () => api.get(`/produtos/${id}`),
    enabled: !!id,
  });
}

// GET - Produto por código
export function useProdutoByCodigo(codigo?: string) {
  return useQuery<Produto & { produto_campos: ProdutoCampo[] }>({
    queryKey: ['produto-codigo', codigo],
    queryFn: () => api.get(`/produtos/codigo/${codigo}`),
    enabled: !!codigo,
  });
}

// GET - Campos do produto
export function useProdutoCampos(produtoId?: string) {
  return useQuery<{ data: ProdutoCampo[] }>({
    queryKey: ['produto-campos', produtoId],
    queryFn: () => api.get(`/produtos/${produtoId}/campos`),
    enabled: !!produtoId,
  });
}

// GET - Categorias disponíveis
export function useCategorias() {
  return useQuery<{ data: { categoria: CategoriaProduto; count: number }[] }>({
    queryKey: ['produtos-categorias'],
    queryFn: () => api.get('/produtos/categorias'),
  });
}

// POST - Criar produto
export function useCreateProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProdutoData) => api.post<Produto>('/produtos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produtos-categorias'] });
    },
  });
}

// PUT - Atualizar produto
export function useUpdateProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProdutoData> }) =>
      api.put<Produto>(`/produtos/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produto', variables.id] });
    },
  });
}

// DELETE - Excluir produto
export function useDeleteProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/produtos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produtos-categorias'] });
    },
  });
}

// PATCH - Ativar/Desativar produto
export function useToggleProdutoAtivo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      api.patch(`/produtos/${id}/toggle`, { ativo }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produto', variables.id] });
    },
  });
}

// ============================================
// HOOKS - CAMPOS
// ============================================

// POST - Adicionar campo ao produto
export function useAddProdutoCampo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ produtoId, data }: { produtoId: string; data: CreateProdutoCampoData }) =>
      api.post<ProdutoCampo>(`/produtos/${produtoId}/campos`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['produto', variables.produtoId] });
      queryClient.invalidateQueries({ queryKey: ['produto-campos', variables.produtoId] });
    },
  });
}

// PUT - Atualizar campo
export function useUpdateProdutoCampo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ produtoId, campoId, data }: {
      produtoId: string;
      campoId: string;
      data: Partial<CreateProdutoCampoData>;
    }) => api.put<ProdutoCampo>(`/produtos/${produtoId}/campos/${campoId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['produto', variables.produtoId] });
      queryClient.invalidateQueries({ queryKey: ['produto-campos', variables.produtoId] });
    },
  });
}

// DELETE - Remover campo
export function useDeleteProdutoCampo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ produtoId, campoId }: { produtoId: string; campoId: string }) =>
      api.delete(`/produtos/${produtoId}/campos/${campoId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['produto', variables.produtoId] });
      queryClient.invalidateQueries({ queryKey: ['produto-campos', variables.produtoId] });
    },
  });
}

// PATCH - Reordenar campos
export function useReordenarCampos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ produtoId, ordem }: { produtoId: string; ordem: { id: string; ordem: number }[] }) =>
      api.patch(`/produtos/${produtoId}/campos/reordenar`, { ordem }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['produto', variables.produtoId] });
      queryClient.invalidateQueries({ queryKey: ['produto-campos', variables.produtoId] });
    },
  });
}
