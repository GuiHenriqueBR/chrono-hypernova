// ============================================
// TYPES - Definições TypeScript
// ============================================

// Cliente
export type TipoCliente = "PF" | "PJ";

export interface Endereco {
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface Cliente {
  id: string;
  tipo: TipoCliente;
  cpf_cnpj: string;
  nome: string;
  email: string;
  telefone: string;
  data_nascimento?: string;
  endereco?: Endereco;
  notas?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  apolices?: Apolice[];
  sinistros?: Sinistro[];
}

// Apólice - APENAS SEGUROS TRADICIONAIS
export type RamoSeguro =
  | "auto"
  | "residencial"
  | "vida"
  | "empresarial"
  | "viagem"
  | "rc"
  | "saude"
  | "outros";
export type StatusApolice = "vigente" | "vencida" | "cancelada";

export interface Cobertura {
  id: string;
  apolice_id: string;
  nome: string;
  limite: number;
  franquia: number;
}

export interface Apolice {
  id: string;
  cliente_id: string;
  ramo: RamoSeguro;
  seguradora: string;
  numero_apolice: string;
  valor_premio: number;
  data_inicio: string;
  data_vencimento: string;
  status: StatusApolice;
  dados?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  cliente?: Cliente;
  coberturas?: Cobertura[];
}

// Sinistro
export type StatusSinistro =
  | "notificado"
  | "analise_inicial"
  | "documentacao"
  | "regulacao"
  | "cobertura_confirmada"
  | "indenizacao_processando"
  | "pago"
  | "recusado";

export interface RegulacaoEvento {
  id: string;
  sinistro_id: string;
  usuario_id: string;
  etapa: string;
  titulo: string;
  descricao: string;
  responsavel?: string;
  prazo?: string;
  observacao?: string;
  data_evento: string;
  data_conclusao?: string;
  status: "pendente" | "em_andamento" | "concluido" | "cancelado";
  usuario?: { nome: string };
  created_at: string;
}

export interface RegulacaoEventoData {
  etapa: string;
  titulo: string;
  descricao: string;
  responsavel?: string;
  prazo?: string;
  observacao?: string;
}

export interface Sinistro {
  id: string;
  cliente_id: string;
  apolice_id: string;
  numero_sinistro: string;
  data_ocorrencia: string;
  descricao_ocorrencia: string; // Updated from descricao to match backend/usage
  status: StatusSinistro;
  regulador?: string;
  valor_indenizacao?: number;
  data_pagamento?: string;
  created_at: string;
  // Relacionamentos
  clientes?: Cliente; // Backend returns table name often
  apolices?: Apolice; // Backend returns table name often
  cliente?: Cliente; // Alias for compatibility
  apolice?: Apolice; // Alias for compatibility
  sinistro_regulacao?: RegulacaoEvento[];
  sinistro_documentos?: SinistroDocumento[];
}

export interface SinistroDocumento {
  id: string;
  sinistro_id: string;
  nome_arquivo: string;
  tipo: string;
  url_storage?: string; // Align with useSinistros
  url_assinada?: string; // Align with useSinistros
  tamanho?: number;
  tipo_mime?: string;
  status: "pendente" | "aprovado" | "rejeitado";
  observacoes?: string;
  uploaded_by?: string;
  created_at: string;
  // Compatibility
  url?: string;
}

// Cotação - Status do Pipeline de Vendas
export type StatusPipelineCotacao =
  | "nova"
  | "em_cotacao"
  | "enviada"
  | "em_negociacao"
  | "fechada_ganha"
  | "fechada_perdida";

export type TipoEventoHistorico =
  | "ligacao"
  | "email"
  | "whatsapp"
  | "reuniao"
  | "anotacao"
  | "mudanca_status"
  | "follow_up_agendado";

export type ResultadoInteracao = "positivo" | "neutro" | "negativo";

// Cotação com CRM Pipeline
export interface Cotacao {
  id: string;
  cliente_id: string;
  ramo: RamoSeguro;
  dados_cotacao: Record<string, any>;
  seguradoras_json: { seguradora: string; valor: number; coberturas: string }[];
  validade_cotacao?: string;
  data_criacao: string;
  updated_at?: string;
  // CRM Pipeline fields
  status_pipeline?: StatusPipelineCotacao;
  data_envio?: string;
  data_fechamento?: string;
  proximo_contato?: string;
  valor_estimado?: number;
  motivo_perda?: string;
  notas_negociacao?: string;
  lead_nome?: string;
  lead_telefone?: string;
  // Relacionamentos
  clientes?: Cliente;
  cotacao_historico?: CotacaoHistorico[];
}

// Histórico de interações da cotação
export interface CotacaoHistorico {
  id: string;
  cotacao_id: string;
  tipo_evento: TipoEventoHistorico;
  status_anterior?: string;
  status_novo?: string;
  notas?: string;
  resultado?: ResultadoInteracao;
  usuario_id?: string;
  data_evento: string;
  created_at: string;
}

// Proposta
export type StatusProposta = "rascunho" | "enviada" | "aceita" | "recusada";

export interface Proposta {
  id: string;
  cliente_id: string;
  ramo: RamoSeguro;
  dados_propostos: Record<string, any>;
  valor_proposto: number;
  status: StatusProposta;
  data_criacao: string;
  data_envio?: string;
  data_aceitacao?: string;
  // Relacionamentos
  clientes?: Cliente;
}

// Endosso
export type TipoEndosso = "inclusao" | "exclusao" | "alteracao";
export type StatusEndosso = "rascunho" | "enviado" | "aceito" | "emitido";

export interface Endosso {
  id: string;
  apolice_id: string;
  tipo: TipoEndosso;
  descricao: string;
  valor_novo: number;
  status: StatusEndosso;
  data_solicitacao: string;
  data_emissao?: string;
}

// Financeiro
export type StatusComissao = "pendente" | "recebida" | "paga";

export interface Comissao {
  id: string;
  apolice_id: string;
  valor_bruto: number;
  valor_liquido: number;
  descontos_json?: {
    repasse?: number;
    imposto?: number;
    percentual_comissao?: number;
    percentual_repasse?: number;
    percentual_imposto?: number;
  };
  data_receita: string;
  status: StatusComissao;
  created_at: string;
  // Relacionamentos
  apolice?: Apolice;
}

// Configuração de Comissão
export interface ComissaoConfiguracao {
  id: string;
  seguradora: string;
  ramo: string;
  percentual_comissao: number;
  percentual_repasse: number;
  percentual_imposto: number;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Documentos
export interface Documento {
  id: string;
  cliente_id?: string;
  apolice_id?: string;
  sinistro_id?: string;
  tipo: string;
  nome_arquivo: string;
  url_storage: string;
  created_at: string;
}

// Tarefas
export type PrioridadeTarefa = "baixa" | "media" | "alta";
export type TipoTarefa =
  | "renovacao"
  | "vencimento"
  | "sinistro"
  | "pagamento"
  | "geral";

export interface Tarefa {
  id: string;
  tipo: TipoTarefa;
  cliente_id?: string;
  apolice_id?: string;
  descricao: string;
  data_vencimento: string;
  prioridade: PrioridadeTarefa;
  concluida: boolean;
  created_at: string;
  // Relacionamentos
  cliente?: Cliente;
  apolice?: Apolice;
}

// Dashboard
export interface DashboardStats {
  totalClientes: number;
  totalApolices: number;
  apolicesVigentes: number;
  apolicesVencendo: number;
  sinistrosAbertos: number;
  tarefasPendentes: number;
  receitaMes: number;
  comissoesPendentes: number;
}

// Foco do Dia - Item urgente
export type TipoFocoDia = "tarefa" | "renovacao" | "follow_up" | "sinistro";
export type UrgenciaFocoDia = "atrasada" | "alta" | "normal";

export interface FocoDoDiaItem {
  id: string;
  tipo: TipoFocoDia;
  titulo: string;
  subtitulo: string;
  urgencia: UrgenciaFocoDia;
  link: string;
  data?: string;
  entidade_id: string;
  valor?: number;
  telefone?: string;
}

export interface FocoDoDiaResponse {
  itens: FocoDoDiaItem[];
  resumo: {
    tarefas: number;
    renovacoes: number;
    followUps: number;
    sinistros: number;
  };
}

// Pipeline de Vendas - Kanban
export interface PipelineCotacao {
  id: string;
  cliente: string;
  telefone?: string;
  email?: string;
  ramo: string;
  modelo?: string;
  valor?: number;
  dataCriacao: string;
  dataEnvio?: string;
  proximoContato?: string;
  diasParado: number;
  motivoPerda?: string;
  notas?: string;
}

export interface PipelineVendasResponse {
  pipeline: {
    nova: PipelineCotacao[];
    em_cotacao: PipelineCotacao[];
    enviada: PipelineCotacao[];
    em_negociacao: PipelineCotacao[];
    fechada_ganha: PipelineCotacao[];
    fechada_perdida: PipelineCotacao[];
  };
  metricas: {
    totalCotacoes: number;
    emAndamento: number;
    ganhas: number;
    perdidas: number;
    taxaConversao: number;
    valorPipelineAtivo: number;
  };
}

// Métricas de Conversão
export interface MetricasConversaoResponse {
  periodo: number;
  totalCotacoes: number;
  porStatus: Record<string, number>;
  valorPorStatus: Record<string, number>;
  porRamo: Record<string, { total: number; ganhas: number }>;
  taxas: {
    conversaoGeral: number;
    envioProposta: number;
    fechamento: number;
  };
  valorTotal: {
    pipeline: number;
    ganho: number;
    perdido: number;
  };
}

// Pipeline Stats
export interface PipelineStats {
  [key: string]: { count: number; valor: number };
}

// API Response
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth
export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: "admin" | "corretor" | "assistente";
  ativo: boolean;
}

export interface AuthState {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================
// NOVOS MÓDULOS - Separados de Seguros
// ============================================

// Consórcio
export type StatusConsorcio =
  | "ativo"
  | "contemplado"
  | "encerrado"
  | "cancelado";
export type TipoBemConsorcio = "imovel" | "veiculo" | "servicos" | "outros";

export interface Consorcio {
  id: string;
  cliente_id: string;
  administradora: string;
  grupo: string;
  cota: string;
  numero_cota: string;
  valor_credito: number;
  valor_parcela: number;
  prazo_meses: number;
  parcelas_pagas: number;
  status: StatusConsorcio;
  tipo_bem: TipoBemConsorcio;
  data_adesao: string;
  data_proxima_assembleia?: string;
  data_contemplacao?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  cliente?: Cliente;
  clientes?: Cliente;
}

export interface ConsorcioParcela {
  id: string;
  consorcio_id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento?: string;
  valor_pago?: number;
  status: "pendente" | "pago" | "atrasado";
  observacao?: string;
}

export interface ConsorcioLance {
  id: string;
  consorcio_id: string;
  data_assembleia: string;
  tipo_lance: "livre" | "fixo" | "embutido";
  valor_lance: number;
  percentual_lance: number;
  resultado: "pendente" | "contemplado" | "nao_contemplado";
  observacao?: string;
}

// Plano de Saúde
export type StatusPlanoSaude = "ativo" | "suspenso" | "cancelado";
export type TipoPlanoSaude =
  | "individual"
  | "familiar"
  | "empresarial"
  | "adesao";
export type AcomodacaoPlano = "enfermaria" | "apartamento";
export type AbrangenciaPlano = "municipal" | "estadual" | "nacional";

export interface PlanoSaude {
  id: string;
  cliente_id: string;
  operadora: string;
  numero_contrato: string;
  tipo_plano: TipoPlanoSaude;
  acomodacao: AcomodacaoPlano;
  abrangencia: AbrangenciaPlano;
  valor_mensalidade: number;
  data_contratacao: string;
  data_vencimento?: string;
  status: StatusPlanoSaude;
  coparticipacao: boolean;
  percentual_coparticipacao?: number;
  ans_registro?: string;
  data_ultimo_reajuste?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  cliente?: Cliente;
  clientes?: Cliente;
  plano_beneficiarios?: PlanoBeneficiario[];
  plano_carencias?: PlanoCarencia[];
  plano_reajustes?: PlanoReajuste[];
  plano_historico?: PlanoHistorico[];
  plano_coberturas?: PlanoCobertura[];
  beneficiarios?: PlanoBeneficiario[]; // Keep existing for compatibility
}

export interface PlanoBeneficiario {
  id: string;
  plano_id: string;
  nome: string;
  cpf: string;
  data_nascimento: string;
  tipo_beneficiario: "titular" | "dependente";
  parentesco?: string;
  numero_carteirinha?: string;
  valor_mensalidade_individual?: number;
  ativo: boolean;
}

export interface PlanoCarencia {
  id: string;
  plano_id: string;
  procedimento: string;
  data_inicio_carencia: string;
  data_fim_carencia: string;
  cumprida: boolean;
}

export interface PlanoReajuste {
  id: string;
  plano_id: string;
  data_reajuste: string;
  valor_anterior: number;
  valor_novo: number;
  percentual_reajuste: number;
  tipo_reajuste: string;
  observacao?: string;
  created_at: string;
}

export interface PlanoHistorico {
  id: string;
  plano_id: string;
  descricao: string;
  usuario_id?: string;
  usuario?: { nome: string };
  created_at: string;
}

export interface PlanoCobertura {
  id: string;
  nome: string;
  descricao?: string;
}

// Financiamento
export type StatusFinanciamento =
  | "ativo"
  | "quitado"
  | "atrasado"
  | "renegociado";
export type TipoFinanciamento =
  | "imovel"
  | "veiculo"
  | "pessoal"
  | "consignado"
  | "outros";

export interface Financiamento {
  id: string;
  cliente_id: string;
  instituicao_financeira: string;
  numero_contrato: string;
  tipo_financiamento: TipoFinanciamento;
  bem_financiado?: string;
  valor_financiado: number;
  valor_parcela: number;
  taxa_juros?: number;
  sistema_amortizacao?: string;
  prazo_meses: number;
  parcelas_pagas: number;
  saldo_devedor: number;
  data_contratacao: string;
  data_vencimento_parcela?: string;
  data_refinanciamento?: string;
  status: StatusFinanciamento;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  cliente?: Cliente;
  clientes?: Cliente;
  financiamento_parcelas?: FinanciamentoParcela[];
  financiamento_amortizacoes?: FinanciamentoAmortizacao[];
  financiamento_historico?: FinanciamentoHistorico[];
}

export interface FinanciamentoParcela {
  id: string;
  financiamento_id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento?: string;
  valor_pago?: number;
  valor_amortizacao?: number;
  valor_juros?: number;
  juros_mora?: number;
  multa?: number;
  juros?: number;
  status: "pendente" | "pago" | "atrasado" | "quitado_amortizacao";
  observacao?: string;
}

export interface FinanciamentoAmortizacao {
  id: string;
  financiamento_id: string;
  data_amortizacao: string;
  valor_amortizacao: number;
  saldo_anterior: number;
  novo_saldo: number;
  tipo_amortizacao: string;
  reducao_tipo?: string;
  saldo_devedor_antes?: number;
  saldo_devedor_depois?: number;
  observacao?: string;
}

export interface FinanciamentoHistorico {
  id: string;
  financiamento_id: string;
  descricao: string;
  usuario?: { nome: string };
  created_at: string;
}

// Produto/Ramo Configurável
export type CategoriaProduto =
  | "seguro"
  | "consorcio"
  | "saude"
  | "financiamento"
  | "previdencia"
  | "capitalizacao"
  | "outros";

export interface Produto {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  categoria: CategoriaProduto;
  icone?: string;
  cor?: string;
  ordem: number;
  ativo: boolean;
  usuario_criacao?: string;
  created_at: string;
  updated_at: string;
}

export interface ProdutoCampo {
  id: string;
  produto_id: string;
  nome_campo: string;
  tipo_campo: "text" | "number" | "date" | "select" | "checkbox" | "textarea";
  obrigatorio: boolean;
  opcoes?: string[];
  ordem: number;
}
