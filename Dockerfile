# Stage 1: Build workspace packages and Angular frontend
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install minimal build tools (git for repository context)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests and configurations
COPY package.json package-lock.json* tsconfig*.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/db/package.json ./packages/db/
COPY packages/tools/package.json ./packages/tools/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/engine/package.json ./packages/engine/

# Install all monorepo dependencies
RUN npm ci

# Copy full monorepo source code
COPY . .

# Build packages in dependency order
RUN npm run build --workspace=@cacophony/shared-types
RUN npm run build --workspace=@cacophony/db
RUN npm run build --workspace=@cacophony/tools
RUN npm run build --workspace=@cacophony/frontend
RUN npm run build --workspace=@cacophony/engine

# Stage 2: Production runtime image
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Install minimal runtime dependencies (git, curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV DB_DRIVER=pglite
ENV DB_PATH=/app/data/cacophony_pglite
ENV FRONTEND_DIST_PATH=/app/packages/frontend/dist/frontend/browser
ENV PORT_API=24161
ENV PORT_MCP=21264

# Copy built distribution bundles, node_modules, and binaries
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/packages/shared-types ./packages/shared-types
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/tools ./packages/tools
COPY --from=builder /app/packages/frontend/dist ./packages/frontend/dist
COPY --from=builder /app/packages/engine ./packages/engine

# Create persistent storage directories
RUN mkdir -p /app/data /app/workspaces /app/conf

# Expose HTTP API + Frontend (24161) and MCP (21264)
EXPOSE 24161 21264

# Default start command launches Cacophony daemon via compiled CLI entrypoint
CMD ["node", "packages/engine/dist/cli/runDaemon.js"]
