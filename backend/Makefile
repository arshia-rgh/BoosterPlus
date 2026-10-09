SHELL := /bin/sh
.DEFAULT_GOAL := help
TOOLS := $(abspath ../.tools)
export GOSUMDB := sum.golang.org
GOVULNCHECK_DATABASE ?= https://vuln.go.dev
export TEST_DATABASE_DSN ?= root@tcp(127.0.0.1:14000)/mysql

.PHONY: test-scripts help bootstrap fmt fmt-check vet lint gosec vuln security test test-race test-integration test-coverage generate generate-check build build-cli migrate-validate migrate-status migrate-plan migrate-up migrate-down migrate-verify compose-up compose-down compose-logs pre-commit ci clean

help:
	@printf '%s\n' 'bootstrap fmt lint test test-integration security pre-commit build-cli migrate-up compose-up'
bootstrap:
	GOBIN=$(TOOLS) go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.14.0
	GOBIN=$(TOOLS) go install github.com/securego/gosec/v2/cmd/gosec@v2.29.0
	GOBIN=$(TOOLS) go install golang.org/x/vuln/cmd/govulncheck@v1.8.0
fmt:
	$(TOOLS)/golangci-lint fmt
fmt-check:
	@output=$$($(TOOLS)/golangci-lint fmt --diff) || exit $$?; if [ -n "$$output" ]; then printf '%s\n' "$$output"; exit 1; fi
vet:
	go vet ./...
lint:
	$(TOOLS)/golangci-lint config verify
	$(TOOLS)/golangci-lint run --build-tags=integration,browsertest ./...
gosec:
	$(TOOLS)/gosec -quiet -tests -tags=integration,browsertest -exclude-generated ./...
vuln:
	@case "$(GOVULNCHECK_DATABASE)" in https://vuln.go.dev|https://storage.googleapis.com/go-vulndb) ;; *) printf '%s\n' 'Use an official live Go vulnerability database endpoint.' >&2; exit 1 ;; esac
	$(TOOLS)/govulncheck -db "$(GOVULNCHECK_DATABASE)" ./...
security: gosec vuln
	go mod verify
test test-race:
	go test -race -count=1 ./...
test-scripts:
	python3 scripts/test-wait-tidb.py
	go test -race -count=1 -tags=integration -run '^TestScannerFixtureReadinessPolicy$$' ./internal/integration
test-integration:
	python3 ../scripts/integration-tests.py
test-coverage:
	go test -race -count=1 -coverprofile=coverage.out ./internal/...
generate:
	go generate ./ent
generate-check:
	sh scripts/check-generated.sh
build: build-cli
	go build -trimpath -o bin/server ./cmd/server
	go build -trimpath -o bin/worker ./cmd/worker
build-cli:
	go build -trimpath -o bin/boosterplus ./cmd/cli
migrate-validate:
	go run ./cmd/cli db migrate validate
migrate-status:
	go run ./cmd/cli db migrate status
migrate-plan:
	go run ./cmd/cli db migrate plan
migrate-up:
	go run ./cmd/cli db migrate up
migrate-down:
	go run ./cmd/cli db migrate down --steps $(STEPS) --acknowledge-data-loss
migrate-verify:
	go run ./cmd/cli db migrate verify
compose-up:
	docker compose up -d tidb mailpit
compose-down:
	docker compose --profile storage down
compose-logs:
	docker compose logs --tail=100
pre-commit ci:
	$(MAKE) fmt-check
	go mod tidy -diff
	$(MAKE) test-scripts generate-check vet lint security test-race test-integration migrate-validate build compose-check docker-build image-security
.PHONY: stage-check
# Owner-authorized DI00-DI15 window: retain static/security/unit/build checks;
# changed integration scenarios run explicitly, full suite runs at DI15.
stage-check:
	$(MAKE) fmt-check
	go mod tidy -diff
	$(MAKE) test-scripts generate-check vet lint security test-race migrate-validate build
clean:
	rm -rf bin coverage.out

.PHONY: setup-env compose-check docker-build dev-up dev-smoke run worker config-validate
setup-env:
	python3 scripts/setup-env.py
compose-check:
	DEV_S3_SECRET_KEY=configuration-validation-only docker compose config --quiet
docker-build:
	docker build -t boosterplus-backend:local .
	docker build --platform linux/amd64 -f deploy/scanner.Dockerfile -t boosterplus-scanner:local .
dev-up: setup-env docker-build compose-up
	python3 scripts/wait-tidb.py
	docker compose run --rm bootstrap
	docker compose run --rm migrate
	docker compose --profile storage up -d api worker storage scanner
	python3 scripts/smoke.py
dev-smoke:
	python3 scripts/smoke.py
run:
	go run ./cmd/server
worker:
	go run ./cmd/worker
config-validate:
	go run ./cmd/cli config validate

.PHONY: image-security
image-security:
	python3 ../scripts/scan-image.py boosterplus-backend:local
	python3 ../scripts/scan-image.py boosterplus-scanner:local
