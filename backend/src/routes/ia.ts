import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { supabase } from "../services/supabase";
import { logger } from "../utils/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Tipo de arquivo nao permitido. Use JPEG, PNG, WebP ou PDF.")
      );
    }
  },
});

router.use(authenticate);

// Inicializar Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ==========================================
// PROMPTS POR TIPO DE DOCUMENTO
// ==========================================

const PROMPTS: Record<string, string> = {
  // Apolice de Seguro
  apolice: `
Voce e um especialista em analise de documentos de seguros brasileiros. 
Analise a imagem da apolice de seguro e extraia os seguintes dados em formato JSON:

{
  "numero_apolice": "numero da apolice",
  "seguradora": "nome da seguradora",
  "ramo": "tipo do seguro (Auto, Vida, Residencial, Empresarial, Saude, etc)",
  "segurado": {
    "nome": "nome completo do segurado",
    "cpf_cnpj": "CPF ou CNPJ",
    "telefone": "telefone se disponivel",
    "email": "email se disponivel",
    "endereco": {
      "rua": "logradouro",
      "numero": "numero",
      "complemento": "complemento se houver",
      "bairro": "bairro",
      "cidade": "cidade",
      "estado": "UF",
      "cep": "CEP"
    }
  },
  "vigencia": {
    "inicio": "data de inicio (formato YYYY-MM-DD)",
    "fim": "data de termino (formato YYYY-MM-DD)"
  },
  "premio": {
    "total": "valor total do premio (numero)",
    "parcelas": "numero de parcelas",
    "valor_parcela": "valor de cada parcela (numero)"
  },
  "coberturas": [
    {
      "nome": "nome da cobertura",
      "limite": "valor limite (numero)",
      "franquia": "valor da franquia (numero)",
      "premio": "premio da cobertura (numero)"
    }
  ],
  "beneficiarios": [
    {
      "nome": "nome do beneficiario",
      "parentesco": "grau de parentesco",
      "percentual": "percentual (numero)"
    }
  ],
  "bem_segurado": {
    "descricao": "descricao do bem segurado",
    "placa": "placa do veiculo se aplicavel",
    "chassi": "chassi se aplicavel",
    "ano_fabricacao": "ano de fabricacao",
    "ano_modelo": "ano modelo",
    "cor": "cor",
    "valor_fipe": "valor FIPE se disponivel (numero)"
  },
  "observacoes": "outras informacoes relevantes encontradas"
}

IMPORTANTE:
- Extraia apenas informacoes claramente visiveis no documento
- Para campos nao encontrados, use null
- Para valores monetarios, use apenas numeros (sem R$, pontos ou virgulas)
- Para datas, use formato YYYY-MM-DD
- Retorne APENAS o JSON, sem explicacoes adicionais
`,

  // Boletim de Ocorrencia
  boletim_ocorrencia: `
Voce e um especialista em analise de documentos policiais brasileiros.
Analise a imagem do Boletim de Ocorrencia e extraia os seguintes dados em formato JSON:

{
  "numero_bo": "numero do boletim de ocorrencia",
  "delegacia": "nome da delegacia",
  "data_registro": "data do registro (YYYY-MM-DD)",
  "data_fato": "data do fato/ocorrencia (YYYY-MM-DD)",
  "hora_fato": "hora do fato (HH:MM)",
  "tipo_ocorrencia": "tipo da ocorrencia (Roubo, Furto, Acidente, Colisao, etc)",
  "local": {
    "logradouro": "endereco do fato",
    "bairro": "bairro",
    "cidade": "cidade",
    "estado": "UF"
  },
  "comunicante": {
    "nome": "nome do comunicante",
    "cpf": "CPF",
    "telefone": "telefone",
    "relacao": "relacao com o fato (vitima, testemunha, etc)"
  },
  "vitima": {
    "nome": "nome da vitima se diferente do comunicante",
    "cpf": "CPF"
  },
  "veiculo": {
    "placa": "placa do veiculo",
    "marca_modelo": "marca e modelo",
    "cor": "cor",
    "ano": "ano",
    "chassi": "chassi"
  },
  "descricao_fato": "resumo do que aconteceu",
  "objetos_subtraidos": ["lista de objetos roubados/furtados"],
  "testemunhas": [
    {
      "nome": "nome",
      "telefone": "telefone"
    }
  ],
  "observacoes": "outras informacoes relevantes"
}

IMPORTANTE:
- Extraia apenas informacoes claramente visiveis
- Para campos nao encontrados, use null
- Para datas, use formato YYYY-MM-DD
- Retorne APENAS o JSON
`,

  // CNH - Carteira Nacional de Habilitacao
  cnh: `
Voce e um especialista em analise de documentos de identificacao brasileiros.
Analise a imagem da CNH e extraia os seguintes dados em formato JSON:

{
  "numero_registro": "numero de registro da CNH",
  "numero_espelho": "numero do espelho",
  "cpf": "CPF do condutor",
  "nome": "nome completo",
  "data_nascimento": "data de nascimento (YYYY-MM-DD)",
  "filiacao": {
    "pai": "nome do pai",
    "mae": "nome da mae"
  },
  "nacionalidade": "nacionalidade",
  "local_nascimento": "cidade e UF de nascimento",
  "categoria": "categoria da habilitacao (A, B, AB, C, D, E)",
  "data_primeira_habilitacao": "data da primeira habilitacao (YYYY-MM-DD)",
  "data_validade": "data de validade (YYYY-MM-DD)",
  "data_emissao": "data de emissao (YYYY-MM-DD)",
  "local_emissao": "cidade e UF de emissao",
  "observacoes": "observacoes ou restricoes",
  "rg": "numero do RG se visivel"
}

IMPORTANTE:
- Extraia apenas informacoes claramente visiveis
- Para campos nao encontrados, use null
- Para datas, use formato YYYY-MM-DD
- Retorne APENAS o JSON
`,

  // Documento do Veiculo (CRLV)
  crlv: `
Voce e um especialista em analise de documentos de veiculos brasileiros.
Analise a imagem do CRLV (Certificado de Registro e Licenciamento de Veiculo) e extraia:

{
  "placa": "placa do veiculo",
  "renavam": "numero do RENAVAM",
  "chassi": "numero do chassi",
  "marca_modelo": "marca e modelo do veiculo",
  "ano_fabricacao": "ano de fabricacao",
  "ano_modelo": "ano do modelo",
  "cor": "cor predominante",
  "combustivel": "tipo de combustivel",
  "categoria": "categoria do veiculo",
  "especie": "especie (passageiro, carga, etc)",
  "tipo": "tipo do veiculo",
  "potencia": "potencia do motor",
  "capacidade": "capacidade de passageiros ou carga",
  "proprietario": {
    "nome": "nome do proprietario",
    "cpf_cnpj": "CPF ou CNPJ"
  },
  "municipio": "municipio de registro",
  "uf": "UF de registro",
  "data_emissao": "data de emissao do documento (YYYY-MM-DD)",
  "exercicio": "ano do exercicio/licenciamento",
  "observacoes": "restricoes ou observacoes"
}

IMPORTANTE:
- Extraia apenas informacoes claramente visiveis
- Para campos nao encontrados, use null
- Retorne APENAS o JSON
`,

  // RG - Registro Geral
  rg: `
Voce e um especialista em analise de documentos de identificacao brasileiros.
Analise a imagem do RG e extraia os seguintes dados em formato JSON:

{
  "numero_rg": "numero do RG",
  "orgao_emissor": "orgao emissor (SSP, DETRAN, etc)",
  "uf_emissor": "UF do orgao emissor",
  "data_emissao": "data de emissao (YYYY-MM-DD)",
  "nome": "nome completo",
  "data_nascimento": "data de nascimento (YYYY-MM-DD)",
  "naturalidade": "cidade de nascimento",
  "nacionalidade": "nacionalidade",
  "filiacao": {
    "pai": "nome do pai",
    "mae": "nome da mae"
  },
  "cpf": "CPF se presente no documento",
  "observacoes": "outras informacoes visiveis"
}

IMPORTANTE:
- Extraia apenas informacoes claramente visiveis
- Para campos nao encontrados, use null
- Para datas, use formato YYYY-MM-DD
- Retorne APENAS o JSON
`,

  // Nota Fiscal
  nota_fiscal: `
Voce e um especialista em analise de documentos fiscais brasileiros.
Analise a imagem da Nota Fiscal e extraia os seguintes dados em formato JSON:

{
  "numero_nota": "numero da nota fiscal",
  "serie": "serie da nota",
  "chave_acesso": "chave de acesso NFe (44 digitos)",
  "data_emissao": "data de emissao (YYYY-MM-DD)",
  "emitente": {
    "razao_social": "razao social do emitente",
    "cnpj": "CNPJ",
    "endereco": "endereco completo",
    "telefone": "telefone"
  },
  "destinatario": {
    "nome": "nome/razao social do destinatario",
    "cpf_cnpj": "CPF ou CNPJ",
    "endereco": "endereco completo"
  },
  "itens": [
    {
      "descricao": "descricao do produto/servico",
      "quantidade": "quantidade (numero)",
      "valor_unitario": "valor unitario (numero)",
      "valor_total": "valor total do item (numero)"
    }
  ],
  "valor_total": "valor total da nota (numero)",
  "impostos": {
    "icms": "valor ICMS (numero)",
    "ipi": "valor IPI (numero)",
    "total_impostos": "total de impostos (numero)"
  },
  "forma_pagamento": "forma de pagamento",
  "observacoes": "informacoes adicionais"
}

IMPORTANTE:
- Extraia apenas informacoes claramente visiveis
- Para valores monetarios, use apenas numeros
- Para campos nao encontrados, use null
- Retorne APENAS o JSON
`,

  // Comprovante de Endereco
  comprovante_endereco: `
Voce e um especialista em analise de documentos brasileiros.
Analise a imagem do comprovante de endereco e extraia:

{
  "tipo_documento": "tipo do comprovante (conta de luz, agua, telefone, etc)",
  "empresa": "nome da empresa emissora",
  "titular": {
    "nome": "nome do titular",
    "cpf_cnpj": "CPF ou CNPJ se visivel"
  },
  "endereco": {
    "logradouro": "rua/avenida com numero",
    "complemento": "complemento se houver",
    "bairro": "bairro",
    "cidade": "cidade",
    "estado": "UF",
    "cep": "CEP"
  },
  "data_referencia": "mes/ano de referencia (YYYY-MM)",
  "data_vencimento": "data de vencimento (YYYY-MM-DD)",
  "valor": "valor da conta (numero)",
  "codigo_cliente": "codigo do cliente/unidade consumidora",
  "observacoes": "outras informacoes relevantes"
}

IMPORTANTE:
- Extraia apenas informacoes claramente visiveis
- Para campos nao encontrados, use null
- Retorne APENAS o JSON
`,

  // Laudo/Orcamento de Reparo
  laudo_orcamento: `
Voce e um especialista em analise de documentos de oficinas e seguradoras.
Analise a imagem do laudo ou orcamento de reparo e extraia:

{
  "numero_documento": "numero do laudo/orcamento",
  "data": "data do documento (YYYY-MM-DD)",
  "oficina": {
    "nome": "nome da oficina/empresa",
    "cnpj": "CNPJ",
    "telefone": "telefone",
    "endereco": "endereco"
  },
  "veiculo": {
    "placa": "placa",
    "marca_modelo": "marca e modelo",
    "ano": "ano",
    "cor": "cor",
    "chassi": "chassi"
  },
  "proprietario": {
    "nome": "nome do proprietario",
    "cpf_cnpj": "CPF ou CNPJ"
  },
  "tipo_servico": "tipo de servico (funilaria, mecanica, etc)",
  "danos_descritos": "descricao dos danos",
  "pecas": [
    {
      "descricao": "descricao da peca",
      "quantidade": "quantidade (numero)",
      "valor_unitario": "valor unitario (numero)",
      "valor_total": "valor total (numero)"
    }
  ],
  "mao_de_obra": {
    "descricao": "descricao do servico",
    "horas": "horas trabalhadas (numero)",
    "valor": "valor da mao de obra (numero)"
  },
  "valor_total_pecas": "total das pecas (numero)",
  "valor_total_servicos": "total dos servicos (numero)",
  "valor_total": "valor total do orcamento (numero)",
  "prazo_execucao": "prazo estimado",
  "observacoes": "observacoes adicionais"
}

IMPORTANTE:
- Extraia apenas informacoes claramente visiveis
- Para valores monetarios, use apenas numeros
- Para campos nao encontrados, use null
- Retorne APENAS o JSON
`,

  // Identificar Tipo de Documento Automaticamente
  identificar: `
Voce e um especialista em analise de documentos brasileiros.
Analise a imagem e identifique qual tipo de documento e.

Retorne um JSON com:
{
  "tipo_documento": "tipo identificado",
  "confianca": "nivel de confianca (alta, media, baixa)",
  "descricao": "breve descricao do que foi identificado"
}

Tipos possiveis:
- apolice (apolice de seguro)
- boletim_ocorrencia (BO policial)
- cnh (carteira de habilitacao)
- crlv (documento do veiculo)
- rg (documento de identidade)
- nota_fiscal (NF ou NFe)
- comprovante_endereco (conta de luz, agua, etc)
- laudo_orcamento (laudo ou orcamento de reparo)
- contrato (contrato de qualquer tipo)
- recibo (recibo de pagamento)
- outro (documento nao identificado)

Retorne APENAS o JSON.
`,
};

