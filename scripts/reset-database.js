require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "❌ DATABASE_URL não definida. Defina via variável de ambiente antes de rodar."
  );
  process.exit(1);
}

async function resetDatabase() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("🔌 Conectando ao Supabase PostgreSQL...");
    await client.connect();
    console.log("✅ Conectado!\n");

    // 1. Listar tabelas existentes
    console.log("📋 Listando tabelas existentes...");
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE '_realtime%'
    `);

    const existingTables = tablesResult.rows.map((r) => r.tablename);
    console.log(
      "Tabelas encontradas:",
      existingTables.length ? existingTables : "Nenhuma"
    );

    // 2. Dropar todas as tabelas existentes
    if (existingTables.length > 0) {
      console.log("\n🗑️  Removendo tabelas existentes...");
      for (const table of existingTables) {
        try {
          await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
          console.log(`   ✅ Removida: ${table}`);
        } catch (err) {
          console.log(`   ⚠️  Erro ao remover ${table}: ${err.message}`);
        }
      }
    }

    console.log("\n🗑️  Removendo tipos enum existentes...");
    const enumsResult = await client.query(`
      SELECT t.typname FROM pg_type t 
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
      WHERE n.nspname = 'public' AND t.typtype = 'e'
    `);
    for (const row of enumsResult.rows) {
      try {
        await client.query(`DROP TYPE IF EXISTS "${row.typname}" CASCADE`);
        console.log(`   ✅ Removido tipo: ${row.typname}`);
      } catch (err) {
        console.log(
          `   ⚠️  Erro ao remover tipo ${row.typname}: ${err.message}`
        );
      }
    }

    // Dropar funções existentes
    console.log("\n🗑️  Removendo funções existentes...");
    try {
      await client.query(
        `DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`
      );
      console.log("   ✅ Removida função update_updated_at_column");
    } catch (err) {}

    console.log("\n✅ Banco de dados limpo!");
    console.log("\n🚀 Criando novo schema baseado na especificação...\n");

    // 3. Criar novo schema
    const schema = `
    -- ============================================
    -- SCHEMA CRM CORRETORA DE SEGUROS
    -- Baseado em: especificacao-crm-corretora.md
    -- ============================================

    -- Enum types
    CREATE TYPE user_role AS ENUM ('admin', 'corretor', 'assistente');
    CREATE TYPE client_type AS ENUM ('pf', 'pj');
    CREATE TYPE policy_status AS ENUM ('cotacao', 'proposta', 'vigente', 'vencida', 'cancelada', 'arquivada');
    CREATE TYPE claim_status AS ENUM ('notificado', 'analise_inicial', 'documentacao', 'regulacao', 'cobertura_confirmada', 'indenizacao_processando', 'pago', 'recusado');
    CREATE TYPE commission_status AS ENUM ('pendente', 'recebida', 'paga');
    CREATE TYPE endorsement_status AS ENUM ('rascunho', 'enviado', 'aceito', 'emitido', 'recusado');
    CREATE TYPE proposal_status AS ENUM ('rascunho', 'enviada', 'aceita', 'emitida', 'recusada');
    CREATE TYPE message_status AS ENUM ('novo', 'respondido', 'arquivado');
    CREATE TYPE document_type AS ENUM ('rg', 'cpf', 'cnpj', 'cnh', 'contrato', 'apolice', 'proposta', 'cotacao', 'endosso', 'sinistro', 'boletim_ocorrencia', 'nota_fiscal', 'laudo', 'outro');
    CREATE TYPE insurance_branch AS ENUM ('auto', 'residencial', 'vida', 'saude', 'consorcio', 'financiamento', 'refinanciamento', 'empresarial', 'outro');
    CREATE TYPE transaction_type AS ENUM ('receita', 'despesa');

    -- ============================================
    -- USUÁRIOS (Corretores/Administradores)
    -- ============================================
    CREATE TABLE usuarios (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      nome VARCHAR(255) NOT NULL,
      role user_role DEFAULT 'corretor',
      avatar_url TEXT,
      telefone VARCHAR(20),
      ativo BOOLEAN DEFAULT true,
      ultimo_acesso TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- SEGURADORAS
    -- ============================================
    CREATE TABLE seguradoras (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome VARCHAR(255) NOT NULL,
      codigo_susep VARCHAR(50),
      cnpj VARCHAR(18),
      telefone VARCHAR(20),
      email VARCHAR(255),
      website TEXT,
      logo_url TEXT,
      contato_comercial VARCHAR(255),
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- CLIENTES
    -- ============================================
    CREATE TABLE clientes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tipo client_type NOT NULL,
      
      -- Dados PF
      cpf VARCHAR(14) UNIQUE,
      rg VARCHAR(20),
      nome VARCHAR(255) NOT NULL,
      data_nascimento DATE,
      profissao VARCHAR(100),
      estado_civil VARCHAR(50),
      genero VARCHAR(20),
      
      -- Dados PJ
      cnpj VARCHAR(18) UNIQUE,
      razao_social VARCHAR(255),
      nome_fantasia VARCHAR(255),
      inscricao_estadual VARCHAR(30),
      atividade VARCHAR(255),
      
      -- Contato
      telefone VARCHAR(20),
      telefone_secundario VARCHAR(20),
      whatsapp VARCHAR(20),
      email VARCHAR(255),
      
      -- Endereço
      cep VARCHAR(9),
      logradouro VARCHAR(255),
      numero VARCHAR(20),
      complemento VARCHAR(100),
      bairro VARCHAR(100),
      cidade VARCHAR(100),
      estado VARCHAR(2),
      
      -- Contatos de emergência
      contatos_emergencia JSONB DEFAULT '[]',
      
      -- Notas internas
      notas TEXT,
      
      -- Metadados
      corretor_id UUID REFERENCES usuarios(id),
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- APÓLICES
    -- ============================================
    CREATE TABLE apolices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      seguradora_id UUID REFERENCES seguradoras(id),
      
      numero VARCHAR(100),
      ramo insurance_branch NOT NULL,
      status policy_status DEFAULT 'vigente',
      
      -- Valores
      valor_premio DECIMAL(12,2),
      valor_franquia DECIMAL(12,2),
      valor_segurado DECIMAL(12,2),
      
      -- Datas
      data_inicio DATE,
      data_vencimento DATE,
      data_emissao DATE,
      
      -- Dados específicos por ramo (JSON flexível)
      dados_especificos JSONB DEFAULT '{}',
      
      -- Beneficiários
      beneficiarios JSONB DEFAULT '[]',
      
      -- Documentos anexados
      documentos JSONB DEFAULT '[]',
      
      -- Observações
      observacoes TEXT,
      
      -- Metadados
      corretor_id UUID REFERENCES usuarios(id),
      apolice_anterior_id UUID REFERENCES apolices(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- COBERTURAS
    -- ============================================
    CREATE TABLE coberturas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      apolice_id UUID NOT NULL REFERENCES apolices(id) ON DELETE CASCADE,
      nome VARCHAR(255) NOT NULL,
      descricao TEXT,
      limite DECIMAL(12,2),
      franquia DECIMAL(12,2),
      premio DECIMAL(12,2),
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- ENDOSSOS
    -- ============================================
    CREATE TABLE endossos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      apolice_id UUID NOT NULL REFERENCES apolices(id) ON DELETE CASCADE,
      numero VARCHAR(100),
      tipo VARCHAR(100) NOT NULL,
      descricao TEXT,
      status endorsement_status DEFAULT 'rascunho',
      
      -- Valores
      valor_adicional DECIMAL(12,2),
      valor_restituicao DECIMAL(12,2),
      
      -- Datas
      data_solicitacao DATE DEFAULT CURRENT_DATE,
      data_emissao DATE,
      data_vigencia DATE,
      
      -- Documentos
      documentos JSONB DEFAULT '[]',
      
      -- Histórico
      historico JSONB DEFAULT '[]',
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- PROPOSTAS
    -- ============================================
    CREATE TABLE propostas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      seguradora_id UUID REFERENCES seguradoras(id),
      
      numero VARCHAR(100),
      ramo insurance_branch NOT NULL,
      status proposal_status DEFAULT 'rascunho',
      
      -- Dados da proposta
      dados_propostos JSONB DEFAULT '{}',
      valor_premio DECIMAL(12,2),
      
      -- Datas
      data_criacao DATE DEFAULT CURRENT_DATE,
      data_envio DATE,
      data_aceite DATE,
      validade DATE,
      
      -- Documentos
      documentos JSONB DEFAULT '[]',
      
      -- Histórico de versões
      versoes JSONB DEFAULT '[]',
      
      corretor_id UUID REFERENCES usuarios(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- COTAÇÕES
    -- ============================================
    CREATE TABLE cotacoes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      
      ramo insurance_branch NOT NULL,
      dados_cotacao JSONB DEFAULT '{}',
      
      -- Comparativo de seguradoras
      comparativo JSONB DEFAULT '[]',
      
      -- Valor escolhido
      valor_selecionado DECIMAL(12,2),
      seguradora_selecionada_id UUID REFERENCES seguradoras(id),
      
      data_criacao DATE DEFAULT CURRENT_DATE,
      validade DATE,
      
      corretor_id UUID REFERENCES usuarios(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- SINISTROS
    -- ============================================
    CREATE TABLE sinistros (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      apolice_id UUID NOT NULL REFERENCES apolices(id) ON DELETE CASCADE,
      
      numero VARCHAR(100),
      status claim_status DEFAULT 'notificado',
      
      -- Dados do sinistro
      data_ocorrencia DATE NOT NULL,
      data_notificacao DATE DEFAULT CURRENT_DATE,
      descricao TEXT NOT NULL,
      local_ocorrencia TEXT,
      
      -- Danos
      tipo_dano VARCHAR(100),
      descricao_danos TEXT,
      
      -- Regulação
      regulador_nome VARCHAR(255),
      regulador_telefone VARCHAR(20),
      data_vistoria DATE,
      parecer TEXT,
      
      -- Valores
      valor_pretensao DECIMAL(12,2),
      valor_indenizado DECIMAL(12,2),
      data_pagamento DATE,
      
      -- Recusa
      motivo_recusa TEXT,
      
      -- Documentos
      documentos JSONB DEFAULT '[]',
      
      -- Timeline de eventos
      timeline JSONB DEFAULT '[]',
      
      corretor_id UUID REFERENCES usuarios(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- REGULAÇÃO DE SINISTRO (Timeline detalhada)
    -- ============================================
    CREATE TABLE regulacao_sinistro (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sinistro_id UUID NOT NULL REFERENCES sinistros(id) ON DELETE CASCADE,
      
      etapa VARCHAR(100) NOT NULL,
      descricao TEXT,
      data_evento TIMESTAMPTZ DEFAULT NOW(),
      
      -- Comunicação
      tipo_comunicacao VARCHAR(50),
      remetente VARCHAR(255),
      destinatario VARCHAR(255),
      conteudo TEXT,
      
      -- Documentos
      documentos JSONB DEFAULT '[]',
      
      usuario_id UUID REFERENCES usuarios(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- DOCUMENTOS
    -- ============================================
    CREATE TABLE documentos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
      apolice_id UUID REFERENCES apolices(id) ON DELETE SET NULL,
      sinistro_id UUID REFERENCES sinistros(id) ON DELETE SET NULL,
      
      tipo document_type NOT NULL,
      nome VARCHAR(255) NOT NULL,
      descricao TEXT,
      url TEXT NOT NULL,
      tamanho INTEGER,
      mime_type VARCHAR(100),
      
      -- Metadados extraídos por IA
      dados_extraidos JSONB DEFAULT '{}',
      ia_processado BOOLEAN DEFAULT false,
      
      usuario_id UUID REFERENCES usuarios(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- MENSAGENS WHATSAPP
    -- ============================================
    CREATE TABLE mensagens_whatsapp (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
      
      message_id VARCHAR(255),
      remetente VARCHAR(50) NOT NULL,
      destinatario VARCHAR(50),
      
      tipo VARCHAR(50) DEFAULT 'text',
      conteudo TEXT,
      
      -- Mídia
      media_url TEXT,
      media_type VARCHAR(50),
      
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      status message_status DEFAULT 'novo',
      lido BOOLEAN DEFAULT false,
      
      -- Atribuição
      respondido_por_id UUID REFERENCES usuarios(id),
      data_resposta TIMESTAMPTZ,
      
      -- Metadados
      metadata JSONB DEFAULT '{}',
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- COMISSÕES
    -- ============================================
    CREATE TABLE comissoes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      apolice_id UUID NOT NULL REFERENCES apolices(id) ON DELETE CASCADE,
      
      valor_bruto DECIMAL(12,2) NOT NULL,
      percentual_comissao DECIMAL(5,2),
      descontos DECIMAL(12,2) DEFAULT 0,
      impostos DECIMAL(12,2) DEFAULT 0,
      valor_liquido DECIMAL(12,2),
      
      data_previsao DATE,
      data_recebimento DATE,
      status commission_status DEFAULT 'pendente',
      
      observacoes TEXT,
      
      corretor_id UUID REFERENCES usuarios(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- TRANSAÇÕES FINANCEIRAS
    -- ============================================
    CREATE TABLE transacoes_financeiras (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      tipo transaction_type NOT NULL,
      categoria VARCHAR(100),
      descricao TEXT NOT NULL,
      valor DECIMAL(12,2) NOT NULL,
      
      data_transacao DATE DEFAULT CURRENT_DATE,
      data_vencimento DATE,
      data_pagamento DATE,
      
      -- Referências opcionais
      cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
      apolice_id UUID REFERENCES apolices(id) ON DELETE SET NULL,
      comissao_id UUID REFERENCES comissoes(id) ON DELETE SET NULL,
      
      pago BOOLEAN DEFAULT false,
      comprovante_url TEXT,
      
      observacoes TEXT,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- TAREFAS E AGENDA
    -- ============================================
    CREATE TABLE tarefas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      tipo VARCHAR(100) NOT NULL,
      titulo VARCHAR(255) NOT NULL,
      descricao TEXT,
      
      -- Prioridade
      prioridade INTEGER DEFAULT 3,
      urgente BOOLEAN DEFAULT false,
      
      -- Datas
      data_vencimento DATE,
      data_lembrete TIMESTAMPTZ,
      data_conclusao TIMESTAMPTZ,
      
      -- Referências
      cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
      apolice_id UUID REFERENCES apolices(id) ON DELETE SET NULL,
      sinistro_id UUID REFERENCES sinistros(id) ON DELETE SET NULL,
      
      -- Status
      concluida BOOLEAN DEFAULT false,
      
      -- Google Calendar
      google_event_id VARCHAR(255),
      
      usuario_id UUID REFERENCES usuarios(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- HISTÓRICO DE IMPORTAÇÕES
    -- ============================================
    CREATE TABLE importacoes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      tipo VARCHAR(50) NOT NULL,
      arquivo_nome VARCHAR(255) NOT NULL,
      arquivo_url TEXT,
      
      total_linhas INTEGER DEFAULT 0,
      linhas_sucesso INTEGER DEFAULT 0,
      linhas_erro INTEGER DEFAULT 0,
      
      mapeamento JSONB DEFAULT '{}',
      erros JSONB DEFAULT '[]',
      
      status VARCHAR(50) DEFAULT 'processando',
      
      usuario_id UUID REFERENCES usuarios(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    -- ============================================
    -- ATIVIDADES (AUDIT LOG)
    -- ============================================
    CREATE TABLE atividades (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      acao VARCHAR(100) NOT NULL,
      entidade VARCHAR(50) NOT NULL,
      entidade_id UUID,
      
      dados_anteriores JSONB,
      dados_novos JSONB,
      
      ip_address VARCHAR(45),
      user_agent TEXT,
      
      usuario_id UUID REFERENCES usuarios(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- CONFIGURAÇÕES DO SISTEMA
    -- ============================================
    CREATE TABLE configuracoes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      chave VARCHAR(100) UNIQUE NOT NULL,
      valor JSONB,
      descricao TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- TEMPLATES DE MENSAGEM
    -- ============================================
    CREATE TABLE templates_mensagem (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome VARCHAR(100) NOT NULL,
      categoria VARCHAR(50),
      conteudo TEXT NOT NULL,
      variaveis JSONB DEFAULT '[]',
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ============================================
    -- ÍNDICES PARA PERFORMANCE
    -- ============================================
    CREATE INDEX idx_clientes_cpf ON clientes(cpf);
    CREATE INDEX idx_clientes_cnpj ON clientes(cnpj);
    CREATE INDEX idx_clientes_nome ON clientes(nome);
    CREATE INDEX idx_clientes_telefone ON clientes(telefone);
    CREATE INDEX idx_clientes_whatsapp ON clientes(whatsapp);
    CREATE INDEX idx_clientes_email ON clientes(email);

    CREATE INDEX idx_apolices_cliente ON apolices(cliente_id);
    CREATE INDEX idx_apolices_numero ON apolices(numero);
    CREATE INDEX idx_apolices_status ON apolices(status);
    CREATE INDEX idx_apolices_vencimento ON apolices(data_vencimento);
    CREATE INDEX idx_apolices_ramo ON apolices(ramo);

    CREATE INDEX idx_sinistros_cliente ON sinistros(cliente_id);
    CREATE INDEX idx_sinistros_apolice ON sinistros(apolice_id);
    CREATE INDEX idx_sinistros_status ON sinistros(status);
    CREATE INDEX idx_sinistros_numero ON sinistros(numero);

    CREATE INDEX idx_mensagens_cliente ON mensagens_whatsapp(cliente_id);
    CREATE INDEX idx_mensagens_status ON mensagens_whatsapp(status);
    CREATE INDEX idx_mensagens_timestamp ON mensagens_whatsapp(timestamp);

    CREATE INDEX idx_comissoes_apolice ON comissoes(apolice_id);
    CREATE INDEX idx_comissoes_status ON comissoes(status);

    CREATE INDEX idx_tarefas_usuario ON tarefas(usuario_id);
    CREATE INDEX idx_tarefas_vencimento ON tarefas(data_vencimento);
    CREATE INDEX idx_tarefas_concluida ON tarefas(concluida);

    CREATE INDEX idx_documentos_cliente ON documentos(cliente_id);
    CREATE INDEX idx_documentos_apolice ON documentos(apolice_id);
    CREATE INDEX idx_documentos_tipo ON documentos(tipo);

    CREATE INDEX idx_atividades_usuario ON atividades(usuario_id);
    CREATE INDEX idx_atividades_entidade ON atividades(entidade, entidade_id);
    CREATE INDEX idx_atividades_created ON atividades(created_at);

    -- ============================================
    -- TRIGGERS PARA UPDATED_AT
    -- ============================================
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_seguradoras_updated_at BEFORE UPDATE ON seguradoras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_apolices_updated_at BEFORE UPDATE ON apolices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_endossos_updated_at BEFORE UPDATE ON endossos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_propostas_updated_at BEFORE UPDATE ON propostas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_cotacoes_updated_at BEFORE UPDATE ON cotacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_sinistros_updated_at BEFORE UPDATE ON sinistros FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_comissoes_updated_at BEFORE UPDATE ON comissoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_transacoes_updated_at BEFORE UPDATE ON transacoes_financeiras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_tarefas_updated_at BEFORE UPDATE ON tarefas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_configuracoes_updated_at BEFORE UPDATE ON configuracoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates_mensagem FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- ============================================
    -- DADOS INICIAIS
    -- ============================================
    
    -- Usuário admin padrão
    INSERT INTO usuarios (email, nome, role) VALUES 
    ('admin@chrono.com', 'Administrador', 'admin');

    -- Seguradoras populares
    INSERT INTO seguradoras (nome, codigo_susep) VALUES 
    ('Porto Seguro', '05193'),
    ('Bradesco Seguros', '05185'),
    ('SulAmérica', '05061'),
    ('Allianz Seguros', '08755'),
    ('Tokio Marine', '06190'),
    ('HDI Seguros', '03371'),
    ('Liberty Seguros', '01571'),
    ('Mapfre', '06122'),
    ('Zurich', '07242'),
    ('Azul Seguros', '04080'),
    ('Itaú Seguros', '03141'),
    ('Caixa Seguradora', '00329'),
    ('Generali', '04600');

    -- Configurações padrão
    INSERT INTO configuracoes (chave, valor, descricao) VALUES 
    ('dias_alerta_renovacao', '30', 'Dias antes do vencimento para alertar renovação'),
    ('prazo_sinistro_susep', '30', 'Prazo SUSEP para retorno após documentação completa'),
    ('prazo_endosso', '15', 'Prazo máximo para emissão de endosso');

    -- Templates de mensagem WhatsApp
    INSERT INTO templates_mensagem (nome, categoria, conteudo, variaveis) VALUES 
    ('Boas-vindas', 'atendimento', 'Olá {{nome}}! Bem-vindo à nossa corretora. Como posso ajudá-lo hoje?', '["nome"]'),
    ('Renovação', 'renovacao', 'Olá {{nome}}! Sua apólice {{numero}} vence em {{dias}} dias. Gostaria de renovar?', '["nome", "numero", "dias"]'),
    ('Sinistro Abertura', 'sinistro', 'Olá {{nome}}! Registramos seu sinistro com o número {{numero}}. Acompanharemos todo o processo.', '["nome", "numero"]'),
    ('Documentos Recebidos', 'documentos', 'Olá {{nome}}! Recebemos os documentos solicitados. Entraremos em contato em breve.', '["nome"]');

    SELECT 'Schema criado com sucesso!' as resultado;
    `;

    await client.query(schema);
    console.log("✅ Schema criado com sucesso!");

    // 4. Verificar tabelas criadas
    console.log("\n📋 Verificando tabelas criadas...");
    const newTablesResult = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'pg_%'
      ORDER BY tablename
    `);

    console.log("Tabelas criadas:");
    newTablesResult.rows.forEach((r) => console.log(`   ✅ ${r.tablename}`));

    console.log("\n🎉 Database resetado e configurado com sucesso!");
  } catch (error) {
    console.error("❌ Erro:", error.message);
    throw error;
  } finally {
    await client.end();
    console.log("\n🔌 Conexão encerrada.");
  }
}

resetDatabase();
