import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  DollarSign,
  Gift,
  Users,
  Heart,
  Home,
  File,
  RefreshCw,
  Trash2,
  Check,
  Search,
  Loader2,
  Settings,
  Eye,
  Phone,
  MessageSquare,
  Mail,
  Zap,
  BellOff,
  Send,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import {
  Card,
  Button,
  Modal,
  ModalFooter,
  Input,
  Badge,
  EmptyState,
  Skeleton,
} from "../components/common";
import {
  useAlertas,
  useResumoAlertas,
  useContagemAlertas,
  useMarcarAlertaLido,
  useMarcarTodosAlertasLidos,
  useDeletarAlerta,
  useDeletarAlertasLidos,
  useExecutarVerificacaoAlertas,
  useSchedulerStatus,
  TipoAlerta,
  PrioridadeAlerta,
  Alerta,
  getCorPrioridade,
  getLabelTipoAlerta,
} from "../hooks/useAlertas";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const prioridadeConfig: Record<
  PrioridadeAlerta,
  { label: string; bgClass: string; textClass: string; icon: React.ElementType }
> = {
  urgente: {
    label: "Urgente",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: AlertTriangle,
  },
  alta: {
    label: "Alta",
    bgClass: "bg-orange-100",
    textClass: "text-orange-700",
    icon: AlertTriangle,
  },
  media: {
    label: "Media",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-700",
    icon: Clock,
  },
  baixa: {
    label: "Baixa",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: Bell,
  },
};

const tipoIcones: Record<TipoAlerta, React.ElementType> = {
  renovacao_apolice: FileText,
  vencimento_parcela: Calendar,
  sinistro_pendente: AlertTriangle,
  tarefa_atrasada: Clock,
  comissao_pendente: DollarSign,
  aniversario_cliente: Gift,
  consorcio_parcela: Users,
  plano_saude_reajuste: Heart,
  financiamento_parcela: Home,
  documento_pendente: File,
};

// Configuracao de acoes rapidas por tipo de alerta
interface QuickAction {
  label: string;
  icon: React.ElementType;
  variant: "primary" | "secondary" | "success" | "warning";
  action: "navigate" | "whatsapp" | "call" | "email" | "mark_done" | "snooze";
  route?: string;
}

