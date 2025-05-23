# Система управления складом с блокчейн-отслеживанием

Это MVP (Minimum Viable Product) системы управления складом с интеграцией блокчейн для отслеживания перемещения оборудования.

## Системные требования

- Docker и Docker Compose
- Git
- Свободно около 2GB места на диске
- Свободные порты:
  - 8000 (Auth Service)
  - 8001 (Warehouse Service)
  - 8002 (Tracking Service)
  - 8003 (Notification Service)
  - 80 (Frontend)
  - 27017 (MongoDB)
  - 5672, 15672 (RabbitMQ)
  - 8545 (Ethereum Node)

## Быстрый старт

1. Клонируйте репозиторий:

```bash
git clone <your-repo-url>
cd <repo-folder>/mvp
```

2. Запустите систему с помощью скрипта:

```bash
chmod +x start-system.sh
./start-system.sh
```

Скрипт выполнит:

- Запуск всех необходимых Docker контейнеров
- Инициализацию Ethereum ноды
- Развертывание смарт-контракта
- Запуск всех микросервисов

3. Дождитесь полного запуска системы. В конце вы увидите список доступных сервисов с их URL.

## Доступные сервисы

После успешного запуска вам будут доступны:

- Frontend: http://localhost:80
- Auth Service: http://localhost:8000
- Warehouse Service: http://localhost:8001
- Tracking Service: http://localhost:8002
- Notification Service: http://localhost:8003
- RabbitMQ Management UI: http://localhost:15672
- Ethereum JSON-RPC: http://localhost:8545

## Структура проекта

- `auth-service/` - Сервис аутентификации и авторизации (Go)
- `warehouse-service/` - Сервис управления складом (Go)
- `tracking-service-express/` - Сервис отслеживания с блокчейн-интеграцией (Node.js)
- `notification-service/` - Сервис уведомлений (Go)
- `frontend/` - Next.js фронтенд приложение
- `docker-compose.yml` - Конфигурация Docker Compose
- `start-system.sh` - Скрипт запуска системы
- `clean-and-restart.sh` - Скрипт для полной очистки и перезапуска

## Дополнительные команды

### Полная очистка и перезапуск

Если вам нужно полностью очистить все данные и перезапустить систему:

```bash
chmod +x clean-and-restart.sh
./clean-and-restart.sh
```

При запуске clean-and-restart.sh у вас будет выбор:

1. Обычный перезапуск (с сохранением кэша)
2. Полный ребилд (с очисткой всего кэша)

### Просмотр логов

```bash
# Все логи
docker-compose logs

# Логи конкретного сервиса
docker-compose logs service-name

# Следить за логами в реальном времени
docker-compose logs -f
```

### Остановка системы

```bash
docker-compose down
```

## Возможные проблемы и их решение

1. **Порты заняты**

   - Убедитесь, что все необходимые порты свободны
   - Остановите конфликтующие сервисы или измените порты в docker-compose.yml

2. **Ошибки при инициализации контракта**

   - Проверьте логи tracking-service: `docker-compose logs tracking-service`
   - Попробуйте перезапустить систему с очисткой: `./clean-and-restart.sh`

3. **Сервисы не могут подключиться к RabbitMQ или MongoDB**
   - Система использует healthcheck для всех сервисов
   - Дождитесь полной инициализации RabbitMQ и MongoDB (обычно занимает около минуты)
   - Если проблема сохраняется, проверьте логи сервиса

## Разработка

Проект использует следующие технологии:

- Frontend: Next.js, React, TypeScript
- Backend:
  - Go (auth, warehouse, notification services)
  - Node.js (tracking service)
- База данных: MongoDB
- Очереди сообщений: RabbitMQ
- Блокчейн: Ethereum (Ganache для разработки)
- Контейнеризация: Docker, Docker Compose

## Безопасность

Для MVP используются тестовые учетные данные и ключи. В продакшене необходимо:

- Изменить JWT секрет
- Настроить безопасные пароли для MongoDB и RabbitMQ
- Использовать реальную Ethereum ноду
- Настроить HTTPS

## Дополнительная информация

- [API Documentation](./api-documentation-readme.md)
- [Architecture Documentation](./architecture-documentation.md)
