import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertTriangle,
  Calendar,
  Edit,
  Shield,
  Wallet,
  Heart,
  Building,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  TrendingUp,
  Users,
  DollarSign,
  Car,
  Home,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import {
  Card,
  Avatar,
  Badge,
  Timeline,
  TimelineItem,
  Button,
  Skeleton,
  SkeletonList,
  ErrorState,
} from "../components/common";
import {
  useCliente,
  useClienteApolices,
  useClienteSinistros,
  useClienteConsorcios,
  useClientePlanosSaude,
  useClienteFinanciamentos,
  useClienteCotacoes,
  useClienteResumo360,
} from "../hooks/useClientes";
import { Apolice, Sinistro } from "../types";

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

type TabType = "visao-geral" | "apolices" | "consorcios" | "planos" | "financiamentos" | "cotacoes" | "sinistros";

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "visao-geral", label: "Visao Geral", icon: TrendingUp },
  { id: "apolices", label: "Apolices", icon: Shield },
  { id: "consorcios", label: "Consorcios", icon: Wallet },
  { id: "planos", label: "Planos Saude", icon: Heart },
  { id: "financiamentos", label: "Financiamentos", icon: Building },
  { id: "cotacoes", label: "Cotacoes", icon: FileText },
  { id: "sinistros", label: "Sinistros", icon: AlertTriangle },
];

