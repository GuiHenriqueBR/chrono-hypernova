import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// Listar propostas
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { cliente_id, status, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = supabase
    .from('propostas')
    .select('*, clientes!inner(id, nome)', { count: 'exact' })
    .order('data_criacao', { ascending: false });

  if (cliente_id) query = query.eq('cliente_id', cliente_id);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query.range(offset, offset + Number(limit) - 1);
  if (error) throw error;

  res.json({ data: data || [], total: count || 0 });
}));

// Buscar proposta por ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('propostas').select('*, clientes(*)').eq('id', id).single();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Proposta não encontrada' });
  res.json(data);
}));

// Atualizar status da proposta (Enviada, Aceita, Recusada)
router.patch('/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // rascunho, enviada, aceita, recusada

  const updates: any = { status };
  if (status === 'enviada') updates.data_envio = new Date().toISOString();
  if (status === 'aceita') updates.data_aceitacao = new Date().toISOString();

  const { data, error } = await supabase
    .from('propostas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  res.json(data);
}));

// Converter Proposta em Apolice (Emissao)
router.post('/:id/emitir', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { numero_apolice, data_inicio, data_vencimento } = req.body;

  // 1. Buscar proposta
  const { data: proposta } = await supabase.from('propostas').select('*').eq('id', id).single();
  if (!proposta) throw new Error('Proposta não encontrada');

  // 2. Criar apolice
  const { data: apolice, error } = await supabase.from('apolices').insert({
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

  if (error) throw error;

  // 3. Atualizar proposta para aceita/emitida (se tiver status emitido na tabela, senao aceita)
  await supabase.from('propostas').update({ status: 'aceita' }).eq('id', id);

  res.status(201).json(apolice);
}));

export default router;
