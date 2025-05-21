FROM golang:1.24-alpine

WORKDIR /app

# Копируем файлы go.mod и go.sum
COPY go.mod ./

# Загружаем зависимости
RUN go mod download

# Копируем исходный код
COPY . .

# Собираем приложение
RUN go build -o warehouse-service .

# Запускаем приложение
CMD ["./warehouse-service"]
