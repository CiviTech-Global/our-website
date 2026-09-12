# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# --- Production stage: static serving via nginx ---
FROM nginx:1.27-alpine AS production

# nginx:alpine already ships an unprivileged "nginx" user; reuse it and just
# make sure it can read the app files and write to the paths nginx needs at
# runtime (pid file, cache dirs) when not running as root.
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /etc/nginx/conf.d

USER nginx

EXPOSE 80
# 127.0.0.1, not localhost. The image's nginx listens on IPv4 only
# (`listen 80;`), while localhost resolves to [::1] first in this base image —
# so the check connected to IPv6, got "connection refused", and reported a
# container that was serving traffic perfectly well as unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
