# 🛠️ GUIA DE IMPLEMENTAÇÃO - Corretora de Seguros SaaS

**Data:** Janeiro 2026  
**Status:** Guia Técnico para Desenvolvimento

---

## 📋 SETUP INICIAL RECOMENDADO

### 1. Criar Repositório e Estrutura Base

```bash
# Criar mono-repositório
mkdir corretora-app
cd corretora-app

# Frontend
npx create-vite@latest frontend --template react-ts
cd frontend && npm install

# Backend
mkdir backend && cd backend && npm init -y
npm install express typescript ts-node @types/express

# Voltar para raiz
cd ..
```

### 2. Estrutura de Pastas Recomendada

```
corretora-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Cliente/
│   │   │   ├── Apolice/
│   │   │   ├── Sinistro/
│   │   │   ├── WhatsApp/
│   │   │   └── Common/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── store/ (Zustand)
│   │   ├── services/ (API calls)
│   │   ├── utils/
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── cliente.ts
│   │   │   ├── apolice.ts
│   │   │   ├── sinistro.ts
│   │   │   ├── whatsapp.ts
│   │   │   ├── ia.ts
│   │   │   └── financeiro.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validation.ts
│   │   ├── services/
│   │   │   ├── supabase.ts
│   │   │   ├── evolution.ts
│   │   │   ├── openai.ts
│   │   │   └── calendar.ts
│   │   ├── jobs/
│   │   │   ├── renovacoes.ts
│   │   │   ├── alertas.ts
│   │   │   └── sincronizacao.ts
│   │   ├── types/
│   │   ├── utils/
│   │   └── server.ts
│   └── package.json
│
└── docs/
    ├── database-schema.sql
    ├── api-endpoints.md
    └── guia-integracao.md
```

---

## 🗄️ SETUP DO BANCO DE DADOS (Supabase)

### 1. Criar Projeto no Supabase

```
1. Ir para https://supabase.com
2. Criar novo projeto
3. Aguardar setup
4. Copiar credenciais (URL, KEY)
```

### 2. Schema SQL Principal

