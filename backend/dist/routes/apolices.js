"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../services/supabase");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// Listar apolices
router.get("/", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { cliente_id, ramo, status, search, page = 1, limit = 50, } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let query = supabase_1.supabase
        .from("apolices")
        .select("*, clientes!inner(id, nome, cpf_cnpj)", { count: "exact" })
        .order("data_vencimento", { ascending: true });
    if (cliente_id) {
        query = query.eq("cliente_id", cliente_id);
    }
    if (ramo) {
        query = query.eq("ramo", ramo);
    }
    if (status) {
        query = query.eq("status", status);
    }
    if (search) {
        query = query.or(`numero_apolice.ilike.%${search}%,seguradora.ilike.%${search}%`);
    }
    const { data, error, count } = await query.range(offset, offset + Number(limit) - 1);
    if (error)
        throw error;
    res.json({
        data: data || [],
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit)),
    });
}));
// Buscar apolice por ID com todos os relacionamentos
router.get("/:id", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from("apolices")
        .select(`
      *,
      clientes!inner(id, nome, cpf_cnpj, email, telefone, tipo),
      apolice_coberturas(*),
      apolice_endossos(*, usuario:usuarios(nome)),
      apolice_historico(*, usuario:usuarios(nome))
    `)
        .eq("id", id)
        .single();
    if (error) {
        logger_1.logger.error("Erro ao buscar apolice:", error);
        throw error;
    }
    if (!data) {
        return res.status(404).json({ error: "Apolice nao encontrada" });
    }
    res.json(data);
}));
// Criar apolice
router.post("/", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { coberturas, ...apolice } = req.body;
    // Inserir apolice
    const { data: novaApolice, error } = await supabase_1.supabase
        .from("apolices")
        .insert([{ ...apolice, usuario_id: userId }])
        .select("*, clientes!inner(*)")
        .single();
    if (error)
        throw error;
    // Inserir coberturas se houver
    if (coberturas && coberturas.length > 0) {
        const coberturasData = coberturas.map((c) => ({
            ...c,
            apolice_id: novaApolice.id,
        }));
        await supabase_1.supabase.from("apolice_coberturas").insert(coberturasData);
    }
    // Registrar no historico
    await supabase_1.supabase.from("apolice_historico").insert({
        apolice_id: novaApolice.id,
        usuario_id: userId,
        tipo_evento: "criacao",
        descricao: "Apolice criada no sistema",
        dados_anteriores: null,
        dados_novos: apolice,
    });
    res.status(201).json(novaApolice);
}));
// Atualizar apolice
router.put("/:id", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const updates = req.body;
    // Buscar dados anteriores
    const { data: apoliceAnterior } = await supabase_1.supabase
        .from("apolices")
        .select("*")
        .eq("id", id)
        .single();
    const { data, error } = await supabase_1.supabase
        .from("apolices")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
    if (error)
        throw error;
    if (!data) {
        return res.status(404).json({ error: "Apolice nao encontrada" });
    }
    // Registrar no historico
    await supabase_1.supabase.from("apolice_historico").insert({
        apolice_id: id,
        usuario_id: userId,
        tipo_evento: "atualizacao",
        descricao: "Apolice atualizada",
        dados_anteriores: apoliceAnterior,
        dados_novos: updates,
    });
    res.json(data);
}));
// Deletar apolice
router.delete("/:id", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase_1.supabase.from("apolices").delete().eq("id", id);
    if (error)
        throw error;
    res.status(204).send();
}));
// ========== COBERTURAS ==========
// Listar coberturas da apolice
router.get("/:id/coberturas", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from("apolice_coberturas")
        .select("*")
        .eq("apolice_id", id)
        .order("created_at", { ascending: true });
    if (error)
        throw error;
    res.json({ data: data || [] });
}));
// Adicionar cobertura
router.post("/:id/coberturas", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const cobertura = req.body;
    const { data, error } = await supabase_1.supabase
        .from("apolice_coberturas")
        .insert({ ...cobertura, apolice_id: id })
        .select()
        .single();
    if (error)
        throw error;
    // Registrar no historico
    await supabase_1.supabase.from("apolice_historico").insert({
        apolice_id: id,
        usuario_id: userId,
        tipo_evento: "cobertura_adicionada",
        descricao: `Cobertura "${cobertura.nome}" adicionada`,
        dados_novos: cobertura,
    });
    res.status(201).json(data);
}));
// Atualizar cobertura
router.put("/:id/coberturas/:coberturaId", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, coberturaId } = req.params;
    const userId = req.userId;
    const updates = req.body;
    const { data, error } = await supabase_1.supabase
        .from("apolice_coberturas")
        .update(updates)
        .eq("id", coberturaId)
        .eq("apolice_id", id)
        .select()
        .single();
    if (error)
        throw error;
    // Registrar no historico
    await supabase_1.supabase.from("apolice_historico").insert({
        apolice_id: id,
        usuario_id: userId,
        tipo_evento: "cobertura_atualizada",
        descricao: `Cobertura "${updates.nome || data.nome}" atualizada`,
        dados_novos: updates,
    });
    res.json(data);
}));
// Remover cobertura
router.delete("/:id/coberturas/:coberturaId", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, coberturaId } = req.params;
    const userId = req.userId;
    // Buscar cobertura antes de deletar
    const { data: cobertura } = await supabase_1.supabase
        .from("apolice_coberturas")
        .select("*")
        .eq("id", coberturaId)
        .single();
    const { error } = await supabase_1.supabase
        .from("apolice_coberturas")
        .delete()
        .eq("id", coberturaId)
        .eq("apolice_id", id);
    if (error)
        throw error;
    // Registrar no historico
    if (cobertura) {
        await supabase_1.supabase.from("apolice_historico").insert({
            apolice_id: id,
            usuario_id: userId,
            tipo_evento: "cobertura_removida",
            descricao: `Cobertura "${cobertura.nome}" removida`,
            dados_anteriores: cobertura,
        });
    }
    res.status(204).send();
}));
// ========== ENDOSSOS ==========
// Listar endossos da apolice
router.get("/:id/endossos", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from("apolice_endossos")
        .select("*, usuario:usuarios(nome)")
        .eq("apolice_id", id)
        .order("data_emissao", { ascending: false });
    if (error)
        throw error;
    res.json({ data: data || [] });
}));
// Criar endosso
router.post("/:id/endossos", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const endosso = req.body;
    // Gerar numero do endosso
    const { count } = await supabase_1.supabase
        .from("apolice_endossos")
        .select("*", { count: "exact", head: true })
        .eq("apolice_id", id);
    const numeroEndosso = `END-${String((count || 0) + 1).padStart(3, "0")}`;
    const { data, error } = await supabase_1.supabase
        .from("apolice_endossos")
        .insert({
        ...endosso,
        apolice_id: id,
        usuario_id: userId,
        numero_endosso: numeroEndosso,
        status: endosso.status || "pendente",
    })
        .select("*, usuario:usuarios(nome)")
        .single();
    if (error)
        throw error;
    // Registrar no historico
    await supabase_1.supabase.from("apolice_historico").insert({
        apolice_id: id,
        usuario_id: userId,
        tipo_evento: "endosso_criado",
        descricao: `Endosso ${numeroEndosso} criado - ${endosso.tipo}`,
        dados_novos: { ...endosso, numero_endosso: numeroEndosso },
    });
    // Se o endosso afetar o premio, atualizar a apolice
    if (endosso.diferenca_premio) {
        const { data: apolice } = await supabase_1.supabase
            .from("apolices")
            .select("valor_premio")
            .eq("id", id)
            .single();
        if (apolice) {
            await supabase_1.supabase
                .from("apolices")
                .update({
                valor_premio: apolice.valor_premio + endosso.diferenca_premio,
                updated_at: new Date().toISOString(),
            })
                .eq("id", id);
        }
    }
    res.status(201).json(data);
}));
// Atualizar status do endosso
router.patch("/:id/endossos/:endossoId", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, endossoId } = req.params;
    const userId = req.userId;
    const { status, observacao } = req.body;
    const { data, error } = await supabase_1.supabase
        .from("apolice_endossos")
        .update({ status, observacao, updated_at: new Date().toISOString() })
        .eq("id", endossoId)
        .eq("apolice_id", id)
        .select()
        .single();
    if (error)
        throw error;
    // Registrar no historico
    await supabase_1.supabase.from("apolice_historico").insert({
        apolice_id: id,
        usuario_id: userId,
        tipo_evento: "endosso_atualizado",
        descricao: `Status do endosso alterado para ${status}`,
        dados_novos: { status, observacao },
    });
    res.json(data);
}));
// ========== HISTORICO ==========
// Listar historico da apolice
router.get("/:id/historico", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from("apolice_historico")
        .select("*, usuario:usuarios(nome)")
        .eq("apolice_id", id)
        .order("created_at", { ascending: false });
    if (error)
        throw error;
    res.json({ data: data || [] });
}));
// ========== STATS ==========
// Stats de apolices
router.get("/stats/summary", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { count: total } = await supabase_1.supabase
        .from("apolices")
        .select("*", { count: "exact", head: true });
    const { count: vigentes } = await supabase_1.supabase
        .from("apolices")
        .select("*", { count: "exact", head: true })
        .eq("status", "vigente");
    const { count: vencidas } = await supabase_1.supabase
        .from("apolices")
        .select("*", { count: "exact", head: true })
        .eq("status", "vencida");
    // Apolices vencendo nos proximos 30 dias
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const { count: vencendo } = await supabase_1.supabase
        .from("apolices")
        .select("*", { count: "exact", head: true })
        .eq("status", "vigente")
        .gte("data_vencimento", new Date().toISOString().split("T")[0])
        .lte("data_vencimento", thirtyDaysFromNow.toISOString().split("T")[0]);
    // Premio total
    const { data: premios } = await supabase_1.supabase
        .from("apolices")
        .select("valor_premio")
        .eq("status", "vigente");
    const premioTotal = premios?.reduce((acc, a) => acc + (a.valor_premio || 0), 0) || 0;
    res.json({
        total: total || 0,
        vigentes: vigentes || 0,
        vencidas: vencidas || 0,
        vencendo: vencendo || 0,
        premioTotal,
    });
}));
exports.default = router;
