import React, { useState } from 'react';
import { Send, Paperclip, Mic, Image as ImageIcon, X } from 'lucide-react';
import { whatsappService } from '../../services/whatsapp';
import { toast } from 'react-hot-toast';

interface WhatsAppInputProps {
  conversaId: string;
  onMessageSent: () => void;
}

export const WhatsAppInput: React.FC<WhatsAppInputProps> = ({ conversaId, onMessageSent }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await whatsappService.sendMessage({
        conversaId,
        mensagem: message.trim()
      });
      setMessage('');
      onMessageSent();
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-[#f0f2f5] px-4 py-3 flex items-end gap-2 border-t border-gray-200">
      {/* Attachments Menu */}
      <div className="relative pb-1">
        <button
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className={`p-2 rounded-full transition-colors ${showAttachMenu ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          <Paperclip className="w-6 h-6" />
        </button>

        {showAttachMenu && (
          <div className="absolute bottom-12 left-0 bg-white rounded-xl shadow-xl border border-gray-100 p-2 flex flex-col gap-1 w-40 animate-in fade-in slide-in-from-bottom-2">
            <button className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-gray-700 text-sm">
              <ImageIcon className="w-5 h-5 text-purple-500" />
              Fotos e Vídeos
            </button>
            <button className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-gray-700 text-sm">
              <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">DOC</div>
              Documento
            </button>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 focus-within:border-gray-300 focus-within:shadow-sm transition-all">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem"
          className="w-full max-h-32 min-h-[44px] py-2.5 px-4 bg-transparent border-none outline-none resize-none text-sm text-gray-800 placeholder:text-gray-400 custom-scrollbar"
          rows={1}
          style={{ height: 'auto', overflowY: 'hidden' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            target.style.overflowY = target.scrollHeight > 128 ? 'auto' : 'hidden';
          }}
        />
      </div>

      {/* Send/Mic Button */}
      <div className="pb-1">
        {message.trim() ? (
          <button
            onClick={() => handleSend()}
            disabled={isSending}
            className="p-2.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
            title="Gravar áudio (Em breve)"
          >
            <Mic className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};
