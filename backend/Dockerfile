FROM node:20-alpine

WORKDIR /app

# Instalar dependências de build necessárias
RUN apk add --no-cache python3 make g++

# Copiar apenas arquivos de dependência primeiro para aproveitar cache do Docker
COPY package*.json ./

# Limpar cache do npm e instalar dependências
RUN npm cache clean --force && npm install --legacy-peer-deps

# Copiar o restante do código fonte
COPY . .

# Buildar o projeto TypeScript
RUN npm run build

# Limpar dependências de desenvolvimento para reduzir tamanho da imagem
RUN npm prune --production

EXPOSE 3000

CMD ["npm", "start"]
