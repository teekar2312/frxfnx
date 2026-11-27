# ============================================================
# FINEX Forex Trading Platform — Multi-stage Dockerfile
# ============================================================
# Build:  docker build -t finex-forex:2.0.0 .
# Run:    docker run -p 3000:3000 -p 3004:3004 --env-file .env.production finex-forex:2.0.0
# ============================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install bun
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock* ./
COPY mini-services/mt5-bridge/package.json ./mini-services/mt5-bridge/

# Install dependencies
RUN bun install --frozen-lockfile
RUN cd mini-services/mt5-bridge && bun install

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g bun

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/mini-services/mt5-bridge/node_modules ./mini-services/mt5-bridge/node_modules

# Copy source
COPY . .

# Set NEXT_TELEMETRY_DISABLED
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js (production build)
RUN bun run build

# Stage 3: Runner (production image, minimal)
FROM node:20-alpine AS runner
WORKDIR /app

# Install bun (untuk mini-service)
RUN npm install -g bun

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV BRIDGE_PORT=3004

# Create non-root user untuk security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy built app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/mini-services ./mini-services
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

# Create directories
RUN mkdir -p /app/logs /app/db && chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3000 3004

# Healthcheck (Next.js)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start script: run both Next.js + MT5 bridge
COPY --from=builder /app/scripts/deploy/docker-start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
