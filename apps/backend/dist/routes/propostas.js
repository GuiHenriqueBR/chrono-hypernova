"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../services/supabase");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Listar propostas
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { cliente_id, status, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let query = supabase_1.supabase
        .from('propostas')
        .select('*, clientes!inner(id, nome)', { count: 'exact' })
        .order('data_criacao', { ascending: false });
    if (cliente_id)
        query = query.eq('cliente_id', cliente_id);
    if (status)
        query = query.eq('status', status);
    const { data, error, count } = await query.range(offset, offset + Number(limit) - 1);
    if (error)
        throw error;
    res.json({ data: data || [], total: count || 0 });
}));
// Buscar proposta por ID
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase.from('propostas').select('*, clientes(*)').eq('id', id).single();
    if (error)
        throw error;
    if (!data)
        return res.status(404).json({ error: 'Proposta não encontrada' });
    res.json(data);
}));
// Atualizar status da proposta (Enviada, Aceita, Recusada)
router.patch('/:id/status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // rascunho, enviada, aceita, recusada
    const updates = { status };
    if (status === 'enviada')
        updates.data_envio = new Date().toISOString();
    if (status === 'aceita')
        updates.data_aceitacao = new Date().toISOString();
    const { data, error } = await supabase_1.supabase
        .from('propostas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    res.json(data);
}));
// Converter Proposta em Apolice (Emissao)
router.post('/:id/emitir', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { numero_apolice, data_inicio, data_vencimento } = req.body;
    // 1. Buscar proposta
    const { data: proposta } = await supabase_1.supabase.from('propostas').select('*').eq('id', id).single();
    if (!proposta)
        throw new Error('Proposta não encontrada');
    // 2. Criar apolice
    const { data: apolice, error } = await supabase_1.supabase.from('apolices').insert({
        cliente_id: proposta.cliente_id,
        ramo: proposta.ramo,
        seguradora: proposta.dados_propostos.seguradora || 'N/A',
        numero_apolice,
        valor_premio: proposta.valor_proposto,
        data_inicio,
        data_vencimento,
        status: 'vigente',
        dados_json: proposta.dados_propostos
    }).select().single();
    if (error)
        throw error;
    // 3. Atualizar proposta para aceita/emitida (se tiver status emitido na tabela, senao aceita)
    await supabase_1.supabase.from('propostas').update({ status: 'aceita' }).eq('id', id);
    res.status(201).json(apolice);
}));
exports.default = router;
