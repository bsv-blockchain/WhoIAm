# ─── Builder stage ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# .npmrc routes the @bsv-blockchain-demos scope to GitHub Packages. The auth
# token is supplied as a BuildKit secret and is never written into an image
# layer (the throwaway user-config file is removed within the same RUN).
COPY package.json package-lock.json* .npmrc ./
RUN --mount=type=secret,id=github_token \
    printf '//npm.pkg.github.com/:_authToken=%s\n' "$(cat /run/secrets/github_token)" > /tmp/auth.npmrc && \
    NPM_CONFIG_USERCONFIG=/tmp/auth.npmrc npm ci && \
    rm -f /tmp/auth.npmrc

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Production stage ────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

RUN apk add --no-cache wget

# Same GitHub Packages auth pattern as the builder stage; token stays out of
# the layer. float-balance-route is a runtime dependency, so it installs here.
COPY package.json package-lock.json* .npmrc ./
RUN --mount=type=secret,id=github_token \
    printf '//npm.pkg.github.com/:_authToken=%s\n' "$(cat /run/secrets/github_token)" > /tmp/auth.npmrc && \
    NPM_CONFIG_USERCONFIG=/tmp/auth.npmrc npm ci --omit=dev && \
    rm -f /tmp/auth.npmrc

COPY --from=builder /app/out ./out

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
  CMD wget -qO- http://localhost:8080/health || exit 1

USER node
CMD ["node", "out/index.js"]
