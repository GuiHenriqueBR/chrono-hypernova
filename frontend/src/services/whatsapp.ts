import { api } from './api';

export interface WhatsAppConnectionState {
  conectado: boolean;
  estado: string;
  instancia: string;
  qrcode?: string;
  pairingCode?: string;
  mensagem?: string;
  numero?: string;
  nome?: string;
  foto?: string;
}

export interface WhatsAppConversation {
  id: string;
  cliente_id?: string;
  nome_contato: string;
  telefone: string;
  foto_url?: string;
  ultima_mensagem?: string;
  ultima_mensagem_timestamp?: string;
  mensagens_nao_lidas: number;
  status: 'aberta' | 'em_atendimento' | 'resolvida' | 'arquivada';
  cliente?: {
    id: string;
    nome: string;
    email: string;
  };
}

export interface WhatsAppMessage {
  id: string;
  conversa_id: string;
  direcao: 'enviada' | 'recebida';
  tipo: 'texto' | 'imagem' | 'documento' | 'audio' | 'video';
  conteudo: string;
  media_url?: string;
  status: 'enviada' | 'entregue' | 'lida' | 'erro' | 'pendente';
  timestamp: string;
}

export interface WhatsAppTemplate {
  id: string;
  nome: string;
  categoria: string;
  conteudo: string;
  variaveis?: any;
  uso_count: number;
}

class WhatsAppService {
  async getStatus(): Promise<WhatsAppConnectionState> {
    const response = await api.get<WhatsAppConnectionState>('/whatsapp/status');
    return response;
  }

  async getQrCode(): Promise<WhatsAppConnectionState> {
    const response = await api.get<WhatsAppConnectionState>('/whatsapp/qrcode');
    return response;
  }

  async createInstance(nomeInstancia?: string): Promise<any> {
    const response = await api.post('/whatsapp/instancia/criar', { nomeInstancia });
    return response;
  }

  async disconnect(): Promise<any> {
    const response = await api.post('/whatsapp/desconectar', {});
    return response;
  }

  async restart(): Promise<any> {
    const response = await api.post('/whatsapp/reiniciar', {});
    return response;
  }

  async getConversations(params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<{ data: WhatsAppConversation[]; total: number }> {
    // Montar query string manual porque o get<T> do api.ts não aceita params no segundo argumento da forma como estava sendo usado
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
    }
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    const response = await api.get<{ data: WhatsAppConversation[]; total: number }>(`/whatsapp/conversas${queryString}`);
    return response;
  }

  async getMessages(conversaId: string, page = 1): Promise<{ data: WhatsAppMessage[]; total: number }> {
    const response = await api.get<{ data: WhatsAppMessage[]; total: number }>(`/whatsapp/conversas/${conversaId}/mensagens?page=${page}`);
    return response;
  }

  async sendMessage(payload: { conversaId?: string; telefone?: string; mensagem: string }): Promise<any> {
    const response = await api.post('/whatsapp/enviar', payload);
    return response;
  }

  async sendMedia(payload: { conversaId?: string; telefone?: string; tipo: string; mediaUrl: string; caption?: string }): Promise<any> {
    const response = await api.post('/whatsapp/enviar-midia', payload);
    return response;
  }

  async getTemplates(categoria?: string): Promise<{ data: WhatsAppTemplate[] }> {
    const queryString = categoria ? `?categoria=${categoria}` : '';
    const response = await api.get<{ data: WhatsAppTemplate[] }>(`/whatsapp/templates${queryString}`);
    return response;
  }

  async processTemplate(template: string, clienteId?: string, contexto?: any): Promise<{ mensagem: string }> {
    const response = await api.post<{ mensagem: string }>('/whatsapp/templates/processar', { template, clienteId, contexto });
    return response;
  }
}

export const whatsappService = new WhatsAppService();
