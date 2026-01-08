FROM node:20-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
# Note: Since we don't have a package-lock.json in apps/backend, this will generate one.
# If this is a monorepo, ideally we should build from root, but for now we treat this as standalone
# to match the directory context set in railway.toml
COPY package.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Prune dev dependencies to reduce image size
RUN npm prune --production

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
