"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const XLSX = __importStar(require("xlsx"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const supabase_1 = require("../services/supabase");
const logger_1 = require("../utils/logger");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
// Configurar multer para upload de arquivos
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.xlsx', '.xls', '.csv'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error('Tipo de arquivo não permitido. Use .xlsx, .xls ou .csv'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});
router.use(auth_1.authenticate);
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
router.post('/upload', upload.single('arquivo'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Arquivo não enviado' });
    }
    const { tipo } = req.body;
    if (!tipo || !TIPOS_IMPORTACAO[tipo]) {
        return res.status(400).json({ error: 'Tipo de importação inválido' });
    }
    try {
        // Ler arquivo Excel
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (data.length < 2) {
            return res.status(400).json({ error: 'Arquivo vazio ou sem dados' });
        }
        // Primeira linha são os headers
        const headers = data[0];
        const rows = data.slice(1);
        // Limpar arquivo temporário
        fs_1.default.unlinkSync(req.file.path);
        res.json({
            success: true,
            arquivo: req.file.originalname,
            tipo,
            headers,
            totalLinhas: rows.length,
            previewLinhas: rows.slice(0, 10).map((row, index) => {
                const obj = { _rowIndex: index + 2 };
                headers.forEach((h, i) => {
                    obj[h] = row[i];
                });
                return obj;
            })
        });
    }
    catch (error) {
        logger_1.logger.error('Erro ao processar arquivo:', error);
        // Limpar arquivo em caso de erro
        if (req.file?.path && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Erro ao processar arquivo' });
    }
}));
// Preview e validação dos dados
router.post('/preview', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { tipo, dados, mapeamento } = req.body;
    if (!tipo || !dados || !mapeamento) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }
    const config = TIPOS_IMPORTACAO[tipo];
    if (!config) {
        return res.status(400).json({ error: 'Tipo de importação inválido' });
    }
    const resultados = [];
    const erros = [];
    for (let i = 0; i < dados.length; i++) {
        const row = dados[i];
        const linha = i + 2; // +2 porque começa da linha 2 (header é linha 1)
        const registro = {};
        const errosLinha = [];
        // Mapear campos
        for (const [colunaOrigem, campoDestino] of Object.entries(mapeamento)) {
            if (campoDestino && row[colunaOrigem] !== undefined) {
                registro[campoDestino] = row[colunaOrigem];
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
router.post('/importar', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { tipo, dados, mapeamento } = req.body;
    const userId = req.user?.id;
    if (!tipo || !dados || !mapeamento) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }
    const config = TIPOS_IMPORTACAO[tipo];
    if (!config) {
        return res.status(400).json({ error: 'Tipo de importação inválido' });
    }
    let importados = 0;
    let errosCount = 0;
    const errosDetalhes = [];
    for (let i = 0; i < dados.length; i++) {
        const row = dados[i];
        const linha = i + 2;
        try {
            const registro = {};
            // Mapear campos
            for (const [colunaOrigem, campoDestino] of Object.entries(mapeamento)) {
                if (campoDestino && row[colunaOrigem] !== undefined) {
                    registro[campoDestino] = row[colunaOrigem];
                }
            }
            // Processar por tipo
            if (tipo === 'clientes') {
                // Normalizar CPF/CNPJ
                const cpfCnpj = String(registro.cpf_cnpj || '').replace(/\D/g, '');
                // Verificar se já existe
                const { data: existente } = await supabase_1.supabase
                    .from('clientes')
                    .select('id')
                    .eq('cpf_cnpj', cpfCnpj)
                    .single();
                if (existente) {
                    // Atualizar existente
                    await supabase_1.supabase
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
                }
                else {
                    // Inserir novo
                    await supabase_1.supabase
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
                const { data: cliente } = await supabase_1.supabase
                    .from('clientes')
                    .select('id')
                    .eq('cpf_cnpj', cpfCnpj)
                    .single();
                if (!cliente) {
                    throw new Error(`Cliente não encontrado: ${cpfCnpj}`);
                }
                // Verificar se apólice já existe
                const { data: apoliceExistente } = await supabase_1.supabase
                    .from('apolices')
                    .select('id')
                    .eq('numero_apolice', registro.numero_apolice)
                    .single();
                if (apoliceExistente) {
                    // Atualizar existente
                    await supabase_1.supabase
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
                }
                else {
                    // Inserir nova
                    await supabase_1.supabase
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
                const { data: apolice } = await supabase_1.supabase
                    .from('apolices')
                    .select('id')
                    .eq('numero_apolice', registro.numero_apolice)
                    .single();
                if (!apolice) {
                    throw new Error(`Apólice não encontrada: ${registro.numero_apolice}`);
                }
                await supabase_1.supabase
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
        }
        catch (error) {
            errosCount++;
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            errosDetalhes.push(`Linha ${linha}: ${msg}`);
            logger_1.logger.error(`Erro importação linha ${linha}:`, error);
        }
    }
    // Registrar importação no histórico
    await supabase_1.supabase
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
router.get('/historico', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const { data, error, count } = await supabase_1.supabase
        .from('importacoes_historico')
        .select('*', { count: 'exact' })
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);
    if (error) {
        logger_1.logger.error('Erro ao buscar histórico:', error);
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
router.get('/template/:tipo', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { tipo } = req.params;
    const templates = {
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
exports.default = router;
