# Node runs in both stages: deps installs, and entrypoint.sh builds at start.
ARG NODE_VERSION=22.23.4

# ─── Build dependencies stage ────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# ─── Production stage ────────────────────────────────────────────────────────
FROM nginx:alpine AS production
ARG NODE_VERSION

# Node comes from the pinned deps image rather than Alpine's nodejs package,
# so the runtime version is exact. libstdc++ is its only extra runtime lib.
# npm/npx are symlinks in the node image; COPY would dereference them.
COPY --from=deps /usr/local/bin/node /usr/local/bin/node
COPY --from=deps /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN apk add --no-cache wget libstdc++ && \
    ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && \
    ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
ENV NODE_VERSION=${NODE_VERSION}

WORKDIR /app
COPY --from=deps /app /app
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
