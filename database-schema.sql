-- =====================================================
-- SUPABASE SCHEMA - Corretora de Seguros
-- =====================================================
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Habilitar UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA DE USUÁRIOS
-- Gerenciada pelo Supabase Auth, apenas tabela pública
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'corretor', 'assistente')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE CLIENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo VARCHAR(2) NOT NULL CHECK (tipo IN ('PF', 'PJ')),
  cpf_cnpj VARCHAR(20) UNIQUE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  data_nascimento DATE,
  endereco JSONB,
  notas TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE APÓLICES
-- =====================================================
CREATE TABLE IF NOT EXISTS apolices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  ramo VARCHAR(50) NOT NULL CHECK (ramo IN ('auto', 'residencial', 'vida', 'saude', 'consorcio', 'financiamento')),
  seguradora VARCHAR(255) NOT NULL,
  numero_apolice VARCHAR(50) UNIQUE NOT NULL,
  valor_premio DECIMAL(10, 2) NOT NULL,
  data_inicio DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  data_renovacao DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente', 'vencida', 'cancelada')),
  dados_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE COBERTURAS
-- =====================================================
CREATE TABLE IF NOT EXISTS coberturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apolice_id UUID NOT NULL REFERENCES apolices(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  limite_cobertura DECIMAL(12, 2),
  franquia DECIMAL(10, 2),
  premio_cobertura DECIMAL(10, 2),
  data_inicio DATE,
  data_fim DATE
);

-- =====================================================
-- TABELA DE ENDOSSOS
-- =====================================================
CREATE TABLE IF NOT EXISTS endossos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apolice_id UUID NOT NULL REFERENCES apolices(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('inclusao', 'exclusao', 'alteracao')),
  descricao TEXT,
  valor_novo DECIMAL(12, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'aceito', 'emitido')),
  data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_emissao TIMESTAMP WITH TIME ZONE,
  documentos_json JSONB
);

-- =====================================================
-- TABELA DE SINISTROS
-- =====================================================
CREATE TABLE IF NOT EXISTS sinistros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  apolice_id UUID NOT NULL REFERENCES apolices(id) ON DELETE CASCADE,
  numero_sinistro VARCHAR(50) UNIQUE NOT NULL,
  data_ocorrencia DATE NOT NULL,
  descricao_ocorrencia TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'notificado' CHECK (
    status IN (
      'notificado', 
      'analise_inicial', 
      'documentacao', 
      'regulacao', 
      'cobertura_confirmada', 
      'indenizacao_processando', 
      'pago', 
      'recusado'
    )
  ),
  regulador VARCHAR(255),
  valor_indenizacao DECIMAL(12, 2),
  data_pagamento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE REGULAÇÃO DE SINISTROS (TIMELINE)
-- =====================================================
CREATE TABLE IF NOT EXISTS regulacao_sinistro (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sinistro_id UUID NOT NULL REFERENCES sinistros(id) ON DELETE CASCADE,
  etapa VARCHAR(50) NOT NULL,
  descricao TEXT,
  data_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
  documentos_json JSONB,
  executado_por VARCHAR(255)
);

-- =====================================================
-- TABELA DE DOCUMENTOS DE SINISTROS
-- =====================================================
CREATE TABLE IF NOT EXISTS sinistro_documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sinistro_id UUID NOT NULL REFERENCES sinistros(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (
    tipo IN ('bo', 'fotos', 'laudo', 'nota_fiscal', 'orcamento', 'procuracao', 'cnh', 'crlv', 'outros')
  ),
  nome_arquivo VARCHAR(255) NOT NULL,
  url_storage VARCHAR(500) NOT NULL,
  tamanho BIGINT,
  tipo_mime VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  observacoes TEXT,
  uploaded_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE HISTÓRICO DE APÓLICES
-- =====================================================
CREATE TABLE IF NOT EXISTS apolice_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apolice_id UUID NOT NULL REFERENCES apolices(id) ON DELETE CASCADE,
  tipo_alteracao VARCHAR(50) NOT NULL CHECK (
    tipo_alteracao IN ('criacao', 'edicao', 'endosso', 'renovacao', 'cancelamento', 'cobertura_adicionada', 'cobertura_removida')
  ),
  campo_alterado VARCHAR(100),
  valor_anterior TEXT,
  valor_novo TEXT,
  descricao TEXT,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE CONVERSAS WHATSAPP
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_conversas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  numero_whatsapp VARCHAR(20) NOT NULL,
  nome_contato VARCHAR(255),
  foto_url VARCHAR(500),
  ultima_mensagem TEXT,
  ultima_mensagem_timestamp TIMESTAMP WITH TIME ZONE,
  mensagens_nao_lidas INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ativa' CHECK (status IN ('ativa', 'arquivada', 'bloqueada')),
  atribuido_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE MENSAGENS WHATSAPP
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversa_id UUID NOT NULL REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
  message_id VARCHAR(100), -- ID da Evolution API
  remetente VARCHAR(20) NOT NULL CHECK (remetente IN ('cliente', 'corretora')),
  conteudo TEXT NOT NULL,
  tipo_mensagem VARCHAR(20) NOT NULL DEFAULT 'texto' CHECK (tipo_mensagem IN ('texto', 'imagem', 'documento', 'audio', 'video', 'sticker')),
  media_url VARCHAR(500),
  media_mimetype VARCHAR(100),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'enviada' CHECK (status IN ('enviando', 'enviada', 'entregue', 'lida', 'erro')),
  erro_detalhes TEXT,
  metadata_json JSONB
);

-- =====================================================
-- TABELA DE TEMPLATES WHATSAPP
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('boas_vindas', 'cobranca', 'renovacao', 'sinistro', 'aniversario', 'geral')),
  conteudo TEXT NOT NULL,
  variaveis JSONB, -- [{nome: 'cliente_nome', descricao: 'Nome do cliente'}]
  ativo BOOLEAN DEFAULT true,
  uso_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA LEGADA DE MENSAGENS WHATSAPP (MANTER COMPATIBILIDADE)
-- =====================================================
CREATE TABLE IF NOT EXISTS mensagens_whatsapp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  numero_whatsapp VARCHAR(20) NOT NULL,
  remetente VARCHAR(20) NOT NULL CHECK (remetente IN ('cliente', 'corretora')),
  conteudo TEXT NOT NULL,
  tipo_mensagem VARCHAR(20) NOT NULL DEFAULT 'texto' CHECK (tipo_mensagem IN ('texto', 'imagem', 'documento')),
  documentos_json JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lido BOOLEAN DEFAULT false,
  respondido_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  metadata_json JSONB
);

