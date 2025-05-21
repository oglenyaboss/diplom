FROM golang:1.22-alpine
WORKDIR /app
COPY . .
RUN go mod init analytics-service && go mod tidy
CMD ["go", "run", "main.go"]
