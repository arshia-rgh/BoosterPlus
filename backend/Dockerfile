FROM golang:1.27.2-bookworm@sha256:5cf287a799e6b94384bad13d16b14904c531f51ba65792237e122ce42b392f61 AS build
WORKDIR /src
ENV CGO_ENABLED=0 GOSUMDB=sum.golang.org
COPY go.mod go.sum ./
RUN go mod download && go mod verify
COPY . .
RUN go build -trimpath -ldflags='-s -w' -o /out/server ./cmd/server && \
    go build -trimpath -ldflags='-s -w' -o /out/boosterplus ./cmd/cli && \
    go build -trimpath -ldflags='-s -w' -o /out/worker ./cmd/worker

FROM gcr.io/distroless/static-debian13:nonroot@sha256:1c2c046bc09ed40fad370b599a0b1ae7987f55b01e247cf27a7c27cd97e5bbc7
WORKDIR /app
COPY --from=build /out/ /app/
USER 65532:65532
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 CMD ["/app/boosterplus", "healthcheck"]
ENTRYPOINT ["/app/server"]
