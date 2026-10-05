FROM golang:1.27.1-bookworm@sha256:648f440f42a0958804efb24df176f806f9d353b41f1c0627f666428e40310f6b AS build
ENV CGO_ENABLED=0 GOSUMDB=sum.golang.org
RUN go install github.com/caddyserver/xcaddy/cmd/xcaddy@v0.4.7
WORKDIR /build
# Preserve the Caddy release while replacing dependencies with security fixes.
RUN xcaddy build v2.11.4 --output /build/caddy \
    --replace golang.org/x/crypto=golang.org/x/crypto@v0.55.0 \
    --replace golang.org/x/net=golang.org/x/net@v0.56.0 \
    --replace golang.org/x/text=golang.org/x/text@v0.39.0 \
    --replace google.golang.org/grpc=google.golang.org/grpc@v1.83.2
FROM caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648
# Curl is unused at runtime. Keep exact patched TLS libraries and no file caps.
RUN apk del curl && apk add --no-cache libcrypto3=3.5.9-r0 libssl3=3.5.9-r0 \
    && setcap -r /usr/bin/caddy && chown 1000:1000 /data /config
COPY --from=build /build/caddy /usr/bin/caddy
USER 1000:1000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8090/health || exit 1
