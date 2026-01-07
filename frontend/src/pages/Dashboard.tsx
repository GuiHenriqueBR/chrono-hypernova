import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users,
  FileText,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Flame,
  RefreshCw,
  Phone,
  ChevronRight,
  Target,
  DollarSign,
  Zap,
  Wallet,
  PieChart,
  BarChart3,
  Clock,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import {
  Card,
  Skeleton,
  BarChart,
  LineChart,
  DonutChart,
  Button,
  Badge,
} from "../components/common";
import {
  useDashboardStats,
  useRecentActivities,
  useUpcomingRenewals,
  useDashboardCharts,
  useFocoDoDia,
  usePipelineVendas,
  useMetricasConversao,
} from "../hooks/useDashboard";
import { useFinanceiroStats } from "../hooks/useFinanceiro";
import {
  FocoDoDiaItem,
  PipelineVendasResponse,
  MetricasConversaoResponse,
} from "../types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

// Componente do item do Foco do Dia
function FocoDoDiaCard({
  item,
  onClick,
}: {
  item: FocoDoDiaItem;
  onClick: () => void;
}) {
  const iconMap = {
    tarefa: CheckCircle,
    renovacao: RefreshCw,
    follow_up: Phone,
    sinistro: AlertTriangle,
  };

  const colorMap = {
    tarefa: {
      bg: "bg-violet-100",
      text: "text-violet-600",
      border: "border-violet-200",
    },
    renovacao: {
      bg: "bg-amber-100",
      text: "text-amber-600",
      border: "border-amber-200",
    },
    follow_up: {
      bg: "bg-cyan-100",
      text: "text-cyan-600",
      border: "border-cyan-200",
    },
    sinistro: {
      bg: "bg-red-100",
      text: "text-red-600",
      border: "border-red-200",
    },
  };

  const urgenciaStyles = {
    atrasada: "bg-red-500 text-white animate-pulse",
    alta: "bg-amber-500 text-white",
    normal: "bg-slate-200 text-slate-700",
  };

  const Icon = iconMap[item.tipo] || CheckCircle;
  const colors = colorMap[item.tipo] || colorMap.tarefa;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`
        flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
        bg-white border ${colors.border} hover:shadow-md
        ${item.urgencia === "atrasada" ? "ring-2 ring-red-200" : ""}
      `}
    >
      <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-800 truncate">
            {item.titulo}
          </p>
          {item.urgencia !== "normal" && (
            <span
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                urgenciaStyles[item.urgencia]
              }`}
            >
              {item.urgencia === "atrasada" ? "ATRASADO" : "URGENTE"}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">{item.subtitulo}</p>
      </div>

      <div className="flex items-center gap-2">
        {item.telefone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`tel:${item.telefone}`);
            }}
            className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
          >
            <Phone className="w-4 h-4" />
          </button>
        )}
        {item.valor && (
          <span className="text-xs font-medium text-slate-600">
            {formatCurrency(item.valor)}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    </motion.div>
  );
}

// Mini Kanban do Pipeline
function PipelineMini({
  pipeline,
  metricas,
  onNavigate,
}: {
  pipeline?: PipelineVendasResponse;
  metricas?: MetricasConversaoResponse;
  onNavigate: () => void;
}) {
  const stages = [
    { key: "nova", label: "Novas", color: "bg-slate-400" },
    { key: "em_cotacao", label: "Cotando", color: "bg-blue-400" },
    { key: "enviada", label: "Enviadas", color: "bg-violet-400" },
    { key: "em_negociacao", label: "Negociando", color: "bg-amber-400" },
  ];

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-100">
        {stages.map((stage) => {
          const count =
            pipeline?.pipeline?.[
              stage.key as keyof PipelineVendasResponse["pipeline"]
            ]?.length || 0;
          const total = pipeline?.metricas?.emAndamento || 1;
          const width = (count / total) * 100;
          return (
            <div
              key={stage.key}
              className={`${stage.color} transition-all`}
              style={{ width: `${Math.max(width, count > 0 ? 5 : 0)}%` }}
              title={`${stage.label}: ${count}`}
            />
          );
        })}
      </div>

      {/* Stage counts */}
      <div className="grid grid-cols-4 gap-2">
        {stages.map((stage) => {
          const count =
            pipeline?.pipeline?.[
              stage.key as keyof PipelineVendasResponse["pipeline"]
            ]?.length || 0;
          return (
            <div key={stage.key} className="text-center">
              <div
                className={`w-2 h-2 rounded-full ${stage.color} mx-auto mb-1`}
              />
              <p className="text-lg font-bold text-slate-800">{count}</p>
              <p className="text-[10px] text-slate-500 uppercase">
                {stage.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Métricas rápidas */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-slate-700">
              {metricas?.taxas?.conversaoGeral || 0}% conversão
            </span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-medium text-slate-700">
              {formatCurrency(metricas?.valorTotal?.pipeline || 0)}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onNavigate}>
          Ver Pipeline <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities, isLoading: activitiesLoading } =
    useRecentActivities();
  const { data: renewals, isLoading: renewalsLoading } = useUpcomingRenewals();
  const { data: charts, isLoading: chartsLoading } = useDashboardCharts();
  const { data: financeiroStats, isLoading: financeiroLoading } =
    useFinanceiroStats();

  // Novos hooks CRM
  const {
    data: focoDoDia,
    isLoading: focoLoading,
    refetch: refetchFoco,
  } = useFocoDoDia();
  const { data: pipelineData, isLoading: pipelineLoading } =
    usePipelineVendas();
  const { data: metricasConversao } = useMetricasConversao(30);

  const colorClasses: Record<
    string,
    { bg: string; text: string; border: string }
  > = {
    violet: {
      bg: "bg-violet-100",
      text: "text-violet-600",
      border: "border-violet-200",
    },
    cyan: {
      bg: "bg-cyan-100",
      text: "text-cyan-600",
      border: "border-cyan-200",
    },
    amber: {
      bg: "bg-amber-100",
      text: "text-amber-600",
      border: "border-amber-200",
    },
    emerald: {
      bg: "bg-emerald-100",
      text: "text-emerald-600",
      border: "border-emerald-200",
    },
  };

  const statsItems = [
    {
      name: "Clientes Ativos",
      value: statsLoading ? "-" : stats?.clientes?.ativos?.toString() || "0",
      change: `${stats?.clientes?.total || 0} total`,
      trend: "up" as const,
      icon: Users,
      color: "violet",
    },
    {
      name: "Apolices Vigentes",
      value: statsLoading ? "-" : stats?.apolices?.vigentes?.toString() || "0",
      change: `${stats?.apolices?.vencendo || 0} vencendo`,
      trend:
        (stats?.apolices?.vencendo || 0) > 0
          ? ("down" as const)
          : ("up" as const),
      icon: FileText,
      color: "cyan",
    },
    {
      name: "Sinistros Abertos",
      value: statsLoading ? "-" : stats?.sinistros?.abertos?.toString() || "0",
      change: `${stats?.sinistros?.em_regulacao || 0} em regulacao`,
      trend:
        (stats?.sinistros?.abertos || 0) > 5
          ? ("down" as const)
          : ("up" as const),
      icon: AlertTriangle,
      color: "amber",
    },
    {
      name: "Receita do Mes",
      value: financeiroLoading
        ? "-"
        : formatCurrency(financeiroStats?.receitaMes || 0),
      change: `${financeiroStats?.comissoesPendentes || 0} pendentes`,
      trend:
        (financeiroStats?.receitaMes || 0) > 0
          ? ("up" as const)
          : ("down" as const),
      icon: TrendingUp,
      color: "emerald",
    },
  ];

  return (
    <PageLayout title="Dashboard" subtitle="Visao geral do seu negocio">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsItems.map((stat) => {
            const colors = colorClasses[stat.color];
            return (
              <motion.div key={stat.name} variants={itemVariants}>
                <Card className="relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{stat.name}</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">
                        {stat.value}
                      </p>
                      <div
                        className={`
                        flex items-center gap-1 mt-2 text-sm
                        ${
                          stat.trend === "up"
                            ? "text-emerald-600"
                            : "text-amber-500"
                        }
                      `}
                      >
                        {stat.trend === "up" ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        <span>{stat.change}</span>
                      </div>
                    </div>
                    <div
                      className={`p-3 rounded-xl ${colors.bg} ${colors.text}`}
                    >
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* FOCO DO DIA + PIPELINE - Nova seção principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Foco do Dia - Smart Feed */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-linear-to-br from-orange-400 to-red-500">
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      Foco do Dia
                    </h3>
                    <p className="text-xs text-slate-500">
                      Itens que precisam da sua atenção
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {focoDoDia?.resumo && (
                    <div className="flex gap-1">
                      {focoDoDia.resumo.tarefas > 0 && (
                        <Badge variant="neutral" className="text-[10px]">
                          {focoDoDia.resumo.tarefas} tarefas
                        </Badge>
                      )}
                      {focoDoDia.resumo.renovacoes > 0 && (
                        <Badge variant="warning" className="text-[10px]">
                          {focoDoDia.resumo.renovacoes} renovações
                        </Badge>
                      )}
                      {focoDoDia.resumo.followUps > 0 && (
                        <Badge variant="info" className="text-[10px]">
                          {focoDoDia.resumo.followUps} follow-ups
                        </Badge>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => refetchFoco()}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Atualizar"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {focoLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} height={60} />
                  ))}
                </div>
              ) : focoDoDia?.itens && focoDoDia.itens.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {focoDoDia.itens.map((item) => (
                    <FocoDoDiaCard
                      key={item.id}
                      item={item}
                      onClick={() => navigate(item.link)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-slate-600 font-medium">Tudo em dia!</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Nenhum item urgente no momento
                  </p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Pipeline de Vendas Mini */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-linear-to-br from-violet-400 to-purple-500">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      Pipeline de Vendas
                    </h3>
                    <p className="text-xs text-slate-500">
                      Acompanhe suas cotações
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-800">
                      {pipelineData?.metricas?.emAndamento || 0}
                    </p>
                    <p className="text-xs text-slate-500">em andamento</p>
                  </div>
                </div>
              </div>

              {pipelineLoading ? (
                <div className="space-y-4">
                  <Skeleton height={8} />
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} height={60} />
                    ))}
                  </div>
                </div>
              ) : (
                <PipelineMini
                  pipeline={pipelineData?.pipeline as any}
                  metricas={pipelineData?.metricas as any}
                  onNavigate={() => navigate("/cotacoes")}
                />
              )}

              {/* Métricas de conversão rápidas */}
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {metricasConversao?.taxas?.conversaoGeral || 0}%
                  </p>
                  <p className="text-xs text-slate-500">Taxa Geral</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-violet-600">
                    {pipelineData?.metricas?.ganhas || 0}
                  </p>
                  <p className="text-xs text-slate-500">Ganhas (mês)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-400">
                    {pipelineData?.metricas?.perdidas || 0}
                  </p>
                  <p className="text-xs text-slate-500">Perdidas (mês)</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts Section */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-2 grid grid-cols-2 gap-4"
          >
            {/* Apolices por Ramo */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-5 h-5 text-violet-600" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Apolices por Ramo
                </h3>
              </div>
              {chartsLoading ? (
                <div className="flex items-center justify-center h-[140px]">
                  <Skeleton height={140} width={140} />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center">
                    <DonutChart
                      data={
                        charts?.apolicesPorRamo &&
                        charts.apolicesPorRamo.length > 0
                          ? charts.apolicesPorRamo.map((item) => ({
                              ...item,
                              color: item.color || "#cbd5e1",
                            }))
                          : [{ label: "Sem dados", value: 1, color: "#e2e8f0" }]
                      }
                      size={140}
                      centerValue={charts?.totalApolices || 0}
                      centerLabel="Total"
                    />
                  </div>
                  <div className="flex justify-center gap-4 mt-4 flex-wrap">
                    {(charts?.apolicesPorRamo || []).slice(0, 4).map((item) => (
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

            {/* Sinistros Mensal */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Sinistros (6 meses)
                </h3>
              </div>
              {chartsLoading ? (
                <Skeleton height={140} />
              ) : (
                <BarChart data={charts?.sinistrosMensais || []} height={140} />
              )}
            </Card>

            {/* Comissoes */}
            <Card className="col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    Comissoes (12 meses)
                  </h3>
                </div>
                <span className="text-xs text-slate-500">Em R$ mil</span>
              </div>
              {chartsLoading ? (
                <Skeleton height={140} />
              ) : (
                <LineChart
                  data={charts?.comissoesMensais || []}
                  height={140}
                  color="#10b981"
                />
              )}
            </Card>
          </motion.div>

          {/* Upcoming Renewals */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  Renovacoes Proximas
                </h3>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  {renewals?.length || 0} pendentes
                </span>
              </div>

              {renewalsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} height={80} />
                  ))}
                </div>
              ) : renewals && renewals.length > 0 ? (
                <div className="space-y-3">
                  {renewals.map((renewal) => (
                    <div
                      key={renewal.id}
                      onClick={() => navigate(`/apolices/${renewal.id}`)}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {renewal.cliente}
                        </p>
                        <span
                          className={`
                          px-2 py-0.5 text-xs font-medium rounded-full
                          ${
                            renewal.dias <= 10
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : "bg-amber-100 text-amber-700 border border-amber-200"
                          }
                        `}
                        >
                          {renewal.dias} dias
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {renewal.apolice}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Vence em {renewal.vencimento}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm">Nenhuma renovacao proxima</p>
                  <p className="text-xs mt-1">Suas apolices estao em dia!</p>
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Financial Summary Row */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-4 gap-4"
        >
          <Card
            className="cursor-pointer hover:shadow-lg transition-all bg-linear-to-br from-emerald-50 to-white"
            onClick={() => navigate("/financeiro")}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  Receita do Mes
                </p>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {financeiroLoading
                    ? "-"
                    : formatCurrency(financeiroStats?.receitaMes || 0)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-100">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all bg-linear-to-br from-amber-50 to-white"
            onClick={() => navigate("/financeiro")}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  Pendentes
                </p>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {financeiroLoading
                    ? "-"
                    : formatCurrency(financeiroStats?.valorPendente || 0)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {financeiroStats?.comissoesPendentes || 0} comissoes
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-100">
                <Wallet className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all bg-linear-to-br from-violet-50 to-white"
            onClick={() => navigate("/financeiro")}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  Total Recebido
                </p>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {financeiroLoading
                    ? "-"
                    : formatCurrency(financeiroStats?.totalRecebido || 0)}
                </p>
                <p className="text-xs text-slate-500 mt-1">Historico</p>
              </div>
              <div className="p-2 rounded-lg bg-violet-100">
                <DollarSign className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all bg-linear-to-br from-cyan-50 to-white"
            onClick={() => navigate("/sinistros")}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  Sinistros Pagos
                </p>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {statsLoading ? "-" : stats?.sinistros?.pagos || 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats?.sinistros?.total || 0} total
                </p>
              </div>
              <div className="p-2 rounded-lg bg-cyan-100">
                <AlertTriangle className="w-5 h-5 text-cyan-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Recent Activities */}
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Atividades Recentes
              </h3>
              <button
                onClick={() => navigate("/clientes")}
                className="text-sm text-violet-600 hover:text-violet-700 transition-colors"
              >
                Ver todas
              </button>
            </div>

            {activitiesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} height={60} />
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div
                      className={`
                      w-10 h-10 rounded-xl flex items-center justify-center
                      ${
                        activity.type === "cliente"
                          ? "bg-violet-100 text-violet-600"
                          : ""
                      }
                      ${
                        activity.type === "apolice"
                          ? "bg-cyan-100 text-cyan-600"
                          : ""
                      }
                      ${
                        activity.type === "sinistro"
                          ? "bg-amber-100 text-amber-600"
                          : ""
                      }
                      ${
                        activity.type === "financeiro"
                          ? "bg-emerald-100 text-emerald-600"
                          : ""
                      }
                    `}
                    >
                      {activity.type === "cliente" && (
                        <Users className="w-5 h-5" />
                      )}
                      {activity.type === "apolice" && (
                        <FileText className="w-5 h-5" />
                      )}
                      {activity.type === "sinistro" && (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                      {activity.type === "financeiro" && (
                        <DollarSign className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {activity.action}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {activity.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>Nenhuma atividade recente</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Acoes Rapidas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Novo Cliente",
                  icon: Users,
                  color: "violet",
                  path: "/clientes",
                },
                {
                  label: "Nova Cotação",
                  icon: FileText,
                  color: "cyan",
                  path: "/cotacoes/nova",
                },
                {
                  label: "Abrir Sinistro",
                  icon: AlertTriangle,
                  color: "amber",
                  path: "/sinistros",
                },
                {
                  label: "Ver Financeiro",
                  icon: TrendingUp,
                  color: "emerald",
                  path: "/financeiro",
                },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-xl
                    bg-slate-50 border border-slate-100
                    hover:bg-white hover:border-slate-200 hover:shadow-md
                    transition-all duration-200
                    group
                  `}
                >
                  <div
                    className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    ${
                      action.color === "violet"
                        ? "bg-violet-100 text-violet-600 group-hover:bg-violet-500 group-hover:text-white"
                        : ""
                    }
                    ${
                      action.color === "cyan"
                        ? "bg-cyan-100 text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white"
                        : ""
                    }
                    ${
                      action.color === "amber"
                        ? "bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white"
                        : ""
                    }
                    ${
                      action.color === "emerald"
                        ? "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white"
                        : ""
                    }
                    transition-all
                  `}
                  >
                    <action.icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm text-slate-500 group-hover:text-slate-800 transition-colors">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </PageLayout>
  );
}