```sql
-- Tabela de Usuários (gerenciada pelo Supabase Auth)

-- Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  tipo VARCHAR(2) CHECK (tipo IN ('PF', 'PJ')),
  cpf_cnpj VARCHAR(20) UNIQUE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  data_nascimento DATE,
  endereco JSONB, -- {rua, numero, cidade, estado, cep}
  documentos_json JSONB,
  notas TEXT,
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW()
);

-- Apólices
CREATE TABLE apolices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  ramo VARCHAR(50), -- auto, residencial, vida, saude, consorcio, financiamento
  seguradora VARCHAR(255),
  numero_apolice VARCHAR(50) UNIQUE NOT NULL,
  valor_premio DECIMAL(10, 2),
  data_inicio DATE,
  data_vencimento DATE,
  data_renovacao DATE,
  status VARCHAR(20) DEFAULT 'vigente', -- vigente, vencida, cancelada
  dados_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Coberturas
CREATE TABLE coberturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apolice_id UUID REFERENCES apolices(id) ON DELETE CASCADE,
  nome VARCHAR(255),
  limite_cobertura DECIMAL(12, 2),
  franquia DECIMAL(10, 2),
  premio_cobertura DECIMAL(10, 2),
  data_inicio DATE,
  data_fim DATE
);

-- Endossos
CREATE TABLE endossos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apolice_id UUID REFERENCES apolices(id) ON DELETE CASCADE,
  tipo VARCHAR(50), -- inclusao, exclusao, alteracao
  descricao TEXT,
  valor_novo DECIMAL(12, 2),
  status VARCHAR(20) DEFAULT 'rascunho',
  data_solicitacao TIMESTAMP DEFAULT NOW(),
  data_emissao TIMESTAMP,
  documentos_json JSONB
);

-- Sinistros
CREATE TABLE sinistros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  apolice_id UUID REFERENCES apolices(id) ON DELETE CASCADE,
  numero_sinistro VARCHAR(50) UNIQUE,
  data_ocorrencia DATE NOT NULL,
  descricao_ocorrencia TEXT,
  status VARCHAR(30) DEFAULT 'notificado',
  data_notificacao TIMESTAMP DEFAULT NOW(),
  regulador VARCHAR(255),
  documentos_json JSONB,
  comunicacoes_json JSONB, -- histórico de comunicações
  valor_indenizacao DECIMAL(12, 2),
  data_pagamento TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Regulação de Sinistros (timeline)
CREATE TABLE regulacao_sinistro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sinistro_id UUID REFERENCES sinistros(id) ON DELETE CASCADE,
  etapa VARCHAR(50),
  descricao TEXT,
  data_evento TIMESTAMP DEFAULT NOW(),
  documentos_json JSONB,
  executado_por VARCHAR(255)
);

-- Mensagens WhatsApp
CREATE TABLE mensagens_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  numero_whatsapp VARCHAR(20),
  remetente VARCHAR(20), -- 'cliente' ou 'corretora'
  conteudo TEXT,
  tipo_mensagem VARCHAR(20), -- 'texto', 'imagem', 'documento'
  documentos_json JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  lido BOOLEAN DEFAULT false,
  respondido_por_usuario_id UUID,
  metadata_json JSONB
);

-- Comissões
CREATE TABLE comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apolice_id UUID REFERENCES apolices(id) ON DELETE CASCADE,
  valor_bruto DECIMAL(12, 2),
  descontos_json JSONB, -- {imposto_irpf: 15%, etc}
  valor_liquido DECIMAL(12, 2),
  data_receita DATE,
  status VARCHAR(20) DEFAULT 'pendente', -- pendente, recebida, paga
  data_recebimento TIMESTAMP,
  data_pagamento TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transações Financeiras
CREATE TABLE transacoes_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  tipo VARCHAR(50), -- receita, despesa, comissao
  descricao TEXT,
  valor DECIMAL(12, 2),
  data_transacao DATE,
  status VARCHAR(20),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tarefas/Lembretes
CREATE TABLE tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  tipo VARCHAR(50), -- renovacao, vencimento, sinistro, pagamento
  cliente_id UUID REFERENCES clientes(id),
  apolice_id UUID REFERENCES apolices(id),
  descricao TEXT,
  data_vencimento DATE,
  data_vencimento_time TIME,
  prioridade VARCHAR(10) DEFAULT 'media', -- baixa, media, alta
  concluida BOOLEAN DEFAULT false,
  data_conclusao TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documentos
CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id),
  apolice_id UUID REFERENCES apolices(id),
  sinistro_id UUID REFERENCES sinistros(id),
  tipo VARCHAR(50), -- apolice, endosso, proposta, cotacao, bo, recibo
  nome_arquivo VARCHAR(255),
  url_storage VARCHAR(500),
  tamanho BIGINT,
  tipo_mime VARCHAR(50),
  metadata_json JSONB,
  data_upload TIMESTAMP DEFAULT NOW()
);

-- Propostas
CREATE TABLE propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  ramo VARCHAR(50),
  dados_propostos JSONB,
  valor_proposto DECIMAL(12, 2),
  status VARCHAR(20) DEFAULT 'rascunho',
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_envio TIMESTAMP,
  data_aceitacao TIMESTAMP,
  documentos_json JSONB
);

-- Cotações
CREATE TABLE cotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  ramo VARCHAR(50),
  dados_cotacao JSONB,
  seguradoras_json JSONB, -- [{seguradora, valor, coberturas}]
  melhor_opcao VARCHAR(255),
  data_criacao TIMESTAMP DEFAULT NOW(),
  validade_cotacao DATE
);

-- Histórico de Importações
CREATE TABLE importacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  tipo_dado VARCHAR(50), -- clientes, apolices, comissoes
  arquivo_nome VARCHAR(255),
  total_linhas INTEGER,
  linhas_importadas INTEGER,
  linhas_erro INTEGER,
  status VARCHAR(20),
  erro_detalhes TEXT,
  data_importacao TIMESTAMP DEFAULT NOW()
);

-- Logs de Auditoria
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  tabela VARCHAR(50),
  operacao VARCHAR(10), -- INSERT, UPDATE, DELETE
  registro_id VARCHAR(100),
  dados_antigos JSONB,
  dados_novos JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  data_acao TIMESTAMP DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE apolices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sinistros ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

-- Política: usuários veem apenas seus dados
CREATE POLICY "users_see_own_data" ON clientes
  FOR SELECT USING (auth.uid() = usuario_id);

-- Índices
CREATE INDEX idx_cliente_cpf ON clientes(cpf_cnpj);
CREATE INDEX idx_apolice_cliente ON apolices(cliente_id);
CREATE INDEX idx_apolice_vencimento ON apolices(data_vencimento);
CREATE INDEX idx_sinistro_cliente ON sinistros(cliente_id);
CREATE INDEX idx_sinistro_status ON sinistros(status);
CREATE INDEX idx_mensagem_cliente ON mensagens_whatsapp(cliente_id);
CREATE INDEX idx_tarefas_vencimento ON tarefas(data_vencimento);
CREATE INDEX idx_documentos_cliente ON documentos(cliente_id);
```

