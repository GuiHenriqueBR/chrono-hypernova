import React from 'react';
import { WhatsAppConversation } from '../../services/whatsapp';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Phone } from 'lucide-react';

interface WhatsAppChatListProps {
  conversations: WhatsAppConversation[];
  activeId?: string;
  onSelect: (conversation: WhatsAppConversation) => void;
}

export const WhatsAppChatList: React.FC<WhatsAppChatListProps> = ({ conversations, activeId, onSelect }) => {
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 p-4 text-center">
        <p>Nenhuma conversa encontrada</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {conversations.map((conversation) => {
        const isActive = activeId === conversation.id;
        
        return (
          <div
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={`
              flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-gray-50
              ${isActive ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}
            `}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {conversation.foto_url ? (
                <img 
                  src={conversation.foto_url} 
                  alt={conversation.nome_contato} 
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                  <User className="w-6 h-6" />
                </div>
              )}
              
              {conversation.mensagens_nao_lidas > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {conversation.mensagens_nao_lidas}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-gray-900 truncate">
                  {conversation.nome_contato || conversation.telefone}
                </h3>
                {conversation.ultima_mensagem_timestamp && (
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                    {format(new Date(conversation.ultima_mensagem_timestamp), "HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 truncate pr-2">
                  {conversation.ultima_mensagem || 'Nova conversa'}
                </p>
                {conversation.status === 'arquivada' && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-medium">
                    Arq
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