// Dados mock para desenvolvimento (sem API key)
const MOCK_DATA: Record<string, any> = {
  apolice: {
    numero_apolice: "APL-2026-123456",
    seguradora: "Seguradora Exemplo S.A.",
    ramo: "Auto",
    segurado: {
      nome: "Joao da Silva",
      cpf_cnpj: "123.456.789-00",
      telefone: "(11) 99999-1234",
      email: "joao@email.com",
      endereco: {
        rua: "Rua das Flores",
        numero: "123",
        complemento: "Apto 45",
        bairro: "Centro",
        cidade: "Sao Paulo",
        estado: "SP",
        cep: "01234-567",
      },
    },
    vigencia: {
      inicio: "2026-01-01",
      fim: "2027-01-01",
    },
    premio: {
      total: 2500.0,
      parcelas: 12,
      valor_parcela: 208.33,
    },
    coberturas: [
      { nome: "Colisao", limite: 50000, franquia: 2500, premio: 1200 },
      { nome: "Roubo/Furto", limite: 50000, franquia: 0, premio: 800 },
      { nome: "Danos a Terceiros", limite: 100000, franquia: 0, premio: 500 },
    ],
    bem_segurado: {
      descricao: "Honda Civic EXL 2024",
      placa: "ABC-1234",
      chassi: "9BWZZZ377VT004251",
      ano_fabricacao: 2024,
      ano_modelo: 2024,
      cor: "Prata",
      valor_fipe: 148000,
    },
  },
  boletim_ocorrencia: {
    numero_bo: "BO-2026/001234",
    delegacia: "1 DP - Centro",
    data_registro: "2026-01-05",
    data_fato: "2026-01-05",
    hora_fato: "14:30",
    tipo_ocorrencia: "Colisao de Transito",
    local: {
      logradouro: "Av. Paulista, 1000",
      bairro: "Bela Vista",
      cidade: "Sao Paulo",
      estado: "SP",
    },
    comunicante: {
      nome: "Joao da Silva",
      cpf: "123.456.789-00",
      telefone: "(11) 99999-1234",
      relacao: "Condutor do veiculo",
    },
    veiculo: {
      placa: "ABC-1234",
      marca_modelo: "Honda Civic",
      cor: "Prata",
      ano: "2024",
    },
    descricao_fato: "Colisao traseira em semaforo",
  },
  cnh: {
    numero_registro: "01234567890",
    cpf: "123.456.789-00",
    nome: "JOAO DA SILVA",
    data_nascimento: "1985-05-15",
    categoria: "AB",
    data_validade: "2030-05-15",
    data_primeira_habilitacao: "2005-03-20",
  },
  crlv: {
    placa: "ABC-1234",
    renavam: "12345678901",
    chassi: "9BWZZZ377VT004251",
    marca_modelo: "HONDA/CIVIC EXL",
    ano_fabricacao: 2024,
    ano_modelo: 2024,
    cor: "PRATA",
    combustivel: "ALCOOL/GASOLINA",
    proprietario: {
      nome: "JOAO DA SILVA",
      cpf_cnpj: "123.456.789-00",
    },
    municipio: "SAO PAULO",
    uf: "SP",
  },
  identificar: {
    tipo_documento: "apolice",
    confianca: "alta",
    descricao: "Documento identificado como apolice de seguro",
  },
};

