import { useState, useMemo } from "react";
import { Tarefa, Cotacao, Apolice } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Search,
  Loader2,
  Trash2,
  RefreshCw,
  FileText,
  DollarSign,
  User,
  List,
  LayoutGrid,
  X,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageLayout } from "../components/layout";
import {
  Card,
  Button,
  Modal,
  ModalFooter,
  Input,
  Skeleton,
  EmptyState,
  Calendar,
  CalendarEvent,
} from "../components/common";
import {
  useTarefas,
  useTarefasStats,
  useCriarTarefa,
  useDeletarTarefa,
  useToggleTarefa,
  useEventosCalendario,
  useDiaCalendario,
} from "../hooks/useAgenda";
import { useClientes } from "../hooks/useClientes";
import { useApolices } from "../hooks/useApolices";
import { TipoTarefa, PrioridadeTarefa, Cliente } from "../types";

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
  string,
  { label: string; bgClass: string; textClass: string; borderClass: string }
> = {
  alta: {
    label: "Alta",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    borderClass: "border-red-200",
  },
  media: {
    label: "Media",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    borderClass: "border-amber-200",
  },
  baixa: {
    label: "Baixa",
    bgClass: "bg-slate-100",
    textClass: "text-slate-600",
    borderClass: "border-slate-200",
  },
};

const tipoConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  renovacao: { label: "Renovacao", icon: RefreshCw, color: "cyan" },
  vencimento: { label: "Vencimento", icon: CalendarIcon, color: "amber" },
  sinistro: { label: "Sinistro", icon: AlertTriangle, color: "red" },
  pagamento: { label: "Pagamento", icon: DollarSign, color: "emerald" },
  geral: { label: "Geral", icon: FileText, color: "violet" },
};

interface FormData {
  tipo: TipoTarefa;
  descricao: string;
  data_vencimento: string;
  prioridade: PrioridadeTarefa;
  cliente_id: string;
  apolice_id: string;
}

const initialFormData: FormData = {
  tipo: "geral",
  descricao: "",
  data_vencimento: "",
  prioridade: "media",
  cliente_id: "",
  apolice_id: "",
};

