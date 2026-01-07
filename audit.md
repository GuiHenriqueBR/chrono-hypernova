# 🕵️‍♂️ Gap Analysis & Compliance Audit

Este documento rastreia o status de conformidade com a Especificação Técnica e o Guia de Implementação.
**Status:** 🔴 Pendente | 🟡 Em Progresso | 🟢 Concluído

## 1. Design & UX (Prioridade Imediata)

- [ ] **Aestética Premium/Light:** O design deve deixar de ser "básico" para ser "premium/glass".
- [ ] **Responsividade:** Funcionar bem em mobile.
- [ ] **Animações Fluidas:** Uso de Framer Motion em transições.

## 2. Módulos Obrigatórios

### 👤 Gestão de Clientes

- [🟡] Listagem de Clientes (Existente, precisa de melhoria visual)
- [🔴] **Dashboard do Cliente (Detalhes):** Visão única com Abas (Apólices, Sinistros, Docs, WhatsApp).
- [ ] Cadastro Completo (PF/PJ) com todos os campos da especificação (Profissão, Estado Civil, etc).
- [ ] Upload de Documentos (Interface).

### 📄 Gestão de Apólices

- [🟡] Listagem (Existente)
- [🔴] **Timeline de Eventos:** Visualização cronológica.
- [ ] Importação de PDF (UI para Upload).
- [ ] Detalhes completos (Coberturas, Franquias).

### 🚨 Gestão de Sinistros

- [🟡] Listagem (Existente)
- [🔴] **Timeline de Regulação:** Visualização passo-a-passo (Abertura -> Vistoria -> Pagamento).
- [ ] Upload de Documentos do Sinistro.

### 💬 CRM + WhatsApp (Core Diferencial)

- [🔴] **Interface de Chat:** Caixa de entrada unificada.
- [ ] Histórico de conversas.
- [ ] Templates de resposta.

### 💰 Financeiro

- [🟡] Dashboard Financeiro (Existente)
- [ ] Fluxo de Caixa (Tabelas Receber/Pagar).
- [ ] Relatórios.

### 📅 Agenda

- [🟡] Visualização Básica (Existente)
- [ ] Integração Google Calendar (Mock UI).

### 🤖 IA & Automação

- [🔴] Interface de OCR (Upload de apólice e visualização de dados extraídos).
- [ ] Importação de Excel (UI).

## 3. Próximos Passos Técnicos

1. **Refactor Visual (Light Mode Premium):** Criar `index.css` com background mesh gradient real e cards glassmorphism de alta qualidade.
2. **Implementar "Cliente Detail Page":** A página mais importante para a gestão diária.
3. **Implementar "WhatsApp/CRM Interface":** O diferencial do sistema.
