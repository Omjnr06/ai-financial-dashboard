# Python and UV installation
FROM python:3.12-slim AS base
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app

# dev settings
FROM base AS development
COPY pyproject.toml .
RUN uv pip install --system -r pyproject.toml
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# prod settings
FROM base AS production
COPY pyproject.toml .
RUN uv pip install --system --no-cache -r pyproject.toml
COPY . .
CMD uv run uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}