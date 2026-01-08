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
// PLANOS DE SAÚDE - Módulo separado de seguros
// ============================================
// Listar planos de saúde
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { cliente_id, operadora, tipo_plano, status, search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let query = supabase_1.supabase
        .from('planos_saude')
        .select('*, clientes!inner(id, nome, cpf_cnpj)', { count: 'exact' })
        .order('data_vencimento', { ascending: true });
    if (cliente_id)
        query = query.eq('cliente_id', cliente_id);
    if (operadora)
        query = query.eq('operadora', operadora);
    if (tipo_plano)
        query = query.eq('tipo_plano', tipo_plano);
    if (status)
        query = query.eq('status', status);
    if (search) {
        query = query.or(`numero_contrato.ilike.%${search}%,operadora.ilike.%${search}%`);
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
// Buscar plano por ID com todos os relacionamentos
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('planos_saude')
        .select(`
      *,
      clientes!inner(id, nome, cpf_cnpj, email, telefone, tipo),
      plano_beneficiarios(*),
      plano_coberturas(*),
      plano_carencias(*),
      plano_historico(*, usuario:usuarios(nome))
    `)
        .eq('id', id)
        .single();
    if (error) {
        logger_1.logger.error('Erro ao buscar plano de saude:', error);
        throw error;
    }
    if (!data) {
        return res.status(404).json({ error: 'Plano de saude nao encontrado' });
    }
    res.json(data);
}));
// Criar plano de saúde
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { beneficiarios, coberturas, carencias, ...plano } = req.body;
    const { data: novoPlano, error } = await supabase_1.supabase
        .from('planos_saude')
        .insert([{ ...plano, usuario_id: userId }])
        .select('*, clientes!inner(*)')
        .single();
    if (error)
        throw error;
    // Inserir beneficiários se houver
    if (beneficiarios && beneficiarios.length > 0) {
        const beneficiariosData = beneficiarios.map((b) => ({
            ...b,
            plano_id: novoPlano.id
        }));
        await supabase_1.supabase.from('plano_beneficiarios').insert(beneficiariosData);
    }
    // Inserir coberturas se houver
    if (coberturas && coberturas.length > 0) {
        const coberturasData = coberturas.map((c) => ({
            ...c,
            plano_id: novoPlano.id
        }));
        await supabase_1.supabase.from('plano_coberturas').insert(coberturasData);
    }
    // Inserir carências se houver
    if (carencias && carencias.length > 0) {
        const carenciasData = carencias.map((c) => ({
            ...c,
            plano_id: novoPlano.id
        }));
        await supabase_1.supabase.from('plano_carencias').insert(carenciasData);
    }
    // Registrar no histórico
    await supabase_1.supabase.from('plano_historico').insert({
        plano_id: novoPlano.id,
        usuario_id: userId,
        tipo_evento: 'criacao',
        descricao: 'Plano de saúde registrado no sistema',
        dados_novos: plano
    });
    res.status(201).json(novoPlano);
}));
// Atualizar plano de saúde
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const updates = req.body;
    // Buscar dados anteriores
    const { data: planoAnterior } = await supabase_1.supabase
        .from('planos_saude')
        .select('*')
        .eq('id', id)
        .single();
    const { data, error } = await supabase_1.supabase
        .from('planos_saude')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    if (!data) {
        return res.status(404).json({ error: 'Plano de saude nao encontrado' });
    }
    // Registrar no histórico
    await supabase_1.supabase.from('plano_historico').insert({
        plano_id: id,
        usuario_id: userId,
        tipo_evento: 'atualizacao',
        descricao: 'Plano de saúde atualizado',
        dados_anteriores: planoAnterior,
        dados_novos: updates
    });
    res.json(data);
}));
// Deletar plano de saúde
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase_1.supabase
        .from('planos_saude')
        .delete()
        .eq('id', id);
    if (error)
        throw error;
    res.status(204).send();
}));
// ========== BENEFICIÁRIOS ==========
// Listar beneficiários do plano
router.get('/:id/beneficiarios', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('plano_beneficiarios')
        .select('*')
        .eq('plano_id', id)
        .order('tipo_beneficiario', { ascending: true });
    if (error)
        throw error;
    res.json({ data: data || [] });
}));
// Adicionar beneficiário
router.post('/:id/beneficiarios', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const beneficiario = req.body;
    const { data, error } = await supabase_1.supabase
        .from('plano_beneficiarios')
        .insert({ ...beneficiario, plano_id: id })
        .select()
        .single();
    if (error)
        throw error;
    // Registrar no histórico
    await supabase_1.supabase.from('plano_historico').insert({
        plano_id: id,
        usuario_id: userId,
        tipo_evento: 'beneficiario_adicionado',
        descricao: `Beneficiário "${beneficiario.nome}" adicionado`,
        dados_novos: beneficiario
    });
    res.status(201).json(data);
}));
// Atualizar beneficiário
router.put('/:id/beneficiarios/:beneficiarioId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, beneficiarioId } = req.params;
    const userId = req.user?.id;
    const updates = req.body;
    const { data, error } = await supabase_1.supabase
        .from('plano_beneficiarios')
        .update(updates)
        .eq('id', beneficiarioId)
        .eq('plano_id', id)
        .select()
        .single();
    if (error)
        throw error;
    // Registrar no histórico
    await supabase_1.supabase.from('plano_historico').insert({
        plano_id: id,
        usuario_id: userId,
        tipo_evento: 'beneficiario_atualizado',
        descricao: `Beneficiário "${updates.nome || data.nome}" atualizado`,
        dados_novos: updates
    });
    res.json(data);
}));
// Remover beneficiário
router.delete('/:id/beneficiarios/:beneficiarioId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, beneficiarioId } = req.params;
    const userId = req.user?.id;
    // Buscar beneficiário antes de deletar
    const { data: beneficiario } = await supabase_1.supabase
        .from('plano_beneficiarios')
        .select('*')
        .eq('id', beneficiarioId)
        .single();
    const { error } = await supabase_1.supabase
        .from('plano_beneficiarios')
        .delete()
        .eq('id', beneficiarioId)
        .eq('plano_id', id);
    if (error)
        throw error;
    // Registrar no histórico
    if (beneficiario) {
        await supabase_1.supabase.from('plano_historico').insert({
            plano_id: id,
            usuario_id: userId,
            tipo_evento: 'beneficiario_removido',
            descricao: `Beneficiário "${beneficiario.nome}" removido`,
            dados_anteriores: beneficiario
        });
    }
    res.status(204).send();
}));
// ========== COBERTURAS ==========
router.get('/:id/coberturas', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('plano_coberturas')
        .select('*')
        .eq('plano_id', id);
    if (error)
        throw error;
    res.json({ data: data || [] });
}));
router.post('/:id/coberturas', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const cobertura = req.body;
    const { data, error } = await supabase_1.supabase
        .from('plano_coberturas')
        .insert({ ...cobertura, plano_id: id })
        .select()
        .single();
    if (error)
        throw error;
    res.status(201).json(data);
}));
// ========== CARÊNCIAS ==========
router.get('/:id/carencias', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('plano_carencias')
        .select('*')
        .eq('plano_id', id)
        .order('data_fim_carencia', { ascending: true });
    if (error)
        throw error;
    res.json({ data: data || [] });
}));
router.post('/:id/carencias', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const carencia = req.body;
    const { data, error } = await supabase_1.supabase
        .from('plano_carencias')
        .insert({ ...carencia, plano_id: id })
        .select()
        .single();
    if (error)
        throw error;
    res.status(201).json(data);
}));
// ========== REAJUSTES ==========
// Registrar reajuste anual
router.post('/:id/reajustes', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { percentual_reajuste, novo_valor_mensalidade, data_aplicacao, motivo } = req.body;
    // Buscar plano atual
    const { data: plano } = await supabase_1.supabase
        .from('planos_saude')
        .select('valor_mensalidade')
        .eq('id', id)
        .single();
    if (!plano) {
        return res.status(404).json({ error: 'Plano nao encontrado' });
    }
    const valorAnterior = plano.valor_mensalidade;
    const novoValor = novo_valor_mensalidade || (valorAnterior * (1 + percentual_reajuste / 100));
    // Atualizar valor do plano
    const { data, error } = await supabase_1.supabase
        .from('planos_saude')
        .update({
        valor_mensalidade: novoValor,
        data_ultimo_reajuste: data_aplicacao || new Date().toISOString(),
        updated_at: new Date().toISOString()
    })
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    // Registrar no histórico
    await supabase_1.supabase.from('plano_historico').insert({
        plano_id: id,
        usuario_id: userId,
        tipo_evento: 'reajuste',
        descricao: `Reajuste de ${percentual_reajuste}% aplicado`,
        dados_anteriores: { valor_mensalidade: valorAnterior },
        dados_novos: {
            valor_mensalidade: novoValor,
            percentual_reajuste,
            motivo
        }
    });
    res.json(data);
}));
// ========== HISTÓRICO ==========
router.get('/:id/historico', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('plano_historico')
        .select('*, usuario:usuarios(nome)')
        .eq('plano_id', id)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    res.json({ data: data || [] });
}));
// ========== STATS ==========
router.get('/stats/summary', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { count: total } = await supabase_1.supabase
        .from('planos_saude')
        .select('*', { count: 'exact', head: true });
    const { count: ativos } = await supabase_1.supabase
        .from('planos_saude')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');
    const { count: cancelados } = await supabase_1.supabase
        .from('planos_saude')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelado');
    // Planos com carência ativa
    const { count: emCarencia } = await supabase_1.supabase
        .from('plano_carencias')
        .select('*', { count: 'exact', head: true })
        .gte('data_fim_carencia', new Date().toISOString().split('T')[0]);
    // Total de beneficiários
    const { count: totalBeneficiarios } = await supabase_1.supabase
        .from('plano_beneficiarios')
        .select('*', { count: 'exact', head: true });
    // Receita mensal (soma das mensalidades)
    const { data: planos } = await supabase_1.supabase
        .from('planos_saude')
        .select('valor_mensalidade')
        .eq('status', 'ativo');
    const receitaMensal = planos?.reduce((acc, p) => acc + (p.valor_mensalidade || 0), 0) || 0;
    res.json({
        total: total || 0,
        ativos: ativos || 0,
        cancelados: cancelados || 0,
        emCarencia: emCarencia || 0,
        totalBeneficiarios: totalBeneficiarios || 0,
        receitaMensal
    });
}));
exports.default = router;
