import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  Sinistro,
  StatusSinistro,
  RegulacaoEvento,
  RegulacaoEventoData,
  SinistroDocumento,
} from "../types";

interface SinistrosResponse {
  data: Sinistro[];
  total: number;
  page: number;
  limit: number;
}

// SinismoComRelacionamentos can be removed if Sinistro now covers it,
// OR updated to extend Sinistro without redefining props if they match.
// But mostly we can just use Sinistro if we updated it correctly.
type SinistroComRelacionamentos = Sinistro;

interface SinistrosFilters {
  cliente_id?: string;
  apolice_id?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface CreateSinistroData {
  cliente_id: string;
  apolice_id: string;
  data_ocorrencia: string;
  descricao_ocorrencia: string;
  status?: StatusSinistro;
  regulador?: string;
  valor_indenizacao?: number;
}

interface UpdateSinistroData extends Partial<CreateSinistroData> {
  data_pagamento?: string;
  observacao_status?: string;
}

interface SinistrosStats {
  total: number;
  abertos: number;
  em_regulacao: number;
  pagos: number;
  recusados: number;
  valorIndenizadoMes: number;
}

// GET - Listar sinistros
export function useSinistros(filters?: SinistrosFilters) {
  const params = new URLSearchParams();
  if (filters?.cliente_id) params.set("cliente_id", filters.cliente_id);
  if (filters?.apolice_id) params.set("apolice_id", filters.apolice_id);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  return useQuery<SinistrosResponse>({
    queryKey: ["sinistros", filters],
    queryFn: () =>
      api.get(`/sinistros${params.toString() ? `?${params}` : ""}`),
  });
}

// GET - Sinistro por ID (com regulacao e documentos)
export function useSinistro(id?: string) {
  return useQuery<SinistroComRelacionamentos>({
    queryKey: ["sinistro", id],
    queryFn: () => api.get(`/sinistros/${id}`),
    enabled: !!id,
  });
}

// GET - Timeline de Regulacao do sinistro
export function useSinistroRegulacao(sinistroId?: string) {
  return useQuery<{ data: RegulacaoEvento[] }>({
    queryKey: ["sinistro-regulacao", sinistroId],
    queryFn: () => api.get(`/sinistros/${sinistroId}/regulacao`),
    enabled: !!sinistroId,
  });
}

// GET - Documentos do sinistro
export function useSinistroDocumentos(sinistroId?: string) {
  return useQuery<{ data: SinistroDocumento[] }>({
    queryKey: ["sinistro-documentos", sinistroId],
    queryFn: () => api.get(`/sinistros/${sinistroId}/documentos`),
    enabled: !!sinistroId,
  });
}

// GET - Stats de sinistros
export function useSinistrosStats() {
  return useQuery<SinistrosStats>({
    queryKey: ["sinistros-stats"],
    queryFn: () => api.get("/sinistros/stats/summary"),
  });
}

// POST - Criar sinistro
export function useCreateSinistro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSinistroData) =>
      api.post<Sinistro>("/sinistros", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sinistros"] });
      queryClient.invalidateQueries({ queryKey: ["sinistros-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cliente-sinistros"] });
    },
  });
}

// PUT - Atualizar sinistro
export function useUpdateSinistro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSinistroData }) =>
      api.put<Sinistro>(`/sinistros/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sinistros"] });
      queryClient.invalidateQueries({ queryKey: ["sinistro", variables.id] });
      queryClient.invalidateQueries({
        queryKey: ["sinistro-regulacao", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["sinistros-stats"] });
    },
  });
}

// DELETE - Excluir sinistro
export function useDeleteSinistro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/sinistros/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sinistros"] });
      queryClient.invalidateQueries({ queryKey: ["sinistros-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cliente-sinistros"] });
    },
  });
}

// PUT - Atualizar status do sinistro
export function useUpdateSinistroStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      observacao,
    }: {
      id: string;
      status: StatusSinistro;
      observacao?: string;
    }) =>
      api.put<Sinistro>(`/sinistros/${id}`, {
        status,
        observacao_status: observacao,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sinistros"] });
      queryClient.invalidateQueries({ queryKey: ["sinistro", variables.id] });
      queryClient.invalidateQueries({
        queryKey: ["sinistro-regulacao", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["sinistros-stats"] });
    },
  });
}

// ========== REGULACAO ==========

// POST - Adicionar evento na timeline
export function useAddRegulacaoEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sinistroId,
      data,
    }: {
      sinistroId: string;
      data: RegulacaoEventoData;
    }) => api.post<RegulacaoEvento>(`/sinistros/${sinistroId}/regulacao`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sinistro", variables.sinistroId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sinistro-regulacao", variables.sinistroId],
      });
    },
  });
}

// PATCH - Atualizar evento da regulacao
export function useUpdateRegulacaoEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sinistroId,
      eventoId,
      status,
      observacao,
    }: {
      sinistroId: string;
      eventoId: string;
      status: string;
      observacao?: string;
    }) =>
      api.patch(`/sinistros/${sinistroId}/regulacao/${eventoId}`, {
        status,
        observacao,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sinistro", variables.sinistroId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sinistro-regulacao", variables.sinistroId],
      });
    },
  });
}

// ========== DOCUMENTOS ==========

// POST - Upload de documento real
export function useUploadSinistroDocumento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sinistroId,
      file,
      tipo,
      observacao,
    }: {
      sinistroId: string;
      file: File;
      tipo: string;
      observacao?: string;
    }) => {
      const formData = new FormData();
      formData.append("arquivo", file);
      formData.append("tipo", tipo);
      if (observacao) formData.append("observacao", observacao);

      return api.upload<SinistroDocumento>(
        `/sinistros/${sinistroId}/documentos`,
        formData
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sinistro", variables.sinistroId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sinistro-documentos", variables.sinistroId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sinistro-regulacao", variables.sinistroId],
      });
    },
  });
}

// GET - Download URL do documento
export function useDownloadSinistroDocumento() {
  return useMutation({
    mutationFn: async ({
      sinistroId,
      docId,
    }: {
      sinistroId: string;
      docId: string;
    }) => {
      return api.getDownloadUrl(
        `/sinistros/${sinistroId}/documentos/${docId}/download`
      );
    },
  });
}

// PATCH - Atualizar status do documento
export function useUpdateSinistroDocumentoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sinistroId,
      docId,
      status,
      observacoes,
    }: {
      sinistroId: string;
      docId: string;
      status: "pendente" | "aprovado" | "rejeitado";
      observacoes?: string;
    }) =>
      api.patch(`/sinistros/${sinistroId}/documentos/${docId}`, {
        status,
        observacoes,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sinistro", variables.sinistroId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sinistro-documentos", variables.sinistroId],
      });
    },
  });
}

// DELETE - Remover documento
export function useRemoveSinistroDocumento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sinistroId,
      docId,
    }: {
      sinistroId: string;
      docId: string;
    }) => api.delete(`/sinistros/${sinistroId}/documentos/${docId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sinistro", variables.sinistroId],
      });
      queryClient.invalidateQueries({
        queryKey: ["sinistro-documentos", variables.sinistroId],
      });
    },
  });
}

// Hook legado mantido por compatibilidade
export function useAddSinistroDocumento() {
  const uploadDoc = useUploadSinistroDocumento();
  return uploadDoc;
}
