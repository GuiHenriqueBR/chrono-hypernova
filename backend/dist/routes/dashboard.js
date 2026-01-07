"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../services/supabase");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ============================================
// FOCO DO DIA - Agregação inteligente de itens urgentes
// ============================================
router.get("/foco-do-dia", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const hoje = new Date().toISOString().split("T")[0];
    const cincoDias = new Date();
    cincoDias.setDate(cincoDias.getDate() + 5);
    const cincoDiasStr = cincoDias.toISOString().split("T")[0];
    // 1. Tarefas de hoje
    const { data: tarefasHoje } = await supabase_1.supabase
        .from("tarefas")
        .select("id, descricao, prioridade, tipo, cliente_id, clientes(nome)")
        .eq("concluida", false)
        .lte("data_vencimento", hoje)
        .order("prioridade", { ascending: true })
        .limit(10);
    // 2. Apólices vencendo em 5 dias
    const { data: apolicesVencendo } = await supabase_1.supabase
        .from("apolices")
        .select("id, numero_apolice, seguradora, ramo, data_vencimento, valor_premio, clientes(id, nome)")
        .eq("status", "vigente")
        .gte("data_vencimento", hoje)
        .lte("data_vencimento", cincoDiasStr)
        .order("data_vencimento", { ascending: true })
        .limit(10);
    // 3. Cotações aguardando follow-up (enviadas há mais de 2 dias sem resposta)
    const doisDiasAtras = new Date();
    doisDiasAtras.setDate(doisDiasAtras.getDate() - 2);
    const { data: cotacoesFollowUp } = await supabase_1.supabase
        .from("cotacoes")
        .select("id, ramo, dados_cotacao, data_envio, proximo_contato, clientes(id, nome, telefone)")
        .eq("status_pipeline", "enviada")
        .or(`proximo_contato.lte.${hoje},proximo_contato.is.null`)
        .order("proximo_contato", { ascending: true, nullsFirst: true })
        .limit(10);
    // 4. Sinistros pendentes de ação
    const { data: sinistrosPendentes } = await supabase_1.supabase
        .from("sinistros")
        .select("id, numero_sinistro, status, descricao_ocorrencia, clientes(nome)")
        .in("status", ["notificado", "documentacao", "analise_inicial"])
        .order("created_at", { ascending: true })
        .limit(5);
    // Montar itens do foco do dia com prioridade
    const itens = [];
    // Tarefas atrasadas (prioridade máxima)
    tarefasHoje?.forEach((t) => {
        const isAtrasada = t.data_vencimento < hoje;
        itens.push({
            id: `tarefa-${t.id}`,
            tipo: "tarefa",
            titulo: t.descricao,
            subtitulo: t.clientes?.nome || "Sem cliente",
            urgencia: isAtrasada
                ? "atrasada"
                : t.prioridade === "alta"
                    ? "alta"
                    : "normal",
            link: "/agenda",
            data: t.data_vencimento,
            entidade_id: t.id,
        });
    });
    // Apólices vencendo
    apolicesVencendo?.forEach((a) => {
        const vencimento = new Date(a.data_vencimento);
        const diffDias = Math.ceil((vencimento.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        itens.push({
            id: `apolice-${a.id}`,
            tipo: "renovacao",
            titulo: `Renovação ${a.ramo?.toUpperCase()} - ${a.seguradora}`,
            subtitulo: `${a.clientes?.nome} - Vence em ${diffDias} dias`,
            urgencia: diffDias <= 2 ? "alta" : "normal",
            link: `/apolices/${a.id}`,
            data: a.data_vencimento,
            entidade_id: a.id,
            valor: a.valor_premio,
        });
    });
    // Cotações para follow-up
    cotacoesFollowUp?.forEach((c) => {
        itens.push({
            id: `cotacao-${c.id}`,
            tipo: "follow_up",
            titulo: `Follow-up: ${c.dados_cotacao?.modelo || c.ramo?.toUpperCase()}`,
            subtitulo: c.clientes?.nome,
            urgencia: "normal",
            link: `/cotacoes/${c.id}`,
            data: c.proximo_contato || c.data_envio,
            entidade_id: c.id,
            telefone: c.clientes?.telefone,
        });
    });
    // Sinistros pendentes
    sinistrosPendentes?.forEach((s) => {
        itens.push({
            id: `sinistro-${s.id}`,
            tipo: "sinistro",
            titulo: `Sinistro ${s.numero_sinistro} - ${s.status}`,
            subtitulo: s.clientes?.nome,
            urgencia: "alta",
            link: `/sinistros/${s.id}`,
            entidade_id: s.id,
        });
    });
    // Ordenar por urgência
    const ordemUrgencia = {
        atrasada: 0,
        alta: 1,
        normal: 2,
    };
    itens.sort((a, b) => (ordemUrgencia[a.urgencia] || 2) - (ordemUrgencia[b.urgencia] || 2));
    res.json({
        itens: itens.slice(0, 15),
        resumo: {
            tarefas: tarefasHoje?.length || 0,
            renovacoes: apolicesVencendo?.length || 0,
            followUps: cotacoesFollowUp?.length || 0,
            sinistros: sinistrosPendentes?.length || 0,
        },
    });
}));
// ============================================
// PIPELINE DE VENDAS - Kanban de cotações
// ============================================
router.get("/pipeline-vendas", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Buscar cotações agrupadas por status
    const { data: cotacoes } = await supabase_1.supabase
        .from("cotacoes")
        .select(`
      id, ramo, dados_cotacao, data_criacao, data_envio, proximo_contato,
      status_pipeline, valor_estimado, motivo_perda, notas_negociacao, lead_nome, lead_telefone,
      clientes(id, nome, telefone, email)
    `)
        .order("updated_at", { ascending: false });
    // Agrupar por status
    const pipeline = {
        nova: [],
        em_cotacao: [],
        enviada: [],
        em_negociacao: [],
        fechada_ganha: [],
        fechada_perdida: [],
    };
    cotacoes?.forEach((c) => {
        const status = c.status_pipeline || "nova";
        if (!pipeline[status]) {
            pipeline[status] = [];
        }
        pipeline[status].push({
            id: c.id,
            cliente: c.clientes?.nome || c.lead_nome || "Lead (Sem Nome)",
            telefone: c.clientes?.telefone || c.lead_telefone,
            email: c.clientes?.email,
            ramo: c.ramo,
            modelo: c.dados_cotacao?.modelo,
            valor: c.valor_estimado || c.dados_cotacao?.valor_estimado,
            dataCriacao: c.data_criacao,
            dataEnvio: c.data_envio,
            proximoContato: c.proximo_contato,
            diasParado: calcularDiasParado(c),
            motivoPerda: c.motivo_perda,
            notas: c.notas_negociacao,
        });
    });
    // Métricas
    const totalCotacoes = cotacoes?.length || 0;
    const ganhas = pipeline.fechada_ganha.length;
    const perdidas = pipeline.fechada_perdida.length;
    const taxaConversao = totalCotacoes > 0
        ? Math.round((ganhas / (ganhas + perdidas || 1)) * 100)
        : 0;
    const valorPipelineAtivo = [
        ...pipeline.nova,
        ...pipeline.em_cotacao,
        ...pipeline.enviada,
        ...pipeline.em_negociacao,
    ].reduce((acc, c) => acc + (c.valor || 0), 0);
    res.json({
        pipeline,
        metricas: {
            totalCotacoes,
            emAndamento: totalCotacoes - ganhas - perdidas,
            ganhas,
            perdidas,
            taxaConversao,
            valorPipelineAtivo,
        },
    });
}));
function calcularDiasParado(cotacao) {
    const ultimaAtualizacao = cotacao.updated_at || cotacao.data_criacao;
    const diff = new Date().getTime() - new Date(ultimaAtualizacao).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}
