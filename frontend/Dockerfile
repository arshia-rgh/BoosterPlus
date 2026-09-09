ARG TARGETARCH
FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS node-amd64
# The LTS patch archive is checksum-pinned until the official Docker tag is available.
ADD --checksum=sha256:6e1db87ef58b8819e5d5402eff1536491b18edd8eb7bee5ef7897876e88dc5ff https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.gz /tmp/node.tar.gz
RUN tar -xzf /tmp/node.tar.gz -C /usr/local --strip-components=1 && rm /tmp/node.tar.gz

FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS node-arm64
ADD --checksum=sha256:724282c3b43aec998aa9527380465b45d229e021b58035f5f4f63095eabfe5d5 https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-arm64.tar.gz /tmp/node.tar.gz
RUN tar -xzf /tmp/node.tar.gz -C /usr/local --strip-components=1 && rm /tmp/node.tar.gz

FROM node-${TARGETARCH} AS node-runtime
FROM node-runtime AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --include=dev
COPY . .
RUN npm run typecheck && npm run build

FROM node-runtime AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node-runtime AS runtime
# The runtime executes Node directly and does not need package managers or their dependencies.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 CMD ["node", "--input-type=module", "-e", "const r=await fetch('http://127.0.0.1:3000/',{signal:AbortSignal.timeout(3000)});process.exit(r.ok?0:1)"]
CMD ["node", "node_modules/@react-router/serve/dist/cli.js", "build/server/index.js"]
