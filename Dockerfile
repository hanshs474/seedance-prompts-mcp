# For Glama's server check (and anyone who prefers a container).
# Node 22 alpine, no install step: the server has no dependencies and the 150 prompts are
# bundled, so the image is the source plus a runtime.
FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src

# stdio transport: the client speaks newline-delimited JSON-RPC over stdin/stdout,
# so there is no port to expose and no network access needed at runtime.
ENTRYPOINT ["node", "src/index.js"]
