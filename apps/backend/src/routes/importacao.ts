import express, { Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use .xlsx, .xls ou .csv'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

router.use(authenticate);

// Tipos de importação suportados
const TIPOS_IMPORTACAO = {
  clientes: {
    campos: ['nome', 'cpf_cnpj', 'email', 'telefone', 'tipo', 'cidade', 'estado', 'cep'],
    obrigatorios: ['nome', 'cpf_cnpj'],
    tabela: 'clientes'
  },
  apolices: {
    campos: ['numero_apolice', 'cliente_cpf_cnpj', 'seguradora', 'ramo', 'valor_premio', 'data_inicio', 'data_vencimento'],
    obrigatorios: ['numero_apolice', 'cliente_cpf_cnpj', 'seguradora'],
    tabela: 'apolices'
  },
  comissoes: {
    campos: ['numero_apolice', 'valor_bruto', 'valor_liquido', 'data_receita', 'status'],
    obrigatorios: ['numero_apolice', 'valor_bruto'],
    tabela: 'comissoes'
  }
};

// Upload arquivo Excel
router.post('/upload', upload.single('arquivo'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo não enviado' });
  }

  const { tipo } = req.body;
  if (!tipo || !TIPOS_IMPORTACAO[tipo as keyof typeof TIPOS_IMPORTACAO]) {
    return res.status(400).json({ error: 'Tipo de importação inválido' });
  }

  try {
    // Ler arquivo Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    if (data.length < 2) {
      return res.status(400).json({ error: 'Arquivo vazio ou sem dados' });
    }

    // Primeira linha são os headers
    const headers = data[0] as string[];
    const rows = data.slice(1);

    // Limpar arquivo temporário
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      arquivo: req.file.originalname,
      tipo,
      headers,
      totalLinhas: rows.length,
      previewLinhas: rows.slice(0, 10).map((row, index) => {
        const obj: Record<string, unknown> = { _rowIndex: index + 2 };
        headers.forEach((h, i) => {
          obj[h] = (row as unknown[])[i];
        });
        return obj;
      })
    });
  } catch (error) {
    logger.error('Erro ao processar arquivo:', error);
    // Limpar arquivo em caso de erro
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Erro ao processar arquivo' });
  }
}));

// Preview e validação dos dados
router.post('/preview', asyncHandler(async (req: Request, res: Response) => {
  const { tipo, dados, mapeamento } = req.body;

  if (!tipo || !dados || !mapeamento) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  const config = TIPOS_IMPORTACAO[tipo as keyof typeof TIPOS_IMPORTACAO];
  if (!config) {
    return res.status(400).json({ error: 'Tipo de importação inválido' });
  }

  const resultados = [];
  const erros: string[] = [];

  for (let i = 0; i < dados.length; i++) {
    const row = dados[i];
    const linha = i + 2; // +2 porque começa da linha 2 (header é linha 1)
    const registro: Record<string, unknown> = {};
    const errosLinha: string[] = [];

    // Mapear campos
    for (const [colunaOrigem, campoDestino] of Object.entries(mapeamento)) {
      if (campoDestino && row[colunaOrigem] !== undefined) {
        registro[campoDestino as string] = row[colunaOrigem];
      }
    }

    // Validar campos obrigatórios
    for (const campo of config.obrigatorios) {
      if (!registro[campo] || String(registro[campo]).trim() === '') {
        errosLinha.push(`Campo obrigatório "${campo}" está vazio`);
      }
    }

    // Validações específicas por tipo
    if (tipo === 'clientes') {
      // Validar CPF/CNPJ
      const cpfCnpj = String(registro.cpf_cnpj || '').replace(/\D/g, '');
      if (cpfCnpj && cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
        errosLinha.push('CPF/CNPJ inválido');
      }
      // Validar email
      const email = String(registro.email || '');
      if (email && !email.includes('@')) {
        errosLinha.push('Email inválido');
      }
    }

    if (tipo === 'apolices') {
      // Validar datas
      if (registro.data_inicio && isNaN(Date.parse(String(registro.data_inicio)))) {
        errosLinha.push('Data de início inválida');
      }
      if (registro.data_vencimento && isNaN(Date.parse(String(registro.data_vencimento)))) {
        errosLinha.push('Data de vencimento inválida');
      }
    }

    resultados.push({
      linha,
      dados: registro,
      valido: errosLinha.length === 0,
      erros: errosLinha
    });

    if (errosLinha.length > 0) {
      erros.push(`Linha ${linha}: ${errosLinha.join(', ')}`);
    }
  }

  const validos = resultados.filter(r => r.valido).length;
  const invalidos = resultados.filter(r => !r.valido).length;

  res.json({
    success: true,
    resumo: {
      total: resultados.length,
      validos,
      invalidos
    },
    resultados: resultados.slice(0, 100), // Limitar preview a 100 registros
    erros: erros.slice(0, 50) // Limitar erros exibidos
  });
}));

