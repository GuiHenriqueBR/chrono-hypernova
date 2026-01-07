"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../services/supabase");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ========== CALENDAR VIEW ==========
// GET - Eventos para calendario (tarefas + follow-ups + renovacoes)
router.get('/calendario', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) {
        return res.status(400).json({ error: 'Parametros inicio e fim sao obrigatorios' });
    }
    const dataInicio = String(inicio);
    const dataFim = String(fim);
    // 1. Buscar tarefas no periodo
    const { data: tarefas, error: errTarefas } = await supabase_1.supabase
        .from('tarefas')
        .select('*, clientes(id, nome), apolices(id, numero_apolice)')
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)
        .order('data_vencimento', { ascending: true });
    if (errTarefas)
        throw errTarefas;
    // 2. Buscar follow-ups de cotacoes (proximo_contato)
    const { data: followups, error: errFollowups } = await supabase_1.supabase
        .from('cotacoes')
        .select('id, numero_cotacao, proximo_contato, status_pipeline, cliente:clientes(id, nome)')
        .not('proximo_contato', 'is', null)
        .gte('proximo_contato', dataInicio)
        .lte('proximo_contato', dataFim);
    if (errFollowups)
        throw errFollowups;
    // 3. Buscar apolices com renovacao no periodo
    const { data: renovacoes, error: errRenovacoes } = await supabase_1.supabase
        .from('apolices')
        .select('id, numero_apolice, data_vencimento, seguradora, ramo, cliente:clientes(id, nome)')
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)
        .eq('status', 'vigente');
    if (errRenovacoes)
        throw errRenovacoes;
    // Transformar para formato de eventos do calendario
    const eventos = [];
    // Tarefas
    for (const tarefa of tarefas || []) {
        eventos.push({
            id: `tarefa-${tarefa.id}`,
            tipo: 'tarefa',
            titulo: tarefa.descricao,
            data: tarefa.data_vencimento,
            cor: tarefa.concluida ? 'emerald' :
                tarefa.prioridade === 'alta' ? 'red' :
                    tarefa.prioridade === 'media' ? 'amber' : 'slate',
            concluido: tarefa.concluida,
            prioridade: tarefa.prioridade,
            tipo_tarefa: tarefa.tipo,
            cliente: tarefa.clientes?.nome,
            cliente_id: tarefa.cliente_id,
            referencia_id: tarefa.id,
            referencia_tipo: 'tarefa'
        });
    }
    // Follow-ups de cotacoes
    for (const fu of followups || []) {
        eventos.push({
            id: `followup-${fu.id}`,
            tipo: 'followup',
            titulo: `Follow-up: ${fu.numero_cotacao || 'Cotacao'}`,
            data: fu.proximo_contato,
            cor: 'violet',
            concluido: false,
            status_pipeline: fu.status_pipeline,
            cliente: fu.cliente?.nome,
            cliente_id: fu.cliente?.id,
            referencia_id: fu.id,
            referencia_tipo: 'cotacao'
        });
    }
    // Renovacoes de apolices
    for (const apolice of renovacoes || []) {
        eventos.push({
            id: `renovacao-${apolice.id}`,
            tipo: 'renovacao',
            titulo: `Renovacao: ${apolice.numero_apolice}`,
            subtitulo: `${apolice.seguradora} - ${apolice.ramo}`,
            data: apolice.data_vencimento,
            cor: 'cyan',
            concluido: false,
            cliente: apolice.cliente?.nome,
            cliente_id: apolice.cliente?.id,
            referencia_id: apolice.id,
            referencia_tipo: 'apolice'
        });
    }
    // Ordenar por data
    eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    res.json({
        data: eventos,
        total: eventos.length,
        periodo: { inicio: dataInicio, fim: dataFim }
    });
}));
// GET - Resumo do dia para calendario
router.get('/calendario/dia/:data', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { data } = req.params;
    // Tarefas do dia
    const { data: tarefas } = await supabase_1.supabase
        .from('tarefas')
        .select('*, clientes(nome)')
        .eq('data_vencimento', data)
        .order('prioridade', { ascending: false });
    // Follow-ups do dia
    const { data: followups } = await supabase_1.supabase
        .from('cotacoes')
        .select('id, numero_cotacao, proximo_contato, status_pipeline, cliente:clientes(nome)')
        .eq('proximo_contato', data);
    // Renovacoes do dia
    const { data: renovacoes } = await supabase_1.supabase
        .from('apolices')
        .select('id, numero_apolice, seguradora, ramo, cliente:clientes(nome)')
        .eq('data_vencimento', data)
        .eq('status', 'vigente');
    res.json({
        data,
        tarefas: tarefas || [],
        followups: followups || [],
        renovacoes: renovacoes || [],
        resumo: {
            total_tarefas: tarefas?.length || 0,
            total_followups: followups?.length || 0,
            total_renovacoes: renovacoes?.length || 0,
            tarefas_pendentes: tarefas?.filter(t => !t.concluida).length || 0
        }
    });
}));
// Stats de tarefas (deve vir antes de /tarefas/:id)
router.get('/tarefas/stats/summary', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    // Total de tarefas
    const { count: total } = await supabase_1.supabase
        .from('tarefas')
        .select('*', { count: 'exact', head: true });
    // Tarefas pendentes
    const { count: pendentes } = await supabase_1.supabase
        .from('tarefas')
        .select('*', { count: 'exact', head: true })
        .eq('concluida', false);
    // Tarefas concluidas
    const { count: concluidas } = await supabase_1.supabase
        .from('tarefas')
        .select('*', { count: 'exact', head: true })
        .eq('concluida', true);
    // Tarefas para hoje
    const { count: hoje } = await supabase_1.supabase
        .from('tarefas')
        .select('*', { count: 'exact', head: true })
        .eq('data_vencimento', today)
        .eq('concluida', false);
    // Tarefas atrasadas
    const { count: atrasadas } = await supabase_1.supabase
        .from('tarefas')
        .select('*', { count: 'exact', head: true })
        .lt('data_vencimento', today)
        .eq('concluida', false);
    // Tarefas de alta prioridade pendentes
    const { count: alta_prioridade } = await supabase_1.supabase
        .from('tarefas')
        .select('*', { count: 'exact', head: true })
        .eq('prioridade', 'alta')
        .eq('concluida', false);
    res.json({
        total: total || 0,
        pendentes: pendentes || 0,
        concluidas: concluidas || 0,
        hoje: hoje || 0,
        atrasadas: atrasadas || 0,
        alta_prioridade: alta_prioridade || 0,
    });
}));
// Listar tarefas
router.get('/tarefas', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { usuario_id, status, prioridade, tipo } = req.query;
    let query = supabase_1.supabase
        .from('tarefas')
        .select('*, clientes(nome), apolices(numero_apolice)')
        .order('data_vencimento', { ascending: true });
    if (usuario_id) {
        query = query.eq('usuario_id', usuario_id);
    }
    if (status === 'concluidas') {
        query = query.eq('concluida', true);
    }
    else if (status === 'pendentes') {
        query = query.eq('concluida', false);
    }
    if (prioridade) {
        query = query.eq('prioridade', prioridade);
    }
    if (tipo) {
        query = query.eq('tipo', tipo);
    }
    const { data, error } = await query;
    if (error)
        throw error;
    res.json({ data, total: data?.length || 0 });
}));
// Buscar tarefa por ID
router.get('/tarefas/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('tarefas')
        .select('*, clientes(*), apolices(*)')
        .eq('id', id)
        .single();
    if (error)
        throw error;
    if (!data) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    res.json(data);
}));
// Criar tarefa
router.post('/tarefas', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const tarefa = req.body;
    const { data, error } = await supabase_1.supabase
        .from('tarefas')
        .insert([tarefa])
        .select('*, clientes(nome), apolices(numero_apolice)')
        .single();
    if (error)
        throw error;
    res.status(201).json(data);
}));
// Atualizar tarefa
router.put('/tarefas/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase_1.supabase
        .from('tarefas')
        .update(updates)
        .eq('id', id)
        .select('*, clientes(nome), apolices(numero_apolice)')
        .single();
    if (error)
        throw error;
    if (!data) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    res.json(data);
}));
// Deletar tarefa
router.delete('/tarefas/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase_1.supabase
        .from('tarefas')
        .delete()
        .eq('id', id);
    if (error)
        throw error;
    res.status(204).send();
}));
// Toggle concluida
router.patch('/tarefas/:id/toggle', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    // Buscar tarefa atual
    const { data: tarefa } = await supabase_1.supabase
        .from('tarefas')
        .select('concluida')
        .eq('id', id)
        .single();
    if (!tarefa) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    // Toggle
    const { data, error } = await supabase_1.supabase
        .from('tarefas')
        .update({ concluida: !tarefa.concluida })
        .eq('id', id)
        .select('*, clientes(nome), apolices(numero_apolice)')
        .single();
    if (error)
        throw error;
    res.json(data);
}));
exports.default = router;
