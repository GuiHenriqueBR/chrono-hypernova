"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const supabase_1 = require("../services/supabase");
const logger_1 = require("../utils/logger");
const alertas_1 = require("../services/alertas");
const scheduler_1 = require("../jobs/scheduler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Listar alertas do usuario
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { tipo, nao_lidos, limite = 50, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limite);
    let query = supabase_1.supabase
        .from('alertas')
        .select('*', { count: 'exact' })
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false });
    if (tipo) {
        query = query.eq('tipo', tipo);
    }
    if (nao_lidos === 'true') {
        query = query.eq('lido', false);
    }
    const { data, error, count } = await query.range(offset, offset + Number(limite) - 1);
    if (error) {
        logger_1.logger.error('Erro ao buscar alertas:', error);
        throw error;
    }
    res.json({
        data: data || [],
        total: count || 0,
        page: Number(page),
        limite: Number(limite)
    });
}));
// Buscar resumo dos alertas
router.get('/resumo', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const resumo = await (0, alertas_1.gerarResumoDiario)(userId);
    res.json(resumo);
}));
// Buscar contagem por tipo
router.get('/contagem', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    // Contagem por tipo
    const { data: alertas } = await supabase_1.supabase
        .from('alertas')
        .select('tipo, lido')
        .eq('usuario_id', userId)
        .eq('lido', false);
    const contagem = {};
    let total = 0;
    if (alertas) {
        for (const alerta of alertas) {
            contagem[alerta.tipo] = (contagem[alerta.tipo] || 0) + 1;
            total++;
        }
    }
    res.json({
        total,
        por_tipo: contagem
    });
}));
// Buscar alerta especifico
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('alertas')
        .select('*')
        .eq('id', id)
        .eq('usuario_id', userId)
        .single();
    if (error || !data) {
        return res.status(404).json({ error: 'Alerta nao encontrado' });
    }
    res.json(data);
}));
// Marcar alerta como lido
router.patch('/:id/lido', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const sucesso = await (0, alertas_1.marcarComoLido)(id, userId);
    if (!sucesso) {
        return res.status(400).json({ error: 'Erro ao marcar alerta como lido' });
    }
    res.json({ success: true, message: 'Alerta marcado como lido' });
}));
// Marcar todos como lidos
router.post('/marcar-todos-lidos', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const sucesso = await (0, alertas_1.marcarTodosComoLidos)(userId);
    if (!sucesso) {
        return res.status(400).json({ error: 'Erro ao marcar alertas como lidos' });
    }
    res.json({ success: true, message: 'Todos os alertas foram marcados como lidos' });
}));
// Criar alerta manual
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { tipo, titulo, mensagem, prioridade, entidade_tipo, entidade_id, data_referencia } = req.body;
    if (!tipo || !titulo || !mensagem) {
        return res.status(400).json({
            error: 'Campos obrigatorios: tipo, titulo, mensagem'
        });
    }
    const alerta = await (0, alertas_1.criarAlerta)({
        usuario_id: userId,
        tipo: tipo,
        titulo,
        mensagem,
        prioridade: prioridade || 'media',
        entidade_tipo,
        entidade_id,
        data_referencia,
        lido: false,
        enviado_email: false,
        enviado_whatsapp: false
    });
    if (!alerta) {
        return res.status(500).json({ error: 'Erro ao criar alerta' });
    }
    res.status(201).json(alerta);
}));
// Deletar alerta
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { error } = await supabase_1.supabase
        .from('alertas')
        .delete()
        .eq('id', id)
        .eq('usuario_id', userId);
    if (error) {
        logger_1.logger.error('Erro ao deletar alerta:', error);
        throw error;
    }
    res.status(204).send();
}));
// Deletar todos os lidos
router.delete('/lidos/todos', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { error, count } = await supabase_1.supabase
        .from('alertas')
        .delete()
        .eq('usuario_id', userId)
        .eq('lido', true);
    if (error) {
        logger_1.logger.error('Erro ao deletar alertas lidos:', error);
        throw error;
    }
    res.json({
        success: true,
        message: `${count || 0} alertas removidos`
    });
}));
// ========================================
// ADMIN - Executar verificacoes manualmente
// ========================================
// Executar verificacao de alertas manualmente
router.post('/admin/verificar', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.logger.info('Executando verificacao manual de alertas...');
    const resultado = await (0, scheduler_1.executarVerificacaoManual)();
    res.json({
        success: true,
        message: 'Verificacao executada com sucesso',
        resultado
    });
}));
// Status do scheduler
router.get('/admin/scheduler-status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const status = (0, scheduler_1.statusScheduler)();
    res.json(status);
}));
// Estatisticas de alertas
router.get('/admin/estatisticas', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Total de alertas
    const { count: totalAlertas } = await supabase_1.supabase
        .from('alertas')
        .select('*', { count: 'exact', head: true });
    // Alertas nao lidos
    const { count: naoLidos } = await supabase_1.supabase
        .from('alertas')
        .select('*', { count: 'exact', head: true })
        .eq('lido', false);
    // Alertas por tipo
    const { data: alertasPorTipo } = await supabase_1.supabase
        .from('alertas')
        .select('tipo');
    const contagemPorTipo = {};
    if (alertasPorTipo) {
        for (const alerta of alertasPorTipo) {
            contagemPorTipo[alerta.tipo] = (contagemPorTipo[alerta.tipo] || 0) + 1;
        }
    }
    // Alertas criados hoje
    const hoje = new Date().toISOString().split('T')[0];
    const { count: alertasHoje } = await supabase_1.supabase
        .from('alertas')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', hoje);
    // Alertas por prioridade
    const { data: alertasPorPrioridade } = await supabase_1.supabase
        .from('alertas')
        .select('prioridade')
        .eq('lido', false);
    const contagemPorPrioridade = {
        urgente: 0,
        alta: 0,
        media: 0,
        baixa: 0
    };
    if (alertasPorPrioridade) {
        for (const alerta of alertasPorPrioridade) {
            contagemPorPrioridade[alerta.prioridade] = (contagemPorPrioridade[alerta.prioridade] || 0) + 1;
        }
    }
    res.json({
        total: totalAlertas || 0,
        naoLidos: naoLidos || 0,
        criadosHoje: alertasHoje || 0,
        porTipo: contagemPorTipo,
        porPrioridade: contagemPorPrioridade
    });
}));
exports.default = router;
