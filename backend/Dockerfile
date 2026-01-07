FROM node:20-alpine

WORKDIR /app

# Instalar dependências de build necessárias (opcional, mas bom pra garantir)
RUN apk add --no-cache python3 make g++

# Copiar apenas arquivos de dependência primeiro para aproveitar cache do Docker
COPY package*.json ./

# Instalar dependências ignorando scripts de prepublish se houver
RUN npm install

# Copiar o restante do código fonte
COPY . .

# Buildar o projeto TypeScript
RUN npm run build

# Limpar dependências de desenvolvimento para reduzir tamanho da imagem (opcional)
# RUN npm prune --production

EXPOSE 3000

CMD ["npm", "start"]
