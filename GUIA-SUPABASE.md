# 🚀 GUIA RÁPIDO PARA SUPABASE

**Data:** 05/01/2026

---

## 📋 PRÉ-REQUISITOS

- [ ] Conta no [Supabase](https://supabase.com) (grátis)
- [ ] Backend rodando em http://localhost:3333
- [ ] Arquivo `database-schema.sql` pronto

---

## 🎯 PASSO A PASSO (10 minutos)

### 1. Criar Projeto Supabase (2 min)

1. Acesse https://supabase.com
2. Clique em "Start your project"
3. Preencha:
   - **Name:** `corretora-seguros` (ou seu preferido)
   - **Database Password:** Crie uma senha forte e **salve-a**!
   - **Region:** Escolha uma perto de você (São Paulo)
4. Clique em "Create new project"
5. Aguarde 1-2 minutos enquanto o projeto é criado

### 2. Copiar Credenciais (1 min)

1. No painel do Supabase, clique em **Settings** (ícone de engrenagem) → **API**
2. Copie:
   - `Project URL` (algo como `https://xxx.supabase.co`)
   - `anon public` key (algo como `eyJ...`)
   - `service_role` key (algo como `eyJ...`)
3. Salve essas credenciais, você vai precisar delas!

### 3. Criar Database Schema (3 min)

1. No painel do Supabase, clique em **SQL Editor** (ícone de terminal)
2. Copie todo o conteúdo do arquivo `database-schema.sql`
3. Cole no editor SQL
4. Clique em **RUN** (botão verde no canto inferior)
5. Aguarde o término (mostrará "Success" no canto inferior)

### 4. Criar Usuário (2 min)

1. Clique em **Authentication** no menu lateral
2. Clique em **Add user** → **Create new user**
3. Preencha:
   - **Email:** `admin@corretora.com.br`
   - **Password:** Crie uma senha forte
   - **Auto Confirm User:** Marque esta opção
4. Clique em **Create user**

### 5. Obter UUID do Usuário (1 min)

1. Após criar o usuário, volte ao **SQL Editor**
2. Cole e execute este comando para ver todos os usuários:

```sql
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;
```

3. Copie o `id` do usuário que você acabou de criar (algo como `00000000-...`)

4. Execute este comando para inserir na tabela `usuarios`:

```sql
INSERT INTO usuarios (id, email, nome, role, ativo)
VALUES (
  'COLE-O-UUID-AQUI',
  'admin@corretora.com.br',
  'Administrador',
  'admin',
  true
);
```

### 6. Configurar Environment Variables (2 min)

#### Backend

Crie/edite o arquivo `backend/.env`:

```env
NODE_ENV=development
PORT=3333

# Supabase
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_KEY=SEU-ANON-KEY-DO-STEP-2
SUPABASE_SERVICE_ROLE_KEY=SEU-SERVICE-ROLE-KEY-DO-STEP-2

# JWT
JWT_SECRET=seu-jwt-secret-super-seguro-aqui-use-algum-texto-aleatorio-12345
JWT_EXPIRES_IN=7d

# Google Calendar
GOOGLE_CLIENT_ID=seu-google-client-id
GOOGLE_CLIENT_SECRET=seu-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3333/auth/google/callback

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://api.evolution.local
EVOLUTION_API_KEY=sua-evolution-api-key
EVOLUTION_INSTANCE_NAME=corretora-instancia

# OpenAI (IA/OCR)
OPENAI_API_KEY=sk-seu-openai-api-key

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads
```

#### Frontend

Crie o arquivo `frontend/.env`:

```env
VITE_API_URL=http://localhost:3333/api
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_KEY=SEU-ANON-KEY-DO-STEP-2
```

### 7. Testar Conexão (1 min)

O backend já deve estar rodando (se não, inicie):

```bash
cd backend
npm run dev
```

Deve aparecer:
```
🚀 Servidor rodando em porta 3333
📊 Environment: development
```

Teste o health check:
```bash
curl http://localhost:3333/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2026-01-05T...",
  "environment": "development"
}
```

Teste a API de clientes:
```bash
curl http://localhost:3333/api/clientes
```

Se funcionar, você verá um JSON vazio (porque ainda não há clientes):

```json
{
  "data": [],
  "total": 0
}
```

**Parabéns!** O backend está conectado ao Supabase! 🎉

---

## 🚀 PRÓXIMO PASSO

Agora você pode:

1. **Testar as APIs** no browser ou com curl
2. **Iniciar o frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
3. **Acessar o sistema:** http://localhost:5173
4. **Criar dados de teste** usando as APIs

---

## 🆘 SOLUÇÃO DE PROBLEMAS

### Erro: "Supabase URL e Key são obrigatórios"

**Causa:** Variáveis de ambiente não configuradas no `.env`

**Solução:**
1. Verifique se o arquivo `backend/.env` existe
2. Confirme que `SUPABASE_URL` e `SUPABASE_KEY` estão preenchidos
3. Reinicie o backend: `npm run dev`

### Erro: "relation does not exist"

**Causa:** Schema SQL não foi executado

**Solução:**
1. Vá ao Supabase → SQL Editor
2. Copie e execute o arquivo `database-schema.sql`
3. Aguarde a mensagem de sucesso

### Erro: "Connection refused"

**Causa:** Backend não está rodando

**Solução:**
```bash
cd backend
npm run dev
```

### Erro: "Erro ao buscar clientes"

**Causa:** Problema de autenticação ou permissões no Supabase

**Solução:**
1. Verifique se as variáveis de ambiente estão corretas
2. Confirme se o usuário foi inserido na tabela `usuarios`
3. Verifique as políticas RLS no Supabase

---

## 📖 REFERÊNCIAS

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

## ✅ CHECKLIST

- [ ] Projeto Supabase criado
- [ ] Credenciais copiadas
- [ ] Schema SQL executado
- [ ] Usuário criado no Auth
- [ ] Usuário inserido na tabela `usuarios`
- [ ] Backend `.env` configurado
- [ ] Frontend `.env` configurado
- [ ] Backend rodando sem erros
- [ ] Health check funcionando
- [ ] API de clientes testada

---

**Quando todos os itens estiverem marcados, seu sistema está pronto para uso!** 🎉

---

**Criado:** 05/01/2026
**Versão:** 1.0
