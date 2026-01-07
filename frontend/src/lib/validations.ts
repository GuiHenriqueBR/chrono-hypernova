// ============================================
// VALIDATIONS - Zod Schemas para Formularios
// ============================================

import { z } from "zod";

// ============================================
// Helpers de Validacao
// ============================================

// Validar CPF
function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleaned.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

// Validar CNPJ
function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  let tamanho = cleaned.length - 2;
  let numeros = cleaned.substring(0, tamanho);
  const digitos = cleaned.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cleaned.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

// ============================================
// Schema: Cliente
// ============================================

export const enderecoSchema = z.object({
  rua: z.string().min(1, "Rua e obrigatoria"),
  numero: z.string().min(1, "Numero e obrigatorio"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro e obrigatorio"),
  cidade: z.string().min(1, "Cidade e obrigatoria"),
  estado: z.string().length(2, "Estado deve ter 2 caracteres"),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, "CEP invalido"),
});

export const clienteSchema = z
  .object({
    tipo: z.enum(["PF", "PJ"], { message: "Tipo deve ser PF ou PJ" }),
    cpf_cnpj: z.string().min(1, "CPF/CNPJ e obrigatorio"),
    nome: z.string().min(3, "Nome deve ter no minimo 3 caracteres"),
    email: z.string().email("Email invalido").optional().or(z.literal("")),
    telefone: z.string().optional(),
    data_nascimento: z.string().optional(),
    endereco: enderecoSchema.optional(),
    notas: z.string().optional(),
  })
  .refine(
    (data) => {
      const cleaned = data.cpf_cnpj.replace(/\D/g, "");
      if (data.tipo === "PF") {
        return isValidCPF(cleaned);
      } else {
        return isValidCNPJ(cleaned);
      }
    },
    {
      message: "CPF/CNPJ invalido",
      path: ["cpf_cnpj"],
    }
  );

export type ClienteFormData = z.infer<typeof clienteSchema>;

// ============================================
// Schema: Apolice
// ============================================

export const apoliceSchema = z
  .object({
    cliente_id: z.string().uuid("Cliente invalido"),
    ramo: z.enum(
      [
        "auto",
        "residencial",
        "vida",
        "saude",
        "consorcio",
        "financiamento",
        "outros",
      ],
      {
        message: "Ramo de seguro invalido",
      }
    ),
    seguradora: z.string().min(2, "Seguradora e obrigatoria"),
    numero_apolice: z.string().min(1, "Numero da apolice e obrigatorio"),
    valor_premio: z
      .number()
      .min(0.01, "Valor do premio deve ser maior que zero"),
    data_inicio: z.string().min(1, "Data de inicio e obrigatoria"),
    data_vencimento: z.string().min(1, "Data de vencimento e obrigatoria"),
    dados: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) => {
      const inicio = new Date(data.data_inicio);
      const vencimento = new Date(data.data_vencimento);
      return vencimento > inicio;
    },
    {
      message: "Data de vencimento deve ser posterior a data de inicio",
      path: ["data_vencimento"],
    }
  );

export type ApoliceFormData = z.infer<typeof apoliceSchema>;

// ============================================
// Schema: Cobertura
// ============================================

export const coberturaSchema = z.object({
  apolice_id: z.string().uuid("Apolice invalida"),
  nome: z.string().min(2, "Nome da cobertura e obrigatorio"),
  limite: z.number().min(0, "Limite deve ser maior ou igual a zero"),
  franquia: z.number().min(0, "Franquia deve ser maior ou igual a zero"),
});

export type CoberturaFormData = z.infer<typeof coberturaSchema>;

// ============================================
// Schema: Sinistro
// ============================================

export const sinistroSchema = z
  .object({
    cliente_id: z.string().uuid("Cliente invalido"),
    apolice_id: z.string().uuid("Apolice invalida"),
    data_ocorrencia: z.string().min(1, "Data da ocorrencia e obrigatoria"),
    descricao: z.string().min(10, "Descricao deve ter no minimo 10 caracteres"),
    regulador: z.string().optional(),
  })
  .refine(
    (data) => {
      const ocorrencia = new Date(data.data_ocorrencia);
      return ocorrencia <= new Date();
    },
    {
      message: "Data de ocorrencia nao pode ser no futuro",
      path: ["data_ocorrencia"],
    }
  );