-- =====================================================
-- TABELA DE COMISSÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS comissoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apolice_id UUID NOT NULL REFERENCES apolices(id) ON DELETE CASCADE,
  valor_bruto DECIMAL(12, 2) NOT NULL,
  descontos_json JSONB,
  valor_liquido DECIMAL(12, 2) NOT NULL,
  data_receita DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebida', 'paga')),
  data_recebimento TIMESTAMP WITH TIME ZONE,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE TRANSAÇÕES FINANCEIRAS
-- =====================================================
CREATE TABLE IF NOT EXISTS transacoes_financeiras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('receita', 'despesa', 'comissao')),
  descricao TEXT NOT NULL,
  valor DECIMAL(12, 2) NOT NULL,
  data_transacao DATE NOT NULL,
  status VARCHAR(20),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE TAREFAS/LEMBRETES
-- =====================================================
CREATE TABLE IF NOT EXISTS tarefas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (
    tipo IN ('renovacao', 'vencimento', 'sinistro', 'pagamento', 'geral')
  ),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  apolice_id UUID REFERENCES apolices(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  data_vencimento DATE NOT NULL,
  prioridade VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta')),
  concluida BOOLEAN DEFAULT false,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE DOCUMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  apolice_id UUID REFERENCES apolices(id) ON DELETE CASCADE,
  sinistro_id UUID REFERENCES sinistros(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (
    tipo IN ('apolice', 'endosso', 'proposta', 'cotacao', 'bo', 'recibo', 'foto', 'laudo', 'outro')
  ),
  nome_arquivo VARCHAR(255) NOT NULL,
  url_storage VARCHAR(500) NOT NULL,
  tamanho BIGINT,
  tipo_mime VARCHAR(50),
  metadata_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE PROPOSTAS
-- =====================================================
CREATE TABLE IF NOT EXISTS propostas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  ramo VARCHAR(50) NOT NULL,
  dados_propostos JSONB,
  valor_proposto DECIMAL(12, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviada', 'aceita', 'recusada')),
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_envio TIMESTAMP WITH TIME ZONE,
  data_aceitacao TIMESTAMP WITH TIME ZONE,
  documentos_json JSONB
);

-- =====================================================
-- TABELA DE COTAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS cotacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  lead_nome VARCHAR(255),
  lead_telefone VARCHAR(50),
  ramo VARCHAR(50) NOT NULL,
  dados_cotacao JSONB NOT NULL,
  seguradoras_json JSONB NOT NULL, -- [{seguradora, valor, coberturas}]
  melhor_opcao VARCHAR(255),
  status_pipeline VARCHAR(50) DEFAULT 'nova',
  valor_estimado DECIMAL(10, 2),
  proximo_contato TIMESTAMP WITH TIME ZONE,
  motivo_perda VARCHAR(255),
  notas_negociacao TEXT,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_envio TIMESTAMP WITH TIME ZONE,
  data_fechamento TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validade_cotacao DATE
);

-- =====================================================
-- TABELA DE HISTÓRICO DE IMPORTAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS importacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_dado VARCHAR(50) NOT NULL CHECK (tipo_dado IN ('clientes', 'apolices', 'comissoes', 'sinistros')),
  arquivo_nome VARCHAR(255) NOT NULL,
  total_linhas INTEGER NOT NULL,
  linhas_importadas INTEGER DEFAULT 0,
  linhas_erro INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),
  erro_detalhes TEXT,
  data_importacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE HISTÓRICO DE IMPORTAÇÕES (NOVA VERSÃO)
-- =====================================================
CREATE TABLE IF NOT EXISTS importacoes_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('clientes', 'apolices', 'comissoes', 'sinistros')),
  arquivo_nome VARCHAR(255) NOT NULL,
  arquivo_url VARCHAR(500),
  total_linhas INTEGER NOT NULL DEFAULT 0,
  importados INTEGER DEFAULT 0,
  erros INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'sucesso', 'parcial', 'erro')),
  detalhes_erros JSONB,
  mapeamento_usado JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE LOGS DE AUDITORIA
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tabela VARCHAR(50) NOT NULL,
  operacao VARCHAR(10) NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE')),
  registro_id VARCHAR(100) NOT NULL,
  dados_antigos JSONB,
  dados_novos JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  data_acao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================
