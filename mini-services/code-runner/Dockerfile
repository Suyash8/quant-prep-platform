FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    bubblewrap \
    python3 \
    g++ \
    curl \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Pin Bun version for reproducible runner builds and install globally for non-root use
ARG BUN_VERSION=1.2.15
RUN curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash -s "bun-v${BUN_VERSION}"

RUN useradd -m -u 10001 runner
WORKDIR /app
COPY --chown=runner:runner index.ts .

USER runner

ENV QF_RUNNER_PORT=3010
ENV QF_RUNNER_HOST=0.0.0.0

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3010/healthz || exit 1

CMD ["bun", "index.ts"]
