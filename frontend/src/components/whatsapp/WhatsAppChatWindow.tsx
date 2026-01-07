import React, { useRef, useEffect } from 'react';
import { WhatsAppMessage } from '../../services/whatsapp';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck, FileText, Image as ImageIcon, Mic } from 'lucide-react';

interface WhatsAppChatWindowProps {
  messages: WhatsAppMessage[];
  currentUserId?: string; // Para identificar mensagens enviadas por mim
}

export const WhatsAppChatWindow: React.FC<WhatsAppChatWindowProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const renderMessageContent = (message: WhatsAppMessage) => {
    switch (message.tipo) {
      case 'imagem':
        return (
          <div className="space-y-2">
            <img 
              src={message.media_url} 
              alt="Mídia" 
              className="max-w-xs sm:max-w-sm rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => window.open(message.media_url, '_blank')}
            />
            {message.conteudo && message.conteudo !== '[Midia]' && (
              <p className="text-sm">{message.conteudo}</p>
            )}
          </div>
        );
      
      case 'documento':
        return (
          <div className="flex items-center gap-3 bg-black/5 p-3 rounded-lg max-w-xs">
            <div className="bg-red-500 p-2 rounded text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{message.conteudo}</p>
              <a 
                href={message.media_url} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Baixar documento
              </a>
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="min-w-[200px]">
            <audio controls className="w-full h-8">
              <source src={message.media_url} type="audio/ogg" />
              <source src={message.media_url} type="audio/mpeg" />
              Seu navegador não suporta áudio.
            </audio>
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap break-words">{message.conteudo}</p>;
    }
  };

  const renderStatus = (status: WhatsAppMessage['status']) => {
    switch (status) {
      case 'lida':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
      case 'entregue':
        return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
      case 'enviada':
        return <Check className="w-3.5 h-3.5 text-gray-400" />;
      default:
        return <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />;
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#efeae2] bg-opacity-50">
        <div className="text-center p-8 bg-white/80 backdrop-blur rounded-xl shadow-sm max-w-md mx-4">
          <p className="text-gray-600">
            Nenhuma mensagem nesta conversa ainda.
            <br />
            Envie a primeira mensagem para começar o atendimento.
          </p>
        </div>
      </div>
    );
  }

  // Agrupar mensagens por data
  const groupedMessages: { [key: string]: WhatsAppMessage[] } = {};
  messages.forEach(msg => {
    const date = format(new Date(msg.timestamp), 'yyyy-MM-dd');
    if (!groupedMessages[date]) groupedMessages[date] = [];
    groupedMessages[date].push(msg);
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-[#efeae2] space-y-6 custom-scrollbar">
      {Object.entries(groupedMessages).map(([date, msgs]) => (
        <div key={date} className="space-y-4">
          <div className="flex justify-center sticky top-0 z-10">
            <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm border border-gray-100">
              {format(new Date(date), "d 'de' MMMM, yyyy", { locale: ptBR })}
            </span>
          </div>

          <div className="space-y-1">
            {msgs.map((msg) => {
              const isMine = msg.direcao === 'enviada';
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`
                      relative max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-2 shadow-sm
                      ${isMine ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}
                    `}
                  >
                    {renderMessageContent(msg)}
                    
                    <div className="flex items-center justify-end gap-1 mt-1 -mb-1">
                      <span className="text-[10px] text-gray-500">
                        {format(new Date(msg.timestamp), 'HH:mm')}
                      </span>
                      {isMine && renderStatus(msg.status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