-- Clientes
CREATE INDEX IF NOT EXISTS idx_cliente_cpf ON clientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_cliente_nome ON clientes USING gin(to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_cliente_ativo ON clientes(ativo);
CREATE INDEX IF NOT EXISTS idx_cliente_usuario ON clientes(usuario_id);

-- Apólices
CREATE INDEX IF NOT EXISTS idx_apolice_cliente ON apolices(cliente_id);
CREATE INDEX IF NOT EXISTS idx_apolice_vencimento ON apolices(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_apolice_status ON apolices(status);
CREATE INDEX IF NOT EXISTS idx_apolice_ramo ON apolices(ramo);
CREATE INDEX IF NOT EXISTS idx_apolice_numero ON apolices(numero_apolice);

-- Sinistros
CREATE INDEX IF NOT EXISTS idx_sinistro_cliente ON sinistros(cliente_id);
CREATE INDEX IF NOT EXISTS idx_sinistro_apolice ON sinistros(apolice_id);
CREATE INDEX IF NOT EXISTS idx_sinistro_status ON sinistros(status);
CREATE INDEX IF NOT EXISTS idx_sinistro_numero ON sinistros(numero_sinistro);
CREATE INDEX IF NOT EXISTS idx_sinistro_data ON sinistros(data_ocorrencia);

-- Mensagens WhatsApp
CREATE INDEX IF NOT EXISTS idx_mensagem_cliente ON mensagens_whatsapp(cliente_id);
CREATE INDEX IF NOT EXISTS idx_mensagem_timestamp ON mensagens_whatsapp(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mensagem_lido ON mensagens_whatsapp(lido);

-- WhatsApp Conversas
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversa_cliente ON whatsapp_conversas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversa_numero ON whatsapp_conversas(numero_whatsapp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversa_timestamp ON whatsapp_conversas(ultima_mensagem_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversa_status ON whatsapp_conversas(status);

-- WhatsApp Mensagens
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagem_conversa ON whatsapp_mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagem_timestamp ON whatsapp_mensagens(timestamp DESC);

-- WhatsApp Templates
CREATE INDEX IF NOT EXISTS idx_whatsapp_template_categoria ON whatsapp_templates(categoria);
CREATE INDEX IF NOT EXISTS idx_whatsapp_template_ativo ON whatsapp_templates(ativo);

-- Sinistro Documentos
CREATE INDEX IF NOT EXISTS idx_sinistro_doc_sinistro ON sinistro_documentos(sinistro_id);
CREATE INDEX IF NOT EXISTS idx_sinistro_doc_tipo ON sinistro_documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_sinistro_doc_status ON sinistro_documentos(status);

-- Apólice Histórico
CREATE INDEX IF NOT EXISTS idx_apolice_historico_apolice ON apolice_historico(apolice_id);
CREATE INDEX IF NOT EXISTS idx_apolice_historico_tipo ON apolice_historico(tipo_alteracao);
CREATE INDEX IF NOT EXISTS idx_apolice_historico_data ON apolice_historico(created_at DESC);

-- Regulação Sinistro
CREATE INDEX IF NOT EXISTS idx_regulacao_sinistro ON regulacao_sinistro(sinistro_id);
CREATE INDEX IF NOT EXISTS idx_regulacao_data ON regulacao_sinistro(data_evento DESC);

-- Comissões
CREATE INDEX IF NOT EXISTS idx_comissao_apolice ON comissoes(apolice_id);
CREATE INDEX IF NOT EXISTS idx_comissao_status ON comissoes(status);
CREATE INDEX IF NOT EXISTS idx_comissao_data ON comissoes(data_receita);

-- Tarefas
CREATE INDEX IF NOT EXISTS idx_tarefa_usuario ON tarefas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tarefa_vencimento ON tarefas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_tarefa_status ON tarefas(concluida);
CREATE INDEX IF NOT EXISTS idx_tarefa_prioridade ON tarefas(prioridade);

-- Documentos
CREATE INDEX IF NOT EXISTS idx_documento_cliente ON documentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_documento_apolice ON documentos(apolice_id);
CREATE INDEX IF NOT EXISTS idx_documento_sinistro ON documentos(sinistro_id);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_tabela ON audit_logs(tabela);
CREATE INDEX IF NOT EXISTS idx_audit_data ON audit_logs(data_acao DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE apolices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sinistros ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver dados que criaram ou que são públicos
CREATE POLICY "users_see_own_data" ON clientes
  FOR SELECT USING (auth.uid()::text = usuario_id::text);

CREATE POLICY "users_see_own_apolices" ON apolices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clientes 
      WHERE clientes.id = apolices.cliente_id 
      AND clientes.usuario_id::text = auth.uid()::text
    )
  );

CREATE POLICY "users_see_own_sinistros" ON sinistros
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clientes 
      WHERE clientes.id = sinistros.cliente_id 
      AND clientes.usuario_id::text = auth.uid()::text
    )
  );

-- =====================================================
-- FUNCTIONS TRIGGER
-- =====================================================

-- Function para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_clientes_updated_at 
    BEFORE UPDATE ON clientes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apolices_updated_at 
    BEFORE UPDATE ON apolices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DADOS DE EXEMPLO (OPCIONAL)
-- =====================================================

-- Inserir usuário de exemplo (descomentar após criar usuário no Supabase Auth)
-- INSERT INTO usuarios (id, email, nome, role, ativo)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   'admin@corretora.com.br',
--   'Administrador',
--   'admin',
--   true
-- );

-- =====================================================
-- COMENTÁRIO FINAL
-- =====================================================
-- Schema criado com sucesso!
-- 
-- Próximos passos:
-- 1. Criar usuário no Supabase Auth
-- 2. Copiar o UUID do usuário
-- 3. Inserir na tabela usuarios (ver exemplo acima)
-- 4. Testar as APIs
-- 
-- =====================================================

-- =====================================================
-- SUPABASE STORAGE BUCKETS
-- Execute no SQL Editor do Supabase
-- =====================================================

-- Criar bucket para documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Criar bucket para importações temporárias
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'importacoes',
  'importacoes',
  false,
  104857600, -- 100MB
  ARRAY['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
) ON CONFLICT (id) DO NOTHING;

-- Criar bucket para WhatsApp media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-media',
  'whatsapp-media',
  false,
  16777216, -- 16MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'audio/ogg', 'audio/mpeg', 'video/mp4', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Política para bucket de documentos
CREATE POLICY "Usuarios autenticados podem fazer upload de documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "Usuarios autenticados podem ver documentos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documentos');

CREATE POLICY "Usuarios autenticados podem deletar documentos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documentos');

-- Política para bucket de importações
CREATE POLICY "Usuarios autenticados podem fazer upload de importacoes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'importacoes');

CREATE POLICY "Usuarios autenticados podem ver importacoes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'importacoes');

CREATE POLICY "Usuarios autenticados podem deletar importacoes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'importacoes');

-- Política para bucket de WhatsApp
CREATE POLICY "Usuarios autenticados podem fazer upload de whatsapp media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media');

CREATE POLICY "Usuarios autenticados podem ver whatsapp media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'whatsapp-media');

-- =====================================================
-- TRIGGERS PARA ATUALIZAR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_whatsapp_conversas_updated_at 
    BEFORE UPDATE ON whatsapp_conversas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_templates_updated_at 
    BEFORE UPDATE ON whatsapp_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNÇÃO PARA ATUALIZAR CONVERSA AO RECEBER MENSAGEM
-- =====================================================
CREATE OR REPLACE FUNCTION update_conversa_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE whatsapp_conversas
    SET 
        ultima_mensagem = NEW.conteudo,
        ultima_mensagem_timestamp = NEW.timestamp,
        mensagens_nao_lidas = CASE 
            WHEN NEW.remetente = 'cliente' THEN mensagens_nao_lidas + 1
            ELSE mensagens_nao_lidas
        END,
        updated_at = NOW()
    WHERE id = NEW.conversa_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversa_on_message
    AFTER INSERT ON whatsapp_mensagens
    FOR EACH ROW EXECUTE FUNCTION update_conversa_on_message();

-- =====================================================
-- FUNÇÃO PARA CRIAR HISTÓRICO DE APÓLICE
-- =====================================================
CREATE OR REPLACE FUNCTION log_apolice_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO apolice_historico (apolice_id, tipo_alteracao, descricao)
        VALUES (NEW.id, 'criacao', 'Apólice criada');
    ELSIF TG_OP = 'UPDATE' THEN
        -- Verificar mudanças em campos importantes
        IF OLD.valor_premio <> NEW.valor_premio THEN
            INSERT INTO apolice_historico (apolice_id, tipo_alteracao, campo_alterado, valor_anterior, valor_novo, descricao)
            VALUES (NEW.id, 'edicao', 'valor_premio', OLD.valor_premio::TEXT, NEW.valor_premio::TEXT, 'Valor do prêmio alterado');
        END IF;
        
        IF OLD.status <> NEW.status THEN
            INSERT INTO apolice_historico (apolice_id, tipo_alteracao, campo_alterado, valor_anterior, valor_novo, descricao)
            VALUES (NEW.id, 'edicao', 'status', OLD.status, NEW.status, 'Status alterado');
        END IF;
        
        IF OLD.data_vencimento <> NEW.data_vencimento THEN
            INSERT INTO apolice_historico (apolice_id, tipo_alteracao, campo_alterado, valor_anterior, valor_novo, descricao)
            VALUES (NEW.id, 'edicao', 'data_vencimento', OLD.data_vencimento::TEXT, NEW.data_vencimento::TEXT, 'Data de vencimento alterada');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_apolice_changes
    AFTER INSERT OR UPDATE ON apolices
    FOR EACH ROW EXECUTE FUNCTION log_apolice_changes();

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View de conversas com dados do cliente
CREATE OR REPLACE VIEW vw_whatsapp_conversas AS
SELECT 
    c.*,
    cl.nome as cliente_nome,
    cl.cpf_cnpj as cliente_documento,
    u.nome as atribuido_nome
FROM whatsapp_conversas c
LEFT JOIN clientes cl ON c.cliente_id = cl.id
LEFT JOIN usuarios u ON c.atribuido_usuario_id = u.id;

-- View de sinistros com timeline completa
CREATE OR REPLACE VIEW vw_sinistros_completo AS
SELECT 
    s.*,
    c.nome as cliente_nome,
    c.telefone as cliente_telefone,
    a.numero_apolice,
    a.seguradora,
    a.ramo,
    (SELECT COUNT(*) FROM regulacao_sinistro WHERE sinistro_id = s.id) as total_eventos,
    (SELECT COUNT(*) FROM sinistro_documentos WHERE sinistro_id = s.id) as total_documentos
FROM sinistros s
JOIN clientes c ON s.cliente_id = c.id
JOIN apolices a ON s.apolice_id = a.id;

-- View de apólices com coberturas
CREATE OR REPLACE VIEW vw_apolices_completo AS
SELECT 
    a.*,
    c.nome as cliente_nome,
    c.cpf_cnpj as cliente_documento,
    c.telefone as cliente_telefone,
    (SELECT COALESCE(SUM(limite_cobertura), 0) FROM coberturas WHERE apolice_id = a.id) as total_cobertura,
    (SELECT COUNT(*) FROM coberturas WHERE apolice_id = a.id) as total_coberturas,
    (SELECT COUNT(*) FROM endossos WHERE apolice_id = a.id) as total_endossos
FROM apolices a
JOIN clientes c ON a.cliente_id = c.id;

-- =====================================================
-- DADOS INICIAIS DE TEMPLATES WHATSAPP
-- =====================================================
INSERT INTO whatsapp_templates (nome, categoria, conteudo, variaveis) VALUES
('Boas-vindas', 'boas_vindas', 'Olá {{cliente_nome}}! 👋

Seja bem-vindo(a) à nossa corretora! Estamos muito felizes em tê-lo(a) como cliente.

Qualquer dúvida, estamos à disposição!', '[{"nome": "cliente_nome", "descricao": "Nome do cliente"}]'),

('Lembrete de Renovação', 'renovacao', 'Olá {{cliente_nome}}!

Sua apólice {{numero_apolice}} vence em {{dias_vencimento}} dias.

Gostaria de agendar uma conversa para renovação? Posso preparar uma cotação atualizada para você.', '[{"nome": "cliente_nome", "descricao": "Nome do cliente"}, {"nome": "numero_apolice", "descricao": "Número da apólice"}, {"nome": "dias_vencimento", "descricao": "Dias até vencimento"}]'),

('Atualização de Sinistro', 'sinistro', 'Olá {{cliente_nome}}!

Temos uma atualização sobre seu sinistro {{numero_sinistro}}:

{{atualizacao}}

Qualquer dúvida, estamos à disposição.', '[{"nome": "cliente_nome", "descricao": "Nome do cliente"}, {"nome": "numero_sinistro", "descricao": "Número do sinistro"}, {"nome": "atualizacao", "descricao": "Descrição da atualização"}]'),

('Feliz Aniversário', 'aniversario', 'Olá {{cliente_nome}}! 🎂

A equipe da nossa corretora deseja a você um Feliz Aniversário!

Que este novo ciclo seja repleto de realizações e proteção para você e sua família.

Abraços!', '[{"nome": "cliente_nome", "descricao": "Nome do cliente"}]'),

('Lembrete de Pagamento', 'cobranca', 'Olá {{cliente_nome}}!

Identificamos que a parcela {{numero_parcela}} da sua apólice {{numero_apolice}} no valor de R$ {{valor}} está pendente.

Data de vencimento: {{data_vencimento}}

Precisa de ajuda? Estamos à disposição!', '[{"nome": "cliente_nome", "descricao": "Nome do cliente"}, {"nome": "numero_parcela", "descricao": "Número da parcela"}, {"nome": "numero_apolice", "descricao": "Número da apólice"}, {"nome": "valor", "descricao": "Valor da parcela"}, {"nome": "data_vencimento", "descricao": "Data de vencimento"}]')

ON CONFLICT DO NOTHING;

-- =====================================================
-- NOVOS MÓDULOS: CONSÓRCIOS, PLANOS DE SAÚDE, FINANCIAMENTOS
-- =====================================================

-- =====================================================
-- TABELA DE CONSÓRCIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS consorcios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  administradora VARCHAR(255) NOT NULL,
  grupo VARCHAR(50),
  cota VARCHAR(50),
  numero_cota VARCHAR(100) NOT NULL,
  valor_credito DECIMAL(15, 2) NOT NULL,
  valor_parcela DECIMAL(12, 2) NOT NULL,
  prazo_meses INTEGER NOT NULL,
  parcelas_pagas INTEGER DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'contemplado', 'encerrado', 'cancelado')),
  tipo_bem VARCHAR(30) NOT NULL CHECK (tipo_bem IN ('imovel', 'veiculo', 'servicos', 'outros')),
  data_adesao DATE NOT NULL,
  data_proxima_assembleia DATE,
  data_contemplacao DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE PARCELAS DE CONSÓRCIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS consorcio_parcelas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consorcio_id UUID NOT NULL REFERENCES consorcios(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor_parcela DECIMAL(12, 2) NOT NULL,
  valor_fundo_reserva DECIMAL(12, 2),
  valor_taxa_admin DECIMAL(12, 2),
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  valor_pago DECIMAL(12, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE LANCES DE CONSÓRCIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS consorcio_lances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consorcio_id UUID NOT NULL REFERENCES consorcios(id) ON DELETE CASCADE,
  data_assembleia DATE NOT NULL,
  tipo_lance VARCHAR(20) NOT NULL CHECK (tipo_lance IN ('livre', 'fixo', 'embutido')),
  valor_lance DECIMAL(12, 2) NOT NULL,
  percentual_lance DECIMAL(5, 2),
  resultado VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (resultado IN ('pendente', 'contemplado', 'nao_contemplado')),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE HISTÓRICO DE CONSÓRCIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS consorcio_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consorcio_id UUID NOT NULL REFERENCES consorcios(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo_evento VARCHAR(50) NOT NULL,
  descricao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE PLANOS DE SAÚDE
-- =====================================================
CREATE TABLE IF NOT EXISTS planos_saude (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  operadora VARCHAR(255) NOT NULL,
  numero_contrato VARCHAR(100) NOT NULL,
  tipo_plano VARCHAR(30) NOT NULL CHECK (tipo_plano IN ('individual', 'familiar', 'empresarial', 'adesao')),
  acomodacao VARCHAR(20) NOT NULL CHECK (acomodacao IN ('enfermaria', 'apartamento')),
  abrangencia VARCHAR(20) NOT NULL CHECK (abrangencia IN ('municipal', 'estadual', 'nacional')),
  valor_mensalidade DECIMAL(12, 2) NOT NULL,
  data_contratacao DATE NOT NULL,
  data_vencimento DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'cancelado')),
  coparticipacao BOOLEAN DEFAULT false,
  percentual_coparticipacao DECIMAL(5, 2),
  data_ultimo_reajuste DATE,
  ans_registro VARCHAR(50),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE BENEFICIÁRIOS DE PLANOS DE SAÚDE
-- =====================================================
CREATE TABLE IF NOT EXISTS plano_beneficiarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plano_id UUID NOT NULL REFERENCES planos_saude(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  data_nascimento DATE NOT NULL,
  tipo_beneficiario VARCHAR(20) NOT NULL CHECK (tipo_beneficiario IN ('titular', 'dependente')),
  parentesco VARCHAR(50),
  numero_carteirinha VARCHAR(100),
  data_inclusao DATE DEFAULT CURRENT_DATE,
  ativo BOOLEAN DEFAULT true,
  valor_mensalidade_individual DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE COBERTURAS DE PLANOS DE SAÚDE
-- =====================================================
CREATE TABLE IF NOT EXISTS plano_coberturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plano_id UUID NOT NULL REFERENCES planos_saude(id) ON DELETE CASCADE,
  procedimento VARCHAR(255) NOT NULL,
  descricao TEXT,
  limite_quantidade INTEGER,
  limite_valor DECIMAL(12, 2),
  coparticipacao_valor DECIMAL(12, 2),
  coberto BOOLEAN DEFAULT true,
  observacao TEXT
);

-- =====================================================
-- TABELA DE CARÊNCIAS DE PLANOS DE SAÚDE
-- =====================================================
CREATE TABLE IF NOT EXISTS plano_carencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plano_id UUID NOT NULL REFERENCES planos_saude(id) ON DELETE CASCADE,
  procedimento VARCHAR(255) NOT NULL,
  data_inicio_carencia DATE NOT NULL,
  data_fim_carencia DATE NOT NULL,
  dias_carencia INTEGER,
  cumprida BOOLEAN DEFAULT false,
  observacao TEXT
);

-- =====================================================
-- TABELA DE HISTÓRICO DE REAJUSTES DE PLANOS
-- =====================================================
CREATE TABLE IF NOT EXISTS plano_reajustes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plano_id UUID NOT NULL REFERENCES planos_saude(id) ON DELETE CASCADE,
  data_reajuste DATE NOT NULL,
  valor_anterior DECIMAL(12, 2) NOT NULL,
  valor_novo DECIMAL(12, 2) NOT NULL,
  percentual_reajuste DECIMAL(5, 2) NOT NULL,
  tipo_reajuste VARCHAR(30) CHECK (tipo_reajuste IN ('anual', 'faixa_etaria', 'sinistralidade', 'outros')),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE HISTÓRICO DE PLANOS DE SAÚDE
-- =====================================================
CREATE TABLE IF NOT EXISTS plano_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plano_id UUID NOT NULL REFERENCES planos_saude(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo_evento VARCHAR(50) NOT NULL,
  descricao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE FINANCIAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS financiamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  instituicao_financeira VARCHAR(255) NOT NULL,
  numero_contrato VARCHAR(100) NOT NULL,
  tipo_financiamento VARCHAR(30) NOT NULL CHECK (tipo_financiamento IN ('imovel', 'veiculo', 'pessoal', 'consignado', 'outros')),
  bem_financiado VARCHAR(255),
  valor_financiado DECIMAL(15, 2) NOT NULL,
  valor_entrada DECIMAL(15, 2),
  valor_parcela DECIMAL(12, 2) NOT NULL,
  taxa_juros DECIMAL(6, 4),
  cet DECIMAL(6, 4), -- Custo Efetivo Total
  prazo_meses INTEGER NOT NULL,
  parcelas_pagas INTEGER DEFAULT 0,
  saldo_devedor DECIMAL(15, 2) NOT NULL,
  data_contratacao DATE NOT NULL,
  data_vencimento_parcela INTEGER, -- Dia do mês
  data_primeira_parcela DATE,
  data_ultima_parcela DATE,
  sistema_amortizacao VARCHAR(20) CHECK (sistema_amortizacao IN ('SAC', 'PRICE', 'SACRE', 'outro')),
  data_refinanciamento DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'quitado', 'atrasado', 'renegociado')),
  garantia VARCHAR(50),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE PARCELAS DE FINANCIAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS financiamento_parcelas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  financiamento_id UUID NOT NULL REFERENCES financiamentos(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor_parcela DECIMAL(12, 2) NOT NULL,
  valor_amortizacao DECIMAL(12, 2),
  valor_juros DECIMAL(12, 2),
  valor_seguro DECIMAL(12, 2),
  valor_taxas DECIMAL(12, 2),
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  valor_pago DECIMAL(12, 2),
  multa DECIMAL(12, 2),
  juros_mora DECIMAL(12, 2),
  saldo_devedor_apos DECIMAL(15, 2),
  status VARCHAR(30) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'quitado_amortizacao')),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE AMORTIZAÇÕES EXTRAORDINÁRIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS financiamento_amortizacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  financiamento_id UUID NOT NULL REFERENCES financiamentos(id) ON DELETE CASCADE,
  data_amortizacao DATE NOT NULL,
  valor_amortizacao DECIMAL(15, 2) NOT NULL,
  tipo_amortizacao VARCHAR(30) CHECK (tipo_amortizacao IN ('parcial', 'quitacao')),
  reducao_tipo VARCHAR(20) CHECK (reducao_tipo IN ('prazo', 'parcela')),
  saldo_devedor_antes DECIMAL(15, 2),
  saldo_devedor_depois DECIMAL(15, 2),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE HISTÓRICO DE FINANCIAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS financiamento_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  financiamento_id UUID NOT NULL REFERENCES financiamentos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo_evento VARCHAR(50) NOT NULL,
  descricao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE PRODUTOS (RAMOS CONFIGURÁVEIS)
-- =====================================================
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('seguro', 'consorcio', 'saude', 'financiamento', 'previdencia', 'capitalizacao', 'outros')),
  icone VARCHAR(50),
  cor VARCHAR(20),
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  usuario_criacao UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE CAMPOS CUSTOMIZADOS POR PRODUTO
-- =====================================================
CREATE TABLE IF NOT EXISTS produto_campos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  nome_campo VARCHAR(100) NOT NULL,
  label VARCHAR(255) NOT NULL,
  tipo_campo VARCHAR(30) NOT NULL CHECK (tipo_campo IN ('text', 'number', 'date', 'select', 'checkbox', 'textarea', 'currency', 'cpf_cnpj', 'telefone', 'email')),
  obrigatorio BOOLEAN DEFAULT false,
  opcoes JSONB, -- Para campos select: [{valor: 'x', label: 'X'}]
  valor_padrao TEXT,
  validacao JSONB, -- Regras de validação
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true
);

-- =====================================================
-- ÍNDICES PARA NOVOS MÓDULOS
-- =====================================================

-- Consórcios
CREATE INDEX IF NOT EXISTS idx_consorcio_cliente ON consorcios(cliente_id);
CREATE INDEX IF NOT EXISTS idx_consorcio_status ON consorcios(status);
CREATE INDEX IF NOT EXISTS idx_consorcio_tipo ON consorcios(tipo_bem);
CREATE INDEX IF NOT EXISTS idx_consorcio_administradora ON consorcios(administradora);
CREATE INDEX IF NOT EXISTS idx_consorcio_parcela_consorcio ON consorcio_parcelas(consorcio_id);
CREATE INDEX IF NOT EXISTS idx_consorcio_parcela_status ON consorcio_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_consorcio_parcela_vencimento ON consorcio_parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_consorcio_lance_consorcio ON consorcio_lances(consorcio_id);

-- Planos de Saúde
CREATE INDEX IF NOT EXISTS idx_plano_cliente ON planos_saude(cliente_id);
CREATE INDEX IF NOT EXISTS idx_plano_status ON planos_saude(status);
CREATE INDEX IF NOT EXISTS idx_plano_tipo ON planos_saude(tipo_plano);
CREATE INDEX IF NOT EXISTS idx_plano_operadora ON planos_saude(operadora);
CREATE INDEX IF NOT EXISTS idx_plano_beneficiario_plano ON plano_beneficiarios(plano_id);
CREATE INDEX IF NOT EXISTS idx_plano_beneficiario_cpf ON plano_beneficiarios(cpf);
CREATE INDEX IF NOT EXISTS idx_plano_carencia_plano ON plano_carencias(plano_id);

-- Financiamentos
CREATE INDEX IF NOT EXISTS idx_financiamento_cliente ON financiamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_financiamento_status ON financiamentos(status);
CREATE INDEX IF NOT EXISTS idx_financiamento_tipo ON financiamentos(tipo_financiamento);
CREATE INDEX IF NOT EXISTS idx_financiamento_instituicao ON financiamentos(instituicao_financeira);
CREATE INDEX IF NOT EXISTS idx_financiamento_parcela_financiamento ON financiamento_parcelas(financiamento_id);
CREATE INDEX IF NOT EXISTS idx_financiamento_parcela_status ON financiamento_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_financiamento_parcela_vencimento ON financiamento_parcelas(data_vencimento);

-- Produtos
CREATE INDEX IF NOT EXISTS idx_produto_categoria ON produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_produto_ativo ON produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_produto_codigo ON produtos(codigo);
CREATE INDEX IF NOT EXISTS idx_produto_campo_produto ON produto_campos(produto_id);

-- =====================================================
-- TRIGGERS PARA NOVOS MÓDULOS
-- =====================================================

CREATE TRIGGER update_consorcios_updated_at 
    BEFORE UPDATE ON consorcios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planos_saude_updated_at 
    BEFORE UPDATE ON planos_saude 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financiamentos_updated_at 
    BEFORE UPDATE ON financiamentos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at 
    BEFORE UPDATE ON produtos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS PARA NOVOS MÓDULOS
-- =====================================================

-- View de Consórcios Completa
CREATE OR REPLACE VIEW vw_consorcios_completo AS
SELECT 
    c.*,
    cl.nome as cliente_nome,
    cl.cpf_cnpj as cliente_documento,
    cl.telefone as cliente_telefone,
    (SELECT COUNT(*) FROM consorcio_parcelas WHERE consorcio_id = c.id AND status = 'pago') as parcelas_pagas_count,
    (SELECT COUNT(*) FROM consorcio_parcelas WHERE consorcio_id = c.id AND status = 'atrasado') as parcelas_atrasadas,
    (SELECT SUM(valor_pago) FROM consorcio_parcelas WHERE consorcio_id = c.id AND status = 'pago') as total_pago,
    (SELECT COUNT(*) FROM consorcio_lances WHERE consorcio_id = c.id) as total_lances
FROM consorcios c
JOIN clientes cl ON c.cliente_id = cl.id;

-- View de Planos de Saúde Completa
CREATE OR REPLACE VIEW vw_planos_saude_completo AS
SELECT 
    p.*,
    cl.nome as cliente_nome,
    cl.cpf_cnpj as cliente_documento,
    cl.telefone as cliente_telefone,
    (SELECT COUNT(*) FROM plano_beneficiarios WHERE plano_id = p.id AND ativo = true) as total_beneficiarios,
    (SELECT COUNT(*) FROM plano_carencias WHERE plano_id = p.id AND cumprida = false) as carencias_pendentes,
    (SELECT SUM(valor_mensalidade_individual) FROM plano_beneficiarios WHERE plano_id = p.id AND ativo = true) as custo_beneficiarios
FROM planos_saude p
JOIN clientes cl ON p.cliente_id = cl.id;

-- View de Financiamentos Completa
CREATE OR REPLACE VIEW vw_financiamentos_completo AS
SELECT 
    f.*,
    cl.nome as cliente_nome,
    cl.cpf_cnpj as cliente_documento,
    cl.telefone as cliente_telefone,
    (SELECT COUNT(*) FROM financiamento_parcelas WHERE financiamento_id = f.id AND status = 'pago') as parcelas_pagas_count,
    (SELECT COUNT(*) FROM financiamento_parcelas WHERE financiamento_id = f.id AND status = 'atrasado') as parcelas_atrasadas,
    (SELECT SUM(valor_pago) FROM financiamento_parcelas WHERE financiamento_id = f.id AND status = 'pago') as total_pago,
    (SELECT MIN(data_vencimento) FROM financiamento_parcelas WHERE financiamento_id = f.id AND status = 'pendente') as proxima_parcela
FROM financiamentos f
JOIN clientes cl ON f.cliente_id = cl.id;

-- =====================================================
-- DADOS INICIAIS: PRODUTOS PADRÃO
-- =====================================================
INSERT INTO produtos (codigo, nome, descricao, categoria, icone, cor, ordem) VALUES
-- Seguros
('auto', 'Seguro Auto', 'Seguro de automóveis, motos e caminhões', 'seguro', 'Car', '#3B82F6', 1),
('residencial', 'Seguro Residencial', 'Seguro para residências e apartamentos', 'seguro', 'Home', '#10B981', 2),
('vida', 'Seguro de Vida', 'Seguro de vida individual e em grupo', 'seguro', 'Heart', '#EF4444', 3),
('empresarial', 'Seguro Empresarial', 'Seguro para empresas e comércios', 'seguro', 'Building', '#8B5CF6', 4),
('viagem', 'Seguro Viagem', 'Seguro para viagens nacionais e internacionais', 'seguro', 'Plane', '#F59E0B', 5),
('rc', 'Responsabilidade Civil', 'Seguro de responsabilidade civil profissional', 'seguro', 'Shield', '#6366F1', 6),
-- Consórcios
('consorcio_imovel', 'Consórcio Imobiliário', 'Consórcio para aquisição de imóveis', 'consorcio', 'Building2', '#14B8A6', 10),
('consorcio_veiculo', 'Consórcio de Veículos', 'Consórcio para aquisição de veículos', 'consorcio', 'Car', '#0EA5E9', 11),
('consorcio_servicos', 'Consórcio de Serviços', 'Consórcio para serviços diversos', 'consorcio', 'Wrench', '#A855F7', 12),
-- Saúde
('saude_individual', 'Plano de Saúde Individual', 'Plano de saúde para pessoa física', 'saude', 'HeartPulse', '#EC4899', 20),
('saude_familiar', 'Plano de Saúde Familiar', 'Plano de saúde para família', 'saude', 'Users', '#F43F5E', 21),
('saude_empresarial', 'Plano de Saúde Empresarial', 'Plano de saúde para empresas', 'saude', 'Building', '#FB7185', 22),
('odonto', 'Plano Odontológico', 'Plano odontológico individual ou familiar', 'saude', 'Smile', '#FDA4AF', 23),
-- Financiamentos
('financ_imovel', 'Financiamento Imobiliário', 'Financiamento para aquisição de imóveis', 'financiamento', 'Home', '#22C55E', 30),
('financ_veiculo', 'Financiamento de Veículos', 'Financiamento para aquisição de veículos', 'financiamento', 'Car', '#84CC16', 31),
('financ_pessoal', 'Empréstimo Pessoal', 'Empréstimo pessoal e crédito', 'financiamento', 'Wallet', '#A3E635', 32),
('financ_consignado', 'Crédito Consignado', 'Crédito consignado para aposentados e servidores', 'financiamento', 'CreditCard', '#BEF264', 33),
-- Previdência
('previdencia', 'Previdência Privada', 'Planos de previdência complementar', 'previdencia', 'PiggyBank', '#FCD34D', 40),
-- Capitalização
('capitalizacao', 'Título de Capitalização', 'Títulos de capitalização', 'capitalizacao', 'TrendingUp', '#FBBF24', 50)
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- RLS PARA NOVOS MÓDULOS
-- =====================================================
ALTER TABLE consorcios ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos_saude ENABLE ROW LEVEL SECURITY;
ALTER TABLE financiamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_consorcios" ON consorcios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clientes 
      WHERE clientes.id = consorcios.cliente_id 
      AND clientes.usuario_id::text = auth.uid()::text
    )
  );