export type SinistroFormData = z.infer<typeof sinistroSchema>;

// ============================================
// Schema: Regulacao Sinistro
// ============================================

export const regulacaoSchema = z.object({
  sinistro_id: z.string().uuid("Sinistro invalido"),
  etapa: z.string().min(1, "Etapa e obrigatoria"),
  descricao: z.string().min(5, "Descricao deve ter no minimo 5 caracteres"),
  executado_por: z.string().min(2, "Responsavel e obrigatorio"),
});

export type RegulacaoFormData = z.infer<typeof regulacaoSchema>;

// ============================================
// Schema: Comissao
// ============================================

export const comissaoSchema = z.object({
  apolice_id: z.string().uuid("Apolice invalida"),
  valor_bruto: z.number().min(0.01, "Valor bruto deve ser maior que zero"),
  valor_liquido: z
    .number()
    .min(0, "Valor liquido deve ser maior ou igual a zero"),
  data_receita: z.string().min(1, "Data da receita e obrigatoria"),
  status: z.enum(["pendente", "recebida", "paga"], {
    message: "Status invalido",
  }),
});

export type ComissaoFormData = z.infer<typeof comissaoSchema>;

// ============================================
// Schema: Tarefa
// ============================================

export const tarefaSchema = z.object({
  tipo: z.enum(["renovacao", "vencimento", "sinistro", "pagamento", "geral"], {
    message: "Tipo de tarefa invalido",
  }),
  cliente_id: z.string().uuid().optional(),
  apolice_id: z.string().uuid().optional(),
  descricao: z.string().min(5, "Descricao deve ter no minimo 5 caracteres"),
  data_vencimento: z.string().min(1, "Data de vencimento e obrigatoria"),
  prioridade: z.enum(["baixa", "media", "alta"], {
    message: "Prioridade invalida",
  }),
});

export type TarefaFormData = z.infer<typeof tarefaSchema>;

// ============================================
// Schema: Login
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ============================================
// Schema: WhatsApp Template
// ============================================

export const whatsappTemplateSchema = z.object({
  nome: z.string().min(2, "Nome do template e obrigatorio"),
  categoria: z.enum(
    ["renovacao", "sinistro", "cobranca", "boas_vindas", "geral"],
    {
      message: "Categoria invalida",
    }
  ),
  conteudo: z.string().min(10, "Conteudo deve ter no minimo 10 caracteres"),
});

export type WhatsAppTemplateFormData = z.infer<typeof whatsappTemplateSchema>;

// ============================================
// Schema: Importacao
// ============================================

export const importacaoConfigSchema = z.object({
  tipo: z.enum(["clientes", "apolices", "comissoes"], {
    message: "Tipo de importacao invalido",
  }),
  mapeamento: z.record(z.string(), z.string()),
  ignorar_erros: z.boolean().default(false),
});

export type ImportacaoConfigFormData = z.infer<typeof importacaoConfigSchema>;

// ============================================
// Schema: Configuracoes Usuario
// ============================================

export const perfilUsuarioSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no minimo 2 caracteres"),
  email: z.string().email("Email invalido"),
  telefone: z.string().optional(),
});

export type PerfilUsuarioFormData = z.infer<typeof perfilUsuarioSchema>;

export const alterarSenhaSchema = z
  .object({
    senha_atual: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
    nova_senha: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
    confirmar_senha: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
  })
  .refine((data) => data.nova_senha === data.confirmar_senha, {
    message: "Senhas nao conferem",
    path: ["confirmar_senha"],
  });

export type AlterarSenhaFormData = z.infer<typeof alterarSenhaSchema>;

// ============================================
// Utilitarios de Formatacao
// ============================================

export const formatters = {
  cpf: (value: string): string => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    return cleaned
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  },

  cnpj: (value: string): string => {
    const cleaned = value.replace(/\D/g, "").slice(0, 14);
    return cleaned
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  },

  telefone: (value: string): string => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    if (cleaned.length <= 10) {
      return cleaned
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return cleaned
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  },

  cep: (value: string): string => {
    const cleaned = value.replace(/\D/g, "").slice(0, 8);
    return cleaned.replace(/(\d{5})(\d)/, "$1-$2");
  },

  moeda: (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  },

  data: (value: string): string => {
    return new Date(value).toLocaleDateString("pt-BR");
  },
};
