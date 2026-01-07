import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  User,
  Building,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import {
  Card,
  Badge,
  Button,
  Timeline,
  TimelineItem,
  Modal,
  ModalFooter,
  Input,
} from "../components/common";
import { Skeleton } from "../components/common";
import { ErrorState, EmptyState } from "../components/common";
import {
  useConsorcio,
  useRegistrarPagamentoParcela,
  useRegistrarLance,
  useAtualizarResultadoLance,
  useMarcarContemplado,
  useGerarParcelas,
} from "../hooks/useConsorcios";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-BR");

const statusBadge: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  ativo: "success",
  contemplado: "info",
  encerrado: "neutral",
  cancelado: "error",
};

const tipoBemLabels: Record<string, string> = {
  imovel: "Imóvel",
  veiculo: "Veículo",
  servicos: "Serviços",
  outros: "Outros",
};

const statusParcelaConfig: Record<string, { label: string; variant: "success" | "warning" | "error" }> = {
  pago: { label: "Pago", variant: "success" },
  pendente: { label: "Pendente", variant: "warning" },
  atrasado: { label: "Atrasado", variant: "error" },
};

export default function ConsorcioDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: consorcio, isLoading, error, refetch } = useConsorcio(id);
  const registrarPagamento = useRegistrarPagamentoParcela();
  const registrarLance = useRegistrarLance();
  const atualizarResultado = useAtualizarResultadoLance();
  const marcarContemplado = useMarcarContemplado();
  const gerarParcelas = useGerarParcelas();

  const [activeTab, setActiveTab] = useState<"parcelas" | "lances" | "historico">("parcelas");
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showLanceModal, setShowLanceModal] = useState(false);
  const [showContemplarModal, setShowContemplarModal] = useState(false);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<string | null>(null);

  const [pagamentoData, setPagamentoData] = useState({
    data_pagamento: new Date().toISOString().split("T")[0],
    valor_pago: 0,
    observacao: "",
  });

  const [lanceData, setLanceData] = useState({
    data_assembleia: "",
    tipo_lance: "livre" as "livre" | "fixo" | "embutido",
    valor_lance: 0,
    percentual_lance: 0,
    observacao: "",
  });

  const [dataContemplacao, setDataContemplacao] = useState(new Date().toISOString().split("T")[0]);

  if (error) {
    return (
      <PageLayout title="Consórcio" subtitle="Erro ao carregar">
        <ErrorState
          title="Consórcio não encontrado"
          description="O consórcio que você está procurando não existe ou foi removido."
          action={{
            label: "Voltar para Consórcios",
            onClick: () => navigate("/consorcios"),
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
            <Skeleton height={300} />
            <Skeleton height={300} />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!consorcio) return null;

  const parcelas = consorcio.consorcio_parcelas || [];
  const lances = consorcio.consorcio_lances || [];
  const historico = consorcio.consorcio_historico || [];

  const parcelasPagas = parcelas.filter((p) => p.status === "pago").length;
  const parcelasAtrasadas = parcelas.filter((p) => p.status === "atrasado").length;
  const totalPago = parcelas.filter((p) => p.status === "pago").reduce((acc, p) => acc + (p.valor_pago || 0), 0);
  const percentualPago = consorcio.prazo_meses > 0 ? (parcelasPagas / consorcio.prazo_meses) * 100 : 0;

  const handleRegistrarPagamento = async () => {
    if (!parcelaSelecionada) return;

    try {
      await registrarPagamento.mutateAsync({
        consorcioId: id!,
        parcelaId: parcelaSelecionada,
        data: pagamentoData,
      });
      setShowPagamentoModal(false);
      setParcelaSelecionada(null);
      setPagamentoData({
        data_pagamento: new Date().toISOString().split("T")[0],
        valor_pago: 0,
        observacao: "",
      });
      refetch();
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
    }
  };

  const handleRegistrarLance = async () => {
    if (!lanceData.data_assembleia || lanceData.valor_lance <= 0) return;

    try {
      await registrarLance.mutateAsync({
        consorcioId: id!,
        data: lanceData,
      });
      setShowLanceModal(false);
      setLanceData({
        data_assembleia: "",
        tipo_lance: "livre",
        valor_lance: 0,
        percentual_lance: 0,
        observacao: "",
      });
      refetch();
    } catch (error) {
      console.error("Erro ao registrar lance:", error);
    }
  };

  const handleMarcarContemplado = async () => {
    try {
      await marcarContemplado.mutateAsync({
        id: id!,
        data_contemplacao: dataContemplacao,
      });
      setShowContemplarModal(false);
      refetch();
    } catch (error) {
      console.error("Erro ao marcar contemplado:", error);
    }
  };

  const handleGerarParcelas = async () => {
    if (!confirm("Deseja gerar todas as parcelas deste consórcio?")) return;

    try {
      await gerarParcelas.mutateAsync({ consorcioId: id! });
      refetch();
    } catch (error) {
      console.error("Erro ao gerar parcelas:", error);
    }
  };

  const abrirModalPagamento = (parcelaId: string, valorParcela: number) => {
    setParcelaSelecionada(parcelaId);
    setPagamentoData({
      ...pagamentoData,
      valor_pago: valorParcela,
    });
    setShowPagamentoModal(true);
  };

  return (
    <PageLayout
      title={`Consórcio ${consorcio.numero_cota}`}
      subtitle={consorcio.administradora}
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
            {consorcio.status === "ativo" && (
              <Button
                variant="outline"
                leftIcon={<Trophy className="w-4 h-4" />}
                onClick={() => setShowContemplarModal(true)}
              >
                Marcar Contemplado
              </Button>
            )}
            <Button leftIcon={<Edit className="w-4 h-4" />}>Editar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info do Consórcio */}
          <div className="space-y-6">
            <Card>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <Building className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Administradora</p>
                    <p className="font-semibold text-slate-800">{consorcio.administradora}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Grupo</p>
                    <p className="text-sm font-medium text-slate-800">{consorcio.grupo || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Cota</p>
                    <p className="text-sm font-medium text-slate-800">{consorcio.cota || consorcio.numero_cota}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Tipo de Bem</p>
                  <Badge variant="info">{tipoBemLabels[consorcio.tipo_bem]}</Badge>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Valor do Crédito</p>
                  <p className="text-xl font-bold text-teal-600">
                    {formatCurrency(consorcio.valor_credito)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Valor da Parcela</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {formatCurrency(consorcio.valor_parcela)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <Badge variant={statusBadge[consorcio.status]}>
                    {consorcio.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <User className="text-teal-500 w-5 h-5" />
                  <div>
                    <p className="font-medium text-slate-800">
                      {consorcio.cliente?.nome || consorcio.clientes?.nome}
                    </p>
                    <p className="text-sm text-slate-500">
                      {consorcio.cliente?.telefone || consorcio.clientes?.telefone}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Data de Adesão</p>
                  <p className="text-sm text-slate-800">{formatDate(consorcio.data_adesao)}</p>
                </div>

                {consorcio.data_proxima_assembleia && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      <p className="text-sm font-medium text-teal-700">
                        Próxima Assembleia: {formatDate(consorcio.data_proxima_assembleia)}
                      </p>
                    </div>
                  </div>
                )}

                {consorcio.data_contemplacao && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-emerald-600" />
                      <p className="text-sm font-medium text-emerald-700">
                        Contemplado em: {formatDate(consorcio.data_contemplacao)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Resumo */}
            <Card>
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Resumo de Pagamentos</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Prazo Total</span>
                  <span className="font-medium text-slate-800">{consorcio.prazo_meses} meses</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Parcelas Pagas</span>
                  <span className="font-medium text-emerald-600">{parcelasPagas} de {consorcio.prazo_meses}</span>
                </div>
                {parcelasAtrasadas > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Parcelas Atrasadas</span>
                    <span className="font-medium text-red-600">{parcelasAtrasadas}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Pago</span>
                  <span className="font-medium text-slate-800">{formatCurrency(totalPago)}</span>
                </div>

                {/* Barra de Progresso */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progresso</span>
                    <span>{percentualPago.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-teal-500 h-2 rounded-full transition-all"
                      style={{ width: `${percentualPago}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Conteúdo Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
              {[
                { id: "parcelas", label: "Parcelas", icon: DollarSign, count: parcelas.length },
                { id: "lances", label: "Lances", icon: Trophy, count: lances.length },
                { id: "historico", label: "Histórico", icon: Clock, count: historico.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                    activeTab === tab.id
                      ? "border-teal-500 text-teal-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  <span className="px-1.5 py-0.5 text-xs bg-slate-100 rounded-full">{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Tab: Parcelas */}
            {activeTab === "parcelas" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-teal-600" />
                    Parcelas
                  </h3>
                  {parcelas.length === 0 && (
                    <Button
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={handleGerarParcelas}
                      disabled={gerarParcelas.isPending}
                    >
                      {gerarParcelas.isPending ? "Gerando..." : "Gerar Parcelas"}
                    </Button>
                  )}
                </div>

                {parcelas.length === 0 ? (
                  <EmptyState
                    title="Nenhuma parcela gerada"
                    description="Clique em 'Gerar Parcelas' para criar as parcelas deste consórcio"
                    icon={<DollarSign className="w-12 h-12 text-slate-300" />}
                  />
                ) : (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Nº</th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Vencimento</th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Valor</th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Pagamento</th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Status</th>
                          <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parcelas.map((parcela) => {
                          const config = statusParcelaConfig[parcela.status];
                          return (
                            <tr key={parcela.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm font-medium text-slate-800">
                                {parcela.numero_parcela}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {formatDate(parcela.data_vencimento)}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {formatCurrency(parcela.valor_parcela)}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {parcela.data_pagamento ? (
                                  <div>
                                    <p>{formatDate(parcela.data_pagamento)}</p>
                                    <p className="text-xs text-emerald-600">
                                      {formatCurrency(parcela.valor_pago || parcela.valor_parcela)}
                                    </p>
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={config.variant} size="sm">
                                  {config.label}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {parcela.status !== "pago" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<CheckCircle className="w-3 h-3" />}
                                    onClick={() => abrirModalPagamento(parcela.id, parcela.valor_parcela)}
                                  >
                                    Pagar
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {/* Tab: Lances */}
            {activeTab === "lances" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-teal-600" />
                    Lances
                  </h3>
                  <Button
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowLanceModal(true)}
                  >
                    Novo Lance
                  </Button>
                </div>

                {lances.length === 0 ? (
                  <EmptyState
                    title="Nenhum lance registrado"
                    description="Registre os lances oferecidos nas assembleias"
                    icon={<Trophy className="w-12 h-12 text-slate-300" />}
                  />
                ) : (
                  <div className="space-y-4">
                    {lances.map((lance) => (
                      <div
                        key={lance.id}
                        className="p-4 border border-slate-200 rounded-lg hover:border-teal-200 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="info" size="sm">{lance.tipo_lance.toUpperCase()}</Badge>
                              <Badge
                                variant={
                                  lance.resultado === "contemplado"
                                    ? "success"
                                    : lance.resultado === "nao_contemplado"
                                    ? "error"
                                    : "warning"
                                }
                                size="sm"
                              >
                                {lance.resultado === "contemplado"
                                  ? "CONTEMPLADO"
                                  : lance.resultado === "nao_contemplado"
                                  ? "NÃO CONTEMPLADO"
                                  : "PENDENTE"}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Assembleia: {formatDate(lance.data_assembleia)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-teal-600">
                              {formatCurrency(lance.valor_lance)}
                            </p>
                            {lance.percentual_lance && (
                              <p className="text-xs text-slate-500">{lance.percentual_lance}%</p>
                            )}
                          </div>
                        </div>
                        {lance.observacao && (
                          <p className="text-sm text-slate-600">{lance.observacao}</p>
                        )}
                        {lance.resultado === "pendente" && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() =>
                                atualizarResultado.mutateAsync({
                                  consorcioId: id!,
                                  lanceId: lance.id,
                                  resultado: "contemplado",
                                }).then(() => refetch())
                              }
                            >
                              Contemplado
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() =>
                                atualizarResultado.mutateAsync({
                                  consorcioId: id!,
                                  lanceId: lance.id,
                                  resultado: "nao_contemplado",
                                }).then(() => refetch())
                              }
                            >
                              Não Contemplado
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Tab: Histórico */}
            {activeTab === "historico" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-teal-600" />
                    Histórico
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                    onClick={() => refetch()}
                  >
                    Atualizar
                  </Button>
                </div>

                {historico.length === 0 ? (
                  <EmptyState
                    title="Sem histórico"
                    description="Nenhuma alteração registrada"
                    icon={<Clock className="w-12 h-12 text-slate-300" />}
                  />
                ) : (
                  <Timeline>
                    {historico.map((item) => (
                      <TimelineItem
                        key={item.id}
                        icon={<Clock className="w-4 h-4 text-teal-500" />}
                        title={item.descricao}
                        description={item.usuario && <span className="text-xs text-slate-500">Por {item.usuario.nome}</span>}
                        date={formatDate(item.created_at)}
                        status="completed"
                      />
                    ))}
                  </Timeline>
                )}
              </Card>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modal Registrar Pagamento */}
      <Modal
        isOpen={showPagamentoModal}
        onClose={() => setShowPagamentoModal(false)}
        title="Registrar Pagamento"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Data do Pagamento"
            type="date"
            value={pagamentoData.data_pagamento}
            onChange={(e) => setPagamentoData({ ...pagamentoData, data_pagamento: e.target.value })}
          />
          <Input
            label="Valor Pago (R$)"
            type="number"
            value={pagamentoData.valor_pago}
            onChange={(e) => setPagamentoData({ ...pagamentoData, valor_pago: Number(e.target.value) })}
          />
          <Input
            label="Observação"
            placeholder="Observação opcional..."
            value={pagamentoData.observacao}
            onChange={(e) => setPagamentoData({ ...pagamentoData, observacao: e.target.value })}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowPagamentoModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleRegistrarPagamento}
            disabled={registrarPagamento.isPending}
            leftIcon={registrarPagamento.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : undefined}
          >
            {registrarPagamento.isPending ? "Salvando..." : "Confirmar"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Novo Lance */}
      <Modal
        isOpen={showLanceModal}
        onClose={() => setShowLanceModal(false)}
        title="Registrar Lance"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Data da Assembleia"
            type="date"
            value={lanceData.data_assembleia}
            onChange={(e) => setLanceData({ ...lanceData, data_assembleia: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Lance</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20"
              value={lanceData.tipo_lance}
              onChange={(e) => setLanceData({ ...lanceData, tipo_lance: e.target.value as "livre" | "fixo" | "embutido" })}
            >
              <option value="livre">Livre</option>
              <option value="fixo">Fixo</option>
              <option value="embutido">Embutido</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor do Lance (R$)"
              type="number"
              value={lanceData.valor_lance}
              onChange={(e) => setLanceData({ ...lanceData, valor_lance: Number(e.target.value) })}
            />
            <Input
              label="Percentual (%)"
              type="number"
              value={lanceData.percentual_lance}
              onChange={(e) => setLanceData({ ...lanceData, percentual_lance: Number(e.target.value) })}
            />
          </div>
          <Input
            label="Observação"
            placeholder="Observação opcional..."
            value={lanceData.observacao}
            onChange={(e) => setLanceData({ ...lanceData, observacao: e.target.value })}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowLanceModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleRegistrarLance}
            disabled={registrarLance.isPending || !lanceData.data_assembleia}
            leftIcon={registrarLance.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : undefined}
          >
            {registrarLance.isPending ? "Salvando..." : "Registrar"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Marcar Contemplado */}
      <Modal
        isOpen={showContemplarModal}
        onClose={() => setShowContemplarModal(false)}
        title="Marcar como Contemplado"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Ao marcar como contemplado, o status do consórcio será alterado.
          </p>
          <Input
            label="Data da Contemplação"
            type="date"
            value={dataContemplacao}
            onChange={(e) => setDataContemplacao(e.target.value)}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowContemplarModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleMarcarContemplado}
            disabled={marcarContemplado.isPending}
            leftIcon={marcarContemplado.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
          >
            {marcarContemplado.isPending ? "Salvando..." : "Confirmar"}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
