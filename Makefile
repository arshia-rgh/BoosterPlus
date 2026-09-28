SHELL := /bin/sh
.DEFAULT_GOAL := help
export GOSUMDB := sum.golang.org
.PHONY: help bootstrap hooks check-repository stage-check pre-commit

help:
	@printf '%s\n' 'bootstrap: install pinned tools/dependencies' 'hooks: install owner-approved staged checks' 'stage-check: focused implementation checks until DI15' 'pre-commit: complete repository/backend/frontend/production qualification'
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
	python3 -m unittest discover -s scripts -p 'test_browser_selection.py'
	python3 scripts/check_repository.py
	python3 docs/redesign/check_implementation.py
	cmp backend/api/openapi.json frontend/contracts/openapi.json
	.tools/actionlint
	git diff --check
	git diff --cached --check
# Focused integration/browser scenarios and senior UI review are run for the
# changed behavior and recorded in docs/progress.md before stage delivery.
# This target does not claim aggregate TiDB/browser/container qualification.
stage-check:
	$(MAKE) check-repository
	$(MAKE) -C backend stage-check
	$(MAKE) -C frontend stage-check
pre-commit:
	$(MAKE) check-repository
	$(MAKE) -C backend pre-commit
	$(MAKE) -C frontend pre-commit
	$(MAKE) -C production pre-commit