// Converter arquivo para base64
function fileToBase64(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString("base64");
}

// Funcao generica de extracao com IA
async function extrairComIA(
  filePath: string,
  mimeType: string,
  tipoDocumento: string
): Promise<{ dados: any; tokens: number }> {
  try {
    const prompt = PROMPTS[tipoDocumento];
    if (!prompt) {
      throw new Error(`Tipo de documento nao suportado: ${tipoDocumento}`);
    }

    const base64Image = fileToBase64(filePath);

    // Obter modelo (usando gemini-1.5-flash)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Preparar parts
    const parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      },
    ];

    // Gerar conteudo
    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    // Parsear JSON
    let dadosExtraidos;
    try {
      const jsonString = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      dadosExtraidos = JSON.parse(jsonString);
    } catch (parseError) {
      logger.error("Erro ao parsear resposta da IA:", parseError);
      dadosExtraidos = { raw_response: text, parse_error: true };
    }

    return {
      dados: dadosExtraidos,
      tokens: 0,
    };
  } catch (error) {
    logger.error("Erro na chamada ao Gemini:", error);
    throw error;
  }
}

// ==========================================
// ENDPOINTS
// ==========================================

// Extrair documento generico (auto-detecta tipo ou usa tipo informado)
router.post(
  "/extrair",
  upload.single("documento"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    let tipoDocumento = (req.body.tipo || "identificar").toLowerCase();
    const userId = (req as any).user?.id;

    try {
      // Verificar se API key esta configurada
      if (!process.env.GEMINI_API_KEY) {
        fs.unlinkSync(filePath);

        const mockData = MOCK_DATA[tipoDocumento] || MOCK_DATA["identificar"];
        return res.json({
          success: true,
          warning:
            "GEMINI_API_KEY nao configurada. Retornando dados de exemplo.",
          tipo_documento: tipoDocumento,
          dados: mockData,
          arquivo: {
            nome: req.file.originalname,
            tamanho: req.file.size,
            tipo: mimeType,
          },
        });
      }

      logger.info("Iniciando extracao com IA", {
        arquivo: req.file.originalname,
        tipo: tipoDocumento,
      });

      // Se tipo nao foi informado, primeiro identificar
      if (tipoDocumento === "identificar") {
        const identificacao = await extrairComIA(
          filePath,
          mimeType,
          "identificar"
        );

        if (
          identificacao.dados.tipo_documento &&
          identificacao.dados.tipo_documento !== "outro"
        ) {
          tipoDocumento = identificacao.dados.tipo_documento;
          logger.info(`Documento identificado como: ${tipoDocumento}`);
        }
      }

      // Extrair dados do tipo identificado
      let resultado;
      if (tipoDocumento !== "identificar" && PROMPTS[tipoDocumento]) {
        resultado = await extrairComIA(filePath, mimeType, tipoDocumento);
      } else {
        resultado = { dados: { tipo: "nao_identificado" }, tokens: 0 };
      }

      // Limpar arquivo
      fs.unlinkSync(filePath);

      // Salvar log
      await supabase.from("ia_extracoes").insert({
        tipo: tipoDocumento,
        arquivo_nome: req.file.originalname,
        arquivo_tamanho: req.file.size,
        dados_extraidos: resultado.dados,
        modelo: "gemini-1.5-flash",
        tokens_usados: resultado.tokens,
        usuario_id: userId,
      });

      logger.info("Extracao concluida", {
        arquivo: req.file.originalname,
        tipo: tipoDocumento,
        tokens: resultado.tokens,
      });

      res.json({
        success: true,
        tipo_documento: tipoDocumento,
        dados: resultado.dados,
        arquivo: {
          nome: req.file.originalname,
          tamanho: req.file.size,
          tipo: mimeType,
        },
        tokens_usados: resultado.tokens,
      });
    } catch (error: any) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      logger.error("Erro na extracao com IA:", error);

      if (error.code === "insufficient_quota") {
        return res.status(402).json({
          error: "Cota da API Gemini excedida.",
        });
      }

      if (error.code === "invalid_api_key") {
        return res.status(401).json({
          error: "API Key do Gemini invalida.",
        });
      }

      return res.status(500).json({
        error: "Erro ao processar documento com IA",
        detalhes: error.message,
      });
    }
  })
);

