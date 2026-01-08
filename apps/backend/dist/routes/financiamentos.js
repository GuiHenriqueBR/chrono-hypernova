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
// FINANCIAMENTOS - Módulo separado de seguros
// ============================================
// Listar financiamentos
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { cliente_id, instituicao, tipo, status, search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let query = supabase_1.supabase
        .from('financiamentos')
        .select('*, clientes!inner(id, nome, cpf_cnpj)', { count: 'exact' })
        .order('data_vencimento_parcela', { ascending: true });
    if (cliente_id)
        query = query.eq('cliente_id', cliente_id);
    if (instituicao)
        query = query.eq('instituicao_financeira', instituicao);
    if (tipo)
        query = query.eq('tipo_financiamento', tipo);
    if (status)
        query = query.eq('status', status);
    if (search) {
        query = query.or(`numero_contrato.ilike.%${search}%,instituicao_financeira.ilike.%${search}%,bem_financiado.ilike.%${search}%`);
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
// Buscar financiamento por ID com todos os relacionamentos
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('financiamentos')
        .select(`
      *,
      clientes!inner(id, nome, cpf_cnpj, email, telefone, tipo),
      financiamento_parcelas(*),
      financiamento_historico(*, usuario:usuarios(nome))
    `)
        .eq('id', id)
        .single();
    if (error) {
        logger_1.logger.error('Erro ao buscar financiamento:', error);
        throw error;
    }
    if (!data) {
        return res.status(404).json({ error: 'Financiamento nao encontrado' });
    }
    res.json(data);
}));
// Criar financiamento
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { parcelas_geradas, ...financiamento } = req.body;
    const { data: novoFinanciamento, error } = await supabase_1.supabase
        .from('financiamentos')
        .insert([{ ...financiamento, usuario_id: userId }])
        .select('*, clientes!inner(*)')
        .single();
    if (error)
        throw error;
    // Gerar parcelas automaticamente se solicitado
    if (parcelas_geradas && financiamento.prazo_meses && financiamento.valor_parcela) {
        const parcelas = [];
        const dataInicio = new Date(financiamento.data_primeiro_vencimento || new Date());
        for (let i = 0; i < financiamento.prazo_meses; i++) {
            const dataVencimento = new Date(dataInicio);
            dataVencimento.setMonth(dataVencimento.getMonth() + i);
            parcelas.push({
                financiamento_id: novoFinanciamento.id,
                numero_parcela: i + 1,
                valor_parcela: financiamento.valor_parcela,
                data_vencimento: dataVencimento.toISOString().split('T')[0],
                status: 'pendente'
            });
        }
        await supabase_1.supabase.from('financiamento_parcelas').insert(parcelas);
    }
    // Registrar no histórico
    await supabase_1.supabase.from('financiamento_historico').insert({
        financiamento_id: novoFinanciamento.id,
        usuario_id: userId,
        tipo_evento: 'criacao',
        descricao: 'Financiamento registrado no sistema',
        dados_novos: financiamento
    });
    res.status(201).json(novoFinanciamento);
}));
// Atualizar financiamento
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const updates = req.body;
    // Buscar dados anteriores
    const { data: financiamentoAnterior } = await supabase_1.supabase
        .from('financiamentos')
        .select('*')
        .eq('id', id)
        .single();
    const { data, error } = await supabase_1.supabase
        .from('financiamentos')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    if (!data) {
        return res.status(404).json({ error: 'Financiamento nao encontrado' });
    }
    // Registrar no histórico
    await supabase_1.supabase.from('financiamento_historico').insert({
        financiamento_id: id,
        usuario_id: userId,
        tipo_evento: 'atualizacao',
        descricao: 'Financiamento atualizado',
        dados_anteriores: financiamentoAnterior,
        dados_novos: updates
    });
    res.json(data);
}));
// Deletar financiamento
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase_1.supabase
        .from('financiamentos')
        .delete()
        .eq('id', id);
    if (error)
        throw error;
    res.status(204).send();
}));
// ========== PARCELAS ==========
// Listar parcelas do financiamento
router.get('/:id/parcelas', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { status } = req.query;
    let query = supabase_1.supabase
        .from('financiamento_parcelas')
        .select('*')
        .eq('financiamento_id', id)
        .order('numero_parcela', { ascending: true });
    if (status)
        query = query.eq('status', status);
    const { data, error } = await query;
    if (error)
        throw error;
    res.json({ data: data || [] });
}));
// Adicionar parcela manualmente
router.post('/:id/parcelas', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const parcela = req.body;
    const { data, error } = await supabase_1.supabase
        .from('financiamento_parcelas')
        .insert({ ...parcela, financiamento_id: id })
        .select()
        .single();
    if (error)
        throw error;
    // Registrar no histórico
    await supabase_1.supabase.from('financiamento_historico').insert({
        financiamento_id: id,
        usuario_id: userId,
        tipo_evento: 'parcela_adicionada',
        descricao: `Parcela ${parcela.numero_parcela} adicionada`,
        dados_novos: parcela
    });
    res.status(201).json(data);
}));
// Registrar pagamento de parcela
router.patch('/:id/parcelas/:parcelaId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, parcelaId } = req.params;
    const userId = req.user?.id;
    const { status, data_pagamento, valor_pago, multa, juros, observacao } = req.body;
    const { data, error } = await supabase_1.supabase
        .from('financiamento_parcelas')
        .update({
        status,
        data_pagamento,
        valor_pago,
        multa,
        juros,
        observacao,
        updated_at: new Date().toISOString()
    })
        .eq('id', parcelaId)
        .eq('financiamento_id', id)
        .select()
        .single();
    if (error)
        throw error;
    // Atualizar parcelas pagas no financiamento
    const { count: parcelasPagas } = await supabase_1.supabase
        .from('financiamento_parcelas')
        .select('*', { count: 'exact', head: true })
        .eq('financiamento_id', id)
        .eq('status', 'pago');
    await supabase_1.supabase
        .from('financiamentos')
        .update({
        parcelas_pagas: parcelasPagas,
        updated_at: new Date().toISOString()
    })
        .eq('id', id);
    // Registrar no histórico
    await supabase_1.supabase.from('financiamento_historico').insert({
        financiamento_id: id,
        usuario_id: userId,
        tipo_evento: status === 'pago' ? 'parcela_paga' : 'parcela_atualizada',
        descricao: `Parcela ${data.numero_parcela} - Status: ${status}`,
        dados_novos: { status, data_pagamento, valor_pago, multa, juros }
    });
    res.json(data);
}));
// ========== AMORTIZAÇÃO ==========
// Registrar amortização/antecipação
router.post('/:id/amortizacao', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { valor_amortizado, tipo_amortizacao, data_amortizacao, observacao } = req.body;
    // Buscar financiamento atual
    const { data: financiamento } = await supabase_1.supabase
        .from('financiamentos')
        .select('*')
        .eq('id', id)
        .single();
    if (!financiamento) {
        return res.status(404).json({ error: 'Financiamento nao encontrado' });
    }
    const saldoAnterior = financiamento.saldo_devedor || financiamento.valor_financiado;
    const novoSaldo = saldoAnterior - valor_amortizado;
    // Atualizar saldo devedor
    const { data, error } = await supabase_1.supabase
        .from('financiamentos')
        .update({
        saldo_devedor: novoSaldo,
        updated_at: new Date().toISOString()
    })
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    // Registrar no histórico
    await supabase_1.supabase.from('financiamento_historico').insert({
        financiamento_id: id,
        usuario_id: userId,
        tipo_evento: 'amortizacao',
        descricao: `Amortização de R$ ${valor_amortizado.toFixed(2)} - ${tipo_amortizacao}`,
        dados_anteriores: { saldo_devedor: saldoAnterior },
        dados_novos: {
            saldo_devedor: novoSaldo,
            valor_amortizado,
            tipo_amortizacao,
            data_amortizacao,
            observacao
        }
    });
    // Se tipo for redução de prazo, marcar parcelas finais como quitadas
    if (tipo_amortizacao === 'reducao_prazo') {
        // Calcular quantas parcelas foram quitadas
        const parcelasPorAmortizar = Math.floor(valor_amortizado / financiamento.valor_parcela);
        // Buscar parcelas pendentes do final
        const { data: parcelasPendentes } = await supabase_1.supabase
            .from('financiamento_parcelas')
            .select('id')
            .eq('financiamento_id', id)
            .eq('status', 'pendente')
            .order('numero_parcela', { ascending: false })
            .limit(parcelasPorAmortizar);
        if (parcelasPendentes && parcelasPendentes.length > 0) {
            const ids = parcelasPendentes.map(p => p.id);
            await supabase_1.supabase
                .from('financiamento_parcelas')
                .update({ status: 'quitado_amortizacao' })
                .in('id', ids);
        }
    }
    res.json(data);
}));
// ========== REFINANCIAMENTO ==========
router.post('/:id/refinanciamento', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { nova_taxa, novo_prazo, novo_valor_parcela, motivo } = req.body;
    // Buscar financiamento atual
    const { data: financiamento } = await supabase_1.supabase
        .from('financiamentos')
        .select('*')
        .eq('id', id)
        .single();
    if (!financiamento) {
        return res.status(404).json({ error: 'Financiamento nao encontrado' });
    }
    const dadosAnteriores = {
        taxa_juros: financiamento.taxa_juros,
        prazo_meses: financiamento.prazo_meses,
        valor_parcela: financiamento.valor_parcela
    };
    // Atualizar financiamento
    const { data, error } = await supabase_1.supabase
        .from('financiamentos')
        .update({
        taxa_juros: nova_taxa || financiamento.taxa_juros,
        prazo_meses: novo_prazo || financiamento.prazo_meses,
        valor_parcela: novo_valor_parcela || financiamento.valor_parcela,
        data_refinanciamento: new Date().toISOString(),
        updated_at: new Date().toISOString()
    })
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    // Registrar no histórico
    await supabase_1.supabase.from('financiamento_historico').insert({
        financiamento_id: id,
        usuario_id: userId,
        tipo_evento: 'refinanciamento',
        descricao: `Refinanciamento realizado - ${motivo}`,
        dados_anteriores: dadosAnteriores,
        dados_novos: { nova_taxa, novo_prazo, novo_valor_parcela, motivo }
    });
    res.json(data);
}));
// ========== HISTÓRICO ==========
router.get('/:id/historico', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('financiamento_historico')
        .select('*, usuario:usuarios(nome)')
        .eq('financiamento_id', id)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    res.json({ data: data || [] });
}));
// ========== STATS ==========
router.get('/stats/summary', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { count: total } = await supabase_1.supabase
        .from('financiamentos')
        .select('*', { count: 'exact', head: true });
    const { count: ativos } = await supabase_1.supabase
        .from('financiamentos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');
    const { count: quitados } = await supabase_1.supabase
        .from('financiamentos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'quitado');
    // Parcelas vencendo nos próximos 30 dias
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const { count: parcelasVencendo } = await supabase_1.supabase
        .from('financiamento_parcelas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente')
        .gte('data_vencimento', new Date().toISOString().split('T')[0])
        .lte('data_vencimento', thirtyDaysFromNow.toISOString().split('T')[0]);
    // Parcelas em atraso
    const { count: parcelasAtrasadas } = await supabase_1.supabase
        .from('financiamento_parcelas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente')
        .lt('data_vencimento', new Date().toISOString().split('T')[0]);
    // Valor total financiado
    const { data: financiamentos } = await supabase_1.supabase
        .from('financiamentos')
        .select('valor_financiado, saldo_devedor')
        .eq('status', 'ativo');
    const valorTotalFinanciado = financiamentos?.reduce((acc, f) => acc + (f.valor_financiado || 0), 0) || 0;
    const saldoDevedorTotal = financiamentos?.reduce((acc, f) => acc + (f.saldo_devedor || f.valor_financiado || 0), 0) || 0;
    res.json({
        total: total || 0,
        ativos: ativos || 0,
        quitados: quitados || 0,
        parcelasVencendo: parcelasVencendo || 0,
        parcelasAtrasadas: parcelasAtrasadas || 0,
        valorTotalFinanciado,
        saldoDevedorTotal
    });
}));
exports.default = router;
