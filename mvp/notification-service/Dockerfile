FROM golang:1.24-alpine
WORKDIR /app
COPY . .
RUN if [ ! -f go.mod ]; then go mod init github.com/diplom/notification-service; fi && go mod tidy
CMD ["go", "run", "main.go", "rabbit.go"]
