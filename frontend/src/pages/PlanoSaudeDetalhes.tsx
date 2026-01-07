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
  Users,
  Heart,
  Shield,
  TrendingUp,
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
  usePlanoSaude,
  useAddBeneficiario,
  useRemoveBeneficiario,
  useAddCarencia,
  useMarcarCarenciaCumprida,
  useRegistrarReajuste,
} from "../hooks/usePlanosSaude";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-BR");

const statusBadge: Record<string, "success" | "warning" | "error" | "neutral"> = {
  ativo: "success",
  suspenso: "warning",
  cancelado: "error",
};

const tipoPlanoLabels: Record<string, string> = {
  individual: "Individual",
  familiar: "Familiar",
  empresarial: "Empresarial",
  adesao: "Adesão",
};

const acomodacaoLabels: Record<string, string> = {
  enfermaria: "Enfermaria",
  apartamento: "Apartamento",
};

const abrangenciaLabels: Record<string, string> = {
  municipal: "Municipal",
  estadual: "Estadual",
  nacional: "Nacional",
};

export default function PlanoSaudeDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: plano, isLoading, error, refetch } = usePlanoSaude(id);
  const addBeneficiario = useAddBeneficiario();
  const removeBeneficiario = useRemoveBeneficiario();
  const addCarencia = useAddCarencia();
  const marcarCarenciaCumprida = useMarcarCarenciaCumprida();
  const registrarReajuste = useRegistrarReajuste();

  const [activeTab, setActiveTab] = useState<"beneficiarios" | "carencias" | "reajustes" | "historico">("beneficiarios");
  const [showBeneficiarioModal, setShowBeneficiarioModal] = useState(false);
  const [showCarenciaModal, setShowCarenciaModal] = useState(false);
  const [showReajusteModal, setShowReajusteModal] = useState(false);

  const [novoBeneficiario, setNovoBeneficiario] = useState({
    nome: "",
    cpf: "",
    data_nascimento: "",
    tipo_beneficiario: "dependente" as "titular" | "dependente",
    parentesco: "",
    numero_carteirinha: "",
    valor_mensalidade_individual: 0,
  });

  const [novaCarencia, setNovaCarencia] = useState({
    procedimento: "",
    data_inicio_carencia: "",
    data_fim_carencia: "",
    dias_carencia: 0,
    observacao: "",
  });

  const [novoReajuste, setNovoReajuste] = useState({
    data_reajuste: new Date().toISOString().split("T")[0],
    valor_novo: 0,
    tipo_reajuste: "anual" as "anual" | "faixa_etaria" | "sinistralidade" | "outros",
    observacao: "",
  });

  if (error) {
    return (
      <PageLayout title="Plano de Saúde" subtitle="Erro ao carregar">
        <ErrorState
          title="Plano não encontrado"
          description="O plano de saúde que você está procurando não existe ou foi removido."
          action={{
            label: "Voltar para Planos",
            onClick: () => navigate("/planos-saude"),
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

  if (!plano) return null;

  const beneficiarios = plano.plano_beneficiarios || [];
  const carencias = plano.plano_carencias || [];
  const reajustes = plano.plano_reajustes || [];
  const historico = plano.plano_historico || [];

  const beneficiariosAtivos = beneficiarios.filter((b) => b.ativo);
  const carenciasPendentes = carencias.filter((c) => !c.cumprida);
  const custoTotalBeneficiarios = beneficiarios
    .filter((b) => b.ativo)
    .reduce((acc, b) => acc + (b.valor_mensalidade_individual || 0), 0);

  const handleAddBeneficiario = async () => {
    if (!novoBeneficiario.nome || !novoBeneficiario.cpf) return;

    try {
      await addBeneficiario.mutateAsync({
        planoId: id!,
        data: novoBeneficiario,
      });
      setShowBeneficiarioModal(false);
      setNovoBeneficiario({
        nome: "",
        cpf: "",
        data_nascimento: "",
        tipo_beneficiario: "dependente",
        parentesco: "",
        numero_carteirinha: "",
        valor_mensalidade_individual: 0,
      });
      refetch();
    } catch (error) {
      console.error("Erro ao adicionar beneficiário:", error);
    }
  };

  const handleRemoveBeneficiario = async (beneficiarioId: string) => {
    if (!confirm("Tem certeza que deseja remover este beneficiário?")) return;

    try {
      await removeBeneficiario.mutateAsync({
        planoId: id!,
        beneficiarioId,
      });
      refetch();
    } catch (error) {
      console.error("Erro ao remover beneficiário:", error);
    }
  };

  const handleAddCarencia = async () => {
    if (!novaCarencia.procedimento || !novaCarencia.data_fim_carencia) return;

    try {
      await addCarencia.mutateAsync({
        planoId: id!,
        data: novaCarencia,
      });
      setShowCarenciaModal(false);
      setNovaCarencia({
        procedimento: "",
        data_inicio_carencia: "",
        data_fim_carencia: "",
        dias_carencia: 0,
        observacao: "",
      });
      refetch();
    } catch (error) {
      console.error("Erro ao adicionar carência:", error);
    }
  };

  const handleMarcarCarenciaCumprida = async (carenciaId: string) => {
    try {
      await marcarCarenciaCumprida.mutateAsync({
        planoId: id!,
        carenciaId,
      });
      refetch();
    } catch (error) {
      console.error("Erro ao marcar carência:", error);
    }
  };

  const handleRegistrarReajuste = async () => {
    if (!novoReajuste.valor_novo) return;

    try {
      await registrarReajuste.mutateAsync({
        planoId: id!,
        data: novoReajuste,
      });
      setShowReajusteModal(false);
      setNovoReajuste({
        data_reajuste: new Date().toISOString().split("T")[0],
        valor_novo: 0,
        tipo_reajuste: "anual",
        observacao: "",
      });
      refetch();
    } catch (error) {
      console.error("Erro ao registrar reajuste:", error);
    }
  };

  return (
    <PageLayout
      title={`Plano ${plano.numero_contrato}`}
      subtitle={plano.operadora}
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
              leftIcon={<TrendingUp className="w-4 h-4" />}
              onClick={() => setShowReajusteModal(true)}
            >
              Registrar Reajuste
            </Button>
            <Button leftIcon={<Edit className="w-4 h-4" />}>Editar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info do Plano */}
          <div className="space-y-6">
            <Card>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <Heart className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Operadora</p>
                    <p className="font-semibold text-slate-800">{plano.operadora}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Contrato</p>
                  <p className="text-sm font-medium text-slate-800">{plano.numero_contrato}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Tipo de Plano</p>
                    <Badge variant="info">{tipoPlanoLabels[plano.tipo_plano]}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Acomodação</p>
                    <Badge variant="neutral">{acomodacaoLabels[plano.acomodacao]}</Badge>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Abrangência</p>
                  <Badge variant="info">{abrangenciaLabels[plano.abrangencia]}</Badge>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Mensalidade</p>
                  <p className="text-xl font-bold text-pink-600">
                    {formatCurrency(plano.valor_mensalidade)}
                  </p>
                  {plano.coparticipacao && (
                    <p className="text-xs text-slate-500 mt-1">
                      Com coparticipação {plano.percentual_coparticipacao ? `(${plano.percentual_coparticipacao}%)` : ""}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <Badge variant={statusBadge[plano.status]}>
                    {plano.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <User className="text-pink-500 w-5 h-5" />
                  <div>
                    <p className="font-medium text-slate-800">
                      {plano.cliente?.nome || plano.clientes?.nome}
                    </p>
                    <p className="text-sm text-slate-500">
                      {plano.cliente?.telefone || plano.clientes?.telefone}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Data de Contratação</p>
                  <p className="text-sm text-slate-800">{formatDate(plano.data_contratacao)}</p>
                </div>

                {plano.ans_registro && (
                  <div>
                    <p className="text-xs text-slate-500">Registro ANS</p>
                    <p className="text-sm text-slate-800">{plano.ans_registro}</p>
                  </div>
                )}

                {plano.data_ultimo_reajuste && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      <p className="text-sm font-medium text-amber-700">
                        Último reajuste: {formatDate(plano.data_ultimo_reajuste)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Resumo */}
            <Card>
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Resumo</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Beneficiários Ativos</span>
                  <span className="font-medium text-slate-800">{beneficiariosAtivos.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Carências Pendentes</span>
                  <span className="font-medium text-amber-600">{carenciasPendentes.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Custo Total</span>
                  <span className="font-medium text-pink-600">
                    {formatCurrency(plano.valor_mensalidade + custoTotalBeneficiarios)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Reajustes</span>
                  <span className="font-medium text-slate-800">{reajustes.length}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Conteúdo Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
              {[
                { id: "beneficiarios", label: "Beneficiários", icon: Users, count: beneficiarios.length },
                { id: "carencias", label: "Carências", icon: Clock, count: carencias.length },
                { id: "reajustes", label: "Reajustes", icon: TrendingUp, count: reajustes.length },
                { id: "historico", label: "Histórico", icon: Clock, count: historico.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-pink-500 text-pink-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  <span className="px-1.5 py-0.5 text-xs bg-slate-100 rounded-full">{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Tab: Beneficiários */}
            {activeTab === "beneficiarios" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-pink-600" />
                    Beneficiários
                  </h3>
                  <Button
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowBeneficiarioModal(true)}
                  >
                    Adicionar
                  </Button>
                </div>

                {beneficiarios.length === 0 ? (
                  <EmptyState
                    title="Nenhum beneficiário cadastrado"
                    description="Adicione os beneficiários deste plano"
                    icon={<Users className="w-12 h-12 text-slate-300" />}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Nome</th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">CPF</th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Tipo</th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Carteirinha</th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Mensalidade</th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Status</th>
                          <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {beneficiarios.map((beneficiario) => (
                          <tr key={beneficiario.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-slate-800">{beneficiario.nome}</p>
                              {beneficiario.parentesco && (
                                <p className="text-xs text-slate-500">{beneficiario.parentesco}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{beneficiario.cpf}</td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={beneficiario.tipo_beneficiario === "titular" ? "info" : "neutral"}
                                size="sm"
                              >
                                {beneficiario.tipo_beneficiario === "titular" ? "Titular" : "Dependente"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {beneficiario.numero_carteirinha || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {beneficiario.valor_mensalidade_individual
                                ? formatCurrency(beneficiario.valor_mensalidade_individual)
                                : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={beneficiario.ativo ? "success" : "neutral"} size="sm">
                                {beneficiario.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleRemoveBeneficiario(beneficiario.id)}
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

            {/* Tab: Carências */}
            {activeTab === "carencias" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-pink-600" />
                    Carências
                  </h3>
                  <Button
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowCarenciaModal(true)}
                  >
                    Adicionar
                  </Button>
                </div>

                {carencias.length === 0 ? (
                  <EmptyState
                    title="Nenhuma carência registrada"
                    description="Registre as carências do plano"
                    icon={<Clock className="w-12 h-12 text-slate-300" />}
                  />
                ) : (
                  <div className="space-y-3">
                    {carencias.map((carencia) => (
                      <div
                        key={carencia.id}
                        className={`p-4 border rounded-lg ${
                          carencia.cumprida
                            ? "border-emerald-200 bg-emerald-50/50"
                            : "border-amber-200 bg-amber-50/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-800">{carencia.procedimento}</p>
                            <p className="text-sm text-slate-500 mt-1">
                              De {formatDate(carencia.data_inicio_carencia)} até{" "}
                              {formatDate(carencia.data_fim_carencia)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={carencia.cumprida ? "success" : "warning"} size="sm">
                              {carencia.cumprida ? "Cumprida" : "Pendente"}
                            </Badge>
                            {!carencia.cumprida && (
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<CheckCircle className="w-3 h-3" />}
                                onClick={() => handleMarcarCarenciaCumprida(carencia.id)}
                              >
                                Marcar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Tab: Reajustes */}
            {activeTab === "reajustes" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-pink-600" />
                    Histórico de Reajustes
                  </h3>
                </div>

                {reajustes.length === 0 ? (
                  <EmptyState
                    title="Nenhum reajuste registrado"
                    description="Os reajustes aparecerão aqui"
                    icon={<TrendingUp className="w-12 h-12 text-slate-300" />}
                  />
                ) : (
                  <div className="space-y-3">
                    {reajustes.map((reajuste) => (
                      <div
                        key={reajuste.id}
                        className="p-4 border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-slate-500">{formatDate(reajuste.data_reajuste)}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              {formatCurrency(reajuste.valor_anterior)} → {formatCurrency(reajuste.valor_novo)}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={reajuste.percentual_reajuste > 0 ? "error" : "success"}
                              size="sm"
                            >
                              {reajuste.percentual_reajuste > 0 ? "+" : ""}
                              {reajuste.percentual_reajuste.toFixed(2)}%
                            </Badge>
                            {reajuste.tipo_reajuste && (
                              <p className="text-xs text-slate-500 mt-1">
                                {reajuste.tipo_reajuste.charAt(0).toUpperCase() +
                                  reajuste.tipo_reajuste.slice(1).replace("_", " ")}
                              </p>
                            )}
                          </div>
                        </div>
                        {reajuste.observacao && (
                          <p className="text-xs text-slate-500 mt-2">{reajuste.observacao}</p>
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
                    <Clock className="w-5 h-5 text-pink-600" />
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
                        icon={<Clock className="w-4 h-4 text-pink-500" />}
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

      {/* Modal Adicionar Beneficiário */}
      <Modal
        isOpen={showBeneficiarioModal}
        onClose={() => setShowBeneficiarioModal(false)}
        title="Adicionar Beneficiário"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nome Completo"
            placeholder="Nome do beneficiário"
            value={novoBeneficiario.nome}
            onChange={(e) => setNovoBeneficiario({ ...novoBeneficiario, nome: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="CPF"
              placeholder="000.000.000-00"
              value={novoBeneficiario.cpf}
              onChange={(e) => setNovoBeneficiario({ ...novoBeneficiario, cpf: e.target.value })}
            />
            <Input
              label="Data de Nascimento"
              type="date"
              value={novoBeneficiario.data_nascimento}
              onChange={(e) => setNovoBeneficiario({ ...novoBeneficiario, data_nascimento: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500/20"
                value={novoBeneficiario.tipo_beneficiario}
                onChange={(e) =>
                  setNovoBeneficiario({
                    ...novoBeneficiario,
                    tipo_beneficiario: e.target.value as "titular" | "dependente",
                  })
                }
              >
                <option value="titular">Titular</option>
                <option value="dependente">Dependente</option>
              </select>
            </div>
            <Input
              label="Parentesco"
              placeholder="Ex: Cônjuge, Filho(a)"
              value={novoBeneficiario.parentesco}
              onChange={(e) => setNovoBeneficiario({ ...novoBeneficiario, parentesco: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Carteirinha"
              placeholder="Número da carteirinha"
              value={novoBeneficiario.numero_carteirinha}
              onChange={(e) => setNovoBeneficiario({ ...novoBeneficiario, numero_carteirinha: e.target.value })}
            />
            <Input
              label="Mensalidade Individual (R$)"
              type="number"
              value={novoBeneficiario.valor_mensalidade_individual}
              onChange={(e) =>
                setNovoBeneficiario({
                  ...novoBeneficiario,
                  valor_mensalidade_individual: Number(e.target.value),
                })
              }
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowBeneficiarioModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAddBeneficiario}
            disabled={addBeneficiario.isPending || !novoBeneficiario.nome}
            leftIcon={addBeneficiario.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : undefined}
          >
            {addBeneficiario.isPending ? "Salvando..." : "Adicionar"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Adicionar Carência */}
      <Modal
        isOpen={showCarenciaModal}
        onClose={() => setShowCarenciaModal(false)}
        title="Adicionar Carência"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Procedimento"
            placeholder="Ex: Cirurgia, Parto, etc."
            value={novaCarencia.procedimento}
            onChange={(e) => setNovaCarencia({ ...novaCarencia, procedimento: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data Início"
              type="date"
              value={novaCarencia.data_inicio_carencia}
              onChange={(e) => setNovaCarencia({ ...novaCarencia, data_inicio_carencia: e.target.value })}
            />
            <Input
              label="Data Fim"
              type="date"
              value={novaCarencia.data_fim_carencia}
              onChange={(e) => setNovaCarencia({ ...novaCarencia, data_fim_carencia: e.target.value })}
            />
          </div>
          <Input
            label="Dias de Carência"
            type="number"
            value={novaCarencia.dias_carencia}
            onChange={(e) => setNovaCarencia({ ...novaCarencia, dias_carencia: Number(e.target.value) })}
          />
          <Input
            label="Observação"
            placeholder="Observação opcional"
            value={novaCarencia.observacao}
            onChange={(e) => setNovaCarencia({ ...novaCarencia, observacao: e.target.value })}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowCarenciaModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAddCarencia}
            disabled={addCarencia.isPending || !novaCarencia.procedimento}
            leftIcon={addCarencia.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : undefined}
          >
            {addCarencia.isPending ? "Salvando..." : "Adicionar"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Registrar Reajuste */}
      <Modal
        isOpen={showReajusteModal}
        onClose={() => setShowReajusteModal(false)}
        title="Registrar Reajuste"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Valor atual: <strong>{formatCurrency(plano.valor_mensalidade)}</strong>
          </p>
          <Input
            label="Data do Reajuste"
            type="date"
            value={novoReajuste.data_reajuste}
            onChange={(e) => setNovoReajuste({ ...novoReajuste, data_reajuste: e.target.value })}
          />
          <Input
            label="Novo Valor (R$)"
            type="number"
            value={novoReajuste.valor_novo}
            onChange={(e) => setNovoReajuste({ ...novoReajuste, valor_novo: Number(e.target.value) })}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Reajuste</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500/20"
              value={novoReajuste.tipo_reajuste}
              onChange={(e) =>
                setNovoReajuste({
                  ...novoReajuste,
                  tipo_reajuste: e.target.value as typeof novoReajuste.tipo_reajuste,
                })
              }
            >
              <option value="anual">Anual</option>
              <option value="faixa_etaria">Faixa Etária</option>
              <option value="sinistralidade">Sinistralidade</option>
              <option value="outros">Outros</option>
            </select>
          </div>
          <Input
            label="Observação"
            placeholder="Observação opcional"
            value={novoReajuste.observacao}
            onChange={(e) => setNovoReajuste({ ...novoReajuste, observacao: e.target.value })}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowReajusteModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleRegistrarReajuste}
            disabled={registrarReajuste.isPending || !novoReajuste.valor_novo}
            leftIcon={registrarReajuste.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : undefined}
          >
            {registrarReajuste.isPending ? "Salvando..." : "Registrar"}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