// ============================================
// MÉTRICAS DE CONVERSÃO
// ============================================
router.get("/metricas-conversao", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { periodo = "30" } = req.query;
    const diasAtras = new Date();
    diasAtras.setDate(diasAtras.getDate() - Number(periodo));
    const dataInicio = diasAtras.toISOString().split("T")[0];
    // Cotações criadas no período
    const { data: cotacoes, count: totalCotacoes } = await supabase_1.supabase
        .from("cotacoes")
        .select("id, status_pipeline, valor_estimado, ramo", { count: "exact" })
        .gte("data_criacao", dataInicio);
    // Agrupar por status
    const porStatus = {};
    const valorPorStatus = {};
    cotacoes?.forEach((c) => {
        const status = c.status_pipeline || "nova";
        porStatus[status] = (porStatus[status] || 0) + 1;
        valorPorStatus[status] =
            (valorPorStatus[status] || 0) + (c.valor_estimado || 0);
    });
    // Cotações por ramo
    const porRamo = {};
    cotacoes?.forEach((c) => {
        const ramo = c.ramo || "outros";
        if (!porRamo[ramo])
            porRamo[ramo] = { total: 0, ganhas: 0 };
        porRamo[ramo].total++;
        if (c.status_pipeline === "fechada_ganha")
            porRamo[ramo].ganhas++;
    });
    // Calcular taxas
    const ganhas = porStatus["fechada_ganha"] || 0;
    const perdidas = porStatus["fechada_perdida"] || 0;
    const finalizadas = ganhas + perdidas;
    res.json({
        periodo: Number(periodo),
        totalCotacoes: totalCotacoes || 0,
        porStatus,
        valorPorStatus,
        porRamo,
        taxas: {
            conversaoGeral: finalizadas > 0 ? Math.round((ganhas / finalizadas) * 100) : 0,
            envioProposta: totalCotacoes
                ? Math.round((((porStatus["enviada"] || 0) +
                    (porStatus["em_negociacao"] || 0) +
                    ganhas +
                    perdidas) /
                    totalCotacoes) *
                    100)
                : 0,
            fechamento: (porStatus["enviada"] || 0) + (porStatus["em_negociacao"] || 0) > 0
                ? Math.round((ganhas /
                    ((porStatus["enviada"] || 0) +
                        (porStatus["em_negociacao"] || 0) +
                        ganhas +
                        perdidas)) *
                    100)
                : 0,
        },
        valorTotal: {
            pipeline: valorPorStatus["nova"] +
                valorPorStatus["em_cotacao"] +
                valorPorStatus["enviada"] +
                valorPorStatus["em_negociacao"] || 0,
            ganho: valorPorStatus["fechada_ganha"] || 0,
            perdido: valorPorStatus["fechada_perdida"] || 0,
        },
    });
}));
// GET /api/dashboard/charts - Dados para os graficos do dashboard
router.get("/charts", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // 1. Apolices por Ramo
    const { data: apolicesPorRamo } = await supabase_1.supabase
        .from("apolices")
        .select("ramo")
        .eq("status", "vigente");
    const ramoCount = {};
    apolicesPorRamo?.forEach((a) => {
        const ramo = a.ramo || "outros";
        ramoCount[ramo] = (ramoCount[ramo] || 0) + 1;
    });
    const apolicesRamoChart = [
        { label: "Auto", value: ramoCount["auto"] || 0, color: "#8b5cf6" },
        { label: "Vida", value: ramoCount["vida"] || 0, color: "#06b6d4" },
        {
            label: "Residencial",
            value: ramoCount["residencial"] || 0,
            color: "#f59e0b",
        },
        { label: "Saude", value: ramoCount["saude"] || 0, color: "#10b981" },
        {
            label: "Consorcio",
            value: ramoCount["consorcio"] || 0,
            color: "#ec4899",
        },
        {
            label: "Financiamento",
            value: ramoCount["financiamento"] || 0,
            color: "#6366f1",
        },
    ].filter((item) => item.value > 0);
    const totalApolices = apolicesRamoChart.reduce((acc, item) => acc + item.value, 0);
    // 2. Sinistros por mes (ultimos 6 meses)
    const sinistrosMensais = [];
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const inicioMes = data.toISOString().split("T")[0];
        const fimMes = new Date(data.getFullYear(), data.getMonth() + 1, 0)
            .toISOString()
            .split("T")[0];
        const { count } = await supabase_1.supabase
            .from("sinistros")
            .select("*", { count: "exact", head: true })
            .gte("data_ocorrencia", inicioMes)
            .lte("data_ocorrencia", fimMes);
        const meses = [
            "Jan",
            "Fev",
            "Mar",
            "Abr",
            "Mai",
            "Jun",
            "Jul",
            "Ago",
            "Set",
            "Out",
            "Nov",
            "Dez",
        ];
        sinistrosMensais.push({
            label: meses[data.getMonth()],
            value: count || 0,
            color: "#f59e0b",
        });
    }
    // 3. Comissoes por mes (ultimos 12 meses)
    const comissoesMensais = [];
    for (let i = 11; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const inicioMes = data.toISOString().split("T")[0];
        const fimMes = new Date(data.getFullYear(), data.getMonth() + 1, 0)
            .toISOString()
            .split("T")[0];
        const { data: comissoes } = await supabase_1.supabase
            .from("comissoes")
            .select("valor_liquido")
            .gte("data_receita", inicioMes)
            .lte("data_receita", fimMes);
        const totalMes = comissoes?.reduce((acc, c) => acc + (c.valor_liquido || 0), 0) || 0;
        const meses = [
            "Jan",
            "Fev",
            "Mar",
            "Abr",
            "Mai",
            "Jun",
            "Jul",
            "Ago",
            "Set",
            "Out",
            "Nov",
            "Dez",
        ];
        comissoesMensais.push({
            label: meses[data.getMonth()],
            value: Math.round(totalMes / 1000), // Em milhares
        });
    }
    // 4. Premios por mes (ultimos 12 meses) - baseado em apolices criadas
    const premiosMensais = [];
    for (let i = 11; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const inicioMes = data.toISOString().split("T")[0];
        const fimMes = new Date(data.getFullYear(), data.getMonth() + 1, 0)
            .toISOString()
            .split("T")[0];
        const { data: apolices } = await supabase_1.supabase
            .from("apolices")
            .select("valor_premio")
            .gte("created_at", inicioMes)
            .lte("created_at", fimMes);
        const totalMes = apolices?.reduce((acc, a) => acc + (a.valor_premio || 0), 0) || 0;
        const meses = [
            "Jan",
            "Fev",
            "Mar",
            "Abr",
            "Mai",
            "Jun",
            "Jul",
            "Ago",
            "Set",
            "Out",
            "Nov",
            "Dez",
        ];
        premiosMensais.push({
            label: meses[data.getMonth()],
            value: Math.round(totalMes / 1000), // Em milhares
        });
    }
    res.json({
        apolicesPorRamo: apolicesRamoChart,
        totalApolices,
        sinistrosMensais,
        comissoesMensais,
        premiosMensais,
    });
}));
// GET /api/dashboard/stats - Estatisticas gerais (ja existe nos outros endpoints, mas centralizado)
router.get("/stats", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Clientes
    const { count: totalClientes } = await supabase_1.supabase
        .from("clientes")
        .select("*", { count: "exact", head: true });
    const { count: clientesAtivos } = await supabase_1.supabase
        .from("clientes")
        .select("*", { count: "exact", head: true })
        .eq("ativo", true);
    // Apolices
    const { count: totalApolices } = await supabase_1.supabase
        .from("apolices")
        .select("*", { count: "exact", head: true });
    const { count: apolicesVigentes } = await supabase_1.supabase
        .from("apolices")
        .select("*", { count: "exact", head: true })
        .eq("status", "vigente");
    // Apolices vencendo em 30 dias
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const { count: apolicesVencendo } = await supabase_1.supabase
        .from("apolices")
        .select("*", { count: "exact", head: true })
        .eq("status", "vigente")
        .gte("data_vencimento", new Date().toISOString().split("T")[0])
        .lte("data_vencimento", thirtyDaysFromNow.toISOString().split("T")[0]);
    // Sinistros
    const { count: totalSinistros } = await supabase_1.supabase
        .from("sinistros")
        .select("*", { count: "exact", head: true });
    const { count: sinistrosAbertos } = await supabase_1.supabase
        .from("sinistros")
        .select("*", { count: "exact", head: true })
        .not("status", "in", "(pago,recusado)");
    const { count: sinistrosPagos } = await supabase_1.supabase
        .from("sinistros")
        .select("*", { count: "exact", head: true })
        .eq("status", "pago");
    // Premio total vigente
    const { data: premios } = await supabase_1.supabase
        .from("apolices")
        .select("valor_premio")
        .eq("status", "vigente");
    const premioTotalVigente = premios?.reduce((acc, a) => acc + (a.valor_premio || 0), 0) || 0;
    res.json({
        clientes: {
            total: totalClientes || 0,
            ativos: clientesAtivos || 0,
        },
        apolices: {
            total: totalApolices || 0,
            vigentes: apolicesVigentes || 0,
            vencendo: apolicesVencendo || 0,
            premioTotal: premioTotalVigente,
        },
        sinistros: {
            total: totalSinistros || 0,
            abertos: sinistrosAbertos || 0,
            pagos: sinistrosPagos || 0,
        },
    });
}));
// GET /api/dashboard/renovacoes - Proximas renovacoes
router.get("/renovacoes", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 5 } = req.query;
    const hoje = new Date().toISOString().split("T")[0];
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const { data: apolices } = await supabase_1.supabase
        .from("apolices")
        .select("id, numero_apolice, ramo, seguradora, data_vencimento, valor_premio, clientes!inner(id, nome)")
        .eq("status", "vigente")
        .gte("data_vencimento", hoje)
        .lte("data_vencimento", thirtyDaysFromNow.toISOString().split("T")[0])
        .order("data_vencimento", { ascending: true })
        .limit(Number(limit));
    const renovacoes = apolices?.map((a) => {
        const vencimento = new Date(a.data_vencimento);
        const diffTime = vencimento.getTime() - new Date().getTime();
        const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
            id: a.id,
            cliente: a.clientes?.nome || "N/A",
            apolice: `${a.ramo?.toUpperCase()} - ${a.seguradora}`,
            numero: a.numero_apolice,
            vencimento: vencimento.toLocaleDateString("pt-BR"),
            dias,
            valor: a.valor_premio,
        };
    }) || [];
    res.json(renovacoes);
}));
// GET /api/dashboard/atividades - Atividades recentes
router.get("/atividades", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10 } = req.query;
    // Buscar ultimos clientes
    const { data: clientes } = await supabase_1.supabase
        .from("clientes")
        .select("id, nome, created_at")
        .order("created_at", { ascending: false })
        .limit(3);
    // Buscar ultimas apolices
    const { data: apolices } = await supabase_1.supabase
        .from("apolices")
        .select("id, ramo, seguradora, status, created_at")
        .order("created_at", { ascending: false })
        .limit(3);
    // Buscar ultimos sinistros
    const { data: sinistros } = await supabase_1.supabase
        .from("sinistros")
        .select("id, numero_sinistro, status, created_at")
        .order("created_at", { ascending: false })
        .limit(3);
    const atividades = [];
    clientes?.forEach((c) => {
        atividades.push({
            id: `cliente-${c.id}`,
            type: "cliente",
            action: "Novo cliente cadastrado",
            name: c.nome,
            timestamp: c.created_at,
        });
    });
    apolices?.forEach((a) => {
        atividades.push({
            id: `apolice-${a.id}`,
            type: "apolice",
            action: a.status === "vigente"
                ? "Nova apolice emitida"
                : "Apolice atualizada",
            name: `${a.ramo?.toUpperCase()} - ${a.seguradora}`,
            timestamp: a.created_at,
        });
    });
    sinistros?.forEach((s) => {
        atividades.push({
            id: `sinistro-${s.id}`,
            type: "sinistro",
            action: "Sinistro registrado",
            name: s.numero_sinistro || `#${s.id.slice(0, 8)}`,
            timestamp: s.created_at,
        });
    });
    // Ordenar por timestamp e limitar
    const resultado = atividades
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, Number(limit));
    res.json(resultado);
}));
exports.default = router;
