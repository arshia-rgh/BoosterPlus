SHELL := /bin/sh
.DEFAULT_GOAL := help
TOOLS := $(abspath ../.tools)
export GOSUMDB := sum.golang.org
export TEST_DATABASE_DSN ?= root@tcp(127.0.0.1:14000)/mysql

.PHONY: help bootstrap fmt fmt-check vet lint gosec vuln security test test-race test-integration test-coverage generate generate-check build build-cli migrate-validate migrate-status migrate-plan migrate-up migrate-down migrate-verify compose-up compose-down compose-logs pre-commit ci clean

help:
	@printf '%s\n' 'bootstrap fmt lint test test-integration security pre-commit build-cli migrate-up compose-up'
bootstrap:
	GOBIN=$(TOOLS) go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.13.2
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
	$(TOOLS)/golangci-lint run --build-tags=integration ./...
gosec:
	$(TOOLS)/gosec -quiet -tests -tags=integration -exclude-generated ./...
vuln:
	$(TOOLS)/govulncheck ./...
security: gosec vuln
	go mod verify
test test-race:
	go test -race -count=1 ./...
test-integration:
	go test -race -count=1 -tags=integration ./internal/integration/...
test-coverage:
	go test -race -count=1 -coverprofile=coverage.out ./internal/...
generate:
	go generate ./ent
generate-check:
	sh scripts/check-generated.sh
build build-cli:
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
	docker compose up -d
compose-down:
	docker compose down
compose-logs:
	docker compose logs --tail=100
pre-commit ci:
	$(MAKE) fmt-check
	go mod tidy -diff
	$(MAKE) generate-check vet lint security test-race test-integration migrate-validate build
clean:
	rm -rf bin coverage.out