const quickActionsByType: Record<TipoAlerta, QuickAction[]> = {
  renovacao_apolice: [
    {
      label: "Iniciar Renovacao",
      icon: RefreshCw,
      variant: "primary",
      action: "navigate",
      route: "/cotacoes/nova",
    },
    { label: "Ligar", icon: Phone, variant: "secondary", action: "call" },
    {
      label: "WhatsApp",
      icon: MessageSquare,
      variant: "success",
      action: "whatsapp",
    },
  ],
  vencimento_parcela: [
    {
      label: "Enviar Lembrete",
      icon: Send,
      variant: "warning",
      action: "whatsapp",
    },
    { label: "Ligar", icon: Phone, variant: "secondary", action: "call" },
    {
      label: "Marcar Pago",
      icon: CheckCircle,
      variant: "success",
      action: "mark_done",
    },
  ],
  sinistro_pendente: [
    {
      label: "Ver Sinistro",
      icon: Eye,
      variant: "primary",
      action: "navigate",
    },
    {
      label: "Atualizar Status",
      icon: RefreshCw,
      variant: "secondary",
      action: "navigate",
    },
    { label: "Ligar Cliente", icon: Phone, variant: "warning", action: "call" },
  ],
  tarefa_atrasada: [
    {
      label: "Ver Tarefa",
      icon: Eye,
      variant: "primary",
      action: "navigate",
      route: "/agenda",
    },
    {
      label: "Concluir",
      icon: CheckCircle,
      variant: "success",
      action: "mark_done",
    },
    { label: "Adiar", icon: Clock, variant: "secondary", action: "snooze" },
  ],
  comissao_pendente: [
    {
      label: "Ver Comissao",
      icon: DollarSign,
      variant: "primary",
      action: "navigate",
      route: "/financeiro",
    },
    {
      label: "Marcar Recebida",
      icon: CheckCircle,
      variant: "success",
      action: "mark_done",
    },
  ],
  aniversario_cliente: [
    {
      label: "Enviar Parabens",
      icon: Gift,
      variant: "primary",
      action: "whatsapp",
    },
    { label: "Ligar", icon: Phone, variant: "secondary", action: "call" },
    { label: "Email", icon: Mail, variant: "secondary", action: "email" },
  ],
  consorcio_parcela: [
    {
      label: "Ver Consorcio",
      icon: Users,
      variant: "primary",
      action: "navigate",
    },
    {
      label: "Enviar Lembrete",
      icon: Send,
      variant: "warning",
      action: "whatsapp",
    },
    {
      label: "Marcar Pago",
      icon: CheckCircle,
      variant: "success",
      action: "mark_done",
    },
  ],
  plano_saude_reajuste: [
    { label: "Ver Plano", icon: Heart, variant: "primary", action: "navigate" },
    {
      label: "Informar Cliente",
      icon: MessageSquare,
      variant: "secondary",
      action: "whatsapp",
    },
    { label: "Ligar", icon: Phone, variant: "warning", action: "call" },
  ],
  financiamento_parcela: [
    {
      label: "Ver Financiamento",
      icon: Home,
      variant: "primary",
      action: "navigate",
    },
    {
      label: "Enviar Lembrete",
      icon: Send,
      variant: "warning",
      action: "whatsapp",
    },
    {
      label: "Marcar Pago",
      icon: CheckCircle,
      variant: "success",
      action: "mark_done",
    },
  ],
  documento_pendente: [
    {
      label: "Ver Documento",
      icon: File,
      variant: "primary",
      action: "navigate",
    },
    { label: "Solicitar", icon: Send, variant: "warning", action: "whatsapp" },
    {
      label: "Marcar Recebido",
      icon: CheckCircle,
      variant: "success",
      action: "mark_done",
    },
  ],
};

const actionButtonVariants: Record<string, string> = {
  primary: "bg-violet-600 hover:bg-violet-700 text-white",
  secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white",
  warning: "bg-amber-500 hover:bg-amber-600 text-white",
};

