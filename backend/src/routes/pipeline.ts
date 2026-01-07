import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { authenticate, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

// Listar fases
router.get(
  "/fases",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { data, error } = await supabase
      .from("pipeline_fases")
      .select("*")
      .eq("ativo", true)
      .or(`usuario_id.is.null,usuario_id.eq.${authReq.userId}`)
      .order("ordem", { ascending: true });

    if (error) throw error;
    res.json(data);
  })
);

// Criar nova fase
router.post(
  "/fases",
  asyncHandler(async (req: Request, res: Response) => {
    const { nome, chave, cor, ordem } = req.body;

    // Gerar chave se não fornecida
    const finalKey = chave || nome.toLowerCase().replace(/[^a-z0-9]/g, "_");

    const authReq = req as AuthRequest;
    const { data, error } = await supabase
      .from("pipeline_fases")
      .insert({
        nome,
        chave: finalKey,
        cor: cor || "slate",
        ordem: ordem || 10,
        sistema: false,
        usuario_id: authReq.userId,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  })
);

// Atualizar fase
router.put(
  "/fases/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nome, cor, ordem } = req.body;

    const { data, error } = await supabase
      .from("pipeline_fases")
      .update({ nome, cor, ordem })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  })
);

// Remover fase (soft delete)
router.delete(
  "/fases/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Verificar se é sistema
    const { data: fase } = await supabase
      .from("pipeline_fases")
      .select("sistema, chave")
      .eq("id", id)
      .single();

    if (fase?.sistema) {
      return res
        .status(400)
        .json({ error: "Fases de sistema não podem ser removidas." });
    }

    // Verificar se tem cotações
    if (fase?.chave) {
      const { count } = await supabase
        .from("cotacoes")
        .select("*", { count: "exact", head: true })
        .eq("status_pipeline", fase.chave);

      if (count && count > 0) {
        return res.status(400).json({
          error: "Existem cotações nesta fase. Mova-as antes de remover.",
        });
      }
    }

    const { error } = await supabase
      .from("pipeline_fases")
      .update({ ativo: false })
      .eq("id", id);

    if (error) throw error;
    res.sendStatus(204);
  })
);

// Reordenar fases
router.post(
  "/fases/reordenar",
  asyncHandler(async (req: Request, res: Response) => {
    const { ordem } = req.body; // [{ id, ordem }]

    const authReq = req as AuthRequest;
    for (const item of ordem) {
      await supabase
        .from("pipeline_fases")
        .update({ ordem: item.ordem })
        .eq("id", item.id)
        .eq("usuario_id", authReq.userId);
    }

    res.sendStatus(200);
  })
);

export default router;
