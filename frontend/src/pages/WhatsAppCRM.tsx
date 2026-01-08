import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import {
  Button,
  Card,
  Badge,
  Modal,
  ModalFooter,
  Input,
} from "../components/common";
import {
  MessageSquare,
  Search,
  MoreVertical,
  Paperclip,
  Send,
  Phone,
  User,
  Check,
  CheckCheck,
  Menu,
  RefreshCw,
  Link2,
  FileText,
  BarChart3,
  Zap,
  X,
  ChevronRight,
  Copy,
  Star,
  Gift,
  DollarSign,
  AlertTriangle,
  Heart,
  Info,
  Hand,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useWhatsAppConversas,
  useWhatsAppMensagens,
  useEnviarMensagem,
  useWhatsAppTemplates,
  useVincularCliente,
  useAtualizarStatusConversa,
  useWhatsAppMetricas,
  useWhatsAppStatus,
  useTemplateCategorias,
  useTemplateVariaveis,
  useRegistrarUsoTemplate,
  useProcessarTemplate,
  useAtribuirConversa,
  type WhatsAppConversa,
  type WhatsAppTemplate,
} from "../hooks/useWhatsApp";
import { useClientes } from "../hooks/useClientes";
import { adminService } from "../services/adminService";
import { useQuery } from "@tanstack/react-query";

const statusColors: Record<string, string> = {
  aberta: "bg-blue-100 text-blue-600",
  em_atendimento: "bg-amber-100 text-amber-600",
  resolvida: "bg-emerald-100 text-emerald-600",
  arquivada: "bg-slate-100 text-slate-600",
};

// Icones das categorias de templates
const categoriaIcons: Record<string, React.ElementType> = {
  saudacao: Hand,
  cotacao: FileText,
  sinistro: AlertTriangle,
  cobranca: DollarSign,
  renovacao: RefreshCw,
  aniversario: Gift,
  agradecimento: Heart,
  informativo: Info,
  outros: MessageSquare,
};

