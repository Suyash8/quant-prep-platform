FROM ubuntu:24.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies: bubblewrap, python3, g++, curl, unzip, ca-certificates
RUN apt-get update && apt-get install -y \
    bubblewrap \
    python3 \
    python3-pip \
    g++ \
    curl \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

COPY index.ts .

ENV QF_RUNNER_PORT=3010
ENV QF_RUNNER_HOST=0.0.0.0

EXPOSE 3010

CMD ["bun", "index.ts"]