// Extrair apolice (endpoint especifico mantido por compatibilidade)
router.post(
  "/extrair-apolice",
  upload.single("documento"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const userId = (req as any).user?.id;

    try {
      if (!process.env.GEMINI_API_KEY) {
        fs.unlinkSync(filePath);
        return res.json({
          success: true,
          warning:
            "GEMINI_API_KEY nao configurada. Retornando dados de exemplo.",
          dados: MOCK_DATA["apolice"],
          arquivo: {
            nome: req.file.originalname,
            tamanho: req.file.size,
            tipo: mimeType,
          },
        });
      }

      const resultado = await extrairComIA(filePath, mimeType, "apolice");
      fs.unlinkSync(filePath);

      await supabase.from("ia_extracoes").insert({
        tipo: "apolice",
        arquivo_nome: req.file.originalname,
        arquivo_tamanho: req.file.size,
        dados_extraidos: resultado.dados,
        modelo: "gemini-1.5-flash",
        tokens_usados: resultado.tokens,
        usuario_id: userId,
      });

      res.json({
        success: true,
        dados: resultado.dados,
        arquivo: {
          nome: req.file.originalname,
          tamanho: req.file.size,
          tipo: mimeType,
        },
        tokens_usados: resultado.tokens,
      });
    } catch (error: any) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      logger.error("Erro na extracao:", error);
      return res.status(500).json({
        error: "Erro ao processar documento",
        detalhes: error.message,
      });
    }
  })
);

