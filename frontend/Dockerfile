# ─── Builder stage ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
ARG VITE_CERTIFIER_URL=https://whoiam.bsvb.tech
ENV VITE_CERTIFIER_URL=$VITE_CERTIFIER_URL
RUN npm run build

# ─── Production stage ────────────────────────────────────────────────────────
FROM nginx:alpine AS production

RUN apk add --no-cache wget

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
