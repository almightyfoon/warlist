# Stage 1: Compile TypeScript frontend
FROM node:22-alpine AS frontend

# Single source of truth for the app version -- baked into the JS bundle here
# and into the runtime image's default env below, so both stay in sync from
# one line. Bump this, don't touch anything else, to cut a new version.
ARG APP_VERSION=0.9.0

WORKDIR /src

COPY cc/package.json ./cc/
RUN cd cc && npm install --ignore-scripts

COPY cc/ ./cc/

RUN cd cc && VITE_APP_VERSION=$APP_VERSION npx vite build


# Stage 2: Compile Go backend
FROM golang:1.26-alpine AS backend

WORKDIR /src

COPY backend/go.mod ./
RUN go mod download || true

COPY backend/ ./
RUN CGO_ENABLED=0 GOFLAGS=-mod=mod \
    go build -ldflags="-s -w" -o /app/server ./cmd/server


# Stage 3: Runtime image
FROM alpine:3.24

ARG APP_VERSION=0.9.0
ENV APP_VERSION=$APP_VERSION

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=backend /app/server         ./server

# Vite-built HTML + hashed JS/CSS bundles
COPY --from=frontend /src/cc/dist       ./static

# Static assets not processed by Vite
COPY --from=frontend /src/cc/img        ./static/img
COPY --from=frontend /src/cc/pdfsheet   ./static/pdfsheet

# Web fonts referenced by cc.css (@font-face); served from static root since
# the CSS references them as bare filenames, not under /img or /pdfsheet.
COPY --from=frontend /src/cc/GearedSlab.ttf /src/cc/NewtextDemiRegular.otf ./static/

# Bake data into image at two locations:
#   static/data  — used when no bind mount is present (local dev)
#   data-defaults — used by the entrypoint to seed an empty bind mount
COPY --from=frontend /src/cc/data       ./static/data
COPY --from=frontend /src/cc/data       ./data-defaults

COPY docker-entrypoint.sh ./entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]
CMD ["./server"]
