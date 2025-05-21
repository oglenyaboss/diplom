# Документация API для системы управления складом и отслеживания оборудования

В этом репозитории представлена Swagger/OpenAPI документация для микросервисной системы управления складом и отслеживания оборудования.

## Структура документации

Документация API разделена по микросервисам:

1. **Auth Service** - сервис аутентификации и авторизации пользователей

   - Файл: `auth-service/swagger.yaml`
   - Порт: 8000

2. **Warehouse Service** - сервис управления складом и учета оборудования

   - Файл: `warehouse-service/swagger.yaml`
   - Порт: 8001

3. **Tracking Service** - сервис отслеживания перемещений оборудования с интеграцией блокчейн

   - Файл: `tracking-service-express/swagger.yaml`
   - Порт: 8002

4. **Notification Service** - сервис уведомлений

   - Файл: `notification-service/swagger.yaml`
   - Порт: 8003

5. **Объединенная документация** - общий обзор всех API
   - Файл: `combined-swagger.yaml`

## Просмотр документации

Для просмотра документации можно использовать различные инструменты:

### Онлайн Swagger Editor

1. Откройте [Swagger Editor](https://editor.swagger.io/)
2. Импортируйте или скопируйте содержимое соответствующего YAML-файла

### Локальный просмотр с использованием Swagger UI

1. Установите Swagger UI с помощью Docker:

   ```bash
   docker run -p 80:8080 -e SWAGGER_JSON=/swagger/swagger.yaml -v $(pwd):/swagger swaggerapi/swagger-ui
   ```

2. Откройте браузер и перейдите по адресу `http://localhost`

### Интеграция в проект

Для интеграции Swagger UI в ваши сервисы можно использовать следующие библиотеки:

- Для Go-сервисов: [github.com/swaggo/http-swagger](https://github.com/swaggo/http-swagger)
- Для Express-сервисов: [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express)

## Авторизация

Все защищенные API требуют JWT-токен, который можно получить через `/login` или `/refresh` эндпоинты Auth Service. Токен должен быть передан в заголовке `Authorization` в формате `Bearer <token>`.

Пример:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Примеры использования API

### Авторизация

```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

### Получение списка оборудования

```bash
curl -X GET http://localhost:8001/items \
  -H "Authorization: Bearer {your_token}" \
  -H "Content-Type: application/json"
```

### Создание передачи оборудования

```bash
curl -X POST http://localhost:8002/transfer \
  -H "Authorization: Bearer {your_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "equipmentId": "equipmentId123",
    "toHolderId": "userId456",
    "transferReason": "Выдача для проведения плановых работ"
  }'
```

### Получение уведомлений пользователя

```bash
curl -X GET http://localhost:8003/api/notifications/user/{user_id} \
  -H "Authorization: Bearer {your_token}" \
  -H "Content-Type: application/json"
```

## Обновление документации

При внесении изменений в API обновляйте соответствующие Swagger-файлы для поддержания актуальной документации.

## Дополнительные ресурсы

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Swagger Editor](https://editor.swagger.io/)
