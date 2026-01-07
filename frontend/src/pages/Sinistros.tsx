import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  ArrowRight,
  Loader2,
  Trash2,
  Eye,
  Edit,
  Car,
  Home,
  Heart,
  Stethoscope,
  Wallet,
  Building,
  HelpCircle,
  ClipboardList,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import {
  Button,
  Card,
  Modal,
  ModalFooter,
  Input,
  Skeleton,
  EmptyState,
} from "../components/common";
import {
  useSinistros,
  useSinistrosStats,
  useCreateSinistro,
  useUpdateSinistro,
  useDeleteSinistro,
} from "../hooks/useSinistros";
import { useChecklistSinistro } from "../hooks/useSinistroChecklist";
import { useApolices } from "../hooks/useApolices";
import { useClientes } from "../hooks/useClientes";
import { Sinistro, Cliente, Apolice } from "../types";

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

const statusConfig: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ElementType;
    bgClass: string;
    textClass: string;
    borderClass: string;
  }
> = {
  notificado: {
    label: "Notificado",
    color: "blue",
    icon: AlertTriangle,
    bgClass: "bg-blue-100",
    textClass: "text-blue-600",
    borderClass: "border-blue-200",
  },
  analise_inicial: {
    label: "Em Analise",
    color: "amber",
    icon: Clock,
    bgClass: "bg-amber-100",
    textClass: "text-amber-600",
    borderClass: "border-amber-200",
  },
  documentacao: {
    label: "Documentacao",
    color: "violet",
    icon: FileText,
    bgClass: "bg-violet-100",
    textClass: "text-violet-600",
    borderClass: "border-violet-200",
  },
  regulacao: {
    label: "Regulacao",
    color: "cyan",
    icon: Clock,
    bgClass: "bg-cyan-100",
    textClass: "text-cyan-600",
    borderClass: "border-cyan-200",
  },
  cobertura_confirmada: {
    label: "Cobertura Confirmada",
    color: "teal",
    icon: CheckCircle,
    bgClass: "bg-teal-100",
    textClass: "text-teal-600",
    borderClass: "border-teal-200",
  },
  indenizacao_processando: {
    label: "Processando",
    color: "indigo",
    icon: Clock,
    bgClass: "bg-indigo-100",
    textClass: "text-indigo-600",
    borderClass: "border-indigo-200",
  },
  pago: {
    label: "Pago",
    color: "emerald",
    icon: CheckCircle,
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-600",
    borderClass: "border-emerald-200",
  },
  recusado: {
    label: "Recusado",
    color: "red",
    icon: XCircle,
    bgClass: "bg-red-100",
    textClass: "text-red-600",
    borderClass: "border-red-200",
  },
};

const ramoIcons: Record<string, React.ElementType> = {
  auto: Car,
  residencial: Home,
  vida: Heart,
  saude: Stethoscope,
  consorcio: Wallet,
  financiamento: Building,
  outros: HelpCircle,
};

