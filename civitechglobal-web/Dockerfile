# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .

# Vite inlines VITE_* at build time, and .dockerignore deliberately keeps .env
# out of the image — so anything the bundle needs has to arrive as a build arg
# or it silently falls back to its default.
#
# The canonical origin is what <link rel="canonical">, hreflang and og:url
# point at. Behind a domain with a www alias the apex and the www form would
# otherwise each declare themselves canonical, which is the duplicate-content
# problem the tag exists to settle.
#
# Defaulted to the real origin rather than left empty. Empty is not a safe
# default here: the app treats it as "no origin" and emits no canonical, no
# hreflang and no og:url at all, so an image built without --build-arg is a
# site with none of its indexing metadata — which is exactly what shipped when
# these images were built by hand. A wrong-but-present origin would be caught
# by anyone looking at the page; an absent one looks like nothing is wrong.
# scripts/build-sitemap.mjs carries the same default for the same reason.
ARG VITE_CANONICAL_ORIGIN="https://rayantamaddonjahangostar.ir"
ENV VITE_CANONICAL_ORIGIN=$VITE_CANONICAL_ORIGIN

RUN npm run build

# Prerender the public pages into real HTML.
#
# This has to happen here, in the image that ships, and not on a laptop: dist/
# is gitignored, so a locally prerendered build never reaches the server — the
# prerender step existed for a release and had no effect in production, which
# is invisible unless somebody curls the HTML and notices <div id="root"> is
# still empty.
#
# Chromium is installed in the build stage only; the production stage below
# copies dist/ into nginx and carries none of it. `--no-sandbox` is already
# passed by the script, which is what lets Chromium run as root in a container.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV CHROME_PATH=/usr/bin/chromium-browser
RUN npm run prerender

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
