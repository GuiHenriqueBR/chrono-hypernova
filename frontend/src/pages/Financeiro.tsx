import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Plus,
  CheckCircle,
  Clock,
  Loader2,
  Trash2,
  PieChart,
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  Target,
  ChevronRight,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import {
  Card,
  Button,
  Modal,
  ModalFooter,
  Input,
  Skeleton,
  EmptyState,
  LineChart,
  BarChart,
  DonutChart,
} from "../components/common";
import {
  useFinanceiroStats,
  useComissoes,
  useCreateComissao,
  useDeleteComissao,
  useMarcarComissaoRecebida,
  useFinanceiroCharts,
  useExportarComissoes,
  useProjecaoFluxoCaixa,
  PeriodoFiltro,
} from "../hooks/useFinanceiro";
import { useApolices } from "../hooks/useApolices";
import { Comissao, Apolice, StatusComissao } from "../types";

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

interface FormData {
  apolice_id: string;
  valor_bruto: string;
  valor_liquido: string;
  data_receita: string;
  status: "pendente" | "recebida";
}

const initialFormData: FormData = {
  apolice_id: "",
  valor_bruto: "",
  valor_liquido: "",
  data_receita: "",
  status: "pendente",
};

const periodos: { value: PeriodoFiltro; label: string }[] = [
  { value: "mes", label: "Este Mes" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ano", label: "Este Ano" },
  { value: "todos", label: "12 Meses" },
];

export default function Financeiro() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>("ano");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [comissaoToDelete, setComissaoToDelete] = useState<Comissao | null>(
    null
  );
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof FormData, string>>
  >({});
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "lista" | "projecao"
  >("dashboard");
  const [projecaoMeses, setProjecaoMeses] = useState(6);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // API hooks
  const { data: stats, isLoading: statsLoading } = useFinanceiroStats();
  const { data: charts, isLoading: chartsLoading } =
    useFinanceiroCharts(periodoFiltro);
  const { data: projecaoData, isLoading: projecaoLoading } =
    useProjecaoFluxoCaixa(projecaoMeses);

  // Calcular datas do filtro
  const { inicio, fim } = useMemo(() => {
    const now = new Date();
    if (periodoFiltro === "mes") {
      return {
        inicio: format(startOfMonth(now), "yyyy-MM-dd"),
        fim: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    }
    if (periodoFiltro === "trimestre") {
      return {
        inicio: format(startOfQuarter(now), "yyyy-MM-dd"),
        fim: format(endOfQuarter(now), "yyyy-MM-dd"),
      };
    }
    if (periodoFiltro === "ano") {
      return {
        inicio: format(startOfYear(now), "yyyy-MM-dd"),
        fim: format(endOfYear(now), "yyyy-MM-dd"),
      };
    }
    // "todos"
    return { inicio: undefined, fim: undefined };
  }, [periodoFiltro]);

  const filters = useMemo(() => {
    const f: any = {};
    if (filterStatus !== "todos") f.status = filterStatus;
    if (inicio) f.inicio = inicio;
    if (fim) f.fim = fim;
    return f;
  }, [filterStatus, inicio, fim]);

  const { data: comissoesData, isLoading, error } = useComissoes(filters);
  const { data: apolicesData } = useApolices();
  const createComissao = useCreateComissao();
  const deleteComissao = useDeleteComissao();
  const marcarRecebida = useMarcarComissaoRecebida();
  const exportarComissoes = useExportarComissoes();

  // Filter comissoes by search
  const comissoesList = useMemo(
    () => comissoesData?.data || [],
    [comissoesData?.data]
  );
  const filtered = useMemo(() => {
    if (!comissoesList.length) return [];
    if (!search) return comissoesList;

    const searchLower = search.toLowerCase();
    return comissoesList.filter(
      (c: Comissao) =>
        c.apolice?.numero_apolice?.toLowerCase().includes(searchLower) ||
        c.apolice?.cliente?.nome?.toLowerCase().includes(searchLower)
    );
  }, [comissoesList, search]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v);

  const formatCurrencyShort = (v: number) => {
    if (v >= 1000000) {
      return `R$ ${(v / 1000000).toFixed(1)}M`;
    }
    if (v >= 1000) {
      return `R$ ${(v / 1000).toFixed(1)}K`;
    }
    return formatCurrency(v);
  };

  // Handle form change
  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));

    // Auto-calcular valor liquido (85% do bruto por padrao)
    if (field === "valor_bruto") {
      const bruto =
        parseFloat(value.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
      const liquido = bruto * 0.85;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        valor_liquido: liquido.toFixed(2),
      }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.apolice_id) {
      errors.apolice_id = "Selecione uma apolice";
    }
    if (!formData.valor_bruto || parseFloat(formData.valor_bruto) <= 0) {
      errors.valor_bruto = "Valor bruto e obrigatorio";
    }
    if (!formData.valor_liquido || parseFloat(formData.valor_liquido) <= 0) {
      errors.valor_liquido = "Valor liquido e obrigatorio";
    }
    if (!formData.data_receita) {
      errors.data_receita = "Data e obrigatoria";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await createComissao.mutateAsync({
        apolice_id: formData.apolice_id,
        valor_bruto: parseFloat(formData.valor_bruto),
        valor_liquido: parseFloat(formData.valor_liquido),
        data_receita: formData.data_receita,
        status: formData.status,
      });

      setIsModalOpen(false);
      setFormData(initialFormData);
      setFormErrors({});
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao criar comissao";
      setFormErrors({ apolice_id: errorMessage });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!comissaoToDelete) return;

    try {
      await deleteComissao.mutateAsync(comissaoToDelete.id);
      setDeleteModalOpen(false);
      setComissaoToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir comissao:", err);
    }
  };

  // Handle marcar como recebida
  const handleMarcarRecebida = async (id: string) => {
    try {
      await marcarRecebida.mutateAsync(id);
    } catch (err) {
      console.error("Erro ao marcar comissao como recebida:", err);
    }
  };

  // Apolices options for select
  const apolicesOptions = apolicesData?.data || [];

  // Prepare chart data
  const lineChartData = useMemo(() => {
    return (
      charts?.comissoesMensais?.map((item) => ({
        label: item.label,
        value: item.total,
      })) || []
    );
  }, [charts]);

  const barChartData = useMemo(() => {
    return (
      charts?.comissoesMensais?.map((item) => ({
        label: item.label,
        value: item.recebido,
        color: "#10b981",
      })) || []
    );
  }, [charts]);

  return (
    <PageLayout title="Financeiro" subtitle="Controle de comissoes e receitas">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Tabs + Period Filter */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div className="flex bg-white rounded-xl p-1 border border-slate-200">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-violet-500 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </span>
            </button>
            <button
              onClick={() => setActiveTab("lista")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "lista"
                  ? "bg-violet-500 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Lista de Comissoes
              </span>
            </button>
            <button
              onClick={() => setActiveTab("projecao")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "projecao"
                  ? "bg-violet-500 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Projecao
              </span>
            </button>
          </div>

          <div className="flex gap-3">
            {/* Period Filter */}
            <div className="flex bg-white rounded-xl p-1 border border-slate-200">
              {periodos.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriodoFiltro(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    periodoFiltro === p.value
                      ? "bg-slate-800 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              leftIcon={
                exportarComissoes.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )
              }
              onClick={() => exportarComissoes.mutate(periodoFiltro)}
              disabled={exportarComissoes.isPending}
            >
              {exportarComissoes.isPending ? "Exportando..." : "Exportar CSV"}
            </Button>

            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              Nova Comissao
            </Button>
          </div>
        </motion.div>

        {/* Dashboard View */}
        {activeTab === "dashboard" && (
          <>
            {/* Stats Cards */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              <Card className="relative overflow-hidden bg-linear-to-br from-emerald-50 to-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Receita do Periodo</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                      {chartsLoading
                        ? "-"
                        : formatCurrency(charts?.totais?.recebido || 0)}
                    </p>
                    <div
                      className={`flex items-center gap-1 mt-2 text-sm ${
                        (charts?.totais?.variacaoPercentual || 0) >= 0
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {(charts?.totais?.variacaoPercentual || 0) >= 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span>
                        {charts?.totais?.variacaoPercentual || 0}% vs anterior
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-200">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <div className="absolute -right-5 -bottom-5 w-24 h-24 rounded-full blur-3xl opacity-20 bg-emerald-500" />
              </Card>

              <Card className="relative overflow-hidden bg-linear-to-br from-amber-50 to-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Pendentes</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                      {chartsLoading
                        ? "-"
                        : formatCurrency(charts?.totais?.pendente || 0)}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      {statsLoading
                        ? "-"
                        : `${stats?.comissoesPendentes || 0} comissoes`}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-100 border border-amber-200">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <div className="absolute -right-5 -bottom-5 w-24 h-24 rounded-full blur-3xl opacity-20 bg-amber-500" />
              </Card>

              <Card className="relative overflow-hidden bg-linear-to-br from-violet-50 to-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Valor Bruto</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                      {chartsLoading
                        ? "-"
                        : formatCurrency(charts?.totais?.bruto || 0)}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">Total gerado</p>
                  </div>
                  <div className="p-3 rounded-xl bg-violet-100 border border-violet-200">
                    <DollarSign className="w-6 h-6 text-violet-600" />
                  </div>
                </div>
                <div className="absolute -right-5 -bottom-5 w-24 h-24 rounded-full blur-3xl opacity-20 bg-violet-500" />
              </Card>

              <Card className="relative overflow-hidden bg-linear-to-br from-cyan-50 to-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Periodo Anterior</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                      {chartsLoading
                        ? "-"
                        : formatCurrency(charts?.totais?.periodoAnterior || 0)}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">Comparativo</p>
                  </div>
                  <div className="p-3 rounded-xl bg-cyan-100 border border-cyan-200">
                    <Calendar className="w-6 h-6 text-cyan-600" />
                  </div>
                </div>
                <div className="absolute -right-5 -bottom-5 w-24 h-24 rounded-full blur-3xl opacity-20 bg-cyan-500" />
              </Card>
            </motion.div>

            {/* Charts Row */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Line Chart - Evolucao Mensal */}
              <Card className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-slate-800">
                      Evolucao de Comissoes
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Recebido
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-violet-500" />
                      Total
                    </span>
                  </div>
                </div>
                {chartsLoading ? (
                  <Skeleton height={200} />
                ) : (
                  <LineChart
                    data={lineChartData}
                    height={200}
                    color="#8b5cf6"
                    showArea
                  />
                )}
              </Card>

              {/* Donut Chart - Por Seguradora */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="w-5 h-5 text-violet-600" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    Por Seguradora
                  </h3>
                </div>
                {chartsLoading ? (
                  <div className="flex items-center justify-center h-50">
                    <Skeleton height={160} width={160} />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center">
                      <DonutChart
                        data={
                          charts?.comissoesPorSeguradora &&
                          charts.comissoesPorSeguradora.length > 0
                            ? charts.comissoesPorSeguradora
                            : [
                                {
                                  label: "Sem dados",
                                  value: 1,
                                  color: "#e2e8f0",
                                },
                              ]
                        }
                        size={160}
                        centerValue={formatCurrencyShort(
                          charts?.totais?.recebido || 0
                        )}
                        centerLabel="Total"
                      />
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-4">
                      {(charts?.comissoesPorSeguradora || [])
                        .slice(0, 4)
                        .map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center gap-1.5"
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-xs text-slate-500">
                              {item.label}
                            </span>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </Card>
            </motion.div>

            {/* Second Charts Row */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Bar Chart - Comissoes Recebidas por Mes */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    Comissoes Recebidas por Mes
                  </h3>
                </div>
                {chartsLoading ? (
                  <Skeleton height={180} />
                ) : (
                  <BarChart data={barChartData} height={180} showValues />
                )}
              </Card>

              {/* Donut Chart - Por Ramo */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="w-5 h-5 text-cyan-600" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    Comissoes por Ramo
                  </h3>
                </div>
                {chartsLoading ? (
                  <div className="flex items-center justify-center h-45">
                    <Skeleton height={140} width={140} />
                  </div>
                ) : (
                  <div className="flex items-center gap-6">
                    <DonutChart
                      data={
                        charts?.comissoesPorRamo &&
                        charts.comissoesPorRamo.length > 0
                          ? charts.comissoesPorRamo
                          : [{ label: "Sem dados", value: 1, color: "#e2e8f0" }]
                      }
                      size={140}
                    />
                    <div className="flex-1 space-y-2">
                      {(charts?.comissoesPorRamo || [])
                        .slice(0, 5)
                        .map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-xs text-slate-600">
                                {item.label}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-slate-800">
                              {formatCurrencyShort(item.value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </>
        )}

        {/* Lista View */}
        {activeTab === "lista" && (
          <>
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
                    placeholder="Buscar por apolice ou cliente..."
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
                  <option value="pendente">Pendente</option>
                  <option value="recebida">Recebida</option>
                  <option value="paga">Paga</option>
                </select>
              </div>
            </motion.div>

            {/* Loading */}
            {isLoading && <Skeleton height={300} />}

            {/* Error */}
            {error && (
              <Card className="text-center py-12">
                <p className="text-red-500">Erro ao carregar comissoes</p>
              </Card>
            )}

            {/* Comissoes Table */}
            {!isLoading && !error && (
              <motion.div variants={itemVariants}>
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Comissoes Recentes
                    </h3>
                    <span className="text-sm text-slate-500">
                      {filtered.length}{" "}
                      {filtered.length === 1 ? "registro" : "registros"}
                    </span>
                  </div>

                  {filtered.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50">
                            <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                              Apolice
                            </th>
                            <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                              Cliente
                            </th>
                            <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                              Data
                            </th>
                            <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3">
                              Bruto
                            </th>
                            <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3">
                              Liquido
                            </th>
                            <th className="text-center text-xs font-medium text-slate-500 uppercase px-4 py-3">
                              Status
                            </th>
                            <th className="text-center text-xs font-medium text-slate-500 uppercase px-4 py-3">
                              Acoes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.map((c: Comissao) => (
                            <tr
                              key={c.id}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                                {c.apolice?.numero_apolice || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500">
                                {c.apolice?.cliente?.nome || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500">
                                {c.data_receita
                                  ? new Date(c.data_receita).toLocaleDateString(
                                      "pt-BR"
                                    )
                                  : "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500 text-right">
                                {formatCurrency(c.valor_bruto || 0)}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-slate-800 text-right">
                                {formatCurrency(c.valor_liquido || 0)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1 ${
                                    c.status === "recebida" ||
                                    c.status === "paga"
                                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                      : "bg-amber-100 text-amber-700 border border-amber-200"
                                  }`}
                                >
                                  {c.status === "recebida" ||
                                  c.status === "paga" ? (
                                    <CheckCircle className="w-3 h-3" />
                                  ) : (
                                    <Clock className="w-3 h-3" />
                                  )}
                                  {c.status === "recebida"
                                    ? "Recebida"
                                    : c.status === "paga"
                                      ? "Paga"
                                      : "Pendente"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  {c.status === "pendente" && (
                                    <button
                                      onClick={() => handleMarcarRecebida(c.id)}
                                      disabled={marcarRecebida.isPending}
                                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                                      title="Marcar como recebida"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setComissaoToDelete(c);
                                      setDeleteModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      icon={<DollarSign className="w-8 h-8" />}
                      title="Nenhuma comissao encontrada"
                      description={
                        search || filterStatus !== "todos"
                          ? "Tente ajustar os filtros"
                          : "Comece registrando sua primeira comissao"
                      }
                      action={{
                        label: "Nova Comissao",
                        onClick: () => setIsModalOpen(true),
                      }}
                    />
                  )}
                </Card>
              </motion.div>
            )}
          </>
        )}

        {/* Projecao View */}
        {activeTab === "projecao" && (
          <>
            {/* Periodo Selector */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Projecao de Fluxo de Caixa
                </h3>
                <p className="text-sm text-slate-500">
                  Receita esperada com base em renovacoes e comissoes pendentes
                </p>
              </div>
              <div className="flex gap-2">
                {[3, 6, 12].map((m) => (
                  <button
                    key={m}
                    onClick={() => setProjecaoMeses(m)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      projecaoMeses === m
                        ? "bg-violet-500 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {m} meses
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Stats Cards */}
            {projecaoLoading ? (
              <Skeleton height={100} />
            ) : (
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-1 md:grid-cols-4 gap-4"
              >
                <Card className="relative overflow-hidden bg-linear-to-br from-violet-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Total Projetado</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">
                        {formatCurrency(
                          projecaoData?.totais?.totalProjetado || 0
                        )}
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        Proximos {projecaoMeses} meses
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-violet-100 border border-violet-200">
                      <Target className="w-6 h-6 text-violet-600" />
                    </div>
                  </div>
                </Card>

                <Card className="relative overflow-hidden bg-linear-to-br from-emerald-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Renovacoes</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">
                        {formatCurrency(
                          projecaoData?.totais?.comissaoEsperadaRenovacoes || 0
                        )}
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        {projecaoData?.totais?.renovacoes || 0} apolices
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-200">
                      <RefreshCw className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </Card>

                <Card className="relative overflow-hidden bg-linear-to-br from-amber-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Pendentes</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">
                        {formatCurrency(
                          projecaoData?.totais?.comissoesPendentes || 0
                        )}
                      </p>
                      <p className="text-sm text-slate-500 mt-2">A receber</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-100 border border-amber-200">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </Card>

                <Card className="relative overflow-hidden bg-linear-to-br from-cyan-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Media Mensal</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">
                        {formatCurrency(
                          projecaoData?.totais?.mediaRealizadoMensal || 0
                        )}
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        Historico realizado
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-cyan-100 border border-cyan-200">
                      <BarChart3 className="w-6 h-6 text-cyan-600" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Projecao Chart */}
            {projecaoLoading ? (
              <Skeleton height={300} />
            ) : (
              <motion.div variants={itemVariants}>
                <Card>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-violet-600" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        Projecao Mensal
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        Renovacoes
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        Pendentes
                      </span>
                    </div>
                  </div>

                  {/* Custom Bar Chart */}
                  <div className="space-y-4">
                    {projecaoData?.projecao?.map((mes) => {
                      const maxValue = Math.max(
                        ...projecaoData.projecao.map((m) => m.totalProjetado)
                      );
                      const renovacaoWidth =
                        maxValue > 0
                          ? (mes.comissaoEsperada / maxValue) * 100
                          : 0;
                      const pendenteWidth =
                        maxValue > 0
                          ? (mes.comissoesPendentes / maxValue) * 100
                          : 0;
                      const isExpanded = expandedMonth === mes.mes;

                      return (
                        <div key={mes.mes}>
                          <div
                            className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors"
                            onClick={() =>
                              setExpandedMonth(isExpanded ? null : mes.mes)
                            }
                          >
                            <div className="w-16 text-sm font-medium text-slate-600 shrink-0">
                              {mes.label}
                            </div>
                            <div className="flex-1 flex gap-1 h-8 items-center">
                              {mes.comissaoEsperada > 0 && (
                                <div
                                  className="h-6 bg-emerald-500 rounded-l-lg transition-all duration-300"
                                  style={{
                                    width: `${renovacaoWidth}%`,
                                    minWidth:
                                      mes.comissaoEsperada > 0 ? "4px" : 0,
                                  }}
                                  title={`Renovacoes: ${formatCurrency(mes.comissaoEsperada)}`}
                                />
                              )}
                              {mes.comissoesPendentes > 0 && (
                                <div
                                  className="h-6 bg-amber-500 rounded-r-lg transition-all duration-300"
                                  style={{
                                    width: `${pendenteWidth}%`,
                                    minWidth:
                                      mes.comissoesPendentes > 0 ? "4px" : 0,
                                  }}
                                  title={`Pendentes: ${formatCurrency(mes.comissoesPendentes)}`}
                                />
                              )}
                              {mes.totalProjetado === 0 && (
                                <div className="h-6 bg-slate-100 rounded-lg w-full flex items-center justify-center text-xs text-slate-400">
                                  Sem projecao
                                </div>
                              )}
                            </div>
                            <div className="w-28 text-right">
                              <span className="text-sm font-semibold text-slate-800">
                                {formatCurrency(mes.totalProjetado)}
                              </span>
                            </div>
                            <ChevronRight
                              className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && mes.detalhes.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="ml-20 mt-2 mb-4 space-y-2"
                            >
                              {mes.detalhes.slice(0, 5).map((detalhe, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    {detalhe.tipo === "renovacao" ? (
                                      <RefreshCw className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Clock className="w-3 h-3 text-amber-600" />
                                    )}
                                    <span className="text-slate-600 truncate max-w-75">
                                      {detalhe.descricao}
                                    </span>
                                  </div>
                                  <span className="font-medium text-slate-800">
                                    {formatCurrency(detalhe.valor)}
                                  </span>
                                </div>
                              ))}
                              {mes.detalhes.length > 5 && (
                                <p className="text-xs text-slate-500 text-center py-1">
                                  + {mes.detalhes.length - 5} itens
                                </p>
                              )}
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Renovacoes Pendentes Table */}
            {projecaoLoading ? (
              <Skeleton height={200} />
            ) : (
              <motion.div variants={itemVariants}>
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Proximas Renovacoes
                    </h3>
                    <span className="text-xs text-slate-500">
                      {projecaoData?.totais?.renovacoes || 0} apolices a vencer
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-3 py-2">
                            Mes
                          </th>
                          <th className="text-center text-xs font-medium text-slate-500 uppercase px-3 py-2">
                            Renovacoes
                          </th>
                          <th className="text-right text-xs font-medium text-slate-500 uppercase px-3 py-2">
                            Premio Total
                          </th>
                          <th className="text-right text-xs font-medium text-slate-500 uppercase px-3 py-2">
                            Comissao Estimada
                          </th>
                          <th className="text-right text-xs font-medium text-slate-500 uppercase px-3 py-2">
                            Pendentes
                          </th>
                          <th className="text-right text-xs font-medium text-slate-500 uppercase px-3 py-2">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {projecaoData?.projecao?.map((mes) => (
                          <tr key={mes.mes} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-sm font-medium text-slate-800">
                              {mes.label}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-600 text-center">
                              {mes.renovacoes}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-600 text-right">
                              {formatCurrency(mes.renovacoesValor)}
                            </td>
                            <td className="px-3 py-2 text-sm text-emerald-600 text-right font-medium">
                              {formatCurrency(mes.comissaoEsperada)}
                            </td>
                            <td className="px-3 py-2 text-sm text-amber-600 text-right font-medium">
                              {formatCurrency(mes.comissoesPendentes)}
                            </td>
                            <td className="px-3 py-2 text-sm text-violet-600 text-right font-bold">
                              {formatCurrency(mes.totalProjetado)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                          <td className="px-3 py-2 text-sm font-bold text-slate-800">
                            TOTAL
                          </td>
                          <td className="px-3 py-2 text-sm font-bold text-slate-800 text-center">
                            {projecaoData?.totais?.renovacoes || 0}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-600 text-right">
                            -
                          </td>
                          <td className="px-3 py-2 text-sm text-emerald-600 text-right font-bold">
                            {formatCurrency(
                              projecaoData?.totais
                                ?.comissaoEsperadaRenovacoes || 0
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm text-amber-600 text-right font-bold">
                            {formatCurrency(
                              projecaoData?.totais?.comissoesPendentes || 0
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm text-violet-600 text-right font-bold">
                            {formatCurrency(
                              projecaoData?.totais?.totalProjetado || 0
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </motion.div>

      {/* Modal Nova Comissao */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormData(initialFormData);
          setFormErrors({});
        }}
        title="Nova Comissao"
        size="md"
      >
        <div className="space-y-4">
          {/* Apolice Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Apolice *
            </label>
            <select
              value={formData.apolice_id}
              onChange={(e) => handleFormChange("apolice_id", e.target.value)}
              className={`
                w-full px-4 py-2.5 bg-white border rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                ${formErrors.apolice_id ? "border-red-300" : "border-slate-200"}
              `}
            >
              <option value="">Selecione uma apolice</option>
              {apolicesOptions.map((apolice: Apolice) => (
                <option key={apolice.id} value={apolice.id}>
                  {apolice.numero_apolice} - {apolice.cliente?.nome || "N/A"}
                </option>
              ))}
            </select>
            {formErrors.apolice_id && (
              <p className="text-xs text-red-500 mt-1">
                {formErrors.apolice_id}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor Bruto *"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.valor_bruto}
              onChange={(e) => handleFormChange("valor_bruto", e.target.value)}
              error={formErrors.valor_bruto}
            />
            <Input
              label="Valor Liquido *"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.valor_liquido}
              onChange={(e) =>
                handleFormChange("valor_liquido", e.target.value)
              }
              error={formErrors.valor_liquido}
            />
          </div>

          <Input
            label="Data de Receita *"
            type="date"
            value={formData.data_receita}
            onChange={(e) => handleFormChange("data_receita", e.target.value)}
            error={formErrors.data_receita}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Status
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, status: "pendente" }))
                }
                className={`
                  flex-1 p-3 rounded-xl border transition-all flex items-center justify-center gap-2
                  ${
                    formData.status === "pendente"
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }
                `}
              >
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Pendente</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, status: "recebida" }))
                }
                className={`
                  flex-1 p-3 rounded-xl border transition-all flex items-center justify-center gap-2
                  ${
                    formData.status === "recebida"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }
                `}
              >
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Recebida</span>
              </button>
            </div>
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
          <Button onClick={handleSubmit} disabled={createComissao.isPending}>
            {createComissao.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Comissao"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Confirmar Exclusao */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setComissaoToDelete(null);
        }}
        title="Confirmar Exclusao"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-700 mb-2">
            Tem certeza que deseja excluir esta comissao?
          </p>
          <p className="font-semibold text-slate-800">
            {formatCurrency(comissaoToDelete?.valor_liquido || 0)}
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
              setComissaoToDelete(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteComissao.isPending}
          >
            {deleteComissao.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir Comissao"
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
