FROM python:3.12.8-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

ENV CARGO_BUILD_JOBS=1
ENV MATURIN_BUILD_SCRIPT=1
ENV CARGO_PROFILE_RELEASE_LTO=off
ENV CARGO_PROFILE_RELEASE_CODEGEN_UNITS=16

RUN mkdir -p /root/.cargo && \
    echo '[profile.release]' > /root/.cargo/config.toml && \
    echo 'lto = false' >> /root/.cargo/config.toml && \
    echo 'codegen-units = 16' >> /root/.cargo/config.toml && \
    echo 'opt-level = 2' >> /root/.cargo/config.toml

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY . .

FROM base AS dev

RUN uv sync --frozen --no-dev
CMD ["uv", "run", "python", "manage.py", "runbolt", "--dev"]

FROM base AS prod

RUN uv sync --frozen --no-dev
RUN uv run python manage.py collectstatic --noinput 2>/dev/null || true

CMD ["uv", "run", "python", "manage.py", "runbolt", "--host", "0.0.0.0", "--port", "8000", "--processes", "4", "--backlog", "2048", "--keep-alive", "30"]
