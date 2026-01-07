import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Edit,
  RefreshCw,
  CheckCircle,
  Clock,
  DollarSign,
  User,
  Building,
  TrendingDown,
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
  useFinanciamento,
  useRegistrarPagamentoParcelaFinanciamento,
  useRegistrarAmortizacao,
  useGerarParcelasFinanciamento,
  useMarcarQuitado,
} from "../hooks/useFinanciamentos";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value
  );

const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-BR");

const statusBadge: Record<
  string,
  "success" | "warning" | "error" | "info" | "neutral"
> = {
  ativo: "success",
  quitado: "info",
  atrasado: "error",
  renegociado: "warning",
};

const tipoFinanciamentoLabels: Record<string, string> = {
  imovel: "Imóvel",
  veiculo: "Veículo",
  pessoal: "Pessoal",
  consignado: "Consignado",
  outros: "Outros",
};

const statusParcelaConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "error" | "info" }
> = {
  pago: { label: "Pago", variant: "success" },
  pendente: { label: "Pendente", variant: "warning" },
  atrasado: { label: "Atrasado", variant: "error" },
  quitado_amortizacao: { label: "Amortizado", variant: "info" },
};

export default function FinanciamentoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: financiamento,
    isLoading,
    error,
    refetch,
  } = useFinanciamento(id);
  const registrarPagamento = useRegistrarPagamentoParcelaFinanciamento();
  const registrarAmortizacao = useRegistrarAmortizacao();
  const gerarParcelas = useGerarParcelasFinanciamento();
  const marcarQuitado = useMarcarQuitado();

  const [activeTab, setActiveTab] = useState<
    "parcelas" | "amortizacoes" | "historico"
  >("parcelas");
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showAmortizacaoModal, setShowAmortizacaoModal] = useState(false);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<string | null>(
    null
  );

  const [pagamentoData, setPagamentoData] = useState({
    data_pagamento: new Date().toISOString().split("T")[0],
    valor_pago: 0,
    multa: 0,
    juros_mora: 0,
    observacao: "",
  });

  const [amortizacaoData, setAmortizacaoData] = useState({
    data_amortizacao: new Date().toISOString().split("T")[0],
    valor_amortizacao: 0,
    tipo_amortizacao: "parcial" as "parcial" | "quitacao",
    reducao_tipo: "parcela" as "prazo" | "parcela",
    observacao: "",
  });

  if (error) {
    return (
      <PageLayout title="Financiamento" subtitle="Erro ao carregar">
        <ErrorState
          title="Financiamento não encontrado"
          description="O financiamento que você está procurando não existe ou foi removido."
          action={{
            label: "Voltar para Financiamentos",
            onClick: () => navigate("/financiamentos"),
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

  if (!financiamento) return null;

  const parcelas = financiamento.financiamento_parcelas || [];
  const amortizacoes = financiamento.financiamento_amortizacoes || [];
  const historico = financiamento.financiamento_historico || [];

  const parcelasPagas = parcelas.filter(
    (p) => p.status === "pago" || p.status === "quitado_amortizacao"
  ).length;
  const parcelasAtrasadas = parcelas.filter(
    (p) => p.status === "atrasado"
  ).length;
  const totalPago = parcelas
    .filter((p) => p.status === "pago")
    .reduce((acc, p) => acc + (p.valor_pago || 0), 0);
  const percentualPago =
    financiamento.prazo_meses > 0
      ? (parcelasPagas / financiamento.prazo_meses) * 100
      : 0;
  const totalAmortizado = amortizacoes.reduce(
    (acc, a) => acc + a.valor_amortizacao,
    0
  );

  const handleRegistrarPagamento = async () => {
    if (!parcelaSelecionada) return;

    try {
      await registrarPagamento.mutateAsync({
        financiamentoId: id!,
        parcelaId: parcelaSelecionada,
        data: pagamentoData,
      });
      setShowPagamentoModal(false);
      setParcelaSelecionada(null);
      setPagamentoData({
        data_pagamento: new Date().toISOString().split("T")[0],
        valor_pago: 0,
        multa: 0,
        juros_mora: 0,
        observacao: "",
      });
      refetch();
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
    }
  };

  const handleRegistrarAmortizacao = async () => {
    if (amortizacaoData.valor_amortizacao <= 0) return;

    try {
      await registrarAmortizacao.mutateAsync({
        financiamentoId: id!,
        data: amortizacaoData,
      });
      setShowAmortizacaoModal(false);
      setAmortizacaoData({
        data_amortizacao: new Date().toISOString().split("T")[0],
        valor_amortizacao: 0,
        tipo_amortizacao: "parcial",
        reducao_tipo: "parcela",
        observacao: "",
      });
      refetch();
    } catch (error) {
      console.error("Erro ao registrar amortização:", error);
    }
  };

  const handleGerarParcelas = async () => {
    if (!confirm("Deseja gerar todas as parcelas deste financiamento?")) return;

    try {
      await gerarParcelas.mutateAsync({ financiamentoId: id! });
      refetch();
    } catch (error) {
      console.error("Erro ao gerar parcelas:", error);
    }
  };

  const handleMarcarQuitado = async () => {
    if (
      !confirm("Tem certeza que deseja marcar este financiamento como quitado?")
    )
      return;

    try {
      await marcarQuitado.mutateAsync({ id: id! });
      refetch();
    } catch (error) {
      console.error("Erro ao marcar quitado:", error);
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
      title={`Financiamento ${financiamento.numero_contrato}`}
      subtitle={financiamento.instituicao_financeira}
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
            {financiamento.status === "ativo" && (
              <>
                <Button
                  variant="outline"
                  leftIcon={<TrendingDown className="w-4 h-4" />}
                  onClick={() => setShowAmortizacaoModal(true)}
                >
                  Amortização
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                  onClick={handleMarcarQuitado}
                >
                  Quitar
                </Button>
              </>
            )}
            <Button leftIcon={<Edit className="w-4 h-4" />}>Editar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info do Financiamento */}
          <div className="space-y-6">
            <Card>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Building className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Instituição</p>
                    <p className="font-semibold text-slate-800">
                      {financiamento.instituicao_financeira}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Contrato</p>
                  <p className="text-sm font-medium text-slate-800">
                    {financiamento.numero_contrato}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Tipo de Financiamento
                  </p>
                  <Badge variant="info">
                    {tipoFinanciamentoLabels[financiamento.tipo_financiamento]}
                  </Badge>
                </div>

                {financiamento.bem_financiado && (
                  <div>
                    <p className="text-xs text-slate-500">Bem Financiado</p>
                    <p className="text-sm text-slate-800">
                      {financiamento.bem_financiado}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-slate-500">Valor Financiado</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(financiamento.valor_financiado)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Valor da Parcela</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {formatCurrency(financiamento.valor_parcela)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Taxa de Juros</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {financiamento.taxa_juros
                        ? `${financiamento.taxa_juros}% a.m.`
                        : "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Saldo Devedor</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(financiamento.saldo_devedor)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <Badge variant={statusBadge[financiamento.status]}>
                    {financiamento.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <User className="text-green-500 w-5 h-5" />
                  <div>
                    <p className="font-medium text-slate-800">
                      {financiamento.cliente?.nome ||
                        financiamento.clientes?.nome}
                    </p>
                    <p className="text-sm text-slate-500">
                      {financiamento.cliente?.telefone ||
                        financiamento.clientes?.telefone}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Data de Contratação</p>
                  <p className="text-sm text-slate-800">
                    {formatDate(financiamento.data_contratacao)}
                  </p>
                </div>

                {financiamento.sistema_amortizacao && (
                  <div>
                    <p className="text-xs text-slate-500">
                      Sistema de Amortização
                    </p>
                    <Badge variant="neutral">
                      {financiamento.sistema_amortizacao}
                    </Badge>
                  </div>
                )}

                {parcelasAtrasadas > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <p className="text-sm font-medium text-red-700">
                        {parcelasAtrasadas} parcela(s) atrasada(s)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Resumo */}
            <Card>
              <h4 className="text-sm font-semibold text-slate-800 mb-3">
                Resumo de Pagamentos
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Prazo Total</span>
                  <span className="font-medium text-slate-800">
                    {financiamento.prazo_meses} meses
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Parcelas Pagas</span>
                  <span className="font-medium text-emerald-600">
                    {parcelasPagas} de {financiamento.prazo_meses}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Pago</span>
                  <span className="font-medium text-slate-800">
                    {formatCurrency(totalPago)}
                  </span>
                </div>
                {totalAmortizado > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Amortizado</span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(totalAmortizado)}
                    </span>
                  </div>
                )}

                {/* Barra de Progresso */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progresso</span>
                    <span>{percentualPago.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
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
                {
                  id: "parcelas",
                  label: "Parcelas",
                  icon: DollarSign,
                  count: parcelas.length,
                },
                {
                  id: "amortizacoes",
                  label: "Amortizações",
                  icon: TrendingDown,
                  count: amortizacoes.length,
                },
                {
                  id: "historico",
                  label: "Histórico",
                  icon: Clock,
                  count: historico.length,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                    activeTab === tab.id
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  <span className="px-1.5 py-0.5 text-xs bg-slate-100 rounded-full">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab: Parcelas */}
            {activeTab === "parcelas" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Parcelas
                  </h3>
                  {parcelas.length === 0 && (
                    <Button
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={handleGerarParcelas}
                      disabled={gerarParcelas.isPending}
                    >
                      {gerarParcelas.isPending
                        ? "Gerando..."
                        : "Gerar Parcelas"}
                    </Button>
                  )}
                </div>

                {parcelas.length === 0 ? (
                  <EmptyState
                    title="Nenhuma parcela gerada"
                    description="Clique em 'Gerar Parcelas' para criar as parcelas"
                    icon={<DollarSign className="w-12 h-12 text-slate-300" />}
                  />
                ) : (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                            Nº
                          </th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                            Vencimento
                          </th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                            Valor
                          </th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                            Pagamento
                          </th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                            Status
                          </th>
                          <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3">
                            Ações
                          </th>
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
                              <td className="px-4 py-3">
                                <p className="text-sm text-slate-600">
                                  {formatCurrency(parcela.valor_parcela)}
                                </p>
                                {parcela.valor_amortizacao && (
                                  <p className="text-xs text-slate-400">
                                    Amort:{" "}
                                    {formatCurrency(parcela.valor_amortizacao)}{" "}
                                    | Juros:{" "}
                                    {formatCurrency(parcela.valor_juros || 0)}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {parcela.data_pagamento ? (
                                  <div>
                                    <p>{formatDate(parcela.data_pagamento)}</p>
                                    <p className="text-xs text-emerald-600">
                                      {formatCurrency(
                                        parcela.valor_pago ||
                                          parcela.valor_parcela
                                      )}
                                    </p>
                                    {(parcela.multa || parcela.juros_mora) && (
                                      <p className="text-xs text-red-500">
                                        +Multa/Juros:{" "}
                                        {formatCurrency(
                                          (parcela.multa || 0) +
                                            (parcela.juros_mora || 0)
                                        )}
                                      </p>
                                    )}
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
                                {(parcela.status === "pendente" ||
                                  parcela.status === "atrasado") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={
                                      <CheckCircle className="w-3 h-3" />
                                    }
                                    onClick={() =>
                                      abrirModalPagamento(
                                        parcela.id,
                                        parcela.valor_parcela
                                      )
                                    }
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

            {/* Tab: Amortizações */}
            {activeTab === "amortizacoes" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-green-600" />
                    Amortizações Extraordinárias
                  </h3>
                  <Button
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowAmortizacaoModal(true)}
                  >
                    Nova Amortização
                  </Button>
                </div>

                {amortizacoes.length === 0 ? (
                  <EmptyState
                    title="Nenhuma amortização registrada"
                    description="Registre amortizações extraordinárias para reduzir o saldo devedor"
                    icon={<TrendingDown className="w-12 h-12 text-slate-300" />}
                  />
                ) : (
                  <div className="space-y-4">
                    {amortizacoes.map((amortizacao) => (
                      <div
                        key={amortizacao.id}
                        className="p-4 border border-slate-200 rounded-lg hover:border-green-200 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  amortizacao.tipo_amortizacao === "quitacao"
                                    ? "success"
                                    : "info"
                                }
                                size="sm"
                              >
                                {amortizacao.tipo_amortizacao === "quitacao"
                                  ? "Quitação"
                                  : "Parcial"}
                              </Badge>
                              {amortizacao.reducao_tipo && (
                                <Badge variant="neutral" size="sm">
                                  Reduz{" "}
                                  {amortizacao.reducao_tipo === "prazo"
                                    ? "Prazo"
                                    : "Parcela"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatDate(amortizacao.data_amortizacao)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(amortizacao.valor_amortizacao)}
                            </p>
                          </div>
                        </div>
                        {(amortizacao.saldo_devedor_antes ||
                          amortizacao.saldo_devedor_depois) && (
                          <div className="mt-2 text-sm text-slate-600">
                            Saldo:{" "}
                            {amortizacao.saldo_devedor_antes
                              ? formatCurrency(amortizacao.saldo_devedor_antes)
                              : "-"}{" "}
                            →{" "}
                            {amortizacao.saldo_devedor_depois
                              ? formatCurrency(amortizacao.saldo_devedor_depois)
                              : "-"}
                          </div>
                        )}
                        {amortizacao.observacao && (
                          <p className="text-xs text-slate-500 mt-2">
                            {amortizacao.observacao}
                          </p>
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
                    <Clock className="w-5 h-5 text-green-600" />
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
                        icon={<Clock className="w-4 h-4 text-green-500" />}
                        title={item.descricao}
                        description={
                          item.usuario && (
                            <span className="text-xs text-slate-500">
                              Por {item.usuario.nome}
                            </span>
                          )
                        }
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
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Data do Pagamento"
            type="date"
            value={pagamentoData.data_pagamento}
            onChange={(e) =>
              setPagamentoData({
                ...pagamentoData,
                data_pagamento: e.target.value,
              })
            }
          />
          <Input
            label="Valor Pago (R$)"
            type="number"
            value={pagamentoData.valor_pago}
            onChange={(e) =>
              setPagamentoData({
                ...pagamentoData,
                valor_pago: Number(e.target.value),
              })
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Multa (R$)"
              type="number"
              value={pagamentoData.multa}
              onChange={(e) =>
                setPagamentoData({
                  ...pagamentoData,
                  multa: Number(e.target.value),
                })
              }
            />
            <Input
              label="Juros Mora (R$)"
              type="number"
              value={pagamentoData.juros_mora}
              onChange={(e) =>
                setPagamentoData({
                  ...pagamentoData,
                  juros_mora: Number(e.target.value),
                })
              }
            />
          </div>
          <Input
            label="Observação"
            placeholder="Observação opcional..."
            value={pagamentoData.observacao}
            onChange={(e) =>
              setPagamentoData({ ...pagamentoData, observacao: e.target.value })
            }
          />
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowPagamentoModal(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRegistrarPagamento}
            disabled={registrarPagamento.isPending}
            leftIcon={
              registrarPagamento.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : undefined
            }
          >
            {registrarPagamento.isPending ? "Salvando..." : "Confirmar"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Nova Amortização */}
      <Modal
        isOpen={showAmortizacaoModal}
        onClose={() => setShowAmortizacaoModal(false)}
        title="Registrar Amortização"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Saldo devedor atual:{" "}
            <strong>{formatCurrency(financiamento.saldo_devedor)}</strong>
          </p>
          <Input
            label="Data da Amortização"
            type="date"
            value={amortizacaoData.data_amortizacao}
            onChange={(e) =>
              setAmortizacaoData({
                ...amortizacaoData,
                data_amortizacao: e.target.value,
              })
            }
          />
          <Input
            label="Valor da Amortização (R$)"
            type="number"
            value={amortizacaoData.valor_amortizacao}
            onChange={(e) =>
              setAmortizacaoData({
                ...amortizacaoData,
                valor_amortizacao: Number(e.target.value),
              })
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20"
                value={amortizacaoData.tipo_amortizacao}
                onChange={(e) =>
                  setAmortizacaoData({
                    ...amortizacaoData,
                    tipo_amortizacao: e.target.value as "parcial" | "quitacao",
                  })
                }
              >
                <option value="parcial">Parcial</option>
                <option value="quitacao">Quitação Total</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reduzir
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20"
                value={amortizacaoData.reducao_tipo}
                onChange={(e) =>
                  setAmortizacaoData({
                    ...amortizacaoData,
                    reducao_tipo: e.target.value as "prazo" | "parcela",
                  })
                }
              >
                <option value="parcela">Valor da Parcela</option>
                <option value="prazo">Prazo (nº parcelas)</option>
              </select>
            </div>
          </div>
          <Input
            label="Observação"
            placeholder="Observação opcional..."
            value={amortizacaoData.observacao}
            onChange={(e) =>
              setAmortizacaoData({
                ...amortizacaoData,
                observacao: e.target.value,
              })
            }
          />
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowAmortizacaoModal(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRegistrarAmortizacao}
            disabled={
              registrarAmortizacao.isPending ||
              amortizacaoData.valor_amortizacao <= 0
            }
            leftIcon={
              registrarAmortizacao.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : undefined
            }
          >
            {registrarAmortizacao.isPending ? "Salvando..." : "Registrar"}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
