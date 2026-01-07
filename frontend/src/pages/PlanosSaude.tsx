import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Stethoscope,
  Filter,
  Trash2,
  Users,
  Activity,
  Heart,
  FileText,
  Loader2,
  DollarSign,
  Clock,
  Eye,
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
interface PlanoSaude {
  id: string;
  cliente_id: string;
  operadora: string;
  numero_contrato: string;
  tipo_plano: "individual" | "familiar" | "empresarial" | "adesao";
  acomodacao: "enfermaria" | "apartamento";
  abrangencia: "municipal" | "estadual" | "nacional";
  valor_mensalidade: number;
  data_contratacao: string;
  data_vencimento: string;
  status: "ativo" | "suspenso" | "cancelado";
  coparticipacao: boolean;
  clientes?: Cliente;
}

interface FormData {
  cliente_id: string;
  operadora: string;
  numero_contrato: string;
  tipo_plano: string;
  acomodacao: string;
  abrangencia: string;
  valor_mensalidade: string;
  data_contratacao: string;
  data_vencimento: string;
  coparticipacao: boolean;
}

const initialFormData: FormData = {
  cliente_id: "",
  operadora: "",
  numero_contrato: "",
  tipo_plano: "individual",
  acomodacao: "apartamento",
  abrangencia: "nacional",
  valor_mensalidade: "",
  data_contratacao: "",
  data_vencimento: "",
  coparticipacao: false,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value
  );

const tipoPlanoConfig: Record<string, { label: string; color: string }> = {
  individual: { label: "Individual", color: "blue" },
  familiar: { label: "Familiar", color: "emerald" },
  empresarial: { label: "Empresarial", color: "violet" },
  adesao: { label: "Adesao", color: "amber" },
};

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "error" | "info" }
> = {
  ativo: { label: "Ativo", variant: "success" },
  suspenso: { label: "Suspenso", variant: "warning" },
  cancelado: { label: "Cancelado", variant: "error" },
};