// Extrair Boletim de Ocorrencia
router.post(
  "/extrair-bo",
  upload.single("documento"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const userId = (req as any).user?.id;

    try {
      if (!process.env.GEMINI_API_KEY) {
        fs.unlinkSync(filePath);
        return res.json({
          success: true,
          warning: "GEMINI_API_KEY nao configurada.",
          dados: MOCK_DATA["boletim_ocorrencia"],
          arquivo: {
            nome: req.file.originalname,
            tamanho: req.file.size,
            tipo: mimeType,
          },
        });
      }

      const resultado = await extrairComIA(
        filePath,
        mimeType,
        "boletim_ocorrencia"
      );
      fs.unlinkSync(filePath);

      await supabase.from("ia_extracoes").insert({
        tipo: "boletim_ocorrencia",
        arquivo_nome: req.file.originalname,
        arquivo_tamanho: req.file.size,
        dados_extraidos: resultado.dados,
        modelo: "gemini-1.5-flash",
        tokens_usados: resultado.tokens,
        usuario_id: userId,
      });

      res.json({
        success: true,
        dados: resultado.dados,
        arquivo: {
          nome: req.file.originalname,
          tamanho: req.file.size,
          tipo: mimeType,
        },
        tokens_usados: resultado.tokens,
      });
    } catch (error: any) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({
        error: "Erro ao processar documento",
        detalhes: error.message,
      });
    }
  })
);

