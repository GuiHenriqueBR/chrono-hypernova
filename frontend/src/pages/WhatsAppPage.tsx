import React, { useEffect, useState, useRef } from "react";
import { useWhatsAppStore } from "../store/whatsappStore";
import { whatsappService } from "../services/whatsapp";
import { WhatsAppChatList } from "../components/whatsapp/WhatsAppChatList";
import { WhatsAppChatWindow } from "../components/whatsapp/WhatsAppChatWindow";
import { WhatsAppInput } from "../components/whatsapp/WhatsAppInput";
import { WhatsAppConnection } from "../components/whatsapp/WhatsAppConnection";
import { Search, MoreVertical, Phone, Video, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const WhatsAppPage: React.FC = () => {
  const {
    connectionState,
    conversations,
    activeConversation,
    fetchConversations,
    fetchConnectionStatus,
    setActiveConversation,
    isLoadingConversations,
  } = useWhatsAppStore();

  const [messages, setMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const pollingRef = useRef<any>(null);

  // Inicialização
  useEffect(() => {
    fetchConnectionStatus();
    fetchConversations();

    // Polling para atualizar lista de conversas
    const interval = setInterval(() => {
      fetchConversations({ search: searchTerm });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Buscar conversas quando o termo de busca mudar
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchConversations({ search: searchTerm });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Carregar mensagens quando selecionar conversa
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);

      // Polling de mensagens da conversa ativa
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(() => {
        loadMessages(activeConversation.id, false);
      }, 3000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeConversation?.id]);

  const loadMessages = async (conversaId: string, showLoading = true) => {
    if (showLoading) setIsLoadingMessages(true);
    try {
      const { data } = await whatsappService.getMessages(conversaId);
      setMessages(data);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    } finally {
      if (showLoading) setIsLoadingMessages(false);
    }
  };

  // Se não estiver conectado, mostrar tela de conexão
  if (!connectionState?.conectado) {
    return (
      <div className="h-full bg-gray-50 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            WhatsApp Business API
          </h1>
          <WhatsAppConnection />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-100 flex overflow-hidden border-t border-gray-200">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-[30%] min-w-[320px] max-w-[420px] bg-white border-r border-gray-200 flex flex-col">
        {/* Header Sidebar */}
        <div className="h-16 bg-gray-50 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
              {connectionState.foto ? (
                <img
                  src={connectionState.foto}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-green-100 text-green-600 font-bold">
                  {connectionState.nome?.[0] || "W"}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">
                {connectionState.nome || connectionState.numero}
              </span>
              <span className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Online
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="p-2 text-gray-500 hover:bg-gray-200 rounded-full"
              title="Nova Conversa"
            >
              <span className="sr-only">Nova Conversa</span>
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-white border-b border-gray-100">
          <div className="relative">
            <input
              type="text"
              placeholder="Pesquisar ou começar uma nova conversa"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 text-gray-700 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 transition-shadow"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Lista de Chats */}
        {isLoadingConversations && conversations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-500 rounded-full animate-spin" />
          </div>
        ) : (
          <WhatsAppChatList
            conversations={conversations}
            activeId={activeConversation?.id}
            onSelect={setActiveConversation}
          />
        )}
      </div>

      {/* Main Content - Janela de Chat */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative">
        {activeConversation ? (
          <>
            {/* Header Chat */}
            <div className="h-16 bg-gray-50 px-4 flex items-center justify-between border-b border-gray-200 shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors -ml-2">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                  {activeConversation.foto_url ? (
                    <img
                      src={activeConversation.foto_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600">
                      {activeConversation.nome_contato?.[0]}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {activeConversation.nome_contato}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {activeConversation.cliente
                      ? "Cliente Cadastrado"
                      : activeConversation.telefone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-gray-500">
                <button
                  className="p-2 hover:bg-gray-200 rounded-full"
                  title="Procurar na conversa"
                >
                  <Search className="w-5 h-5" />
                </button>
                <div className="h-6 w-px bg-gray-300 mx-1" />
                <button
                  className="p-2 hover:bg-gray-200 rounded-full"
                  title="Dados do Contato"
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Area de Mensagens */}
            <div className="flex-1 overflow-hidden flex flex-col relative">
              <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                  backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
                  backgroundRepeat: "repeat",
                }}
              />

              {isLoadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                </div>
              ) : (
                <WhatsAppChatWindow messages={messages} currentUserId="me" />
              )}
            </div>

            {/* Input */}
            <WhatsAppInput
              conversaId={activeConversation.id}
              onMessageSent={() => loadMessages(activeConversation.id, false)}
            />
          </>
        ) : (
          /* Estado Vazio (Nenhuma conversa selecionada) */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] border-b-[6px] border-green-500">
            <div className="text-center max-w-md px-6">
              <div className="w-64 h-64 bg-gray-200 rounded-full mx-auto mb-8 flex items-center justify-center">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/2044px-WhatsApp.svg.png"
                  alt="WhatsApp"
                  className="w-32 h-32 opacity-80 grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <h1 className="text-3xl font-light text-gray-700 mb-4">
                WhatsApp Web
              </h1>
              <p className="text-gray-500 text-sm leading-6">
                Envie e receba mensagens sem precisar manter seu celular
                conectado. <br />
                Use o WhatsApp em até 4 aparelhos ao mesmo tempo e em 1 celular.
              </p>
              <div className="mt-8 flex items-center justify-center gap-2 text-gray-400 text-xs">
                <div className="w-3 h-3 bg-gray-400 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-[#f0f2f5] rounded-full" />
                </div>
                Protegido com a criptografia de ponta a ponta
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppPage;
