import express, { Request, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { supabase } from "../services/supabase";
import { logger } from "../utils/logger";
import axios from "axios";

const router = express.Router();

// Configuracao da Evolution API (WhatsApp)
const isProduction = process.env.NODE_ENV === "production";
const EVOLUTION_API_URL =
  process.env.EVOLUTION_API_URL ||
  (isProduction ? "http://evolution-api:8080" : "http://localhost:8080");
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "corretora";

// Helper para chamadas a Evolution API
const evolutionApi = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    apikey: EVOLUTION_API_KEY,
    "Content-Type": "application/json",
  },
});

// Webhook para receber mensagens do WhatsApp
router.post(
  "/webhook",
  asyncHandler(async (req: Request, res: Response) => {
    const { event, data, instance } = req.body;

    logger.info("Webhook WhatsApp recebido:", { event, instance });

    if (event === "messages.upsert") {
      const message = data.message;
      const remoteJid = message.key.remoteJid;
      const telefone = remoteJid
        .replace("@s.whatsapp.net", "")
        .replace("@g.us", "");
      const isFromMe = message.key.fromMe;
      const messageText =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        "[Midia]";

      // Buscar ou criar conversa
      let { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select("*")
        .eq("telefone", telefone)
        .single();

      if (!conversa) {
        // Tentar vincular com cliente existente
        const { data: cliente } = await supabase
          .from("clientes")
          .select("id, nome")
          .ilike("telefone", `%${telefone.slice(-8)}%`)
          .single();

        const { data: novaConversa } = await supabase
          .from("whatsapp_conversas")
          .insert({
            telefone,
            cliente_id: cliente?.id || null,
            nome_contato: cliente?.nome || message.pushName || telefone,
            ultima_mensagem: messageText,
            ultima_mensagem_data: new Date().toISOString(),
            nao_lidas: isFromMe ? 0 : 1,
            status: "aberta",
          })
          .select()
          .single();

        conversa = novaConversa;
      } else {
        // Atualizar conversa existente
        await supabase
          .from("whatsapp_conversas")
          .update({
            ultima_mensagem: messageText,
            ultima_mensagem_data: new Date().toISOString(),
            nao_lidas: isFromMe
              ? conversa.nao_lidas
              : (conversa.nao_lidas || 0) + 1,
          })
          .eq("id", conversa.id);
      }

      // Salvar mensagem
      await supabase.from("whatsapp_mensagens").insert({
        conversa_id: conversa?.id,
        message_id: message.key.id,
        direcao: isFromMe ? "enviada" : "recebida",
        tipo: message.message?.imageMessage
          ? "imagem"
          : message.message?.audioMessage
            ? "audio"
            : message.message?.documentMessage
              ? "documento"
              : "texto",
        conteudo: messageText,
        status: isFromMe ? "enviada" : "recebida",
        timestamp: new Date(message.messageTimestamp * 1000).toISOString(),
      });
    }

    res.json({ success: true });
  })
);

router.use(authenticate);

// Listar conversas
router.get(
  "/conversas",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from("whatsapp_conversas")
      .select(
        `
      *,
      clientes (id, nome, email)
    `,
        { count: "exact" }
      )
      .order("ultima_mensagem_data", { ascending: false });

    if (status && status !== "todas") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `nome_contato.ilike.%${search}%,telefone.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query.range(
      offset,
      offset + Number(limit) - 1
    );

    if (error) {
      logger.error("Erro ao buscar conversas:", error);
      return res.status(500).json({ error: "Erro ao buscar conversas" });
    }

    res.json({
      data: data || [],
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
    });
  })
);

// Buscar mensagens de uma conversa
router.get(
  "/conversas/:conversaId/mensagens",
  asyncHandler(async (req: Request, res: Response) => {
    const { conversaId } = req.params;
    const { page = 1, limit = 100 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Marcar como lidas
    await supabase
      .from("whatsapp_conversas")
      .update({ nao_lidas: 0 })
      .eq("id", conversaId);

    const { data, error, count } = await supabase
      .from("whatsapp_mensagens")
      .select("*", { count: "exact" })
      .eq("conversa_id", conversaId)
      .order("timestamp", { ascending: true })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      logger.error("Erro ao buscar mensagens:", error);
      return res.status(500).json({ error: "Erro ao buscar mensagens" });
    }

    res.json({
      data: data || [],
      total: count || 0,
    });
  })
);

// Enviar mensagem
router.post(
  "/enviar",
  asyncHandler(async (req: Request, res: Response) => {
    const { conversaId, telefone, mensagem, tipo = "texto" } = req.body;

    if (!mensagem || (!conversaId && !telefone)) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    let numeroDestino = telefone;

    // Se foi passado conversaId, buscar telefone
    if (conversaId && !telefone) {
      const { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select("telefone")
        .eq("id", conversaId)
        .single();

      if (!conversa) {
        return res.status(404).json({ error: "Conversa nao encontrada" });
      }
      numeroDestino = conversa.telefone;
    }

    try {
      // Enviar via Evolution API
      const response = await evolutionApi.post(
        `/message/sendText/${EVOLUTION_INSTANCE}`,
        {
          number: numeroDestino,
          text: mensagem,
        }
      );

      // Buscar ou criar conversa
      let { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select("id")
        .eq("telefone", numeroDestino)
        .single();

      if (!conversa) {
        const { data: novaConversa } = await supabase
          .from("whatsapp_conversas")
          .insert({
            telefone: numeroDestino,
            nome_contato: numeroDestino,
            ultima_mensagem: mensagem,
            ultima_mensagem_data: new Date().toISOString(),
            nao_lidas: 0,
            status: "aberta",
          })
          .select()
          .single();
        conversa = novaConversa;
      } else {
        await supabase
          .from("whatsapp_conversas")
          .update({
            ultima_mensagem: mensagem,
            ultima_mensagem_data: new Date().toISOString(),
          })
          .eq("id", conversa.id);
      }

      // Salvar mensagem enviada
      await supabase.from("whatsapp_mensagens").insert({
        conversa_id: conversa?.id,
        message_id: response.data?.key?.id || `local-${Date.now()}`,
        direcao: "enviada",
        tipo: "texto",
        conteudo: mensagem,
        status: "enviada",
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        messageId: response.data?.key?.id,
      });
    } catch (error) {
      logger.error("Erro ao enviar mensagem:", error);

      // Se Evolution API nao estiver disponivel, salvar localmente
      let { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select("id")
        .eq("telefone", numeroDestino)
        .single();

      if (conversa) {
        await supabase.from("whatsapp_mensagens").insert({
          conversa_id: conversa.id,
          message_id: `local-${Date.now()}`,
          direcao: "enviada",
          tipo: "texto",
          conteudo: mensagem,
          status: "pendente",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        warning:
          "Mensagem salva localmente, sera enviada quando WhatsApp estiver conectado",
      });
    }
  })
);

// Templates de mensagem
router.get(
  "/templates",
  asyncHandler(async (req: Request, res: Response) => {
    const { categoria } = req.query;

    let query = supabase
      .from("whatsapp_templates")
      .select("*")
      .order("categoria", { ascending: true })
      .order("uso_count", { ascending: false });

    if (categoria && categoria !== "todos") {
      query = query.eq("categoria", categoria);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Erro ao buscar templates:", error);
      return res.status(500).json({ error: "Erro ao buscar templates" });
    }

    res.json({ data: data || [] });
  })
);

// Listar categorias de templates
router.get(
  "/templates/categorias",
  asyncHandler(async (req: Request, res: Response) => {
    const categorias = [
      {
        value: "saudacao",
        label: "Saudacao",
        icon: "hand-wave",
        cor: "#10b981",
      },
      { value: "cotacao", label: "Cotacao", icon: "file-text", cor: "#8b5cf6" },
      {
        value: "sinistro",
        label: "Sinistro",
        icon: "alert-triangle",
        cor: "#ef4444",
      },
      {
        value: "cobranca",
        label: "Cobranca",
        icon: "dollar-sign",
        cor: "#f59e0b",
      },
      {
        value: "renovacao",
        label: "Renovacao",
        icon: "refresh-cw",
        cor: "#06b6d4",
      },
      {
        value: "aniversario",
        label: "Aniversario",
        icon: "gift",
        cor: "#ec4899",
      },
      {
        value: "agradecimento",
        label: "Agradecimento",
        icon: "heart",
        cor: "#f43f5e",
      },
      {
        value: "informativo",
        label: "Informativo",
        icon: "info",
        cor: "#3b82f6",
      },
      {
        value: "outros",
        label: "Outros",
        icon: "message-square",
        cor: "#6b7280",
      },
    ];

    res.json({ data: categorias });
  })
);

// Listar variaveis disponiveis para templates
router.get(
  "/templates/variaveis",
  asyncHandler(async (req: Request, res: Response) => {
    const variaveis = [
      { nome: "{{nome}}", descricao: "Nome do cliente", exemplo: "Joao Silva" },
      {
        nome: "{{primeiro_nome}}",
        descricao: "Primeiro nome do cliente",
        exemplo: "Joao",
      },
      {
        nome: "{{valor}}",
        descricao: "Valor monetario",
        exemplo: "R$ 1.500,00",
      },
      {
        nome: "{{data_vencimento}}",
        descricao: "Data de vencimento",
        exemplo: "15/01/2026",
      },
      {
        nome: "{{numero_apolice}}",
        descricao: "Numero da apolice",
        exemplo: "APL-2025-001234",
      },
      {
        nome: "{{seguradora}}",
        descricao: "Nome da seguradora",
        exemplo: "Porto Seguro",
      },
      { nome: "{{ramo}}", descricao: "Ramo do seguro", exemplo: "Auto" },
      { nome: "{{parcela}}", descricao: "Numero da parcela", exemplo: "3/12" },
      {
        nome: "{{protocolo}}",
        descricao: "Numero do protocolo",
        exemplo: "SIN-2025-0001",
      },
      {
        nome: "{{data_hoje}}",
        descricao: "Data de hoje",
        exemplo: new Date().toLocaleDateString("pt-BR"),
      },
      {
        nome: "{{hora}}",
        descricao: "Hora atual",
        exemplo: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      {
        nome: "{{corretor}}",
        descricao: "Nome do corretor",
        exemplo: "Maria Santos",
      },
    ];

    res.json({ data: variaveis });
  })
);

// Incrementar contador de uso do template
router.post(
  "/templates/:id/usar",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { error } = await supabase
      .from("whatsapp_templates")
      .update({
        uso_count: supabase.rpc("increment_uso_count", { template_id: id }),
        ultimo_uso: new Date().toISOString(),
      })
      .eq("id", id);

    // Se RPC nao existir, fazer update manual
    if (error) {
      await supabase
        .from("whatsapp_templates")
        .update({ ultimo_uso: new Date().toISOString() })
        .eq("id", id);
    }

    res.json({ success: true });
  })
);

// Processar variaveis do template com dados do cliente/contexto
router.post(
  "/templates/processar",
  asyncHandler(async (req: Request, res: Response) => {
    const { template, clienteId, contexto } = req.body;

    if (!template) {
      return res.status(400).json({ error: "Template e obrigatorio" });
    }

    let mensagemProcessada = template;

    // Se tiver clienteId, buscar dados do cliente
    if (clienteId) {
      const { data: cliente } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", clienteId)
        .single();

      if (cliente) {
        const primeiroNome = cliente.nome?.split(" ")[0] || "";
        mensagemProcessada = mensagemProcessada
          .replace(/\{\{nome\}\}/g, cliente.nome || "")
          .replace(/\{\{primeiro_nome\}\}/g, primeiroNome);
      }
    }

    // Substituir variaveis de contexto
    if (contexto) {
      Object.entries(contexto).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        mensagemProcessada = mensagemProcessada.replace(regex, String(value));
      });
    }

    // Substituir variaveis de data/hora
    mensagemProcessada = mensagemProcessada
      .replace(/\{\{data_hoje\}\}/g, new Date().toLocaleDateString("pt-BR"))
      .replace(
        /\{\{hora\}\}/g,
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );

    res.json({
      mensagem: mensagemProcessada,
      original: template,
    });
  })
);

// Criar/Atualizar template
router.post(
  "/templates",
  asyncHandler(async (req: Request, res: Response) => {
    const { id, nome, categoria, conteudo, variaveis } = req.body;

    if (!nome || !conteudo) {
      return res
        .status(400)
        .json({ error: "Nome e conteudo sao obrigatorios" });
    }

    if (id) {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .update({ nome, categoria, conteudo, variaveis })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ data });
    }

    const { data, error } = await supabase
      .from("whatsapp_templates")
      .insert({ nome, categoria, conteudo, variaveis })
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  })
);

// Deletar template
router.delete(
  "/templates/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { error } = await supabase
      .from("whatsapp_templates")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  })
);

// Vincular conversa a cliente
router.post(
  "/conversas/:conversaId/vincular",
  asyncHandler(async (req: Request, res: Response) => {
    const { conversaId } = req.params;
    const { clienteId } = req.body;

    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, nome")
      .eq("id", clienteId)
      .single();

    if (!cliente) {
      return res.status(404).json({ error: "Cliente nao encontrado" });
    }

    const { error } = await supabase
      .from("whatsapp_conversas")
      .update({
        cliente_id: clienteId,
        nome_contato: cliente.nome,
      })
      .eq("id", conversaId);

    if (error) throw error;
    res.json({ success: true });
  })
);

// Atualizar status da conversa (aberta, em_atendimento, resolvida, arquivada)
router.patch(
  "/conversas/:conversaId/status",
  asyncHandler(async (req: Request, res: Response) => {
    const { conversaId } = req.params;
    const { status, notas } = req.body;

    const updates: any = { status };
    if (notas !== undefined) updates.notas = notas;

    const { error } = await supabase
      .from("whatsapp_conversas")
      .update(updates)
      .eq("id", conversaId);

    if (error) throw error;
    res.json({ success: true });
  })
);

// Atribuir conversa a um usuário
router.patch(
  "/conversas/:conversaId/atribuir",
  asyncHandler(async (req: Request, res: Response) => {
    const { conversaId } = req.params;
    const { usuarioId } = req.body;

    const { error } = await supabase
      .from("whatsapp_conversas")
      .update({
        atribuido_usuario_id: usuarioId,
      })
      .eq("id", conversaId);

    if (error) throw error;
    res.json({ success: true });
  })
);

// Metricas do WhatsApp
router.get(
  "/metricas",
  asyncHandler(async (req: Request, res: Response) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    // Total de conversas
    const { count: totalConversas } = await supabase
      .from("whatsapp_conversas")
      .select("*", { count: "exact", head: true });

    // Conversas abertas
    const { count: conversasAbertas } = await supabase
      .from("whatsapp_conversas")
      .select("*", { count: "exact", head: true })
      .in("status", ["aberta", "em_atendimento"]);

    // Mensagens hoje
    const { count: mensagensHoje } = await supabase
      .from("whatsapp_mensagens")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", hoje.toISOString());

    // Mensagens na semana
    const { count: mensagensSemana } = await supabase
      .from("whatsapp_mensagens")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", inicioSemana.toISOString());

    // Mensagens no mes
    const { count: mensagensMes } = await supabase
      .from("whatsapp_mensagens")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", inicioMes.toISOString());

    // Clientes vinculados
    const { count: clientesVinculados } = await supabase
      .from("whatsapp_conversas")
      .select("*", { count: "exact", head: true })
      .not("cliente_id", "is", null);

    res.json({
      totalConversas: totalConversas || 0,
      conversasAbertas: conversasAbertas || 0,
      mensagensHoje: mensagensHoje || 0,
      mensagensSemana: mensagensSemana || 0,
      mensagensMes: mensagensMes || 0,
      clientesVinculados: clientesVinculados || 0,
      taxaVinculacao: totalConversas
        ? Math.round(((clientesVinculados || 0) / totalConversas) * 100)
        : 0,
    });
  })
);

// Status da conexao WhatsApp
router.get(
  "/status",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const response = await evolutionApi.get(
        `/instance/connectionState/${EVOLUTION_INSTANCE}`
      );
      res.json({
        conectado: response.data?.instance?.state === "open",
        estado: response.data?.instance?.state || "desconhecido",
        instancia: EVOLUTION_INSTANCE,
      });
    } catch (error: any) {
      res.json({
        conectado: false,
        estado: "desconectado",
        instancia: EVOLUTION_INSTANCE,
        mensagem: "Evolution API nao disponivel",
        erro: error.message || String(error),
      });
    }
  })
);

// Criar instancia do WhatsApp
router.post(
  "/instancia/criar",
  asyncHandler(async (req: Request, res: Response) => {
    const { nomeInstancia } = req.body;
    const instanceName = nomeInstancia || EVOLUTION_INSTANCE;

    try {
      // Verificar se instancia ja existe
      const checkResponse = await evolutionApi.get(`/instance/fetchInstances`);
      const existingInstance = checkResponse.data?.find(
        (inst: any) => inst.instance?.instanceName === instanceName
      );

      if (existingInstance) {
        return res.json({
          success: true,
          instancia: instanceName,
          mensagem: "Instancia ja existe",
        });
      }

      // Criar nova instancia
      const response = await evolutionApi.post("/instance/create", {
        instanceName: instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      });

      res.json({
        success: true,
        instancia: instanceName,
        dados: response.data,
      });
    } catch (error: any) {
      logger.error(
        "Erro ao criar instancia:",
        error.response?.data || error.message
      );
      res.status(500).json({
        error: "Erro ao criar instancia",
        detalhes: error.response?.data?.message || error.message,
      });
    }
  })
);

// Obter QR Code para conexao
router.get(
  "/qrcode",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Tentar obter estado da conexao
      try {
        const stateResponse = await evolutionApi.get(
          `/instance/connectionState/${EVOLUTION_INSTANCE}`
        );
        const state = stateResponse.data?.instance?.state;

        if (state === "open") {
          return res.json({
            success: true,
            conectado: true,
            estado: "open",
            mensagem: "WhatsApp ja esta conectado",
          });
        }
      } catch (error: any) {
        // Se der 404, a instancia nao existe. Tentar criar.
        if (error.response?.status === 404) {
          logger.info(
            `Instancia ${EVOLUTION_INSTANCE} nao encontrada. Criando...`
          );
          try {
            await evolutionApi.post("/instance/create", {
              instanceName: EVOLUTION_INSTANCE,
              qrcode: true,
              integration: "WHATSAPP-BAILEYS",
            });
            // Aguardar um pouco para a instancia subir
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } catch (createError) {
            logger.error("Erro ao criar instancia automatica:", createError);
            // Continua para tentar /connect que vai falhar e retornar erro adequado
          }
        }
      }

      // Buscar QR Code
      const response = await evolutionApi.get(
        `/instance/connect/${EVOLUTION_INSTANCE}`
      );

      res.json({
        success: true,
        conectado: false,
        estado: "connecting",
        qrcode: response.data?.base64 || response.data?.qrcode?.base64,
        pairingCode: response.data?.pairingCode,
        instancia: EVOLUTION_INSTANCE,
      });
    } catch (error: any) {
      logger.error(
        "Erro ao obter QR Code:",
        error.response?.data || error.message
      );

      // Se a instancia nao existir, tentar criar
      if (
        error.response?.status === 404 ||
        error.response?.data?.error?.includes("not found")
      ) {
        try {
          // Criar instancia
          await evolutionApi.post("/instance/create", {
            instanceName: EVOLUTION_INSTANCE,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          });

          // Buscar QR Code da nova instancia
          const qrResponse = await evolutionApi.get(
            `/instance/connect/${EVOLUTION_INSTANCE}`
          );

          return res.json({
            success: true,
            conectado: false,
            estado: "aguardando_qr",
            qrcode: qrResponse.data?.base64 || qrResponse.data?.qrcode?.base64,
            pairingCode: qrResponse.data?.pairingCode,
            instancia: EVOLUTION_INSTANCE,
            mensagem: "Instancia criada, escaneie o QR Code",
          });
        } catch (createError: any) {
          logger.error(
            "Erro ao criar instancia:",
            createError.response?.data || createError.message
          );
        }
      }

      res.json({
        success: false,
        conectado: false,
        estado: "erro",
        instancia: EVOLUTION_INSTANCE,
        error: "Nao foi possivel obter QR Code",
        detalhes: error.response?.data?.message || error.message,
      });
    }
  })
);

// Desconectar WhatsApp
router.post(
  "/desconectar",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      await evolutionApi.delete(`/instance/logout/${EVOLUTION_INSTANCE}`);

      res.json({
        success: true,
        mensagem: "WhatsApp desconectado com sucesso",
      });
    } catch (error: any) {
      logger.error(
        "Erro ao desconectar:",
        error.response?.data || error.message
      );
      res.status(500).json({
        error: "Erro ao desconectar",
        detalhes: error.response?.data?.message || error.message,
      });
    }
  })
);

// Reiniciar instancia
router.post(
  "/reiniciar",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      await evolutionApi.put(`/instance/restart/${EVOLUTION_INSTANCE}`);

      res.json({
        success: true,
        mensagem: "Instancia reiniciada com sucesso",
      });
    } catch (error: any) {
      const errorData = error.response?.data || error.message;
      logger.error("Erro ao reiniciar:", errorData);

      // Se a instancia nao existir (404), tentar criar
      if (
        error.response?.status === 404 ||
        error.response?.data?.error?.includes("not found")
      ) {
        try {
          logger.info(
            `Instancia ${EVOLUTION_INSTANCE} nao encontrada no restart. Criando...`
          );

          await evolutionApi.post("/instance/create", {
            instanceName: EVOLUTION_INSTANCE,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          });

          return res.json({
            success: true,
            mensagem: "Instancia nao existia e foi criada com sucesso",
          });
        } catch (createError: any) {
          logger.error(
            "Erro ao criar instancia (fallback restart):",
            createError.response?.data || createError.message
          );
        }
      }

      res.status(500).json({
        error: "Erro ao reiniciar",
        detalhes: error.response?.data?.message || error.message,
      });
    }
  })
);

// Informacoes da instancia conectada
router.get(
  "/info",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const response = await evolutionApi.get(`/instance/fetchInstances`);
      const instance = response.data?.find(
        (inst: any) => inst.instance?.instanceName === EVOLUTION_INSTANCE
      );

      if (!instance) {
        return res.json({
          success: false,
          instancia: EVOLUTION_INSTANCE,
          mensagem: "Instancia nao encontrada",
        });
      }

      res.json({
        success: true,
        instancia: EVOLUTION_INSTANCE,
        estado: instance.instance?.state,
        numero: instance.instance?.owner?.split("@")[0],
        nome: instance.instance?.profileName,
        foto: instance.instance?.profilePictureUrl,
      });
    } catch (error: any) {
      logger.error(
        "Erro ao buscar info:",
        error.response?.data || error.message
      );
      res.json({
        success: false,
        instancia: EVOLUTION_INSTANCE,
        error: "Evolution API nao disponivel",
      });
    }
  })
);

// Configurar webhook para receber mensagens
router.post(
  "/webhook/configurar",
  asyncHandler(async (req: Request, res: Response) => {
    const { webhookUrl } = req.body;
    const url =
      webhookUrl ||
      `${process.env.BACKEND_URL || "http://localhost:3001"}/api/whatsapp/webhook`;

    try {
      await evolutionApi.post(`/webhook/set/${EVOLUTION_INSTANCE}`, {
        enabled: true,
        url: url,
        webhookByEvents: true,
        events: [
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "MESSAGES_DELETE",
          "CONNECTION_UPDATE",
          "QRCODE_UPDATED",
        ],
      });

      res.json({
        success: true,
        mensagem: "Webhook configurado com sucesso",
        url: url,
      });
    } catch (error: any) {
      logger.error(
        "Erro ao configurar webhook:",
        error.response?.data || error.message
      );
      res.status(500).json({
        error: "Erro ao configurar webhook",
        detalhes: error.response?.data?.message || error.message,
      });
    }
  })
);

// Enviar mensagem com midia
router.post(
  "/enviar-midia",
  asyncHandler(async (req: Request, res: Response) => {
    const { conversaId, telefone, tipo, mediaUrl, caption, fileName } =
      req.body;

    if (!mediaUrl || (!conversaId && !telefone)) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    let numeroDestino = telefone;

    if (conversaId && !telefone) {
      const { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select("telefone")
        .eq("id", conversaId)
        .single();

      if (!conversa) {
        return res.status(404).json({ error: "Conversa nao encontrada" });
      }
      numeroDestino = conversa.telefone;
    }

    try {
      let endpoint = "";
      let payload: any = {
        number: numeroDestino,
      };

      switch (tipo) {
        case "imagem":
          endpoint = `/message/sendMedia/${EVOLUTION_INSTANCE}`;
          payload = {
            ...payload,
            mediatype: "image",
            media: mediaUrl,
            caption,
          };
          break;
        case "documento":
          endpoint = `/message/sendMedia/${EVOLUTION_INSTANCE}`;
          payload = {
            ...payload,
            mediatype: "document",
            media: mediaUrl,
            fileName,
          };
          break;
        case "audio":
          endpoint = `/message/sendWhatsAppAudio/${EVOLUTION_INSTANCE}`;
          payload = { ...payload, audio: mediaUrl };
          break;
        default:
          return res.status(400).json({ error: "Tipo de midia invalido" });
      }

      const response = await evolutionApi.post(endpoint, payload);

      // Salvar mensagem
      let { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select("id")
        .eq("telefone", numeroDestino)
        .single();

      if (conversa) {
        await supabase.from("whatsapp_mensagens").insert({
          conversa_id: conversa.id,
          message_id: response.data?.key?.id || `local-${Date.now()}`,
          direcao: "enviada",
          tipo: tipo,
          conteudo: caption || fileName || "[Midia]",
          media_url: mediaUrl,
          status: "enviada",
          timestamp: new Date().toISOString(),
        });

        await supabase
          .from("whatsapp_conversas")
          .update({
            ultima_mensagem: caption || fileName || "[Midia]",
            ultima_mensagem_data: new Date().toISOString(),
          })
          .eq("id", conversa.id);
      }

      res.json({
        success: true,
        messageId: response.data?.key?.id,
      });
    } catch (error: any) {
      logger.error(
        "Erro ao enviar midia:",
        error.response?.data || error.message
      );
      res.status(500).json({
        error: "Erro ao enviar midia",
        detalhes: error.response?.data?.message || error.message,
      });
    }
  })
);

export default router;
