import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// Listar endossos de uma apolice
router.get('/apolice/:apoliceId', asyncHandler(async (req: Request, res: Response) => {
  const { apoliceId } = req.params;
  
  const { data, error } = await supabase
    .from('endossos')
    .select('*')
    .eq('apolice_id', apoliceId)
    .order('data_solicitacao', { ascending: false });

  if (error) throw error;
  res.json(data);
}));

// Criar endosso
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { apolice_id, tipo, descricao, valor_novo } = req.body;

  const { data, error } = await supabase
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

  if (error) throw error;
  res.status(201).json(data);
}));

// Atualizar status do endosso
router.patch('/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // rascunho, enviado, aceito, emitido

  const updates: any = { status };
  if (status === 'emitido') updates.data_emissao = new Date().toISOString();

  const { data, error } = await supabase
    .from('endossos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  res.json(data);
}));

export default router;