export default function WhatsAppCRM() {
  const [selectedChat, setSelectedChat] = useState<WhatsAppConversa | null>(
    null
  );
  const [inputText, setInputText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showMetricas, setShowMetricas] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [showFloatingTemplates, setShowFloatingTemplates] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<string>("todos");
  const [templateSearch, setTemplateSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Queries
  const {
    data: conversasData,
    isLoading: isLoadingConversas,
    refetch: refetchConversas,
  } = useWhatsAppConversas({
    status: filtroStatus,
    search: searchTerm,
  });
  const { data: templatesData } = useWhatsAppTemplates(selectedCategoria);
  const { data: categoriasData } = useTemplateCategorias();
  const { data: variaveisData } = useTemplateVariaveis();
  const { data: metricas } = useWhatsAppMetricas();
  const { data: statusConexao } = useWhatsAppStatus();
  const { data: clientesData } = useClientes({
    search: clienteSearch,
    limit: 10,
  });

  // Mutations
  const enviarMensagem = useEnviarMensagem();
  const vincularCliente = useVincularCliente();
  const atualizarStatus = useAtualizarStatusConversa();
  const registrarUsoTemplate = useRegistrarUsoTemplate();
  const processarTemplate = useProcessarTemplate();
  const atribuirConversa = useAtribuirConversa();

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: adminService.getUsers,
  });

  const users = usersData || [];

  const conversasList = useMemo(
    () => conversasData?.data || [],
    [conversasData?.data]
  );
  const templates = useMemo(
    () => templatesData?.data || [],
    [templatesData?.data]
  );
  const categorias = useMemo(
    () => categoriasData?.data || [],
    [categoriasData?.data]
  );
  const variaveis = useMemo(
    () => variaveisData?.data || [],
    [variaveisData?.data]
  );
  const clientes = clientesData?.data || [];

  // Filtrar templates por busca
  const templatesFiltrados = useMemo(() => {
    if (!templateSearch) return templates;
    const searchLower = templateSearch.toLowerCase();
    return templates.filter(
      (t) =>
        t.nome.toLowerCase().includes(searchLower) ||
        t.conteudo.toLowerCase().includes(searchLower)
    );
  }, [templates, templateSearch]);

  // Auto-selecionar primeira conversa - usamos initialSelectedChat para evitar setState em useEffect
  const initialSelectedChat = useMemo(() => {
    if (conversasList.length > 0) {
      return conversasList[0];
    }
    return null;
  }, [conversasList]);

  // Atualiza selectedChat apenas quando initialSelectedChat mudar e nao ha chat selecionado
  const effectiveSelectedChat = selectedChat || initialSelectedChat;

  // Query de mensagens usa effectiveSelectedChat
  const { data: mensagensData, isLoading: isLoadingMensagens } =
    useWhatsAppMensagens(effectiveSelectedChat?.id || null);
  const mensagensList = useMemo(
    () => mensagensData?.data || [],
    [mensagensData?.data]
  );

  // Scroll para ultima mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagensList]);

  const handleEnviarMensagem = async () => {
    if (!inputText.trim() || !effectiveSelectedChat) return;

    try {
      await enviarMensagem.mutateAsync({
        conversaId: effectiveSelectedChat.id,
        mensagem: inputText,
      });
      setInputText("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviarMensagem();
    }
  };

  const handleVincularCliente = async (clienteId: string) => {
    if (!effectiveSelectedChat) return;
    try {
      await vincularCliente.mutateAsync({
        conversaId: effectiveSelectedChat.id,
        clienteId,
      });
      setShowVincularModal(false);
      refetchConversas();
    } catch (error) {
      console.error("Erro ao vincular cliente:", error);
    }
  };

  const handleAtualizarStatus = async (status: string) => {
    if (!effectiveSelectedChat) return;
    try {
      await atualizarStatus.mutateAsync({
        conversaId: effectiveSelectedChat.id,
        status,
      });
      refetchConversas();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleAtribuirUsuario = async (usuarioId: string) => {
    if (!effectiveSelectedChat) return;
    try {
      await atribuirConversa.mutateAsync({
        conversaId: effectiveSelectedChat.id,
        usuarioId: usuarioId || null,
      });
      refetchConversas();
    } catch (error) {
      console.error("Erro ao atribuir usuário:", error);
    }
  };

  const handleUsarTemplate = async (template: WhatsAppTemplate) => {
    // Processar variaveis do template
    const clienteId = effectiveSelectedChat?.clientes?.id;

    try {
      const response = await processarTemplate.mutateAsync({
        template: template.conteudo,
        clienteId,
        contexto: {},
      });

      setInputText(response.mensagem);
      registrarUsoTemplate.mutate(template.id);
    } catch {
      // Se falhar, usar template sem processar
      setInputText(template.conteudo);
    }

    setShowTemplatesModal(false);
    setShowFloatingTemplates(false);
    inputRef.current?.focus();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + T = Abrir templates
      if ((e.ctrlKey || e.metaKey) && e.key === "t") {
        e.preventDefault();
        setShowFloatingTemplates((prev) => !prev);
      }
      // Escape = Fechar painel flutuante
      if (e.key === "Escape" && showFloatingTemplates) {
        setShowFloatingTemplates(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showFloatingTemplates]);

  const formatarData = (data: string) => {
    const d = new Date(data);
    const hoje = new Date();
    const diff = hoje.getTime() - d.getTime();
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (dias === 0)
      return d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    if (dias === 1) return "Ontem";
    if (dias < 7) return d.toLocaleDateString("pt-BR", { weekday: "short" });
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 relative">
      <Sidebar />

      <div className="flex-1 flex lg:ml-[280px] h-full relative">
        {/* Painel Esquerdo: Lista de Conversas */}
        <div className="w-80 border-r border-slate-200 bg-white/80 backdrop-blur-xl flex-col h-full z-10 hidden md:flex">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-violet-600" />
                WhatsApp
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      statusConexao?.conectado ? "bg-emerald-500" : "bg-red-500"
                    } ring-2 ring-white`}
                  />
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    {statusConexao?.conectado ? "Online" : "Offline"}
                  </span>
                </div>
                <Link
                  to="/whatsapp"
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                  title="Configurar Conexão"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Metricas Resumidas */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2 bg-violet-50 rounded-lg text-center">
                <p className="text-lg font-bold text-violet-600">
                  {metricas?.conversasAbertas || 0}
                </p>
                <p className="text-[10px] text-slate-500">Abertas</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg text-center">
                <p className="text-lg font-bold text-emerald-600">
                  {metricas?.mensagensHoje || 0}
                </p>
                <p className="text-[10px] text-slate-500">Msgs Hoje</p>
              </div>
            </div>

            {/* Busca */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              />
            </div>

            {/* Filtros de Status */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {["todas", "aberta", "em_atendimento", "resolvida"].map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setFiltroStatus(status)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      filtroStatus === status
                        ? "bg-violet-100 text-violet-700"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {status === "todas"
                      ? "Todas"
                      : status === "em_atendimento"
                        ? "Atendendo"
                        : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Lista de Conversas */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversas ? (
              <div className="p-4 text-center">
                <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
              </div>
            ) : conversasList.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  Nenhuma conversa encontrada
                </p>
              </div>
            ) : (
              conversasList.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 flex gap-3 cursor-pointer transition-colors border-b border-slate-50 ${
                    effectiveSelectedChat?.id === chat.id
                      ? "bg-violet-50/50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      chat.clientes
                        ? "bg-violet-100 text-violet-600"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {chat.nome_contato.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold text-slate-800 truncate text-sm">
                        {chat.nome_contato}
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        {formatarData(chat.ultima_mensagem_data)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {chat.ultima_mensagem}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${statusColors[chat.status]}`}
                      >
                        {chat.status}
                      </span>
                      {chat.clientes && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                          <Link2 className="w-3 h-3" />
                          Vinculado
                        </span>
                      )}
                    </div>
                  </div>
                  {chat.nao_lidas > 0 && (
                    <div className="flex flex-col justify-center items-end">
                      <span className="w-5 h-5 bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                        {chat.nao_lidas}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Botao de Metricas */}
          <div className="p-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              leftIcon={<BarChart3 className="w-4 h-4" />}
              onClick={() => setShowMetricas(true)}
            >
              Ver Metricas Completas
            </Button>
          </div>
        </div>

        {/* Painel Direito: Chat */}
        <div className="flex-1 flex flex-col h-full bg-slate-100/50 relative">
          {effectiveSelectedChat ? (
            <>
              {/* Header do Chat */}
              <header className="h-16 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4 z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <button className="md:hidden p-2 -ml-2 text-slate-500">
                    <Menu className="w-5 h-5" />
                  </button>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      effectiveSelectedChat.clientes
                        ? "bg-violet-100 text-violet-600"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {effectiveSelectedChat.nome_contato.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      {effectiveSelectedChat.nome_contato}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      {effectiveSelectedChat.telefone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!effectiveSelectedChat.clientes && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 h-8 px-2"
                      onClick={() => setShowVincularModal(true)}
                    >
                      <Link2 className="w-4 h-4 mr-1" />
                      <span className="text-xs">Vincular</span>
                    </Button>
                  )}

                  <select
                    value={effectiveSelectedChat.status}
                    onChange={(e) => handleAtualizarStatus(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
                  >
                    <option value="aberta">Aberta</option>
                    <option value="em_atendimento">Em Atendimento</option>
                    <option value="resolvida">Resolvida</option>
                    <option value="arquivada">Arquivada</option>
                  </select>

                  <select
                    value={effectiveSelectedChat.atribuido_usuario_id || ""}
                    onChange={(e) => handleAtribuirUsuario(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white max-w-[120px]"
                    title="Atribuir Responsável"
                  >
                    <option value="">Sem responsável</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.nome || user.email}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 h-8 w-8 p-0"
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 h-8 w-8 p-0"
                    onClick={() => setShowTemplatesModal(true)}
                    title="Gerenciar Templates"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 h-8 w-8 p-0"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </header>

              {/* Info do Cliente Vinculado */}
              {effectiveSelectedChat.clientes && (
                <div className="px-4 py-2 bg-violet-50 border-b border-violet-100 flex items-center gap-3">
                  <User className="w-4 h-4 text-violet-600" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-violet-800">
                      {effectiveSelectedChat.clientes.nome}
                    </p>
                    <p className="text-[10px] text-violet-600">
                      {effectiveSelectedChat.clientes.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-violet-600 h-6 px-2 text-xs"
                  >
                    Ver Perfil
                  </Button>
                </div>
              )}

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMensagens ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
                  </div>
                ) : mensagensList.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      Nenhuma mensagem ainda
                    </p>
                  </div>
                ) : (
                  mensagensList.map((msg) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id}
                      className={`flex ${msg.direcao === "enviada" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] p-3 rounded-2xl shadow-sm relative text-sm ${
                          msg.direcao === "enviada"
                            ? "bg-violet-600 text-white rounded-tr-none"
                            : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">
                          {msg.conteudo}
                        </p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            msg.direcao === "enviada"
                              ? "text-violet-200"
                              : "text-slate-400"
                          }`}
                        >
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString(
                              "pt-BR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                          {msg.direcao === "enviada" &&
                            (msg.status === "lida" ? (
                              <CheckCheck className="w-3 h-3 text-blue-300" />
                            ) : msg.status === "entregue" ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            ))}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de Mensagem */}
              <div className="p-3 bg-white/90 backdrop-blur border-t border-slate-200 z-10 shrink-0 relative">
                {/* Floating Templates Panel */}
                <AnimatePresence>
                  {showFloatingTemplates && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 right-0 mb-2 mx-3 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[400px] flex"
                    >
                      {/* Categorias Sidebar */}
                      <div className="w-48 bg-slate-50 border-r border-slate-200 flex flex-col">
                        <div className="p-3 border-b border-slate-200">
                          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-violet-600" />
                            Templates Rapidos
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Ctrl+T para abrir/fechar
                          </p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                          <button
                            onClick={() => setSelectedCategoria("todos")}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                              selectedCategoria === "todos"
                                ? "bg-violet-100 text-violet-700"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <Star className="w-4 h-4" />
                            Todos
                          </button>
                          {categorias.map((cat) => {
                            const Icon =
                              categoriaIcons[cat.value] || MessageSquare;
                            return (
                              <button
                                key={cat.value}
                                onClick={() => setSelectedCategoria(cat.value)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                                  selectedCategoria === cat.value
                                    ? "bg-violet-100 text-violet-700"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                <Icon
                                  className="w-4 h-4"
                                  style={{ color: cat.cor }}
                                />
                                {cat.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Templates List */}
                      <div className="flex-1 flex flex-col">
                        <div className="p-3 border-b border-slate-200 flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Buscar templates..."
                              value={templateSearch}
                              onChange={(e) =>
                                setTemplateSearch(e.target.value)
                              }
                              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-violet-500/20 outline-none"
                            />
                          </div>
                          <button
                            onClick={() => setShowFloatingTemplates(false)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[280px]">
                          {templatesFiltrados.length === 0 ? (
                            <div className="text-center py-8">
                              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                              <p className="text-sm text-slate-500">
                                Nenhum template encontrado
                              </p>
                            </div>
                          ) : (
                            templatesFiltrados.map((template) => {
                              const CatIcon =
                                categoriaIcons[template.categoria] ||
                                MessageSquare;
                              const categoria = categorias.find(
                                (c) => c.value === template.categoria
                              );
                              return (
                                <button
                                  key={template.id}
                                  onClick={() => handleUsarTemplate(template)}
                                  className="w-full text-left p-3 rounded-lg hover:bg-violet-50 border border-transparent hover:border-violet-200 transition-all group"
                                >
                                  <div className="flex items-start gap-2">
                                    <CatIcon
                                      className="w-4 h-4 mt-0.5 shrink-0"
                                      style={{
                                        color: categoria?.cor || "#6b7280",
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-sm text-slate-800 truncate">
                                          {template.nome}
                                        </span>
                                        <Badge
                                          variant="neutral"
                                          size="sm"
                                          className="shrink-0"
                                        >
                                          {template.categoria}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                        {template.conteudo}
                                      </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 shrink-0 mt-0.5" />
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                  <Button
                    variant="ghost"
                    className="text-slate-400 hover:text-slate-600 rounded-full w-9 h-9 p-0 shrink-0"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    className={`rounded-full w-9 h-9 p-0 shrink-0 transition-colors ${
                      showFloatingTemplates
                        ? "bg-violet-100 text-violet-600"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                    onClick={() =>
                      setShowFloatingTemplates(!showFloatingTemplates)
                    }
                    title="Templates (Ctrl+T)"
                  >
                    <Zap className="w-5 h-5" />
                  </Button>
                  <div className="flex-1 bg-slate-100 rounded-2xl border border-transparent focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
                    <textarea
                      ref={inputRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite uma mensagem..."
                      className="w-full bg-transparent border-none focus:ring-0 p-2.5 max-h-32 resize-none text-sm text-slate-800 placeholder-slate-400"
                      rows={1}
                      style={{ minHeight: "40px" }}
                    />
                  </div>
                  <Button
                    className="rounded-full w-9 h-9 p-0 bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/20 shrink-0"
                    onClick={handleEnviarMensagem}
                    disabled={!inputText.trim() || enviarMensagem.isPending}
                  >
                    {enviarMensagem.isPending ? (
                      <RefreshCw className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-white ml-0.5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              {!statusConexao?.conectado ? (
                <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                  <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    WhatsApp Desconectado
                  </h3>
                  <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                    Sua instância do WhatsApp não está conectada. Para enviar e
                    receber mensagens através do CRM, você precisa escanear o QR
                    Code de conexão.
                  </p>
                  <Link to="/whatsapp" className="w-full">
                    <Button
                      variant="primary"
                      className="w-full"
                      leftIcon={<Link2 className="w-4 h-4" />}
                    >
                      Ir para Conexão
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-700 mb-2">
                    Selecione uma conversa
                  </h3>
                  <p className="text-sm text-slate-500">
                    Escolha uma conversa na lista ao lado para começar o
                    atendimento.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Vincular Cliente */}
      <Modal
        isOpen={showVincularModal}
        onClose={() => setShowVincularModal(false)}
        title="Vincular a Cliente"
        size="md"
      >
        <div className="space-y-4">
          <Input
            placeholder="Buscar cliente por nome ou CPF..."
            value={clienteSearch}
            onChange={(e) => setClienteSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
          <div className="max-h-64 overflow-y-auto space-y-2">
            {clientes.map((cliente) => (
              <div
                key={cliente.id}
                onClick={() => handleVincularCliente(cliente.id)}
                className="p-3 border border-slate-200 rounded-lg hover:bg-violet-50 hover:border-violet-200 cursor-pointer transition-all"
              >
                <p className="font-medium text-slate-800">{cliente.nome}</p>
                <p className="text-xs text-slate-500">
                  {cliente.cpf_cnpj} - {cliente.telefone}
                </p>
              </div>
            ))}
            {clientes.length === 0 && clienteSearch && (
              <p className="text-center text-sm text-slate-500 py-4">
                Nenhum cliente encontrado
              </p>
            )}
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowVincularModal(false)}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Templates */}
      <Modal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        title="Gerenciar Templates"
        size="lg"
      >
        <div className="flex gap-4 h-[500px]">
          {/* Categorias Sidebar */}
          <div className="w-48 bg-slate-50 rounded-lg p-3 space-y-1 overflow-y-auto">
            <button
              onClick={() => setSelectedCategoria("todos")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                selectedCategoria === "todos"
                  ? "bg-violet-100 text-violet-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Star className="w-4 h-4" />
              Todos ({templates.length})
            </button>
            {categorias.map((cat) => {
              const Icon = categoriaIcons[cat.value] || MessageSquare;
              const count =
                templatesData?.data?.filter((t) => t.categoria === cat.value)
                  .length || 0;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategoria(cat.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    selectedCategoria === cat.value
                      ? "bg-violet-100 text-violet-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" style={{ color: cat.cor }} />
                  {cat.label}
                  {count > 0 && (
                    <span className="ml-auto text-xs text-slate-400">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Templates List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {/* Search */}
            <div className="sticky top-0 bg-white pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 outline-none"
                />
              </div>
            </div>

            {templatesFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  Nenhum template encontrado
                </p>
              </div>
            ) : (
              templatesFiltrados.map((template) => {
                const CatIcon =
                  categoriaIcons[template.categoria] || MessageSquare;
                const categoria = categorias.find(
                  (c) => c.value === template.categoria
                );
                return (
                  <div
                    key={template.id}
                    className="p-4 border border-slate-200 rounded-xl hover:bg-violet-50 hover:border-violet-200 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CatIcon
                            className="w-4 h-4"
                            style={{ color: categoria?.cor || "#6b7280" }}
                          />
                          <h4 className="font-medium text-slate-800">
                            {template.nome}
                          </h4>
                          <Badge variant="neutral" size="sm">
                            {template.categoria}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">
                          {template.conteudo}
                        </p>
                        {template.uso_count !== undefined &&
                          template.uso_count > 0 && (
                            <p className="text-xs text-slate-400 mt-2">
                              Usado {template.uso_count} vezes
                            </p>
                          )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleUsarTemplate(template)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Usar
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Variaveis Info Panel */}
          <div className="w-56 bg-slate-50 rounded-lg p-3 overflow-y-auto">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">
              Variaveis Disponiveis
            </h4>
            <div className="space-y-2">
              {variaveis.map((v) => (
                <div
                  key={v.nome}
                  className="p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-violet-50 hover:border-violet-200 transition-colors"
                  onClick={() => {
                    setInputText((prev) => prev + v.nome);
                  }}
                >
                  <code className="text-xs text-violet-600 font-medium">
                    {v.nome}
                  </code>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {v.descricao}
                  </p>
                  <p className="text-[10px] text-slate-400 italic">
                    Ex: {v.exemplo}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowTemplatesModal(false)}
          >
            Fechar
          </Button>
          <Button onClick={() => setShowTemplatesModal(false)}>
            Gerenciar Templates
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Metricas */}
      <Modal
        isOpen={showMetricas}
        onClose={() => setShowMetricas(false)}
        title="Metricas WhatsApp"
        size="lg"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="text-center">
            <p className="text-3xl font-bold text-violet-600">
              {metricas?.totalConversas || 0}
            </p>
            <p className="text-sm text-slate-500">Total Conversas</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {metricas?.conversasAbertas || 0}
            </p>
            <p className="text-sm text-slate-500">Abertas</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-emerald-600">
              {metricas?.mensagensHoje || 0}
            </p>
            <p className="text-sm text-slate-500">Msgs Hoje</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-amber-600">
              {metricas?.mensagensSemana || 0}
            </p>
            <p className="text-sm text-slate-500">Msgs Semana</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-pink-600">
              {metricas?.mensagensMes || 0}
            </p>
            <p className="text-sm text-slate-500">Msgs Mes</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-teal-600">
              {metricas?.taxaVinculacao || 0}%
            </p>
            <p className="text-sm text-slate-500">Clientes Vinculados</p>
          </Card>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowMetricas(false)}>
            Fechar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