CREATE POLICY "users_see_own_planos" ON planos_saude
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clientes 
      WHERE clientes.id = planos_saude.cliente_id 
      AND clientes.usuario_id::text = auth.uid()::text
    )
  );

CREATE POLICY "users_see_own_financiamentos" ON financiamentos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clientes 
      WHERE clientes.id = financiamentos.cliente_id 
      AND clientes.usuario_id::text = auth.uid()::text
    )
  );

-- =====================================================
-- TABELA DE ALERTAS AUTOMATICOS
-- =====================================================
CREATE TABLE IF NOT EXISTS alertas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    prioridade VARCHAR(20) DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    entidade_tipo VARCHAR(50),
    entidade_id UUID,
    data_referencia DATE,
    lido BOOLEAN DEFAULT false,
    enviado_email BOOLEAN DEFAULT false,
    enviado_whatsapp BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices para alertas
CREATE INDEX IF NOT EXISTS idx_alertas_usuario ON alertas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_alertas_tipo ON alertas(tipo);
CREATE INDEX IF NOT EXISTS idx_alertas_lido ON alertas(lido);
CREATE INDEX IF NOT EXISTS idx_alertas_prioridade ON alertas(prioridade);
CREATE INDEX IF NOT EXISTS idx_alertas_entidade ON alertas(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_alertas_created ON alertas(created_at DESC);

-- RLS para alertas
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_alertas" ON alertas
  FOR ALL USING (usuario_id::text = auth.uid()::text);

-- Tabela de relatorios enviados
CREATE TABLE IF NOT EXISTS relatorios_enviados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    dados JSONB,
    enviado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE CHECKLISTS DE SINISTRO
-- =====================================================
CREATE TABLE IF NOT EXISTS sinistro_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sinistro_id UUID NOT NULL REFERENCES sinistros(id) ON DELETE CASCADE,
    nome_documento VARCHAR(255) NOT NULL,
    obrigatorio BOOLEAN DEFAULT false,
    recebido BOOLEAN DEFAULT false,
    aprovado BOOLEAN DEFAULT false,
    documento_id UUID REFERENCES sinistro_documentos(id) ON DELETE SET NULL,
    data_recebimento TIMESTAMP WITH TIME ZONE,
    observacao TEXT,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices para checklists
CREATE INDEX IF NOT EXISTS idx_sinistro_checklists_sinistro ON sinistro_checklists(sinistro_id);
CREATE INDEX IF NOT EXISTS idx_sinistro_checklists_ordem ON sinistro_checklists(sinistro_id, ordem);

-- RLS para checklists
ALTER TABLE sinistro_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_checklists" ON sinistro_checklists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sinistros s
      JOIN apolices a ON s.apolice_id = a.id
      WHERE s.id = sinistro_checklists.sinistro_id
      AND a.usuario_id::text = auth.uid()::text
    )
  );