// Mini componente para mostrar progresso do checklist no card
function ChecklistMiniPreview({ sinistroId }: { sinistroId: string }) {
  const { data: checklist, isLoading } = useChecklistSinistro(sinistroId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Carregando...</span>
      </div>
    );
  }

  if (!checklist || !checklist.progresso) {
    return null;
  }

  const { progresso } = checklist;
  const obrigatoriosPendentes = checklist.itens?.filter(
    (item) => item.obrigatorio && !item.recebido
  ).length || 0;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Documentos</span>
        </div>
        <span className="text-xs text-slate-500">
          {progresso.recebidos}/{progresso.total}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${progresso.percentual_aprovado}%` }}
          />
          <div
            className="bg-amber-400 transition-all"
            style={{
              width: `${progresso.percentual_recebido - progresso.percentual_aprovado}%`,
            }}
          />
        </div>
      </div>
      
      {/* Alert for pending mandatory docs */}
      {obrigatoriosPendentes > 0 && (
        <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {obrigatoriosPendentes} doc{obrigatoriosPendentes > 1 ? "s" : ""} obrigatorio{obrigatoriosPendentes > 1 ? "s" : ""} pendente{obrigatoriosPendentes > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

interface FormData {
  cliente_id: string;
  apolice_id: string;
  data_ocorrencia: string;
  descricao: string;
}

const initialFormData: FormData = {
  cliente_id: "",
  apolice_id: "",
  data_ocorrencia: "",
  descricao: "",
};

export default function Sinistros() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sinistroToDelete, setSinistroToDelete] = useState<Sinistro | null>(
    null
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sinistroToEdit, setSinistroToEdit] = useState<Sinistro | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof FormData, string>>
  >({});

  // API hooks
  const { data, isLoading, error } = useSinistros(
    filterStatus !== "todos" ? { status: filterStatus } : undefined
  );
  const { data: stats, isLoading: statsLoading } = useSinistrosStats();
  const { data: clientesData } = useClientes();
  const { data: apolicesData } = useApolices(
    formData.cliente_id ? { cliente_id: formData.cliente_id } : undefined
  );
  const createSinistro = useCreateSinistro();
  const updateSinistro = useUpdateSinistro();
  const deleteSinistro = useDeleteSinistro();

  // Filter sinistros by search
  const sinistrosList = useMemo(() => data?.data || [], [data?.data]);
  const filtered = useMemo(() => {
    if (!sinistrosList.length) return [];
    if (!search) return sinistrosList;

    const searchLower = search.toLowerCase();
    return sinistrosList.filter(
      (sin: Sinistro) =>
        sin.numero_sinistro?.toLowerCase().includes(searchLower) ||
        sin.clientes?.nome?.toLowerCase().includes(searchLower) ||
        sin.apolices?.numero_apolice?.toLowerCase().includes(searchLower)
    );
  }, [sinistrosList, search]);

  // Handle form change
  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));

    // Reset apolice when cliente changes
    if (field === "cliente_id") {
      setFormData((prev) => ({ ...prev, apolice_id: "" }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.cliente_id) {
      errors.cliente_id = "Selecione um cliente";
    }
    if (!formData.apolice_id) {
      errors.apolice_id = "Selecione uma apolice";
    }
    if (!formData.data_ocorrencia) {
      errors.data_ocorrencia = "Data da ocorrencia e obrigatoria";
    }
    if (!formData.descricao.trim()) {
      errors.descricao = "Descricao e obrigatoria";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await createSinistro.mutateAsync({
        cliente_id: formData.cliente_id,
        apolice_id: formData.apolice_id,
        data_ocorrencia: formData.data_ocorrencia,
        descricao_ocorrencia: formData.descricao,
        status: "notificado",
      });

      setIsModalOpen(false);
      setFormData(initialFormData);
      setFormErrors({});
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao abrir sinistro";
      setFormErrors({ descricao: errorMessage });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!sinistroToDelete) return;

    try {
      await deleteSinistro.mutateAsync(sinistroToDelete.id);
      setDeleteModalOpen(false);
      setSinistroToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir sinistro:", err);
    }
  };

  // Handle open edit modal
  const handleOpenEditModal = (sinistro: Sinistro) => {
    setSinistroToEdit(sinistro);
    setFormData({
      cliente_id: sinistro.cliente_id,
      apolice_id: sinistro.apolice_id,
      data_ocorrencia: sinistro.data_ocorrencia || "",
      descricao: sinistro.descricao_ocorrencia || "",
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Handle update
  const handleUpdate = async () => {
    if (!validateForm() || !sinistroToEdit) return;

    try {
      await updateSinistro.mutateAsync({
        id: sinistroToEdit.id,
        data: {
          cliente_id: formData.cliente_id,
          apolice_id: formData.apolice_id,
          data_ocorrencia: formData.data_ocorrencia,
          descricao_ocorrencia: formData.descricao,
        },
      });

      setIsEditModalOpen(false);
      setSinistroToEdit(null);
      setFormData(initialFormData);
      setFormErrors({});
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao atualizar sinistro";
      setFormErrors({ descricao: errorMessage });
    }
  };

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSinistroToEdit(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  // Clientes options for select
  const clientesOptions = clientesData?.data || [];

  // Apolices options filtered by cliente
  const apolicesOptions = apolicesData?.data || [];

  return (
    <PageLayout
      title="Sinistros"
      subtitle={`${stats?.total || data?.total || 0} sinistros registrados`}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Stats */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Abertos</p>
              <p className="text-lg font-bold text-slate-800">
                {statsLoading ? "-" : stats?.abertos || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-100">
              <Clock className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Em Regulacao</p>
              <p className="text-lg font-bold text-slate-800">
                {statsLoading ? "-" : stats?.em_regulacao || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pagos</p>
              <p className="text-lg font-bold text-slate-800">
                {statsLoading ? "-" : stats?.pagos || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-100">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Recusados</p>
              <p className="text-lg font-bold text-slate-800">
                {statsLoading ? "-" : stats?.recusados || 0}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Toolbar */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row gap-4 justify-between"
        >
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar sinistro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              <option value="todos">Todos Status</option>
              <option value="notificado">Notificado</option>
              <option value="analise_inicial">Em Analise</option>
              <option value="documentacao">Documentacao</option>
              <option value="regulacao">Regulacao</option>
              <option value="pago">Pago</option>
              <option value="recusado">Recusado</option>
            </select>
          </div>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Abrir Sinistro
          </Button>
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={200} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="text-center py-12">
            <p className="text-red-500">Erro ao carregar sinistros</p>
          </Card>
        )}

        {/* Cards */}
        {!isLoading && !error && (
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {filtered.map((sin: Sinistro) => {
              const status =
                statusConfig[sin.status] || statusConfig.notificado;
              const Icon = status.icon;
              const RamoIcon =
                ramoIcons[sin.apolices?.ramo ?? "outros"] || HelpCircle;

              return (
                <motion.div key={sin.id} variants={itemVariants}>
                  <Card
                    className="group hover:border-violet-200 transition-colors cursor-pointer relative"
                    onClick={() => navigate(`/sinistros/${sin.id}`)}
                  >
                    {/* Actions */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div
                        className="flex gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sinistros/${sin.id}`);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(sin);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSinistroToDelete(sin);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${status.bgClass}`}>
                          <Icon className={`w-5 h-5 ${status.textClass}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {sin.numero_sinistro ||
                              `SIN-${sin.id.slice(0, 8).toUpperCase()}`}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <RamoIcon className="w-3 h-3" />
                            <span>
                              {sin.apolices?.ramo?.toUpperCase() || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${status.bgClass} ${status.textClass} border ${status.borderClass}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="text-slate-500">
                        <span className="text-slate-400">Cliente:</span>{" "}
                        {sin.clientes?.nome || "N/A"}
                      </p>
                      <p className="text-slate-500">
                        <span className="text-slate-400">Apolice:</span>{" "}
                        {sin.apolices?.numero_apolice || "N/A"}
                      </p>
                      <p className="text-slate-500">
                        <span className="text-slate-400">Ocorrencia:</span>{" "}
                        {sin.data_ocorrencia
                          ? new Date(sin.data_ocorrencia).toLocaleDateString(
                              "pt-BR"
                            )
                          : "N/A"}
                      </p>
                      <p className="text-slate-600 line-clamp-2">
                        {sin.descricao_ocorrencia}
                      </p>
                    </div>

                    {/* Checklist Preview - show for open sinistros */}
                    {sin.status !== "pago" && sin.status !== "recusado" && (
                      <ChecklistMiniPreview sinistroId={sin.id} />
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs text-slate-400">
                        Criado em{" "}
                        {new Date(sin.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <button className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
                        Ver detalhes <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filtered.length === 0 && (
          <EmptyState
            icon={<AlertTriangle className="w-8 h-8" />}
            title="Nenhum sinistro encontrado"
            description={
              search || filterStatus !== "todos"
                ? "Tente ajustar os filtros ou termo de busca"
                : "Nenhum sinistro foi registrado ainda"
            }
            action={{
              label: "Abrir Sinistro",
              onClick: () => setIsModalOpen(true),
            }}
          />
        )}
      </motion.div>

      {/* Modal Abrir Sinistro */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormData(initialFormData);
          setFormErrors({});
        }}
        title="Abrir Sinistro"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente Select */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Cliente *
              </label>
              <select
                value={formData.cliente_id}
                onChange={(e) => handleFormChange("cliente_id", e.target.value)}
                className={`
                  w-full px-4 py-2.5 bg-white border rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                  ${
                    formErrors.cliente_id
                      ? "border-red-300"
                      : "border-slate-200"
                  }
                `}
              >
                <option value="">Selecione um cliente</option>
                {clientesOptions.map((cliente: Cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
              {formErrors.cliente_id && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.cliente_id}
                </p>
              )}
            </div>

            {/* Apolice Select */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Apolice *
              </label>
              <select
                value={formData.apolice_id}
                onChange={(e) => handleFormChange("apolice_id", e.target.value)}
                disabled={!formData.cliente_id}
                className={`
                  w-full px-4 py-2.5 bg-white border rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                  disabled:bg-slate-50 disabled:text-slate-400
                  ${
                    formErrors.apolice_id
                      ? "border-red-300"
                      : "border-slate-200"
                  }
                `}
              >
                <option value="">
                  {formData.cliente_id
                    ? "Selecione uma apolice"
                    : "Selecione um cliente primeiro"}
                </option>
                {apolicesOptions.map((apolice: Apolice) => (
                  <option key={apolice.id} value={apolice.id}>
                    {apolice.numero_apolice} - {apolice.ramo?.toUpperCase()}
                  </option>
                ))}
              </select>
              {formErrors.apolice_id && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.apolice_id}
                </p>
              )}
            </div>
          </div>

          <Input
            label="Data da Ocorrencia *"
            type="date"
            value={formData.data_ocorrencia}
            onChange={(e) =>
              handleFormChange("data_ocorrencia", e.target.value)
            }
            error={formErrors.data_ocorrencia}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Descricao *
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => handleFormChange("descricao", e.target.value)}
              className={`
                w-full px-4 py-2.5 bg-white border rounded-xl text-slate-800 
                placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20
                focus:border-violet-500 resize-none
                ${formErrors.descricao ? "border-red-300" : "border-slate-200"}
              `}
              rows={3}
              placeholder="Descreva o sinistro em detalhes..."
            />
            {formErrors.descricao && (
              <p className="text-xs text-red-500 mt-1">
                {formErrors.descricao}
              </p>
            )}
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setIsModalOpen(false);
              setFormData(initialFormData);
              setFormErrors({});
            }}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createSinistro.isPending}>
            {createSinistro.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Abrindo...
              </>
            ) : (
              "Abrir Sinistro"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Confirmar Exclusao */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSinistroToDelete(null);
        }}
        title="Confirmar Exclusao"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-700 mb-2">
            Tem certeza que deseja excluir o sinistro
          </p>
          <p className="font-semibold text-slate-800">
            {sinistroToDelete?.numero_sinistro ||
              `SIN-${sinistroToDelete?.id?.slice(0, 8).toUpperCase()}`}
            ?
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Esta acao nao pode ser desfeita.
          </p>
        </div>

        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setDeleteModalOpen(false);
              setSinistroToDelete(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteSinistro.isPending}
          >
            {deleteSinistro.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir Sinistro"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Editar Sinistro */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Editar Sinistro"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente Select */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Cliente *
              </label>
              <select
                value={formData.cliente_id}
                onChange={(e) => handleFormChange("cliente_id", e.target.value)}
                className={`
                  w-full px-4 py-2.5 bg-white border rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                  ${
                    formErrors.cliente_id
                      ? "border-red-300"
                      : "border-slate-200"
                  }
                `}
              >
                <option value="">Selecione um cliente</option>
                {clientesOptions.map((cliente: Cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
              {formErrors.cliente_id && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.cliente_id}
                </p>
              )}
            </div>

            {/* Apolice Select */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Apolice *
              </label>
              <select
                value={formData.apolice_id}
                onChange={(e) => handleFormChange("apolice_id", e.target.value)}
                disabled={!formData.cliente_id}
                className={`
                  w-full px-4 py-2.5 bg-white border rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                  disabled:bg-slate-50 disabled:text-slate-400
                  ${
                    formErrors.apolice_id
                      ? "border-red-300"
                      : "border-slate-200"
                  }
                `}
              >
                <option value="">
                  {formData.cliente_id
                    ? "Selecione uma apolice"
                    : "Selecione um cliente primeiro"}
                </option>
                {apolicesOptions.map((apolice: Apolice) => (
                  <option key={apolice.id} value={apolice.id}>
                    {apolice.numero_apolice} - {apolice.ramo?.toUpperCase()}
                  </option>
                ))}
              </select>
              {formErrors.apolice_id && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.apolice_id}
                </p>
              )}
            </div>
          </div>

          <Input
            label="Data da Ocorrencia *"
            type="date"
            value={formData.data_ocorrencia}
            onChange={(e) =>
              handleFormChange("data_ocorrencia", e.target.value)
            }
            error={formErrors.data_ocorrencia}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Descricao *
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => handleFormChange("descricao", e.target.value)}
              className={`
                w-full px-4 py-2.5 bg-white border rounded-xl text-slate-800 
                placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20
                focus:border-violet-500 resize-none
                ${formErrors.descricao ? "border-red-300" : "border-slate-200"}
              `}
              rows={3}
              placeholder="Descreva o sinistro em detalhes..."
            />
            {formErrors.descricao && (
              <p className="text-xs text-red-500 mt-1">
                {formErrors.descricao}
              </p>
            )}
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={handleCloseEditModal}>
            Cancelar
          </Button>
          <Button onClick={handleUpdate} disabled={updateSinistro.isPending}>
            {updateSinistro.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Atualizar Sinistro"
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
