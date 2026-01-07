# Crono Hypernova - Corretora de Seguros SaaS

Sistema de gestao completa para corretora de seguros brasileira com integracoes de WhatsApp, IA para OCR, e automacao de processos.

## Tecnologias

### Frontend
- **React 19** com TypeScript
- **Vite 7** para build
- **TailwindCSS 4** para design
- **Framer Motion** para animacoes
- **Zustand** para state management
- **React Query (TanStack)** para data fetching
- **React Hook Form + Zod** para validacao

### Backend
- **Node.js + Express** com TypeScript
- **Supabase** para database, auth e storage
- **Multer** para upload de arquivos
- **Winston** para logging
- **Zod** para validacao
- **OpenAI API** para IA
- **Evolution API** para WhatsApp
- **Google Calendar API** para agenda

## Estrutura do Projeto

```
chrono-hypernova/
├── frontend/                # Aplicacao React
│   ├── src/
│   │   ├── components/      # Componentes reutilizaveis
│   │   │   ├── common/      # Button, Card, Modal, Toast, etc
│   │   │   └── layout/      # Header, Sidebar, PageLayout
│   │   ├── pages/           # Paginas principais
│   │   ├── hooks/           # Custom hooks (useClientes, etc)
│   │   ├── store/           # Zustand stores
│   │   ├── services/        # API client + Supabase
│   │   ├── lib/             # Validacoes Zod
│   │   └── types/           # TypeScript types
│   └── .env.example
│
├── backend/                 # API Node.js
│   ├── src/
│   │   ├── routes/          # Rotas da API
│   │   ├── services/        # Supabase, Storage
│   │   ├── middleware/      # Auth, validation, errorHandler
│   │   └── utils/           # Logger
│   └── .env.example
│
└── database-schema.sql      # Schema completo Supabase
```

## Instalacao

### Pre-requisitos
- Node.js 18+
- npm ou yarn
- Conta Supabase

### 1. Configurar Supabase
1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o `database-schema.sql` no SQL Editor
3. Configure os buckets de storage (documentos, importacoes, whatsapp-media)

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edite .env com suas credenciais
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# Edite .env com suas credenciais
npm install
npm run dev
```

## Modulos Implementados

### Paginas Completas
- [x] **Dashboard** - Stats, graficos, atividades recentes, renovacoes proximas
- [x] **Clientes** - CRUD completo com filtros e busca
- [x] **Cliente Detalhes** - Visualizacao completa com apolices e historico
- [x] **Apolices** - CRUD com coberturas e endossos
- [x] **Apolice Detalhes** - Coberturas, endossos, historico de alteracoes
- [x] **Sinistros** - CRUD com timeline de regulacao
- [x] **Sinistro Detalhes** - Upload de documentos, timeline
- [x] **Financeiro** - Comissoes e transacoes
- [x] **Agenda** - Tarefas e lembretes
- [x] **WhatsApp CRM** - Conversas, mensagens, templates
- [x] **Importacao** - Wizard 4 etapas para Excel/CSV
- [x] **Configuracoes** - Perfil, notificacoes, integracoes, seguranca

### Funcionalidades
- [x] Upload de arquivos para Supabase Storage
- [x] Notificacoes em tempo real (Supabase Realtime)
- [x] Sistema de toast notifications
- [x] Error boundary para tratamento de erros
- [x] Validacao de formularios com Zod
- [x] Graficos SVG customizados (Bar, Line, Donut)
- [x] Historico automatico de apolices via triggers

### Backend Routes
- `/api/auth` - Autenticacao
- `/api/clientes` - CRUD clientes
- `/api/apolices` - CRUD apolices + coberturas + endossos
- `/api/sinistros` - CRUD sinistros + regulacao + documentos
- `/api/whatsapp` - Conversas, mensagens, templates, webhook
- `/api/importacao` - Upload, preview, validacao, importar
- `/api/financeiro` - Comissoes e transacoes
- `/api/agenda` - Tarefas

## Design System

Componentes disponiveis em `frontend/src/components/common/`:

| Componente | Descricao |
|------------|-----------|
| Button | Botoes com variants (primary, outline, ghost, danger) |
| Input | Inputs com validacao visual |
| Card | Container com borda e sombra |
| Modal | Dialogs modais |
| Badge | Status badges coloridos |
| Avatar | Fotos de usuarios |
| Tooltip | Tooltips informativos |
| Skeleton | Loading placeholders |
| EmptyState | Estados vazios |
| ErrorState | Mensagens de erro |
| ErrorBoundary | Captura erros React |
| Toast | Notificacoes toast |
| Timeline | Timeline vertical |
| FileUpload | Drag & drop upload |
| StatusStepper | Progresso por etapas |
| Charts | BarChart, LineChart, DonutChart |
| Loading | Spinners e overlays |

## Scripts Disponiveis

### Backend
```bash
npm run dev      # Desenvolvimento com hot reload
npm run build    # Build para producao
npm run start    # Rodar build de producao
npm run lint     # Verificar codigo
npm run test     # Rodar testes
```

### Frontend
```bash
npm run dev      # Desenvolvimento
npm run build    # Build para producao
npm run preview  # Preview do build
npm run lint     # Verificar codigo
```

## Proximos Passos

### Prioridade Alta
- [ ] Testes unitarios para hooks e componentes
- [ ] Integracao real com Evolution API (WhatsApp)
- [ ] Configurar CI/CD

### Prioridade Media
- [ ] PWA para uso mobile
- [ ] Geracao de relatorios PDF
- [ ] Notificacoes por email
- [ ] Multi-tenancy

### Prioridade Baixa
- [ ] Dark mode
- [ ] Internacionalizacao (i18n)
- [ ] Dashboard customizavel
- [ ] App mobile (React Native)

## Seguranca

- Autenticacao JWT com Supabase Auth
- Row Level Security (RLS) no banco
- Rate limiting em APIs
- Validacao com Zod em frontend e backend
- CORS configuravel
- Helmet para headers de seguranca

## Licenca

Este projeto e proprietario. Todos os direitos reservados.

---

**Versao:** 1.0.0  
**Ultima Atualizacao:** Janeiro 2026  
**Status:** Em Desenvolvimento
