import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  MessageSquare,
  Key,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  DollarSign,
  Plus,
  Trash2,
  Edit,
  Percent,
  Users,
} from "lucide-react";
import { PageLayout } from "../components/layout";
import {
  Card,
  Button,
  Input,
  Badge,
  Modal,
  ModalFooter,
} from "../components/common";
import { UsuariosTab } from "../components/configuracoes/UsuariosTab";
import { useAuthStore } from "../store/authStore";
import {
  useComissaoConfiguracoes,
  useCreateComissaoConfig,
  useUpdateComissaoConfig,
  useDeleteComissaoConfig,
  useRamos,
  useRecalcularComissoes,
} from "../hooks/useFinanceiro";
import { ComissaoConfiguracao } from "../types";

type TabId =
  | "perfil"
  | "notificacoes"
  | "integracao"
  | "seguranca"
  | "aparencia"
  | "comissoes"
  | "usuarios";

interface Tab {
  id: TabId;
  label: string;
  icon: typeof Settings;
}

const TABS: Tab[] = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "usuarios", label: "Usuários", icon: Users },
  { id: "comissoes", label: "Comissoes", icon: DollarSign },
  { id: "notificacoes", label: "Notificacoes", icon: Bell },
  { id: "integracao", label: "Integracoes", icon: Database },
  { id: "seguranca", label: "Seguranca", icon: Shield },
  { id: "aparencia", label: "Aparencia", icon: Palette },
];

const SEGURADORAS_COMUNS = [
  "Porto Seguro",
  "Bradesco Seguros",
  "SulAmerica",
  "Allianz",
  "Tokio Marine",
  "Liberty",
  "HDI",
  "Mapfre",
  "Zurich",
  "Itau Seguros",
  "Caixa Seguradora",
  "BB Seguros",
  "Outros",
];

