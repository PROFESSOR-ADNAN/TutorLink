# ── Stage 1: Install dependencies ────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci 

# ── Stage 2: Final production image ──────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user 
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only what we need from the deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

# Set ownership to our non-root user
RUN chown -R appuser:appgroup /app
USER appuser

# Tell Docker which port the app uses 
EXPOSE 5000

# Healthcheck: Docker will ping this every 30s
# If it fails 3 times, the container is marked unhealthy and restarted
# Use Node's built-in HTTP module
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/v1/health',(r)=>{process.exit(r.statusCode===200?0:1)})"

CMD ["node", "src/server.js"]