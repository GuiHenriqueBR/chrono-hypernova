# Status atual: Kanban Funcional

## Realizado

- Correção no Backend (`apps/backend/src/routes/cotacoes.ts`) para permitir status dinâmicos no pipeline (não apenas os hardcoded).
- Limpeza do componente Frontend (`KanbanBoard.tsx`), removendo código duplicado.
- Validação da estrutura de rotas do Pipeline no Backend.
- **Implementação Base do WhatsApp CRM** (Frontend + Rotas Backend).
- **Implementação Base da Importação de Excel** (Frontend + Rotas Backend).
- **Implementação Base dos Detalhes (Cliente/Apólice/Sinistro)**.

## Próximos Passos

1. **Configuração de Ambiente & Infra**: Executar SQL no Supabase, configurar ENV vars.
2. **Design System & Refatoração**: Implementar tokens semânticos (Primary, Secondary, Danger) para substituir hardcoded colors.
3. **Testes e Validação**: Validar importação em massa e fluxo de mensagens do WhatsApp.
4. Implementar a criação de novas fases no Frontend (já suportado pelo Backend).
5. Adicionar funcionalidade de edição de cards diretamente no Kanban.
