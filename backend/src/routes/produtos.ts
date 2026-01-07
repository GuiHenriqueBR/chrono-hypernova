import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
router.use(authenticate);

// ============================================
// PRODUTOS/RAMOS - Configuração de tipos de produtos
// ============================================

// Listar todos os produtos/ramos
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { categoria, ativo } = req.query;

  let query = supabase
    .from('produtos')
    .select('*')
    .order('ordem', { ascending: true });

  if (categoria) query = query.eq('categoria', categoria);
  if (ativo !== undefined) query = query.eq('ativo', ativo === 'true');

  const { data, error } = await query;

  if (error) throw error;

  res.json({ data: data || [] });
}));

// Buscar produto por ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('produtos')
    .select('*, produto_campos(*)')
    .eq('id', id)
    .single();

  if (error) throw error;

  if (!data) {
    return res.status(404).json({ error: 'Produto nao encontrado' });
  }

  res.json(data);
}));

// Criar novo produto/ramo
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { campos, ...produto } = req.body;

  // Verificar se já existe produto com mesmo código
  const { data: existente } = await supabase
    .from('produtos')
    .select('id')
    .eq('codigo', produto.codigo)
    .single();

  if (existente) {
    return res.status(400).json({ error: 'Ja existe um produto com este codigo' });
  }

  // Buscar maior ordem para colocar no final
  const { data: ultimoOrdem } = await supabase
    .from('produtos')
    .select('ordem')
    .order('ordem', { ascending: false })
    .limit(1)
    .single();

  const novaOrdem = (ultimoOrdem?.ordem || 0) + 1;

  const { data: novoProduto, error } = await supabase
    .from('produtos')
    .insert([{
      ...produto,
      ordem: novaOrdem,
      usuario_criacao: userId
    }])
    .select()
    .single();

  if (error) throw error;

  // Inserir campos customizados se houver
  if (campos && campos.length > 0) {
    const camposData = campos.map((c: any, index: number) => ({
      ...c,
      produto_id: novoProduto.id,
      ordem: index + 1
    }));
    await supabase.from('produto_campos').insert(camposData);
  }

  logger.info(`Novo produto criado: ${novoProduto.nome} (${novoProduto.codigo})`);

  res.status(201).json(novoProduto);
}));

// Atualizar produto/ramo
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const { data, error } = await supabase
    .from('produtos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (!data) {
    return res.status(404).json({ error: 'Produto nao encontrado' });
  }

  res.json(data);
}));

// Deletar produto/ramo
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Verificar se existem registros usando este produto
  const { count: apolicesCount } = await supabase
    .from('apolices')
    .select('*', { count: 'exact', head: true })
    .eq('produto_id', id);

  if (apolicesCount && apolicesCount > 0) {
    return res.status(400).json({
      error: 'Nao e possivel excluir este produto pois existem apolices vinculadas',
      count: apolicesCount
    });
  }

  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id);

  if (error) throw error;

  res.status(204).send();
}));

// Reordenar produtos
router.post('/reordenar', asyncHandler(async (req: Request, res: Response) => {
  const { ordem } = req.body; // Array de { id, ordem }

  for (const item of ordem) {
    await supabase
      .from('produtos')
      .update({ ordem: item.ordem })
      .eq('id', item.id);
  }

  res.json({ message: 'Ordem atualizada com sucesso' });
}));

// Ativar/Desativar produto
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Buscar estado atual
  const { data: produto } = await supabase
    .from('produtos')
    .select('ativo')
    .eq('id', id)
    .single();

  if (!produto) {
    return res.status(404).json({ error: 'Produto nao encontrado' });
  }

  const { data, error } = await supabase
    .from('produtos')
    .update({ ativo: !produto.ativo, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  res.json(data);
}));

// ========== CAMPOS CUSTOMIZADOS ==========

// Listar campos de um produto
router.get('/:id/campos', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('produto_campos')
    .select('*')
    .eq('produto_id', id)
    .order('ordem', { ascending: true });

  if (error) throw error;

  res.json({ data: data || [] });
}));

