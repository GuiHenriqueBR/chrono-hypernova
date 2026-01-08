import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { uploadSinistroDocumento, deleteFile, getSignedUrl } from '../services/storage';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import multer from 'multer';

const router = Router();
router.use(authenticate);

// Configurar multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo nao permitido'));
    }
  }
});

// Status possiveis do sinistro
const STATUS_SINISTRO = [
  'notificado',
  'analise_inicial', 
  'documentacao',
  'regulacao',
  'cobertura_confirmada',
  'indenizacao_processando',
  'pago',
  'recusado'
];

// Listar sinistros
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { cliente_id, apolice_id, status, search, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = supabase
    .from('sinistros')
    .select('*, clientes!inner(id, nome, cpf_cnpj), apolices!inner(id, numero_apolice, ramo, seguradora)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (cliente_id) {
    query = query.eq('cliente_id', cliente_id);
  }
  if (apolice_id) {
    query = query.eq('apolice_id', apolice_id);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (search) {
    query = query.or(`numero_sinistro.ilike.%${search}%,descricao_ocorrencia.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(offset, offset + Number(limit) - 1);

  if (error) throw error;

  res.json({ 
    data: data || [], 
    total: count || 0,
    page: Number(page),
    limit: Number(limit)
  });
}));

// Buscar sinistro por ID com timeline de regulacao
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('sinistros')
    .select(`
      *,
      clientes!inner(id, nome, cpf_cnpj, email, telefone),
      apolices!inner(id, numero_apolice, ramo, seguradora, valor_premio),
      sinistro_regulacao(*, usuario:usuarios(nome)),
      sinistro_documentos(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    logger.error('Erro ao buscar sinistro:', error);
    throw error;
  }

  if (!data) {
    return res.status(404).json({ error: 'Sinistro nao encontrado' });
  }

  res.json(data);
}));

// Criar sinistro
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const sinistro = req.body;

  // Gerar numero do sinistro
  const ano = new Date().getFullYear();
  const { count } = await supabase
    .from('sinistros')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${ano}-01-01`);

  const numeroSinistro = `SIN-${ano}-${String((count || 0) + 1).padStart(5, '0')}`;

  const { data, error } = await supabase
    .from('sinistros')
    .insert([{ 
      ...sinistro, 
      numero_sinistro: numeroSinistro,
      status: 'notificado'
    }])
    .select('*, clientes!inner(*), apolices!inner(*)')
    .single();

  if (error) throw error;

  // Criar evento inicial na timeline
  await supabase.from('sinistro_regulacao').insert({
    sinistro_id: data.id,
    usuario_id: userId,
    etapa: 'notificado',
    titulo: 'Sinistro Aberto',
    descricao: 'Sinistro registrado no sistema',
    data_evento: new Date().toISOString(),
    status: 'concluido'
  });

  res.status(201).json(data);
}));

// Atualizar sinistro
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.id;
  const updates = req.body;

  // Buscar status anterior
  const { data: sinistroAnterior } = await supabase
    .from('sinistros')
    .select('status')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('sinistros')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (!data) {
    return res.status(404).json({ error: 'Sinistro nao encontrado' });
  }

  // Se mudou o status, criar evento na timeline
  if (updates.status && sinistroAnterior?.status !== updates.status) {
    const statusLabels: Record<string, string> = {
      notificado: 'Sinistro Notificado',
      analise_inicial: 'Analise Inicial Iniciada',
      documentacao: 'Documentacao em Andamento',
      regulacao: 'Regulacao Iniciada',
      cobertura_confirmada: 'Cobertura Confirmada',
      indenizacao_processando: 'Indenizacao em Processamento',
      pago: 'Sinistro Pago',
      recusado: 'Sinistro Recusado'
    };

    await supabase.from('sinistro_regulacao').insert({
      sinistro_id: id,
      usuario_id: userId,
      etapa: updates.status,
      titulo: statusLabels[updates.status] || updates.status,
      descricao: updates.observacao_status || `Status alterado para ${updates.status}`,
      data_evento: new Date().toISOString(),
      status: 'concluido'
    });
  }

  res.json(data);
}));

// Deletar sinistro
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('sinistros')
    .delete()
    .eq('id', id);

  if (error) throw error;

  res.status(204).send();
}));

// ========== TIMELINE DE REGULACAO ==========

// Listar eventos da regulacao
router.get('/:id/regulacao', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('sinistro_regulacao')
    .select('*, usuario:usuarios(nome)')
    .eq('sinistro_id', id)
    .order('data_evento', { ascending: false });

  if (error) throw error;

  res.json({ data: data || [] });
}));

// Adicionar evento na timeline
router.post('/:id/regulacao', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.id;
  const { etapa, titulo, descricao, responsavel, prazo, observacao } = req.body;

  const { data, error } = await supabase
    .from('sinistro_regulacao')
    .insert({
      sinistro_id: id,
      usuario_id: userId,
      etapa,
      titulo,
      descricao,
      responsavel,
      prazo,
      observacao,
      data_evento: new Date().toISOString(),
      status: 'pendente'
    })
    .select('*, usuario:usuarios(nome)')
    .single();

  if (error) throw error;

  res.status(201).json(data);
}));

// Atualizar evento da regulacao
router.patch('/:id/regulacao/:eventoId', asyncHandler(async (req: Request, res: Response) => {
  const { id, eventoId } = req.params;
  const { status, observacao, data_conclusao } = req.body;

  const updates: any = {};
  if (status) updates.status = status;
  if (observacao) updates.observacao = observacao;
  if (status === 'concluido') updates.data_conclusao = data_conclusao || new Date().toISOString();

  const { data, error } = await supabase
    .from('sinistro_regulacao')
    .update(updates)
    .eq('id', eventoId)
    .eq('sinistro_id', id)
    .select()
    .single();

  if (error) throw error;

  res.json(data);
}));

// ========== DOCUMENTOS DO SINISTRO ==========

// Listar documentos
router.get('/:id/documentos', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('sinistro_documentos')
    .select('*')
    .eq('sinistro_id', id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  res.json({ data: data || [] });
}));

// Adicionar documento com upload real
router.post('/:id/documentos', upload.single('arquivo'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.id;
  const { tipo, observacao } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Arquivo e obrigatorio' });
  }

  // Upload para Supabase Storage
  const uploadResult = await uploadSinistroDocumento(id, file.buffer, {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  });

  if (!uploadResult.success) {
    return res.status(500).json({ error: uploadResult.error || 'Erro no upload' });
  }

  const { data, error } = await supabase
    .from('sinistro_documentos')
    .insert({
      sinistro_id: id,
      uploaded_by: userId,
      tipo: tipo || 'outros',
      nome_arquivo: file.originalname,
      url_storage: uploadResult.path,
      tamanho: file.size,
      tipo_mime: file.mimetype,
      observacoes: observacao,
      status: 'pendente'
    })
    .select()
    .single();

  if (error) throw error;

  // Adicionar evento na timeline
  await supabase.from('regulacao_sinistro').insert({
    sinistro_id: id,
    executado_por: userId,
    etapa: 'documentacao',
    descricao: `Documento "${file.originalname}" (${tipo || 'outros'}) adicionado ao processo`,
    data_evento: new Date().toISOString(),
    status: 'concluido'
  });

  // Retornar com URL assinada
  const signedUrl = await getSignedUrl('documentos', uploadResult.path!);
  
  res.status(201).json({ ...data, url_assinada: signedUrl });
}));

// Obter URL assinada para download de documento
router.get('/:id/documentos/:docId/download', asyncHandler(async (req: Request, res: Response) => {
  const { id, docId } = req.params;

  const { data: doc, error } = await supabase
    .from('sinistro_documentos')
    .select('*')
    .eq('id', docId)
    .eq('sinistro_id', id)
    .single();

  if (error || !doc) {
    return res.status(404).json({ error: 'Documento nao encontrado' });
  }

  const signedUrl = await getSignedUrl('documentos', doc.url_storage, 3600);
  
  if (!signedUrl) {
    return res.status(500).json({ error: 'Erro ao gerar URL de download' });
  }

  res.json({ url: signedUrl, nome: doc.nome_arquivo });
}));

// Atualizar status do documento
router.patch('/:id/documentos/:docId', asyncHandler(async (req: Request, res: Response) => {
  const { id, docId } = req.params;
  const { status, observacoes } = req.body;

  const { data, error } = await supabase
    .from('sinistro_documentos')
    .update({ status, observacoes })
    .eq('id', docId)
    .eq('sinistro_id', id)
    .select()
    .single();

  if (error) throw error;

  res.json(data);
}));

// Deletar documento (tambem remove do storage)
router.delete('/:id/documentos/:docId', asyncHandler(async (req: Request, res: Response) => {
  const { id, docId } = req.params;

  // Buscar documento para obter path do storage
  const { data: doc } = await supabase
    .from('sinistro_documentos')
    .select('url_storage')
    .eq('id', docId)
    .eq('sinistro_id', id)
    .single();

  if (doc?.url_storage) {
    await deleteFile('documentos', doc.url_storage);
  }

  const { error } = await supabase
    .from('sinistro_documentos')
    .delete()
    .eq('id', docId)
    .eq('sinistro_id', id);

  if (error) throw error;

  res.status(204).send();
}));

// ========== CHECKLIST DE DOCUMENTOS ==========

// Checklists padrao por ramo de seguro
const CHECKLISTS_PADRAO: Record<string, { nome: string; obrigatorio: boolean }[]> = {
  auto: [
    { nome: 'Boletim de Ocorrencia (BO)', obrigatorio: true },
    { nome: 'CNH do Condutor', obrigatorio: true },
    { nome: 'CRLV do Veiculo', obrigatorio: true },
    { nome: 'Fotos do Veiculo (Danos)', obrigatorio: true },
    { nome: 'Fotos do Local do Acidente', obrigatorio: false },
    { nome: 'Orcamento de Reparo', obrigatorio: true },
    { nome: 'Nota Fiscal de Pecas/Servicos', obrigatorio: false },
    { nome: 'Laudo de Vistoria', obrigatorio: false },
    { nome: 'Declaracao de Terceiros', obrigatorio: false },
    { nome: 'Copia da Apolice', obrigatorio: false }
  ],
  residencial: [
    { nome: 'Boletim de Ocorrencia (BO)', obrigatorio: true },
    { nome: 'RG/CPF do Segurado', obrigatorio: true },
    { nome: 'Comprovante de Residencia', obrigatorio: true },
    { nome: 'Fotos dos Danos', obrigatorio: true },
    { nome: 'Orcamento de Reparo/Substituicao', obrigatorio: true },
    { nome: 'Nota Fiscal dos Bens Danificados', obrigatorio: false },
    { nome: 'Laudo Tecnico (se aplicavel)', obrigatorio: false },
    { nome: 'Laudo de Bombeiros (incendio)', obrigatorio: false },
    { nome: 'Copia da Apolice', obrigatorio: false }
  ],
  vida: [
    { nome: 'Certidao de Obito', obrigatorio: true },
    { nome: 'RG/CPF do Falecido', obrigatorio: true },
    { nome: 'RG/CPF do Beneficiario', obrigatorio: true },
    { nome: 'Comprovante de Parentesco', obrigatorio: true },
    { nome: 'Declaracao de Herdeiros', obrigatorio: false },
    { nome: 'Laudo Medico/Atestado', obrigatorio: false },
    { nome: 'Boletim de Ocorrencia (se morte violenta)', obrigatorio: false },
    { nome: 'Comprovante de Conta Bancaria', obrigatorio: true },
    { nome: 'Copia da Apolice', obrigatorio: false }
  ],
  saude: [
    { nome: 'RG/CPF do Segurado', obrigatorio: true },
    { nome: 'Carteira do Plano', obrigatorio: true },
    { nome: 'Laudo/Relatorio Medico', obrigatorio: true },
    { nome: 'Pedido Medico', obrigatorio: true },
    { nome: 'Exames Complementares', obrigatorio: false },
    { nome: 'Notas Fiscais de Despesas', obrigatorio: true },
    { nome: 'Recibos de Pagamento', obrigatorio: false },
    { nome: 'Autorizacao de Procedimento', obrigatorio: false }
  ],
  empresarial: [
    { nome: 'Boletim de Ocorrencia (BO)', obrigatorio: true },
    { nome: 'CNPJ/Contrato Social', obrigatorio: true },
    { nome: 'RG/CPF do Representante', obrigatorio: true },
    { nome: 'Fotos dos Danos', obrigatorio: true },
    { nome: 'Orcamentos de Reparo', obrigatorio: true },
    { nome: 'Notas Fiscais dos Bens', obrigatorio: false },
    { nome: 'Inventario de Bens', obrigatorio: false },
    { nome: 'Laudo Tecnico', obrigatorio: false },
    { nome: 'Relatorio de Prejuizo', obrigatorio: false },
    { nome: 'Copia da Apolice', obrigatorio: false }
  ],
  transporte: [
    { nome: 'Conhecimento de Transporte (CTe)', obrigatorio: true },
    { nome: 'Nota Fiscal da Mercadoria', obrigatorio: true },
    { nome: 'Boletim de Ocorrencia (BO)', obrigatorio: true },
    { nome: 'Fotos da Mercadoria/Veiculo', obrigatorio: true },
    { nome: 'Manifesto de Carga', obrigatorio: false },
    { nome: 'Laudo de Avaria', obrigatorio: false },
    { nome: 'Termo de Ressalva', obrigatorio: false },
    { nome: 'Copia da Apolice', obrigatorio: false }
  ],
  responsabilidade_civil: [
    { nome: 'Notificacao/Citacao Judicial', obrigatorio: true },
    { nome: 'Boletim de Ocorrencia (BO)', obrigatorio: false },
    { nome: 'RG/CPF do Segurado', obrigatorio: true },
    { nome: 'Documentacao do Terceiro', obrigatorio: true },
    { nome: 'Descricao do Evento', obrigatorio: true },
    { nome: 'Provas do Dano Causado', obrigatorio: true },
    { nome: 'Orcamentos/Laudos', obrigatorio: false },
    { nome: 'Copia da Apolice', obrigatorio: false }
  ]
};

// Obter checklist padrao por ramo
router.get('/checklists/padrao/:ramo', asyncHandler(async (req: Request, res: Response) => {
  const { ramo } = req.params;
  const ramoNormalizado = ramo.toLowerCase().replace(/\s+/g, '_');
  
  const checklist = CHECKLISTS_PADRAO[ramoNormalizado] || CHECKLISTS_PADRAO['auto'];
  
  res.json({
    ramo: ramoNormalizado,
    itens: checklist,
    total: checklist.length,
    obrigatorios: checklist.filter(i => i.obrigatorio).length
  });
}));

// Listar todos os ramos disponiveis
router.get('/checklists/ramos', asyncHandler(async (req: Request, res: Response) => {
  const ramos = Object.keys(CHECKLISTS_PADRAO).map(ramo => ({
    codigo: ramo,
    nome: ramo.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    total_itens: CHECKLISTS_PADRAO[ramo].length
  }));
  
  res.json({ ramos });
}));

// Obter checklist do sinistro
router.get('/:id/checklist', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Buscar sinistro com ramo da apolice
  const { data: sinistro, error: errSinistro } = await supabase
    .from('sinistros')
    .select('id, apolices(ramo)')
    .eq('id', id)
    .single();

  if (errSinistro || !sinistro) {
    return res.status(404).json({ error: 'Sinistro nao encontrado' });
  }

  // Buscar checklist existente
  const { data: checklist, error } = await supabase
    .from('sinistro_checklists')
    .select('*')
    .eq('sinistro_id', id)
    .order('ordem', { ascending: true });

  if (error) throw error;

  // Se nao tem checklist, criar baseado no ramo
  if (!checklist || checklist.length === 0) {
    const ramo = (sinistro.apolices as any)?.ramo?.toLowerCase().replace(/\s+/g, '_') || 'auto';
    const checklistPadrao = CHECKLISTS_PADRAO[ramo] || CHECKLISTS_PADRAO['auto'];

    const novosItens = checklistPadrao.map((item, index) => ({
      sinistro_id: id,
      nome_documento: item.nome,
      obrigatorio: item.obrigatorio,
      recebido: false,
      aprovado: false,
      ordem: index + 1
    }));

    const { data: checklistCriado, error: errCreate } = await supabase
      .from('sinistro_checklists')
      .insert(novosItens)
      .select();

    if (errCreate) throw errCreate;

    const total = checklistCriado?.length || 0;
    const recebidos = 0;
    const aprovados = 0;

    return res.json({
      sinistro_id: id,
      ramo,
      itens: checklistCriado || [],
      progresso: {
        total,
        recebidos,
        aprovados,
        percentual_recebido: 0,
        percentual_aprovado: 0
      }
    });
  }

  // Calcular progresso
  const total = checklist.length;
  const recebidos = checklist.filter(i => i.recebido).length;
  const aprovados = checklist.filter(i => i.aprovado).length;

  res.json({
    sinistro_id: id,
    itens: checklist,
    progresso: {
      total,
      recebidos,
      aprovados,
      percentual_recebido: total > 0 ? Math.round((recebidos / total) * 100) : 0,
      percentual_aprovado: total > 0 ? Math.round((aprovados / total) * 100) : 0
    }
  });
}));

// Atualizar item do checklist
router.patch('/:id/checklist/:itemId', asyncHandler(async (req: Request, res: Response) => {
  const { id, itemId } = req.params;
  const { recebido, aprovado, documento_id, observacao, data_recebimento } = req.body;

  const updates: any = {};
  if (recebido !== undefined) updates.recebido = recebido;
  if (aprovado !== undefined) updates.aprovado = aprovado;
  if (documento_id !== undefined) updates.documento_id = documento_id;
  if (observacao !== undefined) updates.observacao = observacao;
  if (recebido && !data_recebimento) {
    updates.data_recebimento = new Date().toISOString();
  } else if (data_recebimento) {
    updates.data_recebimento = data_recebimento;
  }

  const { data, error } = await supabase
    .from('sinistro_checklists')
    .update(updates)
    .eq('id', itemId)
    .eq('sinistro_id', id)
    .select()
    .single();

  if (error) throw error;

  res.json(data);
}));

// Adicionar item customizado ao checklist
router.post('/:id/checklist', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nome_documento, obrigatorio = false } = req.body;

  if (!nome_documento) {
    return res.status(400).json({ error: 'Nome do documento e obrigatorio' });
  }

  // Buscar ordem do ultimo item
  const { data: ultimoItem } = await supabase
    .from('sinistro_checklists')
    .select('ordem')
    .eq('sinistro_id', id)
    .order('ordem', { ascending: false })
    .limit(1)
    .single();

  const novaOrdem = (ultimoItem?.ordem || 0) + 1;

  const { data, error } = await supabase
    .from('sinistro_checklists')
    .insert({
      sinistro_id: id,
      nome_documento,
      obrigatorio,
      recebido: false,
      aprovado: false,
      ordem: novaOrdem
    })
    .select()
    .single();

  if (error) throw error;

  res.status(201).json(data);
}));

// Remover item do checklist
router.delete('/:id/checklist/:itemId', asyncHandler(async (req: Request, res: Response) => {
  const { id, itemId } = req.params;

  const { error } = await supabase
    .from('sinistro_checklists')
    .delete()
    .eq('id', itemId)
    .eq('sinistro_id', id);

  if (error) throw error;

  res.status(204).send();
}));

// Vincular documento ao item do checklist
router.post('/:id/checklist/:itemId/vincular', asyncHandler(async (req: Request, res: Response) => {
  const { id, itemId } = req.params;
  const { documento_id } = req.body;

  if (!documento_id) {
    return res.status(400).json({ error: 'ID do documento e obrigatorio' });
  }

  // Verificar se documento existe
  const { data: documento } = await supabase
    .from('sinistro_documentos')
    .select('id, nome_arquivo')
    .eq('id', documento_id)
    .eq('sinistro_id', id)
    .single();

  if (!documento) {
    return res.status(404).json({ error: 'Documento nao encontrado' });
  }

  // Atualizar checklist
  const { data, error } = await supabase
    .from('sinistro_checklists')
    .update({
      documento_id,
      recebido: true,
      data_recebimento: new Date().toISOString()
    })
    .eq('id', itemId)
    .eq('sinistro_id', id)
    .select()
    .single();

  if (error) throw error;

  res.json({
    ...data,
    documento: documento
  });
}));

// Resetar checklist (recriar do padrao)
router.post('/:id/checklist/resetar', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Buscar ramo do sinistro
  const { data: sinistro } = await supabase
    .from('sinistros')
    .select('apolices(ramo)')
    .eq('id', id)
    .single();

  if (!sinistro) {
    return res.status(404).json({ error: 'Sinistro nao encontrado' });
  }

  // Deletar checklist existente
  await supabase
    .from('sinistro_checklists')
    .delete()
    .eq('sinistro_id', id);

  // Criar novo checklist
  const ramo = (sinistro.apolices as any)?.ramo?.toLowerCase().replace(/\s+/g, '_') || 'auto';
  const checklistPadrao = CHECKLISTS_PADRAO[ramo] || CHECKLISTS_PADRAO['auto'];

  const novosItens = checklistPadrao.map((item, index) => ({
    sinistro_id: id,
    nome_documento: item.nome,
    obrigatorio: item.obrigatorio,
    recebido: false,
    aprovado: false,
    ordem: index + 1
  }));

  const { data: checklistCriado, error } = await supabase
    .from('sinistro_checklists')
    .insert(novosItens)
    .select();

  if (error) throw error;

  res.json({
    message: 'Checklist resetado com sucesso',
    itens: checklistCriado
  });
}));

// ========== STATS ==========

router.get('/stats/summary', asyncHandler(async (req: Request, res: Response) => {
  const { count: total } = await supabase
    .from('sinistros')
    .select('*', { count: 'exact', head: true });

  const { count: abertos } = await supabase
    .from('sinistros')
    .select('*', { count: 'exact', head: true })
    .not('status', 'in', '(pago,recusado)');

  const { count: em_regulacao } = await supabase
    .from('sinistros')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'regulacao');

  const { count: pagos } = await supabase
    .from('sinistros')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pago');

  const { count: recusados } = await supabase
    .from('sinistros')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'recusado');

  // Valor total indenizado no mes
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const { data: indenizacoes } = await supabase
    .from('sinistros')
    .select('valor_indenizacao')
    .eq('status', 'pago')
    .gte('data_pagamento', inicioMes.toISOString());

  const valorIndenizadoMes = indenizacoes?.reduce((acc, s) => acc + (s.valor_indenizacao || 0), 0) || 0;

  res.json({
    total: total || 0,
    abertos: abertos || 0,
    em_regulacao: em_regulacao || 0,
    pagos: pagos || 0,
    recusados: recusados || 0,
    valorIndenizadoMes
  });
}));

export default router;