// Extrair CNH
router.post(
  "/extrair-cnh",
  upload.single("documento"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const userId = (req as any).user?.id;

    try {
      if (!process.env.GEMINI_API_KEY) {
        fs.unlinkSync(filePath);
        return res.json({
          success: true,
          warning: "GEMINI_API_KEY nao configurada.",
          dados: MOCK_DATA["cnh"],
          arquivo: {
            nome: req.file.originalname,
            tamanho: req.file.size,
            tipo: mimeType,
          },
        });
      }

      const resultado = await extrairComIA(filePath, mimeType, "cnh");
      fs.unlinkSync(filePath);

      await supabase.from("ia_extracoes").insert({
        tipo: "cnh",
        arquivo_nome: req.file.originalname,
        arquivo_tamanho: req.file.size,
        dados_extraidos: resultado.dados,
        modelo: "gemini-1.5-flash",
        tokens_usados: resultado.tokens,
        usuario_id: userId,
      });

      res.json({
        success: true,
        dados: resultado.dados,
        arquivo: {
          nome: req.file.originalname,
          tamanho: req.file.size,
          tipo: mimeType,
        },
        tokens_usados: resultado.tokens,
      });
    } catch (error: any) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({
        error: "Erro ao processar documento",
        detalhes: error.message,
      });
    }
  })
);

// Extrair CRLV (documento do veiculo)
router.post(
  "/extrair-crlv",
  upload.single("documento"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const userId = (req as any).user?.id;

    try {
      if (!process.env.GEMINI_API_KEY) {
        fs.unlinkSync(filePath);
        return res.json({
          success: true,
          warning: "GEMINI_API_KEY nao configurada.",
          dados: MOCK_DATA["crlv"],
          arquivo: {
            nome: req.file.originalname,
            tamanho: req.file.size,
            tipo: mimeType,
          },
        });
      }

      const resultado = await extrairComIA(filePath, mimeType, "crlv");
      fs.unlinkSync(filePath);

      await supabase.from("ia_extracoes").insert({
        tipo: "crlv",
        arquivo_nome: req.file.originalname,
        arquivo_tamanho: req.file.size,
        dados_extraidos: resultado.dados,
        modelo: "gemini-1.5-flash",
        tokens_usados: resultado.tokens,
        usuario_id: userId,
      });

      res.json({
        success: true,
        dados: resultado.dados,
        arquivo: {
          nome: req.file.originalname,
          tamanho: req.file.size,
          tipo: mimeType,
        },
        tokens_usados: resultado.tokens,
      });
    } catch (error: any) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({
        error: "Erro ao processar documento",
        detalhes: error.message,
      });
    }
  })
);

