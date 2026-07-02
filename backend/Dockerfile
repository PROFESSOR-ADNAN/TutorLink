# ── Stage 1: Install dependencies ────────────────────────
# We use a separate stage so the final image doesn't include npm, build tools, etc.
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only package files first — Docker caches this layer
# If you only change source code (not dependencies), this layer stays cached
# and npm install is NOT re-run → much faster rebuilds
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Final production image ──────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user — running as root inside Docker is a security risk
# If an attacker exploits the app they get a limited user, not root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only what we need from the deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

# Set ownership to our non-root user
RUN chown -R appuser:appgroup /app
USER appuser

# Tell Docker which port the app uses (documentation only — doesn't actually open it)
EXPOSE 5000

# Healthcheck: Docker will ping this every 30s
# If it fails 3 times, the container is marked unhealthy and restarted
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/v1/health || exit 1

CMD ["node", "src/server.js"]
