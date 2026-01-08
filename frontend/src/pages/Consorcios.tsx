import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Building2,
  Calendar,
  DollarSign,
  Loader2,
  Eye,
  Trash2,
  Trophy,
  Clock,
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
import { useClientes } from "../hooks/useClientes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { Cliente } from "../types";

// Types
interface Consorcio {
  id: string;
  cliente_id: string;
  administradora: string;
  grupo: string;
  cota: string;
  numero_cota: string;
  valor_credito: number;
  valor_parcela: number;
  prazo_meses: number;
  parcelas_pagas: number;
  status: "ativo" | "contemplado" | "encerrado" | "cancelado";
  tipo_bem: "imovel" | "veiculo" | "servicos" | "outros";
  data_adesao: string;
  data_proxima_assembleia?: string;
  data_contemplacao?: string;
  clientes?: Cliente;
}

interface FormData {
  cliente_id: string;
  administradora: string;
  grupo: string;
  cota: string;
  numero_cota: string;
  valor_credito: string;
  valor_parcela: string;
  prazo_meses: string;
  tipo_bem: string;
  data_adesao: string;
  data_proxima_assembleia: string;
}

const initialFormData: FormData = {
  cliente_id: "",
  administradora: "",
  grupo: "",
  cota: "",
  numero_cota: "",
  valor_credito: "",
  valor_parcela: "",
  prazo_meses: "",
  tipo_bem: "imovel",
  data_adesao: "",
  data_proxima_assembleia: "",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value
  );

const tipoBemConfig: Record<string, { label: string; color: string }> = {
  imovel: { label: "Imovel", color: "emerald" },
  veiculo: { label: "Veiculo", color: "blue" },
  servicos: { label: "Servicos", color: "amber" },
  outros: { label: "Outros", color: "slate" },
};

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "error" | "info" }
> = {
  ativo: { label: "Ativo", variant: "info" },
  contemplado: { label: "Contemplado", variant: "success" },
  encerrado: { label: "Encerrado", variant: "warning" },
  cancelado: { label: "Cancelado", variant: "error" },
};

