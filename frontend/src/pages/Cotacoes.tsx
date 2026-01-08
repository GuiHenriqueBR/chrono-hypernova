import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  FileText,
  CheckCircle,
  Clock,
  ArrowRight,
  DollarSign,
  Archive,
  LayoutGrid,
  Kanban,
  Calendar,
  Target,
  Eye,
  EyeOff,
  Send,
  Settings,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import { PipelineConfigModal } from "../components/modals/PipelineConfigModal";
import {
  Card,
  Button,
  Input,
  Badge,
  EmptyState,
  Skeleton,
  Modal,
  ModalFooter,
  Select,
  KanbanBoard,
} from "../components/common";
import { PIPELINE_COLUMNS } from "../constants/kanban";
import {
  useUpdateCotacaoStatus,
  useAgendarFollowUp,
  useCotacoes,
  usePropostas,
  usePipelineFases, // Importante
} from "../hooks/useCotacoesPropostas";
import { usePipelineVendas } from "../hooks/useDashboard";
import { PipelineCotacao, StatusPipelineCotacao, Proposta } from "../types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// Modal de Agendamento de Follow-up
function FollowUpModal({
  isOpen,
  onClose,
  cotacao,
  onSchedule,
}: {
  isOpen: boolean;
  onClose: () => void;
  cotacao: PipelineCotacao | null;
  onSchedule: (date: string, notas: string) => void;
}) {
  const [date, setDate] = useState("");
  const [notas, setNotas] = useState("");

  const handleSubmit = () => {
    if (date) {
      onSchedule(date, notas);
      setDate("");
      setNotas("");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agendar Follow-up"
      size="sm"
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-slate-600 mb-3">
            Agendando retorno para: <strong>{cotacao?.cliente}</strong>
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Data do Próximo Contato
          </label>
          <Input
            type="date"
            value={date}
            onChange={() => {}}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Observações
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ex: Cliente pediu para ligar após às 14h..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            rows={3}
          />
        </div>
      </div>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={!date}>
          <Calendar className="w-4 h-4 mr-2" />
          Agendar
        </Button>
      </ModalFooter>
    </Modal>
  );
}

interface ClientData {
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
}

// Modal de Mudança de Status
function StatusChangeModal({
  isOpen,
  onClose,
  cotacao,
  targetStatus,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  cotacao: PipelineCotacao | null;
  targetStatus: StatusPipelineCotacao | null;
  onConfirm: (motivo?: string, notas?: string, clientData?: ClientData) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [notas, setNotas] = useState("");

  // Client Data State
  const [clientData, setClientData] = useState<ClientData>({
    nome: cotacao?.cliente || "",
    cpf_cnpj: "",
    email: "",
    telefone: cotacao?.telefone || "",
  });

  const isLoss = targetStatus === "fechada_perdida";
  const isWon = targetStatus === "fechada_ganha";
  const statusLabel =
    PIPELINE_COLUMNS.find((c) => c.key === targetStatus)?.label || targetStatus;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isLoss
          ? "Registrar Perda"
          : isWon
            ? "Fechar Negócio & Cliente"
            : `Mover para ${statusLabel}`
      }
      size="md"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
        <div>
          <p className="text-sm text-slate-600 mb-3">
            Movendo cotação de <strong>{cotacao?.cliente}</strong>
          </p>
        </div>

        {isLoss && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motivo da Perda *
            </label>
            <Select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              options={[
                { value: "", label: "Selecione..." },
                { value: "preco", label: "Preço maior que concorrência" },
                { value: "cobertura", label: "Cobertura insuficiente" },
                { value: "sem_retorno", label: "Cliente não respondeu" },
                { value: "desistiu", label: "Cliente desistiu da compra" },
                { value: "concorrente", label: "Fechou com outro corretor" },
                { value: "outro", label: "Outro motivo" },
              ]}
            />
          </div>
        )}

        {isWon && (
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-3">
            <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Dados para Cadastro do Cliente
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-emerald-700 mb-1">
                  Nome Completo
                </label>
                <Input
                  value={clientData.nome}
                  onChange={(e) =>
                    setClientData({ ...clientData, nome: e.target.value })
                  }
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-700 mb-1">
                  CPF/CNPJ
                </label>
                <Input
                  value={clientData.cpf_cnpj}
                  onChange={(e) =>
                    setClientData({ ...clientData, cpf_cnpj: e.target.value })
                  }
                  placeholder="000.000.000-00"
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-700 mb-1">
                  Email
                </label>
                <Input
                  value={clientData.email}
                  onChange={(e) =>
                    setClientData({ ...clientData, email: e.target.value })
                  }
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-700 mb-1">
                  Telefone
                </label>
                <Input
                  value={clientData.telefone}
                  onChange={(e) =>
                    setClientData({ ...clientData, telefone: e.target.value })
                  }
                  className="bg-white"
                />
              </div>
            </div>
            <p className="text-[10px] text-emerald-600">
              * O cliente será ativado automaticamente e estes dados serão
              salvos.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Observações {!isLoss && "(opcional)"}
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Adicione detalhes sobre a negociação..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            rows={3}
          />
        </div>
      </div>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={() =>
            onConfirm(motivo, notas, isWon ? clientData : undefined)
          }
          disabled={isLoss && !motivo}
          variant={isLoss ? "danger" : "primary"}
        >
          Confirmar
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// Métricas do Pipeline
function PipelineMetrics({
  metricas,
  isLoading,
}: {
  metricas?: {
    emAndamento: number;
    taxaConversao: number;
    ganhas: number;
    valorPipelineAtivo: number;
  };
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={80} />
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: "Em Andamento",
      value: metricas?.emAndamento || 0,
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Taxa de Conversão",
      value: `${metricas?.taxaConversao || 0}%`,
      icon: Target,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "Ganhas (Mês)",
      value: metricas?.ganhas || 0,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "Valor no Pipeline",
      value: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        notation: "compact",
      }).format(metricas?.valorPipelineAtivo || 0),
      icon: DollarSign,
      color: "text-violet-600",
      bg: "bg-violet-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric) => (
        <Card key={metric.label} className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${metric.bg}`}>
            <metric.icon className={`w-5 h-5 ${metric.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{metric.value}</p>
            <p className="text-xs text-slate-500">{metric.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function Cotacoes() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");
  const [activeTab, setActiveTab] = useState<"pipeline" | "propostas">(
    "pipeline"
  );
  const [showClosedColumns, setShowClosedColumns] = useState(false);

  // Modals
  const [followUpModal, setFollowUpModal] = useState<{
    open: boolean;
    cotacao: PipelineCotacao | null;
  }>({ open: false, cotacao: null });
  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    cotacao: PipelineCotacao | null;
    targetStatus: StatusPipelineCotacao | null;
  }>({ open: false, cotacao: null, targetStatus: null });

  // Data hooks
  const { data: cotacoesData, isLoading: loadingCotacoes } = useCotacoes({
    search: "",
  });
  const { data: propostasData, isLoading: loadingPropostas } = usePropostas({});
  const {
    data: pipelineData,
    isLoading: pipelineLoading,
    refetch: refetchPipeline,
  } = usePipelineVendas();

  const { data: pipelineFases = [], refetch: refetchFases } =
    usePipelineFases();
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Mutations
  const updateStatus = useUpdateCotacaoStatus();
  const agendarFollowUp = useAgendarFollowUp();

  const cotacoes = cotacoesData?.data || [];
  const propostas = propostasData?.data || [];

  // Mapear fases para colunas do Kanban
  const dynamicColumns =
    pipelineFases.length > 0
      ? pipelineFases.map((fase) => ({
          key: fase.chave,
          label: fase.nome,
          color: fase.cor,
        }))
      : PIPELINE_COLUMNS;

  // Handlers
  const handleCardClick = (item: PipelineCotacao) => {
    navigate(`/cotacoes/${item.id}`);
  };

  const handleStatusChange = (
    itemId: string,
    newStatus: StatusPipelineCotacao
  ) => {
    const item = Object.values(pipelineData?.pipeline || {})
      .flat()
      .find((c: PipelineCotacao) => c.id === itemId) as PipelineCotacao;

    if (newStatus === "fechada_perdida" || newStatus === "fechada_ganha") {
      setStatusModal({ open: true, cotacao: item, targetStatus: newStatus });
    } else {
      updateStatus.mutate(
        { id: itemId, status_pipeline: newStatus },
        { onSuccess: () => refetchPipeline() }
      );
    }
  };

  const handleScheduleFollowUp = (item: PipelineCotacao) => {
    setFollowUpModal({ open: true, cotacao: item });
  };

  const handleFollowUpSubmit = (date: string, notas: string) => {
    if (followUpModal.cotacao) {
      agendarFollowUp.mutate(
        { id: followUpModal.cotacao.id, proximo_contato: date, notas },
        { onSuccess: () => refetchPipeline() }
      );
    }
  };

  const handleStatusConfirm = (
    motivo?: string,
    notas?: string,
    clientData?: ClientData
  ) => {
    if (statusModal.cotacao && statusModal.targetStatus) {
      updateStatus.mutate(
        {
          id: statusModal.cotacao.id,
          status_pipeline: statusModal.targetStatus,
          motivo_perda: motivo,
          notas,
          dados_cliente: clientData,
        },
        {
          onSuccess: () => {
            refetchPipeline();
            setStatusModal({ open: false, cotacao: null, targetStatus: null });
          },
        }
      );
    }
  };

  return (
    <PageLayout
      title="Pipeline de Vendas"
      subtitle="Gerencie suas cotações e acompanhe o funil de vendas"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClosedColumns(!showClosedColumns)}
            leftIcon={
              showClosedColumns ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )
            }
          >
            {showClosedColumns ? "Ocultar Fechadas" : "Ver Fechadas"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfigModal(true)}
            leftIcon={<Settings className="w-4 h-4" />}
          >
            Configurar
          </Button>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate("/cotacoes/nova")}
          >
            Nova Cotação
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("pipeline")}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "pipeline"
                  ? "border-violet-500 text-violet-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Kanban className="w-4 h-4" />
                Pipeline CRM
              </div>
            </button>
            <button
              onClick={() => setActiveTab("propostas")}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "propostas"
                  ? "border-violet-500 text-violet-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Propostas ({propostas.length})
            </button>
          </div>

          {/* View toggle for Pipeline */}
          {activeTab === "pipeline" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "kanban"
                    ? "bg-violet-100 text-violet-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Kanban className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-violet-100 text-violet-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {activeTab === "pipeline" ? (
          <>
            {/* Métricas */}
            <PipelineMetrics
              metricas={pipelineData?.metricas}
              isLoading={pipelineLoading}
            />

            {/* Kanban Board */}
            {viewMode === "kanban" ? (
              pipelineLoading ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="shrink-0 w-72">
                      <Skeleton height={50} className="rounded-t-xl" />
                      <div className="space-y-2 p-2 bg-slate-50 rounded-b-xl">
                        <Skeleton height={120} />
                        <Skeleton height={120} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pipelineData?.pipeline ? (
                <KanbanBoard
                  pipeline={pipelineData.pipeline}
                  columns={dynamicColumns}
                  onCardClick={handleCardClick}
                  onStatusChange={handleStatusChange}
                  onScheduleFollowUp={handleScheduleFollowUp}
                  showClosedColumns={showClosedColumns}
                />
              ) : (
                <EmptyState
                  title="Nenhuma cotação no pipeline"
                  description="Crie sua primeira cotação para começar a acompanhar suas vendas"
                  icon={<Kanban className="w-12 h-12 text-slate-300" />}
                  action={{
                    label: "Nova Cotação",
                    onClick: () => navigate("/cotacoes/nova"),
                  }}
                />
              )
            ) : (
              /* Grid View */
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {loadingCotacoes ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} height={200} />
                  ))
                ) : cotacoes.length === 0 ? (
                  <div className="col-span-full">
                    <EmptyState
                      title="Nenhuma cotação encontrada"
                      description="Crie uma nova cotação para começar"
                      icon={<FileText className="w-12 h-12 text-slate-300" />}
                      action={{
                        label: "Nova Cotação",
                        onClick: () => navigate("/cotacoes/nova"),
                      }}
                    />
                  </div>
                ) : (
                  cotacoes.map((cotacao) => (
                    <motion.div key={cotacao.id} variants={itemVariants}>
                      <Card
                        className="hover:border-violet-200 cursor-pointer transition-colors relative"
                        onClick={() => navigate(`/cotacoes/${cotacao.id}`)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <Badge variant="neutral">
                            {cotacao.ramo.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {new Date(
                              cotacao.data_criacao
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="font-semibold text-slate-800 mb-1">
                          {cotacao.dados_cotacao?.modelo ||
                            "Modelo não informado"}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                          {cotacao.clientes?.nome}
                        </p>

                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4 bg-slate-50 p-2 rounded-lg">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span>
                            Validade:{" "}
                            {cotacao.validade_cotacao
                              ? new Date(
                                  cotacao.validade_cotacao
                                ).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-xs font-medium text-slate-500">
                            {cotacao.seguradoras_json?.length || 0} opções
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-violet-600 p-0 h-auto"
                          >
                            Ver Detalhes <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </>
        ) : (
          /* Propostas Tab */
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {loadingPropostas ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={200} />
              ))
            ) : propostas.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  title="Nenhuma proposta encontrada"
                  description="Converta uma cotação em proposta para vê-la aqui"
                  icon={<Archive className="w-12 h-12 text-slate-300" />}
                />
              </div>
            ) : (
              propostas.map((proposta: Proposta) => (
                <motion.div key={proposta.id} variants={itemVariants}>
                  <Card
                    className="hover:border-violet-200 cursor-pointer transition-colors relative"
                    onClick={() => navigate(`/propostas/${proposta.id}`)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <Badge
                        variant={
                          proposta.status === "aceita"
                            ? "success"
                            : proposta.status === "recusada"
                              ? "error"
                              : proposta.status === "enviada"
                                ? "info"
                                : "neutral"
                        }
                      >
                        {proposta.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {new Date(proposta.data_criacao).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-semibold text-slate-800 mb-1">
                      {proposta.dados_propostos?.modelo || "Proposta"}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                      {proposta.clientes?.nome}
                    </p>

                    <div className="flex items-center justify-between mb-4 bg-slate-50 p-3 rounded-lg">
                      <span className="text-sm text-slate-500">
                        Valor Proposto
                      </span>
                      <span className="font-bold text-slate-800">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(proposta.valor_proposto)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {proposta.status === "rascunho" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          leftIcon={<Send className="w-3 h-3" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/propostas/${proposta.id}`);
                          }}
                        >
                          Enviar
                        </Button>
                      )}
                      {proposta.status === "aceita" && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          leftIcon={<CheckCircle className="w-3 h-3" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/propostas/${proposta.id}`);
                          }}
                        >
                          Emitir
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <FollowUpModal
        isOpen={followUpModal.open}
        onClose={() => setFollowUpModal({ open: false, cotacao: null })}
        cotacao={followUpModal.cotacao}
        onSchedule={handleFollowUpSubmit}
      />

      <StatusChangeModal
        key={statusModal.cotacao?.id || "modal"}
        isOpen={statusModal.open}
        onClose={() =>
          setStatusModal({ open: false, cotacao: null, targetStatus: null })
        }
        cotacao={statusModal.cotacao}
        targetStatus={statusModal.targetStatus}
        onConfirm={handleStatusConfirm}
      />

      <PipelineConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        fases={pipelineFases}
        onUpdate={refetchFases}
      />
    </PageLayout>
  );
}
