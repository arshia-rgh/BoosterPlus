FROM clamav/clamav:1.5.3@sha256:d06c1d6a451d616e1dd79b42f44c8c8c291bba9cf4e75ebc4d0e43c1c6dd87bb
# Upstream's pinned image predates the OpenSSL fix for CVE-2026-14456.
# Keep exact patched package versions and scan the resulting image in every gate.
RUN apk add --no-cache libcrypto3=3.5.8-r0 libssl3=3.5.8-r0
