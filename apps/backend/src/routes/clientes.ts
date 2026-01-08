import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// Listar todos os clientes
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  let query = supabase
    .from('clientes')
    .select('*')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`nome.ilike.%${search}%,cpf_cnpj.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  res.json({ data, total: data?.length || 0 });
}));

// Buscar cliente por ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  if (!data) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }

  res.json(data);
}));

// Buscar apólices do cliente
router.get('/:id/apolices', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('apolices')
    .select('*')
    .eq('cliente_id', id)
    .order('data_inicio', { ascending: false });

  if (error) throw error;

  res.json({ data, total: data?.length || 0 });
}));

// Buscar sinistros do cliente
router.get('/:id/sinistros', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('sinistros')
    .select('*')
    .eq('cliente_id', id)
    .order('data_ocorrencia', { ascending: false });

  if (error) throw error;

  res.json({ data, total: data?.length || 0 });
}));

// Resumo 360 do cliente - todos os produtos em um lugar
router.get('/:id/resumo-360', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Verificar se cliente existe
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('id')
    .eq('id', id)
    .single();

  if (clienteError || !cliente) {
    return res.status(404).json({ error: 'Cliente nao encontrado' });
  }

  // Buscar todas as informacoes em paralelo
  const [
    apolicesResult,
    sinistrosResult,
    consorciosResult,
    planosResult,
    financiamentosResult,
    cotacoesResult
  ] = await Promise.all([
    // Apolices
    supabase
      .from('apolices')
      .select('id, status, valor_premio')
      .eq('cliente_id', id),
    
    // Sinistros
    supabase
      .from('sinistros')
      .select('id, status')
      .eq('cliente_id', id),
    
    // Consorcios
    supabase
      .from('consorcios')
      .select('id, status, valor_credito')
      .eq('cliente_id', id),
    
    // Planos de Saude
    supabase
      .from('planos_saude')
      .select('id, status, valor_mensalidade')
      .eq('cliente_id', id),
    
    // Financiamentos
    supabase
      .from('financiamentos')
      .select('id, status, saldo_devedor')
      .eq('cliente_id', id),
    
    // Cotacoes
    supabase
      .from('cotacoes')
      .select('id, status_pipeline, valor_estimado')
      .eq('cliente_id', id)
  ]);

  // Processar apolices
  const apolices = apolicesResult.data || [];
  const apolicesAtivas = apolices.filter(a => a.status === 'vigente');
  const valorTotalApolices = apolicesAtivas.reduce((acc, a) => acc + (a.valor_premio || 0), 0);

  // Processar sinistros
  const sinistros = sinistrosResult.data || [];
  const sinistrosAbertos = sinistros.filter(s => !['pago', 'recusado'].includes(s.status));

  // Processar consorcios
  const consorcios = consorciosResult.data || [];
  const consorciosAtivos = consorcios.filter(c => c.status === 'ativo');
  const valorCreditoConsorcios = consorciosAtivos.reduce((acc, c) => acc + (c.valor_credito || 0), 0);

  // Processar planos de saude
  const planos = planosResult.data || [];
  const planosAtivos = planos.filter(p => p.status === 'ativo');
  const mensalidadeTotalPlanos = planosAtivos.reduce((acc, p) => acc + (p.valor_mensalidade || 0), 0);

  // Processar financiamentos
  const financiamentos = financiamentosResult.data || [];
  const financiamentosAtivos = financiamentos.filter(f => f.status === 'ativo');
  const saldoDevedorTotal = financiamentosAtivos.reduce((acc, f) => acc + (f.saldo_devedor || 0), 0);

  // Processar cotacoes
  const cotacoes = cotacoesResult.data || [];
  const cotacoesEmNegociacao = cotacoes.filter(c => 
    ['em_cotacao', 'enviada', 'em_negociacao'].includes(c.status_pipeline)
  );

  res.json({
    apolices: {
      total: apolices.length,
      ativas: apolicesAtivas.length,
      valor_total: valorTotalApolices
    },
    sinistros: {
      total: sinistros.length,
      abertos: sinistrosAbertos.length
    },
    consorcios: {
      total: consorcios.length,
      ativos: consorciosAtivos.length,
      valor_credito: valorCreditoConsorcios
    },
    planos_saude: {
      total: planos.length,
      ativos: planosAtivos.length,
      mensalidade_total: mensalidadeTotalPlanos
    },
    financiamentos: {
      total: financiamentos.length,
      ativos: financiamentosAtivos.length,
      saldo_devedor: saldoDevedorTotal
    },
    cotacoes: {
      total: cotacoes.length,
      em_negociacao: cotacoesEmNegociacao.length
    }
  });
}));

// Criar novo cliente
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const cliente = req.body;

  const { data, error } = await supabase
    .from('clientes')
    .insert([cliente])
    .select()
    .single();

  if (error) throw error;

  res.status(201).json(data);
}));

// Atualizar cliente
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const { data, error } = await supabase
    .from('clientes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (!data) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }

  res.json(data);
}));

// Deletar cliente
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) throw error;

  res.status(204).send();
}));

// Stats de clientes
router.get('/stats/summary', asyncHandler(async (req: Request, res: Response) => {
  const { count: total } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true });

  const { count: ativos } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('ativo', true);

  const { count: pf } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('tipo', 'PF');

  const { count: pj } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('tipo', 'PJ');

  res.json({
    total: total || 0,
    ativos: ativos || 0,
    pf: pf || 0,
    pj: pj || 0,
  });
}));

export default router;
