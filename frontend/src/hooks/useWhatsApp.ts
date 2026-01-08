import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export interface WhatsAppConversa {
  id: string;
  telefone: string;
  cliente_id: string | null;
  nome_contato: string;
  ultima_mensagem: string;
  ultima_mensagem_data: string;
  nao_lidas: number;
  status: "aberta" | "em_atendimento" | "resolvida" | "arquivada";
  notas?: string;
  atribuido_usuario_id?: string | null;
  created_at: string;
  clientes?: {
    id: string;
    nome: string;
    email: string;
  } | null;
}

export interface WhatsAppMensagem {
  id: string;
  conversa_id: string;
  message_id: string;
  direcao: "enviada" | "recebida";
  tipo: "texto" | "imagem" | "audio" | "documento" | "video";
  conteudo: string;
  status: "pendente" | "enviada" | "entregue" | "lida" | "recebida";
  timestamp: string;
}

export interface WhatsAppTemplate {
  id: string;
  nome: string;
  categoria: string;
  conteudo: string;
  variaveis?: string[];
  uso_count?: number;
  ultimo_uso?: string;
}

export interface TemplateCategoria {
  value: string;
  label: string;
  icon: string;
  cor: string;
}

export interface TemplateVariavel {
  nome: string;
  descricao: string;
  exemplo: string;
}

export interface WhatsAppMetricas {
  totalConversas: number;
  conversasAbertas: number;
  mensagensHoje: number;
  mensagensSemana: number;
  mensagensMes: number;
  clientesVinculados: number;
  taxaVinculacao: number;
}

export interface WhatsAppStatus {
  conectado: boolean;
  estado: string;
  instancia: string;
  mensagem?: string;
}

// Hook para conversas
export function useWhatsAppConversas(options?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { status = "todas", search = "", page = 1, limit = 50 } = options || {};

  return useQuery({
    queryKey: ["whatsapp-conversas", status, search, page, limit],
    queryFn: () =>
      api.get<{ data: WhatsAppConversa[]; total: number }>(
        `/whatsapp/conversas?status=${status}&search=${search}&page=${page}&limit=${limit}`
      ),
    refetchInterval: 10000, // Refetch a cada 10 segundos
  });
}

// Hook para mensagens de uma conversa
export function useWhatsAppMensagens(conversaId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-mensagens", conversaId],
    queryFn: () =>
      api.get<{ data: WhatsAppMensagem[]; total: number }>(
        `/whatsapp/conversas/${conversaId}/mensagens`
      ),
    enabled: !!conversaId,
    refetchInterval: 5000, // Refetch a cada 5 segundos
  });
}

// Hook para enviar mensagem
export function useEnviarMensagem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      conversaId?: string;
      telefone?: string;
      mensagem: string;
    }) =>
      api.post<{ success: boolean; messageId?: string; warning?: string }>(
        "/whatsapp/enviar",
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversas"] });
      if (variables.conversaId) {
        queryClient.invalidateQueries({
          queryKey: ["whatsapp-mensagens", variables.conversaId],
        });
      }
    },
  });
}

// Hook para templates
export function useWhatsAppTemplates(categoria?: string) {
  return useQuery({
    queryKey: ["whatsapp-templates", categoria],
    queryFn: () =>
      api.get<{ data: WhatsAppTemplate[] }>(
        `/whatsapp/templates${
          categoria && categoria !== "todos" ? `?categoria=${categoria}` : ""
        }`
      ),
  });
}

// Hook para categorias de templates
export function useTemplateCategorias() {
  return useQuery({
    queryKey: ["whatsapp-template-categorias"],
    queryFn: () =>
      api.get<{ data: TemplateCategoria[] }>("/whatsapp/templates/categorias"),
  });
}

// Hook para variaveis de templates
export function useTemplateVariaveis() {
  return useQuery({
    queryKey: ["whatsapp-template-variaveis"],
    queryFn: () =>
      api.get<{ data: TemplateVariavel[] }>("/whatsapp/templates/variaveis"),
  });
}

// Hook para registrar uso de template
export function useRegistrarUsoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) =>
      api.post(`/whatsapp/templates/${templateId}/usar`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
  });
}

// Hook para processar variaveis do template
export function useProcessarTemplate() {
  return useMutation({
    mutationFn: (data: {
      template: string;
      clienteId?: string;
      contexto?: Record<string, string>;
    }) =>
      api.post<{ mensagem: string; original: string }>(
        "/whatsapp/templates/processar",
        data
      ),
  });
}