export default function PlanosSaude() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [planoToDelete, setPlanoToDelete] = useState<PlanoSaude | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof FormData, string>>
  >({});
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  // API hooks
  const { data, isLoading, error } = useQuery({
    queryKey: ["planos-saude", debouncedSearch, filterStatus, filterTipo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filterStatus !== "todos") params.append("status", filterStatus);
      if (filterTipo !== "todos") params.append("tipo_plano", filterTipo);
      return api.get<{ data: PlanoSaude[]; total: number }>(
        `/planos-saude?${params.toString()}`
      );
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["planos-saude-stats"],
    queryFn: () =>
      api.get<{
        total: number;
        ativos: number;
        totalBeneficiarios: number;
        emCarencia: number;
        receitaMensal: number;
      }>("/planos-saude/stats/summary"),
  });

  const { data: clientesData } = useClientes();

  const createPlano = useMutation({
    mutationFn: (data: any) => api.post("/planos-saude", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planos-saude"] });
      queryClient.invalidateQueries({ queryKey: ["planos-saude-stats"] });
    },
  });

  const deletePlano = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/planos-saude/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planos-saude"] });
      queryClient.invalidateQueries({ queryKey: ["planos-saude-stats"] });
    },
  });

  const handleFormChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.cliente_id) errors.cliente_id = "Selecione um cliente";
    if (!formData.operadora.trim())
      errors.operadora = "Operadora e obrigatoria";
    if (!formData.numero_contrato.trim())
      errors.numero_contrato = "Numero do contrato e obrigatorio";
    if (
      !formData.valor_mensalidade ||
      parseFloat(formData.valor_mensalidade) <= 0
    ) {
      errors.valor_mensalidade = "Valor da mensalidade deve ser maior que zero";
    }
    if (!formData.data_contratacao)
      errors.data_contratacao = "Data de contratacao e obrigatoria";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      await createPlano.mutateAsync({
        cliente_id: formData.cliente_id,
        operadora: formData.operadora,
        numero_contrato: formData.numero_contrato,
        tipo_plano: formData.tipo_plano,
        acomodacao: formData.acomodacao,
        abrangencia: formData.abrangencia,
        valor_mensalidade: parseFloat(formData.valor_mensalidade),
        data_contratacao: formData.data_contratacao,
        data_vencimento: formData.data_vencimento || null,
        coparticipacao: formData.coparticipacao,
        status: "ativo",
      });
      setModal(false);
      setFormData(initialFormData);
      setFormErrors({});
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao criar plano";
      setFormErrors({ operadora: errorMessage });
    }
  };

  const handleDelete = async () => {
    if (!planoToDelete) return;
    try {
      await deletePlano.mutateAsync(planoToDelete.id);
      setDeleteModalOpen(false);
      setPlanoToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir plano:", err);
    }
  };

  const filteredPlanos = useMemo(() => {
    if (!data?.data) return [];
    return data.data;
  }, [data?.data]);

  return (
    <PageLayout
      title="Planos de Saude"
      subtitle={`${stats?.total || data?.total || 0} planos cadastrados`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
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
              <Heart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Ativos</p>
              <p className="text-lg font-bold text-slate-800">
                {stats?.ativos || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-100">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Beneficiarios</p>
              <p className="text-lg font-bold text-slate-800">
                {stats?.totalBeneficiarios || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Em Carencia</p>
              <p className="text-lg font-bold text-slate-800">
                {stats?.emCarencia || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-100">
              <DollarSign className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Receita Mensal</p>
              <p className="text-lg font-bold text-slate-800">
                {formatCurrency(stats?.receitaMensal || 0)}
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
                placeholder="Buscar por operadora ou contrato..."
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
              <option value="suspenso">Suspenso</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="individual">Individual</option>
              <option value="familiar">Familiar</option>
              <option value="empresarial">Empresarial</option>
              <option value="adesao">Adesao</option>
            </select>
          </div>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setModal(true)}
          >
            Novo Plano
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
            <p className="text-red-500">Erro ao carregar planos de saude</p>
          </Card>
        )}

        {/* Table */}
        {!isLoading && !error && filteredPlanos.length > 0 && (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Plano
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Cliente
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Tipo
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Mensalidade
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Acomodacao
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
                  {filteredPlanos.map((plano: PlanoSaude) => {
                    const tipoConfig =
                      tipoPlanoConfig[plano.tipo_plano] ||
                      tipoPlanoConfig.individual;
                    const status =
                      statusConfig[plano.status] || statusConfig.ativo;

                    return (
                      <tr
                        key={plano.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/planos-saude/${plano.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-100">
                              <Stethoscope className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {plano.operadora}
                              </p>
                              <p className="text-xs text-slate-500">
                                {plano.numero_contrato}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {plano.clientes?.nome || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="info">{tipoConfig.label}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">
                          {formatCurrency(plano.valor_mensalidade)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                          {plano.acomodacao}
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
                                navigate(`/planos-saude/${plano.id}`)
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setPlanoToDelete(plano);
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
        {!isLoading && !error && filteredPlanos.length === 0 && (
          <EmptyState
            icon={<Stethoscope className="w-8 h-8" />}
            title="Nenhum plano de saude encontrado"
            description={
              search
                ? "Tente ajustar os filtros ou termo de busca"
                : "Comece adicionando seu primeiro plano"
            }
            action={{ label: "Novo Plano", onClick: () => setModal(true) }}
          />
        )}
      </motion.div>

      {/* Modal Novo Plano */}
      <Modal
        isOpen={modal}
        onClose={() => {
          setModal(false);
          setFormData(initialFormData);
          setFormErrors({});
        }}
        title="Novo Plano de Saude"
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
              label="Operadora *"
              value={formData.operadora}
              onChange={(e) => handleFormChange("operadora", e.target.value)}
              error={formErrors.operadora}
              placeholder="Unimed, Bradesco Saude, Amil..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Numero do Contrato *"
              value={formData.numero_contrato}
              onChange={(e) =>
                handleFormChange("numero_contrato", e.target.value)
              }
              error={formErrors.numero_contrato}
              placeholder="123456789"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tipo de Plano *
              </label>
              <select
                value={formData.tipo_plano}
                onChange={(e) => handleFormChange("tipo_plano", e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="individual">Individual</option>
                <option value="familiar">Familiar</option>
                <option value="empresarial">Empresarial</option>
                <option value="adesao">Adesao</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Acomodacao
              </label>
              <select
                value={formData.acomodacao}
                onChange={(e) => handleFormChange("acomodacao", e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="apartamento">Apartamento</option>
                <option value="enfermaria">Enfermaria</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Abrangencia
              </label>
              <select
                value={formData.abrangencia}
                onChange={(e) =>
                  handleFormChange("abrangencia", e.target.value)
                }
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="nacional">Nacional</option>
                <option value="estadual">Estadual</option>
                <option value="municipal">Municipal</option>
              </select>
            </div>
            <Input
              label="Mensalidade (R$) *"
              type="number"
              step="0.01"
              min="0"
              value={formData.valor_mensalidade}
              onChange={(e) =>
                handleFormChange("valor_mensalidade", e.target.value)
              }
              error={formErrors.valor_mensalidade}
              placeholder="850,00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data de Contratacao *"
              type="date"
              value={formData.data_contratacao}
              onChange={(e) =>
                handleFormChange("data_contratacao", e.target.value)
              }
              error={formErrors.data_contratacao}
            />
            <Input
              label="Vencimento (renovacao)"
              type="date"
              value={formData.data_vencimento}
              onChange={(e) =>
                handleFormChange("data_vencimento", e.target.value)
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="coparticipacao"
              checked={formData.coparticipacao}
              onChange={(e) =>
                handleFormChange("coparticipacao", e.target.checked)
              }
              className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
            />
            <label htmlFor="coparticipacao" className="text-sm text-slate-700">
              Plano com coparticipacao
            </label>
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
          <Button onClick={handleSubmit} disabled={createPlano.isPending}>
            {createPlano.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Plano"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Confirmar Exclusao */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPlanoToDelete(null);
        }}
        title="Confirmar Exclusao"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-700 mb-2">
            Tem certeza que deseja excluir o plano
          </p>
          <p className="font-semibold text-slate-800">
            {planoToDelete?.operadora}?
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
              setPlanoToDelete(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deletePlano.isPending}
          >
            {deletePlano.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir Plano"
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
