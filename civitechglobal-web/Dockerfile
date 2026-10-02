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
#
# Alpine plus its own nginx package, not the official nginx:*-alpine image.
#
# The CI vulnerability gate (CRITICAL/HIGH, fixable only) failed on every build
# this project has ever run, and the web image was half of why. Measured with
# the gate's own settings on 2026-10-01:
#
#   nginx:1.27-alpine (what this used to be)   43 findings, 2 CRITICAL
#   nginx:1.28-alpine                          56
#   nginx:1.29-alpine                          39
#   nginx:1.28-alpine + apk upgrade             5 — all in nginx itself
#   alpine:3.23 + apk add nginx + apk upgrade   0
#
# No nginx:*-alpine tag is clean, so bumping the tag was not the answer. The
# last five were the giveaway: Alpine ships nginx 1.28.3-r7 while the official
# image installs 1.28.3-r1 from nginx.org's own repository, so apk upgrade
# cannot reach it. Taking nginx from Alpine gets the same 1.28.3 with the
# patched package revision, and puts every package in the image under one
# updater.
#
# Re-check rather than trust this: a pinned base is clean on the day it is
# pinned and decays from then on. The gate is what notices, which is a reason
# to keep it failing loudly rather than to lower it. 04-local-dev.md in the
# ops notes has the command.
FROM alpine:3.24 AS production

RUN apk add --no-cache nginx && apk upgrade --no-cache

# The package makes the nginx user and /etc/nginx/http.d; the official image's
# conf.d is not a path here. Logs go to the container's stdout and stderr,
# which the official image arranges and the package does not.
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/http.d/default.conf

RUN rm -f /etc/nginx/http.d/default.conf.apk-new \
    && mkdir -p /var/cache/nginx /var/lib/nginx/tmp /run/nginx /var/log/nginx \
    && ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log \
    && chown -R nginx:nginx /var/cache/nginx /var/lib/nginx /run/nginx /etc/nginx/http.d

USER nginx

EXPOSE 80
# 127.0.0.1, not localhost. The image's nginx listens on IPv4 only
# (`listen 80;`), while localhost resolves to [::1] first in this base image —
# so the check connected to IPv6, got "connection refused", and reported a
# container that was serving traffic perfectly well as unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
