FROM golang:1.23-alpine

WORKDIR /app

# Копируем файлы go.mod и go.sum
COPY go.mod ./

# Загружаем зависимости
RUN go mod download

# Копируем исходный код
COPY . .

# Собираем приложение
RUN go build -o auth-service .

# Запускаем приложение
CMD ["./auth-service"]