export default function Configuracoes() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>("perfil");
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Estados do formulario de perfil
  const [perfil, setPerfil] = useState({
    nome: user?.nome || "",
    email: user?.email || "",
    telefone: "",
    cargo: "Corretor de Seguros",
    bio: "",
  });

  // Estados de notificacoes
  const [notificacoes, setNotificacoes] = useState({
    emailNovosClientes: true,
    emailSinistros: true,
    emailRenovacoes: true,
    pushWhatsApp: true,
    pushSinistros: true,
    pushVencimentos: true,
    frequenciaResumo: "diario",
  });

  // Estados de integracao
  const [integracoes, setIntegracoes] = useState({
    evolutionApiUrl: "",
    evolutionApiKey: "",
    evolutionInstance: "",
    webhookUrl:
      typeof window !== "undefined"
        ? `${window.location.origin}/api/webhooks/whatsapp`
        : "",
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  });

  // Estados de aparencia
  const [aparencia, setAparencia] = useState({
    tema: "light",
    corPrimaria: "violet",
    densidade: "normal",
    animacoes: true,
  });

  // Estados de comissoes
  const [showComissaoModal, setShowComissaoModal] = useState(false);
  const [editingConfig, setEditingConfig] =
    useState<ComissaoConfiguracao | null>(null);
  const [configForm, setConfigForm] = useState({
    seguradora: "",
    ramo: "",
    percentual_comissao: 0,
    percentual_repasse: 0,
    percentual_imposto: 6.38,
    observacoes: "",
    ativo: true,
  });

  // Queries para comissoes
  const { data: configuracoesData, isLoading: loadingConfigs } =
    useComissaoConfiguracoes();
  const { data: ramosData } = useRamos();
  const createConfig = useCreateComissaoConfig();
  const updateConfig = useUpdateComissaoConfig();
  const deleteConfig = useDeleteComissaoConfig();
  const recalcularComissoes = useRecalcularComissoes();

  const handleSave = async () => {
    setSaving(true);
    // Simular salvamento
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleOpenComissaoModal = (config?: ComissaoConfiguracao) => {
    if (config) {
      setEditingConfig(config);
      setConfigForm({
        seguradora: config.seguradora,
        ramo: config.ramo,
        percentual_comissao: config.percentual_comissao,
        percentual_repasse: config.percentual_repasse || 0,
        percentual_imposto: config.percentual_imposto || 6.38,
        observacoes: config.observacoes || "",
        ativo: config.ativo,
      });
    } else {
      setEditingConfig(null);
      setConfigForm({
        seguradora: "",
        ramo: "",
        percentual_comissao: 0,
        percentual_repasse: 0,
        percentual_imposto: 6.38,
        observacoes: "",
        ativo: true,
      });
    }
    setShowComissaoModal(true);
  };

  const handleSaveComissaoConfig = async () => {
    try {
      if (editingConfig) {
        await updateConfig.mutateAsync({
          id: editingConfig.id,
          data: configForm,
        });
      } else {
        await createConfig.mutateAsync(configForm);
      }
      setShowComissaoModal(false);
    } catch (error) {
      console.error("Erro ao salvar configuracao:", error);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta configuracao?")) {
      await deleteConfig.mutateAsync(id);
    }
  };

  const handleRecalcularComissoes = async () => {
    if (
      confirm(
        "Isso ira calcular comissoes para todas as apolices que ainda nao possuem. Continuar?"
      )
    ) {
      try {
        const result = await recalcularComissoes.mutateAsync();
        alert(
          `${result.resultados.criadas} comissoes criadas de ${result.resultados.processadas} apolices processadas.`
        );
      } catch (error) {
        console.error("Erro ao recalcular:", error);
      }
    }
  };

  const ramos = ramosData?.data || [];
  const configuracoes = configuracoesData?.data || [];

  // Agrupar configuracoes por seguradora
  const configsPorSeguradora: Record<string, ComissaoConfiguracao[]> = {};
  configuracoes.forEach((config) => {
    if (!configsPorSeguradora[config.seguradora]) {
      configsPorSeguradora[config.seguradora] = [];
    }
    configsPorSeguradora[config.seguradora].push(config);
  });

  return (
    <PageLayout title="Configuracoes" subtitle="Gerencie suas preferencias">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-6"
      >
        {/* Sidebar de Tabs */}
        <div className="w-64 shrink-0">
          <Card className="p-2">
            <nav className="space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-violet-100 text-violet-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Conteudo */}
        <div className="flex-1 space-y-6">
          {/* Tab: Perfil */}
          {activeTab === "perfil" && (
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-violet-600" />
                <h2 className="text-lg font-semibold text-slate-800">
                  Informacoes do Perfil
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nome Completo"
                  value={perfil.nome}
                  onChange={(e) =>
                    setPerfil({ ...perfil, nome: e.target.value })
                  }
                />
                <Input
                  label="Email"
                  type="email"
                  value={perfil.email}
                  onChange={(e) =>
                    setPerfil({ ...perfil, email: e.target.value })
                  }
                />
                <Input
                  label="Telefone"
                  value={perfil.telefone}
                  onChange={(e) =>
                    setPerfil({ ...perfil, telefone: e.target.value })
                  }
                  placeholder="(11) 99999-9999"
                />
                <Input
                  label="Cargo"
                  value={perfil.cargo}
                  onChange={(e) =>
                    setPerfil({ ...perfil, cargo: e.target.value })
                  }
                />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none"
                    rows={3}
                    value={perfil.bio}
                    onChange={(e) =>
                      setPerfil({ ...perfil, bio: e.target.value })
                    }
                    placeholder="Conte um pouco sobre voce..."
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  leftIcon={
                    saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )
                  }
                >
                  {saving ? "Salvando..." : "Salvar Alteracoes"}
                </Button>
              </div>
            </Card>
          )}

          {/* Tab: Comissoes */}
          {activeTab === "comissoes" && (
            <div className="space-y-6">
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">
                        Configuracao de Comissoes
                      </h2>
                      <p className="text-sm text-slate-500">
                        Defina os percentuais de comissao por seguradora e ramo
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleRecalcularComissoes}
                      disabled={recalcularComissoes.isPending}
                      leftIcon={
                        recalcularComissoes.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )
                      }
                    >
                      {recalcularComissoes.isPending
                        ? "Calculando..."
                        : "Recalcular Todas"}
                    </Button>
                    <Button
                      onClick={() => handleOpenComissaoModal()}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Nova Configuracao
                    </Button>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Como funciona
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        As comissoes sao calculadas automaticamente ao cadastrar
                        uma apolice, usando a configuracao correspondente a
                        seguradora e ramo. Se nao houver configuracao
                        especifica, usa a configuracao "todos" da seguradora ou
                        a configuracao generica "Outros".
                      </p>
                    </div>
                  </div>
                </div>

                {loadingConfigs ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-violet-600" />
                  </div>
                ) : configuracoes.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Percent className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Nenhuma configuracao cadastrada</p>
                    <p className="text-sm">
                      Adicione configuracoes para calcular comissoes
                      automaticamente
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(configsPorSeguradora).map(
                      ([seguradora, configs]) => (
                        <div
                          key={seguradora}
                          className="border border-slate-200 rounded-lg overflow-hidden"
                        >
                          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-800">
                              {seguradora}
                            </h3>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {configs.map((config) => (
                              <div
                                key={config.id}
                                className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-24">
                                    <Badge
                                      variant={
                                        config.ativo ? "success" : "neutral"
                                      }
                                      size="sm"
                                    >
                                      {ramos.find(
                                        (r) => r.value === config.ramo
                                      )?.label || config.ramo}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-6 text-sm">
                                    <div>
                                      <span className="text-slate-500">
                                        Comissao:
                                      </span>
                                      <span className="font-semibold text-emerald-600 ml-1">
                                        {config.percentual_comissao}%
                                      </span>
                                    </div>
                                    {config.percentual_repasse > 0 && (
                                      <div>
                                        <span className="text-slate-500">
                                          Repasse:
                                        </span>
                                        <span className="font-medium text-amber-600 ml-1">
                                          {config.percentual_repasse}%
                                        </span>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-slate-500">
                                        Imposto:
                                      </span>
                                      <span className="font-medium text-red-500 ml-1">
                                        {config.percentual_imposto}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenComissaoModal(config)
                                    }
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() =>
                                      handleDeleteConfig(config.id)
                                    }
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </Card>

              {/* Exemplo de calculo */}
              <Card>
                <div className="flex items-center gap-3 mb-4">
                  <Percent className="w-5 h-5 text-violet-600" />
                  <h3 className="font-semibold text-slate-800">
                    Exemplo de Calculo
                  </h3>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-sm">
                  <p className="text-slate-600 mb-3">
                    Para uma apolice de <strong>R$ 2.000,00</strong> com:
                  </p>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex justify-between">
                      <span>Comissao (20%):</span>
                      <span className="font-medium text-emerald-600">
                        R$ 400,00
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>(-) Imposto (6,38%):</span>
                      <span className="font-medium text-red-500">
                        - R$ 25,52
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>(-) Repasse (0%):</span>
                      <span className="font-medium text-amber-600">
                        - R$ 0,00
                      </span>
                    </li>
                    <li className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                      <span className="font-semibold">Comissao Liquida:</span>
                      <span className="font-bold text-emerald-600">
                        R$ 374,48
                      </span>
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          )}

          {/* Tab: Notificacoes */}
          {activeTab === "notificacoes" && (
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <Bell className="w-6 h-6 text-violet-600" />
                <h2 className="text-lg font-semibold text-slate-800">
                  Preferencias de Notificacoes
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">
                    Notificacoes por Email
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        key: "emailNovosClientes",
                        label: "Novos clientes cadastrados",
                      },
                      {
                        key: "emailSinistros",
                        label: "Atualizacoes de sinistros",
                      },
                      {
                        key: "emailRenovacoes",
                        label: "Lembretes de renovacao",
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            notificacoes[
                              item.key as keyof typeof notificacoes
                            ] as boolean
                          }
                          onChange={(e) =>
                            setNotificacoes({
                              ...notificacoes,
                              [item.key]: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
                        />
                        <span className="text-sm text-slate-700">
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">
                    Notificacoes Push
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        key: "pushWhatsApp",
                        label: "Novas mensagens WhatsApp",
                      },
                      {
                        key: "pushSinistros",
                        label: "Atualizacoes de sinistros",
                      },
                      {
                        key: "pushVencimentos",
                        label: "Apolices prestes a vencer",
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            notificacoes[
                              item.key as keyof typeof notificacoes
                            ] as boolean
                          }
                          onChange={(e) =>
                            setNotificacoes({
                              ...notificacoes,
                              [item.key]: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
                        />
                        <span className="text-sm text-slate-700">
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">
                    Resumo por Email
                  </h3>
                  <select
                    value={notificacoes.frequenciaResumo}
                    onChange={(e) =>
                      setNotificacoes({
                        ...notificacoes,
                        frequenciaResumo: e.target.value,
                      })
                    }
                    className="w-full max-w-xs px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20"
                  >
                    <option value="nunca">Nunca</option>
                    <option value="diario">Diario</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Salvar Preferencias
                </Button>
              </div>
            </Card>
          )}

          {/* Tab: Integracao */}
          {activeTab === "integracao" && (
            <div className="space-y-6">
              {/* WhatsApp / Evolution API */}
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-emerald-600" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">
                        WhatsApp (Evolution API)
                      </h2>
                      <p className="text-sm text-slate-500">
                        Configure a integracao com WhatsApp
                      </p>
                    </div>
                  </div>
                  <Badge variant="warning">Nao Configurado</Badge>
                </div>

                <div className="space-y-4">
                  <Input
                    label="URL da API"
                    placeholder="https://evolution-api.seu-servidor.com"
                    value={integracoes.evolutionApiUrl}
                    onChange={(e) =>
                      setIntegracoes({
                        ...integracoes,
                        evolutionApiUrl: e.target.value,
                      })
                    }
                  />
                  <div className="relative">
                    <Input
                      label="API Key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="Sua API Key da Evolution API"
                      value={integracoes.evolutionApiKey}
                      onChange={(e) =>
                        setIntegracoes({
                          ...integracoes,
                          evolutionApiKey: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <Input
                    label="Nome da Instancia"
                    placeholder="corretora-principal"
                    value={integracoes.evolutionInstance}
                    onChange={(e) =>
                      setIntegracoes({
                        ...integracoes,
                        evolutionInstance: e.target.value,
                      })
                    }
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Webhook URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={integracoes.webhookUrl}
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(integracoes.webhookUrl)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Configure esta URL no webhook da Evolution API
                    </p>
                  </div>
                </div>

                <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    leftIcon={<ExternalLink className="w-4 h-4" />}
                  >
                    Ver Documentacao
                  </Button>
                  <Button leftIcon={<CheckCircle className="w-4 h-4" />}>
                    Testar Conexao
                  </Button>
                </div>
              </Card>

              {/* Supabase */}
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Database className="w-6 h-6 text-emerald-600" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">
                        Supabase
                      </h2>
                      <p className="text-sm text-slate-500">
                        Banco de dados e autenticacao
                      </p>
                    </div>
                  </div>
                  {integracoes.supabaseUrl ? (
                    <Badge variant="success">Conectado</Badge>
                  ) : (
                    <Badge variant="error">Nao Conectado</Badge>
                  )}
                </div>

                <div className="space-y-4">
                  <Input
                    label="Supabase URL"
                    placeholder="https://xxx.supabase.co"
                    value={integracoes.supabaseUrl}
                    onChange={(e) =>
                      setIntegracoes({
                        ...integracoes,
                        supabaseUrl: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="Anon Key"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={integracoes.supabaseKey}
                    onChange={(e) =>
                      setIntegracoes({
                        ...integracoes,
                        supabaseKey: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mt-4 p-4 bg-amber-50 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Importante
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      As credenciais do Supabase sao configuradas via variaveis
                      de ambiente. Altere apenas se souber o que esta fazendo.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Tab: Seguranca */}
          {activeTab === "seguranca" && (
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-violet-600" />
                <h2 className="text-lg font-semibold text-slate-800">
                  Seguranca da Conta
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">
                    Alterar Senha
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                    <Input
                      label="Senha Atual"
                      type="password"
                      placeholder="********"
                    />
                    <div />
                    <Input
                      label="Nova Senha"
                      type="password"
                      placeholder="********"
                    />
                    <Input
                      label="Confirmar Nova Senha"
                      type="password"
                      placeholder="********"
                    />
                  </div>
                  <Button
                    className="mt-4"
                    leftIcon={<Key className="w-4 h-4" />}
                  >
                    Alterar Senha
                  </Button>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">
                    Sessoes Ativas
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          Sessao Atual
                        </p>
                        <p className="text-xs text-slate-500">
                          Chrome - Windows - Sao Paulo, BR
                        </p>
                      </div>
                      <Badge variant="success">Ativa</Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-4"
                    leftIcon={<Shield className="w-4 h-4" />}
                  >
                    Encerrar Outras Sessoes
                  </Button>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">
                    Autenticacao em Dois Fatores
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Adicione uma camada extra de seguranca a sua conta
                  </p>
                  <Button
                    variant="outline"
                    leftIcon={<Shield className="w-4 h-4" />}
                  >
                    Configurar 2FA
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Tab: Aparencia */}
          {activeTab === "aparencia" && (
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <Palette className="w-6 h-6 text-violet-600" />
                <h2 className="text-lg font-semibold text-slate-800">
                  Aparencia
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">
                    Tema
                  </h3>
                  <div className="flex gap-4">
                    {["light", "dark", "system"].map((tema) => (
                      <button
                        key={tema}
                        onClick={() => setAparencia({ ...aparencia, tema })}
                        className={`px-6 py-3 rounded-lg border-2 transition-all ${
                          aparencia.tema === tema
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {tema === "light" && "Claro"}
                        {tema === "dark" && "Escuro"}
                        {tema === "system" && "Sistema"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">
                    Cor Primaria
                  </h3>
                  <div className="flex gap-3">
                    {[
                      { id: "violet", color: "bg-violet-500" },
                      { id: "blue", color: "bg-blue-500" },
                      { id: "emerald", color: "bg-emerald-500" },
                      { id: "amber", color: "bg-amber-500" },
                      { id: "rose", color: "bg-rose-500" },
                    ].map((cor) => (
                      <button
                        key={cor.id}
                        onClick={() =>
                          setAparencia({ ...aparencia, corPrimaria: cor.id })
                        }
                        className={`w-10 h-10 rounded-full ${cor.color} transition-all ${
                          aparencia.corPrimaria === cor.id
                            ? "ring-2 ring-offset-2 ring-slate-400"
                            : "hover:scale-110"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aparencia.animacoes}
                      onChange={(e) =>
                        setAparencia({
                          ...aparencia,
                          animacoes: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
                    />
                    <span className="text-sm text-slate-700">
                      Habilitar animacoes
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Salvar Preferencias
                </Button>
              </div>
            </Card>
          )}

          {/* Tab: Usuarios (Novo) */}
          {activeTab === "usuarios" && <UsuariosTab />}
        </div>
      </motion.div>

      {/* Modal de Configuracao de Comissao */}
      <Modal
        isOpen={showComissaoModal}
        onClose={() => setShowComissaoModal(false)}
        title={
          editingConfig
            ? "Editar Configuracao"
            : "Nova Configuracao de Comissao"
        }
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Seguradora
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20"
              value={configForm.seguradora}
              onChange={(e) =>
                setConfigForm({ ...configForm, seguradora: e.target.value })
              }
            >
              <option value="">Selecione...</option>
              {SEGURADORAS_COMUNS.map((seg) => (
                <option key={seg} value={seg}>
                  {seg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ramo
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20"
              value={configForm.ramo}
              onChange={(e) =>
                setConfigForm({ ...configForm, ramo: e.target.value })
              }
            >
              <option value="">Selecione...</option>
              {ramos.map((ramo) => (
                <option key={ramo.value} value={ramo.value}>
                  {ramo.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                % Comissao
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20"
                value={configForm.percentual_comissao}
                onChange={(e) =>
                  setConfigForm({
                    ...configForm,
                    percentual_comissao: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                % Repasse
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20"
                value={configForm.percentual_repasse}
                onChange={(e) =>
                  setConfigForm({
                    ...configForm,
                    percentual_repasse: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                % Imposto
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20"
                value={configForm.percentual_imposto}
                onChange={(e) =>
                  setConfigForm({
                    ...configForm,
                    percentual_imposto: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <Input
            label="Observacoes"
            placeholder="Observacoes opcionais..."
            value={configForm.observacoes}
            onChange={(e) =>
              setConfigForm({ ...configForm, observacoes: e.target.value })
            }
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={configForm.ativo}
              onChange={(e) =>
                setConfigForm({ ...configForm, ativo: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm text-slate-600">Configuracao ativa</span>
          </label>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowComissaoModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveComissaoConfig}
            disabled={
              !configForm.seguradora ||
              !configForm.ramo ||
              createConfig.isPending ||
              updateConfig.isPending
            }
            leftIcon={
              createConfig.isPending || updateConfig.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )
            }
          >
            {createConfig.isPending || updateConfig.isPending
              ? "Salvando..."
              : "Salvar"}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
