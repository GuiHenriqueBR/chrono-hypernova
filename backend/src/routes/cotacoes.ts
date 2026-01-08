import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

const router = Router();
router.use(authenticate);

// ============================================
// COTAÇÕES COM SISTEMA DE CRM/PIPELINE
// ============================================

// Status do pipeline de vendas
const STATUS_PIPELINE = [
  "nova",
  "em_cotacao",
  "enviada",
  "em_negociacao",
  "fechada_ganha",
  "fechada_perdida",
] as const;

// Listar cotacoes (com filtros)
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      cliente_id,
      ramo,
      status,
      status_pipeline,
      search,
      page = 1,
      limit = 50,
    } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from("cotacoes")
      .select("*, clientes(id, nome, cpf_cnpj, email, telefone)", {
        count: "exact",
      })
      .order("updated_at", { ascending: false });

    if (cliente_id) {
      query = query.eq("cliente_id", cliente_id);
    }
    if (ramo) {
      query = query.eq("ramo", ramo);
    }
    if (status_pipeline) {
      query = query.eq("status_pipeline", status_pipeline);
    }
    if (search) {
      query = query.or(
        `dados_cotacao->>'modelo'.ilike.%${search}%,clientes.nome.ilike.%${search}%,lead_nome.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query.range(
      offset,
      offset + Number(limit) - 1
    );

    if (error) throw error;

    res.json({
      data: data || [],
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
    });
  })
);

// Criar cotacao
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      cliente_id,
      ramo,
      dados_cotacao,
      seguradoras_json,
      validade_cotacao,
      valor_estimado,
      proximo_contato,
      lead_nome,
      lead_telefone,
    } = req.body;

    const { data, error } = await supabase
      .from("cotacoes")
      .insert({
        cliente_id: cliente_id || null,
        lead_nome,
        lead_telefone,
        ramo,
        dados_cotacao,
        seguradoras_json,
        validade_cotacao,
        valor_estimado,
        proximo_contato,
        status_pipeline: "nova",
        data_criacao: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  })
);

// Buscar cotacao por ID (com histórico)
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("cotacoes")
      .select("*, clientes(*), cotacao_historico(*)")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Cotação não encontrada" });

    res.json(data);
  })
);

// Atualizar cotacao
router.put(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from("cotacoes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  })
);

// ============================================
// PIPELINE DE VENDAS - Movimentação de Status
// ============================================
router.patch(
  "/:id/status",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status_pipeline, motivo_perda, notas } = req.body;

    if (!STATUS_PIPELINE.includes(status_pipeline)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    // Buscar cotação atual para registrar histórico
    const { data: cotacaoAtual } = await supabase
      .from("cotacoes")
      .select("status_pipeline, cliente_id, lead_nome, lead_telefone")
      .eq("id", id)
      .single();

    const updates: any = {
      status_pipeline,
      updated_at: new Date().toISOString(),
    };

    // Se enviada, registrar data de envio
    if (
      status_pipeline === "enviada" &&
      cotacaoAtual?.status_pipeline !== "enviada"
    ) {
      updates.data_envio = new Date().toISOString();
    }

    // Se fechada (ganha ou perdida), registrar dados
    if (status_pipeline === "fechada_perdida") {
      updates.motivo_perda = motivo_perda;
      updates.data_fechamento = new Date().toISOString();
    }
    if (status_pipeline === "fechada_ganha") {
      updates.data_fechamento = new Date().toISOString();
      const { dados_cliente } = req.body;

      // Se enviou dados do cliente, criar ou atualizar
      if (dados_cliente || !cotacaoAtual?.cliente_id) {
        let clienteId = cotacaoAtual?.cliente_id;

        if (clienteId) {
          // Atualizar cliente existente
          if (dados_cliente) {
            await supabase
              .from("clientes")
              .update({
                ...dados_cliente,
                ativo: true,
                updated_at: new Date().toISOString(),
              })
              .eq("id", clienteId);
          } else {
            // Apenas ativar se não mandou dados
            await supabase
              .from("clientes")
              .update({ ativo: true, updated_at: new Date().toISOString() })
              .eq("id", clienteId);
          }
        } else {
          // Criar novo cliente (Lead -> Cliente)
          const novoCliente = {
            nome:
              dados_cliente?.nome ||
              cotacaoAtual?.lead_nome ||
              "Cliente (Lead)",
            telefone: dados_cliente?.telefone || cotacaoAtual?.lead_telefone,
            email: dados_cliente?.email,
            cpf_cnpj: dados_cliente?.cpf_cnpj,
            tipo: dados_cliente?.tipo || "PF",
            ativo: true,
            usuario_id: (req as any).user?.id,
          };

          const { data: newClient, error: errClient } = await supabase
            .from("clientes")
            .insert(novoCliente)
            .select()
            .single();

          if (errClient) {
            logger.error("Erro ao criar cliente na conversão:", errClient);
          } else if (newClient) {
            updates.cliente_id = newClient.id;
          }
        }
      }
    }

    // Atualizar cotação
    const { data, error } = await supabase
      .from("cotacoes")
      .update(updates)
      .eq("id", id)
      .select("*, clientes(*)")
      .single();

    if (error) throw error;

    // Registrar no histórico
    await supabase.from("cotacao_historico").insert({
      cotacao_id: id,
      status_anterior: cotacaoAtual?.status_pipeline || "nova",
      status_novo: status_pipeline,
      notas,
      data_evento: new Date().toISOString(),
    });

    res.json(data);
  })
);

// ============================================
// AGENDAMENTO DE FOLLOW-UP
// ============================================
router.patch(
  "/:id/agendar-followup",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { proximo_contato, notas } = req.body;

    const { data, error } = await supabase
      .from("cotacoes")
      .update({
        proximo_contato,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Registrar no histórico
    if (notas) {
      await supabase.from("cotacao_historico").insert({
        cotacao_id: id,
        tipo_evento: "follow_up_agendado",
        notas: `Follow-up agendado para ${new Date(
          proximo_contato
        ).toLocaleDateString("pt-BR")}: ${notas}`,
        data_evento: new Date().toISOString(),
      });
    }

    res.json(data);
  })
);

// ============================================
// HISTÓRICO DE NEGOCIAÇÃO
// ============================================
router.get(
  "/:id/historico",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("cotacao_historico")
      .select("*")
      .eq("cotacao_id", id)
      .order("data_evento", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  })
);

router.post(
  "/:id/historico",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tipo_evento, notas, resultado } = req.body;

    // tipo_evento: 'ligacao', 'email', 'whatsapp', 'reuniao', 'anotacao'

    const { data, error } = await supabase
      .from("cotacao_historico")
      .insert({
        cotacao_id: id,
        tipo_evento: tipo_evento || "anotacao",
        notas,
        resultado, // 'positivo', 'neutro', 'negativo'
        data_evento: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Atualizar updated_at da cotação
    await supabase
      .from("cotacoes")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    res.status(201).json(data);
  })
);

// ============================================
// ESTATÍSTICAS DE COTAÇÕES
// ============================================
router.get(
  "/stats/pipeline",
  asyncHandler(async (req: Request, res: Response) => {
    const { data: cotacoes } = await supabase
      .from("cotacoes")
      .select("status_pipeline, valor_estimado");

    const stats: Record<string, { count: number; valor: number }> = {};

    STATUS_PIPELINE.forEach((status) => {
      stats[status] = { count: 0, valor: 0 };
    });

    cotacoes?.forEach((c: any) => {
      const status = c.status_pipeline || "nova";
      if (stats[status]) {
        stats[status].count++;
        stats[status].valor += c.valor_estimado || 0;
      }
    });

    res.json(stats);
  })
);

// Converter Cotacao em Proposta
router.post(
  "/:id/converter-proposta",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { proposta_escolhida } = req.body;

    // 1. Buscar cotacao
    const { data: cotacao, error: errCotacao } = await supabase
      .from("cotacoes")
      .select("*")
      .eq("id", id)
      .single();

    if (errCotacao || !cotacao) throw new Error("Cotação não encontrada");

    let updatedClienteId = cotacao.cliente_id;

    // 1.5 Se for lead (sem cliente_id), criar o cliente agora
    if (!updatedClienteId) {
      if (!cotacao.lead_nome) {
        throw new Error(
          "Cotação sem cliente e sem nome de lead. Impossível converter."
        );
      }

      const { data: newClient, error: errClient } = await supabase
        .from("clientes")
        .insert({
          nome: cotacao.lead_nome,
          telefone: cotacao.lead_telefone,
          tipo: "PF", // Default
          cpf_cnpj: null, // Lead pode não ter CPF ainda
          ativo: true,
          usuario_id: (req as any).user?.id,
        })
        .select()
        .single();

      if (errClient)
        throw new Error(`Erro ao criar cliente: ${errClient.message}`);

      updatedClienteId = newClient.id;

      // Vincular cliente à cotação
      await supabase
        .from("cotacoes")
        .update({ cliente_id: updatedClienteId })
        .eq("id", id);
    }

    // 2. Criar proposta
    const { data: proposta, error: errProposta } = await supabase
      .from("propostas")
      .insert({
        cliente_id: updatedClienteId,
        ramo: cotacao.ramo,
        dados_propostos: { ...cotacao.dados_cotacao, ...proposta_escolhida },
        valor_proposto: proposta_escolhida.valor,
        status: "rascunho",
        data_criacao: new Date().toISOString(),
      })
      .select()
      .single();

    if (errProposta) throw errProposta;

    // 3. Atualizar status da cotação para fechada_ganha
    await supabase
      .from("cotacoes")
      .update({
        status_pipeline: "fechada_ganha",
        data_fechamento: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    res.status(201).json(proposta);
  })
);

export default router;
