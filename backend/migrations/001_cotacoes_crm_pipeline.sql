-- Migration: Add CRM Pipeline fields to cotacoes table
-- Date: 2026-01-07
-- Description: Adds sales pipeline status tracking, follow-up scheduling, and negotiation history

-- ============================================
-- 1. Add new columns to cotacoes table
-- ============================================

-- Status do pipeline de vendas
ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS status_pipeline TEXT DEFAULT 'nova' 
  CHECK (status_pipeline IN ('nova', 'em_cotacao', 'enviada', 'em_negociacao', 'fechada_ganha', 'fechada_perdida'));

-- Datas importantes do pipeline
ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS data_envio TIMESTAMPTZ;
ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS data_fechamento TIMESTAMPTZ;

-- Follow-up e negociacao
ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS proximo_contato DATE;
ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS valor_estimado DECIMAL(12,2);
ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS motivo_perda TEXT;
ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS notas_negociacao TEXT;

-- Updated_at se nao existir
ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 2. Create cotacao_historico table for tracking interactions
-- ============================================

CREATE TABLE IF NOT EXISTS cotacao_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id UUID NOT NULL REFERENCES cotacoes(id) ON DELETE CASCADE,
  
  -- Tipo de evento
  tipo_evento TEXT DEFAULT 'anotacao' 
    CHECK (tipo_evento IN ('ligacao', 'email', 'whatsapp', 'reuniao', 'anotacao', 'mudanca_status', 'follow_up_agendado')),
  
  -- Status changes (for pipeline tracking)
  status_anterior TEXT,
  status_novo TEXT,
  
  -- Event details
  notas TEXT,
  resultado TEXT CHECK (resultado IS NULL OR resultado IN ('positivo', 'neutro', 'negativo')),
  
  -- Metadata
  usuario_id UUID,
  data_evento TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cotacao_historico_cotacao_id ON cotacao_historico(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_historico_data_evento ON cotacao_historico(data_evento DESC);
CREATE INDEX IF NOT EXISTS idx_cotacoes_status_pipeline ON cotacoes(status_pipeline);
CREATE INDEX IF NOT EXISTS idx_cotacoes_proximo_contato ON cotacoes(proximo_contato);

-- ============================================
-- 3. Create tarefas table if not exists (for Foco do Dia)
-- ============================================

CREATE TABLE IF NOT EXISTS tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT DEFAULT 'geral' CHECK (tipo IN ('renovacao', 'vencimento', 'sinistro', 'pagamento', 'follow_up', 'geral')),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  apolice_id UUID REFERENCES apolices(id) ON DELETE SET NULL,
  cotacao_id UUID REFERENCES cotacoes(id) ON DELETE SET NULL,
  
  descricao TEXT NOT NULL,
  data_vencimento DATE NOT NULL,
  prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta')),
  concluida BOOLEAN DEFAULT FALSE,
  
  usuario_responsavel UUID,
  observacoes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarefas_data_vencimento ON tarefas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_tarefas_concluida ON tarefas(concluida);
CREATE INDEX IF NOT EXISTS idx_tarefas_cliente_id ON tarefas(cliente_id);

-- ============================================
-- 4. Update existing cotacoes to have default status
-- ============================================

UPDATE cotacoes SET status_pipeline = 'nova' WHERE status_pipeline IS NULL;
UPDATE cotacoes SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;

-- ============================================
-- 5. RLS Policies (if using Supabase Auth)
-- ============================================

-- Enable RLS
ALTER TABLE cotacao_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

-- Policies for cotacao_historico (adjust based on your auth setup)
CREATE POLICY IF NOT EXISTS "Users can view cotacao_historico" ON cotacao_historico
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can insert cotacao_historico" ON cotacao_historico
  FOR INSERT WITH CHECK (true);

-- Policies for tarefas
CREATE POLICY IF NOT EXISTS "Users can view tarefas" ON tarefas
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can manage tarefas" ON tarefas
  FOR ALL USING (true);

-- ============================================
-- 6. Trigger to auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_cotacoes_updated_at ON cotacoes;
CREATE TRIGGER update_cotacoes_updated_at
  BEFORE UPDATE ON cotacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tarefas_updated_at ON tarefas;
CREATE TRIGGER update_tarefas_updated_at
  BEFORE UPDATE ON tarefas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