---

## 🚀 SETUP DO BACKEND

### 1. Arquivo `.env`

```
# Supabase
SUPABASE_URL=https://sua-instancia.supabase.co
SUPABASE_KEY=eyJhbGc...

# Google Calendar
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_secret

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://evolution.local
EVOLUTION_API_KEY=sua_chave

# OpenAI (OCR)
OPENAI_API_KEY=sk-...

# Outros
JWT_SECRET=seu_secret_super_seguro
NODE_ENV=development
PORT=3000
```

### 2. Inicializar Backend

```bash
cd backend

# Instalar dependências core
npm install express typescript ts-node @types/express @types/node dotenv cors
npm install -D @types/node ts-node-dev

# Supabase e integração
npm install @supabase/supabase-js

# Validação
npm install zod express-async-errors

# IA e processamento
npm install openai axios multer

# Jobs em background
npm install bull redis

# Segurança
npm install helmet express-rate-limit jsonwebtoken

# Logging
npm install winston

# Email
npm install nodemailer

# Testes
npm install -D jest @types/jest ts-jest
```

### 3. Arquivo `src/server.ts`

```typescript
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import dotenv from 'dotenv';
import clienteRoutes from './routes/cliente';
import apoliceRoutes from './routes/apolice';
import sinistroRoutes from './routes/sinistro';
import whatsappRoutes from './routes/whatsapp';
import iaRoutes from './routes/ia';

dotenv.config();

const app = express();

// Middleware de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Limitador de taxa
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rotas
app.use('/api/clientes', clienteRoutes);
app.use('/api/apolices', apoliceRoutes);
app.use('/api/sinistros', sinistroRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/ia', iaRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em porta ${PORT}`);
});
```

---

## ⚛️ SETUP DO FRONTEND

### 1. Componente Base - Cliente

```typescript
// frontend/src/types/index.ts
export interface Cliente {
  id: string;
  tipo: 'PF' | 'PJ';
  cpf_cnpj: string;
  nome: string;
  email: string;
  telefone: string;
  endereco: {
    rua: string;
    numero: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  apolices?: Apolice[];
  sinistros?: Sinistro[];
}

export interface Apolice {
  id: string;
  cliente_id: string;
  ramo: string;
  seguradora: string;
  numero_apolice: string;
  valor_premio: number;
  data_inicio: Date;
  data_vencimento: Date;
  status: 'vigente' | 'vencida' | 'cancelada';
}

export interface Sinistro {
  id: string;
  cliente_id: string;
  apolice_id: string;
  numero_sinistro: string;
  data_ocorrencia: Date;
  status: 'notificado' | 'analise' | 'pago' | 'recusado';
}
```

### 2. Store Zustand

```typescript
// frontend/src/store/clienteStore.ts
import { create } from 'zustand';
import { Cliente } from '../types';

interface ClienteStore {
  clientes: Cliente[];
  clienteSelecionado: Cliente | null;
  carregando: boolean;
  erro: string | null;
  
