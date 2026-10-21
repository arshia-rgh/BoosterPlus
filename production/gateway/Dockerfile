FROM golang:1.27.2-bookworm@sha256:5cf287a799e6b94384bad13d16b14904c531f51ba65792237e122ce42b392f61 AS build
ENV CGO_ENABLED=0 GOSUMDB=sum.golang.org
RUN go install github.com/caddyserver/xcaddy/cmd/xcaddy@v0.4.7
WORKDIR /build
# Preserve the Caddy release while replacing dependencies with security fixes.
RUN xcaddy build v2.11.4 --output /build/caddy \
    --replace github.com/klauspost/compress=github.com/klauspost/compress@v1.18.7 \
    --replace golang.org/x/crypto=golang.org/x/crypto@v0.57.0 \
    --replace golang.org/x/net=golang.org/x/net@v0.60.0 \
    --replace golang.org/x/text=golang.org/x/text@v0.42.0 \
    --replace google.golang.org/grpc=google.golang.org/grpc@v1.83.2
FROM caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648
# Curl is unused at runtime. Keep exact patched TLS libraries and no file caps.
RUN apk del curl && apk add --no-cache libcrypto3=3.5.9-r0 libssl3=3.5.9-r0 \
    && setcap -r /usr/bin/caddy && chown 1000:1000 /data /config
COPY --from=build /build/caddy /usr/bin/caddy
USER 1000:1000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8090/health || exit 1
