# ── Stage 1: Build React app ──────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build the production static files into /app/dist
RUN npm run build

# ── Stage 2: Serve with Nginx ─────────────────────────────
# Nginx is a tiny, high-performance web server 
FROM nginx:alpine AS runner

# Copy our custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
