import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Wallet,
  DollarSign,
  Loader2,
  Eye,
  Trash2,
  Home,
  Car,
  CreditCard,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
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
interface Financiamento {
  id: string;
  cliente_id: string;
  instituicao_financeira: string;
  numero_contrato: string;
  tipo_financiamento:
    | "imovel"
    | "veiculo"
    | "pessoal"
    | "consignado"
    | "outros";
  bem_financiado: string;
  valor_financiado: number;
  valor_parcela: number;
  taxa_juros: number;
  prazo_meses: number;
  parcelas_pagas: number;
  saldo_devedor: number;
  data_contratacao: string;
  data_vencimento_parcela: string;
  status: "ativo" | "quitado" | "atrasado" | "renegociado";
  clientes?: Cliente;
}

interface FormData {
  cliente_id: string;
  instituicao_financeira: string;
  numero_contrato: string;
  tipo_financiamento: string;
  bem_financiado: string;
  valor_financiado: string;
  valor_parcela: string;
  taxa_juros: string;
  prazo_meses: string;
  data_contratacao: string;
  data_primeiro_vencimento: string;
}

const initialFormData: FormData = {
  cliente_id: "",
  instituicao_financeira: "",
  numero_contrato: "",
  tipo_financiamento: "imovel",
  bem_financiado: "",
  valor_financiado: "",
  valor_parcela: "",
  taxa_juros: "",
  prazo_meses: "",
  data_contratacao: "",
  data_primeiro_vencimento: "",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value
  );

const tipoConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  imovel: { label: "Imobiliario", icon: Home, color: "emerald" },
  veiculo: { label: "Veiculo", icon: Car, color: "blue" },
  pessoal: { label: "Pessoal", icon: Wallet, color: "violet" },
  consignado: { label: "Consignado", icon: CreditCard, color: "amber" },
  outros: { label: "Outros", icon: DollarSign, color: "slate" },
};

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "error" | "info" }
> = {
  ativo: { label: "Ativo", variant: "info" },
  quitado: { label: "Quitado", variant: "success" },
  atrasado: { label: "Atrasado", variant: "error" },
  renegociado: { label: "Renegociado", variant: "warning" },
};