// Hook para criar/atualizar template
export function useSalvarTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<WhatsAppTemplate>) =>
      api.post<{ data: WhatsAppTemplate }>("/whatsapp/templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
  });
}

// Hook para deletar template
export function useDeletarTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/whatsapp/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
  });
}

// Hook para vincular conversa a cliente
export function useVincularCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversaId,
      clienteId,
    }: {
      conversaId: string;
      clienteId: string;
    }) => api.post(`/whatsapp/conversas/${conversaId}/vincular`, { clienteId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversas"] });
    },
  });
}

// Hook para atualizar status da conversa
export function useAtualizarStatusConversa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversaId,
      status,
      notas,
    }: {
      conversaId: string;
      status: string;
      notas?: string;
    }) =>
      api.patch(`/whatsapp/conversas/${conversaId}/status`, { status, notas }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversas"] });
    },
  });
}

// Hook para atribuir conversa a um usuário
export function useAtribuirConversa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversaId,
      usuarioId,
    }: {
      conversaId: string;
      usuarioId: string | null;
    }) =>
      api.patch(`/whatsapp/conversas/${conversaId}/atribuir`, { usuarioId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversas"] });
    },
  });
}

// Hook para metricas
export function useWhatsAppMetricas() {
  return useQuery({
    queryKey: ["whatsapp-metricas"],
    queryFn: () => api.get<WhatsAppMetricas>("/whatsapp/metricas"),
    refetchInterval: 30000, // Refetch a cada 30 segundos
  });
}

// Hook para status da conexao
export function useWhatsAppStatus() {
  return useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: () => api.get<WhatsAppStatus>("/whatsapp/status"),
    refetchInterval: 15000, // Refetch a cada 15 segundos
  });
}

// Interface para QR Code
export interface WhatsAppQRCode {
  success: boolean;
  conectado: boolean;
  estado: string;
  qrcode?: string;
  pairingCode?: string;
  instancia: string;
  mensagem?: string;
}

// Interface para Info da instancia
export interface WhatsAppInfo {
  success: boolean;
  instancia: string;
  estado?: string;
  numero?: string;
  nome?: string;
  foto?: string;
  mensagem?: string;
  error?: string;
}

// Hook para obter QR Code
export function useWhatsAppQRCode(enabled: boolean = true) {
  return useQuery({
    queryKey: ["whatsapp-qrcode"],
    queryFn: () => api.get<WhatsAppQRCode>("/whatsapp/qrcode"),
    enabled,
    refetchInterval: (query) => {
      // Se conectado, para de fazer polling
      if (query.state.data?.conectado) return false;
      // Se nao conectado, refetch a cada 3 segundos
      return 3000;
    },
  });
}

// Hook para informacoes da instancia
export function useWhatsAppInfo() {
  return useQuery({
    queryKey: ["whatsapp-info"],
    queryFn: () => api.get<WhatsAppInfo>("/whatsapp/info"),
    refetchInterval: 30000,
  });
}

// Hook para desconectar
export function useWhatsAppDesconectar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<{ success: boolean; mensagem: string }>(
        "/whatsapp/desconectar",
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-qrcode"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-info"] });
    },
  });
}

// Hook para reiniciar instancia
export function useWhatsAppReiniciar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<{ success: boolean; mensagem: string }>(
        "/whatsapp/reiniciar",
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-qrcode"] });
    },
  });
}

// Hook para criar instancia
export function useWhatsAppCriarInstancia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nomeInstancia?: string) =>
      api.post<{ success: boolean; instancia: string; mensagem?: string }>(
        "/whatsapp/instancia/criar",
        { nomeInstancia }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-qrcode"] });
    },
  });
}

// Hook para configurar webhook
export function useWhatsAppConfigurarWebhook() {
  return useMutation({
    mutationFn: (webhookUrl?: string) =>
      api.post<{ success: boolean; mensagem: string; url: string }>(
        "/whatsapp/webhook/configurar",
        { webhookUrl }
      ),
  });
}

// Hook para enviar midia
export function useEnviarMidia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      conversaId?: string;
      telefone?: string;
      tipo: "imagem" | "documento" | "audio";
      mediaUrl: string;
      caption?: string;
      fileName?: string;
    }) =>
      api.post<{ success: boolean; messageId?: string }>(
        "/whatsapp/enviar-midia",
        data
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversas"] });
      if (variables.conversaId) {
        queryClient.invalidateQueries({
          queryKey: ["whatsapp-mensagens", variables.conversaId],
        });
      }
    },
  });
}