// Extrair Laudo/Orcamento
router.post(
  "/extrair-laudo",
  upload.single("documento"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const userId = (req as any).user?.id;

    try {
      if (!process.env.GEMINI_API_KEY) {
        fs.unlinkSync(filePath);
        return res.json({
          success: true,
          warning: "GEMINI_API_KEY nao configurada.",
          dados: { tipo: "laudo_mock" },
          arquivo: {
            nome: req.file.originalname,
            tamanho: req.file.size,
            tipo: mimeType,
          },
        });
      }

      const resultado = await extrairComIA(
        filePath,
        mimeType,
        "laudo_orcamento"
      );
      fs.unlinkSync(filePath);

      await supabase.from("ia_extracoes").insert({
        tipo: "laudo_orcamento",
        arquivo_nome: req.file.originalname,
        arquivo_tamanho: req.file.size,
        dados_extraidos: resultado.dados,
        modelo: "gemini-1.5-flash",
        tokens_usados: resultado.tokens,
        usuario_id: userId,
      });

      res.json({
        success: true,
        dados: resultado.dados,
        arquivo: {
          nome: req.file.originalname,
          tamanho: req.file.size,
          tipo: mimeType,
        },
        tokens_usados: resultado.tokens,
      });
    } catch (error: any) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({
        error: "Erro ao processar documento",
        detalhes: error.message,
      });
    }
  })
);

// Identificar tipo de documento
router.post(
  "/identificar",
  upload.single("documento"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;

    try {
      if (!process.env.GEMINI_API_KEY) {
        fs.unlinkSync(filePath);
        return res.json({
          success: true,
          warning: "GEMINI_API_KEY nao configurada.",
          dados: MOCK_DATA["identificar"],
          arquivo: {
            nome: req.file.originalname,
            tamanho: req.file.size,
            tipo: mimeType,
          },
        });
      }

      const resultado = await extrairComIA(filePath, mimeType, "identificar");
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        dados: resultado.dados,
        arquivo: {
          nome: req.file.originalname,
          tamanho: req.file.size,
          tipo: mimeType,
        },
        tokens_usados: resultado.tokens,
      });
    } catch (error: any) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({
        error: "Erro ao identificar documento",
        detalhes: error.message,
      });
    }
  })
);