-- Tabela de extracoes de IA (se nao existir)
CREATE TABLE IF NOT EXISTS ia_extracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo VARCHAR(50) NOT NULL,
    arquivo_nome VARCHAR(255),
    arquivo_tamanho BIGINT,
    dados_extraidos JSONB,
    modelo VARCHAR(50),
    tokens_usados INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ia_extracoes_usuario ON ia_extracoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ia_extracoes_tipo ON ia_extracoes(tipo);
CREATE INDEX IF NOT EXISTS idx_ia_extracoes_created ON ia_extracoes(created_at DESC);

-- =====================================================
-- TRIGGERS PARA ALERTAS
-- =====================================================

-- Trigger para atualizar updated_at em alertas
CREATE OR REPLACE FUNCTION update_alertas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_alertas_updated_at
    BEFORE UPDATE ON alertas
    FOR EACH ROW
    EXECUTE FUNCTION update_alertas_updated_at();

-- Trigger para atualizar updated_at em checklists
CREATE TRIGGER trigger_sinistro_checklists_updated_at
    BEFORE UPDATE ON sinistro_checklists
    FOR EACH ROW
    EXECUTE FUNCTION update_alertas_updated_at();

-- =====================================================
-- TABELA DE CONFIGURACOES DE COMISSOES POR SEGURADORA
-- =====================================================
CREATE TABLE IF NOT EXISTS comissao_configuracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seguradora VARCHAR(255) NOT NULL,
    ramo VARCHAR(50) NOT NULL,
    percentual_comissao DECIMAL(5, 2) NOT NULL DEFAULT 0,
    percentual_repasse DECIMAL(5, 2) DEFAULT 0,
    percentual_imposto DECIMAL(5, 2) DEFAULT 0,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seguradora, ramo)
);

