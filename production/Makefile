SHELL := /bin/sh
.DEFAULT_GOAL := help
.PHONY: help validate preflight config-check pull up status logs smoke migrate-status migrate-plan migrate-up release rollback backup backup-verify restore-drill pre-commit staging-test docker-build
help validate preflight config-check pull up status logs smoke migrate-status migrate-plan migrate-up release rollback backup backup-verify restore-drill:
	python3 deploy/manage.py $@
docker-build:
	docker build -t boosterplus-gateway:local gateway
staging-test:
	python3 -u deploy/staging.py
pre-commit:
	python3 -m unittest discover -s deploy -p 'test_*.py'
	$(MAKE) docker-build
	python3 ../scripts/scan-image.py boosterplus-gateway:local
	$(MAKE) staging-test
