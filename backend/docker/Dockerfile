FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get -o Acquire::Retries=5 update && apt-get -o Acquire::Retries=5 install -y --no-install-recommends \
    g++ openjdk-21-jdk-headless python3 nodejs coreutils ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 runner

WORKDIR /workspace
USER runner
ENTRYPOINT ["/bin/sh"]