// Confirmar e salvar apolice extraida
router.post(
  "/confirmar-apolice",
  asyncHandler(async (req: Request, res: Response) => {
    const { dados, cliente_id } = req.body;
    const userId = (req as any).user?.id;

    if (!dados) {
      return res
        .status(400)
        .json({ error: "Dados da apolice sao obrigatorios" });
    }

    try {
      let clienteId = cliente_id;

      // Se nao foi fornecido cliente_id, tentar encontrar ou criar cliente
      if (!clienteId && dados.segurado) {
        const cpfCnpj = dados.segurado.cpf_cnpj?.replace(/\D/g, "");

        if (cpfCnpj) {
          const { data: clienteExistente } = await supabase
            .from("clientes")
            .select("id")
            .eq("cpf_cnpj", cpfCnpj)
            .single();

          if (clienteExistente) {
            clienteId = clienteExistente.id;
          } else {
            const { data: novoCliente, error: erroCliente } = await supabase
              .from("clientes")
              .insert({
                tipo: cpfCnpj.length === 11 ? "PF" : "PJ",
                cpf_cnpj: cpfCnpj,
                nome: dados.segurado.nome,
                email: dados.segurado.email,
                telefone: dados.segurado.telefone,
                endereco: dados.segurado.endereco,
                usuario_id: userId,
              })
              .select()
              .single();

            if (!erroCliente && novoCliente) {
              clienteId = novoCliente.id;
            }
          }
        }
      }

      // Criar apolice
      const { data: apolice, error: erroApolice } = await supabase
        .from("apolices")
        .insert({
          cliente_id: clienteId,
          numero_apolice: dados.numero_apolice,
          seguradora: dados.seguradora,
          ramo: dados.ramo,
          data_inicio: dados.vigencia?.inicio,
          data_vencimento: dados.vigencia?.fim,
          valor_premio: dados.premio?.total,
          parcelas: dados.premio?.parcelas,
          status: "ativa",
          dados_json: {
            bem_segurado: dados.bem_segurado,
            beneficiarios: dados.beneficiarios,
            observacoes: dados.observacoes,
          },
          usuario_id: userId,
        })
        .select()
        .single();

      if (erroApolice) throw erroApolice;

      // Criar coberturas
      if (dados.coberturas && Array.isArray(dados.coberturas) && apolice) {
        const coberturas = dados.coberturas.map((cob: any) => ({
          apolice_id: apolice.id,
          nome: cob.nome,
          limite_cobertura: cob.limite,
          franquia: cob.franquia,
          premio_cobertura: cob.premio,
        }));

        await supabase.from("coberturas").insert(coberturas);
      }

      // Criar tarefa de renovacao
      if (apolice && dados.vigencia?.fim) {
        const dataLembrete = new Date(dados.vigencia.fim);
        dataLembrete.setDate(dataLembrete.getDate() - 30);

        await supabase.from("tarefas").insert({
          usuario_id: userId,
          cliente_id: clienteId,
          apolice_id: apolice.id,
          tipo: "renovacao",
          descricao: `Renovacao da apolice ${dados.numero_apolice} - ${dados.seguradora}`,
          data_vencimento: dataLembrete.toISOString().split("T")[0],
          prioridade: "alta",
          concluida: false,
        });
      }

      logger.info("Apolice confirmada", { apolice_id: apolice?.id });

      res.json({
        success: true,
        apolice,
        cliente_id: clienteId,
        message: "Apolice salva com sucesso",
      });
    } catch (error: any) {
      logger.error("Erro ao confirmar apolice:", error);
      res
        .status(500)
        .json({ error: "Erro ao salvar apolice", detalhes: error.message });
    }
  })
);

// Listar tipos de documento suportados
router.get("/tipos-documento", (req: Request, res: Response) => {
  const tipos = Object.keys(PROMPTS)
    .filter((t) => t !== "identificar")
    .map((tipo) => ({
      codigo: tipo,
      nome: tipo.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      endpoint: `/api/ia/extrair-${tipo.replace(/_/g, "-")}`,
    }));

  res.json({
    tipos,
    total: tipos.length,
    endpoint_generico: "/api/ia/extrair",
  });
});

// Historico de extracoes
router.get(
  "/extracoes",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { page = 1, limit = 20, tipo } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from("ia_extracoes")
      .select("*", { count: "exact" })
      .eq("usuario_id", userId)
      .order("created_at", { ascending: false });

    if (tipo) {
      query = query.eq("tipo", tipo);
    }

    const { data, error, count } = await query.range(
      offset,
      offset + Number(limit) - 1
    );

    if (error) throw error;

    res.json({
      data: data || [],
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
    });
  })
);

// Estatisticas de uso da IA
router.get(
  "/estatisticas",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    const { count: totalExtracoes } = await supabase
      .from("ia_extracoes")
      .select("*", { count: "exact", head: true })
      .eq("usuario_id", userId);

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const { count: extracoesMes } = await supabase
      .from("ia_extracoes")
      .select("*", { count: "exact", head: true })
      .eq("usuario_id", userId)
      .gte("created_at", inicioMes.toISOString());

    const { data: tokensData } = await supabase
      .from("ia_extracoes")
      .select("tokens_usados")
      .eq("usuario_id", userId);

    const totalTokens =
      tokensData?.reduce((acc, item) => acc + (item.tokens_usados || 0), 0) ||
      0;

    // Extracoes por tipo
    const { data: porTipo } = await supabase
      .from("ia_extracoes")
      .select("tipo")
      .eq("usuario_id", userId);

    const contagemPorTipo: Record<string, number> = {};
    if (porTipo) {
      for (const item of porTipo) {
        contagemPorTipo[item.tipo] = (contagemPorTipo[item.tipo] || 0) + 1;
      }
    }

    res.json({
      totalExtracoes: totalExtracoes || 0,
      extracoesMes: extracoesMes || 0,
      totalTokens,
      custoEstimado: (totalTokens / 1000) * 0.03,
      porTipo: contagemPorTipo,
    });
  })
);

export default router;