-- Indices para configuracoes de comissao
CREATE INDEX IF NOT EXISTS idx_comissao_config_seguradora ON comissao_configuracoes(seguradora);
CREATE INDEX IF NOT EXISTS idx_comissao_config_ramo ON comissao_configuracoes(ramo);
CREATE INDEX IF NOT EXISTS idx_comissao_config_ativo ON comissao_configuracoes(ativo);

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_comissao_config_updated_at
    BEFORE UPDATE ON comissao_configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCAO PARA CALCULAR COMISSAO AUTOMATICAMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_comissao_apolice()
RETURNS TRIGGER AS $$
DECLARE
    config_comissao RECORD;
    v_valor_bruto DECIMAL(12,2);
    v_valor_repasse DECIMAL(12,2);
    v_valor_imposto DECIMAL(12,2);
    v_valor_liquido DECIMAL(12,2);
BEGIN
    -- Buscar configuracao de comissao para a seguradora/ramo
    SELECT * INTO config_comissao
    FROM comissao_configuracoes
    WHERE seguradora = NEW.seguradora
    AND ramo = NEW.ramo
    AND ativo = true
    LIMIT 1;
    
    -- Se nao encontrar configuracao especifica, buscar configuracao generica da seguradora
    IF config_comissao IS NULL THEN
        SELECT * INTO config_comissao
        FROM comissao_configuracoes
        WHERE seguradora = NEW.seguradora
        AND ramo = 'todos'
        AND ativo = true
        LIMIT 1;
    END IF;
    
    -- Se encontrou configuracao, criar comissao
    IF config_comissao IS NOT NULL AND config_comissao.percentual_comissao > 0 THEN
        -- Calcular valores
        v_valor_bruto := NEW.valor_premio * (config_comissao.percentual_comissao / 100);
        v_valor_repasse := v_valor_bruto * (COALESCE(config_comissao.percentual_repasse, 0) / 100);
        v_valor_imposto := v_valor_bruto * (COALESCE(config_comissao.percentual_imposto, 0) / 100);
        v_valor_liquido := v_valor_bruto - v_valor_repasse - v_valor_imposto;
        
        -- Criar registro de comissao
        INSERT INTO comissoes (
            apolice_id,
            valor_bruto,
            descontos_json,
            valor_liquido,
            data_receita,
            status
        ) VALUES (
            NEW.id,
            v_valor_bruto,
            jsonb_build_object(
                'repasse', v_valor_repasse,
                'imposto', v_valor_imposto,
                'percentual_comissao', config_comissao.percentual_comissao,
                'percentual_repasse', config_comissao.percentual_repasse,
                'percentual_imposto', config_comissao.percentual_imposto
            ),
            v_valor_liquido,
            NEW.data_inicio,
            'pendente'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular comissao ao criar apolice
DROP TRIGGER IF EXISTS trigger_calcular_comissao_apolice ON apolices;
CREATE TRIGGER trigger_calcular_comissao_apolice
    AFTER INSERT ON apolices
    FOR EACH ROW
    EXECUTE FUNCTION calcular_comissao_apolice();

-- =====================================================
-- DADOS INICIAIS: CONFIGURACOES DE COMISSAO PADRAO
-- =====================================================
INSERT INTO comissao_configuracoes (seguradora, ramo, percentual_comissao, percentual_repasse, percentual_imposto, observacoes) VALUES
-- Porto Seguro
('Porto Seguro', 'auto', 20.00, 0, 6.38, 'Comissao padrao auto'),
('Porto Seguro', 'residencial', 25.00, 0, 6.38, 'Comissao padrao residencial'),
('Porto Seguro', 'vida', 30.00, 0, 6.38, 'Comissao padrao vida'),
('Porto Seguro', 'empresarial', 15.00, 0, 6.38, 'Comissao padrao empresarial'),
-- Bradesco Seguros
('Bradesco Seguros', 'auto', 18.00, 0, 6.38, 'Comissao padrao auto'),
('Bradesco Seguros', 'residencial', 22.00, 0, 6.38, 'Comissao padrao residencial'),
('Bradesco Seguros', 'vida', 28.00, 0, 6.38, 'Comissao padrao vida'),
-- SulAmerica
('SulAmerica', 'auto', 19.00, 0, 6.38, 'Comissao padrao auto'),
('SulAmerica', 'vida', 32.00, 0, 6.38, 'Comissao padrao vida'),
('SulAmerica', 'saude', 8.00, 0, 6.38, 'Comissao padrao saude'),
-- Allianz
('Allianz', 'auto', 17.00, 0, 6.38, 'Comissao padrao auto'),
('Allianz', 'residencial', 20.00, 0, 6.38, 'Comissao padrao residencial'),
('Allianz', 'empresarial', 12.00, 0, 6.38, 'Comissao padrao empresarial'),
-- Tokio Marine
('Tokio Marine', 'auto', 20.00, 0, 6.38, 'Comissao padrao auto'),
('Tokio Marine', 'residencial', 25.00, 0, 6.38, 'Comissao padrao residencial'),
-- Liberty
('Liberty', 'auto', 18.00, 0, 6.38, 'Comissao padrao auto'),
('Liberty', 'residencial', 22.00, 0, 6.38, 'Comissao padrao residencial'),
-- HDI
('HDI', 'auto', 19.00, 0, 6.38, 'Comissao padrao auto'),
('HDI', 'residencial', 23.00, 0, 6.38, 'Comissao padrao residencial'),
-- Mapfre
('Mapfre', 'auto', 18.00, 0, 6.38, 'Comissao padrao auto'),
('Mapfre', 'residencial', 22.00, 0, 6.38, 'Comissao padrao residencial'),
('Mapfre', 'vida', 30.00, 0, 6.38, 'Comissao padrao vida'),
-- Zurich
('Zurich', 'auto', 17.00, 0, 6.38, 'Comissao padrao auto'),
('Zurich', 'empresarial', 14.00, 0, 6.38, 'Comissao padrao empresarial'),
-- Generica para todas as seguradoras nao configuradas
('Outros', 'todos', 15.00, 0, 6.38, 'Comissao padrao generica')
ON CONFLICT (seguradora, ramo) DO NOTHING;
