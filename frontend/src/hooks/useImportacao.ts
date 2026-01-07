import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export interface ImportacaoHistorico {
  id: string;
  tipo: 'clientes' | 'apolices' | 'comissoes';
  arquivo_nome: string;
  total_linhas: number;
  importados: number;
  erros: number;
  status: 'sucesso' | 'parcial' | 'erro';
  detalhes_erros?: string[];
  created_at: string;
}

export interface UploadResponse {
  success: boolean;
  arquivo: string;
  tipo: string;
  headers: string[];
  totalLinhas: number;
  previewLinhas: Record<string, unknown>[];
}

export interface PreviewResultado {
  linha: number;
  dados: Record<string, unknown>;
  valido: boolean;
  erros: string[];
}

export interface PreviewResponse {
  success: boolean;
  resumo: {
    total: number;
    validos: number;
    invalidos: number;
  };
  resultados: PreviewResultado[];
  erros: string[];
}

export interface ImportarResponse {
  success: boolean;
  resultado: {
    total: number;
    importados: number;
    erros: number;
  };
  detalhesErros: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function useImportacao() {
  const queryClient = useQueryClient();
  const token = useAuthStore.getState().token;

  // Upload de arquivo
  const uploadMutation = useMutation({
    mutationFn: async ({ arquivo, tipo }: { arquivo: File; tipo: string }) => {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('tipo', tipo);

      const response = await fetch(`${API_BASE_URL}/importacao/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao fazer upload');
      }

      return response.json() as Promise<UploadResponse>;
    },
  });

  // Preview dos dados
  const previewMutation = useMutation({
    mutationFn: async ({
      tipo,
      dados,
      mapeamento,
    }: {
      tipo: string;
      dados: Record<string, unknown>[];
      mapeamento: Record<string, string>;
    }) => {
      return api.post<PreviewResponse>('/importacao/preview', {
        tipo,
        dados,
        mapeamento,
      });
    },
  });

  // Executar importação
  const importarMutation = useMutation({
    mutationFn: async ({
      tipo,
      dados,
      mapeamento,
      nomeArquivo,
    }: {
      tipo: string;
      dados: Record<string, unknown>[];
      mapeamento: Record<string, string>;
      nomeArquivo: string;
    }) => {
      return api.post<ImportarResponse>('/importacao/importar', {
        tipo,
        dados,
        mapeamento,
        nomeArquivo,
      });
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['importacao-historico'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['apolices'] });
      queryClient.invalidateQueries({ queryKey: ['comissoes'] });
    },
  });

  return {
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,

    preview: previewMutation.mutateAsync,
    isPreviewing: previewMutation.isPending,
    previewError: previewMutation.error,

    importar: importarMutation.mutateAsync,
    isImporting: importarMutation.isPending,
    importError: importarMutation.error,
  };
}

export function useImportacaoHistorico(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['importacao-historico', page, limit],
    queryFn: () =>
      api.get<{
        data: ImportacaoHistorico[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/importacao/historico?page=${page}&limit=${limit}`),
  });
}

export function useDownloadTemplate() {
  const token = useAuthStore.getState().token;

  const downloadTemplate = async (tipo: 'clientes' | 'apolices' | 'comissoes') => {
    const response = await fetch(`${API_BASE_URL}/importacao/template/${tipo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao baixar template');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${tipo}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return { downloadTemplate };
}
