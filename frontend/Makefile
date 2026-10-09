SHELL := /bin/sh
.DEFAULT_GOAL := help
.PHONY: help install dev build start preview typecheck lint fmt fmt-check test test-watch test-coverage test-e2e test-a11y security pre-commit ci clean docker-build docker-run

help:
	@printf '%s\n' 'install dev dev-storefront dev-admin build build-storefront build-admin build-booster start typecheck lint fmt fmt-check test test-e2e test-home test-admin test-experience test-server budget-home budget-experience security pre-commit docker-build'
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
.PHONY: stage-check
# Keep aggregate browser/container qualification for DI15; run changed browser
# scenarios explicitly and retain their evidence with the stage record.
stage-check:
	npm run contract:check
	npm run format:check
	npm run typecheck
	npm run lint
	npm run test
	npm run security
	npm run build
	npm run test:server
clean:
	rm -rf build coverage test-results playwright-report .react-router
docker-build:
	docker build --target storefront -t boosterplus-frontend:local .
	docker build --target admin -t boosterplus-admin:local .
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
	python3 ../scripts/scan-image.py boosterplus-admin:local

.PHONY: setup-env
setup-env:
	python3 scripts/setup-env.py

.PHONY: test-server
test-server: build
	npm run test:server

.PHONY: test-home budget-home
test-home: build
	npx playwright test tests/e2e/home.spec.ts
budget-home:
	npm run budget:home

.PHONY: dev-storefront dev-admin build-storefront build-admin build-booster start-storefront start-admin test-admin
dev-storefront: setup-env
	npm run dev:storefront
dev-admin: setup-env
	npm run dev:admin
build-storefront:
	npm run build:storefront
build-admin:
	npm run build:admin
build-booster:
	npm run build:booster
start-storefront:
	npm run start:storefront
start-admin:
	npm run start:admin
test-admin: build
	npm run test:e2e

.PHONY: test-experience budget-experience
test-experience: build
	npm run test:e2e
budget-experience:
	npm run budget:experience

.PHONY: test-cross-browser
# Uses the same isolated TiDB/SMTP fixtures and complete route suite for every engine.
test-cross-browser: build
	PLAYWRIGHT_ENGINE=chromium npm run test:e2e
	PLAYWRIGHT_ENGINE=firefox npm run test:e2e
	PLAYWRIGHT_ENGINE=webkit npm run test:e2e

.PHONY: test-portals
# Actual three SSR graphs, isolated synthetic provider/API fixtures and browser cookies.
test-portals: build
	npm run test:portals
