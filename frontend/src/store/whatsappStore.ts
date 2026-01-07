import { create } from 'zustand';
import { whatsappService, WhatsAppConversation, WhatsAppConnectionState } from '../services/whatsapp';

interface WhatsAppStore {
  connectionState: WhatsAppConnectionState | null;
  conversations: WhatsAppConversation[];
  activeConversation: WhatsAppConversation | null;
  isLoadingConversations: boolean;
  isLoadingConnection: boolean;
  
  // Actions
  fetchConnectionStatus: () => Promise<void>;
  fetchConversations: (params?: any) => Promise<void>;
  setActiveConversation: (conversation: WhatsAppConversation | null) => void;
  updateConversationStatus: (id: string, status: any) => void;
}

export const useWhatsAppStore = create<WhatsAppStore>((set, get) => ({
  connectionState: null,
  conversations: [],
  activeConversation: null,
  isLoadingConversations: false,
  isLoadingConnection: false,

  fetchConnectionStatus: async () => {
    set({ isLoadingConnection: true });
    try {
      const status = await whatsappService.getStatus();
      set({ connectionState: status });
      
      // Se não estiver conectado, tentar obter QR Code
      if (!status.conectado) {
        const qrData = await whatsappService.getQrCode();
        set({ connectionState: qrData });
      }
    } catch (error) {
      console.error('Erro ao buscar status do WhatsApp:', error);
    } finally {
      set({ isLoadingConnection: false });
    }
  },

  fetchConversations: async (params) => {
    set({ isLoadingConversations: true });
    try {
      const { data } = await whatsappService.getConversations(params);
      set({ conversations: data });
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  setActiveConversation: (conversation) => {
    set({ activeConversation: conversation });
    
    // Atualizar contador de não lidas localmente
    if (conversation && conversation.mensagens_nao_lidas > 0) {
      const updatedConversations = get().conversations.map(c => 
        c.id === conversation.id ? { ...c, mensagens_nao_lidas: 0 } : c
      );
      set({ conversations: updatedConversations });
    }
  },

  updateConversationStatus: (id, status) => {
    const updatedConversations = get().conversations.map(c => 
      c.id === id ? { ...c, ...status } : c
    );
    set({ conversations: updatedConversations });
  }
}));
