# 📝 COMO CONTINUAR O DESENVOLVIMENTO

**Data:** 05/01/2026
**Status:** Backend funcionando na porta 3333

---

## ✅ O QUE JÁ ESTÁ FUNCIONANDO

### Backend
- ✅ Servidor rodando em `http://localhost:3333`
- ✅ Health check disponível em `/health`
- ✅ Todas as rotas configuradas (mas são placeholders)
- ✅ Middleware de autenticação implementado
- ✅ Error handling global funcionando
- ✅ Logger Winston configurado

### Frontend
- ✅ Design System completo criado
- ✅ Página WhatsApp CRM implementada
- ✅ Página Importação de Excel implementada
- ✅ Todas as páginas principais funcionais (mas com dados mock)

---

## 🚀 PRÓXIMOS PASSOS (POR ORDEM DE PRIORIDADE)

### 1. CONFIGURAR SUPABASE (CRÍTICO) 🔴

#### Passo 1: Criar Projeto Supabase
```bash
# Acesse https://supabase.com
# Crie um novo projeto
# Copie as credenciais:
# - Supabase URL (https://seu-projeto.supabase.co)
# - Anon Key (eyJhbGc...)
# - Service Role Key (eyJhbGc...)
```

#### Passo 2: Criar Schema SQL
1. Vá ao Supabase > SQL Editor
2. Copie o schema do arquivo `PLANO-DESENVOLVIMENTO.md`
3. Execute o SQL completo (linhas 98-316)

#### Passo 3: Configurar Environment Variables
Edite `backend/.env`:
```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=seu-anon-key
SUPABASE_SERVICE_ROLE_KEY=seu-service-role-key

# Outras configs já estão no .env.example
```

#### Passo 4: Atualizar Frontend .env
Crie `frontend/.env`:
```env
VITE_API_URL=http://localhost:3333/api
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_KEY=seu-anon-key
```

---

### 2. IMPLEMENTAR BACKEND APIs (CRÍTICO) 🔴

#### Passo 1: Criar Serviço Supabase
Crie `backend/src/services/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

#### Passo 2: Implementar API de Clientes
Atualize `backend/src/routes/clientes.ts` com implementação real:
```typescript
import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Listar todos os clientes
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data, total: data?.length || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

// Criar novo cliente
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// ... (implementar PUT, DELETE, etc)
```

#### Passo 3: Implementar Demais APIs
Repita o processo para:
- `apolices.ts`
- `sinistros.ts`
- `financeiro.ts`
- `agenda.ts`

#### Passo 4: Testar APIs
```bash
# Terminal 1 - Backend rodando
cd backend && npm run dev

# Terminal 2 - Testar endpoints
curl http://localhost:3333/api/clientes
curl http://localhost:3333/api/apolices
```

---

### 3. CONECTAR FRONTEND COM BACKEND (CRÍTICO) 🔴

#### Passo 1: Atualizar API Client
Edite `frontend/src/services/api.ts`:
```typescript
// Já configurado para usar VITE_API_URL
// Se VITE_API_URL não estiver definido, usa http://localhost:3001/api
// Mude para http://localhost:3333/api se necessário
```

#### Passo 2: Criar Hook de React Query para Clientes
Crie `frontend/src/hooks/useClientes.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: () => api.get('/clientes'),
  });
}
```

#### Passo 3: Usar Hook na Página Clientes
Atualize `frontend/src/pages/Clientes.tsx`:
```typescript
import { useClientes } from '../hooks/useClientes';

export default function Clientes() {
  const { data: clientes, isLoading, error } = useClientes();

  if (isLoading) return <SkeletonList count={3} />;
  if (error) return <ErrorState />;

  return (
    // Use clientes.data em vez de clientesMock
  );
}
```

#### Passo 4: Testar
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Acesse http://localhost:5173
```

---

### 4. IMPLEMENTAR DETALHES DE CLIENTES (IMPORTANTE) 🟡

