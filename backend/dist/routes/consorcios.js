"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../services/supabase");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// ============================================
// CONSÓRCIOS - Módulo separado de seguros
// ============================================
// Listar consórcios
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { cliente_id, administradora, status, grupo, search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let query = supabase_1.supabase
        .from('consorcios')
        .select('*, clientes!inner(id, nome, cpf_cnpj)', { count: 'exact' })
        .order('data_proxima_assembleia', { ascending: true });
    if (cliente_id)
        query = query.eq('cliente_id', cliente_id);
    if (administradora)
        query = query.eq('administradora', administradora);
    if (status)
        query = query.eq('status', status);
    if (grupo)
        query = query.eq('grupo', grupo);
    if (search) {
        query = query.or(`numero_cota.ilike.%${search}%,administradora.ilike.%${search}%,grupo.ilike.%${search}%`);
    }
    const { data, error, count } = await query.range(offset, offset + Number(limit) - 1);
    if (error)
        throw error;
    res.json({
        data: data || [],
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
    });
}));
// Buscar consórcio por ID com todos os relacionamentos
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('consorcios')
        .select(`
      *,
      clientes!inner(id, nome, cpf_cnpj, email, telefone, tipo),
      consorcio_parcelas(*),
      consorcio_lances(*),
      consorcio_historico(*, usuario:usuarios(nome))
    `)
        .eq('id', id)
        .single();
    if (error) {
        logger_1.logger.error('Erro ao buscar consorcio:', error);
        throw error;
    }
    if (!data) {
        return res.status(404).json({ error: 'Consorcio nao encontrado' });
    }
    res.json(data);
}));
// Criar consórcio
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const consorcio = req.body;
    const { data: novoConsorcio, error } = await supabase_1.supabase
        .from('consorcios')
        .insert([{ ...consorcio, usuario_id: userId }])
        .select('*, clientes!inner(*)')
        .single();
    if (error)
        throw error;
    // Registrar no histórico
    await supabase_1.supabase.from('consorcio_historico').insert({
        consorcio_id: novoConsorcio.id,
        usuario_id: userId,
        tipo_evento: 'criacao',
        descricao: 'Consórcio registrado no sistema',
        dados_novos: consorcio
    });
    res.status(201).json(novoConsorcio);
}));
// Atualizar consórcio
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const updates = req.body;
    // Buscar dados anteriores
    const { data: consorcioAnterior } = await supabase_1.supabase
        .from('consorcios')
        .select('*')
        .eq('id', id)
        .single();
    const { data, error } = await supabase_1.supabase
        .from('consorcios')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    if (!data) {
        return res.status(404).json({ error: 'Consorcio nao encontrado' });
    }
    // Registrar no histórico
    await supabase_1.supabase.from('consorcio_historico').insert({
        consorcio_id: id,
        usuario_id: userId,
        tipo_evento: 'atualizacao',
        descricao: 'Consórcio atualizado',
        dados_anteriores: consorcioAnterior,
        dados_novos: updates
    });
    res.json(data);
}));
// Deletar consórcio
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase_1.supabase
        .from('consorcios')
        .delete()
        .eq('id', id);
    if (error)
        throw error;
    res.status(204).send();
}));
// ========== PARCELAS ==========
// Listar parcelas do consórcio
router.get('/:id/parcelas', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { status } = req.query;
    let query = supabase_1.supabase
        .from('consorcio_parcelas')
        .select('*')
        .eq('consorcio_id', id)
        .order('numero_parcela', { ascending: true });
    if (status)
        query = query.eq('status', status);
    const { data, error } = await query;
    if (error)
        throw error;
    res.json({ data: data || [] });
}));
// Registrar pagamento de parcela
router.post('/:id/parcelas', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const parcela = req.body;
    const { data, error } = await supabase_1.supabase
        .from('consorcio_parcelas')
        .insert({ ...parcela, consorcio_id: id })
        .select()
        .single();
    if (error)
        throw error;
    // Registrar no histórico
    await supabase_1.supabase.from('consorcio_historico').insert({
        consorcio_id: id,
        usuario_id: userId,
        tipo_evento: 'parcela_registrada',
        descricao: `Parcela ${parcela.numero_parcela} registrada`,
        dados_novos: parcela
    });
    res.status(201).json(data);
}));
// Atualizar status da parcela (pago, pendente, atrasado)
router.patch('/:id/parcelas/:parcelaId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, parcelaId } = req.params;
    const userId = req.user?.id;
    const { status, data_pagamento, valor_pago, observacao } = req.body;
    const { data, error } = await supabase_1.supabase
        .from('consorcio_parcelas')
        .update({
        status,
        data_pagamento,
        valor_pago,
        observacao,
        updated_at: new Date().toISOString()
    })
        .eq('id', parcelaId)
        .eq('consorcio_id', id)
        .select()
        .single();
    if (error)
        throw error;
    // Registrar no histórico
    await supabase_1.supabase.from('consorcio_historico').insert({
        consorcio_id: id,
        usuario_id: userId,
        tipo_evento: status === 'pago' ? 'parcela_paga' : 'parcela_atualizada',
        descricao: `Parcela atualizada - Status: ${status}`,
        dados_novos: { status, data_pagamento, valor_pago }
    });
    res.json(data);
}));
// ========== LANCES ==========
// Listar lances do consórcio
router.get('/:id/lances', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('consorcio_lances')
        .select('*')
        .eq('consorcio_id', id)
        .order('data_assembleia', { ascending: false });
    if (error)
        throw error;
    res.json({ data: data || [] });
}));
// Registrar lance
router.post('/:id/lances', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const lance = req.body;
    const { data, error } = await supabase_1.supabase
        .from('consorcio_lances')
        .insert({ ...lance, consorcio_id: id })
        .select()
        .single();
    if (error)
        throw error;
    // Registrar no histórico
    await supabase_1.supabase.from('consorcio_historico').insert({
        consorcio_id: id,
        usuario_id: userId,
        tipo_evento: 'lance_registrado',
        descricao: `Lance de ${lance.tipo_lance} registrado - R$ ${lance.valor_lance}`,
        dados_novos: lance
    });
    res.status(201).json(data);
}));
// Atualizar resultado do lance
router.patch('/:id/lances/:lanceId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, lanceId } = req.params;
    const userId = req.user?.id;
    const { resultado, observacao } = req.body;
    const { data, error } = await supabase_1.supabase
        .from('consorcio_lances')
        .update({ resultado, observacao, updated_at: new Date().toISOString() })
        .eq('id', lanceId)
        .eq('consorcio_id', id)
        .select()
        .single();
    if (error)
        throw error;
    // Se contemplado, atualizar status do consórcio
    if (resultado === 'contemplado') {
        await supabase_1.supabase
            .from('consorcios')
            .update({
            status: 'contemplado',
            data_contemplacao: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
            .eq('id', id);
        await supabase_1.supabase.from('consorcio_historico').insert({
            consorcio_id: id,
            usuario_id: userId,
            tipo_evento: 'contemplacao',
            descricao: 'Cliente contemplado no consórcio!',
            dados_novos: { resultado, data_contemplacao: new Date().toISOString() }
        });
    }
    res.json(data);
}));
// ========== HISTÓRICO ==========
router.get('/:id/historico', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('consorcio_historico')
        .select('*, usuario:usuarios(nome)')
        .eq('consorcio_id', id)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    res.json({ data: data || [] });
}));
// ========== STATS ==========
router.get('/stats/summary', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { count: total } = await supabase_1.supabase
        .from('consorcios')
        .select('*', { count: 'exact', head: true });
    const { count: ativos } = await supabase_1.supabase
        .from('consorcios')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');
    const { count: contemplados } = await supabase_1.supabase
        .from('consorcios')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'contemplado');
    const { count: encerrados } = await supabase_1.supabase
        .from('consorcios')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'encerrado');
    // Próximas assembleias (30 dias)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const { count: proximasAssembleias } = await supabase_1.supabase
        .from('consorcios')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo')
        .gte('data_proxima_assembleia', new Date().toISOString().split('T')[0])
        .lte('data_proxima_assembleia', thirtyDaysFromNow.toISOString().split('T')[0]);
    // Valor total em créditos
    const { data: creditos } = await supabase_1.supabase
        .from('consorcios')
        .select('valor_credito')
        .in('status', ['ativo', 'contemplado']);
    const creditoTotal = creditos?.reduce((acc, c) => acc + (c.valor_credito || 0), 0) || 0;
    res.json({
        total: total || 0,
        ativos: ativos || 0,
        contemplados: contemplados || 0,
        encerrados: encerrados || 0,
        proximasAssembleias: proximasAssembleias || 0,
        creditoTotal
    });
}));
exports.default = router;
