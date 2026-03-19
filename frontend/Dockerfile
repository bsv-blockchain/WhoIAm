# ─── Builder stage ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
ARG VITE_FRONT_URL=https://whoiam.bsvb.tech
ARG VITE_API_URL=https://api.whoiam.bsvb.tech
ENV VITE_FRONT_URL=$VITE_FRONT_URL
ENV VITE_API_URL=$VITE_API_URL
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
