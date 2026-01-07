import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  AlertTriangle,
  FileText,
  Calendar,
  Upload,
  Clock,
  Edit,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  File,
  Image,
  FileCheck,
  FileX,
  ClipboardList,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import {
  Card,
  Badge,
  Button,
  StatusStepper,
  Modal,
  ModalFooter,
  Input,
} from "../components/common";
import { Skeleton } from "../components/common";
import { ErrorState, EmptyState } from "../components/common";
import { SinistroChecklist } from "../components/SinistroChecklist";
import {
  useRemoveSinistroDocumento,
  useSinistro,
  useUpdateSinistro,
  useUpdateSinistroStatus,
  useAddRegulacaoEvento,
  useUpdateRegulacaoEvento,
  useUploadSinistroDocumento,
  useDownloadSinistroDocumento,
  useUpdateSinistroDocumentoStatus,
} from "../hooks/useSinistros";
import { StatusSinistro, RegulacaoEventoData } from "../types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value
  );

const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-BR");

const formatDateTime = (date: string) => new Date(date).toLocaleString("pt-BR");

const statusLabels: Record<string, string> = {
  notificado: "Notificado",
  analise_inicial: "Analise Inicial",
  documentacao: "Documentacao",
  regulacao: "Regulacao",
  cobertura_confirmada: "Cobertura Confirmada",
  indenizacao_processando: "Indenizacao Processando",
  pago: "Pago",
  recusado: "Recusado",
};

const statusBadgeVariant: Record<
  string,
  "info" | "warning" | "success" | "error" | "neutral"
> = {
  notificado: "info",
  analise_inicial: "info",
  documentacao: "warning",
  regulacao: "warning",
  cobertura_confirmada: "success",
  indenizacao_processando: "warning",
  pago: "success",
  recusado: "error",
};

const eventoStatusColors: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700",
  em_andamento: "bg-blue-100 text-blue-700",
  concluido: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-slate-100 text-slate-500",
};

const TIPOS_DOCUMENTO = [
  { value: "bo", label: "BO - Boletim de Ocorrencia" },
  { value: "fotos", label: "Fotos" },
  { value: "laudo", label: "Laudo Tecnico" },
  { value: "nota_fiscal", label: "Nota Fiscal" },
  { value: "orcamento", label: "Orcamento" },
  { value: "cnh", label: "CNH" },
  { value: "crlv", label: "CRLV" },
  { value: "procuracao", label: "Procuracao" },
  { value: "outros", label: "Outros" },
];

const docStatusColors: Record<
  string,
  { bg: string; text: string; icon: typeof FileCheck }
> = {
  pendente: { bg: "bg-amber-100", text: "text-amber-700", icon: File },
  aprovado: { bg: "bg-emerald-100", text: "text-emerald-700", icon: FileCheck },
  rejeitado: { bg: "bg-red-100", text: "text-red-700", icon: FileX },
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType?: string) => {
  if (mimeType?.startsWith("image/")) return Image;
  return FileText;
};

