# 📋 ESPECIFICAÇÃO TÉCNICA - Sistema de Gestão Completo para Corretora de Seguros

**Data:** Janeiro 2026  
**Versão:** 1.1  
**Status:** Especificação de Produto (Atualizado com Automações Detalhadas)

---

## 📑 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Módulos Principais](#módulos-principais)
4. [Fluxos de Negócio](#fluxos-de-negócio)
5. [Automações Detalhadas](#automações-detalhadas)
6. [Especificações Técnicas](#especificações-técnicas)
7. [Roadmap de Desenvolvimento](#roadmap-de-desenvolvimento)
8. [Considerações de Segurança](#considerações-de-segurança)

---

## 📖 FILOSOFIA: CADERN0 DIGITAL

### O que é o Sistema?

Este é um **sistema de caderno digital** para corretores de seguros. Ele funciona como um registro digital e organizacional de todas as operações, mas **não substitui a interação manual do corretor com as seguradoras**.

### Princípios Fundamentais

1. **Registro Manual, Organização Automática**

   - Corretor interage com seguradoras como sempre fez (WhatsApp, email, telefone, portais)
   - Sistema registra todas as etapas manualmente inseridas
   - Sistema organiza, alerta e visualiza os dados automaticamente

2. **IA como Assistente, não como Automação**

   - OCR facilita leitura de documentos (apólices, endossos, etc)
   - IA extrai dados automaticamente, mas decisão é sempre manual
   - Não há integração automática com APIs de seguradoras

3. **Sem Dependência de APIs de Seguradoras**
   - O sistema não se conecta diretamente aos sistemas das seguradoras
   - Não há emissão automática de apólices
   - Não há consulta em tempo real de status
   - Tudo é registrado manualmente pelo corretor

### Fluxo Típico de Operação

```
Cenário: Nova Cotação de Auto

1. Cliente contata corretor (WhatsApp)
2. Corretor abre sistema → Cria cotação manual
3. Corretor contata 3 seguradoras (WhatsApp/Email/Telefone)
4. Corretor recebe propostas das seguradoras (PDFs)
5. Corretor registra propostas no sistema:
   - Seguradora A: R$ 3.500
   - Seguradora B: R$ 3.800
   - Seguradora C: R$ 3.200
6. Sistema gera comparativo automático
7. Corretor envia proposta ao cliente
8. Cliente aceita seguradora C
9. Corretor solicita emissão à seguradora C
10. Corretor recebe PDF da apólice
11. Corretor cadastra no sistema:
    - Opção 1: Digita dados manualmente
    - Opção 2: Upload do PDF → IA extrai → Corretor confirma
12. Sistema cria alerta de renovação (30 dias antes)
```

### O que o sistema NÃO faz

- ❌ Não se conecta a APIs de seguradoras
- ❌ Não emite apólices automaticamente
- ❌ Não consulta status de sinistros em tempo real
- ❌ Não busca cotações automaticamente
- ❌ Não calcula prêmios automaticamente

### O que o sistema FAZ

- ✅ Registra manualmente todas as operações
- ✅ Organiza dados por cliente, apólice, sinistro
- ✅ Gera alertas automáticos (vencimentos, prazos)
- ✅ Cria timeline manual de processos
- ✅ Usa IA para facilitar leitura de documentos (OCR)
- ✅ Integra com WhatsApp (Evolution API) para CRM
- ✅ Armazena documentos PDF, imagens, etc
- ✅ Gera relatórios e dashboards
- ✅ Permite busca rápida e inteligente
- ✅ **AUTOMATIZA muitas tarefas internas** (veja seção Automações)

---

## Visão Geral

---

### Objetivo

Criar uma plataforma web de **caderno digital** para corretora de seguros brasileira, funcionando como ferramenta de registro e organização manual, centralizando:

- Gestão de clientes (seguros, planos de saúde, consórcios, financiamentos)
- Registro manual de todo ciclo de apólices (cotação → proposta → emissão → renovação → sinistro)
- Rastreamento manual de sinistros com timeline completa
- CRM integrado com WhatsApp Business
- IA para extração de dados de documentos (OCR - facilitação, não automação)
- Controle manual de comissões e financeiro
- Dashboard de clientes com histórico completo

**Filosofia do Sistema:**

- **Caderno Digital:** O corretor interage manualmente com seguradoras (WhatsApp, email, telefone, portais)
- **Registro e Organização:** O sistema registra todas as etapas manualmente inseridas
- **IA como Assistente:** OCR facilita leitura de documentos, mas decisão é sempre manual
- **Sem APIs de Seguradoras:** Nenhuma integração automática com sistemas das seguradoras

### Stack Tecnológico

**Frontend:**

- React 18+ (TypeScript)
- Vite (build tool)
- TailwindCSS (design system)
- Zustand (state management)
- React Query (data fetching)
- Framer Motion (animations)

**Backend:**

- Node.js + Express/NestJS
- Supabase (PostgreSQL + Auth)
- Vercel (deployment frontend)
- Railway (deployment backend)
- Redis (cache + sessions)

**Integrações Externas:**

- Supabase (Database)
- Google Calendar API
- Evolution API (WhatsApp Business)
- OpenAI/Claude (IA para OCR)
- Stripe/Pix (pagamentos)

**Deployment:**

- Vercel: Frontend SPA
- Railway: Backend Node.js + PostgreSQL
- Supabase: Database + Auth

---

## Arquitetura do Sistema

### Modelo de Dados Principal

```
CLIENTE
├── Dados Pessoais/Jurídicos
├── Contacto
├── Documentos
└── Relacionamentos
    ├── Apólices
    ├── Sinistros
    ├── Mensagens WhatsApp
    ├── Pagamentos
    └── Comissões

APÓLICE
├── Dados da Apólice
├── Ramo (Seguro Auto, Residencial, Vida, Saúde, Consórcio, Financiamento)
├── Seguradora
├── Coberturas
├── Histórico de Endossos
├── Timeline de Eventos
└── Documentos

SINISTRO
├── Identificação
├── Data de Ocorrência
├── Descrição do Dano
├── Documentos Anexados
├── Timeline de Regulação
├── Comunicação com Seguradora
├── Pagamento
└── Status (Notificado → Análise → Indenizado/Recusado)

ENDOSSO/PROPOSTA/COTAÇÃO
├── Tipo de Documento
├── Dados Originais
├── Alterações Propostas
├── Valor Novo
├── Status (Rascunho → Enviado → Aceito → Emitido)
└── Histórico de Versões

MENSAGEM_WHATSAPP
├── Identificação
├── Remetente
├── Conteúdo
├── Documentos
├── Timestamp
├── Lido
└── Respondido_Por (usuário do sistema)

COMISSÃO
├── Apólice
├── Valor Bruto
├── Descontos/Impostos
├── Valor Líquido
├── Data de Recebimento
├── Status (Pendente → Recebida → Paga)
└── Histórico
```

### Estrutura de Banco de Dados (Supabase/PostgreSQL)

```sql
-- Tabelas Principais
- usuarios (id, email, nome, role, ativo)
- clientes (id, tipo, cpf/cnpj, nome, contato, dados, documentos_json, data_criacao)
- apolices (id, cliente_id, ramo, seguradora_id, numero, valor_premio, data_inicio, data_vencimento, status)
- coberturas (id, apolice_id, nome, limite, franquia, premio)
- endossos (id, apolice_id, tipo, data_solicitacao, status, documentos_json)
- propostas (id, cliente_id, ramo, dados_propostos, valor, status)
- cotacoes (id, cliente_id, ramo, dados_cotacao, valor, data_criacao)
- sinistros (id, cliente_id, apolice_id, numero, data_ocorrencia, descricao, status)
- regulacao_sinistro (id, sinistro_id, etapa, data, comunicacao, documentos_json)
- documentos (id, cliente_id, tipo, url, data_upload, metadata_json)
- mensagens_whatsapp (id, cliente_id, remetente, conteudo, timestamp, lido, respondido_por_id)
- comissoes (id, apolice_id, valor_bruto, valor_liquido, data_receita, status)
- transacoes_financeiras (id, tipo, descricao, valor, data, status)
- tarefas_agenda (id, tipo, cliente_id, apolice_id, data_vencimento, descricao, concluida)
```

---

## Módulos Principais

### 1️⃣ GESTÃO DE CLIENTES

**Funcionalidades:**

- ✅ Cadastro de cliente (PF/PJ) com validação de CPF/CNPJ
- ✅ Busca fuzzy por nome/CPF/CNPJ
- ✅ Dashboard do cliente com:
  - Informações pessoais
  - Todas as apólices ativas
  - Histórico de sinistros
  - Todas as mensagens WhatsApp
  - Timeline de eventos (renovações, vencimentos)
  - Documentos anexados
  - Histórico de comissões
- ✅ Upload de documentos (Selfie, RG, CNH, Contrato, etc)
- ✅ Histórico de atividades
- ✅ Notas internas (anotações do corretor)
- ✅ Contatos de emergência

**Campos do Cliente:**

```
PF: CPF, RG, Nome, Data Nascimento, Profissão, Estado Civil, Telefone, Email, Endereço
PJ: CNPJ, Razão Social, Nome Fantasia, Inscrição Estadual, Atividade, Contato Comercial
```

### 2️⃣ GESTÃO DE APÓLICES

**Ciclo de Vida (Registro Manual):**

```
Cotação (Manual) → Proposta (Manual) → Emissão (Recebe PDF Seguradora) → Cadastro (Manual/IA) → Vigência → Renovação (Manual) → Cancelamento (Manual) → Arquivo
```

**Funcionalidades:**

- ✅ **Cadastro manual de apólice** digitado pelo corretor
- ✅ **Importação via PDF com IA:** Sistema extrai dados automaticamente do PDF, usuário confirma
- ✅ **Ramos suportados:**

  - Auto (Casco, RCF, Combo)
  - Residencial (Contenção, Riscos Nomeados)
  - Vida (Seguro de Vida individual/coletivo)
  - Saúde (Planos ambulatorial, hospitalar, odontológico)
  - Consórcios (Bens móveis, imóveis)
  - Financiamentos (Pessoa Física, Jurídica)
  - Refinanciamentos

- ✅ **Informações da Apólice (digitadas ou extraídas via IA):**

  - Número da apólice
  - Seguradora
  - Data início/término
  - Prêmio
  - Coberturas (com limites e franquias)
  - Beneficiários
  - Documentos anexados
  - Status (Vigente, Vencida, Cancelada)

- ✅ **Notas manuais do corretor:** Campos para registrar observações, prazos, protocolos de contato
- ✅ **Alertas de vencimento:** Sistema alerta 30 dias antes
- ✅ **Histórico de alterações:** Registro manual de mudanças

### 3️⃣ GESTÃO DE ENDOSSOS

**Fluxo de Endosso (Registro Manual - conforme SUSEP):**

```
Solicitação do Cliente → Corretor Registra → Corretor Contata Seguradora → Recebe Proposta → Confirma Cliente → Recebe Endosso → Registra no Sistema
```

**Funcionalidades:**

- ✅ **Registro manual de alteração solicitada** pelo cliente
- ✅ **Campo para observações:** Descrição detalhada da alteração
- ✅ **Campo para dados da seguradora:** Protocolo, contato, prazo
- ✅ **Campo para proposta de valor:** Corretor digita valor recebido da seguradora
- ✅ **Registro de prazos:** Sistema alerta quando prazo está próximo (máx 15 dias úteis)
- ✅ **Lista de documentos necessários:** Checklist por tipo de endosso (manual)
- ✅ **Histórico de comunicações:** Registro manual de contatos com seguradora
- ✅ **Upload de documentos:** PDF do endosso emitido pela seguradora
- ✅ **Histórico de todos os endossos:** Lista cronológica completa

### 4️⃣ GESTÃO DE PROPOSTAS E COTAÇÕES

**Fluxo de Cotação (Registro Manual):**

```
Cliente Solicita → Corretor Cria Cotação Manual → Contata Seguradoras (WhatsApp/Email/Telefone) → Registra Propostas Recebidas → Apresenta ao Cliente → Segue Acompanhamento Manual
```

**Funcionalidades:**

- ✅ **Criação de cotação manual:** Corretor digita dados do cliente
- ✅ **Campo para dados de contato com seguradoras:** Data, hora, contato, resultado
- ✅ **Registro de múltiplas propostas:** Corretor adiciona propostas de diferentes seguradoras manualmente
- ✅ **Comparativo de prêmios e coberturas:** Sistema exibe tabela comparativa
- ✅ **Impressão da proposta:** Gera PDF para enviar ao cliente
- ✅ **Rastreamento de status manual:** Rascunho → Em Negociação → Aceita → Emitida
- ✅ **Notas de acompanhamento:** Campo para registrar conversas com cliente
- ✅ **Upload de documentos:** Propostas recebidas via email/WhatsApp
- ✅ **Upload de documento de aceitação:** Assinatura/confirmacao do cliente

### 5️⃣ GESTÃO DE SINISTROS (⭐ CRÍTICO)

**Ciclo de Sinistro (Registro Manual - conforme mercado brasileiro):**

```
Notificação → Abertura (Manual) → Documentação (Upload) → Contato Seguradora (Manual) → Regulação (Registro Timeline) → Pagamento/Recusa → Encerramento
```

**Funcionalidades:**

- ✅ **Abertura rápida de sinistro manual:**

  - Data de ocorrência
  - Descrição do evento
  - Número do sinistro (recebido da seguradora)
  - Foto/documento inicial

- ✅ **Upload de documentos:** Boletim de Ocorrência, Notas Fiscais, Recibos, Fotos, Laudos, etc
- ✅ **Registro de comunicações com seguradora:**

  - Data de contato
  - Responsável na seguradora
  - Protocolo
  - Observações

- ✅ **Timeline de regulação manual:**

  - Data recebimento pela seguradora
  - Regulador/Perito (nome digitado)
  - Datas de vistoria (registradas manualmente)
  - Solicitações de documentos (campo de texto)
  - Parecer inicial (campo de texto)
  - Status de cobertura (Aceito/Recusado)
  - Data de indenização (data)
  - Valor pago (valor numérico)

- ✅ **Registro de prazos:** Sistema alerta 30 dias (SUSEP) após últimos documentos
- ✅ **Notas de acompanhamento ao cliente:** Campo para registrar conversas
- ✅ **Gestão de recusas:** Campo para justificativa
- ✅ **Histórico completo:** Timeline manual de todas as interações

**Status de Sinistro (Manual):**

```
Aberto → Em Andamento → Aguardando Documentos → Em Regulação →
Cobertura Confirmada → Aguardando Pagamento → Pago ✓
                         ↓
                   Recusado → Justificativa Registrada
```

### 6️⃣ AGENDA E LEMBRETES

**Funcionalidades:**

- ✅ Integração com Google Calendar
- ✅ Automatização de datas críticas:
  - Renovações de apólices (30 dias antes)
  - Vencimentos de coberturas
  - Datas de sinistros
  - Pagamentos de parcelas
  - Prazos de documentação
- ✅ Notificações push/email
- ✅ Checklist de tarefas
- ✅ Priorização de tarefas urgentes

### 7️⃣ CRM + WHATSAPP BUSINESS (⭐ DIFERENCIAE)

**Integrações:**

- ✅ Evolution API como middleware para WhatsApp Business
- ✅ Sincronização automática de mensagens para CRM
- ✅ Histórico de conversas por cliente
- ✅ Anexação de documentos em mensagens

**Funcionalidades:**

- ✅ Caixa de entrada unificada (todas as conversas)
- ✅ Filtros por:
  - Status (Novo, Respondido, Arquivado)
  - Cliente
  - Tipo de assunto
  - Data
- ✅ Atribuição de conversa para usuário (quem vai atender)
- ✅ Respostas rápidas (templates pré-configurados)
- ✅ Notificações em tempo real de mensagens
- ✅ Histórico completo de conversa por cliente
- ✅ Captura de dados durante conversa:
  - Informações de sinistro via WhatsApp
  - Pedidos de cotação
  - Confirmações de documentos
- ✅ Dashboard de métricas:
  - Tempo médio de resposta
  - Taxa de resolução
  - Volume de mensagens por usuário

**Sugestões de Funcionalidades WhatsApp:**

1. **Atribuição Automática:** Distribuir conversas entre corretores conforme carga
2. **Chatbot Inteligente:** Triagem inicial (Sinistro/Cotação/Renovação/Dúvida)
3. **Confirmação de Documentos:** Cliente envia documento via WhatsApp → Sistema valida
4. **Avisos Automáticos:** Renovação/Vencimento/Sinistro enviados via WhatsApp
5. **Status de Sinistro:** Cliente rastreia sinistro pelo WhatsApp
6. **Agendamento:** Marcar reunião com cliente via WhatsApp

### 8️⃣ IA - EXTRAÇÃO AUTOMÁTICA DE DADOS (⭐ PREMIUM)

**Tecnologia:**

- OCR com IA (Claude/GPT-4V ou solução especializada como Parseur/Dify)
- Processamento de múltiplos formatos: PDF, JPG, PNG
- Treinamento contextual por ramo de seguro

**Funcionalidades:**

- ✅ Upload de documento (Apólice/Proposta/Endosso/Cotação)
- ✅ IA extrai automaticamente:
  - Tipo de documento (identificação automática)
  - Ramo de seguro
  - Seguradora
  - Número da apólice
  - Data de vigência
  - Prêmio
  - Coberturas (com limites)
  - Beneficiários
  - Valor do endosso
  - Observações importantes
- ✅ Revisão do usuário (confirmar dados extraídos)
- ✅ Cadastro automático no sistema após confirmação
- ✅ Aprendizado contínuo (melhor com mais documentos)

**Campos Extraídos por Ramo:**

**Auto:**

- Motorista
- Veículo (Placa/Chassi/Ano)
- Coberturas (Casco/RCF/Vidro)
- Franquias

**Saúde:**

- Beneficiário principal
- Dependentes
- Tipo de plano
- Enfermarias cobertas
- Carências

**Vida:**

- Segurado
- Beneficiários
- Capital segurado
- Modalidade (Renda/Indenização)

**Consórcio/Financiamento:**

- Bem descrito
- Valor
- Parcelas
- Banco/Financeira

### 9️⃣ GESTÃO FINANCEIRA

**Funcionalidades:**

- ✅ Controle de comissões:
  - Comissão bruta por apólice
  - Descontos/Impostos automáticos
  - Comissão líquida
  - Data de recebimento da seguradora
  - Status (Pendente/Recebida/Paga)
- ✅ Fluxo de caixa:
  - Receitas (prêmios recebidos)
  - Despesas operacionais
  - Impostos
  - Repassos
- ✅ Controle de contas a receber:
  - Clientes com parcelas pendentes
  - Alertas de atraso
  - Histórico de pagamentos
- ✅ Controle de contas a pagar:
  - Comissões a seguradoras
  - Custos operacionais
  - Impostos
- ✅ Relatórios financeiros:
  - Receita por produto (Seguros/Saúde/Consórcio)
  - Lucratividade por seguradora
  - Comissões recebidas vs pagas
  - Fluxo de caixa mensal

### 🔟 IMPORTAÇÃO DE DADOS (MIGRAÇÃO)

**Funcionalidades:**

- ✅ Upload de arquivo Excel
- ✅ Mapeamento de colunas (qual coluna = qual campo do sistema)
- ✅ Validação de dados antes de importar
- ✅ Preview das linhas a importar
- ✅ Importação por lotes (clientes, apólices, etc)
- ✅ Relatório de sucesso/erros
- ✅ Rollback se necessário
- ✅ Histórico de todas as importações

**Formato esperado:**

```
Cliente: ID, CPF/CNPJ, Nome, Telefone, Email, Endereço
Apólice: ID, Cliente_ID, Ramo, Seguradora, Número, Valor, Data_Início, Data_Término
Cobertura: ID, Apólice_ID, Nome, Limite, Franquia
```

---

## Fluxos de Negócio

### FLUXO 1: Nova Cotação → Emissão (Registro Manual)

```
1. Cliente contacta (WhatsApp/Email/Telefone)
2. Corretor cria Cotação no sistema:
   - Insere dados do cliente
   - Insere tipo de seguro desejado
   - Sistema prepara formulário manual
3. Corretor contata seguradoras manualmente (WhatsApp/Email/Telefone/Portais):
   - Solicita cotações
   - Aguarda respostas
4. Corretor registra propostas recebidas:
   - Digita valores
   - Anexa PDFs das propostas
5. Proposta enviada ao cliente (via WhatsApp/Email)
6. Cliente aceita proposta (confirmação manual)
7. Corretor solicita emissão à seguradora:
   - Contata seguradora
   - Aguarda emissão
   - Recebe PDF da apólice
8. Corretor cadastra apólice no sistema:
   - Manual: digita todos os dados
   - OU IA: upload do PDF, extrai dados, confirma
9. Cliente recebe apólice
10. Sistema cria alerta para renovação (30 dias antes do vencimento)
```

### FLUXO 2: Renovação de Apólice (Registro Manual)

```
1. Sistema detecta apólice com 30 dias para vencer
2. Sistema cria tarefa para corretor
3. Corretor contacta cliente via WhatsApp
4. Corretor cria nova cotação no sistema:
   - Copia dados da apólice atual
   - Adiciona manualmente novas propostas de seguradoras
5. Cliente confirma renovação (manual)
6. Corretor solicita emissão à seguradora:
   - Contata seguradora
   - Aguarda emissão
   - Recebe PDF
7. Corretor cadastra nova apólice:
   - Manual: digita dados
   - OU IA: upload do PDF
8. Sistema atualiza dados e vincula à apólice anterior
9. Novo alerta criado para próxima renovação
```

### FLUXO 3: Endosso de Alteração (Registro Manual)

```
1. Cliente solicita mudança (via WhatsApp/Telefone)
2. Corretor cria registro de Endosso no sistema:
   - Descreve alteração
   - Registra observações
3. Corretor contata seguradora:
   - Solicita endosso
   - Recebe proposta de valor/novo termo
4. Corretor registra proposta no sistema:
   - Digita valor novo
   - Anexa documento da seguradora
5. Cliente confirma ou recusa (manual)
6. Se confirmado:
   - Corretor solicita emissão do endosso
   - Recebe PDF da seguradora
   - Cadastra endosso no sistema (manual ou IA)
   - Atualiza apólice principal
   - Cliente recebe documento
7. Se recusado:
   - Corretor registra motivo
   - Caso encerrado, tentará depois
```

### FLUXO 4: Sinistro - Do Aviso ao Pagamento (Registro Manual)

```
1. Cliente notifica sinistro (WhatsApp/Telefone/Email)
    → Corretor cria registro no sistema com timestamp

2. Corretor coleta informações iniciais:
    - Data/hora do evento
    - Descrição
    - Danos
    - Foto inicial
    → Registra tudo no sistema

3. Corretor notifica seguradora:
    - Contata via WhatsApp/Email/Telefone/Portal
    - Recebe número do sinistro
    → Corretor registra no sistema:
        - Data de contato
        - Responsável na seguradora
        - Número do sinistro
        - Protocolo

4. Seguradora designa regulador (perito)
    → Corretor registra no sistema:
        - Nome do regulador
        - Data designada para vistoria

5. Vistoria realizada
    → Corretor registra no sistema:
        - Data da vistoria
        - Observações
        - Documentos solicitados

6. Cliente/Corretor envia documentos
    → Upload no sistema
    → Corretor contata seguradora para confirmar envio
    → Corretor registra data no sistema

7. Análise de cobertura
    → Corretor recebe decisão da seguradora
    → Corretor registra no sistema:
        - Data
        - Status (Aceito/Recusado)
        - Justificativa (se recusado)
        - Valor indenizado (se aceito)

8. Se aprovado:
    → Corretor registra no sistema:
        - Data de pagamento
        - Valor pago
        - Método de pagamento

9. Sinistro encerrado
    → Corretor altera status para "Encerrado"
    → Histórico completo guardado no sistema
    → Cliente pode acessar sempre
```

### FLUXO 5: Importação de Dados do Excel

```
1. Corretor acessa "Importação" no menu
2. Upload arquivo Excel
3. Sistema lê arquivo e apresenta preview
4. Usuário mapeia colunas:
   - Coluna A → CPF
   - Coluna B → Nome
   - etc...
5. Validação automática:
   - CPF válido?
   - Email válido?
   - Datas corretas?
   - Valores numéricos?
6. Apresenta relatório de erros (se houver)
7. Usuário pode:
   - Corrigir manualmente
   - Pular linhas com erro
   - Cancelar
8. Importação executada
9. Relatório final (X importados, Y erros)
```

---

## Automações Detalhadas

**Importante:** Estas automações são 100% internas. O sistema não se conecta às seguradoras, mas automatiza tarefas repetitivas e facilita o trabalho do corretor.

### 📅 1. Alertas Automáticos Múltiplos (WhatsApp + Email)

**Horários Configuráveis (4x ao dia):**

| Horário   | Canal            | Tipo de Alerta         | Objetivo                    |
| --------- | ---------------- | ---------------------- | --------------------------- |
| **08:00** | WhatsApp + Email | Resumo completo do dia | Planejamento do expediente  |
| **10:00** | WhatsApp         | Checklist momento      | Checkpoint do meio da manhã |
| **14:00** | WhatsApp         | Urgências pendentes    | Retomar foco após almoço    |
| **17:00** | WhatsApp         | Balanço do dia         | Planejar amanhã             |

**Conteúdo do Resumo 08:00:**

- 📋 Tarefas do dia (todas)
- ⚠️ Apólices vencendo HOJE
- ⚠️ Tarefas urgentes (prioridade alta)
- 💰 Comissões a receber (valor e datas)
- 🔄 Renovações próximas (30 dias)
- 📊 Sinistros em andamento (quantidade)
- ⚠️ Prazos de SUSEP vencendo
- 💬 Mensagens não respondidas

**Conteúdo do Resumo 10:00:**

- 🎯 Checklist: "Você já fez hoje?"
- ⚠️ Lembrete de vencimentos às 14h
- 💬 Mensagens novas

**Conteúdo do Resumo 14:00:**

- ⚠️ Tarefas urgentes pendentes
- 🔴 Crítico: vencendo em poucas horas

**Conteúdo do Resumo 17:00:**

- ✅ Tarefas concluídas hoje
- ❌ Tarefas não concluídas
- 📅 Tarefas para amanhã

---

### 📦 2. Automações de Documentos Padrão

#### 2.1 Criação Automática de Pasta

**Ao cadastrar cliente:**

```
clientes/{nome_cliente}_{id}/
├── documentos_pessoais/
├── apolices/
│   └── {ramo}_{seguradora}_{ano}/
├── sinistros/
│   └── sinistro_{numero}_{ano}/
├── endossos/
├── cotacoes/
└── contratos/
    └── consorcio_{tipo}_{id}/
```

#### 2.2 Classificação Automática de Upload em Lote

**Como funciona:**

- Upload múltiplo de arquivos
- IA analisa cada arquivo
- Classifica automaticamente:
  - RG, CNH → Documentos Pessoais
  - Boletim de Ocorrência → Sinistros
  - Apólice → Apólices Ativas
  - Recibo → Financeiro
  - Foto → Categoria baseada em contexto

**Interface mostra:**

- Arquivo original
- Tipo identificado pela IA
- Data extraída
- Destino sugerido
- Botão: [Confirmar] [Editar Manualmente]

#### 2.3 Renomeação Automática

**Regras:**

- Documento pessoal: `{tipo}_{nomeCliente}_{data}.{ext}`
- Apólice: `apolice_{ramo}_{seguradora}_{numeroInicio}.{ext}`
- Sinistro: `{tipo}_sinistro_{numeroSinistro}_{data}.{ext}`
- B.O.: `bo_{data}_{cidade}.{ext}`
- Foto: `{tipo}_{descricao}_{data}.{ext}`

**Exemplos:**

- `scan123.pdf` → `RG_JoaoSilva_2026-01-06.pdf`
- `apolice.pdf` → `apolice_auto_porto_seguro_123456.pdf`
- `foto1.jpg` → `foto_dano_frontal_2026-01-06.jpg`

#### 2.4 Relatório Automático de Documentos Pendentes

**Dashboard mostra:**

- 🔴 Alta prioridade (vencendo hoje)
- 🟡 Média prioridade (vencendo esta semana)
- 🟢 Baixa prioridade (vencendo em 14+ dias)

**Cada item mostra:**

- Número do documento (apólice/sinistro)
- Cliente
- ❌ Documentos faltando (lista)
- ⏰ Prazo
- [Upload] [Notificar Cliente]

---

### 📅 3. Automações de Agenda Inteligente

#### 3.1 Ao Criar Agendamento

**Fluxo:**

1. Corretor seleciona cliente
2. Sistema verifica automaticamente: "Cliente tem apólices ativas?"
3. Se sim, mostra resumo na tela:
   - ✅ Apólices ativas (lista com número, seguradora, vencimento)
   - ⏰ Renovações próximas
   - 📄 Última cotação (data, status)
   - ❌ Apólices canceladas (histórico)

#### 3.2 Lembrete Automático para Cliente (1 dia antes)

**Envia automaticamente via WhatsApp:**

```
📅 LEMBRETE DE AGENDAMENTO

Olá [Nome]!

🗓️ Amanhã [Data] às [Hora]
📍 Temos um agendamento: [Descrição]

📋 Lembre-se de trazer:
- [Lista de documentos]

📞 Dúvidas? Me chame no WhatsApp!

[Responder] [Confirmar Presença]
```

#### 3.3 Dashboard Diário de Tarefas

**Tela mostra:**

- 📋 Tarefas hoje (total)
- 🔴 Urgentes (vencendo hoje)
- 🟡 Normais (outras tarefas)
- ✅ Concluídas (contador)

**Cada tarefa mostra:**

- Título
- Cliente/apólice relacionado
- Tempo restante (se urgente)
- Duração estimada
- [Marcar Concluída] [Adiar] [Editar]

---

### 📊 4. Automações de BI (Business Intelligence) Automático

#### 4.1 Relatório Semanal: Apólices Vencendo

**Envia domingo 18:00 por email:**

- 📅 Apólices vencendo na semana (quantidade)
- 📊 Resumo por ramo (Auto, Saúde, Vida, etc)
- 💡 Sugestões de priorização (top 3 clientes)
- 📱 Ação sugerida (WhatsApp + template)

#### 4.2 Relatório Mensal: Comissões

**Envia dia 1 do mês 08:00 por email:**

- 💰 Comissões recebidas (total e por seguradora)
- ⏳ Pendentes (valor e vencimento)
- ⚠️ Atrasadas (valor e dias de atraso)
- 📈 Análise: vs mês anterior, vs meta
- 💡 Ações sugeridas (contatar X, cobrar Y)

#### 4.3 Sugestão Trimestral: Clientes sem Seguro de Vida

**Envia dia 1 do trimestre 08:00 por email:**

- 🎯 Lista de 10 clientes sem seguro de vida (mas com outros seguros)
- 🌟 Score de potencial (alto/médio/baixo)
- 💰 Gasto atual por cliente
- 👨‍👩‍👧 Família (quantidade de dependentes)
- 💡 Oferta sugerida (valor e benefícios)
- 📱 Botão: [Baixar Lista WhatsApp]

#### 4.4 Alerta: Sinistros Parados

**Envia toda segunda-feira 09:00 por WhatsApp:**

- 🔴 Críticos (> 60 dias) - lista
- 🟡 Atenção (30-60 dias) - lista
- 📊 Estatísticas (total, média de tempo)
- 💡 Ações sugeridas (priorizar X, Y, Z)
- [Ver Dashboard] [Exportar Relatório]

---

### 👤 5. Automações de CRM Inteligente

#### 5.1 Cliente Retorna após Meses - Histórico

**Quando cliente entra em contato (WhatsApp/Email/Telefone):**

- 📊 Mostra automaticamente:
  - Última cotação (data, produto, status)
  - Motivo de não compra (se registrado)
  - 📈 Relacionamento (anos como cliente, apólices ativas)
  - 💰 Total gasto (valor)
  - 💬 Sugestão de resposta (template)

#### 5.2 Cliente Liga - Detecção de Número

**Ao receber ligação:**

- 🔍 Sistema detecta número automaticamente
- 📱 Tela pop-up mostra:
  - Nome do cliente
  - WhatsApp, email
  - ✅ Apólices ativas (resumo)
  - ⏰ Próxima renovação
  - 📄 Última cotação (data, status)
  - 💬 Última interação
- [Ver Ficha Completa] [Nova Cotação] [Atender]

#### 5.3 Nova Mensagem WhatsApp - Sugestão Inteligente

**Interface mostra:**

- 💬 Mensagem do cliente
- 🤖 Análise do sistema:
  - Identifica contexto (renovação, cotação, sinistro)
  - Mostra histórico relevante
  - 💡 Sugere 3 opções de resposta
- [Copiar Opção 1] [Copiar Opção 2] [Copiar Opção 3]

#### 5.4 Lead Perdido - Tarefa Automática

**Regra:** Cotação não fechada há 3 meses

- ✅ Cria tarefa automaticamente
- 📝 Título: "Retomar cliente - Lead perdido"
- 📋 Descrição: Mostra último contato, motivo, produto
- 💬 Templates de resposta (WhatsApp + Email)
- [Enviar WhatsApp] [Enviar Email] [Ignorar]

---

### 💰 6. Automações de Consórcios/Financiamentos

#### 6.1 Registro Automático de Pagamento

**Ao registrar pagamento:**

- ✅ Atualiza automaticamente:
  - Status da parcela → PAGA
  - Progresso (X/Y)
  - Valor pago (total acumulado)
- 📤 Envia comprovante para cliente (WhatsApp)
- ✅ Agenda próximo lembrete (5 dias antes)

#### 6.2 Alerta 5 Dias Antes do Vencimento

**Envia automaticamente via WhatsApp:**

```
⏰ LEMBRETE - PAGAMENTO DE PARCELA

Oi [Nome]!

💳 Parcela #[Número] do seu consórcio de [Tipo] vence em 5 dias!

📅 Data: [Data]
💰 Valor: [Valor]
💳 Chave PIX: [Chave]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 SEU CONSÓRCIO
Progresso: [X]/[Y] parcelas pagas ([%])
Valor pago: [Pago]/[Total]
Faltam: [Faltam] parcelas

Dúvidas? Me chame! 😉
```

#### 6.3 Todas Parcelas Pagas - Contemplação

**Ao pagar última parcela:**

- 🎉 Tela de celebração
- ✅ Marca automaticamente: CONTEMPLADO
- 📊 Mostra resumo completo
- 🤖 Cria automaticamente: Tarefa "Agendar entrega do bem"
- 📤 Envia documento de contemplação (WhatsApp)
- [Gerar Documento] [Notificar Cliente]

#### 6.4 Geração Automática de Comprovante

**PDF gerado automaticamente:**

- Extrato completo de pagamentos (todas parcelas)
- Data de cada pagamento
- Valor total pago
- Status: ✅ TODAS PARCELAS PAGAS
- Data de contemplação
- [Baixar PDF] [Enviar WhatsApp]

---

### 🔍 7. Automações de Busca Inteligente

#### 7.1 Busca Fuzzy por Nome

**Exemplos:**

- Busca: "joão silva" → Encontra: João Silva, Joao da Silva, Maria José Silva
- Busca: "maria" → Encontra: Maria Silva, Maria Santos, Ana Maria Costa
- Mostra porcentagem de correspondência

#### 7.2 Busca Normalizada de Telefone

**Reconhece múltiplos formatos:**

- `11999999999`
- `(11) 99999-9999`
- `+55 11 99999-9999`
- Busca parcial: `119999` → encontra número completo

#### 7.3 Busca por Placa

**Busca: "ABC1234"**

- Mostra: Veículo, Modelo, Ano, Cor
- Mostra: Cliente (nome, CPF, telefone)
- Mostra: Apólice ativa (número, seguradora, vigência)
- [Ver Cliente] [Ver Apólice] [Contatar]

#### 7.4 Busca Avançada

**Interface com filtros:**

- 📅 Data de vencimento (de/até)
- 🏷️ Tipo (seguro de vida, auto, etc)
- 📊 Status (vigente, vencida, cancelada)
- Mostra resultados com contador
- [Exportar Lista] [Ver Dashboard]

---

### 💾 8. Automações de Backup e Organização

#### 8.1 Backup Automático Diário

**Configuração:**

- Horário: 02:00 (todos os dias)
- Dias: Segunda a Sábado
- Retenção: 7 dias (diário), 4 semanas (semanal), 12 meses (mensal)
- Armazenamento: Local + AWS S3
- Criptografia: AES-256

**Relatório (email após backup):**

- ✅ Dados backupados (quantidade de registros)
- 💾 Armazenamento (status)
- 📈 Histórico (últimos 7 backups, tamanho médio)

#### 8.2 Compactação Automática

**Regras:**

- Sinistros encerrados há > 365 dias → ZIP
- Apólices arquivadas há > 1825 dias (5 anos) → ZIP

**Notificação:**

- Lista arquivos compactados
- Economia de espaço
- [Ver Arquivos] [Gerenciar]

#### 8.3 Lixo Automático (Rascunhos)

**Regra:** Rascunhos de cotação sem atividade após 30 dias

**Interface mostra:**

- 🔴 Vencidos (> 30 dias)
- 🟡 Quase vencendo (25-30 dias)
- [Ver] [Restaurar] [Excluir]
- Próxima limpeza automática: [Data]

#### 8.4 Arquivamento Automático

**Regras:**

- Apólices canceladas há > 1825 dias → Arquivo morto
- Sinistros encerrados há > 3650 dias (10 anos) → Arquivo morto

**Notificação:**

- Lista arquivos movidos
- [Ver Arquivo Morto] [Restaurar]

---

### 👨‍🎓 9. Automações de Treinamento/Onboarding

#### 9.1 Novo Corretor - Tour Inicial

**Tela de boas-vindas:**

- 🎉 Mensagem de boas-vindas
- 📚 O que vai aprender hoje (checklist)
- Tempo estimado
- [Começar Tour] [Pular para o Sistema]

**Tour interativo (passo a passo):**

- Cada passo mostra tela + explicação
- 💡 Dicas rápidas
- [Próximo] [Pular Tour]

#### 9.2 Checklist Automático de Funcionalidades

**Dashboard de progresso:**

- X/20 funcionalidades concluídas (%)
- ✅ Já aprendeu (lista)
- ⏳ Para aprender hoje (lista)
- [Continuar Treinamento] [Ver Tutorial]

#### 9.3 Sugestões Pop-up Inteligentes

**Contextuais:**

- Ao cadastrar cliente: "Dica: Use busca fuzzy depois!"
- Ao fazer upload: "Dica: Arraste múltiplos arquivos!"
- Ao criar cotação: "Dica: Copie dados depois para apólice!"
- Ao abrir sinistro: "Dica: Prazo SUSEP é 30 dias!"
- [Entendi] [Não mostrar mais]

#### 9.4 Dashboard de Progresso

**Tela mostra:**

- 👤 Nome do novo corretor
- Desde (data)
- 📈 Conquistas (clientes cadastrados, apólices emitidas, etc)
- 🎯 Objetivos da semana (progresso)
- 📚 Recursos disponíveis (manuais, vídeos, suporte)
- [Ver Todos os Recursos] [Continuar Aprendizado]

---

### 📋 10. Checklists Automáticos por Ramo (Sinistros)

**Características:**

- ✅ Checklist diferente para cada ramo (Auto, Residencial, Saúde, Vida)
- ✅ **Configurável:** Adicionar ou remover documentos necessários
- ✅ **Interativo:** Marca conforme recebe documentos
- ✅ **Salva estado:** Se tem 3 de 6, na próxima vez mostra "Você já enviou 3, falta 3"
- ✅ Permite upload incremental

**Checklists padrão (configuráveis):**

**Auto:**

- [ ] Boletim de Ocorrência
- [ ] Fotos do veículo (4 ângulos)
- [ ] Fotos dos danos
- [ ] Nota fiscal (se reparo)
- [ ] CNH do motorista
- [ ] Comprovante de residência

**Residencial:**

- [ ] Boletim de Ocorrência
- [ ] Fotos dos danos
- [ ] Laudo técnico (se aplicável)
- [ ] Nota fiscal (se reparo)
- [ ] Comprovante de residência
- [ ] Documento do imóvel

**Saúde:**

- [ ] Receitas médicas
- [ ] Exames realizados
- [ ] Declaração de beneficiário
- [ ] Laudo médico
- [ ] Comprovante de pagamento (se reembolso)

**Vida:**

- [ ] Certidão de óbito
- [ ] Declaração de beneficiário
- [ ] Documento do segurado (RG/CNH)
- [ ] Comprovante de residência
- [ ] Laudo médico (se aplicável)

**Interface mostra:**

- Checklist interativo (checkboxes)
- Contador: 3/6 documentos
- [Upload] para cada item
- [Adicionar Documento] [Remover Documento]
- ✅ Estado salvo automaticamente

---

### 🔄 11. Tarefas Automáticas e Lembretes

**Todas as tarefas abaixo são criadas automaticamente:**

#### 11.1 Renovações de Apólices

- 30 dias antes: "Contatar [Cliente] sobre renovação"
- 15 dias antes: "Seguir renovação [Cliente] - sem resposta"
- 7 dias antes: "URGENTE: Renovação [Cliente]"

#### 11.2 Prazos de Documentação (SUSEP)

- Dia 0: Documentos enviados
- Dia 20: "10 dias restantes - Sinistro [Número]"
- Dia 25: "5 dias restantes - Sinistro [Número]"
- Dia 28: "URGENTE - 2 dias - Sinistro [Número]"
- Dia 30: "PRAZO EXPIRADO - Sinistro [Número]"

#### 11.3 Endossos

- Dia 0: Endosso solicitado
- Dia 10: "5 dias úteis restantes - Endosso [Número]"
- Dia 13: "URGENTE - 2 dias úteis - Endosso [Número]"

#### 11.4 Ligar Cliente Após 6 Meses sem Contato

- Cria tarefa automaticamente
- Mostra histórico do cliente
- 💬 Template de WhatsApp

#### 11.5 Ligar 30 Dias Antes do Aniversário do Cliente

- Cria tarefa automaticamente
- Sugestão: "Parabenizar e verificar se precisa de algo"
- 💬 Template de mensagem

#### 11.6 Ligar 7 Dias Após Cotação Não Fechada

- Cria tarefa automaticamente
- Mostra dados da cotação
- 💬 Template de follow-up

#### 11.7 Enviar Boas-Festas (Natal, Ano Novo)

- Cria tarefa automaticamente em dezembro
- 💬 Template de mensagem personalizável
- [Enviar para Todos] [Selecionar Clientes]

#### 11.8 Pagamentos de Parcelas (Consórcios)

- 5 dias antes: "Parcela #[Número] vence em 5 dias"
- Dia 0: "Parcela #[Número] vence hoje"
- Dia 1: "ATRASO - Parcela #[Número] venceu ontem"

**Configuração:**

- [ ] Criar automaticamente tarefa
- [ ] Enviar notificação via WhatsApp
- [ ] Enviar notificação via Email

---

### 🧠 12. IA/OCR - Extração de Dados (Detalhado)

**Como funciona:**

1. Corretor faz upload de PDF/imagem
2. IA identifica **automaticamente o tipo de documento:**
   - Apólice
   - Endosso
   - Proposta
   - Boletim de Ocorrência
   - RG, CNH, CPF
   - Nota Fiscal
   - Outro
3. **Se não identificar:** Pergunta ao usuário: "Qual é o tipo deste documento?"
4. IA extrai campos automaticamente:
   - Número da apólice/endosso
   - Seguradora
   - Vigência
   - Prêmio/valor
   - Coberturas
   - Beneficiários
   - Nome do cliente
   - CPF/CNPJ
   - Outros campos específicos do ramo
5. Sistema preenche formulário automaticamente
6. Corretor revisa e ajusta se necessário
7. Corretor confirma → Salva no banco

**Benefício:** Reduz tempo de cadastro de 15 minutos para 2 minutos

**Campos Extraídos por Ramo:**

**Auto:**

- Placa, Chassi, Ano do veículo
- Motorista
- Coberturas (Casco, RCF, Vidro)
- Franquias

**Saúde:**

- Beneficiário principal
- Dependentes
- Tipo de plano (ambulatorial, hospitalar, etc)
- Enfermarias cobertas
- Carências

**Vida:**

- Segurado
- Beneficiários
- Capital segurado
- Modalidade (Renda/Indenização)

**Consórcio/Financiamento:**

- Bem descrito
- Valor total
- Parcelas (quantidade e valor)
- Banco/Financeira
- Grupo/Cota

---

### 💵 13. Cálculo Automático de Comissões

**Como funciona:**

1. Apólice é cadastrada
2. Sistema calcula automaticamente:
   - Comissão bruta (percentual configurável por seguradora)
   - Descontos (percentual fixo ou por apólice)
   - Impostos (calculado automaticamente)
   - **Comissão líquida** = Bruta - Descontos - Impostos
3. Salva automaticamente na tabela de comissões
4. Status inicial: PENDENTE
5. Corretor atualiza:
   - Data de recebimento
   - Status: PENDENTE → RECEBIDA → PAGA

**Configuração:**

- Percentual por seguradora (configurável)
- Descontos fixos por apólice (configurável)
- Impostos (calculado automaticamente)
- [Ver Relatório de Comissões] [Exportar Excel]

---

### 📊 Resumo de Automatizações

| Tipo       | Automação                     | Impacto                    |
| ---------- | ----------------------------- | -------------------------- |
| OCR        | Extração de dados de apólices | ⭐⭐⭐⭐⭐ Tempo -90%      |
| WhatsApp   | Respostas automáticas         | ⭐⭐⭐ Tempo -70%          |
| Alertas    | Vencimentos, prazos           | ⭐⭐⭐⭐⭐ Erros -95%      |
| PDF        | Geração de propostas          | ⭐⭐⭐ Tempo -60%          |
| Checklists | Documentos necessários        | ⭐⭐⭐⭐⭐ Erros -90%      |
| Dashboards | Insights automáticos          | ⭐⭐⭐⭐ Visibilidade 100% |
| Email      | Notificações automáticas      | ⭐⭐⭐ Tempo -50%          |
| Validação  | CPF/CNPJ em tempo real        | ⭐⭐⭐ Erros -80%          |
| Comissões  | Cálculo automático            | ⭐⭐⭐⭐⭐ Tempo -95%      |
| Documentos | Classificação automática      | ⭐⭐⭐⭐ Tempo -80%        |
| BI         | Relatórios automáticos        | ⭐⭐⭐⭐ Tempo -90%        |

---

## Especificações Técnicas

### Tecnologias Selecionadas

#### Frontend

- **React 18+** com TypeScript
- **Vite** para build rápido
- **TailwindCSS** para design responsivo
- **Zustand** para gerenciamento de estado
- **React Query** para cache e sincronização de dados
- **Framer Motion** para animações suaves
- **React Hook Form + Zod** para validação
- **Zustand Devtools** para debug

#### Backend

- **Node.js + Express/NestJS**
- **TypeScript** em todo código
- **Supabase SDK** para integração com PostgreSQL
- **Multer** para upload de arquivos
- **Sharp** para processamento de imagens
- **Axios** para requisições HTTP
- **Bull/Agenda** para jobs em background
- **Helmet** para segurança
- **Winston** para logging
- **Jest** para testes

#### Banco de Dados

- **Supabase (PostgreSQL 14+)**
- **Row Level Security (RLS)** para autorização
- **Realtime subscriptions** para atualizações ao vivo
- **Storage** para documentos
- **Backups automáticos**

#### DevOps

- **Vercel** para deploy frontend
- **Railway** para deploy backend
- **GitHub Actions** para CI/CD
- **Docker** para containerização (optional)
- **PostgreSQL** versão 14+

### APIs e Integrações

#### 📌 NOTA IMPORTANTE: Sem Integração com Seguradoras

**Este sistema NÃO se conecta a APIs de seguradoras.** Toda interação com seguradoras é manual:

- Cotações: Corretor contata seguradoras manualmente
- Emissão: Corretor solicita emissão manualmente
- Sinistros: Corretor notifica seguradora manualmente
- Status: Corretor acompanha manualmente

#### Google Calendar

```
- OAuth 2.0 authentication
- Criar eventos automaticamente
- Sincronizar calendários
- Lembretes integrados
```

#### Evolution API (WhatsApp Business)

```
Endpoint: https://api.evolution.local
- Autenticação via API Key + Bearer Token
- Webhook para receber mensagens
- Envio de mensagens (texto, mídia)
- Gestão de contatos
- Templates de mensagem
- Status de mensagem (entregue/lido)
```

#### IA para OCR (Extração de Dados de Documentos)

**Finalidade:** Facilitar cadastro manual, não automatizar

```
Opção 1: OpenAI Vision API
- Modelo: gpt-4-vision-preview
- Análise de imagens/PDFs
- Extração de dados estruturados

Opção 2: Claude 3 (Anthropic)
- Modelo: claude-3-opus
- Análise de documentos
- Melhor compreensão contextual

Opção 3: Solução Especializada (Parseur/Dify)
- OCR + NLP otimizado para seguros
- Modelo customizado por ramo
```

**Como funciona:**

1. Corretor faz upload de PDF da apólice
2. IA extrai campos automaticamente
3. Sistema apresenta dados extraídos para revisão
4. Corretor confirma ou ajusta dados
5. Sistema salva apólice no banco

**Decisão é sempre manual:** O corretor confirma os dados antes de salvar

```
Opção 1: OpenAI Vision API
- Modelo: gpt-4-vision-preview
- Análise de imagens/PDFs
- Extração de dados estruturados

Opção 2: Claude 3 (Anthropic)
- Modelo: claude-3-opus
- Análise de documentos
- Melhor compreensão contextual

Opção 3: Solução Especializada (Parseur/Dify)
- OCR + NLP otimizado para seguros
- Modelo customizado por ramo
```

#### Google Sheets Import

```
- Google Sheets API v4
- OAuth 2.0 para autenticação
- Leitura de dados da planilha
- Importação automática de histórico
```

---

## Roadmap de Desenvolvimento

### FASE 1: MVP (Semanas 1-6)

**Objetivo:** Funcionalidades essenciais operacionais

**Sprint 1-2: Setup e Infraestrutura**

- [ ] Setup do projeto (React + Express + Supabase)
- [ ] Autenticação (Supabase Auth)
- [ ] Database schema básico
- [ ] Deploy (Vercel + Railway)
- [ ] CI/CD setup

**Sprint 2-3: Gestão de Clientes**

- [ ] Cadastro de cliente (PF/PJ)
- [ ] Busca fuzzy
- [ ] Dashboard básico do cliente
- [ ] Upload de documentos
- [ ] Histórico de atividades

**Sprint 3-4: Gestão de Apólices**

- [ ] Cadastro de apólice (manual)
- [ ] Listagem e busca
- [ ] Edição de apólice
- [ ] Timeline de eventos
- [ ] Alertas de vencimento

**Sprint 4-5: Agenda e Notificações**

- [ ] Google Calendar integration
- [ ] Tarefas/lembretes
- [ ] Notificações por email
- [ ] Dashboard de tarefas

**Sprint 5-6: IA - Extração Básica**

- [ ] Upload de documento
- [ ] OCR básico (API OpenAI)
- [ ] Extração manual vs automática
- [ ] Validação de dados extraídos

### FASE 2: Funcionalidades Core (Semanas 7-12)

**Objetivo:** Todos os módulos principais funcionando

**Sprint 7: Gestão de Sinistros**

- [ ] Abertura de sinistro
- [ ] Timeline de regulação
- [ ] Upload de documentos
- [ ] Status tracking
- [ ] Notificações de progresso

**Sprint 8: CRM + WhatsApp**

- [ ] Integração Evolution API
- [ ] Recebimento de mensagens
- [ ] Histórico de conversa
- [ ] Caixa de entrada
- [ ] Atribuição de conversa

**Sprint 9: Gestão Financeira**

- [ ] Controle de comissões
- [ ] Fluxo de caixa
- [ ] Contas a receber/pagar
- [ ] Relatórios financeiros

**Sprint 10: Importação de Dados**

- [ ] Upload Excel
- [ ] Mapeamento de colunas
- [ ] Validação
- [ ] Importação em lote
- [ ] Histórico de importações

**Sprint 11-12: Refinamento e Testes**

- [ ] Testes E2E
- [ ] Performance optimization
- [ ] Security audit
- [ ] UX refinement

### FASE 3: Recursos Avançados (Semanas 13+)

**Objetivo:** Diferenciação competitiva

- [ ] IA aprimorada (identificação automática de ramo)
- [ ] Chatbot WhatsApp inteligente
- [ ] Assinatura eletrônica (e-sign)
- [ ] Analytics e BI avançado
- [ ] Aplicativo mobile (React Native)
- [ ] Inteligência de previsão de sinistros

---

## Considerações de Segurança

### Autenticação e Autorização

- ✅ OAuth 2.0 via Supabase
- ✅ JWT tokens com expiração
- ✅ Row Level Security (RLS) no banco
- ✅ Roles: Admin, Corretor, Assistente
- ✅ MFA (Multi-factor authentication) opcional

### Proteção de Dados

- ✅ LGPD compliance
- ✅ Criptografia em trânsito (HTTPS)
- ✅ Criptografia de campos sensíveis (CPF, CNPJ)
- ✅ Backups automáticos diários
- ✅ Audit log de todas as ações

### Gestão de Arquivos

- ✅ Upload apenas tipos permitidos (PDF, JPG, PNG)
- ✅ Antivírus scan (ClamAV opcional)
- ✅ Armazenamento em Supabase Storage
- ✅ Acesso controlado por cliente/apólice
- ✅ Retenção conforme legislação

### APIs e Integrações

- ✅ Rate limiting na Evolution API
- ✅ Validação de webhooks
- ✅ Tokens armazenados encriptados
- ✅ Logs de chamadas a APIs externas
- ✅ Tratamento de erros sem expor dados

### Conformidade

- ✅ SUSEP (regulação de seguros)
- ✅ LGPD (proteção de dados)
- ✅ OWASP Top 10
- ✅ SOC 2 ready
- ✅ Termos de Serviço e Privacidade

---

## 📊 MÉTRICAS DE SUCESSO

### Funcionalidade

- [ ] 100% das apólices cadastradas
- [ ] 100% dos sinistros com timeline completa
- [ ] 95%+ de acurácia na IA OCR
- [ ] Tempo médio de cadastro: <2 minutos

### Performance

- [ ] Tempo de carregamento página: <2s
- [ ] Time to Interactive: <3s
- [ ] Database query: <500ms
- [ ] Uptime: 99.9%

### Adoção

- [ ] 100% das apólices migradas
- [ ] Redução 80% de tempo administrativo
- [ ] 0 documentos perdidos
- [ ] 100% compliance de prazos (SUSEP)

### ROI

- [ ] Redução de custos operacionais
- [ ] Aumento na retenção de clientes
- [ ] Melhoria na experiência do cliente
- [ ] Escalabilidade sem novos custos

---

## 🎓 SUGESTÕES DE FUNCIONALIDADES ADICIONAIS

1. **Análise Preditiva de Sinistros**

   - ML para prever probabilidade de sinistro
   - Alertas para riscos altos
   - Recomendações de cobertura

2. **Portal do Cliente**

   - Login próprio do cliente
   - Consulta de apólices
   - Aviso de sinistro via portal
   - Documentos disponíveis para download

3. **Automação de WhatsApp Avançada**

   - Chatbot com IA (Groq/Llama)
   - Respostas contextuais automáticas
   - Agendamento automático
   - Confirmação de documentos via formulário

4. **Marketplace de Produtos**

   - Comparação entre múltiplas seguradoras
   - Simulações em tempo real
   - Análise automática de melhor produto

5. **Business Intelligence**

   - Dashboards executivos
   - Relatórios customizáveis
   - Exportação (PDF/Excel)
   - Agendamento de relatórios

6. **Aplicativo Mobile**

   - Consulta rápida de apólices
   - Aviso de sinistro
   - Chat com corretor
   - Documentos offline

7. **Sistema de Recomendações**
   - Sugerir produtos relacionados
   - Análise de gaps de cobertura
   - Vendas cruzadas automáticas

---

## 📝 PRÓXIMAS ETAPAS

1. **Validação com Usuário Final**

   - Confirmar prioridades
   - Ajustar fluxos
   - Validar campos de dados

2. **Prototipagem (1 semana)**

   - Criar wireframes
   - Fluxos de clique
   - Validar arquitetura

3. **Sprint Planning**

   - Detalhar backlog
   - Estimar esforço
   - Atribuir tarefas

4. **Development Kickoff**
   - Setup ambiente
   - Iniciar Sprint 1

---

**Documento Revisado:** 2026-01-06  
**Próxima Revisão:** Após feedback do usuário  
**Responsável:** Tim de Desenvolvimento

---

## 📝 HISTÓRICO DE ALTERAÇÕES

**Versão 1.1 (06/01/2026):**

- ✅ Adicionada seção completa de "Automações Detalhadas" com 13 categorias
- ✅ Especificado alertas automáticos em 4 horários diários (08:00, 10:00, 14:00, 17:00)
- ✅ Detalhado automação de documentos (criação de pasta, classificação, renomeação)
- ✅ Especificado automações de agenda inteligente (verificação de apólices, lembretes)
- ✅ Detalhado BI automático (relatórios semanais, mensais, trimestrais)
- ✅ Especificado CRM inteligente (histórico de contato, detecção de telefone)
- ✅ Detalhado automações de consórcios (pagamentos, alertas, contemplação)
- ✅ Especificado busca inteligente (fuzzy, telefone, placa, avançada)
- ✅ Detalhado backup e organização automática (compactação, limpeza)
- ✅ Especificado treinamento/onboarding automático
- ✅ Detalhado checklists de sinistro por ramo (configuráveis, interativos, salvam estado)
- ✅ Especificado tarefas automáticas (renovações, prazos, aniversários, follow-ups)
- ✅ Detalhado IA/OCR com identificação automática de tipo de documento
- ✅ Especificado cálculo automático de comissões
- ✅ Removida seção antiga de automações (substituída pela nova seção detalhada)
- ✅ Atualizado índice para incluir nova seção de Automações Detalhadas

**Versão 1.0 (05/01/2026):**

- ✅ Versão inicial com especificações básicas do sistema
- ✅ Filosofia de caderno digital
- ✅ Módulos principais (Clientes, Apólices, Sinistros, CRM, etc)
- ✅ Fluxos de negócio
- ✅ Especificações técnicas básicas
- ✅ Roadmap de desenvolvimento
