SHELL := /bin/sh

.PHONY: install install-frontend install-backend \
	dev-frontend dev-backend test test-frontend test-backend \
	lint lint-frontend lint-backend build build-frontend build-backend

install: install-frontend install-backend

install-frontend:
	npm --prefix frontend ci

install-backend:
	uv sync --project backend --python 3.12

dev-frontend:
	npm --prefix frontend run dev

dev-backend:
	uv run --project backend uvicorn --app-dir backend app.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir backend

test: test-frontend test-backend

test-frontend:
	npm --prefix frontend run test

test-backend:
	uv run --project backend pytest -c backend/pyproject.toml backend/tests

lint: lint-frontend lint-backend

lint-frontend:
	npm --prefix frontend run lint

lint-backend:
	uv run --project backend ruff check backend
	uv run --project backend ruff format --check backend

build: build-frontend build-backend

build-frontend:
	npm --prefix frontend run build

build-backend:
	uv run --project backend python -m compileall -q backend/app backend/tests