export default function SinistroDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: sinistro, isLoading, error, refetch } = useSinistro(id);
  const updateSinistro = useUpdateSinistro();
  const updateStatus = useUpdateSinistroStatus();
  const addEvento = useAddRegulacaoEvento();
  const updateEvento = useUpdateRegulacaoEvento();
  const uploadDocumento = useUploadSinistroDocumento();
  const downloadDocumento = useDownloadSinistroDocumento();
  const updateDocStatus = useUpdateSinistroDocumentoStatus();
  const removeDocumento = useRemoveSinistroDocumento();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddEventoModal, setShowAddEventoModal] = useState(false);
  const [showAddDocumentoModal, setShowAddDocumentoModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [editFormData, setEditFormData] = useState({
    numero_sinistro: "",
    regulador: "",
    valor_indenizacao: 0,
    descricao_ocorrencia: "",
  });
  const [activeTab, setActiveTab] = useState<
    "timeline" | "documentos" | "checklist"
  >("timeline");

  const [novoEvento, setNovoEvento] = useState<RegulacaoEventoData>({
    etapa: "",
    titulo: "",
    descricao: "",
    responsavel: "",
    prazo: "",
  });

  const [novoDocumento, setNovoDocumento] = useState({
    tipo: "",
    observacao: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  const [novoStatus, setNovoStatus] =
    useState<StatusSinistro>("analise_inicial");
  const [observacaoStatus, setObservacaoStatus] = useState("");

  if (error) {
    return (
      <PageLayout title="Sinistro" subtitle="Erro ao carregar">
        <ErrorState
          title="Sinistro nao encontrado"
          description="O sinistro que voce esta procurando nao existe ou foi removido."
          action={{
            label: "Voltar para Sinistros",
            onClick: () => navigate("/sinistros"),
          }}
        />
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout title="Carregando..." subtitle="">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton height={400} />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton height={100} />
            <Skeleton height={300} />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!sinistro) return null;

  const regulacao = sinistro.sinistro_regulacao || [];
  const documentos = sinistro.sinistro_documentos || [];

  const diasDesdeAbertura = Math.floor(
    (new Date().getTime() - new Date(sinistro.created_at).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Gerar steps para o stepper baseado no status
  const allSteps = [
    { id: "notificado", label: "Abertura" },
    { id: "analise_inicial", label: "Analise" },
    { id: "documentacao", label: "Docs" },
    { id: "regulacao", label: "Regulacao" },
    { id: "cobertura_confirmada", label: "Cobertura" },
    { id: "indenizacao_processando", label: "Indenizacao" },
    { id: "pago", label: "Conclusao" },
  ];

  const currentStepIndex = allSteps.findIndex((s) => s.id === sinistro.status);
  const steps = allSteps.map((step, index) => ({
    ...step,
    status:
      index < currentStepIndex
        ? ("completed" as const)
        : index === currentStepIndex
        ? ("current" as const)
        : ("pending" as const),
  }));

  const handleEditSinistro = async () => {
    try {
      await updateSinistro.mutateAsync({
        id: id!,
        data: {
          regulador: editFormData.regulador,
          valor_indenizacao: editFormData.valor_indenizacao,
          descricao_ocorrencia: editFormData.descricao_ocorrencia,
          // We don't allow changing numero_sinistro usually, but if needed we can add it
        },
      });
      setShowEditModal(false);
      refetch();
    } catch (error) {
      console.error("Erro ao atualizar sinistro:", error);
    }
  };

  const handleOpenEditModal = () => {
    if (!sinistro) return;
    setEditFormData({
      numero_sinistro: sinistro.numero_sinistro || "",
      regulador: sinistro.regulador || "",
      valor_indenizacao: sinistro.valor_indenizacao || 0,
      descricao_ocorrencia: sinistro.descricao_ocorrencia || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateStatus = async () => {
    try {
      await updateStatus.mutateAsync({
        id: id!,
        status: novoStatus,
        observacao: observacaoStatus,
      });
      setShowStatusModal(false);
      setObservacaoStatus("");
      refetch();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleAddEvento = async () => {
    if (!novoEvento.titulo || !novoEvento.descricao) return;

    try {
      await addEvento.mutateAsync({
        sinistroId: id!,
        data: novoEvento,
      });
      setShowAddEventoModal(false);
      setNovoEvento({
        etapa: "",
        titulo: "",
        descricao: "",
        responsavel: "",
        prazo: "",
      });
      refetch();
    } catch (error) {
      console.error("Erro ao adicionar evento:", error);
    }
  };

  const handleConcluirEvento = async (eventoId: string) => {
    try {
      await updateEvento.mutateAsync({
        sinistroId: id!,
        eventoId,
        status: "concluido",
      });
      refetch();
    } catch (error) {
      console.error("Erro ao concluir evento:", error);
    }
  };

  const handleAddDocumento = async () => {
    if (!novoDocumento.tipo || !selectedFile) return;

    try {
      setUploadProgress(true);
      await uploadDocumento.mutateAsync({
        sinistroId: id!,
        file: selectedFile,
        tipo: novoDocumento.tipo,
        observacao: novoDocumento.observacao,
      });
      setShowAddDocumentoModal(false);
      setNovoDocumento({ tipo: "", observacao: "" });
      setSelectedFile(null);
      refetch();
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
    } finally {
      setUploadProgress(false);
    }
  };

  const handleDownloadDocumento = async (docId: string) => {
    try {
      const result = await downloadDocumento.mutateAsync({
        sinistroId: id!,
        docId,
      });
      if (result.url) {
        window.open(result.url, "_blank");
      }
    } catch (error) {
      console.error("Erro ao baixar documento:", error);
    }
  };

  const handleUpdateDocStatus = async (
    docId: string,
    status: "aprovado" | "rejeitado"
  ) => {
    try {
      await updateDocStatus.mutateAsync({
        sinistroId: id!,
        docId,
        status,
      });
      refetch();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveDocumento = async (docId: string) => {
    if (!confirm("Tem certeza que deseja remover este documento?")) return;

    try {
      await removeDocumento.mutateAsync({
        sinistroId: id!,
        docId,
      });
      refetch();
    } catch (error) {
      console.error("Erro ao remover documento:", error);
    }
  };

  return (
    <PageLayout
      title={`Sinistro ${sinistro.numero_sinistro}`}
      subtitle="Detalhes do processo"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}
          >
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              leftIcon={<Edit className="w-4 h-4" />}
              onClick={() => {
                setNovoStatus(sinistro.status as StatusSinistro);
                setShowStatusModal(true);
              }}
            >
              Alterar Status
            </Button>
            <Button
              leftIcon={<Edit className="w-4 h-4" />}
              onClick={handleOpenEditModal}
            >
              Editar
            </Button>
          </div>
        </div>

        {/* Status Stepper */}
        {sinistro.status !== "recusado" && (
          <Card>
            <StatusStepper steps={steps} />
          </Card>
        )}

        {/* Alerta de Recusa */}
        {sinistro.status === "recusado" && (
          <Card className="bg-red-50 border-red-200">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-semibold text-red-800">Sinistro Recusado</p>
                <p className="text-sm text-red-600">
                  Este sinistro foi recusado pela seguradora
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info do Sinistro */}
          <div className="space-y-6">
            <Card>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">
                    Numero do Sinistro
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {sinistro.numero_sinistro}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <Badge variant={statusBadgeVariant[sinistro.status]}>
                    {statusLabels[sinistro.status]}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">
                    Data da Ocorrencia
                  </p>
                  <p className="text-sm text-slate-800">
                    {formatDate(sinistro.data_ocorrencia)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Aberto ha</p>
                  <p className="text-sm text-slate-800">
                    {diasDesdeAbertura} dias
                  </p>
                </div>

                {sinistro.regulador && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      Regulador/Perito
                    </p>
                    <p className="text-sm font-medium text-slate-800">
                      {sinistro.regulador}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Cliente</p>
                  <p className="text-sm font-medium text-slate-800">
                    {sinistro.clientes?.nome}
                  </p>
                  <p className="text-xs text-slate-500">
                    {sinistro.clientes?.cpf_cnpj}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Apolice</p>
                  <p className="text-sm text-slate-800">
                    {sinistro.apolices?.numero_apolice}
                  </p>
                  <p className="text-xs text-slate-500">
                    {sinistro.apolices?.seguradora} - {sinistro.apolices?.ramo}
                  </p>
                </div>

                {sinistro.valor_indenizacao &&
                  sinistro.valor_indenizacao > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">
                        Valor da Indenizacao
                      </p>
                      <p className="text-lg font-bold text-emerald-600">
                        {formatCurrency(sinistro.valor_indenizacao)}
                      </p>
                    </div>
                  )}
              </div>
            </Card>

            {/* Prazo SUSEP */}
            <Card className="bg-amber-50 border-amber-200">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Prazo SUSEP
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    A seguradora tem ate 30 dias apos receber todos os
                    documentos para responder
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Conteudo Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Descricao */}
            <Card>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Descricao do Sinistro
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {sinistro.descricao_ocorrencia}
              </p>
            </Card>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
              {[
                {
                  id: "timeline",
                  label: "Timeline de Regulacao",
                  icon: Calendar,
                  count: regulacao.length,
                },
                {
                  id: "documentos",
                  label: "Documentos",
                  icon: FileText,
                  count: documentos.length,
                },
                {
                  id: "checklist",
                  label: "Checklist",
                  icon: ClipboardList,
                  count: null,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                    activeTab === tab.id
                      ? "border-violet-500 text-violet-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== null && (
                    <span className="px-1.5 py-0.5 text-xs bg-slate-100 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab: Timeline */}
            {activeTab === "timeline" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-violet-600" />
                    Timeline de Regulacao
                  </h3>
                  <Button
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowAddEventoModal(true)}
                  >
                    Adicionar Evento
                  </Button>
                </div>

                {regulacao.length === 0 ? (
                  <EmptyState
                    title="Nenhum evento registrado"
                    description="Adicione eventos para acompanhar a regulacao"
                    icon={<Calendar className="w-12 h-12 text-slate-300" />}
                  />
                ) : (
                  <div className="space-y-4">
                    {regulacao.map((evento) => (
                      <div
                        key={evento.id}
                        className={`p-4 border rounded-lg ${
                          evento.status === "concluido"
                            ? "border-emerald-200 bg-emerald-50/50"
                            : evento.status === "pendente"
                            ? "border-amber-200 bg-amber-50/50"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-slate-800">
                                {evento.titulo}
                              </p>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  eventoStatusColors[evento.status]
                                }`}
                              >
                                {evento.status}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600">
                              {evento.descricao}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                              <span>{formatDateTime(evento.data_evento)}</span>
                              {evento.usuario && (
                                <span>Por {evento.usuario.nome}</span>
                              )}
                              {evento.responsavel && (
                                <span>Resp: {evento.responsavel}</span>
                              )}
                              {evento.prazo && (
                                <span>Prazo: {formatDate(evento.prazo)}</span>
                              )}
                            </div>
                            {evento.observacao && (
                              <p className="text-xs text-slate-500 mt-2 italic">
                                {evento.observacao}
                              </p>
                            )}
                          </div>
                          {evento.status === "pendente" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-200"
                              leftIcon={<CheckCircle className="w-3 h-3" />}
                              onClick={() => handleConcluirEvento(evento.id)}
                            >
                              Concluir
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Tab: Documentos */}
            {activeTab === "documentos" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-600" />
                    Documentos
                  </h3>
                  <Button
                    size="sm"
                    leftIcon={<Upload className="w-4 h-4" />}
                    onClick={() => setShowAddDocumentoModal(true)}
                  >
                    Enviar Documento
                  </Button>
                </div>

                {documentos.length === 0 ? (
                  <EmptyState
                    title="Nenhum documento"
                    description="Envie os documentos necessarios para o sinistro"
                    icon={<FileText className="w-12 h-12 text-slate-300" />}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {documentos.map((doc) => {
                      const statusConfig =
                        docStatusColors[doc.status] || docStatusColors.pendente;
                      const FileIcon = getFileIcon(doc.tipo_mime);
                      const StatusIcon = statusConfig.icon;

                      return (
                        <div
                          key={doc.id}
                          className="p-4 bg-white border border-slate-200 rounded-lg hover:border-violet-200 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <FileIcon className="w-5 h-5 text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-slate-800 truncate">
                                {doc.nome_arquivo}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="neutral" size="sm">
                                  {TIPOS_DOCUMENTO.find(
                                    (t) => t.value === doc.tipo
                                  )?.label || doc.tipo}
                                </Badge>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}
                                >
                                  <StatusIcon className="w-3 h-3" />
                                  {doc.status}
                                </span>
                                {doc.tamanho && (
                                  <span className="text-xs text-slate-400">
                                    {formatFileSize(doc.tamanho)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {formatDate(doc.created_at)}
                              </p>
                              {doc.observacoes && (
                                <p className="text-xs text-slate-500 mt-1 italic">
                                  {doc.observacoes}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-violet-600 w-8 h-8 p-0"
                                onClick={() => handleDownloadDocumento(doc.id)}
                                title="Baixar"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              {doc.status === "pendente" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-emerald-600 w-8 h-8 p-0"
                                    onClick={() =>
                                      handleUpdateDocStatus(doc.id, "aprovado")
                                    }
                                    title="Aprovar"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 w-8 h-8 p-0"
                                    onClick={() =>
                                      handleUpdateDocStatus(doc.id, "rejeitado")
                                    }
                                    title="Rejeitar"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 w-8 h-8 p-0"
                                onClick={() => handleRemoveDocumento(doc.id)}
                                title="Remover"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {/* Tab: Checklist */}
            {activeTab === "checklist" && (
              <SinistroChecklist
                sinistroId={id!}
                documentos={documentos.map((doc) => ({
                  id: doc.id,
                  nome_arquivo: doc.nome_arquivo,
                  tipo: doc.tipo,
                }))}
              />
            )}
          </div>
        </div>
      </motion.div>

      {/* Modal Alterar Status */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Alterar Status do Sinistro"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Novo Status
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20"
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value as StatusSinistro)}
            >
              <option value="notificado">Notificado</option>
              <option value="analise_inicial">Analise Inicial</option>
              <option value="documentacao">Documentacao</option>
              <option value="regulacao">Regulacao</option>
              <option value="cobertura_confirmada">Cobertura Confirmada</option>
              <option value="indenizacao_processando">
                Indenizacao Processando
              </option>
              <option value="pago">Pago</option>
              <option value="recusado">Recusado</option>
            </select>
          </div>
          <Input
            label="Observacao"
            placeholder="Motivo da alteracao..."
            value={observacaoStatus}
            onChange={(e) => setObservacaoStatus(e.target.value)}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowStatusModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpdateStatus}
            disabled={updateStatus.isPending}
            leftIcon={
              updateStatus.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : undefined
            }
          >
            {updateStatus.isPending ? "Atualizando..." : "Atualizar Status"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Adicionar Evento */}
      <Modal
        isOpen={showAddEventoModal}
        onClose={() => setShowAddEventoModal(false)}
        title="Adicionar Evento na Timeline"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Titulo"
            placeholder="Ex: Vistoria Realizada"
            value={novoEvento.titulo}
            onChange={(e) =>
              setNovoEvento({ ...novoEvento, titulo: e.target.value })
            }
          />
          <Input
            label="Descricao"
            placeholder="Descreva o evento..."
            value={novoEvento.descricao}
            onChange={(e) =>
              setNovoEvento({ ...novoEvento, descricao: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Responsavel"
              placeholder="Nome do responsavel"
              value={novoEvento.responsavel}
              onChange={(e) =>
                setNovoEvento({ ...novoEvento, responsavel: e.target.value })
              }
            />
            <Input
              label="Prazo"
              type="date"
              value={novoEvento.prazo}
              onChange={(e) =>
                setNovoEvento({ ...novoEvento, prazo: e.target.value })
              }
            />
          </div>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowAddEventoModal(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAddEvento}
            disabled={addEvento.isPending || !novoEvento.titulo}
            leftIcon={
              addEvento.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : undefined
            }
          >
            {addEvento.isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Adicionar Documento */}
      <Modal
        isOpen={showAddDocumentoModal}
        onClose={() => {
          setShowAddDocumentoModal(false);
          setSelectedFile(null);
          setNovoDocumento({ tipo: "", observacao: "" });
        }}
        title="Enviar Documento"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo de Documento
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20"
              value={novoDocumento.tipo}
              onChange={(e) =>
                setNovoDocumento({ ...novoDocumento, tipo: e.target.value })
              }
            >
              <option value="">Selecione...</option>
              {TIPOS_DOCUMENTO.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          {/* Upload Area */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Arquivo
            </label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
              onChange={handleFileSelect}
            />

            {selectedFile ? (
              <div className="border-2 border-violet-200 bg-violet-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500"
                    onClick={() => setSelectedFile(null)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">
                  Clique para selecionar
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  PDF, imagens ou documentos (max 50MB)
                </p>
              </div>
            )}
          </div>

          <Input
            label="Observacao (opcional)"
            placeholder="Observacoes sobre o documento..."
            value={novoDocumento.observacao}
            onChange={(e) =>
              setNovoDocumento({ ...novoDocumento, observacao: e.target.value })
            }
          />
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowAddDocumentoModal(false);
              setSelectedFile(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAddDocumento}
            disabled={uploadProgress || !novoDocumento.tipo || !selectedFile}
            leftIcon={
              uploadProgress ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )
            }
          >
            {uploadProgress ? "Enviando..." : "Enviar Documento"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Editar Sinistro */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Detalhes do Sinistro"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Regulador / Perito"
            placeholder="Nome do regulador..."
            value={editFormData.regulador}
            onChange={(e) =>
              setEditFormData({ ...editFormData, regulador: e.target.value })
            }
          />
          <Input
            label="Valor da Indenizacao"
            type="number"
            placeholder="0.00"
            value={editFormData.valor_indenizacao}
            onChange={(e) =>
              setEditFormData({
                ...editFormData,
                valor_indenizacao: parseFloat(e.target.value) || 0,
              })
            }
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descricao da Ocorrencia
            </label>
            <textarea
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 resize-none"
              rows={4}
              placeholder="Descreva o sinistro..."
              value={editFormData.descricao_ocorrencia}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  descricao_ocorrencia: e.target.value,
                })
              }
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowEditModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleEditSinistro}
            disabled={updateSinistro.isPending}
            leftIcon={
              updateSinistro.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : undefined
            }
          >
            {updateSinistro.isPending ? "Salvando..." : "Salvar Alteracoes"}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
