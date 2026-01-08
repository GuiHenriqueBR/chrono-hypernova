import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error("CRITICAL: Supabase credentials missing", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
  });
  throw new Error("Supabase URL e Key são obrigatórios");
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Database types
export type Database = {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          email: string;
          nome: string;
          role: "admin" | "corretor" | "assistente";
          ativo: boolean;
          created_at: string;
        };
      };
      clientes: {
        Row: {
          id: string;
          usuario_id?: string;
          tipo: "PF" | "PJ";
          cpf_cnpj: string;
          nome: string;
          email?: string;
          telefone?: string;
          data_nascimento?: string;
          endereco?: {
            rua: string;
            numero: string;
            complemento?: string;
            bairro: string;
            cidade: string;
            estado: string;
            cep: string;
          };
          notas?: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      apolices: {
        Row: {
          id: string;
          cliente_id: string;
          ramo:
            | "auto"
            | "residencial"
            | "vida"
            | "saude"
            | "consorcio"
            | "financiamento";
          seguradora: string;
          numero_apolice: string;
          valor_premio: number;
          data_inicio: string;
          data_vencimento: string;
          status: "vigente" | "vencida" | "cancelada";
          dados_json?: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
      };
      sinistros: {
        Row: {
          id: string;
          cliente_id: string;
          apolice_id: string;
          numero_sinistro: string;
          data_ocorrencia: string;
          descricao_ocorrencia: string;
          status:
            | "notificado"
            | "analise_inicial"
            | "documentacao"
            | "regulacao"
            | "cobertura_confirmada"
            | "indenizacao_processando"
            | "pago"
            | "recusado";
          regulador?: string;
          valor_indenizacao?: number;
          created_at: string;
        };
      };
      comissoes: {
        Row: {
          id: string;
          apolice_id: string;
          valor_bruto: number;
          descontos_json?: Record<string, unknown>;
          valor_liquido: number;
          data_receita?: string;
          status: "pendente" | "recebida" | "paga";
          data_recebimento?: string;
          created_at: string;
        };
      };
      tarefas: {
        Row: {
          id: string;
          usuario_id: string;
          tipo: "renovacao" | "vencimento" | "sinistro" | "pagamento" | "geral";
          cliente_id?: string;
          apolice_id?: string;
          descricao: string;
          data_vencimento: string;
          prioridade: "baixa" | "media" | "alta";
          concluida: boolean;
          created_at: string;
        };
      };
    };
  };
};