export default function Financiamentos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [financiamentoToDelete, setFinanciamentoToDelete] =
    useState<Financiamento | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof FormData, string>>
  >({});
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  // API hooks
  const { data, isLoading, error } = useQuery({
    queryKey: ["financiamentos", debouncedSearch, filterStatus, filterTipo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filterStatus !== "todos") params.append("status", filterStatus);
      if (filterTipo !== "todos") params.append("tipo", filterTipo);
      return api.get<{ data: Financiamento[]; total: number }>(
        `/financiamentos?${params.toString()}`
      );
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["financiamentos-stats"],
    queryFn: () =>
      api.get<{
        total: number;
        ativos: number;
        quitados: number;
        parcelasAtrasadas: number;
        saldoDevedorTotal: number;
      }>("/financiamentos/stats/summary"),
  });

  const { data: clientesData } = useClientes();

  const createFinanciamento = useMutation({
    mutationFn: (data: Omit<Financiamento, "id" | "clientes">) =>
      api.post("/financiamentos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financiamentos"] });
      queryClient.invalidateQueries({ queryKey: ["financiamentos-stats"] });
    },
  });

  const deleteFinanciamento = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/financiamentos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financiamentos"] });
      queryClient.invalidateQueries({ queryKey: ["financiamentos-stats"] });
    },
  });

  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.cliente_id) errors.cliente_id = "Selecione um cliente";
    if (!formData.instituicao_financeira.trim())
      errors.instituicao_financeira = "Instituicao e obrigatoria";
    if (!formData.numero_contrato.trim())
      errors.numero_contrato = "Numero do contrato e obrigatorio";
    if (
      !formData.valor_financiado ||
      parseFloat(formData.valor_financiado) <= 0
    ) {
      errors.valor_financiado = "Valor financiado deve ser maior que zero";
    }
    if (!formData.valor_parcela || parseFloat(formData.valor_parcela) <= 0) {
      errors.valor_parcela = "Valor da parcela deve ser maior que zero";
    }
    if (!formData.prazo_meses || parseInt(formData.prazo_meses) <= 0) {
      errors.prazo_meses = "Prazo deve ser maior que zero";
    }
    if (!formData.data_contratacao)
      errors.data_contratacao = "Data de contratacao e obrigatoria";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      await createFinanciamento.mutateAsync({
        cliente_id: formData.cliente_id,
        instituicao_financeira: formData.instituicao_financeira,
        numero_contrato: formData.numero_contrato,
        tipo_financiamento: formData.tipo_financiamento as
          | "imovel"
          | "veiculo"
          | "pessoal"
          | "consignado"
          | "outros",
        bem_financiado: formData.bem_financiado,
        valor_financiado: parseFloat(formData.valor_financiado),
        valor_parcela: parseFloat(formData.valor_parcela),
        taxa_juros: formData.taxa_juros ? parseFloat(formData.taxa_juros) : 0,
        prazo_meses: parseInt(formData.prazo_meses),
        data_contratacao: formData.data_contratacao,
        data_vencimento_parcela:
          formData.data_primeiro_vencimento || formData.data_contratacao,
        saldo_devedor: parseFloat(formData.valor_financiado),
        status: "ativo",
        parcelas_pagas: 0,
      });
      setModal(false);
      setFormData(initialFormData);
      setFormErrors({});
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao criar financiamento";
      setFormErrors({ instituicao_financeira: errorMessage });
    }
  };

  const handleDelete = async () => {
    if (!financiamentoToDelete) return;
    try {
      await deleteFinanciamento.mutateAsync(financiamentoToDelete.id);
      setDeleteModalOpen(false);
      setFinanciamentoToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir financiamento:", err);
    }
  };

  const filteredFinanciamentos = useMemo(() => {
    if (!data?.data) return [];
    return data.data;
  }, [data?.data]);

  return (
    <PageLayout
      title="Financiamentos"
      subtitle={`${
        stats?.total || data?.total || 0
      } financiamentos cadastrados`}
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
              <Wallet className="w-5 h-5 text-violet-600" />
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
              <TrendingDown className="w-5 h-5 text-blue-600" />
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
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Quitados</p>
              <p className="text-lg font-bold text-slate-800">
                {stats?.quitados || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Parcelas Atrasadas</p>
              <p className="text-lg font-bold text-slate-800">
                {stats?.parcelasAtrasadas || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Saldo Devedor</p>
              <p className="text-lg font-bold text-slate-800">
                {formatCurrency(stats?.saldoDevedorTotal || 0)}
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
                placeholder="Buscar por contrato, instituicao ou bem..."
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
              <option value="quitado">Quitado</option>
              <option value="atrasado">Atrasado</option>
              <option value="renegociado">Renegociado</option>
            </select>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="imovel">Imobiliario</option>
              <option value="veiculo">Veiculo</option>
              <option value="pessoal">Pessoal</option>
              <option value="consignado">Consignado</option>
            </select>
          </div>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setModal(true)}
          >
            Novo Financiamento
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
            <p className="text-red-500">Erro ao carregar financiamentos</p>
          </Card>
        )}

        {/* Table */}
        {!isLoading && !error && filteredFinanciamentos.length > 0 && (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Financiamento
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Cliente
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Tipo
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-4">
                      Valor
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
                  {filteredFinanciamentos.map((fin: Financiamento) => {
                    const tipo =
                      tipoConfig[fin.tipo_financiamento] || tipoConfig.outros;
                    const Icon = tipo.icon;
                    const status =
                      statusConfig[fin.status] || statusConfig.ativo;
                    const progresso = Math.round(
                      (fin.parcelas_pagas / fin.prazo_meses) * 100
                    );

                    return (
                      <tr
                        key={fin.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/financiamentos/${fin.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg bg-${tipo.color}-100`}
                            >
                              <Icon
                                className={`w-4 h-4 text-${tipo.color}-600`}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {fin.bem_financiado || fin.numero_contrato}
                              </p>
                              <p className="text-xs text-slate-500">
                                {fin.instituicao_financeira}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {fin.clientes?.nome || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="info">{tipo.label}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {formatCurrency(fin.valor_financiado)}
                            </p>
                            <p className="text-xs text-slate-500">
                              Parcela: {formatCurrency(fin.valor_parcela)}
                            </p>
                          </div>
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
                              {fin.parcelas_pagas}/{fin.prazo_meses}
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
                                navigate(`/financiamentos/${fin.id}`)
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setFinanciamentoToDelete(fin);
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
        {!isLoading && !error && filteredFinanciamentos.length === 0 && (
          <EmptyState
            icon={<Wallet className="w-8 h-8" />}
            title="Nenhum financiamento encontrado"
            description={
              search
                ? "Tente ajustar os filtros ou termo de busca"
                : "Comece adicionando seu primeiro financiamento"
            }
            action={{
              label: "Novo Financiamento",
              onClick: () => setModal(true),
            }}
          />
        )}
      </motion.div>

      {/* Modal Novo Financiamento */}
      <Modal
        isOpen={modal}
        onClose={() => {
          setModal(false);
          setFormData(initialFormData);
          setFormErrors({});
        }}
        title="Novo Financiamento"
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
              label="Instituicao Financeira *"
              value={formData.instituicao_financeira}
              onChange={(e) =>
                handleFormChange("instituicao_financeira", e.target.value)
              }
              error={formErrors.instituicao_financeira}
              placeholder="Caixa, Santander, Itau..."
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
                Tipo de Financiamento *
              </label>
              <select
                value={formData.tipo_financiamento}
                onChange={(e) =>
                  handleFormChange("tipo_financiamento", e.target.value)
                }
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="imovel">Imobiliario</option>
                <option value="veiculo">Veiculo</option>
                <option value="pessoal">Pessoal</option>
                <option value="consignado">Consignado</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          <Input
            label="Bem Financiado"
            value={formData.bem_financiado}
            onChange={(e) => handleFormChange("bem_financiado", e.target.value)}
            placeholder="Apartamento Rua X, Honda Civic 2024..."
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Valor Financiado (R$) *"
              type="number"
              step="0.01"
              min="0"
              value={formData.valor_financiado}
              onChange={(e) =>
                handleFormChange("valor_financiado", e.target.value)
              }
              error={formErrors.valor_financiado}
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
              label="Taxa de Juros (% a.m.)"
              type="number"
              step="0.01"
              min="0"
              value={formData.taxa_juros}
              onChange={(e) => handleFormChange("taxa_juros", e.target.value)}
              placeholder="0.99"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Prazo (meses) *"
              type="number"
              min="1"
              value={formData.prazo_meses}
              onChange={(e) => handleFormChange("prazo_meses", e.target.value)}
              error={formErrors.prazo_meses}
              placeholder="360"
            />
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
              label="Primeiro Vencimento"
              type="date"
              value={formData.data_primeiro_vencimento}
              onChange={(e) =>
                handleFormChange("data_primeiro_vencimento", e.target.value)
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
          <Button
            onClick={handleSubmit}
            disabled={createFinanciamento.isPending}
          >
            {createFinanciamento.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Financiamento"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Confirmar Exclusao */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setFinanciamentoToDelete(null);
        }}
        title="Confirmar Exclusao"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-700 mb-2">
            Tem certeza que deseja excluir o financiamento
          </p>
          <p className="font-semibold text-slate-800">
            {financiamentoToDelete?.bem_financiado ||
              financiamentoToDelete?.numero_contrato}
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
              setFinanciamentoToDelete(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteFinanciamento.isPending}
          >
            {deleteFinanciamento.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir Financiamento"
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