export default function Alertas() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterLido, setFilterLido] = useState<string>("nao_lidos");
  const [page, setPage] = useState(1);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [alertaParaSnooze, setAlertaParaSnooze] = useState<Alerta | null>(null);
  const [snoozeDias, setSnoozeDias] = useState(1);

  // Queries
  const { data: alertasData, isLoading } = useAlertas({
    tipo: filterTipo !== "todos" ? (filterTipo as TipoAlerta) : undefined,
    nao_lidos: filterLido === "nao_lidos",
    page,
    limite: 20,
  });
  const { data: resumo } = useResumoAlertas();
  const { data: contagem } = useContagemAlertas();
  const { data: schedulerStatus } = useSchedulerStatus();

  // Mutations
  const marcarLido = useMarcarAlertaLido();
  const marcarTodosLidos = useMarcarTodosAlertasLidos();
  const deletarAlerta = useDeletarAlerta();
  const deletarLidos = useDeletarAlertasLidos();
  const executarVerificacao = useExecutarVerificacaoAlertas();

  const alertas = alertasData?.data || [];
  const total = alertasData?.total || 0;

  // Filtrar por busca local
  const alertasFiltrados = alertas.filter(
    (a) =>
      a.titulo.toLowerCase().includes(search.toLowerCase()) ||
      a.mensagem.toLowerCase().includes(search.toLowerCase())
  );

  const handleMarcarLido = (alerta: Alerta) => {
    marcarLido.mutate(alerta.id);
  };

  const handleDeletar = (alerta: Alerta) => {
    if (confirm("Deseja realmente excluir este alerta?")) {
      deletarAlerta.mutate(alerta.id);
    }
  };

  const handleMarcarTodosLidos = () => {
    if (confirm("Marcar todos os alertas como lidos?")) {
      marcarTodosLidos.mutate();
    }
  };

  const handleDeletarLidos = () => {
    if (
      confirm(
        "Excluir todos os alertas lidos? Esta acao nao pode ser desfeita."
      )
    ) {
      deletarLidos.mutate();
    }
  };

  const handleExecutarVerificacao = () => {
    executarVerificacao.mutate();
  };

  const navegarParaEntidade = (alerta: Alerta) => {
    if (!alerta.entidade_tipo || !alerta.entidade_id) return;

    const rotas: Record<string, string> = {
      apolice: `/apolices/${alerta.entidade_id}`,
      sinistro: `/sinistros/${alerta.entidade_id}`,
      cliente: `/clientes/${alerta.entidade_id}`,
      tarefa: `/agenda`,
      consorcio: `/consorcios/${alerta.entidade_id}`,
      financiamento: `/financiamentos/${alerta.entidade_id}`,
      plano_saude: `/planos-saude/${alerta.entidade_id}`,
    };

    const rota = rotas[alerta.entidade_tipo];
    if (rota) {
      navigate(rota);
    }
  };

  // Handler para acoes rapidas
  const handleQuickAction = (alerta: Alerta, action: QuickAction) => {
    switch (action.action) {
      case "navigate":
        if (action.route) {
          navigate(action.route);
        } else {
          navegarParaEntidade(alerta);
        }
        break;

      case "whatsapp": {
        // Extrair telefone dos metadados ou redirecionar para WhatsApp CRM
        const telefone =
          alerta.metadados?.telefone || alerta.metadados?.cliente_telefone;
        if (telefone) {
          const mensagem = getMensagemWhatsApp(alerta);
          window.open(
            `https://wa.me/55${telefone.replace(
              /\D/g,
              ""
            )}?text=${encodeURIComponent(mensagem)}`,
            "_blank"
          );
        } else {
          navigate("/whatsapp");
        }
        // Marcar como lido apos acao
        if (!alerta.lido) {
          marcarLido.mutate(alerta.id);
        }
        break;
      }

      case "call": {
        const tel =
          alerta.metadados?.telefone || alerta.metadados?.cliente_telefone;
        if (tel) {
          window.open(`tel:+55${tel.replace(/\D/g, "")}`, "_self");
        }
        break;
      }

      case "email": {
        const email =
          alerta.metadados?.email || alerta.metadados?.cliente_email;
        if (email) {
          const assunto = getAssuntoEmail(alerta);
          window.open(
            `mailto:${email}?subject=${encodeURIComponent(assunto)}`,
            "_self"
          );
        }
        break;
      }

      case "mark_done":
        handleMarcarLido(alerta);
        break;

      case "snooze":
        setAlertaParaSnooze(alerta);
        setShowSnoozeModal(true);
        break;
    }
  };

  // Gerar mensagem para WhatsApp baseada no tipo de alerta
  const getMensagemWhatsApp = (alerta: Alerta): string => {
    const nome = alerta.metadados?.cliente_nome || "Cliente";
    const primeiroNome = nome.split(" ")[0];

    switch (alerta.tipo) {
      case "renovacao_apolice":
        return `Ola ${primeiroNome}! Tudo bem? Passando para lembrar que sua apolice esta proxima do vencimento. Gostaria de renovar? Posso preparar uma cotacao atualizada para voce!`;
      case "vencimento_parcela":
        return `Ola ${primeiroNome}! Tudo bem? Este e um lembrete amigavel sobre o vencimento da sua parcela. Caso ja tenha efetuado o pagamento, por favor desconsidere esta mensagem.`;
      case "aniversario_cliente":
        return `Ola ${primeiroNome}! Feliz aniversario! Desejo um dia cheio de alegrias e realizacoes. Que este novo ciclo seja repleto de conquistas!`;
      case "sinistro_pendente":
        return `Ola ${primeiroNome}! Estou entrando em contato sobre o andamento do seu sinistro. Ha alguma atualizacao ou documentacao pendente?`;
      case "documento_pendente":
        return `Ola ${primeiroNome}! Tudo bem? Estamos aguardando alguns documentos para dar continuidade ao seu processo. Consegue me enviar?`;
      default:
        return `Ola ${primeiroNome}! Tudo bem? Estou entrando em contato referente a ${alerta.titulo.toLowerCase()}.`;
    }
  };

  // Gerar assunto para email baseado no tipo de alerta
  const getAssuntoEmail = (alerta: Alerta): string => {
    switch (alerta.tipo) {
      case "renovacao_apolice":
        return "Renovacao de Apolice - Proposta";
      case "vencimento_parcela":
        return "Lembrete de Vencimento";
      case "aniversario_cliente":
        return "Feliz Aniversario!";
      case "sinistro_pendente":
        return "Atualizacao do Sinistro";
      default:
        return alerta.titulo;
    }
  };

  // Handler para snooze (adiar)
  const handleSnooze = () => {
    if (!alertaParaSnooze) return;
    // Marcar como lido (por enquanto, idealmente teria um endpoint para snooze)
    marcarLido.mutate(alertaParaSnooze.id);
    setShowSnoozeModal(false);
    setAlertaParaSnooze(null);
    setSnoozeDias(1);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <PageLayout title="Central de Alertas">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {resumo?.urgentes || 0}
              </p>
              <p className="text-xs text-slate-500">Urgentes</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {resumo?.alta_prioridade || 0}
              </p>
              <p className="text-xs text-slate-500">Alta Prioridade</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {resumo?.media_prioridade || 0}
              </p>
              <p className="text-xs text-slate-500">Media</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {resumo?.baixa_prioridade || 0}
              </p>
              <p className="text-xs text-slate-500">Baixa</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100">
              <Bell className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {contagem?.total || 0}
              </p>
              <p className="text-xs text-slate-500">Total Nao Lidos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros e Acoes */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-wrap gap-3">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar alertas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            {/* Filtro por Status */}
            <select
              value={filterLido}
              onChange={(e) => setFilterLido(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500"
            >
              <option value="todos">Todos</option>
              <option value="nao_lidos">Nao Lidos</option>
            </select>

            {/* Filtro por Tipo */}
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="renovacao_apolice">Renovacao de Apolice</option>
              <option value="vencimento_parcela">Vencimento de Parcela</option>
              <option value="sinistro_pendente">Sinistro Pendente</option>
              <option value="tarefa_atrasada">Tarefa Atrasada</option>
              <option value="comissao_pendente">Comissao Pendente</option>
              <option value="aniversario_cliente">Aniversario</option>
              <option value="consorcio_parcela">Consorcio</option>
              <option value="financiamento_parcela">Financiamento</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExecutarVerificacao}
              disabled={executarVerificacao.isPending}
            >
              {executarVerificacao.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ml-2 hidden md:inline">Verificar Agora</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleMarcarTodosLidos}
            >
              <Check className="w-4 h-4" />
              <span className="ml-2 hidden md:inline">Marcar Todos Lidos</span>
            </Button>

            <Button variant="outline" size="sm" onClick={handleDeletarLidos}>
              <Trash2 className="w-4 h-4" />
              <span className="ml-2 hidden md:inline">Limpar Lidos</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfigModal(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de Alertas */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : alertasFiltrados.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-12 h-12 text-slate-300" />}
          title="Nenhum alerta encontrado"
          description="Voce esta em dia! Nao ha alertas pendentes no momento."
        />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {alertasFiltrados.map((alerta) => {
            const config = prioridadeConfig[alerta.prioridade];
            const TipoIcon = tipoIcones[alerta.tipo] || Bell;
            const quickActions = quickActionsByType[alerta.tipo] || [];

            return (
              <motion.div key={alerta.id} variants={itemVariants}>
                <Card
                  className={`p-4 hover:shadow-md transition-shadow ${
                    alerta.lido ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icone do Tipo */}
                    <div className={`p-2 rounded-lg ${config.bgClass}`}>
                      <TipoIcon className={`w-5 h-5 ${config.textClass}`} />
                    </div>

                    {/* Conteudo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-slate-900">
                            {alerta.titulo}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">
                            {alerta.mensagem}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={getCorPrioridade(alerta.prioridade) as any}
                          >
                            {config.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      {!alerta.lido && quickActions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                          <span className="text-xs text-slate-400 mr-1">
                            <Zap className="w-3 h-3 inline mr-1" />
                            Acoes rapidas:
                          </span>
                          {quickActions.map((action, idx) => {
                            const ActionIcon = action.icon;
                            return (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAction(alerta, action);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  actionButtonVariants[action.variant]
                                }`}
                              >
                                <ActionIcon className="w-3.5 h-3.5" />
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatarData(alerta.created_at)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full ${config.bgClass} ${config.textClass}`}
                          >
                            {getLabelTipoAlerta(alerta.tipo)}
                          </span>
                          {alerta.lido && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              Lido
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {alerta.entidade_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navegarParaEntidade(alerta);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}

                          {!alerta.lido && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarcarLido(alerta);
                              }}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletar(alerta);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Paginacao */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4 text-sm text-slate-600">
            Pagina {page} de {Math.ceil(total / 20)}
          </span>
          <Button
            variant="outline"
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage((p) => p + 1)}
          >
            Proxima
          </Button>
        </div>
      )}

      {/* Modal de Configuracoes */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Configuracoes do Scheduler"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium text-slate-900 mb-2">
              Status do Sistema de Alertas
            </h4>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500">Total de Jobs:</span>{" "}
                <span className="font-medium">
                  {schedulerStatus?.totalJobs || 0}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Timezone:</span>{" "}
                <span className="font-medium">
                  {schedulerStatus?.timezone || "America/Sao_Paulo"}
                </span>
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-slate-900 mb-2">Jobs Agendados</h4>
            <div className="space-y-2">
              {schedulerStatus?.jobs?.map((job: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-900">{job.nome}</p>
                    <p className="text-xs text-slate-500">{job.tipo}</p>
                  </div>
                  <span className="text-sm text-slate-600">{job.horario}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-slate-500">
              Os alertas sao verificados automaticamente nos horarios
              configurados. Use o botao "Verificar Agora" para executar uma
              verificacao manual.
            </p>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowConfigModal(false)}>
            Fechar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal de Snooze (Adiar) */}
      <Modal
        isOpen={showSnoozeModal}
        onClose={() => {
          setShowSnoozeModal(false);
          setAlertaParaSnooze(null);
        }}
        title="Adiar Alerta"
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <BellOff className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-slate-700 mb-2">
              Por quanto tempo deseja adiar este alerta?
            </p>
            <p className="text-sm text-slate-500">{alertaParaSnooze?.titulo}</p>
          </div>

          <div className="flex gap-2 justify-center">
            {[1, 3, 7].map((dias) => (
              <button
                key={dias}
                onClick={() => setSnoozeDias(dias)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  snoozeDias === dias
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {dias} {dias === 1 ? "dia" : "dias"}
              </button>
            ))}
          </div>

          <div className="text-center text-xs text-slate-500">
            O alerta sera ocultado e voltara a aparecer em {snoozeDias}{" "}
            {snoozeDias === 1 ? "dia" : "dias"}.
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowSnoozeModal(false);
              setAlertaParaSnooze(null);
            }}
          >
            Cancelar
          </Button>
          <Button onClick={handleSnooze}>
            <Clock className="w-4 h-4 mr-2" />
            Adiar {snoozeDias} {snoozeDias === 1 ? "dia" : "dias"}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