export default function Consorcios() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [consorcioToDelete, setConsorcioToDelete] = useState<Consorcio | null>(
    null
  );
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof FormData, string>>
  >({});
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  // API hooks
  const { data, isLoading, error } = useQuery({
    queryKey: ["consorcios", debouncedSearch, filterStatus, filterTipo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filterStatus !== "todos") params.append("status", filterStatus);
      if (filterTipo !== "todos") params.append("tipo_bem", filterTipo);
      return api.get<{ data: Consorcio[]; total: number }>(
        `/consorcios?${params.toString()}`
      );
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["consorcios-stats"],
    queryFn: () =>
      api.get<{
        total: number;
        ativos: number;
        contemplados: number;
        creditoTotal: number;
        proximasAssembleias: number;
      }>("/consorcios/stats/summary"),
  });

  const { data: clientesData } = useClientes();

  const createConsorcio = useMutation({
    mutationFn: (data: Omit<Consorcio, "id" | "clientes">) =>
      api.post("/consorcios", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consorcios"] });
      queryClient.invalidateQueries({ queryKey: ["consorcios-stats"] });
    },
  });

  const deleteConsorcio = useMutation({
    mutationFn: (id: string) => api.delete(`/consorcios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consorcios"] });
      queryClient.invalidateQueries({ queryKey: ["consorcios-stats"] });
    },
  });

  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.cliente_id) errors.cliente_id = "Selecione um cliente";
    if (!formData.administradora.trim())
      errors.administradora = "Administradora e obrigatoria";
    if (!formData.grupo.trim()) errors.grupo = "Grupo e obrigatorio";
    if (!formData.valor_credito || parseFloat(formData.valor_credito) <= 0) {
      errors.valor_credito = "Valor do credito deve ser maior que zero";
    }
    if (!formData.valor_parcela || parseFloat(formData.valor_parcela) <= 0) {
      errors.valor_parcela = "Valor da parcela deve ser maior que zero";
    }
    if (!formData.prazo_meses || parseInt(formData.prazo_meses) <= 0) {
      errors.prazo_meses = "Prazo deve ser maior que zero";
    }
    if (!formData.data_adesao)
      errors.data_adesao = "Data de adesao e obrigatoria";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      await createConsorcio.mutateAsync({
        cliente_id: formData.cliente_id,
        administradora: formData.administradora,
        grupo: formData.grupo,
        cota: formData.cota,
        numero_cota:
          formData.numero_cota || `${formData.grupo}-${formData.cota}`,
        valor_credito: parseFloat(formData.valor_credito),
        valor_parcela: parseFloat(formData.valor_parcela),
        prazo_meses: parseInt(formData.prazo_meses),
        tipo_bem: formData.tipo_bem as
          | "imovel"
          | "veiculo"
          | "servicos"
          | "outros",
        data_adesao: formData.data_adesao,
        data_proxima_assembleia: formData.data_proxima_assembleia || undefined,
        status: "ativo",
        parcelas_pagas: 0,
      });
      setModal(false);
      setFormData(initialFormData);
      setFormErrors({});
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao criar consorcio";
      setFormErrors({ administradora: errorMessage });
    }
  };

  const handleDelete = async () => {
    if (!consorcioToDelete) return;
    try {
      await deleteConsorcio.mutateAsync(consorcioToDelete.id);
      setDeleteModalOpen(false);
      setConsorcioToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir consorcio:", err);
    }
  };

  const filteredConsorcios = useMemo(() => {
    if (!data?.data) return [];
    return data.data;
  }, [data?.data]);

  return (
    <PageLayout
      title="Consorcios"
      subtitle={`${stats?.total || data?.total || 0} consorcios cadastrados`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-100">
              <Building2 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-lg font-bold text-slate-800">
                {stats?.total || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Ativos</p>
              <p className="text-lg font-bold text-slate-800">
                {stats?.ativos || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100">
              <Trophy className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Contemplados</p>
              <p className="text-lg font-bold text-slate-800">
                {stats?.contemplados || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Prox. Assembleias</p>
              <p className="text-lg font-bold text-slate-800">
                {stats?.proximasAssembleias || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-100">
              <DollarSign className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Credito Total</p>
              <p className="text-lg font-bold text-slate-800">
                {formatCurrency(stats?.creditoTotal || 0)}
              </p>
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1 flex-wrap">
            <div className="relative flex-1 max-w-md min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por grupo, cota ou administradora..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setTimeout(() => setDebouncedSearch(e.target.value), 300);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="todos">Todos os Status</option>
              <option value="ativo">Ativo</option>
              <option value="contemplado">Contemplado</option>
              <option value="encerrado">Encerrado</option>
            </select>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="imovel">Imovel</option>
              <option value="veiculo">Veiculo</option>
              <option value="servicos">Servicos</option>
            </select>
          </div>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setModal(true)}
          >
            Novo Consorcio
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
            <p className="text-red-500">Erro ao carregar consorcios</p>
          </Card>
        )}

        {/* Table */}
        {!isLoading && !error && filteredConsorcios.length > 0 && (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Consorcio
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Cliente
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Tipo
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Credito
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Progresso
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
                  {filteredConsorcios.map((consorcio: Consorcio) => {
                    const tipoConfig =
                      tipoBemConfig[consorcio.tipo_bem] || tipoBemConfig.outros;
                    const status =
                      statusConfig[consorcio.status] || statusConfig.ativo;
                    const progresso = Math.round(
                      (consorcio.parcelas_pagas / consorcio.prazo_meses) * 100
                    );

                    return (
                      <tr
                        key={consorcio.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/consorcios/${consorcio.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-violet-100">
                              <Building2 className="w-4 h-4 text-violet-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                Grupo {consorcio.grupo} - Cota {consorcio.cota}
                              </p>
                              <p className="text-xs text-slate-500">
                                {consorcio.administradora}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {consorcio.clientes?.nome || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="info">{tipoConfig.label}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">
                          {formatCurrency(consorcio.valor_credito)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-violet-500 rounded-full"
                                style={{ width: `${progresso}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {consorcio.parcelas_pagas}/{consorcio.prazo_meses}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className="flex gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() =>
                                navigate(`/consorcios/${consorcio.id}`)
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setConsorcioToDelete(consorcio);
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
        {!isLoading && !error && filteredConsorcios.length === 0 && (
          <EmptyState
            icon={<Building2 className="w-8 h-8" />}
            title="Nenhum consorcio encontrado"
            description={
              search
                ? "Tente ajustar os filtros ou termo de busca"
                : "Comece adicionando seu primeiro consorcio"
            }
            action={{ label: "Novo Consorcio", onClick: () => setModal(true) }}
          />
        )}
      </motion.div>

      {/* Modal Novo Consorcio */}
      <Modal
        isOpen={modal}
        onClose={() => {
          setModal(false);
          setFormData(initialFormData);
          setFormErrors({});
        }}
        title="Novo Consorcio"
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
                className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${
                  formErrors.cliente_id ? "border-red-300" : "border-slate-200"
                }`}
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
              label="Administradora *"
              value={formData.administradora}
              onChange={(e) =>
                handleFormChange("administradora", e.target.value)
              }
              error={formErrors.administradora}
              placeholder="Embracon, Porto, Bradesco..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Grupo *"
              value={formData.grupo}
              onChange={(e) => handleFormChange("grupo", e.target.value)}
              error={formErrors.grupo}
              placeholder="12345"
            />
            <Input
              label="Cota"
              value={formData.cota}
              onChange={(e) => handleFormChange("cota", e.target.value)}
              placeholder="001"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tipo de Bem *
              </label>
              <select
                value={formData.tipo_bem}
                onChange={(e) => handleFormChange("tipo_bem", e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="imovel">Imovel</option>
                <option value="veiculo">Veiculo</option>
                <option value="servicos">Servicos</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Valor do Credito (R$) *"
              type="number"
              step="0.01"
              min="0"
              value={formData.valor_credito}
              onChange={(e) =>
                handleFormChange("valor_credito", e.target.value)
              }
              error={formErrors.valor_credito}
              placeholder="150.000,00"
            />
            <Input
              label="Valor da Parcela (R$) *"
              type="number"
              step="0.01"
              min="0"
              value={formData.valor_parcela}
              onChange={(e) =>
                handleFormChange("valor_parcela", e.target.value)
              }
              error={formErrors.valor_parcela}
              placeholder="1.500,00"
            />
            <Input
              label="Prazo (meses) *"
              type="number"
              min="1"
              value={formData.prazo_meses}
              onChange={(e) => handleFormChange("prazo_meses", e.target.value)}
              error={formErrors.prazo_meses}
              placeholder="180"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data de Adesao *"
              type="date"
              value={formData.data_adesao}
              onChange={(e) => handleFormChange("data_adesao", e.target.value)}
              error={formErrors.data_adesao}
            />
            <Input
              label="Proxima Assembleia"
              type="date"
              value={formData.data_proxima_assembleia}
              onChange={(e) =>
                handleFormChange("data_proxima_assembleia", e.target.value)
              }
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
          <Button onClick={handleSubmit} disabled={createConsorcio.isPending}>
            {createConsorcio.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Consorcio"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Confirmar Exclusao */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setConsorcioToDelete(null);
        }}
        title="Confirmar Exclusao"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-700 mb-2">
            Tem certeza que deseja excluir o consorcio
          </p>
          <p className="font-semibold text-slate-800">
            Grupo {consorcioToDelete?.grupo} - Cota {consorcioToDelete?.cota}?
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
              setConsorcioToDelete(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteConsorcio.isPending}
          >
            {deleteConsorcio.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir Consorcio"
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