  buscarClientes: () => Promise<void>;
  buscarClientePorId: (id: string) => Promise<void>;
  criarCliente: (cliente: Omit<Cliente, 'id'>) => Promise<void>;
  atualizarCliente: (id: string, updates: Partial<Cliente>) => Promise<void>;
  deletarCliente: (id: string) => Promise<void>;
}

export const useClienteStore = create<ClienteStore>((set) => ({
  clientes: [],
  clienteSelecionado: null,
  carregando: false,
  erro: null,
  
  buscarClientes: async () => {
    set({ carregando: true });
    try {
      const response = await fetch('/api/clientes');
      const data = await response.json();
      set({ clientes: data, erro: null });
    } catch (error) {
      set({ erro: String(error) });
    } finally {
      set({ carregando: false });
    }
  },
  
  buscarClientePorId: async (id: string) => {
    try {
      const response = await fetch(`/api/clientes/${id}`);
      const data = await response.json();
      set({ clienteSelecionado: data });
    } catch (error) {
      set({ erro: String(error) });
    }
  },
  
  criarCliente: async (cliente: Omit<Cliente, 'id'>) => {
    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cliente)
      });
      const novoCliente = await response.json();
      set((state) => ({ clientes: [...state.clientes, novoCliente] }));
    } catch (error) {
      set({ erro: String(error) });
    }
  },
  
  atualizarCliente: async (id: string, updates: Partial<Cliente>) => {
    try {
      const response = await fetch(`/api/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const clienteAtualizado = await response.json();
      set((state) => ({
        clientes: state.clientes.map(c => c.id === id ? clienteAtualizado : c),
        clienteSelecionado: state.clienteSelecionado?.id === id ? clienteAtualizado : state.clienteSelecionado
      }));
    } catch (error) {
      set({ erro: String(error) });
    }
  },
  
  deletarCliente: async (id: string) => {
    try {
      await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
      set((state) => ({
        clientes: state.clientes.filter(c => c.id !== id)
      }));
    } catch (error) {
      set({ erro: String(error) });
    }
  }
}));
```

### 3. Exemplo de Página

```typescript
// frontend/src/pages/ClientesPage.tsx
import { useEffect, useState } from 'react';
import { useClienteStore } from '../store/clienteStore';
import ClienteForm from '../components/Cliente/ClienteForm';
import ClientesList from '../components/Cliente/ClientesList';

export default function ClientesPage() {
  const { clientes, carregando, erro, buscarClientes, deletarCliente } = useClienteStore();
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    buscarClientes();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Novo Cliente
        </button>
      </div>

      {mostrarForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
          <ClienteForm onClose={() => setMostrarForm(false)} />
        </div>
      )}

      {carregando ? (
        <p>Carregando...</p>
      ) : erro ? (
        <p className="text-red-600">Erro: {erro}</p>
      ) : (
        <ClientesList clientes={clientes} onDelete={deletarCliente} />
      )}
    </div>
  );
}
```

---

## 📱 INTEGRAÇÃO WHATSAPP (Evolution API)

### 1. Webhook Receiver

```typescript
// backend/src/routes/whatsapp.ts
import express from 'express';
import { supabase } from '../services/supabase';

const router = express.Router();

// Webhook para receber mensagens
router.post('/webhook', async (req, res) => {
  try {
    const {
      data: {
        message: {
          from: remetente,
          body: conteudo,
          timestamp
        },
        contact: { id: cliente_id }
      }
    } = req.body;

    // Salvar mensagem no banco
    await supabase.from('mensagens_whatsapp').insert({
      cliente_id,
      numero_whatsapp: remetente,
      remetente: 'cliente',
      conteudo,
      timestamp: new Date(timestamp * 1000),
      tipo_mensagem: 'texto'
    });

    // Criar tarefa se for sinistro
    if (conteudo.toLowerCase().includes('sinistro')) {
      await supabase.from('tarefas').insert({
        tipo: 'sinistro',
        cliente_id,
        descricao: `Novo sinistro reportado via WhatsApp: ${conteudo}`,
        data_vencimento: new Date(),
        prioridade: 'alta'
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
});

// Enviar mensagem
router.post('/enviar', async (req, res) => {
  try {
    const { cliente_id, mensagem } = req.body;

    // Obter número do cliente
    const { data: cliente } = await supabase
      .from('mensagens_whatsapp')
      .select('numero_whatsapp')
      .eq('cliente_id', cliente_id)
      .limit(1);

    // Enviar via Evolution API
    await fetch(`${process.env.EVOLUTION_API_URL}/message/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EVOLUTION_API_KEY}`
      },
      body: JSON.stringify({
        number: cliente[0].numero_whatsapp,
        text: mensagem
      })
    });

    // Registrar mensagem enviada
    await supabase.from('mensagens_whatsapp').insert({
      cliente_id,
      remetente: 'corretora',
      conteudo: mensagem,
      tipo_mensagem: 'texto'
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
```

---

## 🤖 INTEGRAÇÃO IA (OCR)

### 1. Extração de Dados

```typescript
// backend/src/services/openai.ts
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function extrairDadosApolice(caminhoArquivo: string) {
  const arquivo = fs.readFileSync(caminhoArquivo);
  const base64 = arquivo.toString('base64');
  const ext = path.extname(caminhoArquivo).toLowerCase();
  
  const tipoMedia = ext === '.pdf' ? 'application/pdf' : 'image/jpeg';

  const resposta = await openai.vision.parse({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${tipoMedia};base64,${base64}`
            }
          },
          {
            type: 'text',
            text: `Extraia os dados da apólice de seguro. Retorne em JSON com os campos:
            {
              "tipo_documento": "apolice|proposta|cotacao|endosso",
              "ramo": "auto|residencial|vida|saude|consorcio|financiamento",
              "seguradora": "nome da seguradora",
              "numero_apolice": "numero",
              "data_inicio": "YYYY-MM-DD",
              "data_vencimento": "YYYY-MM-DD",
              "valor_premio": 0.00,
              "coberturas": [{"nome": "cobertura", "limite": 0.00}],
              "observacoes": "anotações importantes"
            }`
          }
        ]
      }
    ]
  });

  return JSON.parse(resposta.content[0].text);
}
```

### 2. Endpoint para Upload

```typescript
// backend/src/routes/ia.ts
import express, { Request } from 'express';
import multer from 'multer';
import { extrairDadosApolice } from '../services/openai';
import { supabase } from '../services/supabase';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/extrair-apolice', upload.single('documento'), async (req: Request, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não fornecido' });
    }

    const dados = await extrairDadosApolice(req.file.path);

    // Salvar documento
    const { data: uploadData } = await supabase.storage
      .from('documentos')
      .upload(`${req.body.cliente_id}/${req.file.filename}`, req.file);

    // Retornar dados extraídos para confirmação
    res.json({
      dados_extraidos: dados,
      documento_url: uploadData?.path,
      requer_confirmacao: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
});

