import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Shield,
  Download,
  Edit,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  User,
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
  useApolice,
  useAddCobertura,
  useRemoveCobertura,
  useCreateEndosso,
  useUpdateEndossoStatus,
  type CoberturaData,
  type EndossoData,
} from "../hooks/useApolices";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value
  );

const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-BR");

const tipoEndossoLabels: Record<string, string> = {
  inclusao: "Inclusão",
  exclusao: "Exclusão",
  alteracao: "Alteração",
  cancelamento: "Cancelamento",
  renovacao: "Renovação",
};

const statusEndossoBadge: Record<
  string,
  "warning" | "success" | "error" | "neutral" | "info"
> = {
  pendente: "warning",
  aprovado: "success",
  rejeitado: "error",
  cancelado: "neutral",
  emitido: "success",
  rascunho: "neutral",
  enviado: "info",
  aceito: "success",
};

export default function ApoliceDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: apolice, isLoading, error, refetch } = useApolice(id);
  const addCobertura = useAddCobertura();
  const removeCobertura = useRemoveCobertura();
  const createEndosso = useCreateEndosso();
  const updateEndossoStatus = useUpdateEndossoStatus();

  const [showAddCoberturaModal, setShowAddCoberturaModal] = useState(false);
  const [showAddEndossoModal, setShowAddEndossoModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "coberturas" | "endossos" | "historico"
  >("coberturas");

  const [novaCobertura, setNovaCobertura] = useState<CoberturaData>({
    nome: "",
    descricao: "",
    limite: 0,
    franquia: 0,
    premio: 0,
    carencia_dias: 0,
    ativa: true,
  });

  const [novoEndosso, setNovoEndosso] = useState<EndossoData>({
    tipo: "alteracao",
    descricao: "",
    data_emissao: new Date().toISOString().split("T")[0],
    diferenca_premio: 0,
    observacao: "",
  });

  if (error) {
    return (
      <PageLayout title="Apólice" subtitle="Erro ao carregar">
        <ErrorState
          title="Apólice não encontrada"
          description="A apólice que você está procurando não existe ou foi removida."
          action={{
            label: "Voltar para Apólices",
            onClick: () => navigate("/apolices"),
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

  if (!apolice) return null;

  const coberturas = apolice.apolice_coberturas || [];
  const endossos = apolice.apolice_endossos || [];
  const historico = apolice.apolice_historico || [];

  const diasParaVencimento = Math.ceil(
    (new Date(apolice.data_vencimento).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const handleAddCobertura = async () => {
    if (!novaCobertura.nome || novaCobertura.limite <= 0) return;

    try {
      await addCobertura.mutateAsync({
        apoliceId: id!,
        data: novaCobertura,
      });
      setShowAddCoberturaModal(false);
      setNovaCobertura({
        nome: "",
        descricao: "",
        limite: 0,
        franquia: 0,
        premio: 0,
        carencia_dias: 0,
        ativa: true,
      });
      refetch();
    } catch (error) {
      console.error("Erro ao adicionar cobertura:", error);
    }
  };

  const handleRemoveCobertura = async (coberturaId: string) => {
    if (!confirm("Tem certeza que deseja remover esta cobertura?")) return;

    try {
      await removeCobertura.mutateAsync({
        apoliceId: id!,
        coberturaId,
      });
      refetch();
    } catch (error) {
      console.error("Erro ao remover cobertura:", error);
    }
  };

  const handleAddEndosso = async () => {
    if (!novoEndosso.descricao) return;

    try {
      await createEndosso.mutateAsync({
        apoliceId: id!,
        data: novoEndosso,
      });
      setShowAddEndossoModal(false);
      setNovoEndosso({
        tipo: "alteracao",
        descricao: "",
        data_emissao: new Date().toISOString().split("T")[0],
        diferenca_premio: 0,
        observacao: "",
      });
      refetch();
    } catch (error) {
      console.error("Erro ao criar endosso:", error);
    }
  };

  const handleUpdateEndossoStatus = async (
    endossoId: string,
    status: string
  ) => {
    try {
      await updateEndossoStatus.mutateAsync({
        apoliceId: id!,
        endossoId,
        status,
      });
      refetch();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const getHistoricoIcon = (tipo: string) => {
    switch (tipo) {
      case "criacao":
        return <Plus className="w-4 h-4 text-emerald-500" />;
      case "atualizacao":
        return <Edit className="w-4 h-4 text-blue-500" />;
      case "cobertura_adicionada":
        return <Shield className="w-4 h-4 text-violet-500" />;
      case "cobertura_removida":
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case "endosso_criado":
        return <FileText className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <PageLayout
      title={`Apólice ${apolice.numero_apolice}`}
      subtitle={apolice.seguradora}
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
            <Button
              variant="outline"
              leftIcon={<Download className="w-4 h-4" />}
            >
              PDF
            </Button>
            <Button leftIcon={<Edit className="w-4 h-4" />}>Editar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info da Apolice */}
          <div className="space-y-6">
            <Card>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">
                    Número da Apólice
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {apolice.numero_apolice}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Seguradora</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {apolice.seguradora}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Ramo</p>
                  <Badge variant="info">{apolice.ramo}</Badge>
                  <div className="flex items-center gap-3 mt-2">
                    <User className="text-violet-500 w-5 h-5" />
                    <div>
                      <p className="font-medium text-slate-800">
                        {apolice.cliente?.nome}
                      </p>
                      <p className="text-sm text-slate-500">
                        {apolice.cliente?.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 mb-1">Vigência</p>
                    <p className="text-sm text-slate-800">
                      {formatDate(apolice.data_inicio)} até{" "}
                      {formatDate(apolice.data_vencimento)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Prêmio Anual</p>
                  <p className="text-lg font-bold text-violet-600">
                    {formatCurrency(apolice.valor_premio)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <Badge
                    variant={
                      apolice.status === "vigente"
                        ? "success"
                        : apolice.status === "vencida"
                        ? "error"
                        : "neutral"
                    }
                  >
                    {apolice.status}
                  </Badge>
                </div>

                {diasParaVencimento <= 30 && diasParaVencimento > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <p className="text-sm font-medium text-amber-700">
                        Vence em {diasParaVencimento} dias
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Resumo de Coberturas */}
            <Card>
              <h4 className="text-sm font-semibold text-slate-800 mb-3">
                Resumo
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Coberturas Ativas</span>
                  <span className="font-medium text-slate-800">
                    {coberturas.filter((c) => c.ativa).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Limite</span>
                  <span className="font-medium text-slate-800">
                    {formatCurrency(
                      coberturas.reduce((acc, c) => acc + c.limite, 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Endossos</span>
                  <span className="font-medium text-slate-800">
                    {endossos.length}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Conteudo Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
              {[
                {
                  id: "coberturas",
                  label: "Coberturas",
                  icon: Shield,
                  count: coberturas.length,
                },
                {
                  id: "endossos",
                  label: "Endossos",
                  icon: FileText,
                  count: endossos.length,
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
                      ? "border-violet-500 text-violet-600"
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

            {/* Tab: Coberturas */}
            {activeTab === "coberturas" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-violet-600" />
                    Coberturas
                  </h3>
                  <Button
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowAddCoberturaModal(true)}
                  >
                    Adicionar
                  </Button>
                </div>

                {coberturas.length === 0 ? (
                  <EmptyState
                    title="Nenhuma cobertura cadastrada"
                    description="Adicione as coberturas desta apólice"
                    icon={<Shield className="w-12 h-12 text-slate-300" />}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                            Cobertura
                          </th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                            Limite
                          </th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                            Franquia
                          </th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                            Prêmio
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
                        {coberturas.map((cobertura) => (
                          <tr key={cobertura.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-slate-800">
                                {cobertura.nome}
                              </p>
                              {cobertura.descricao && (
                                <p className="text-xs text-slate-500">
                                  {cobertura.descricao}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatCurrency(cobertura.limite)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatCurrency(cobertura.franquia)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {cobertura.premio
                                ? formatCurrency(cobertura.premio)
                                : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  cobertura.ativa ? "success" : "neutral"
                                }
                                size="sm"
                              >
                                {cobertura.ativa ? "Ativa" : "Inativa"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() =>
                                  handleRemoveCobertura(cobertura.id)
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {/* Tab: Endossos */}
            {activeTab === "endossos" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-600" />
                    Endossos
                  </h3>
                  <Button
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowAddEndossoModal(true)}
                  >
                    Novo Endosso
                  </Button>
                </div>

                {endossos.length === 0 ? (
                  <EmptyState
                    title="Nenhum endosso"
                    description="Não há endossos registrados para esta apólice"
                    icon={<FileText className="w-12 h-12 text-slate-300" />}
                  />
                ) : (
                  <div className="space-y-4">
                    {endossos.map((endosso) => (
                      <div
                        key={endosso.id}
                        className="p-4 border border-slate-200 rounded-lg hover:border-violet-200 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              {endosso.numero_endosso && (
                                <p className="text-sm font-semibold text-slate-800">
                                  {endosso.numero_endosso}
                                </p>
                              )}
                              <Badge variant="info" size="sm">
                                {tipoEndossoLabels[endosso.tipo]}
                              </Badge>
                              <Badge
                                variant={
                                  statusEndossoBadge[endosso.status] ||
                                  "neutral"
                                }
                                size="sm"
                              >
                                {endosso.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Emitido em {formatDate(endosso.data_emissao)}
                              {endosso.usuario &&
                                ` por ${endosso.usuario.nome}`}
                            </p>
                          </div>
                          {endosso.diferenca_premio !== undefined &&
                            endosso.diferenca_premio !== 0 && (
                              <p
                                className={`text-sm font-semibold ${
                                  endosso.diferenca_premio > 0
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              >
                                {endosso.diferenca_premio > 0 ? "+" : ""}
                                {formatCurrency(endosso.diferenca_premio)}
                              </p>
                            )}
                        </div>
                        <p className="text-sm text-slate-700">
                          {endosso.descricao}
                        </p>
                        {endosso.observacao && (
                          <p className="text-xs text-slate-500 mt-2 italic">
                            {endosso.observacao}
                          </p>
                        )}
                        {endosso.status === "pendente" && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              leftIcon={<CheckCircle className="w-3 h-3" />}
                              onClick={() =>
                                handleUpdateEndossoStatus(
                                  endosso.id,
                                  "aprovado"
                                )
                              }
                            >
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              leftIcon={<XCircle className="w-3 h-3" />}
                              onClick={() =>
                                handleUpdateEndossoStatus(
                                  endosso.id,
                                  "rejeitado"
                                )
                              }
                            >
                              Rejeitar
                            </Button>
                          </div>
                        )}
                        {endosso.status === "rascunho" && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              leftIcon={<CheckCircle className="w-3 h-3" />}
                              onClick={() =>
                                handleUpdateEndossoStatus(endosso.id, "emitido")
                              }
                            >
                              Marcar como Emitido
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Tab: Historico */}
            {activeTab === "historico" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-violet-600" />
                    Histórico de Alterações
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
                        icon={getHistoricoIcon(item.tipo_evento)}
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

      {/* Modal Adicionar Cobertura */}
      <Modal
        isOpen={showAddCoberturaModal}
        onClose={() => setShowAddCoberturaModal(false)}
        title="Adicionar Cobertura"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nome da Cobertura"
            placeholder="Ex: Casco, RCF-DM, etc."
            value={novaCobertura.nome}
            onChange={(e) =>
              setNovaCobertura({ ...novaCobertura, nome: e.target.value })
            }
          />
          <Input
            label="Descrição"
            placeholder="Descrição opcional"
            value={novaCobertura.descricao}
            onChange={(e) =>
              setNovaCobertura({ ...novaCobertura, descricao: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Limite (R$)"
              type="number"
              value={novaCobertura.limite}
              onChange={(e) =>
                setNovaCobertura({
                  ...novaCobertura,
                  limite: Number(e.target.value),
                })
              }
            />
            <Input
              label="Franquia (R$)"
              type="number"
              value={novaCobertura.franquia}
              onChange={(e) =>
                setNovaCobertura({
                  ...novaCobertura,
                  franquia: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prêmio (R$)"
              type="number"
              value={novaCobertura.premio}
              onChange={(e) =>
                setNovaCobertura({
                  ...novaCobertura,
                  premio: Number(e.target.value),
                })
              }
            />
            <Input
              label="Carência (dias)"
              type="number"
              value={novaCobertura.carencia_dias}
              onChange={(e) =>
                setNovaCobertura({
                  ...novaCobertura,
                  carencia_dias: Number(e.target.value),
                })
              }
            />
          </div>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowAddCoberturaModal(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAddCobertura}
            disabled={addCobertura.isPending || !novaCobertura.nome}
            leftIcon={
              addCobertura.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : undefined
            }
          >
            {addCobertura.isPending ? "Salvando..." : "Adicionar"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Criar Endosso */}
      <Modal
        isOpen={showAddEndossoModal}
        onClose={() => setShowAddEndossoModal(false)}
        title="Novo Endosso"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo de Endosso
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20"
              value={novoEndosso.tipo}
              onChange={(e) =>
                setNovoEndosso({
                  ...novoEndosso,
                  tipo: e.target.value as EndossoData["tipo"],
                })
              }
            >
              <option value="inclusao">Inclusão</option>
              <option value="exclusao">Exclusão</option>
              <option value="alteracao">Alteração</option>
              <option value="cancelamento">Cancelamento</option>
              <option value="renovacao">Renovação</option>
            </select>
          </div>
          <Input
            label="Descrição"
            placeholder="Descreva o endosso..."
            value={novoEndosso.descricao}
            onChange={(e) =>
              setNovoEndosso({ ...novoEndosso, descricao: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data de Emissão"
              type="date"
              value={novoEndosso.data_emissao}
              onChange={(e) =>
                setNovoEndosso({ ...novoEndosso, data_emissao: e.target.value })
              }
            />
            <Input
              label="Diferença no Prêmio (R$)"
              type="number"
              value={novoEndosso.diferenca_premio}
              onChange={(e) =>
                setNovoEndosso({
                  ...novoEndosso,
                  diferenca_premio: Number(e.target.value),
                })
              }
              helperText="Positivo = aumento, Negativo = redução"
            />
          </div>
          <Input
            label="Observações"
            placeholder="Observações adicionais..."
            value={novoEndosso.observacao}
            onChange={(e) =>
              setNovoEndosso({ ...novoEndosso, observacao: e.target.value })
            }
          />
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowAddEndossoModal(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAddEndosso}
            disabled={createEndosso.isPending || !novoEndosso.descricao}
            leftIcon={
              createEndosso.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : undefined
            }
          >
            {createEndosso.isPending ? "Criando..." : "Criar Endosso"}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
