"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../services/supabase");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Listar endossos de uma apolice
router.get('/apolice/:apoliceId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { apoliceId } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('endossos')
        .select('*')
        .eq('apolice_id', apoliceId)
        .order('data_solicitacao', { ascending: false });
    if (error)
        throw error;
    res.json(data);
}));
// Criar endosso
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { apolice_id, tipo, descricao, valor_novo } = req.body;
    const { data, error } = await supabase_1.supabase
        .from('endossos')
        .insert({
        apolice_id,
        tipo, // inclusao, exclusao, alteracao
        descricao,
        valor_novo,
        status: 'rascunho',
        data_solicitacao: new Date().toISOString()
    })
        .select()
        .single();
    if (error)
        throw error;
    res.status(201).json(data);
}));
// Atualizar status do endosso
router.patch('/:id/status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // rascunho, enviado, aceito, emitido
    const updates = { status };
    if (status === 'emitido')
        updates.data_emissao = new Date().toISOString();
    const { data, error } = await supabase_1.supabase
        .from('endossos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    res.json(data);
}));
exports.default = router;
