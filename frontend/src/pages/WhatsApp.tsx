import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  MessageSquare,
  Phone,
  MoreVertical,
  Clock,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Archive,
  User,
  Link2,
  X,
  Wifi,
  WifiOff,
  QrCode,
  Settings,
  LogOut,
  RotateCcw,
  Send,
  Image,
  Paperclip,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import {
  Button,
  Card,
  Modal,
  ModalFooter,
  Skeleton,
  EmptyState,
  Badge,
  Avatar,
} from "../components/common";
import {
  useWhatsAppConversas,
  useWhatsAppMensagens,
  useEnviarMensagem,
  useWhatsAppTemplates,
  useWhatsAppStatus,
  useWhatsAppQRCode,
  useWhatsAppInfo,
  useWhatsAppDesconectar,
  useWhatsAppReiniciar,
  useAtualizarStatusConversa,
  useVincularCliente,
  WhatsAppConversa,
  WhatsAppMensagem,
} from "../hooks/useWhatsApp";
import { useClientes } from "../hooks/useClientes";

// Helper para formatar tempo relativo
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Helper para formatar hora
function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper para formatar telefone
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export default function WhatsApp() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todas");
  const [selectedConversa, setSelectedConversa] =
    useState<WhatsAppConversa | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVincularModalOpen, setIsVincularModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // API hooks
  const {
    data: conversasData,
    isLoading: loadingConversas,
    error: errorConversas,
    refetch: refetchConversas,
  } = useWhatsAppConversas({
    status: filterStatus,
    search: searchTerm,
  });
  const { data: mensagensData, isLoading: loadingMensagens } =
    useWhatsAppMensagens(selectedConversa?.id || null);
  const { data: templatesData } = useWhatsAppTemplates();
  const { data: statusData, refetch: refetchStatus } = useWhatsAppStatus();
  const {
    data: qrData,
    refetch: refetchQR,
    isLoading: loadingQR,
  } = useWhatsAppQRCode(isQRModalOpen);
  const { data: infoData } = useWhatsAppInfo();
  const { data: clientesData } = useClientes();

  const enviarMensagem = useEnviarMensagem();
  const atualizarStatus = useAtualizarStatusConversa();
  const vincularCliente = useVincularCliente();
  const desconectar = useWhatsAppDesconectar();
  const reiniciar = useWhatsAppReiniciar();

  // Dados
  const conversas = conversasData?.data || [];
  const mensagens = mensagensData?.data || [];
  const templates = templatesData?.data || [];
  const clientes = clientesData?.data || [];
  const isConnected = statusData?.conectado ?? false;
  const connectionState = statusData?.estado || "desconhecido";

  // Filtrar conversas localmente
  const filteredConversas = conversas.filter(
    (c) =>
      c.nome_contato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefone.includes(searchTerm) ||
      c.ultima_mensagem?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Selecionar primeira conversa por padrão
  useEffect(() => {
    if (filteredConversas.length > 0 && !selectedConversa) {
      // Small timeout to avoid immediate state update during render cycle if not absolutely necessary,
      // or simply accept it happens once.
      // Better: Only set if truly null.
      const timer = setTimeout(
        () => setSelectedConversa(filteredConversas[0]),
        0
      );
      return () => clearTimeout(timer);
    }
  }, [filteredConversas, selectedConversa]);

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagensData]); // Usar mensagensData em vez de mensagens array para evitar loop

  // Abrir modal QR se desconectado
  useEffect(() => {
    if (statusData && !statusData.conectado && connectionState !== "open") {
      // Auto abrir modal de conexão se não estiver conectado
    }
  }, [statusData, connectionState]);

  // Enviar mensagem
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversa) return;

    try {
      await enviarMensagem.mutateAsync({
        conversaId: selectedConversa.id,
        mensagem: newMessage.trim(),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  // Ligar para contato
  const handleCall = () => {
    if (selectedConversa) {
      window.open(`tel:+55${selectedConversa.telefone}`, "_self");
    }
  };

  // Atualizar status da conversa
  const handleUpdateStatus = async (status: string) => {
    if (!selectedConversa) return;
    try {
      await atualizarStatus.mutateAsync({
        conversaId: selectedConversa.id,
        status,
      });
      setSelectedConversa({
        ...selectedConversa,
        status: status as WhatsAppConversa["status"],
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  // Vincular cliente
  const handleVincularCliente = async (clienteId: string) => {
    if (!selectedConversa) return;
    try {
      await vincularCliente.mutateAsync({
        conversaId: selectedConversa.id,
        clienteId,
      });
      setIsVincularModalOpen(false);
      refetchConversas();
    } catch (error) {
      console.error("Erro ao vincular cliente:", error);
    }
  };

  // Desconectar WhatsApp
  const handleDesconectar = async () => {
    try {
      await desconectar.mutateAsync();
      refetchStatus();
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Erro ao desconectar:", error);
    }
  };

  // Reiniciar instância
  const handleReiniciar = async () => {
    try {
      await reiniciar.mutateAsync();
      refetchStatus();
      refetchQR();
    } catch (error) {
      console.error("Erro ao reiniciar:", error);
    }
  };

  // Status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aberta":
        return (
          <Badge variant="warning" size="sm">
            Nova
          </Badge>
        );
      case "em_atendimento":
        return (
          <Badge variant="info" size="sm">
            Em atendimento
          </Badge>
        );
      case "resolvida":
        return (
          <Badge variant="success" size="sm">
            Resolvida
          </Badge>
        );
      case "arquivada":
        return (
          <Badge variant="neutral" size="sm">
            Arquivada
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="WhatsApp CRM"
      subtitle="Integração com clientes via WhatsApp"
    >
      {/* Status da conexão */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isConnected ? "bg-emerald-100" : "bg-red-100"}`}
          >
            {isConnected ? (
              <Wifi className="w-4 h-4 text-emerald-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <span
              className={`text-sm font-medium ${isConnected ? "text-emerald-700" : "text-red-700"}`}
            >
              {isConnected ? "Conectado" : "Desconectado"}
            </span>
          </div>

          {isConnected && infoData?.numero && (
            <span className="text-sm text-slate-500">
              {formatPhone(infoData.numero)}
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetchConversas();
              refetchStatus();
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {!isConnected && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<QrCode className="w-4 h-4" />}
              onClick={() => setIsQRModalOpen(true)}
            >
              Conectar WhatsApp
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="h-[calc(100vh-250px)] flex gap-6">
        {/* Lista de Conversas */}
        <div className="w-80 flex flex-col bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-200">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-transparent rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-violet-300 transition-all"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Filter className="w-4 h-4" />}
                onClick={() => setIsFilterModalOpen(true)}
              >
                Filtros
              </Button>
              {filterStatus !== "todas" && (
                <Badge
                  variant="info"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  {filterStatus}
                  <button onClick={() => setFilterStatus("todas")}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>

          {/* Loading */}
          {loadingConversas && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={80} />
              ))}
            </div>
          )}

          {/* Error */}
          {errorConversas && (
            <div className="p-4 text-center text-red-500 text-sm">
              Erro ao carregar conversas
            </div>
          )}

          {/* Empty State - Não conectado */}
          {!loadingConversas &&
            !errorConversas &&
            !isConnected &&
            conversas.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <WifiOff className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  WhatsApp não conectado
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Conecte seu WhatsApp para visualizar as conversas
                </p>
                <Button size="sm" onClick={() => setIsQRModalOpen(true)}>
                  <QrCode className="w-4 h-4 mr-2" />
                  Conectar
                </Button>
              </div>
            )}

          {/* Conversas */}
          {!loadingConversas &&
            !errorConversas &&
            (isConnected || conversas.length > 0) && (
              <div className="flex-1 overflow-y-auto">
                {filteredConversas.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    Nenhuma conversa encontrada
                  </div>
                ) : (
                  filteredConversas.map((conversa) => (
                    <motion.button
                      key={conversa.id}
                      onClick={() => setSelectedConversa(conversa)}
                      whileHover={{ x: 2 }}
                      className={`
                      w-full p-4 border-b border-slate-100 text-left
                      transition-all
                      ${
                        selectedConversa?.id === conversa.id
                          ? "bg-violet-50 border-l-4 border-l-violet-500"
                          : "hover:bg-slate-50"
                      }
                    `}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={conversa.nome_contato} size="md" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-semibold text-slate-800 truncate">
                              {conversa.nome_contato}
                            </h4>
                            <span className="text-xs text-slate-500">
                              {conversa.ultima_mensagem_data
                                ? formatRelativeTime(
                                    conversa.ultima_mensagem_data
                                  )
                                : ""}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                            {conversa.ultima_mensagem || "Sem mensagens"}
                          </p>

                          <div className="flex items-center justify-between">
                            {getStatusBadge(conversa.status)}
                            {conversa.nao_lidas > 0 && (
                              <span className="px-2 py-0.5 bg-violet-500 text-white text-[10px] font-bold rounded-full">
                                {conversa.nao_lidas}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            )}
        </div>

        {/* Chat */}
        {selectedConversa ? (
          <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={selectedConversa.nome_contato} size="md" />
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {selectedConversa.nome_contato}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{formatPhone(selectedConversa.telefone)}</span>
                    {getStatusBadge(selectedConversa.status)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Phone className="w-4 h-4" />}
                  onClick={handleCall}
                >
                  Ligar
                </Button>
                <div className="relative group">
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      onClick={() => handleUpdateStatus("em_atendimento")}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      Marcar em atendimento
                    </button>
                    <button
                      onClick={() => handleUpdateStatus("resolvida")}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Marcar como resolvida
                    </button>
                    <button
                      onClick={() => handleUpdateStatus("arquivada")}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      Arquivar conversa
                    </button>
                    {!selectedConversa.cliente_id && (
                      <button
                        onClick={() => setIsVincularModalOpen(true)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Link2 className="w-4 h-4" />
                        Vincular cliente
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {loadingMensagens ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                </div>
              ) : mensagens.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  Nenhuma mensagem ainda
                </div>
              ) : (
                <>
                  {mensagens.map((message: WhatsAppMensagem) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.direcao === "recebida" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`
                          max-w-[70%] px-4 py-3 rounded-2xl shadow-sm
                          ${
                            message.direcao === "recebida"
                              ? "bg-white text-slate-800 rounded-bl-none"
                              : "bg-violet-600 text-white rounded-br-none"
                          }
                        `}
                      >
                        {message.tipo === "imagem" && (
                          <div className="mb-2">
                            <Image className="w-4 h-4" />
                          </div>
                        )}
                        {message.tipo === "documento" && (
                          <div className="mb-2">
                            <Paperclip className="w-4 h-4" />
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">
                          {message.conteudo}
                        </p>
                        <div
                          className={`flex items-center gap-1 mt-1 ${
                            message.direcao === "recebida"
                              ? "justify-start"
                              : "justify-end"
                          }`}
                        >
                          <Clock className="w-3 h-3 opacity-60" />
                          <span className="text-[10px] opacity-60">
                            {formatTime(message.timestamp)}
                          </span>
                          {message.direcao === "enviada" &&
                            (message.status === "lida" ? (
                              <CheckCircle2 className="w-3 h-3 opacity-60" />
                            ) : message.status === "pendente" ? (
                              <Clock className="w-3 h-3 opacity-60" />
                            ) : null)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={
                      isConnected
                        ? "Digite sua mensagem..."
                        : "Conecte o WhatsApp para enviar mensagens"
                    }
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleSendMessage()
                    }
                    className="w-full px-4 py-2.5 bg-slate-100 border border-transparent rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-violet-300 transition-all"
                    disabled={enviarMensagem.isPending || !isConnected}
                  />
                </div>

                <Button
                  onClick={handleSendMessage}
                  leftIcon={
                    enviarMensagem.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )
                  }
                  disabled={
                    !newMessage.trim() ||
                    enviarMensagem.isPending ||
                    !isConnected
                  }
                >
                  Enviar
                </Button>
              </div>

              {/* Quick Replies */}
              {templates.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-2 font-medium">
                    Respostas Rápidas:
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {templates.slice(0, 3).map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setNewMessage(template.conteudo)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs text-slate-700 transition-colors"
                        disabled={!isConnected}
                      >
                        {template.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200">
            <EmptyState
              icon={<MessageSquare className="w-8 h-8" />}
              title={
                isConnected
                  ? "Selecione uma conversa"
                  : "WhatsApp não conectado"
              }
              description={
                isConnected
                  ? "Escolha uma conversa na lista para visualizar as mensagens"
                  : "Conecte seu WhatsApp para começar"
              }
              action={
                !isConnected
                  ? {
                      label: "Conectar WhatsApp",
                      onClick: () => setIsQRModalOpen(true),
                    }
                  : undefined
              }
            />
          </div>
        )}

        {/* Painel Lateral - Templates e Info */}
        {selectedConversa && (
          <div className="w-72 flex flex-col gap-4">
            {/* Cliente Info */}
            <Card padding="sm">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">
                Informações do Contato
              </h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500">Nome</p>
                  <p className="text-sm text-slate-800">
                    {selectedConversa.nome_contato}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Telefone</p>
                  <p className="text-sm text-slate-800">
                    {formatPhone(selectedConversa.telefone)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  {getStatusBadge(selectedConversa.status)}
                </div>
                {selectedConversa.cliente_id ? (
                  <div>
                    <p className="text-xs text-slate-500">Cliente Vinculado</p>
                    <Badge variant="success" size="sm">
                      Vinculado
                    </Badge>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setIsVincularModalOpen(true)}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Vincular a cliente
                  </Button>
                )}
              </div>
            </Card>

            {/* Templates */}
            {templates.length > 0 && (
              <Card>
                <h4 className="text-sm font-semibold text-slate-800 mb-3">
                  Templates de Resposta
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setNewMessage(template.conteudo)}
                      className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                      disabled={!isConnected}
                    >
                      <p className="text-sm font-medium text-slate-800 mb-1">
                        {template.nome}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {template.conteudo}
                      </p>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Modal QR Code */}
      <Modal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        title="Conectar WhatsApp"
        size="md"
      >
        <div className="text-center py-4">
          {loadingQR ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-violet-500 mb-4" />
              <p className="text-slate-600">Gerando QR Code...</p>
            </div>
          ) : qrData?.conectado ? (
            <div className="flex flex-col items-center py-8">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                WhatsApp Conectado!
              </h3>
              <p className="text-sm text-slate-600">
                Seu WhatsApp está pronto para uso.
              </p>
            </div>
          ) : qrData?.qrcode ? (
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl border-2 border-slate-200 mb-4">
                <img
                  src={
                    qrData.qrcode?.startsWith("data:")
                      ? qrData.qrcode
                      : `data:image/png;base64,${qrData.qrcode}`
                  }
                  alt="QR Code WhatsApp"
                  className="w-64 h-64"
                />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Escaneie o QR Code
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Abra o WhatsApp no seu celular, vá em Configurações &gt;
                Dispositivos Conectados &gt; Conectar um dispositivo
              </p>
              {qrData.pairingCode && (
                <div className="bg-slate-100 px-4 py-2 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">
                    Ou use o código de pareamento:
                  </p>
                  <p className="text-lg font-mono font-bold text-slate-800">
                    {qrData.pairingCode}
                  </p>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchQR()}
                className="mt-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar QR Code
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <WifiOff className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Não foi possível gerar QR Code
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                {qrData?.mensagem ||
                  "Verifique se a Evolution API está configurada corretamente."}
              </p>
              <Button onClick={() => refetchQR()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsQRModalOpen(false)}>
            Fechar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Configurações */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Configurações do WhatsApp"
        size="sm"
      >
        <div className="space-y-4 py-2">
          {/* Status */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-emerald-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {isConnected ? "Conectado" : "Desconectado"}
                </p>
                {infoData?.numero && (
                  <p className="text-xs text-slate-500">
                    {formatPhone(infoData.numero)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="space-y-2">
            {!isConnected && (
              <Button
                className="w-full"
                leftIcon={<QrCode className="w-4 h-4" />}
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsQRModalOpen(true);
                }}
              >
                Conectar WhatsApp
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={handleReiniciar}
              disabled={reiniciar.isPending}
            >
              {reiniciar.isPending ? "Reiniciando..." : "Reiniciar Instância"}
            </Button>

            {isConnected && (
              <Button
                variant="danger"
                className="w-full"
                leftIcon={<LogOut className="w-4 h-4" />}
                onClick={handleDesconectar}
                disabled={desconectar.isPending}
              >
                {desconectar.isPending
                  ? "Desconectando..."
                  : "Desconectar WhatsApp"}
              </Button>
            )}
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
            Fechar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal de Filtros */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filtrar Conversas"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600 mb-4">
            Selecione o status das conversas:
          </p>
          {[
            { value: "todas", label: "Todas", icon: MessageSquare },
            { value: "aberta", label: "Novas/Abertas", icon: MessageSquare },
            { value: "em_atendimento", label: "Em atendimento", icon: User },
            { value: "resolvida", label: "Resolvidas", icon: CheckCircle2 },
            { value: "arquivada", label: "Arquivadas", icon: Archive },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setFilterStatus(option.value);
                setIsFilterModalOpen(false);
              }}
              className={`
                w-full p-3 flex items-center gap-3 rounded-lg border transition-all
                ${
                  filterStatus === option.value
                    ? "bg-violet-50 border-violet-200 text-violet-700"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }
              `}
            >
              <option.icon className="w-5 h-5" />
              <span className="font-medium">{option.label}</span>
              {filterStatus === option.value && (
                <CheckCircle2 className="w-5 h-5 ml-auto" />
              )}
            </button>
          ))}
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsFilterModalOpen(false)}>
            Fechar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Vincular Cliente */}
      <Modal
        isOpen={isVincularModalOpen}
        onClose={() => setIsVincularModalOpen(false)}
        title="Vincular a Cliente"
        size="md"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <p className="text-sm text-slate-600 mb-4">
            Selecione o cliente para vincular a esta conversa:
          </p>

          {clientes.length === 0 ? (
            <p className="text-center text-slate-500 py-4">
              Nenhum cliente cadastrado
            </p>
          ) : (
            clientes.map((cliente) => (
              <button
                key={cliente.id}
                onClick={() => handleVincularCliente(cliente.id)}
                className="w-full p-3 flex items-center gap-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-left"
              >
                <Avatar name={cliente.nome} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {cliente.nome}
                  </p>
                  <p className="text-xs text-slate-500">
                    {cliente.telefone || cliente.email}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsVincularModalOpen(false)}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
