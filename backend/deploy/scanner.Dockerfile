FROM clamav/clamav:1.5.3@sha256:d06c1d6a451d616e1dd79b42f44c8c8c291bba9cf4e75ebc4d0e43c1c6dd87bb
# Upstream's pinned image predates the OpenSSL fix for CVE-2026-14456.
# Keep exact patched package versions and scan the resulting image in every gate.
RUN apk add --no-cache libcrypto3=3.5.8-r0 libssl3=3.5.8-r0
# Normalize upstream's duplicate LocalSocket defaults before its environment
# overlay runs. Named volumes inherit ownership so clamd can create the socket.
RUN sed -i '/^LocalSocket /d' /etc/clamav/clamd.conf \
    && printf '%s\n' 'LocalSocket /run/clamav/clamd.sock' >> /etc/clamav/clamd.conf \
    && mkdir -p /run/clamav && chown clamav:clamav /run/clamav \
    && sed -i 's/nc localhost 3310/nc 127.0.0.1 3310/' /usr/local/bin/clamdcheck.sh
