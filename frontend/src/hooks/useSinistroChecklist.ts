import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { ApiResponse } from "../types";

// Tipos
export interface ChecklistItem {
  id: string;
  sinistro_id: string;
  nome_documento: string;
  obrigatorio: boolean;
  recebido: boolean;
  aprovado: boolean;
  documento_id?: string;
  data_recebimento?: string;
  observacao?: string;
  ordem: number;
  created_at: string;
  documento?: {
    id: string;
    nome_arquivo: string;
  };
}

export interface ChecklistProgresso {
  total: number;
  recebidos: number;
  aprovados: number;
  percentual_recebido: number;
  percentual_aprovado: number;
}

export interface ChecklistSinistro {
  sinistro_id: string;
  ramo?: string;
  itens: ChecklistItem[];
  progresso: ChecklistProgresso;
}

export interface ChecklistPadrao {
  ramo: string;
  itens: { nome: string; obrigatorio: boolean }[];
  total: number;
  obrigatorios: number;
}

// ========== QUERIES ==========

// Obter checklist do sinistro
export function useChecklistSinistro(sinistroId: string) {
  return useQuery({
    queryKey: ["sinistro", sinistroId, "checklist"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ChecklistSinistro>>(
        `/sinistros/${sinistroId}/checklist`
      );
      return data;
    },
    enabled: !!sinistroId,
  });
}

// Obter checklist padrao por ramo
export function useChecklistPadrao(ramo: string) {
  return useQuery({
    queryKey: ["checklists", "padrao", ramo],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ChecklistPadrao>>(
        `/sinistros/checklists/padrao/${ramo}`
      );
      return data;
    },
    enabled: !!ramo,
  });
}

// Listar ramos disponiveis
export function useRamosChecklist() {
  return useQuery({
    queryKey: ["checklists", "ramos"],
    queryFn: async () => {
      const { data } = await api.get<
        ApiResponse<{
          ramos: { codigo: string; nome: string; total: number }[];
        }>
      >("/sinistros/checklists/ramos");
      return data;
    },
  });
}

// ========== MUTATIONS ==========

// Atualizar item do checklist
export function useAtualizarItemChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sinistroId,
      itemId,
      dados,
    }: {
      sinistroId: string;
      itemId: string;
      dados: {
        recebido?: boolean;
        aprovado?: boolean;
        documento_id?: string;
        observacao?: string;
        data_recebimento?: string;
      };
    }) => {
      const response = await api.patch<ChecklistItem>(
        `/sinistros/${sinistroId}/checklist/${itemId}`,
        dados
      );
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sinistro", variables.sinistroId, "checklist"],
      });
    },
  });
}

// Adicionar item customizado
export function useAdicionarItemChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sinistroId,
      nome_documento,
      obrigatorio = false,
    }: {
      sinistroId: string;
      nome_documento: string;
      obrigatorio?: boolean;
    }) => {
      const response = await api.post<ChecklistItem>(
        `/sinistros/${sinistroId}/checklist`,
        {
          nome_documento,
          obrigatorio,
        }
      );
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sinistro", variables.sinistroId, "checklist"],
      });
    },
  });
}

// Remover item do checklist
export function useRemoverItemChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sinistroId,
      itemId,
    }: {
      sinistroId: string;
      itemId: string;
    }) => {
      await api.delete(`/sinistros/${sinistroId}/checklist/${itemId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sinistro", variables.sinistroId, "checklist"],
      });
    },
  });
}

// Vincular documento ao item
export function useVincularDocumentoChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sinistroId,
      itemId,
      documentoId,
    }: {
      sinistroId: string;
      itemId: string;
      documentoId: string;
    }) => {
      const response = await api.post<ChecklistItem>(
        `/sinistros/${sinistroId}/checklist/${itemId}/vincular`,
        {
          documento_id: documentoId,
        }
      );
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sinistro", variables.sinistroId, "checklist"],
      });
    },
  });
}

// Resetar checklist
export function useResetarChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sinistroId: string) => {
      const response = await api.post<ChecklistSinistro>(
        `/sinistros/${sinistroId}/checklist/resetar`,
        {}
      );
      return response;
    },
    onSuccess: (_, sinistroId) => {
      queryClient.invalidateQueries({
        queryKey: ["sinistro", sinistroId, "checklist"],
      });
    },
  });
}