// Adicionar campo customizado
router.post('/:id/campos', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const campo = req.body;

  // Buscar maior ordem
  const { data: ultimoOrdem } = await supabase
    .from('produto_campos')
    .select('ordem')
    .eq('produto_id', id)
    .order('ordem', { ascending: false })
    .limit(1)
    .single();

  const novaOrdem = (ultimoOrdem?.ordem || 0) + 1;

  const { data, error } = await supabase
    .from('produto_campos')
    .insert({ ...campo, produto_id: id, ordem: novaOrdem })
    .select()
    .single();

  if (error) throw error;

  res.status(201).json(data);
}));

// Atualizar campo customizado
router.put('/:id/campos/:campoId', asyncHandler(async (req: Request, res: Response) => {
  const { id, campoId } = req.params;
  const updates = req.body;

  const { data, error } = await supabase
    .from('produto_campos')
    .update(updates)
    .eq('id', campoId)
    .eq('produto_id', id)
    .select()
    .single();

  if (error) throw error;

  res.json(data);
}));

// Deletar campo customizado
router.delete('/:id/campos/:campoId', asyncHandler(async (req: Request, res: Response) => {
  const { id, campoId } = req.params;

  const { error } = await supabase
    .from('produto_campos')
    .delete()
    .eq('id', campoId)
    .eq('produto_id', id);

  if (error) throw error;

  res.status(204).send();
}));

// Reordenar campos
router.post('/:id/campos/reordenar', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ordem } = req.body;

  for (const item of ordem) {
    await supabase
      .from('produto_campos')
      .update({ ordem: item.ordem })
      .eq('id', item.id)
      .eq('produto_id', id);
  }

  res.json({ message: 'Ordem dos campos atualizada' });
}));

// ========== PRODUTOS PADRÃO (SEED) ==========