export default function ClienteDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("visao-geral");

  // Queries
  const { data: cliente, isLoading: clienteLoading, error: clienteError } = useCliente(id);
  const { data: resumo360, isLoading: resumoLoading } = useClienteResumo360(id);
  const { data: apolices, isLoading: apolicesLoading } = useClienteApolices(id);
  const { data: sinistros, isLoading: sinistrosLoading } = useClienteSinistros(id);
  const { data: consorcios, isLoading: consorciosLoading } = useClienteConsorcios(id);
  const { data: planos, isLoading: planosLoading } = useClientePlanosSaude(id);
  const { data: financiamentos, isLoading: financiamentosLoading } = useClienteFinanciamentos(id);
  const { data: cotacoes, isLoading: cotacoesLoading } = useClienteCotacoes(id);

  if (clienteError) {
    return (
      <PageLayout title="Cliente" subtitle="Erro ao carregar">
        <ErrorState
          title="Cliente nao encontrado"
          description="O cliente que voce esta procurando nao existe ou foi removido."
          action={{ label: "Voltar para Clientes", onClick: () => navigate("/clientes") }}
        />
      </PageLayout>
    );
  }

  if (clienteLoading) {
    return (
      <PageLayout title="Carregando..." subtitle="">
        <div className="space-y-6">
          <Skeleton height={200} />
          <Skeleton height={400} />
        </div>
      </PageLayout>
    );
  }

  if (!cliente) return null;

  const formatCPF_CNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return value;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <PageLayout
      title={cliente.nome}
      subtitle={`${cliente.tipo === "PF" ? "Pessoa Fisica" : "Pessoa Juridica"} - Visao 360`}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header with Back Button */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}
          >
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              leftIcon={<MessageSquare className="w-4 h-4" />}
              onClick={() => {
                const phone = cliente.telefone?.replace(/\D/g, "");
                if (phone) {
                  window.open(`https://wa.me/55${phone}`, "_blank");
                }
              }}
            >
              WhatsApp
            </Button>
            <Button leftIcon={<Edit className="w-4 h-4" />}>Editar Cliente</Button>
          </div>
        </motion.div>

        {/* Client Info Card */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar and Basic Info */}
              <div className="flex items-start gap-4">
                <Avatar name={cliente.nome} size="lg" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-slate-800">{cliente.nome}</h2>
                    <Badge variant={cliente.ativo ? "success" : "neutral"}>
                      {cliente.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">{formatCPF_CNPJ(cliente.cpf_cnpj)}</p>

                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {cliente.email && (
                      <a
                        href={`mailto:${cliente.email}`}
                        className="flex items-center gap-1 text-sm text-slate-600 hover:text-violet-600"
                      >
                        <Mail className="w-4 h-4" />
                        {cliente.email}
                      </a>
                    )}
                    {cliente.telefone && (
                      <span className="flex items-center gap-1 text-sm text-slate-600">
                        <Phone className="w-4 h-4" />
                        {cliente.telefone}
                      </span>
                    )}
                    {cliente.data_nascimento && (
                      <span className="flex items-center gap-1 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(cliente.data_nascimento).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 360 Summary Stats */}
              {!resumoLoading && resumo360 && (
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:border-l md:pl-6 border-slate-200">
                  <div className="text-center p-3 bg-violet-50 rounded-xl">
                    <Shield className="w-5 h-5 text-violet-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-violet-600">{resumo360.apolices.ativas}</p>
                    <p className="text-[10px] text-slate-500">Apolices Ativas</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-xl">
                    <Wallet className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-amber-600">{resumo360.consorcios.ativos}</p>
                    <p className="text-[10px] text-slate-500">Consorcios</p>
                  </div>
                  <div className="text-center p-3 bg-rose-50 rounded-xl">
                    <Heart className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-rose-600">{resumo360.planos_saude.ativos}</p>
                    <p className="text-[10px] text-slate-500">Planos Saude</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <Building className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-blue-600">{resumo360.financiamentos.ativos}</p>
                    <p className="text-[10px] text-slate-500">Financiamentos</p>
                  </div>
                  <div className="text-center p-3 bg-cyan-50 rounded-xl">
                    <FileText className="w-5 h-5 text-cyan-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-cyan-600">{resumo360.cotacoes.em_negociacao}</p>
                    <p className="text-[10px] text-slate-500">Cotacoes Abertas</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-red-600">{resumo360.sinistros.abertos}</p>
                    <p className="text-[10px] text-slate-500">Sinistros Abertos</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants}>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                    ${
                      activeTab === tab.id
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Visao Geral */}
            {activeTab === "visao-geral" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna Esquerda - Info Cliente */}
                <div className="space-y-6">
                  {/* Endereco */}
                  {cliente.endereco && (
                    <Card>
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        Endereco
                      </h4>
                      <p className="text-sm text-slate-600">
                        {cliente.endereco.rua}, {cliente.endereco.numero}
                        {cliente.endereco.complemento && ` - ${cliente.endereco.complemento}`}
                      </p>
                      <p className="text-sm text-slate-600">
                        {cliente.endereco.bairro}, {cliente.endereco.cidade} - {cliente.endereco.estado}
                      </p>
                      <p className="text-sm text-slate-500">{cliente.endereco.cep}</p>
                    </Card>
                  )}

                  {/* Notas */}
                  {cliente.notas && (
                    <Card>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-800">Notas Internas</h4>
                        <Button variant="ghost" size="sm" leftIcon={<Edit className="w-3 h-3" />}>
                          Editar
                        </Button>
                      </div>
                      <p className="text-sm text-slate-600">{cliente.notas}</p>
                    </Card>
                  )}

                  {/* Resumo Financeiro */}
                  {resumo360 && (
                    <Card>
                      <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        Resumo Financeiro
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-sm text-slate-600">Premios Anuais</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {formatCurrency(resumo360.apolices.valor_total)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-sm text-slate-600">Credito Consorcios</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {formatCurrency(resumo360.consorcios.valor_credito)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-sm text-slate-600">Mensalidade Saude</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {formatCurrency(resumo360.planos_saude.mensalidade_total)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-slate-600">Saldo Devedor</span>
                          <span className="text-sm font-semibold text-red-600">
                            {formatCurrency(resumo360.financiamentos.saldo_devedor)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Coluna Central e Direita - Produtos Recentes */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Apolices Recentes */}
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-violet-500" />
                        Apolices Recentes
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab("apolices")}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                      >
                        Ver todas
                      </Button>
                    </div>
                    {apolicesLoading ? (
                      <SkeletonList count={2} />
                    ) : apolices?.data && apolices.data.length > 0 ? (
                      <div className="space-y-2">
                        {apolices.data.slice(0, 3).map((apolice: Apolice) => (
                          <div
                            key={apolice.id}
                            onClick={() => navigate(`/apolices/${apolice.id}`)}
                            className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-violet-100 rounded-lg">
                                {apolice.ramo === "auto" ? (
                                  <Car className="w-4 h-4 text-violet-600" />
                                ) : apolice.ramo === "residencial" ? (
                                  <Home className="w-4 h-4 text-violet-600" />
                                ) : (
                                  <Shield className="w-4 h-4 text-violet-600" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {apolice.numero_apolice}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {apolice.seguradora} - {apolice.ramo}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={apolice.status === "vigente" ? "success" : "neutral"}
                                size="sm"
                              >
                                {apolice.status}
                              </Badge>
                              <p className="text-xs text-slate-500 mt-1">
                                Vence {new Date(apolice.data_vencimento).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-4">
                        Nenhuma apolice cadastrada
                      </p>
                    )}
                  </Card>

                  {/* Grid 2x2 para outros produtos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Consorcios */}
                    <Card padding="sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-amber-500" />
                          Consorcios
                        </h4>
                        <span className="text-xs text-slate-500">
                          {consorcios?.total || 0} total
                        </span>
                      </div>
                      {consorciosLoading ? (
                        <Skeleton height={60} />
                      ) : consorcios?.data && consorcios.data.length > 0 ? (
                        <div className="space-y-2">
                          {consorcios.data.slice(0, 2).map((c: any) => (
                            <div
                              key={c.id}
                              onClick={() => navigate(`/consorcios/${c.id}`)}
                              className="p-2 bg-amber-50 rounded-lg hover:bg-amber-100 cursor-pointer transition-colors"
                            >
                              <p className="text-xs font-medium text-amber-800">
                                {c.administradora}
                              </p>
                              <p className="text-[10px] text-amber-600">
                                Cota {c.numero_cota} - {formatCurrency(c.valor_credito)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-2">Nenhum</p>
                      )}
                    </Card>

                    {/* Planos de Saude */}
                    <Card padding="sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <Heart className="w-4 h-4 text-rose-500" />
                          Planos Saude
                        </h4>
                        <span className="text-xs text-slate-500">{planos?.total || 0} total</span>
                      </div>
                      {planosLoading ? (
                        <Skeleton height={60} />
                      ) : planos?.data && planos.data.length > 0 ? (
                        <div className="space-y-2">
                          {planos.data.slice(0, 2).map((p: any) => (
                            <div
                              key={p.id}
                              onClick={() => navigate(`/planos-saude/${p.id}`)}
                              className="p-2 bg-rose-50 rounded-lg hover:bg-rose-100 cursor-pointer transition-colors"
                            >
                              <p className="text-xs font-medium text-rose-800">{p.operadora}</p>
                              <p className="text-[10px] text-rose-600">
                                {p.tipo_plano} - {formatCurrency(p.valor_mensalidade)}/mes
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-2">Nenhum</p>
                      )}
                    </Card>

                    {/* Financiamentos */}
                    <Card padding="sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <Building className="w-4 h-4 text-blue-500" />
                          Financiamentos
                        </h4>
                        <span className="text-xs text-slate-500">
                          {financiamentos?.total || 0} total
                        </span>
                      </div>
                      {financiamentosLoading ? (
                        <Skeleton height={60} />
                      ) : financiamentos?.data && financiamentos.data.length > 0 ? (
                        <div className="space-y-2">
                          {financiamentos.data.slice(0, 2).map((f: any) => (
                            <div
                              key={f.id}
                              onClick={() => navigate(`/financiamentos/${f.id}`)}
                              className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
                            >
                              <p className="text-xs font-medium text-blue-800">
                                {f.instituicao_financeira}
                              </p>
                              <p className="text-[10px] text-blue-600">
                                {f.tipo_financiamento} - Saldo: {formatCurrency(f.saldo_devedor)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-2">Nenhum</p>
                      )}
                    </Card>

                    {/* Cotacoes */}
                    <Card padding="sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-500" />
                          Cotacoes
                        </h4>
                        <span className="text-xs text-slate-500">
                          {cotacoes?.total || 0} total
                        </span>
                      </div>
                      {cotacoesLoading ? (
                        <Skeleton height={60} />
                      ) : cotacoes?.data && cotacoes.data.length > 0 ? (
                        <div className="space-y-2">
                          {cotacoes.data.slice(0, 2).map((c: any) => (
                            <div
                              key={c.id}
                              onClick={() => navigate(`/cotacoes/${c.id}`)}
                              className="p-2 bg-cyan-50 rounded-lg hover:bg-cyan-100 cursor-pointer transition-colors"
                            >
                              <p className="text-xs font-medium text-cyan-800">
                                {c.numero_cotacao || `COT-${c.id.slice(0, 8)}`}
                              </p>
                              <p className="text-[10px] text-cyan-600">
                                {c.status_pipeline?.replace(/_/g, " ")}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-2">Nenhuma</p>
                      )}
                    </Card>
                  </div>

                  {/* Sinistros Abertos */}
                  {sinistros?.data && sinistros.data.filter((s: Sinistro) => !["pago", "recusado"].includes(s.status)).length > 0 && (
                    <Card className="border-red-200 bg-red-50/30">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-red-700 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Sinistros em Aberto
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("sinistros")}
                          rightIcon={<ChevronRight className="w-4 h-4" />}
                        >
                          Ver todos
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {sinistros.data
                          .filter((s: Sinistro) => !["pago", "recusado"].includes(s.status))
                          .slice(0, 3)
                          .map((sinistro: Sinistro) => (
                            <div
                              key={sinistro.id}
                              onClick={() => navigate(`/sinistros/${sinistro.id}`)}
                              className="p-3 bg-white rounded-xl hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {sinistro.numero_sinistro}
                                </p>
                                <p className="text-xs text-slate-500 line-clamp-1">
                                  {sinistro.descricao_ocorrencia}
                                </p>
                              </div>
                              <Badge variant="warning">{sinistro.status}</Badge>
                            </div>
                          ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Apolices Tab */}
            {activeTab === "apolices" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-violet-600" />
                    Apolices ({apolices?.total || 0})
                  </h3>
                  <Button size="sm" onClick={() => navigate("/apolices/nova")}>
                    Nova Apolice
                  </Button>
                </div>

                {apolicesLoading ? (
                  <SkeletonList count={3} />
                ) : apolices?.data && apolices.data.length > 0 ? (
                  <div className="space-y-3">
                    {apolices.data.map((apolice: Apolice) => (
                      <div
                        key={apolice.id}
                        onClick={() => navigate(`/apolices/${apolice.id}`)}
                        className="p-4 bg-white border border-slate-200 rounded-xl hover:border-violet-200 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">
                              {apolice.seguradora}
                            </h4>
                            <p className="text-xs text-slate-500">{apolice.numero_apolice}</p>
                          </div>
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

                        <div className="flex items-center justify-between text-sm">
                          <p className="text-slate-600">{apolice.ramo}</p>
                          <p className="text-slate-600">{formatCurrency(apolice.valor_premio)}</p>
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                          Vence em {new Date(apolice.data_vencimento).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Nenhuma apolice cadastrada
                  </p>
                )}
              </Card>
            )}

            {/* Consorcios Tab */}
            {activeTab === "consorcios" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-amber-600" />
                    Consorcios ({consorcios?.total || 0})
                  </h3>
                  <Button size="sm" onClick={() => navigate("/consorcios/novo")}>
                    Novo Consorcio
                  </Button>
                </div>

                {consorciosLoading ? (
                  <SkeletonList count={3} />
                ) : consorcios?.data && consorcios.data.length > 0 ? (
                  <div className="space-y-3">
                    {consorcios.data.map((c: any) => (
                      <div
                        key={c.id}
                        onClick={() => navigate(`/consorcios/${c.id}`)}
                        className="p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-200 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">
                              {c.administradora}
                            </h4>
                            <p className="text-xs text-slate-500">
                              Grupo {c.grupo} - Cota {c.numero_cota}
                            </p>
                          </div>
                          <Badge
                            variant={
                              c.status === "ativo"
                                ? "success"
                                : c.status === "contemplado"
                                ? "info"
                                : "neutral"
                            }
                          >
                            {c.status}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <p className="text-slate-600">{c.tipo_bem}</p>
                          <p className="text-slate-800 font-medium">
                            {formatCurrency(c.valor_credito)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Nenhum consorcio cadastrado
                  </p>
                )}
              </Card>
            )}

            {/* Planos Saude Tab */}
            {activeTab === "planos" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-600" />
                    Planos de Saude ({planos?.total || 0})
                  </h3>
                  <Button size="sm" onClick={() => navigate("/planos-saude/novo")}>
                    Novo Plano
                  </Button>
                </div>

                {planosLoading ? (
                  <SkeletonList count={3} />
                ) : planos?.data && planos.data.length > 0 ? (
                  <div className="space-y-3">
                    {planos.data.map((p: any) => (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/planos-saude/${p.id}`)}
                        className="p-4 bg-white border border-slate-200 rounded-xl hover:border-rose-200 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">{p.operadora}</h4>
                            <p className="text-xs text-slate-500">{p.numero_contrato}</p>
                          </div>
                          <Badge variant={p.status === "ativo" ? "success" : "neutral"}>
                            {p.status}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <p className="text-slate-600">
                            {p.tipo_plano} - {p.acomodacao}
                          </p>
                          <p className="text-slate-800 font-medium">
                            {formatCurrency(p.valor_mensalidade)}/mes
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Nenhum plano de saude cadastrado
                  </p>
                )}
              </Card>
            )}

            {/* Financiamentos Tab */}
            {activeTab === "financiamentos" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-600" />
                    Financiamentos ({financiamentos?.total || 0})
                  </h3>
                  <Button size="sm" onClick={() => navigate("/financiamentos/novo")}>
                    Novo Financiamento
                  </Button>
                </div>

                {financiamentosLoading ? (
                  <SkeletonList count={3} />
                ) : financiamentos?.data && financiamentos.data.length > 0 ? (
                  <div className="space-y-3">
                    {financiamentos.data.map((f: any) => (
                      <div
                        key={f.id}
                        onClick={() => navigate(`/financiamentos/${f.id}`)}
                        className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">
                              {f.instituicao_financeira}
                            </h4>
                            <p className="text-xs text-slate-500">{f.numero_contrato}</p>
                          </div>
                          <Badge
                            variant={
                              f.status === "ativo"
                                ? "success"
                                : f.status === "quitado"
                                ? "info"
                                : "warning"
                            }
                          >
                            {f.status}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <p className="text-slate-600">{f.tipo_financiamento}</p>
                          <div className="text-right">
                            <p className="text-slate-800 font-medium">
                              Saldo: {formatCurrency(f.saldo_devedor)}
                            </p>
                            <p className="text-xs text-slate-500">
                              Parcela: {formatCurrency(f.valor_parcela)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Nenhum financiamento cadastrado
                  </p>
                )}
              </Card>
            )}

            {/* Cotacoes Tab */}
            {activeTab === "cotacoes" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-600" />
                    Cotacoes ({cotacoes?.total || 0})
                  </h3>
                  <Button size="sm" onClick={() => navigate("/cotacoes/nova")}>
                    Nova Cotacao
                  </Button>
                </div>

                {cotacoesLoading ? (
                  <SkeletonList count={3} />
                ) : cotacoes?.data && cotacoes.data.length > 0 ? (
                  <div className="space-y-3">
                    {cotacoes.data.map((c: any) => (
                      <div
                        key={c.id}
                        onClick={() => navigate(`/cotacoes/${c.id}`)}
                        className="p-4 bg-white border border-slate-200 rounded-xl hover:border-cyan-200 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">
                              {c.numero_cotacao || `COT-${c.id.slice(0, 8)}`}
                            </h4>
                            <p className="text-xs text-slate-500">{c.ramo}</p>
                          </div>
                          <Badge
                            variant={
                              c.status_pipeline === "fechada_ganha"
                                ? "success"
                                : c.status_pipeline === "fechada_perdida"
                                ? "error"
                                : "warning"
                            }
                          >
                            {c.status_pipeline?.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        {c.valor_estimado && (
                          <p className="text-sm text-slate-600">
                            Valor estimado: {formatCurrency(c.valor_estimado)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Nenhuma cotacao cadastrada
                  </p>
                )}
              </Card>
            )}

            {/* Sinistros Tab */}
            {activeTab === "sinistros" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Sinistros ({sinistros?.total || 0})
                  </h3>
                  <Button size="sm" onClick={() => navigate("/sinistros")}>
                    Abrir Sinistro
                  </Button>
                </div>

                {sinistrosLoading ? (
                  <SkeletonList count={3} />
                ) : sinistros?.data && sinistros.data.length > 0 ? (
                  <div className="space-y-3">
                    {sinistros.data.map((sinistro: Sinistro) => (
                      <div
                        key={sinistro.id}
                        onClick={() => navigate(`/sinistros/${sinistro.id}`)}
                        className="p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-200 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">
                              {sinistro.numero_sinistro}
                            </h4>
                            <p className="text-xs text-slate-500">
                              {sinistro.apolices?.numero_apolice}
                            </p>
                          </div>
                          <Badge
                            variant={
                              sinistro.status === "pago"
                                ? "success"
                                : sinistro.status === "recusado"
                                ? "error"
                                : "warning"
                            }
                          >
                            {sinistro.status}
                          </Badge>
                        </div>

                        <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                          {sinistro.descricao_ocorrencia}
                        </p>

                        <div className="text-xs text-slate-500">
                          Ocorreu em{" "}
                          {new Date(sinistro.data_ocorrencia).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Nenhum sinistro registrado
                  </p>
                )}
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </PageLayout>
  );
}
