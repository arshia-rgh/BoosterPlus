SHELL := /bin/sh
.DEFAULT_GOAL := help
.PHONY: help host-check validate preflight config-check pull up status logs smoke migrate-status migrate-plan migrate-up release rollback backup backup-verify restore-drill pre-commit staging-test docker-build
.PHONY: data-prepare artifact-sign artifact-verify release-resume rollback-resume backup-init backup-recover
help host-check data-prepare artifact-sign artifact-verify validate preflight config-check pull up status logs smoke migrate-status migrate-plan migrate-up release release-resume rollback rollback-resume backup backup-init backup-verify backup-recover restore-drill:
	python3 deploy/manage.py $@
docker-build:
	docker build -t boosterplus-gateway:local gateway
staging-test:
	python3 -u deploy/staging.py
.PHONY: self-hosted-test
self-hosted-test:
	python3 -u deploy/self_hosted_test.py
.PHONY: preparation-check config-test runtime-config-test
config-test:
	python3 -u deploy/config_test.py
runtime-config-test:
	python3 -u deploy/config_test.py --runtime
preparation-check:
	python3 -m unittest discover -s deploy -p 'test_*.py'
	PYTHONPYCACHEPREFIX=$(CURDIR)/.cache/python python3 -m compileall -q deploy
	$(MAKE) config-test
pre-commit:
	python3 -m unittest discover -s deploy -p 'test_*.py'
	$(MAKE) docker-build
	python3 ../scripts/scan-image.py boosterplus-gateway:local
	$(MAKE) staging-test
	$(MAKE) runtime-config-test self-hosted-test
