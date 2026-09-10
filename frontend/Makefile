SHELL := /bin/sh
.DEFAULT_GOAL := help
.PHONY: help install dev build start preview typecheck lint fmt fmt-check test test-watch test-coverage test-e2e test-a11y security pre-commit ci clean docker-build docker-run

help:
	@printf '%s\n' 'install dev build start typecheck lint fmt fmt-check test test-e2e security pre-commit docker-build'
install:
	npm ci --include=dev
dev: setup-env
	npm run dev
build:
	npm run build
start preview:
	npm run start
typecheck:
	npm run typecheck
lint:
	npm run lint
fmt:
	npm run format
fmt-check:
	npm run format:check
test test-coverage:
	npm run test
test-watch:
	npm run test:watch
test-e2e test-a11y: build
	npm run test:e2e
security:
	npm run security
pre-commit ci:
	npm run pre-commit
	$(MAKE) docker-build image-security
	python3 scripts/container-smoke.py
clean:
	rm -rf build coverage test-results playwright-report .react-router
docker-build:
	docker build -t boosterplus-frontend:local .
docker-run:
	docker run --rm -p 127.0.0.1:3000:3000 boosterplus-frontend:local

.PHONY: contract-generate contract-check contract-update
contract-generate:
	npm run contract:generate
contract-check:
	npm run contract:check
contract-update:
	cp ../backend/api/openapi.json contracts/openapi.json
	$(MAKE) contract-generate

.PHONY: image-security
image-security:
	python3 ../scripts/scan-image.py boosterplus-frontend:local

.PHONY: setup-env
setup-env:
	python3 scripts/setup-env.py

.PHONY: test-server
test-server: build
	npm run test:server