// Criar produtos padrão do sistema
router.post('/seed', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  const produtosPadrao = [
    // SEGUROS
    {
      codigo: 'auto',
      nome: 'Seguro Auto',
      descricao: 'Seguro de automóveis',
      categoria: 'seguro',
      icone: 'Car',
      cor: '#3B82F6',
      ordem: 1,
      ativo: true,
      usuario_criacao: userId
    },
    {
      codigo: 'residencial',
      nome: 'Seguro Residencial',
      descricao: 'Seguro de residências',
      categoria: 'seguro',
      icone: 'Home',
      cor: '#10B981',
      ordem: 2,
      ativo: true,
      usuario_criacao: userId
    },
    {
      codigo: 'vida',
      nome: 'Seguro de Vida',
      descricao: 'Seguro de vida individual ou em grupo',
      categoria: 'seguro',
      icone: 'Heart',
      cor: '#EF4444',
      ordem: 3,
      ativo: true,
      usuario_criacao: userId
    },
    {
      codigo: 'empresarial',
      nome: 'Seguro Empresarial',
      descricao: 'Seguros para empresas',
      categoria: 'seguro',
      icone: 'Building',
      cor: '#8B5CF6',
      ordem: 4,
      ativo: true,
      usuario_criacao: userId
    },
    {
      codigo: 'viagem',
      nome: 'Seguro Viagem',
      descricao: 'Seguro para viagens nacionais e internacionais',
      categoria: 'seguro',
      icone: 'Plane',
      cor: '#F59E0B',
      ordem: 5,
      ativo: true,
      usuario_criacao: userId
    },
    {
      codigo: 'rc',
      nome: 'Responsabilidade Civil',
      descricao: 'Seguro de responsabilidade civil profissional',
      categoria: 'seguro',
      icone: 'Shield',
      cor: '#6366F1',
      ordem: 6,
      ativo: true,
      usuario_criacao: userId
    },
    // CONSÓRCIOS
    {
      codigo: 'consorcio_imovel',
      nome: 'Consórcio Imóvel',
      descricao: 'Consórcio para aquisição de imóveis',
      categoria: 'consorcio',
      icone: 'Building2',
      cor: '#14B8A6',
      ordem: 10,
      ativo: true,
      usuario_criacao: userId
    },
    {
      codigo: 'consorcio_auto',
      nome: 'Consórcio Auto',
      descricao: 'Consórcio para aquisição de veículos',
      categoria: 'consorcio',
      icone: 'Car',
      cor: '#0EA5E9',
      ordem: 11,
      ativo: true,
      usuario_criacao: userId
    },
    {
      codigo: 'consorcio_servicos',
      nome: 'Consórcio Serviços',
      descricao: 'Consórcio para serviços diversos',
      categoria: 'consorcio',
      icone: 'Wrench',
      cor: '#F97316',
      ordem: 12,
      ativo: true,
      usuario_criacao: userId
    },
    // PLANOS DE SAÚDE
    {
      codigo: 'saude_individual',
      nome: 'Plano Saúde Individual',
      descricao: 'Plano de saúde individual',
      categoria: 'saude',
      icone: 'Stethoscope',
      cor: '#22C55E',
      ordem: 20,
      ativo: true,
      usuario_criacao: userId
    },
    {
      codigo: 'saude_familiar',
      nome: 'Plano Saúde Familiar',
      descricao: 'Plano de saúde familiar',
      categoria: 'saude',
      icone: 'Users',
      cor: '#06B6D4',
      ordem: 21,
      ativo: true,
      usuario_criacao: userId
    },
    {
      codigo: 'saude_empresarial',
      nome: 'Plano Saúde Empresarial',
      descricao: 'Plano de saúde empresarial/PME',
      categoria: 'saude',
      icone: 'Building',
      cor: '#8B5CF6',
      ordem: 22,
      ativo: true,
      usuario_criacao: userId
    },
    {
      codigo: 'odonto',
      nome: 'Plano Odontológico',
      descricao: 'Plano odontológico',
      categoria: 'saude',
      icone: 'Smile',
      cor: '#EC4899',
      ordem: 23,
      ativo: true,
      usuario_criacao: userId
    },
    // FINANCIAMENTOS
    {
      codigo: 'financ_imovel',
      nome: 'Financiamento Imobiliário',
      descricao: 'Financiamento para aquisição de imóveis',
      categoria: 'financiamento',
      icone: 'Home',
      cor: '#059669',
      ordem: 30,
      ativo: true,
      usuario_criacao: userId
    },
    {
      codigo: 'financ_veiculo',
      nome: 'Financiamento de Veículo',
      descricao: 'Financiamento para aquisição de veículos',
      categoria: 'financiamento',
      icone: 'Car',
      cor: '#2563EB',
      ordem: 31,
      ativo: true,
      usuario_criacao: userId
    },
    {
      codigo: 'emprestimo',
      nome: 'Empréstimo Pessoal',
      descricao: 'Empréstimo pessoal',
      categoria: 'financiamento',
      icone: 'Wallet',
      cor: '#DC2626',
      ordem: 32,
      ativo: true,
      usuario_criacao: userId
    },
    {
      codigo: 'consignado',
      nome: 'Crédito Consignado',
      descricao: 'Crédito consignado',
      categoria: 'financiamento',
      icone: 'CreditCard',
      cor: '#7C3AED',
      ordem: 33,
      ativo: true,
      usuario_criacao: userId
    }
  ];

  // Verificar quais já existem
  const { data: existentes } = await supabase
    .from('produtos')
    .select('codigo');

  const codigosExistentes = new Set(existentes?.map(p => p.codigo) || []);

  const novos = produtosPadrao.filter(p => !codigosExistentes.has(p.codigo));

  if (novos.length === 0) {
    return res.json({ message: 'Todos os produtos padrao ja existem', created: 0 });
  }

  const { data, error } = await supabase
    .from('produtos')
    .insert(novos)
    .select();

  if (error) throw error;

  res.status(201).json({
    message: `${novos.length} produtos criados`,
    created: novos.length,
    data
  });
}));

// ========== CATEGORIAS ==========

// Listar categorias disponíveis
router.get('/categorias/list', asyncHandler(async (req: Request, res: Response) => {
  const categorias = [
    { codigo: 'seguro', nome: 'Seguros', descricao: 'Produtos de seguro tradicionais' },
    { codigo: 'consorcio', nome: 'Consórcios', descricao: 'Consórcios de bens e serviços' },
    { codigo: 'saude', nome: 'Planos de Saúde', descricao: 'Planos de saúde e odontológicos' },
    { codigo: 'financiamento', nome: 'Financiamentos', descricao: 'Financiamentos e empréstimos' },
    { codigo: 'previdencia', nome: 'Previdência', descricao: 'Planos de previdência privada' },
    { codigo: 'capitalizacao', nome: 'Capitalização', descricao: 'Títulos de capitalização' },
    { codigo: 'outros', nome: 'Outros', descricao: 'Outros produtos e serviços' }
  ];

  res.json({ data: categorias });
}));

export default router;