// Endpoint para confirmar e salvar
router.post('/confirmar-apolice', async (req, res) => {
  try {
    const { cliente_id, dados_confirmados } = req.body;

    // Salvar apólice no banco
    const { data } = await supabase
      .from('apolices')
      .insert({
        cliente_id,
        ramo: dados_confirmados.ramo,
        seguradora: dados_confirmados.seguradora,
        numero_apolice: dados_confirmados.numero_apolice,
        valor_premio: dados_confirmados.valor_premio,
        data_inicio: dados_confirmados.data_inicio,
        data_vencimento: dados_confirmados.data_vencimento,
        status: 'vigente'
      })
      .select();

    // Salvar coberturas
    for (const cobertura of dados_confirmados.coberturas) {
      await supabase.from('coberturas').insert({
        apolice_id: data[0].id,
        nome: cobertura.nome,
        limite_cobertura: cobertura.limite
      });
    }

    res.json({ sucesso: true, apolice_id: data[0].id });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
```

---

## 📅 INTEGRAÇÃO GOOGLE CALENDAR

```typescript
// backend/src/services/calendar.ts
import { google } from 'googleapis';

const calendar = google.calendar('v3');

export async function criarEventoRenovacao(
  clienteNome: string,
  dataRenovacao: Date,
  apoliceNumero: string
) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_CREDENTIALS_FILE,
    scopes: ['https://www.googleapis.com/auth/calendar']
  });

  const authClient = await auth.getClient();

  await calendar.events.insert({
    auth: authClient,
    calendarId: 'primary',
    requestBody: {
      summary: `Renovação: ${clienteNome}`,
      description: `Apólice nº ${apoliceNumero}`,
      start: { dateTime: new Date(dataRenovacao.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() },
      end: { dateTime: new Date(dataRenovacao.getTime() - 30 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString() },
      reminders: {
        useDefault: true
      }
    }
  });
}
```

---

## 🚀 DEPLOYMENT

### Vercel (Frontend)

```bash
# 1. Conectar repositório GitHub
# 2. Configurar variáveis de ambiente
VITE_API_URL=https://api.seudominio.com
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_KEY=anon-key

# 3. Deploy automático em push para main
```

### Railway (Backend)

```bash
# 1. Conectar repositório GitHub
# 2. Configurar variáveis de ambiente (todas do .env)
# 3. Definir comando de start:
npm run start

# 4. Railway cria URL automática
# 5. Atualizar FRONTEND_URL no backend
```

---

## 🧪 CHECKLIST DE DESENVOLVIMENTO

### MVP Inicial
- [ ] Setup inicial e deploy
- [ ] Autenticação funcionando
- [ ] Cadastro básico de cliente
- [ ] Listagem de clientes
- [ ] Cadastro de apólice (manual)
- [ ] Dashboard básico do cliente
- [ ] Upload de documentos

### Segunda Fase
- [ ] OCR com IA funcionando
- [ ] WhatsApp integrado (receber mensagens)
- [ ] Gestão de sinistros básica
- [ ] Alertas de renovação
- [ ] Importação de Excel

### Terceira Fase
- [ ] Relatórios financeiros
- [ ] CRM WhatsApp completo
- [ ] Automações avançadas
- [ ] Testes automatizados
- [ ] Documentação

---

**Última Atualização:** 2026-01-05  
**Próximo Passo:** Validar com Time Técnico