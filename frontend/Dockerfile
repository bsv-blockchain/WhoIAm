# ─── Build dependencies stage ────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# ─── Production stage ────────────────────────────────────────────────────────
FROM nginx:alpine AS production

RUN apk add --no-cache wget nodejs npm

WORKDIR /app
COPY --from=deps /app /app
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
