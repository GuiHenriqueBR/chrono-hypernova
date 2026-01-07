# Guia de Deploy - Chrono Hypernova

Este guia contém os passos para subir o projeto no Vercel (Frontend) e Railway (Backend + Evolution API), considerando as configurações realizadas.

## 1. Configuração do Backend e Evolution API (Railway)

O arquivo `railway.toml` já foi criado para configurar dois serviços:

1. **backend**: A API principal (Node.js/Express).
2. **evolution-api**: A API de WhatsApp (Docker).

### Passos:

1. **Vincular Projeto**:
   Se ainda não vinculou, execute no terminal na raiz do projeto:

   ```bash
   railway link
   # Selecione o projeto "chrono-hypernova-prod"
   ```

2. **Deploy Inicial**:
   Para criar os serviços pela primeira vez:

   ```bash
   railway up --detach
   ```

3. **Configurar Variáveis de Ambiente (Backend)**:
   Copie as variáveis do seu arquivo `backend/.env` para o serviço `backend` no Railway. Você pode fazer isso pelo painel do Railway ou via terminal:

   ```bash
   # Exemplo de comando (substitua pelos valores reais do backend/.env)
   railway variables --service backend --set NODE_ENV=production
   railway variables --service backend --set SUPABASE_URL=...
   railway variables --service backend --set SUPABASE_KEY=...
   railway variables --service backend --set DATABASE_URL=...
   # Adicione as outras chaves: SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, etc.
   ```

4. **Configurar Evolution API**:
   O serviço `evolution-api` precisa de uma chave de autenticação e da URL pública.

   ```bash
   # Chave padrão definida no docker-compose (pode alterar se desejar)
   railway variables --service evolution-api --set AUTHENTICATION_API_KEY=429683C4C977415CAAFCCE10F7D57E11

   # Porta interna
   railway variables --service evolution-api --set SERVER_PORT=8080
   ```

   **Importante:** Após o deploy, pegue a URL pública gerada para o `evolution-api` (nas configurações do Railway) e defina a variável `SERVER_URL`:

   ```bash
   railway variables --service evolution-api --set SERVER_URL=https://sua-url-evolution-api.up.railway.app
   ```

5. **Conectar Backend e Evolution API**:
   Se o backend precisar falar com o Evolution, configure a variável no Backend com a URL do Evolution.

---

## 2. Configuração do Frontend (Vercel)

O arquivo `frontend/vercel.json` já está configurado.

1. **Obter URL da API**:
   Pegue a URL pública do serviço `backend` no Railway (ex: `https://backend-production.up.railway.app`).

2. **Deploy**:
   No terminal, entre na pasta do frontend:

   ```bash
   cd frontend
   vercel
   ```

   Siga as instruções para criar/vincular o projeto.

3. **Variáveis de Ambiente (Vercel)**:
   No painel da Vercel (ou durante o setup CLI), adicione as variáveis:
   - `VITE_API_URL`: A URL do seu backend no Railway (ex: `https://seu-backend.up.railway.app/api`).
   - `VITE_SUPABASE_URL`: (Valor do `backend/.env`)
   - `VITE_SUPABASE_ANON_KEY`: (Valor do `backend/.env`)

4. **Redeploy**:
   Após configurar as variáveis, faça um novo deploy se necessário:
   ```bash
   vercel --prod
   ```

## 3. Observações sobre Chaves (Key Variable)

Durante o processo, se for solicitado alguma "key variable" (chave de API) que você não possui no momento (como chaves de OpenAI ou integrações específicas):

- **Opção 1**: Deixe o valor em branco ou use um placeholder (ex: `sk-placeholder`). O serviço pode iniciar, mas a funcionalidade específica falhará.
- **Opção 2**: Adicione a variável posteriormente pelo painel do Railway/Vercel e redeploy.
