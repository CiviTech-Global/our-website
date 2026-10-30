# --- Build stage ---
FROM node:26-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

# --- Production dependencies stage ---
FROM node:26-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --no-audit --no-fund
RUN npx prisma generate

# --- Runtime stage ---
FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --from=deps --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/dist ./dist
COPY --chown=app:app package*.json ./

# The uploads volume mounts here, and this directory has to exist in the image
# for that mount to be usable. Docker seeds an empty named volume from whatever
# the image has at the mount point, ownership included; with nothing there it
# creates the mount point itself, owned by root — and the process runs as `app`,
# so every write failed with EACCES and every upload in production returned a
# 500. Creating it here, owned by the user that runs, is what makes a fresh
# volume writable. An existing volume keeps its own ownership, which is why the
# deploy also repairs one that was created before this line existed.
RUN mkdir -p /app/storage/project-attachments && chown -R app:app /app/storage

# Drop the npm CLI the base image ships with.
#
# Nothing here runs it: the API is started with `node dist/index.js`, the
# healthcheck uses wget, and migrations run the Prisma CLI out of node_modules
# directly (see the migrate service in docker-compose.yml).
#
# It is removed because it was the ONLY thing failing the CI vulnerability
# gate. Every one of the ten fixable CRITICAL/HIGH findings on node:22-alpine
# sits in /usr/local/lib/node_modules/npm/node_modules — brace-expansion,
# ip-address, pacote, picomatch, sigstore — none in an OS package and none in
# our own dependencies. The gate is right to fail; the answer is not to lower
# it but to stop shipping a package manager into production, which no runtime
# image needs anyway.
# yarn goes with them: also a package manager, also unused here, and 5 MB of
# code that only a future advisory can do anything with.
#
# This does NOT make the image smaller, and it was measured rather than
# assumed: 732 MB before and after. A layer that deletes a file hides it from
# the filesystem but the layer underneath still carries it, so the download is
# the same size. What changes is what exists in the container that runs — which
# is what the scanner reads and what an attacker would find.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack     /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /root/.npm     /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg

USER app

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health/ready || exit 1
CMD ["node", "dist/index.js"]
