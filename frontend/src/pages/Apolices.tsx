import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  Car,
  Home,
  Heart,
  Loader2,
  Eye,
  Edit,
  Trash2,
  Building,
  Shield,
  Wallet,
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
  Badge,
} from "../components/common";
import {
  useApolices,
  useApolicesStats,
  useCreateApolice,
  useUpdateApolice,
  useDeleteApolice,
} from "../hooks/useApolices";
import { useClientes } from "../hooks/useClientes";
import { Apolice, RamoSeguro, Cliente } from "../types";

const ramoConfig: Record<
  string, // Mudado de RamoSeguro para string para aceitar qualquer chave
  { icon: React.ElementType; color: string; label: string }
> = {
  auto: { icon: Car, color: "blue", label: "Auto" },
  residencial: { icon: Home, color: "emerald", label: "Residencial" },
  vida: { icon: Heart, color: "pink", label: "Vida" },
  saude: { icon: Shield, color: "cyan", label: "Saude" },
  consorcio: { icon: Building, color: "amber", label: "Consorcio" },
  financiamento: { icon: Wallet, color: "violet", label: "Financiamento" },
  outros: { icon: FileText, color: "slate", label: "Outros" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

interface FormData {
  cliente_id: string;
  ramo: RamoSeguro;
  seguradora: string;
  numero_apolice: string;
  valor_premio: string;
  data_inicio: string;
  data_vencimento: string;
}

const initialFormData: FormData = {
  cliente_id: "",
  ramo: "auto",
  seguradora: "",
  numero_apolice: "",
  valor_premio: "",
  data_inicio: "",
  data_vencimento: "",
};

export default function Apolices() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [apoliceToDelete, setApoliceToDelete] = useState<Apolice | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof FormData, string>>
  >({});
  const [filterRamo, setFilterRamo] = useState<RamoSeguro | "todos">("todos");
  const [filterStatus, setFilterStatus] = useState<
    "todos" | "vigente" | "vencida"
  >("todos");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [apoliceToEdit, setApoliceToEdit] = useState<Apolice | null>(null);

  // API hooks
  const { data, isLoading, error } = useApolices({
    search: debouncedSearch,
    ramo: filterRamo !== "todos" ? filterRamo : undefined,
    status: filterStatus !== "todos" ? filterStatus : undefined,
  });
  const { data: stats } = useApolicesStats();
  const { data: clientesData } = useClientes();
  const createApolice = useCreateApolice();
  const updateApolice = useUpdateApolice();
  const deleteApolice = useDeleteApolice();

  // Calculate days until expiration
  const getDiasVencimento = (dataVencimento: string) => {
    return Math.ceil(
      (new Date(dataVencimento).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
  };

  // Get status badge
  const getStatusBadge = (dias: number) => {
    if (dias < 0) return { label: "Vencida", variant: "error" as const };
    if (dias <= 30)
      return { label: "Vence breve", variant: "warning" as const };
    return { label: "Vigente", variant: "success" as const };
  };

  // Filter apolices
  const filteredApolices = useMemo(() => {
    if (!data?.data) return [];
    return data.data;
  }, [data?.data]);

  // Handle form change
  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.cliente_id) errors.cliente_id = "Selecione um cliente";
    if (!formData.seguradora.trim())
      errors.seguradora = "Seguradora e obrigatoria";
    if (!formData.numero_apolice.trim())
      errors.numero_apolice = "Numero da apolice e obrigatorio";
    if (!formData.valor_premio || parseFloat(formData.valor_premio) <= 0) {
      errors.valor_premio = "Premio deve ser maior que zero";
    }
    if (!formData.data_inicio)
      errors.data_inicio = "Data de inicio e obrigatoria";
    if (!formData.data_vencimento)
      errors.data_vencimento = "Data de vencimento e obrigatoria";

    if (formData.data_inicio && formData.data_vencimento) {
      if (
        new Date(formData.data_vencimento) <= new Date(formData.data_inicio)
      ) {
        errors.data_vencimento = "Vencimento deve ser posterior ao inicio";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await createApolice.mutateAsync({
        cliente_id: formData.cliente_id,
        ramo: formData.ramo,
        seguradora: formData.seguradora,
        numero_apolice: formData.numero_apolice,
        valor_premio: parseFloat(formData.valor_premio),
        data_inicio: formData.data_inicio,
        data_vencimento: formData.data_vencimento,
        status: "vigente",
      });

      setModal(false);
      setFormData(initialFormData);
      setFormErrors({});
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao criar apolice";
      setFormErrors({ numero_apolice: errorMessage });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!apoliceToDelete) return;

    try {
      await deleteApolice.mutateAsync(apoliceToDelete.id);
      setDeleteModalOpen(false);
      setApoliceToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir apolice:", err);
    }
  };

  // Handle open edit modal
  const handleOpenEditModal = (apolice: Apolice) => {
    setApoliceToEdit(apolice);
    setFormData({
      cliente_id: apolice.cliente_id,
      ramo: apolice.ramo,
      seguradora: apolice.seguradora,
      numero_apolice: apolice.numero_apolice,
      valor_premio: String(apolice.valor_premio),
      data_inicio: apolice.data_inicio,
      data_vencimento: apolice.data_vencimento,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Handle update
  const handleUpdate = async () => {
    if (!validateForm() || !apoliceToEdit) return;

    try {
      await updateApolice.mutateAsync({
        id: apoliceToEdit.id,
        data: {
          cliente_id: formData.cliente_id,
          ramo: formData.ramo,
          seguradora: formData.seguradora,
          numero_apolice: formData.numero_apolice,
          valor_premio: parseFloat(formData.valor_premio),
          data_inicio: formData.data_inicio,
          data_vencimento: formData.data_vencimento,
        },
      });

      setIsEditModalOpen(false);
      setApoliceToEdit(null);
      setFormData(initialFormData);
      setFormErrors({});
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao atualizar apolice";
      setFormErrors({ numero_apolice: errorMessage });
    }
  };

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setApoliceToEdit(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  return (
    <PageLayout
      title="Apolices"
      subtitle={`${stats?.total || data?.total || 0} apolices cadastradas`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-100">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-lg font-bold text-slate-800">
                {stats?.total || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Vigentes</p>
              <p className="text-lg font-bold text-slate-800">
                {stats?.vigentes || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Vencem 30d</p>
              <p className="text-lg font-bold text-slate-800">
                {stats?.vencendo || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-100">
              <DollarSign className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Premio Total</p>
              <p className="text-lg font-bold text-slate-800">
                {formatCurrency(stats?.premioTotal || 0)}
              </p>
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1 flex-wrap">
            <div className="relative flex-1 max-w-md min-w-50">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por numero ou cliente..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setTimeout(() => setDebouncedSearch(e.target.value), 300);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {/* Filtro Ramo */}
            <select
              value={filterRamo}
              onChange={(e) =>
                setFilterRamo(e.target.value as RamoSeguro | "todos")
              }
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="todos">Todos os Ramos</option>
              {Object.entries(ramoConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            {/* Filtro Status */}
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value as "todos" | "vigente" | "vencida"
                )
              }
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="todos">Todos os Status</option>
              <option value="vigente">Vigente</option>
              <option value="vencida">Vencida</option>
            </select>
          </div>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setModal(true)}
          >
            Nova Apolice
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <Card padding="none" className="overflow-hidden">
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height={60} />
              ))}
            </div>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="text-center py-12">
            <p className="text-red-500">Erro ao carregar apolices</p>
          </Card>
        )}

        {/* Table */}
        {!isLoading && !error && filteredApolices.length > 0 && (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Apolice
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Cliente
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Ramo
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Premio
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApolices.map((apolice: Apolice) => {
                    const config =
                      ramoConfig[apolice.ramo] || ramoConfig.outros;
                    const Icon = config.icon;
                    const dias = getDiasVencimento(apolice.data_vencimento);
                    const statusBadge = getStatusBadge(dias);

                    return (
                      <tr
                        key={apolice.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/apolices/${apolice.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg bg-${config.color}-100`}
                            >
                              <Icon
                                className={`w-4 h-4 text-${config.color}-600`}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {apolice.numero_apolice}
                              </p>
                              <p className="text-xs text-slate-500">
                                {apolice.seguradora}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {apolice.cliente?.nome || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="info">{config.label}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">
                          {formatCurrency(apolice.valor_premio)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className="flex gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() =>
                                navigate(`/apolices/${apolice.id}`)
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(apolice)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setApoliceToDelete(apolice);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredApolices.length === 0 && (
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="Nenhuma apolice encontrada"
            description={
              search
                ? "Tente ajustar os filtros ou termo de busca"
                : "Comece adicionando sua primeira apolice"
            }
            action={{
              label: "Nova Apolice",
              onClick: () => setModal(true),
            }}
          />
        )}
      </motion.div>

      {/* Modal Nova Apolice */}
      <Modal
        isOpen={modal}
        onClose={() => {
          setModal(false);
          setFormData(initialFormData);
          setFormErrors({});
        }}
        title="Nova Apolice"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Cliente *
              </label>
              <select
                value={formData.cliente_id}
                onChange={(e) => handleFormChange("cliente_id", e.target.value)}
                className={`
                  w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-slate-800
                  focus:outline-none focus:ring-2 focus:ring-violet-500/20
                  ${
                    formErrors.cliente_id
                      ? "border-red-300"
                      : "border-slate-200"
                  }
                `}
              >
                <option value="">Selecione um cliente</option>
                {clientesData?.data?.map((cliente: Cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
              {formErrors.cliente_id && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.cliente_id}
                </p>
              )}
            </div>
            <Input
              label="Numero da Apolice *"
              value={formData.numero_apolice}
              onChange={(e) =>
                handleFormChange("numero_apolice", e.target.value)
              }
              error={formErrors.numero_apolice}
              placeholder="APL-2026-XXXXX"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Seguradora *"
              value={formData.seguradora}
              onChange={(e) => handleFormChange("seguradora", e.target.value)}
              error={formErrors.seguradora}
              placeholder="Porto Seguro, Bradesco, etc."
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Ramo *
              </label>
              <select
                value={formData.ramo}
                onChange={(e) => handleFormChange("ramo", e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                {Object.entries(ramoConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Data Inicio *"
              type="date"
              value={formData.data_inicio}
              onChange={(e) => handleFormChange("data_inicio", e.target.value)}
              error={formErrors.data_inicio}
            />
            <Input
              label="Vencimento *"
              type="date"
              value={formData.data_vencimento}
              onChange={(e) =>
                handleFormChange("data_vencimento", e.target.value)
              }
              error={formErrors.data_vencimento}
            />
            <Input
              label="Premio (R$) *"
              type="number"
              step="0.01"
              min="0"
              value={formData.valor_premio}
              onChange={(e) => handleFormChange("valor_premio", e.target.value)}
              error={formErrors.valor_premio}
              placeholder="2.450,00"
            />
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setModal(false);
              setFormData(initialFormData);
              setFormErrors({});
            }}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createApolice.isPending}>
            {createApolice.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Apolice"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Confirmar Exclusao */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setApoliceToDelete(null);
        }}
        title="Confirmar Exclusao"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-700 mb-2">
            Tem certeza que deseja excluir a apolice
          </p>
          <p className="font-semibold text-slate-800">
            {apoliceToDelete?.numero_apolice}?
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
              setApoliceToDelete(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteApolice.isPending}
          >
            {deleteApolice.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir Apolice"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Editar Apolice */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Editar Apolice"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Cliente *
              </label>
              <select
                value={formData.cliente_id}
                onChange={(e) => handleFormChange("cliente_id", e.target.value)}
                className={`
                  w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-slate-800
                  focus:outline-none focus:ring-2 focus:ring-violet-500/20
                  ${
                    formErrors.cliente_id
                      ? "border-red-300"
                      : "border-slate-200"
                  }
                `}
              >
                <option value="">Selecione um cliente</option>
                {clientesData?.data?.map((cliente: Cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
              {formErrors.cliente_id && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.cliente_id}
                </p>
              )}
            </div>
            <Input
              label="Numero da Apolice *"
              value={formData.numero_apolice}
              onChange={(e) =>
                handleFormChange("numero_apolice", e.target.value)
              }
              error={formErrors.numero_apolice}
              placeholder="APL-2026-XXXXX"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Seguradora *"
              value={formData.seguradora}
              onChange={(e) => handleFormChange("seguradora", e.target.value)}
              error={formErrors.seguradora}
              placeholder="Porto Seguro, Bradesco, etc."
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Ramo *
              </label>
              <select
                value={formData.ramo}
                onChange={(e) => handleFormChange("ramo", e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                {Object.entries(ramoConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Data Inicio *"
              type="date"
              value={formData.data_inicio}
              onChange={(e) => handleFormChange("data_inicio", e.target.value)}
              error={formErrors.data_inicio}
            />
            <Input
              label="Vencimento *"
              type="date"
              value={formData.data_vencimento}
              onChange={(e) =>
                handleFormChange("data_vencimento", e.target.value)
              }
              error={formErrors.data_vencimento}
            />
            <Input
              label="Premio (R$) *"
              type="number"
              step="0.01"
              min="0"
              value={formData.valor_premio}
              onChange={(e) => handleFormChange("valor_premio", e.target.value)}
              error={formErrors.valor_premio}
              placeholder="2.450,00"
            />
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={handleCloseEditModal}>
            Cancelar
          </Button>
          <Button onClick={handleUpdate} disabled={updateApolice.isPending}>
            {updateApolice.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Atualizar Apolice"
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