export default function Agenda() {
  const navigate = useNavigate();
  const [view, setView] = useState<"calendario" | "lista">("calendario");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "todos" | "pendentes" | "concluidas"
  >("pendentes");
  const [filterPrioridade, setFilterPrioridade] = useState<string>("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tarefaToDelete, setTarefaToDelete] = useState<Tarefa | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof FormData, string>>
  >({});

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [calendarStart, setCalendarStart] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [calendarEnd, setCalendarEnd] = useState(() =>
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [dayPanelOpen, setDayPanelOpen] = useState(false);

  // API hooks
  const filters: {
    status?: "pendentes" | "concluidas";
    prioridade?: PrioridadeTarefa;
  } = {};
  if (filterStatus !== "todos") filters.status = filterStatus;
  if (filterPrioridade !== "todos")
    filters.prioridade = filterPrioridade as PrioridadeTarefa;

  const {
    data: tarefasData,
    isLoading,
    error,
  } = useTarefas(Object.keys(filters).length > 0 ? filters : undefined);
  const { data: stats, isLoading: statsLoading } = useTarefasStats();
  const { data: clientesData } = useClientes();
  const { data: apolicesData } = useApolices(
    formData.cliente_id ? { cliente_id: formData.cliente_id } : undefined
  );

  // Calendar data
  const { data: eventosCalendario, isLoading: calendarioLoading } =
    useEventosCalendario(calendarStart, calendarEnd);
  const { data: diaData, isLoading: diaLoading } = useDiaCalendario(
    selectedDate ? format(selectedDate, "yyyy-MM-dd") : null
  );

  const criarTarefa = useCriarTarefa();
  const deletarTarefa = useDeletarTarefa();
  const toggleTarefa = useToggleTarefa();

  // Transform eventos to CalendarEvent format
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    if (!eventosCalendario?.data) return [];
    return eventosCalendario.data.map((e) => ({
      id: e.id,
      tipo: e.tipo,
      titulo: e.titulo,
      subtitulo: e.subtitulo,
      data: e.data,
      cor: e.cor as CalendarEvent["cor"],
      concluido: e.concluido,
      prioridade: e.prioridade,
      cliente: e.cliente,
    }));
  }, [eventosCalendario]);

  // Filter tarefas by search
  const tarefasList = useMemo(
    () => tarefasData?.data || [],
    [tarefasData?.data]
  );
  const filtered = useMemo(() => {
    if (!tarefasList.length) return [];
    if (!search) return tarefasList;

    const searchLower = search.toLowerCase();
    return tarefasList.filter(
      (t: Tarefa) =>
        t.descricao?.toLowerCase().includes(searchLower) ||
        t.cliente?.nome?.toLowerCase().includes(searchLower)
    );
  }, [tarefasList, search]);

  // Handle form change
  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));

    if (field === "cliente_id") {
      setFormData((prev) => ({ ...prev, apolice_id: "" }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.descricao.trim()) {
      errors.descricao = "Descricao e obrigatoria";
    }
    if (!formData.data_vencimento) {
      errors.data_vencimento = "Data e obrigatoria";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await criarTarefa.mutateAsync({
        tipo: formData.tipo,
        descricao: formData.descricao,
        data_vencimento: formData.data_vencimento,
        prioridade: formData.prioridade,
        cliente_id: formData.cliente_id || undefined,
        apolice_id: formData.apolice_id || undefined,
        concluida: false,
      });

      setIsModalOpen(false);
      setFormData(initialFormData);
      setFormErrors({});
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao criar tarefa";
      setFormErrors({ descricao: errorMessage });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!tarefaToDelete) return;

    try {
      await deletarTarefa.mutateAsync(tarefaToDelete.id);
      setDeleteModalOpen(false);
      setTarefaToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir tarefa:", err);
    }
  };

  // Handle toggle
  const handleToggle = async (id: string) => {
    try {
      await toggleTarefa.mutateAsync(id);
    } catch (err) {
      console.error("Erro ao alterar tarefa:", err);
    }
  };

  // Calendar handlers
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setDayPanelOpen(true);
  };

  const handleMonthChange = (start: Date, end: Date) => {
    setCalendarStart(format(start, "yyyy-MM-dd"));
    setCalendarEnd(format(end, "yyyy-MM-dd"));
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.tipo === "tarefa") {
      // Could open task detail or edit modal
    } else if (event.tipo === "followup") {
      navigate(`/cotacoes`);
    } else if (event.tipo === "renovacao") {
      navigate(`/apolices`);
    }
  };

  // Check if task is overdue
  const isOverdue = (date: string, concluida: boolean) => {
    if (concluida) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    return taskDate < today;
  };

  // Check if task is today
  const isToday = (date: string) => {
    const today = new Date().toISOString().split("T")[0];
    return date === today;
  };

  // Clientes/Apolices options
  const clientesOptions = clientesData?.data || [];
  const apolicesOptions = apolicesData?.data || [];

  return (
    <PageLayout title="Agenda" subtitle="Calendario e tarefas">
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
            <div className="p-3 rounded-xl bg-violet-100">
              <CalendarIcon className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Tarefas Hoje</p>
              <p className="text-lg font-bold text-slate-800">
                {statsLoading ? "-" : stats?.hoje || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pendentes</p>
              <p className="text-lg font-bold text-slate-800">
                {statsLoading ? "-" : stats?.pendentes || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Atrasadas</p>
              <p className="text-lg font-bold text-slate-800">
                {statsLoading ? "-" : stats?.atrasadas || 0}
              </p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Concluidas</p>
              <p className="text-lg font-bold text-slate-800">
                {statsLoading ? "-" : stats?.concluidas || 0}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Toolbar */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row gap-4 justify-between"
        >
          <div className="flex gap-3 flex-1 flex-wrap items-center">
            {/* View Toggle */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setView("calendario")}
                className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
                  view === "calendario"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Calendario
              </button>
              <button
                onClick={() => setView("lista")}
                className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
                  view === "lista"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
            </div>

            {view === "lista" && (
              <>
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar tarefa..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(
                      e.target.value as "todos" | "pendentes" | "concluidas"
                    )
                  }
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                >
                  <option value="todos">Todos Status</option>
                  <option value="pendentes">Pendentes</option>
                  <option value="concluidas">Concluidas</option>
                </select>
                <select
                  value={filterPrioridade}
                  onChange={(e) => setFilterPrioridade(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                >
                  <option value="todos">Todas Prioridades</option>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baixa">Baixa</option>
                </select>
              </>
            )}
          </div>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Nova Tarefa
          </Button>
        </motion.div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Calendar or List View */}
          <div
            className={
              dayPanelOpen && view === "calendario" ? "flex-1" : "w-full"
            }
          >
            {view === "calendario" ? (
              <motion.div variants={itemVariants}>
                <Calendar
                  events={calendarEvents}
                  onDateSelect={handleDateSelect}
                  onEventClick={handleEventClick}
                  onMonthChange={handleMonthChange}
                  selectedDate={selectedDate}
                  isLoading={calendarioLoading}
                />
              </motion.div>
            ) : (
              <>
                {/* Loading */}
                {isLoading && (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} height={80} />
                    ))}
                  </div>
                )}

                {/* Error */}
                {error && (
                  <Card className="text-center py-12">
                    <p className="text-red-500">Erro ao carregar tarefas</p>
                  </Card>
                )}

                {/* Tasks List */}
                {!isLoading && !error && (
                  <motion.div
                    variants={containerVariants}
                    className="space-y-3"
                  >
                    {filtered.length > 0 ? (
                      filtered.map((t: Tarefa) => {
                        const prioridade =
                          prioridadeConfig[t.prioridade] ||
                          prioridadeConfig.media;
                        const tipo = tipoConfig[t.tipo] || tipoConfig.geral;
                        const TipoIcon = tipo.icon;
                        const overdue = isOverdue(
                          t.data_vencimento,
                          t.concluida
                        );
                        const today = isToday(t.data_vencimento);

                        return (
                          <motion.div key={t.id} variants={itemVariants}>
                            <Card
                              padding="sm"
                              className={`
                                flex items-center gap-4 group transition-all
                                ${
                                  t.concluida
                                    ? "opacity-60 bg-slate-50"
                                    : "hover:border-violet-200"
                                }
                                ${overdue ? "border-red-200 bg-red-50/30" : ""}
                              `}
                            >
                              {/* Toggle Button */}
                              <button
                                onClick={() => handleToggle(t.id)}
                                disabled={toggleTarefa.isPending}
                                className={`
                                  w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0
                                  ${
                                    t.concluida
                                      ? "bg-emerald-500 border-emerald-500"
                                      : overdue
                                      ? "border-red-400 hover:bg-red-100"
                                      : `border-slate-300 hover:border-violet-400 hover:bg-violet-50`
                                  }
                                `}
                              >
                                {t.concluida && (
                                  <CheckCircle className="w-4 h-4 text-white" />
                                )}
                              </button>

                              {/* Tipo Icon */}
                              <div
                                className={`p-2 rounded-lg bg-${tipo.color}-100 shrink-0`}
                              >
                                <TipoIcon
                                  className={`w-4 h-4 text-${tipo.color}-600`}
                                />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm ${
                                    t.concluida
                                      ? "line-through text-slate-400"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {t.descricao}
                                </p>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <span
                                    className={`text-xs flex items-center gap-1 ${
                                      overdue
                                        ? "text-red-500 font-medium"
                                        : today
                                        ? "text-amber-600 font-medium"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    <CalendarIcon className="w-3 h-3" />
                                    {overdue
                                      ? "Atrasada - "
                                      : today
                                      ? "Hoje - "
                                      : ""}
                                    {new Date(
                                      t.data_vencimento
                                    ).toLocaleDateString("pt-BR")}
                                  </span>
                                  {t.cliente?.nome && (
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {t.cliente.nome}
                                    </span>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${prioridade.bgClass} ${prioridade.textClass}`}
                                  >
                                    {prioridade.label.toUpperCase()}
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setTarefaToDelete(t);
                                    setDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Priority Indicator */}
                              {t.prioridade === "alta" && !t.concluida && (
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                              )}
                            </Card>
                          </motion.div>
                        );
                      })
                    ) : (
                      <EmptyState
                        icon={<CalendarIcon className="w-8 h-8" />}
                        title="Nenhuma tarefa encontrada"
                        description={
                          search ||
                          filterStatus !== "todos" ||
                          filterPrioridade !== "todos"
                            ? "Tente ajustar os filtros"
                            : "Comece criando sua primeira tarefa"
                        }
                        action={{
                          label: "Nova Tarefa",
                          onClick: () => setIsModalOpen(true),
                        }}
                      />
                    )}
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Day Detail Panel */}
          <AnimatePresence>
            {dayPanelOpen && view === "calendario" && selectedDate && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-96 shrink-0"
              >
                <Card className="sticky top-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-slate-500">
                        {format(selectedDate, "EEEE", { locale: ptBR })}
                      </p>
                      <h3 className="text-lg font-bold text-slate-800">
                        {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                      </h3>
                    </div>
                    <button
                      onClick={() => setDayPanelOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {diaLoading ? (
                    <div className="space-y-3">
                      <Skeleton height={60} />
                      <Skeleton height={60} />
                      <Skeleton height={60} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl">
                        <div className="text-center">
                          <p className="text-lg font-bold text-violet-600">
                            {diaData?.resumo?.total_tarefas || 0}
                          </p>
                          <p className="text-[10px] text-slate-500">Tarefas</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-violet-600">
                            {diaData?.resumo?.total_followups || 0}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Follow-ups
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-cyan-600">
                            {diaData?.resumo?.total_renovacoes || 0}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Renovacoes
                          </p>
                        </div>
                      </div>

                      {/* Tarefas */}
                      {diaData?.tarefas && diaData.tarefas.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                            Tarefas
                          </p>
                          <div className="space-y-2">
                            {diaData.tarefas.map((tarefa: Tarefa) => {
                              const prioridade =
                                prioridadeConfig[tarefa.prioridade] ||
                                prioridadeConfig.media;

                              return (
                                <div
                                  key={tarefa.id}
                                  className={`p-3 rounded-xl border transition-colors ${
                                    tarefa.concluida
                                      ? "bg-slate-50 border-slate-200 opacity-60"
                                      : "bg-white border-slate-200 hover:border-violet-200"
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    <button
                                      onClick={() => handleToggle(tarefa.id)}
                                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        tarefa.concluida
                                          ? "bg-emerald-500 border-emerald-500"
                                          : "border-slate-300 hover:border-violet-400"
                                      }`}
                                    >
                                      {tarefa.concluida && (
                                        <CheckCircle className="w-3 h-3 text-white" />
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className={`text-sm ${
                                          tarefa.concluida
                                            ? "line-through text-slate-400"
                                            : "text-slate-800"
                                        }`}
                                      >
                                        {tarefa.descricao}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${prioridade.bgClass} ${prioridade.textClass}`}
                                        >
                                          {prioridade.label}
                                        </span>
                                        {tarefa.cliente?.nome && (
                                          <span className="text-[10px] text-slate-400">
                                            {tarefa.cliente.nome}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Follow-ups */}
                      {diaData?.followups && diaData.followups.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                            Follow-ups
                          </p>
                          <div className="space-y-2">
                            {diaData.followups.map((fu: Cotacao) => (
                              <div
                                key={fu.id}
                                onClick={() => navigate("/cotacoes")}
                                className="p-3 rounded-xl border border-violet-200 bg-violet-50/50 hover:bg-violet-50 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-violet-600" />
                                  <span className="text-sm font-medium text-violet-700">
                                    Cotacao #{fu.id.substring(0, 8)}
                                  </span>
                                </div>
                                {fu.clientes?.nome && (
                                  <p className="text-xs text-violet-600/70 mt-1">
                                    {fu.clientes.nome}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Renovacoes */}
                      {diaData?.renovacoes && diaData.renovacoes.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                            Renovacoes
                          </p>
                          <div className="space-y-2">
                            {diaData.renovacoes.map((apolice: Apolice) => (
                              <div
                                key={apolice.id}
                                onClick={() =>
                                  navigate(`/apolices/${apolice.id}`)
                                }
                                className="p-3 rounded-xl border border-cyan-200 bg-cyan-50/50 hover:bg-cyan-50 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 text-cyan-600" />
                                    <span className="text-sm font-medium text-cyan-700">
                                      {apolice.numero_apolice}
                                    </span>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-cyan-400" />
                                </div>
                                <p className="text-xs text-cyan-600/70 mt-1">
                                  {apolice.seguradora} - {apolice.ramo}
                                </p>
                                {apolice.cliente?.nome && (
                                  <p className="text-xs text-cyan-600/70">
                                    {apolice.cliente.nome}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {(!diaData?.tarefas || diaData.tarefas.length === 0) &&
                        (!diaData?.followups ||
                          diaData.followups.length === 0) &&
                        (!diaData?.renovacoes ||
                          diaData.renovacoes.length === 0) && (
                          <div className="text-center py-8">
                            <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">
                              Nenhum evento neste dia
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  data_vencimento: format(
                                    selectedDate,
                                    "yyyy-MM-dd"
                                  ),
                                }));
                                setIsModalOpen(true);
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Criar tarefa
                            </Button>
                          </div>
                        )}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Modal Nova Tarefa */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormData(initialFormData);
          setFormErrors({});
        }}
        title="Nova Tarefa"
        size="md"
      >
        <div className="space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo
            </label>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(tipoConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleFormChange("tipo", key as TipoTarefa)}
                    className={`
                      p-2 rounded-xl border transition-all flex flex-col items-center gap-1
                      ${
                        formData.tipo === key
                          ? `bg-${config.color}-50 border-${config.color}-200 text-${config.color}-700`
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-medium">
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

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
              rows={2}
              placeholder="Descreva a tarefa..."
            />
            {formErrors.descricao && (
              <p className="text-xs text-red-500 mt-1">
                {formErrors.descricao}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data de Vencimento *"
              type="date"
              value={formData.data_vencimento}
              onChange={(e) =>
                handleFormChange("data_vencimento", e.target.value)
              }
              error={formErrors.data_vencimento}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Prioridade
              </label>
              <select
                value={formData.prioridade}
                onChange={(e) => handleFormChange("prioridade", e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Cliente Select */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Cliente (opcional)
              </label>
              <select
                value={formData.cliente_id}
                onChange={(e) => handleFormChange("cliente_id", e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="">Nenhum</option>
                {clientesOptions.map((cliente: Cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Apolice Select */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Apolice (opcional)
              </label>
              <select
                value={formData.apolice_id}
                onChange={(e) => handleFormChange("apolice_id", e.target.value)}
                disabled={!formData.cliente_id}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {formData.cliente_id ? "Nenhuma" : "Selecione cliente"}
                </option>
                {apolicesOptions.map((apolice: Apolice) => (
                  <option key={apolice.id} value={apolice.id}>
                    {apolice.numero_apolice}
                  </option>
                ))}
              </select>
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
          <Button onClick={handleSubmit} disabled={criarTarefa.isPending}>
            {criarTarefa.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Criar Tarefa"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Confirmar Exclusao */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTarefaToDelete(null);
        }}
        title="Confirmar Exclusao"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-700 mb-2">
            Tem certeza que deseja excluir esta tarefa?
          </p>
          <p className="font-semibold text-slate-800 line-clamp-2">
            {tarefaToDelete?.descricao}
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
              setTarefaToDelete(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deletarTarefa.isPending}
          >
            {deletarTarefa.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir Tarefa"
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