// Executar importação
router.post('/importar', asyncHandler(async (req: Request, res: Response) => {
  const { tipo, dados, mapeamento } = req.body;
  const userId = (req as any).user?.id;

  if (!tipo || !dados || !mapeamento) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  const config = TIPOS_IMPORTACAO[tipo as keyof typeof TIPOS_IMPORTACAO];
  if (!config) {
    return res.status(400).json({ error: 'Tipo de importação inválido' });
  }

  let importados = 0;
  let errosCount = 0;
  const errosDetalhes: string[] = [];

  for (let i = 0; i < dados.length; i++) {
    const row = dados[i];
    const linha = i + 2;

    try {
      const registro: Record<string, unknown> = {};

      // Mapear campos
      for (const [colunaOrigem, campoDestino] of Object.entries(mapeamento)) {
        if (campoDestino && row[colunaOrigem] !== undefined) {
          registro[campoDestino as string] = row[colunaOrigem];
        }
      }

      // Processar por tipo
      if (tipo === 'clientes') {
        // Normalizar CPF/CNPJ
        const cpfCnpj = String(registro.cpf_cnpj || '').replace(/\D/g, '');
        
        // Verificar se já existe
        const { data: existente } = await supabase
          .from('clientes')
          .select('id')
          .eq('cpf_cnpj', cpfCnpj)
          .single();

        if (existente) {
          // Atualizar existente
          await supabase
            .from('clientes')
            .update({
              nome: registro.nome,
              email: registro.email || null,
              telefone: registro.telefone || null,
              tipo: cpfCnpj.length === 14 ? 'PJ' : 'PF',
              endereco: registro.cidade ? {
                cidade: registro.cidade,
                estado: registro.estado || null,
                cep: registro.cep || null
              } : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existente.id);
        } else {
          // Inserir novo
          await supabase
            .from('clientes')
            .insert({
              usuario_id: userId,
              cpf_cnpj: cpfCnpj,
              nome: registro.nome,
              email: registro.email || null,
              telefone: registro.telefone || null,
              tipo: cpfCnpj.length === 14 ? 'PJ' : 'PF',
              endereco: registro.cidade ? {
                cidade: registro.cidade,
                estado: registro.estado || null,
                cep: registro.cep || null
              } : null,
              ativo: true
            });
        }
        importados++;
      }

      if (tipo === 'apolices') {
        // Buscar cliente pelo CPF/CNPJ
        const cpfCnpj = String(registro.cliente_cpf_cnpj || '').replace(/\D/g, '');
        const { data: cliente } = await supabase
          .from('clientes')
          .select('id')
          .eq('cpf_cnpj', cpfCnpj)
          .single();

        if (!cliente) {
          throw new Error(`Cliente não encontrado: ${cpfCnpj}`);
        }

        // Verificar se apólice já existe
        const { data: apoliceExistente } = await supabase
          .from('apolices')
          .select('id')
          .eq('numero_apolice', registro.numero_apolice)
          .single();

        if (apoliceExistente) {
          // Atualizar existente
          await supabase
            .from('apolices')
            .update({
              seguradora: registro.seguradora,
              ramo: registro.ramo || 'auto',
              valor_premio: parseFloat(String(registro.valor_premio || 0)),
              data_inicio: registro.data_inicio || null,
              data_vencimento: registro.data_vencimento || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', apoliceExistente.id);
        } else {
          // Inserir nova
          await supabase
            .from('apolices')
            .insert({
              cliente_id: cliente.id,
              numero_apolice: registro.numero_apolice,
              seguradora: registro.seguradora,
              ramo: registro.ramo || 'auto',
              valor_premio: parseFloat(String(registro.valor_premio || 0)),
              data_inicio: registro.data_inicio || new Date().toISOString(),
              data_vencimento: registro.data_vencimento || null,
              status: 'vigente'
            });
        }
        importados++;
      }

      if (tipo === 'comissoes') {
        // Buscar apólice pelo número
        const { data: apolice } = await supabase
          .from('apolices')
          .select('id')
          .eq('numero_apolice', registro.numero_apolice)
          .single();

        if (!apolice) {
          throw new Error(`Apólice não encontrada: ${registro.numero_apolice}`);
        }

        await supabase
          .from('comissoes')
          .insert({
            apolice_id: apolice.id,
            valor_bruto: parseFloat(String(registro.valor_bruto || 0)),
            valor_liquido: parseFloat(String(registro.valor_liquido || registro.valor_bruto || 0)),
            data_receita: registro.data_receita || null,
            status: registro.status || 'pendente'
          });

        importados++;
      }

    } catch (error) {
      errosCount++;
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      errosDetalhes.push(`Linha ${linha}: ${msg}`);
      logger.error(`Erro importação linha ${linha}:`, error);
    }
  }

  // Registrar importação no histórico
  await supabase
    .from('importacoes_historico')
    .insert({
      usuario_id: userId,
      tipo,
      arquivo_nome: req.body.nomeArquivo || 'importacao.xlsx',
      total_linhas: dados.length,
      importados,
      erros: errosCount,
      status: errosCount === 0 ? 'sucesso' : errosCount < dados.length ? 'parcial' : 'erro',
      detalhes_erros: errosDetalhes.slice(0, 100)
    });

  res.json({
    success: true,
    resultado: {
      total: dados.length,
      importados,
      erros: errosCount
    },
    detalhesErros: errosDetalhes.slice(0, 20)
  });
}));

// Histórico de importações
router.get('/historico', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const { data, error, count } = await supabase
    .from('importacoes_historico')
    .select('*', { count: 'exact' })
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (error) {
    logger.error('Erro ao buscar histórico:', error);
    return res.status(500).json({ error: 'Erro ao buscar histórico' });
  }

  res.json({
    data: data || [],
    total: count || 0,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil((count || 0) / Number(limit))
  });
}));

// Templates de exemplo para download
router.get('/template/:tipo', asyncHandler(async (req: Request, res: Response) => {
  const { tipo } = req.params;
  
  const templates: Record<string, string[][]> = {
    clientes: [
      ['Nome', 'CPF/CNPJ', 'Email', 'Telefone', 'Cidade', 'Estado', 'CEP'],
      ['João da Silva', '123.456.789-00', 'joao@email.com', '(11) 99999-1234', 'São Paulo', 'SP', '01310-100'],
      ['Empresa LTDA', '12.345.678/0001-00', 'contato@empresa.com', '(11) 3333-4444', 'São Paulo', 'SP', '01310-200']
    ],
    apolices: [
      ['Número Apólice', 'CPF/CNPJ Cliente', 'Seguradora', 'Ramo', 'Valor Prêmio', 'Data Início', 'Data Vencimento'],
      ['APO-001', '123.456.789-00', 'Porto Seguro', 'auto', '2500.00', '2024-01-01', '2025-01-01'],
      ['APO-002', '12.345.678/0001-00', 'Bradesco Seguros', 'empresarial', '15000.00', '2024-02-01', '2025-02-01']
    ],
    comissoes: [
      ['Número Apólice', 'Valor Bruto', 'Valor Líquido', 'Data Receita', 'Status'],
      ['APO-001', '375.00', '337.50', '2024-01-15', 'pendente'],
      ['APO-002', '2250.00', '2025.00', '2024-02-15', 'recebida']
    ]
  };

  const template = templates[tipo];
  if (!template) {
    return res.status(400).json({ error: 'Tipo de template inválido' });
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(template);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', `attachment; filename=template_${tipo}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
}));

export default router;
