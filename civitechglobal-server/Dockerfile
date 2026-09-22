# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

# --- Production dependencies stage ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --no-audit --no-fund
RUN npx prisma generate

# --- Runtime stage ---
FROM node:22-alpine AS runtime
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

USER app

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health/ready || exit 1
CMD ["node", "dist/index.js"]