#### Passo 1: Criar Página ClienteDetalhes
Crie `frontend/src/pages/ClienteDetalhes.tsx`:
```typescript
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '../components/layout';
import { Card } from '../components/common';
import { Avatar, Badge, Timeline, TimelineItem } from '../components/common';

export default function ClienteDetalhes() {
  const { id } = useParams();

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => api.get(`/clientes/${id}`),
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <PageLayout title={`Cliente: ${cliente.nome}`}>
      <div className="space-y-6">
        {/* Info do Cliente */}
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={cliente.nome} size="lg" />
            <div>
              <h2 className="text-xl font-semibold">{cliente.nome}</h2>
              <Badge variant={cliente.ativo ? 'success' : 'neutral'}>
                {cliente.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Apólices */}
        <Card>
          <h3 className="font-semibold mb-4">Apólices</h3>
          {/* Listar apólices do cliente */}
        </Card>

        {/* Sinistros */}
        <Card>
          <h3 className="font-semibold mb-4">Sinistros</h3>
          {/* Listar sinistros do cliente */}
        </Card>

        {/* Timeline */}
        <Card>
          <h3 className="font-semibold mb-4">Timeline</h3>
          <Timeline>
            <TimelineItem title="Cliente cadastrado" date="05/01/2026" status="completed" />
          </Timeline>
        </Card>
      </div>
    </PageLayout>
  );
}
```

#### Passo 2: Adicionar Rota
Atualize `frontend/src/App.tsx`:
```typescript
<Route
  path="/clientes/:id"
  element={
    <ProtectedRoute>
      <ClienteDetalhes />
    </ProtectedRoute>
  }
/>
```

#### Passo 3: Criar Botão "Ver Detalhes" na Lista
Atualize `frontend/src/pages/Clientes.tsx`:
```tsx
import { useNavigate } from 'react-router-dom';

export default function Clientes() {
  const navigate = useNavigate();

  // ...

  <button onClick={() => navigate(`/clientes/${cliente.id}`)}>
    Ver detalhes →
  </button>
}
```

---

### 5. IMPLEMENTAR DETALHES DE APÓLICES (IMPORTANTE) 🟡

Seguir o mesmo processo de ClienteDetalhes para:
- `frontend/src/pages/ApoliceDetalhes.tsx`
- Backend endpoint `/api/apolices/:id`
- Componentes de coberturas, endossos, timeline

---

### 6. IMPLEMENTAR DETALHES DE SINISTROS (IMPORTANTE) 🟡

Seguir o mesmo processo para:
- `frontend/src/pages/SinistroDetalhes.tsx`
- Backend endpoint `/api/sinistros/:id`
- Componentes de timeline de regulação, documentos, etc.

---

## 📋 CHECKLIST RÁPIDO

### Esta Semana:
- [ ] Criar projeto Supabase
- [ ] Executar schema SQL
- [ ] Configurar environment variables
- [ ] Implementar API de clientes completa
- [ ] Implementar API de apólices completa
- [ ] Implementar API de sinistros completa

### Próxima Semana:
- [ ] Conectar frontend com backend
- [ ] Implementar ClienteDetalhes
- [ ] Implementar ApoliceDetalhes
- [ ] Implementar SinistroDetalhes

### Depois:
- [ ] Integração OpenAI para OCR
- [ ] Integração Evolution API para WhatsApp
- [ ] Integração Google Calendar
- [ ] Financeiro completo
- [ ] Agenda completa

---

## 💡 DICAS

### Debugando Backend
```bash
# Ver logs
cd backend && npm run dev

# Testar endpoint
curl http://localhost:3333/health

# Testar API com auth
curl -H "Authorization: Bearer TOKEN" http://localhost:3333/api/clientes
```

### Debugando Frontend
```bash
# Iniciar frontend
cd frontend && npm run dev

# Acessar no navegador
http://localhost:5173

# Abrir DevTools
# Ver Console para erros
# Ver Network para requests API
```

### Testes Rápidos
```bash
# Backend health check
curl http://localhost:3333/health

# Listar clientes (depois de implementar)
curl http://localhost:3333/api/clientes

# Criar cliente
curl -X POST http://localhost:3333/api/clientes \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","cpf_cnpj":"123.456.789-00"}'
```

---

## 🆘 PROBLEMAS COMUNS

### Backend não inicia
- Verifique se a porta 3333 está livre
- Verifique se as variáveis de ambiente estão configuradas
- Verifique se Supabase está acessível

### Frontend não conecta no backend
- Verifique VITE_API_URL em `.env`
- Verifique CORS no backend
- Verifique se backend está rodando

### Erro de autenticação
- Verifique JWT_SECRET em `.env`
- Verifique se token está sendo enviado no header
- Verifique se token não expirou

---

## 📚 RECURSOS

- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Zod Docs](https://zod.dev)
- [OpenAI Docs](https://platform.openai.com/docs)
- [Evolution API Docs](https://doc.evolution-api.com)

---

**Última Atualização:** 05/01/2026
**Backend Rodando:** ✅ http://localhost:3333
**Frontend Rodando:** ⏳ Configure e inicie
