SHELL := /bin/sh
.DEFAULT_GOAL := help
export GOSUMDB := sum.golang.org
.PHONY: help bootstrap hooks check-repository pre-commit

help:
	@printf '%s\n' 'bootstrap: install pinned tools/dependencies' 'hooks: enforce both project checks before every commit' 'pre-commit: repository security + backend + frontend gates'
bootstrap:
	python3 scripts/install-trivy.py
	$(MAKE) -C backend bootstrap
	cd backend && GOBIN=$(CURDIR)/.tools go install github.com/zricethezav/gitleaks/v8@v8.30.1
	cd backend && GOBIN=$(CURDIR)/.tools go install github.com/rhysd/actionlint/cmd/actionlint@v1.7.12
	$(MAKE) -C frontend install
	cd frontend && npx playwright install chromium
	$(MAKE) hooks
hooks:
	git config --local core.hooksPath .githooks
check-repository:
	python3 -m unittest discover -s scripts -p 'test_commit_gate.py'
	python3 scripts/check_repository.py
	cmp backend/api/openapi.json frontend/contracts/openapi.json
	.tools/actionlint
	git diff --check
	git diff --cached --check
pre-commit:
	$(MAKE) check-repository
	$(MAKE) -C backend pre-commit
	$(MAKE) -C frontend pre-commit
	$(MAKE) -C production pre-commit
