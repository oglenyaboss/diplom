# Система управления складом и отслеживания оборудования - Документация архитектуры

## Общая архитектура системы

Система построена на основе микросервисной архитектуры, где каждый сервис выполняет свою определенную функцию и обменивается данными с другими сервисами через REST API и сообщения в RabbitMQ. Данные хранятся в MongoDB, а для отслеживания передачи оборудования используется блокчейн Ethereum (Ganache для MVP).

## Структура проекта

Проект организован в директории `mvp/` и содержит следующие компоненты:

- **auth-service/** - Сервис аутентификации (Go)
- **warehouse-service/** - Сервис управления складом (Go)
- **tracking-service-express/** - Сервис отслеживания оборудования (Node.js/Express)
- **notification-service/** - Сервис уведомлений (Go)
- **analytics-service/** - Сервис аналитики (Go, минимальная реализация, не включен в Docker Compose)
- **frontend/** - Веб-интерфейс (Next.js с Mantine UI)
- **docker-compose.yml** - Конфигурация контейнеризации
- Документация и скрипты развертывания

## Схема архитектуры

### Диаграмма компонентов системы

```mermaid
graph TB
    Frontend[Frontend<br/>Next.js<br/>:80] --> AuthAPI[Auth Service<br/>Go<br/>:8000]
    Frontend --> WarehouseAPI[Warehouse Service<br/>Go<br/>:8001]
    Frontend --> TrackingAPI[Tracking Service<br/>Node.js<br/>:8002]
    Frontend --> NotificationAPI[Notification Service<br/>Go<br/>:8003]

    AuthAPI --> MongoDB[(MongoDB<br/>:27017)]
    WarehouseAPI --> MongoDB
    TrackingAPI --> MongoDB
    NotificationAPI --> MongoDB

    WarehouseAPI --> RabbitMQ[RabbitMQ<br/>:5672]
    TrackingAPI --> RabbitMQ
    NotificationAPI --> RabbitMQ

    TrackingAPI --> Ethereum[Ethereum Node<br/>Ganache<br/>:8545]

    Analytics[Analytics Service<br/>Go<br/>Отдельно] -.-> MongoDB

    subgraph Docker Network
        AuthAPI
        WarehouseAPI
        TrackingAPI
        NotificationAPI
        MongoDB
        RabbitMQ
        Ethereum
        Frontend
    end

    style Analytics stroke-dasharray: 5 5
```

### Основные компоненты

1. **Auth Service (Go)**: Аутентификация и авторизация пользователей, управление Ethereum адресами для пользователей
2. **Warehouse Service (Go)**: Управление складом и учет оборудования, включая систему накладных
3. **Tracking Service (Node.js/Express)**: Отслеживание перемещений оборудования с интеграцией блокчейн, включая развертывание и взаимодействие со смарт-контрактами
4. **Notification Service (Go)**: Отправка и управление уведомлениями
5. **Analytics Service (Go)**: Минимальная реализация (выводит только приветственное сообщение) - не включен в Docker Compose для MVP
6. **Frontend (Next.js)**: Пользовательский интерфейс системы с Mantine UI компонентами для всех сервисов
7. **MongoDB**: Хранение данных для всех сервисов
8. **RabbitMQ**: Обмен сообщениями между сервисами
9. **Ethereum Node (Ganache)**: Локальный блокчейн для отслеживания передачи оборудования

### Базы данных MongoDB

Каждый сервис использует отдельную базу данных в MongoDB:

- **warehouse_auth** - база данных для Auth Service (пользователи, сессии, аудит, настройки)
- **warehouse_inventory** - база данных для Warehouse Service (оборудование, транзакции, накладные, справочники)
- **warehouse_tracking** - база данных для Tracking Service (отслеживание, передачи, обслуживание)

**Общее количество коллекций в системе: 12 (ПОЛНОСТЬЮ РЕАЛИЗОВАНЫ)**

**Распределение коллекций по базам данных:**

- **warehouse_auth: 3 коллекции** (users, audit_logs, system_settings) - ✅ **РЕАЛИЗОВАНО**
- **warehouse_inventory: 6 коллекций** (warehouseitems, inventorytransactions, invoices, categories, warehouses, suppliers) - ✅ **РЕАЛИЗОВАНО**
- **warehouse_tracking: 3 коллекций** (equipments, transfers, maintenance_schedules) - ✅ **РЕАЛИЗОВАНО**

**Статус реализации:**

✅ **Auth Service (Go)**: Все 3 коллекции с полными CRUD API endpoints
✅ **Warehouse Service (Go)**: Все 6 коллекций с полными CRUD API endpoints  
✅ **Tracking Service (Node.js/Express)**: Все 3 коллекции с полными CRUD API endpoints
✅ **Демо-данные**: Автоматическое создание тестовых данных для всех коллекций

**Примечание**: Notification Service в текущей реализации MVP не использует MongoDB, а хранит данные в памяти. База данных **warehouse_notifications** настроена в docker-compose.yml для будущего развития сервиса.

### Детальная информация о коллекциях MongoDB

#### База данных: warehouse_auth (Auth Service)

**Коллекция: users**

- **Назначение**: Хранение информации о пользователях системы
- **Индексы**:
  - `username` (уникальный)
  - `email` (уникальный)
  - `eth_address`
  - `role`
  - `is_active`
- **Примерный размер документа**: 500-800 байт
- **Особенности**:
  - Хранит хешированные пароли
  - Автоматически генерируется Ethereum адрес при создании
  - Отслеживается время последнего входа

**Пример документа:**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "username": "admin",
  "email": "admin@warehouse.local",
  "password_hash": "$2a$10$N9qo8uLOickgx2ZMRZoMye...",
  "first_name": "Системный",
  "last_name": "Администратор",
  "role": "admin",
  "department": "IT",
  "position": "Системный администратор",
  "eth_address": "0x742d35Cc6aBb78532B123C1234567890AbCdEf12",
  "is_active": true,
  "last_login": ISODate("2024-12-15T10:30:00.000Z"),
  "created_at": ISODate("2024-01-01T12:00:00.000Z"),
  "updated_at": ISODate("2024-12-15T10:30:00.000Z")
}
```

#### База данных: warehouse_inventory (Warehouse Service)

**Коллекция: warehouseitems**

- **Назначение**: Каталог оборудования на складе
- **Индексы**:
  - `serial_number` (уникальный)
  - `category`
  - `status`
  - `location`
  - `warranty_expiry`
- **Примерный размер документа**: 1-2 KB
- **Особенности**:
  - Отслеживание гарантийного срока
  - Минимальные остатки для уведомлений
  - История инвентаризации

**Пример документа:**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "name": "Ноутбук Dell XPS 13",
  "serial_number": "DLL-XPS-13-2024-001",
  "category": "computers",
  "description": "13-дюймовый ультрабук для офисной работы",
  "manufacturer": "Dell Inc.",
  "price": 125000.50,
  "quantity": 15,
  "min_quantity": 3,
  "location": "Склад А-1, Стеллаж 2-3",
  "purchase_date": ISODate("2024-03-15T00:00:00.000Z"),
  "warranty_expiry": ISODate("2027-03-15T00:00:00.000Z"),
  "status": "available",
  "last_inventory": ISODate("2024-12-01T09:00:00.000Z"),
  "created_at": ISODate("2024-03-15T14:30:00.000Z"),
  "updated_at": ISODate("2024-12-15T11:45:00.000Z")
}
```

**Коллекция: inventorytransactions**

- **Назначение**: История операций с оборудованием (приход/расход)
- **Индексы**:
  - `item_id`
  - `transaction_type`
  - `date` (убывающий)
  - `responsible_user`
- **Примерный размер документа**: 300-500 байт
- **Особенности**:
  - Связь с конкретными единицами оборудования
  - Отслеживание ответственных лиц
  - Причины и комментарии к операциям

**Пример документа (приход):**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439013"),
  "item_id": ObjectId("507f1f77bcf86cd799439012"),
  "transaction_type": "intake",
  "quantity": 5,
  "responsible_user": "admin",
  "destination_user": null,
  "reason": "Закупка нового оборудования",
  "date": ISODate("2024-03-15T14:30:00.000Z"),
  "notes": "Поставка от Dell, накладная №IN-2024-0315"
}
```

**Пример документа (выдача):**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439014"),
  "item_id": ObjectId("507f1f77bcf86cd799439012"),
  "transaction_type": "issue",
  "quantity": 1,
  "responsible_user": "warehouse_manager",
  "destination_user": "ivanov_ivan",
  "reason": "Выдача для работы",
  "date": ISODate("2024-12-15T10:15:00.000Z"),
  "notes": "Выдан сотруднику отдела разработки"
}
```

**Коллекция: invoices**

- **Назначение**: Приходные и расходные накладные
- **Индексы**:
  - `number` (уникальный)
  - `type`
  - `date` (убывающий)
  - `transaction_id`
- **Примерный размер документа**: 2-5 KB
- **Особенности**:
  - Связь с транзакциями
  - Детализация по позициям
  - Информация о получателе и выдавшем

**Пример документа (приходная накладная):**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439015"),
  "number": "IN-2024-0315-001",
  "type": "receipt",
  "date": ISODate("2024-03-15T14:30:00.000Z"),
  "transaction_id": ObjectId("507f1f77bcf86cd799439013"),
  "supplier": "ООО Компьютерные Системы",
  "supplier_contact": "+7(495)123-45-67",
  "responsible_person": "admin",
  "total_amount": 625002.50,
  "items": [
    {
      "item_id": ObjectId("507f1f77bcf86cd799439012"),
      "name": "Ноутбук Dell XPS 13",
      "quantity": 5,
      "unit_price": 125000.50,
      "total_price": 625002.50
    }
  ],
  "notes": "Поставка согласно договору №2024-DEL-001",
  "created_at": ISODate("2024-03-15T14:30:00.000Z")
}
```

**Пример документа (расходная накладная):**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439016"),
  "number": "OUT-2024-1215-001",
  "type": "expense",
  "date": ISODate("2024-12-15T10:15:00.000Z"),
  "transaction_id": ObjectId("507f1f77bcf86cd799439014"),
  "recipient": "Иванов Иван Петрович",
  "recipient_department": "Отдел разработки",
  "responsible_person": "warehouse_manager",
  "total_amount": 125000.50,
  "items": [
    {
      "item_id": ObjectId("507f1f77bcf86cd799439012"),
      "name": "Ноутбук Dell XPS 13",
      "quantity": 1,
      "unit_price": 125000.50,
      "total_price": 125000.50
    }
  ],
  "notes": "Выдано для выполнения проекта X",
  "created_at": ISODate("2024-12-15T10:15:00.000Z")
}
```

#### База данных: warehouse_tracking (Tracking Service)

**Коллекция: equipments**

- **Назначение**: Оборудование для отслеживания местоположения
- **Индексы**:
  - `serialNumber` (уникальный)
  - `currentHolderId`
  - `blockchainId`
  - `status`
- **Примерный размер документа**: 800-1200 байт
- **Особенности**:
  - Интеграция с блокчейном
  - Текущий держатель оборудования
  - Статусы жизненного цикла

**Пример документа:**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439017"),
  "name": "Промышленный сканер Honeywell",
  "serialNumber": "HNW-SCN-2024-001",
  "category": "scanners",
  "description": "Беспроводной 2D сканер штрих-кодов",
  "manufacturer": "Honeywell International Inc.",
  "purchaseDate": ISODate("2024-02-10T00:00:00.000Z"),
  "warrantyExpiry": ISODate("2026-02-10T00:00:00.000Z"),
  "status": "active",
  "location": "Склад Б, зона приёмки",
  "currentHolderId": "warehouse_operator_001",
  "blockchainId": "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
  "createdAt": ISODate("2024-02-10T15:20:00.000Z"),
  "updatedAt": ISODate("2024-12-15T09:45:00.000Z"),
  "__v": 0
}
```

**Коллекция: transfers**

- **Назначение**: История передач оборудования между держателями
- **Индексы**:
  - `equipmentId`
  - `fromHolderId`
  - `toHolderId`
  - `transferDate` (убывающий)
  - `blockchainTxId`
- **Примерный размер документа**: 400-600 байт
- **Особенности**:
  - Связь с блокчейн транзакциями
  - Причины передачи
  - Цепочка владения

**Пример документа:**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439018"),
  "equipmentId": ObjectId("507f1f77bcf86cd799439017"),
  "fromHolderId": "warehouse_operator_001",
  "toHolderId": "field_worker_042",
  "transferDate": ISODate("2024-12-15T11:30:00.000Z"),
  "transferReason": "Передача для работы на объекте",
  "blockchainTxId": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "createdAt": ISODate("2024-12-15T11:30:00.000Z"),
  "updatedAt": ISODate("2024-12-15T11:30:00.000Z"),
  "__v": 0
}
```

#### База данных: warehouse_notifications (зарезервирована для будущего развития)

**Коллекция: notifications** (планируется)

- **Назначение**: Системные уведомления для пользователей
- **Планируемые индексы**:
  - `user_id`
  - `is_read`
  - `type`
  - `created_at` (убывающий)
  - `user_id + is_read` (составной)
- **Примерный размер документа**: 200-400 байт
- **Особенности**:
  - В текущей MVP версии не используется
  - Данные хранятся в памяти сервиса

**Пример планируемого документа:**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439019"),
  "user_id": "admin",
  "type": "low_stock_warning",
  "title": "Низкий остаток оборудования",
  "message": "Остаток ноутбуков Dell XPS 13 составляет 2 штуки (минимум: 3)",
  "data": {
    "item_id": ObjectId("507f1f77bcf86cd799439012"),
    "current_quantity": 2,
    "min_quantity": 3
  },
  "is_read": false,
  "priority": "medium",
  "created_at": ISODate("2024-12-15T12:00:00.000Z")
}
```

**Примечание**: В текущей реализации MVP Notification Service не использует MongoDB и работает только в памяти.

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439019"),
  "user_id": "admin",
  "type": "low_stock_warning",
  "title": "Низкий остаток оборудования",
  "message": "Остаток ноутбуков Dell XPS 13 составляет 2 единицы (минимум: 3)",
  "priority": "medium",
  "is_read": false,
  "metadata": {
    "item_id": ObjectId("507f1f77bcf86cd799439012"),
    "current_quantity": 2,
    "min_quantity": 3
  },
  "created_at": ISODate("2024-12-15T12:00:00.000Z"),
  "expires_at": ISODate("2024-12-22T12:00:00.000Z")
}
```

**Примечание**: Analytics Service разработан как отдельный компонент, но не включен в docker-compose.yml для MVP, так как имеет минимальную функциональность (только выводит приветственное сообщение).

#### Дополнительные коллекции системы

Для полноты архитектуры системы добавлены следующие дополнительные коллекции:

**Коллекция: categories** (База данных: warehouse_inventory)

- **Назначение**: Справочник категорий оборудования
- **Индексы**:
  - `code` (уникальный)
  - `name`
  - `is_active`
- **Примерный размер документа**: 200-300 байт

**Пример документа:**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439020"),
  "code": "COMP",
  "name": "Компьютеры и ноутбуки",
  "description": "Стационарные компьютеры, ноутбуки, планшеты",
  "parent_category": null,
  "is_active": true,
  "created_at": ISODate("2024-01-01T12:00:00.000Z"),
  "updated_at": ISODate("2024-01-01T12:00:00.000Z")
}
```

**Коллекция: warehouses** (База данных: warehouse_inventory)

- **Назначение**: Справочник складских помещений и адресов
- **Индексы**:
  - `code` (уникальный)
  - `city`
  - `is_active`
- **Примерный размер документа**: 400-600 байт

**Пример документа:**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439021"),
  "code": "WH-MSK-01",
  "name": "Главный склад Москва",
  "address": {
    "street": "ул. Складская, д. 15",
    "city": "Москва",
    "region": "Московская область",
    "postal_code": "125047",
    "country": "Россия"
  },
  "contact": {
    "phone": "+7 (495) 123-45-67",
    "email": "warehouse.moscow@company.com",
    "manager": "Иванов И.И."
  },
  "area_sqm": 2500.5,
  "capacity": 10000,
  "is_active": true,
  "created_at": ISODate("2024-01-01T12:00:00.000Z"),
  "updated_at": ISODate("2024-01-01T12:00:00.000Z")
}
```

**Коллекция: suppliers** (База данных: warehouse_inventory)

- **Назначение**: Справочник поставщиков оборудования
- **Индексы**:
  - `company_name`
  - `tax_id` (уникальный)
  - `is_active`
- **Примерный размер документа**: 500-800 байт

**Пример документа:**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439022"),
  "company_name": "ТехноПоставка ООО",
  "tax_id": "7707123456",
  "contact": {
    "address": "г. Москва, ул. Поставщиков, д. 10",
    "phone": "+7 (495) 987-65-43",
    "email": "orders@technopostavka.ru",
    "website": "https://technopostavka.ru"
  },
  "contact_person": {
    "name": "Петров Петр Петрович",
    "position": "Менеджер по продажам",
    "phone": "+7 (495) 987-65-44",
    "email": "petrov@technopostavka.ru"
  },
  "payment_terms": "Предоплата 50%, оплата в течение 10 дней",
  "delivery_terms": "EXW склад поставщика",
  "is_active": true,
  "created_at": ISODate("2024-01-01T12:00:00.000Z"),
  "updated_at": ISODate("2024-01-01T12:00:00.000Z")
}
```

**Коллекция: maintenance_schedules** (База данных: warehouse_tracking)

- **Назначение**: График технического обслуживания оборудования
- **Индексы**:
  - `equipment_id`
  - `next_maintenance_date`
  - `status`
- **Примерный размер документа**: 300-500 байт

**Пример документа:**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439023"),
  "equipment_id": ObjectId("507f1f77bcf86cd799439017"),
  "maintenance_type": "preventive",
  "description": "Профилактическое обслуживание принтера",
  "interval_days": 90,
  "last_maintenance_date": ISODate("2024-09-15T10:00:00.000Z"),
  "next_maintenance_date": ISODate("2024-12-15T10:00:00.000Z"),
  "responsible_technician": "tech_specialist_01",
  "estimated_duration_hours": 2,
  "status": "scheduled",
  "notes": "Замена картриджа, чистка механизмов",
  "created_at": ISODate("2024-09-15T10:30:00.000Z"),
  "updated_at": ISODate("2024-09-15T10:30:00.000Z")
}
```

**Коллекция: audit_logs** (База данных: warehouse_auth)

- **Назначение**: Журнал аудита действий пользователей
- **Индексы**:
  - `user_id`
  - `timestamp` (убывающий)
  - `action_type`
  - `ip_address`
- **Примерный размер документа**: 300-500 байт

**Пример документа:**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439024"),
  "user_id": "admin",
  "session_id": "sess_abc123def456",
  "action_type": "equipment_transfer",
  "resource": "equipment",
  "resource_id": ObjectId("507f1f77bcf86cd799439017"),
  "details": {
    "action": "transfer_equipment",
    "from_user": "warehouse_manager",
    "to_user": "ivanov_ivan",
    "equipment_serial": "SCN-001"
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "timestamp": ISODate("2024-12-15T14:30:00.000Z"),
  "result": "success"
}
```

**Коллекция: system_settings** (База данных: warehouse_auth)

- **Назначение**: Системные настройки и конфигурация
- **Индексы**:
  - `key` (уникальный)
  - `category`
  - `is_active`
- **Примерный размер документа**: 200-400 байт

**Пример документа:**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439025"),
  "key": "low_stock_threshold",
  "category": "inventory",
  "value": {
    "default_percentage": 20,
    "send_notifications": true,
    "notification_frequency_hours": 24
  },
  "description": "Настройки уведомлений о низких остатках",
  "data_type": "object",
  "is_active": true,
  "can_be_modified": true,
  "last_modified_by": "admin",
  "created_at": ISODate("2024-01-01T12:00:00.000Z"),
  "updated_at": ISODate("2024-12-15T09:00:00.000Z")
}
```

### Конфигурация MongoDB

#### Настройки подключения

- **Хост**: `mongo:27017` (внутри Docker сети)
- **Внешний доступ**: `localhost:27017`
- **Тип репликации**: Отсутствует (single instance для MVP)
- **Аутентификация**: Отключена для MVP
- **Персистентность**: Данные сохраняются в Docker volume `mongo_data`

#### Производительность и ограничения

- **Ожидаемая нагрузка**: Низкая-средняя (MVP для демонстрации)
- **Максимальные размеры коллекций**: Не ограничены
- **Ротация логов**: По умолчанию MongoDB
- **Backup стратегия**: Не настроена в MVP (рекомендуется для продакшена)

#### Индексы для оптимизации производительности

**warehouse_auth.users:**

```javascript
// Основные индексы
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ eth_address: 1 });
db.users.createIndex({ role: 1, is_active: 1 });
db.users.createIndex({ department: 1 });
```

**warehouse_inventory.warehouseitems:**

```javascript
// Основные индексы
db.warehouseitems.createIndex({ serial_number: 1 }, { unique: true });
db.warehouseitems.createIndex({ category: 1, status: 1 });
db.warehouseitems.createIndex({ location: 1 });
db.warehouseitems.createIndex({ warranty_expiry: 1 });
db.warehouseitems.createIndex({ quantity: 1, min_quantity: 1 });
```

**warehouse_inventory.inventorytransactions:**

```javascript
// Индексы для истории транзакций
db.inventorytransactions.createIndex({ item_id: 1, date: -1 });
db.inventorytransactions.createIndex({ transaction_type: 1, date: -1 });
db.inventorytransactions.createIndex({ responsible_user: 1, date: -1 });
```

**warehouse_tracking.equipments:**

```javascript
// Индексы для отслеживания
db.equipments.createIndex({ serialNumber: 1 }, { unique: true });
db.equipments.createIndex({ currentHolderId: 1 });
db.equipments.createIndex({ blockchainId: 1 });
db.equipments.createIndex({ status: 1 });
```

**warehouse_tracking.transfers:**

```javascript
// Индексы для передач
db.transfers.createIndex({ equipmentId: 1, transferDate: -1 });
db.transfers.createIndex({ fromHolderId: 1, transferDate: -1 });
db.transfers.createIndex({ toHolderId: 1, transferDate: -1 });
db.transfers.createIndex({ blockchainTxId: 1 });
```

**warehouse_inventory.categories:**

```javascript
// Индексы для категорий
db.categories.createIndex({ code: 1 }, { unique: true });
db.categories.createIndex({ name: 1 });
db.categories.createIndex({ is_active: 1 });
db.categories.createIndex({ parent_category: 1 });
```

**warehouse_inventory.warehouses:**

```javascript
// Индексы для складов
db.warehouses.createIndex({ code: 1 }, { unique: true });
db.warehouses.createIndex({ "address.city": 1 });
db.warehouses.createIndex({ is_active: 1 });
db.warehouses.createIndex({ area_sqm: 1 });
```

**warehouse_inventory.suppliers:**

```javascript
// Индексы для поставщиков
db.suppliers.createIndex({ company_name: 1 });
db.suppliers.createIndex({ tax_id: 1 }, { unique: true });
db.suppliers.createIndex({ is_active: 1 });
db.suppliers.createIndex({ "contact.email": 1 });
```

**warehouse_tracking.maintenance_schedules:**

```javascript
// Индексы для графика обслуживания
db.maintenance_schedules.createIndex({
  equipment_id: 1,
  next_maintenance_date: 1,
});
db.maintenance_schedules.createIndex({ next_maintenance_date: 1 });
db.maintenance_schedules.createIndex({ status: 1 });
db.maintenance_schedules.createIndex({ responsible_technician: 1 });
```

**warehouse_auth.audit_logs:**

```javascript
// Индексы для журнала аудита
db.audit_logs.createIndex({ user_id: 1, timestamp: -1 });
db.audit_logs.createIndex({ timestamp: -1 });
db.audit_logs.createIndex({ action_type: 1, timestamp: -1 });
db.audit_logs.createIndex({ ip_address: 1 });
db.audit_logs.createIndex({ resource: 1, resource_id: 1 });
```

**warehouse_auth.system_settings:**

```javascript
// Индексы для системных настроек
db.system_settings.createIndex({ key: 1 }, { unique: true });
db.system_settings.createIndex({ category: 1 });
db.system_settings.createIndex({ is_active: 1 });
db.system_settings.createIndex({ last_modified_by: 1, updated_at: -1 });
```

#### Мониторинг и диагностика

**Полезные команды для мониторинга:**

```javascript
// Проверка размеров баз данных
db.stats();

// Проверка использования индексов
db.collection.getIndexes();
db.collection.explain("executionStats").find(query);

// Мониторинг активных операций
db.currentOp();

// Проверка производительности запросов
db.enableFreeMonitoring();
```

**Логирование:**

- Уровень логирования: По умолчанию
- Медленные запросы: > 100ms (стандартная настройка MongoDB)
- Ротация логов: Автоматическая

#### Миграции и начальные данные

**Автоматическая инициализация:**

- При запуске Auth Service автоматически создается администратор:
  - Username: `admin`
  - Password: `admin123`
  - Role: `admin`
  - Email: `admin@warehouse.local`

**Создание коллекций:**

- Коллекции создаются автоматически при первой записи
- Индексы создаются программно в коде сервисов
- Валидация схемы: На уровне приложения (Mongoose для Node.js, custom validation для Go)

**Seed данные для тестирования:**

```javascript
// Пример тестовых данных для warehouse_inventory.warehouseitems
{
  "name": "Laptop Dell XPS 13",
  "serial_number": "DLL-XPS-001",
  "category": "computers",
  "description": "Ультрабук для офисной работы",
  "manufacturer": "Dell",
  "price": 1200.00,
  "quantity": 5,
  "min_quantity": 2,
  "location": "Склад А-1",
  "status": "available",
  "purchase_date": "2024-01-15",
  "warranty_expiry": "2027-01-15"
}

// Пример тестовых данных для warehouse_tracking.equipments
{
  "name": "Industrial Scanner",
  "serialNumber": "SCN-001",
  "category": "scanners",
  "manufacturer": "Honeywell",
  "status": "active",
  "location": "Warehouse Floor 1",
  "currentHolderId": "user123",
  "blockchainId": null
}

// Пример тестовых данных для warehouse_inventory.categories
{
  "code": "COMP",
  "name": "Компьютеры и ноутбуки",
  "description": "Стационарные компьютеры, ноутбуки, планшеты",
  "parent_category": null,
  "is_active": true
}

// Пример тестовых данных для warehouse_inventory.warehouses
{
  "code": "WH-MSK-01",
  "name": "Главный склад Москва",
  "address": {
    "street": "ул. Складская, д. 15",
    "city": "Москва",
    "region": "Московская область",
    "postal_code": "125047",
    "country": "Россия"
  },
  "area_sqm": 2500.5,
  "capacity": 10000,
  "is_active": true
}

// Пример тестовых данных для warehouse_inventory.suppliers
{
  "company_name": "ТехноПоставка ООО",
  "tax_id": "7707123456",
  "contact": {
    "address": "г. Москва, ул. Поставщиков, д. 10",
    "phone": "+7 (495) 987-65-43",
    "email": "orders@technopostavka.ru"
  },
  "is_active": true
}

// Пример тестовых данных для warehouse_tracking.maintenance_schedules
{
  "equipment_id": ObjectId("507f1f77bcf86cd799439017"),
  "maintenance_type": "preventive",
  "description": "Профилактическое обслуживание принтера",
  "interval_days": 90,
  "next_maintenance_date": "2024-12-15",
  "responsible_technician": "tech_specialist_01",
  "status": "scheduled"
}

// Пример тестовых данных для warehouse_auth.system_settings
{
  "key": "low_stock_threshold",
  "category": "inventory",
  "value": {
    "default_percentage": 20,
    "send_notifications": true
  },
  "description": "Настройки уведомлений о низких остатках",
  "is_active": true
}
```

#### Резервное копирование и восстановление

**Стратегии backup для Production:**

```bash
# Создание backup всех баз данных
mongodump --host localhost:27017 --out /backup/$(date +%Y%m%d_%H%M%S)

# Backup конкретной базы данных
mongodump --host localhost:27017 --db warehouse_auth --out /backup/auth_$(date +%Y%m%d)

# Восстановление
mongorestore --host localhost:27017 --drop /backup/20240101_120000
```

**MVP ограничения:**

- Backup не настроен
- Нет репликации
- Нет автоматического восстановления
- Рекомендуется настроить для продакшена

#### Связи между коллекциями и целостность данных

**Межсервисные связи:**

```mermaid
graph TD
    A[warehouse_auth.users] --> B[warehouse_inventory.inventorytransactions]
    A --> C[warehouse_tracking.transfers]
    A --> H[warehouse_auth.audit_logs]
    A --> I[warehouse_auth.system_settings]

    D[warehouse_inventory.warehouseitems] --> E[warehouse_inventory.inventorytransactions]
    D --> J[warehouse_inventory.categories]
    D --> K[warehouse_inventory.warehouses]
    D --> L[warehouse_inventory.suppliers]

    F[warehouse_tracking.equipments] --> G[warehouse_tracking.transfers]
    F --> M[warehouse_tracking.maintenance_schedules]

    subgraph "Auth Service"
        A
        H
        I
    end

    subgraph "Warehouse Service"
        D
        E
        J
        K
        L
    end

    subgraph "Tracking Service"
        F
        G
        M
    end
```

**Ключевые связи:**

1. **User ID связи**:

   - `inventorytransactions.responsible_user` → `users.username`
   - `inventorytransactions.destination_user` → `users.username`
   - `transfers.fromHolderId` → `users.username`
   - `transfers.toHolderId` → `users.username`
   - `audit_logs.user_id` → `users.username`
   - `system_settings.last_modified_by` → `users.username`
   - `maintenance_schedules.responsible_technician` → `users.username`

2. **Equipment связи**:

   - `inventorytransactions.item_id` → `warehouseitems._id`
   - `transfers.equipmentId` → `equipments._id`
   - `maintenance_schedules.equipment_id` → `equipments._id`

3. **Справочные связи**:

   - `warehouseitems.category` → `categories.code`
   - `warehouseitems.location` → `warehouses.code` (логическая связь)
   - `invoices.supplier_id` → `suppliers._id` (планируемая)

4. **Аудит связи**:

   - `audit_logs.resource_id` → любой ObjectId в системе
   - `audit_logs.session_id` → сессия пользователя

5. **Blockchain связи**:
   - `equipments.blockchainId` → ID в смарт-контракте Ethereum
   - `transfers.blockchainTxId` → хеш транзакции в блокчейне

**Ограничения целостности:**

- **Уровень приложения**: Проверки выполняются в коде сервисов
- **Каскадные операции**: Не реализованы (ручное управление)
- **Referential integrity**: Контролируется приложением
- **Консистентность**: Eventual consistency между сервисами

**Известные ограничения MVP:**

- Отсутствуют foreign key constraints на уровне БД
- Нет автоматической очистки сиротских записей
- Нет транзакционности между сервисами
- Синхронизация данных между сервисами не автоматическая

### Примеры API запросов

### Auth Service

#### Регистрация пользователя

```bash
curl -X POST http://localhost:8000/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePassword123",
    "first_name": "John",
    "last_name": "Doe",
    "role": "employee",
    "department": "IT",
    "position": "Системный администратор"
  }'
```

**Ответ:**

```json
{
  "message": "User created successfully",
  "user_id": "64a1b23c8791ae53cd8f9a12"
}
```

#### Авторизация

```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePassword123"
  }'
```

**Ответ:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64a1b23c8791ae53cd8f9a12",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "employee",
    "is_active": true
  }
}
```

## API Endpoints

### Auth Service (8000)

| Endpoint                       | Метод  | Описание                                 | Права доступа   |
| ------------------------------ | ------ | ---------------------------------------- | --------------- |
| `/ping`                        | GET    | Проверка работоспособности сервиса       | Публичный       |
| `/signup`                      | POST   | Регистрация нового пользователя          | Публичный       |
| `/login`                       | POST   | Авторизация пользователя                 | Публичный       |
| `/refresh`                     | POST   | Обновление JWT токена                    | Публичный       |
| `/profile`                     | GET    | Получение профиля текущего пользователя  | Авторизованный  |
| `/profile`                     | PUT    | Обновление профиля текущего пользователя | Авторизованный  |
| `/users`                       | GET    | Получение списка всех пользователей      | Админ           |
| `/users/:id`                   | GET    | Получение информации о пользователе      | Админ, Менеджер |
| `/users/:id/role`              | PUT    | Изменение роли пользователя              | Админ           |
| `/users/:id/status`            | PUT    | Изменение статуса пользователя           | Админ           |
| `/users`                       | POST   | Создание нового пользователя             | Админ           |
| **🆕 `/audit-logs`**           | GET    | Получение журнала аудита с пагинацией    | Админ           |
| **🆕 `/audit-logs/:id`**       | GET    | Получение записи аудита по ID            | Админ           |
| **🆕 `/audit-logs`**           | POST   | Создание записи в журнале аудита         | Авторизованный  |
| **🆕 `/system-settings`**      | GET    | Получение системных настроек             | Админ           |
| **🆕 `/system-settings/:key`** | GET    | Получение настройки по ключу             | Админ           |
| **🆕 `/system-settings/:key`** | PUT    | Обновление системной настройки           | Админ           |
| **🆕 `/system-settings`**      | POST   | Создание новой системной настройки       | Админ           |
| **🆕 `/system-settings/:key`** | DELETE | Удаление системной настройки             | Админ           |

### Warehouse Service (8001)

| Endpoint                         | Метод  | Описание                                      | Права доступа  |
| -------------------------------- | ------ | --------------------------------------------- | -------------- |
| `/ping`                          | GET    | Проверка работоспособности сервиса            | Публичный      |
| `/items`                         | POST   | Создание нового оборудования на складе        | Авторизованный |
| `/items/:id`                     | GET    | Получение информации об оборудовании          | Авторизованный |
| `/items`                         | GET    | Получение списка оборудования с фильтрацией   | Авторизованный |
| `/items/:id`                     | PUT    | Обновление информации об оборудовании         | Авторизованный |
| `/items/:id`                     | DELETE | Удаление оборудования со склада               | Авторизованный |
| `/transactions`                  | POST   | Создание новой транзакции (приход/расход)     | Авторизованный |
| `/transactions`                  | GET    | Получение списка транзакций с фильтрацией     | Авторизованный |
| `/transactions/item/:item_id`    | GET    | Получение истории транзакций для оборудования | Авторизованный |
| `/invoices`                      | POST   | Создание новой накладной                      | Авторизованный |
| `/invoices`                      | GET    | Получение списка накладных с фильтрацией      | Авторизованный |
| `/invoices/:id`                  | GET    | Получение информации о накладной              | Авторизованный |
| `/transactions/without-invoices` | GET    | Получение транзакций без накладных            | Авторизованный |
| **🆕 `/categories`**             | POST   | Создание новой категории оборудования         | Авторизованный |
| **🆕 `/categories`**             | GET    | Получение списка категорий                    | Авторизованный |
| **🆕 `/categories/:id`**         | GET    | Получение категории по ID                     | Авторизованный |
| **🆕 `/categories/:id`**         | PUT    | Обновление категории                          | Авторизованный |
| **🆕 `/categories/:id`**         | DELETE | Удаление категории                            | Авторизованный |
| **🆕 `/warehouses`**             | POST   | Создание нового склада                        | Авторизованный |
| **🆕 `/warehouses`**             | GET    | Получение списка складов                      | Авторизованный |
| **🆕 `/warehouses/:id`**         | GET    | Получение склада по ID                        | Авторизованный |
| **🆕 `/warehouses/:id`**         | PUT    | Обновление информации о складе                | Авторизованный |
| **🆕 `/warehouses/:id`**         | DELETE | Удаление склада                               | Авторизованный |
| **🆕 `/suppliers`**              | POST   | Создание нового поставщика                    | Авторизованный |
| **🆕 `/suppliers`**              | GET    | Получение списка поставщиков                  | Авторизованный |
| **🆕 `/suppliers/:id`**          | GET    | Получение поставщика по ID                    | Авторизованный |
| **🆕 `/suppliers/:id`**          | PUT    | Обновление информации о поставщике            | Авторизованный |
| **🆕 `/suppliers/:id`**          | DELETE | Удаление поставщика                           | Авторизованный |

### Tracking Service (8002)

| Endpoint                                                 | Метод  | Описание                                             | Права доступа  |
| -------------------------------------------------------- | ------ | ---------------------------------------------------- | -------------- |
| `/equipment`                                             | POST   | Регистрация нового оборудования для отслеживания     | Авторизованный |
| `/equipment/:id`                                         | GET    | Получение информации об оборудовании                 | Авторизованный |
| `/equipment`                                             | GET    | Получение списка оборудования с фильтрацией          | Авторизованный |
| `/equipment/:id`                                         | PUT    | Обновление информации об оборудовании                | Авторизованный |
| `/equipment/:id`                                         | DELETE | Удаление оборудования из системы отслеживания        | Авторизованный |
| `/transfer`                                              | POST   | Передача оборудования от одного держателя к другому  | Авторизованный |
| `/transfer/history/:equipment_id`                        | GET    | Получение истории передач оборудования               | Авторизованный |
| `/blockchain/register`                                   | POST   | Регистрация оборудования в блокчейн                  | Авторизованный |
| `/blockchain/history/:equipment_id`                      | GET    | Получение истории передач из блокчейна               | Авторизованный |
| `/operations`                                            | GET    | Получение операций (дополнительная функциональность) | Авторизованный |
| `/reports`                                               | GET    | Получение отчетов (дополнительная функциональность)  | Авторизованный |
| `/ping`                                                  | GET    | Проверка работоспособности с системной информацией   | Публичный      |
| **🆕 `/maintenance-schedules`**                          | POST   | Создание нового графика обслуживания                 | Авторизованный |
| **🆕 `/maintenance-schedules`**                          | GET    | Получение списка графиков обслуживания               | Авторизованный |
| **🆕 `/maintenance-schedules/:id`**                      | GET    | Получение графика обслуживания по ID                 | Авторизованный |
| **🆕 `/maintenance-schedules/:id`**                      | PUT    | Обновление графика обслуживания                      | Авторизованный |
| **🆕 `/maintenance-schedules/:id`**                      | DELETE | Удаление графика обслуживания                        | Авторизованный |
| **🆕 `/maintenance-schedules/overdue`**                  | GET    | Получение просроченных обслуживаний                  | Авторизованный |
| **🆕 `/maintenance-schedules/upcoming`**                 | GET    | Получение предстоящих обслуживаний                   | Авторизованный |
| **🆕 `/maintenance-schedules/stats`**                    | GET    | Получение статистики по обслуживанию                 | Авторизованный |
| **🆕 `/maintenance-schedules/:id/checklist/:taskIndex`** | PUT    | Обновление элемента чеклиста обслуживания            | Авторизованный |

### Notification Service (8003)

| Endpoint                           | Метод | Описание                                       | Права доступа  |
| ---------------------------------- | ----- | ---------------------------------------------- | -------------- |
| `/ping`                            | GET   | Проверка работоспособности сервиса             | Публичный      |
| `/api/notifications/user/:user_id` | GET   | Получение уведомлений пользователя             | Авторизованный |
| `/api/notifications/count`         | GET   | Получение количества непрочитанных уведомлений | Авторизованный |
| `/api/notifications/mark-read`     | POST  | Отметка уведомлений как прочитанных            | Авторизованный |
| `/api/notifications/create`        | POST  | Создание нового уведомления                    | Авторизованный |

## Функции смарт-контракта Ethereum

### EquipmentTracking (смарт-контракт)

| Функция                                  | Описание                                    |
| ---------------------------------------- | ------------------------------------------- |
| `registerEquipment(name, serialNumber)`  | Регистрация нового оборудования в блокчейне |
| `issueEquipment(id, to)`                 | Выдача оборудования со склада сотруднику    |
| `transferEquipment(id, from, to, notes)` | Передача оборудования между сотрудниками    |
| `returnEquipment(id, from)`              | Возврат оборудования на склад               |
| `getCurrentHolder(id)`                   | Получение текущего держателя оборудования   |
| `getTransferCount(id)`                   | Получение количества передач оборудования   |
| `getTransfer(id, index)`                 | Получение информации о конкретной передаче  |

## События блокчейна

| Событие                                       | Описание                                  |
| --------------------------------------------- | ----------------------------------------- |
| `EquipmentRegistered(id, name, serialNumber)` | Оборудование зарегистрировано в блокчейне |
| `EquipmentTransferred(id, from, to, notes)`   | Оборудование передано между держателями   |

## Взаимодействие компонентов

### Процесс создания накладной:

1. Пользователь создает транзакцию через Warehouse Service (приход или расход оборудования)
2. Warehouse Service сохраняет транзакцию в MongoDB
3. Пользователь может создать накладную на основе существующих транзакций
4. Warehouse Service генерирует уникальный номер накладной и сохраняет в MongoDB
5. В накладной указываются данные о получателе и выдавшем, позиции оборудования и общая стоимость
6. Накладная связывается с соответствующей транзакцией через TransactionID

### Процесс регистрации нового оборудования:

1. Пользователь создает новое оборудование через Warehouse Service
2. Warehouse Service сохраняет информацию в MongoDB
3. Warehouse Service отправляет сообщение в RabbitMQ (обмен: "warehouse_exchange", ключ: "equipment.created")
4. Tracking Service получает сообщение из очереди "equipment_created_queue" и автоматически создает запись об оборудовании
5. Tracking Service вызывает метод регистрации в смарт-контракте
6. Ethereum Node обрабатывает транзакцию и возвращает ID в блокчейне
7. Tracking Service обновляет запись об оборудовании, добавляя blockchainId

### Процесс передачи оборудования:

1. Пользователь инициирует передачу через Tracking Service
2. Tracking Service запрашивает Ethereum адреса пользователей через Auth Service
3. Tracking Service создает запись о передаче в MongoDB
4. Tracking Service вызывает метод transferEquipment или issueEquipment в смарт-контракте в зависимости от текущего держателя
5. Ethereum Node обрабатывает транзакцию
6. Tracking Service обновляет запись о передаче, добавляя blockchainTxId
7. Tracking Service отправляет сообщение в RabbitMQ (обмен: "tracking_exchange", ключ: "equipment.transferred")
8. Notification Service получает сообщение из очереди "equipment_transferred_queue" и создает уведомления для участников передачи

## Конфигурация развертывания

Система развертывается с использованием Docker и Docker Compose. Каждый сервис имеет свой Dockerfile, а общая конфигурация описана в docker-compose.yml.

### Конфигурация Docker Compose:

```yaml
version: "3.8"
services:
  auth-service:
    build: ./auth-service
    ports:
      - "8000:8000"
    environment:
      - MONGO_URI=mongodb://mongo:27017/warehouse_auth
      - JWT_SECRET=your_jwt_secret_key_for_mvp
      - PORT=8000
    depends_on:
      mongo:
        condition: service_healthy
    networks:
      - warehouse-network
    restart: on-failure

  warehouse-service:
    build: ./warehouse-service
    ports:
      - "8001:8001"
    environment:
      - MONGO_URI=mongodb://mongo:27017/warehouse_inventory
      - PORT=8001
      - AUTH_SERVICE_URL=http://auth-service:8000
      - RABBITMQ_URI=amqp://guest:guest@rabbitmq:5672/
    depends_on:
      rabbitmq:
        condition: service_healthy
      mongo:
        condition: service_started
      auth-service:
        condition: service_started
    networks:
      - warehouse-network
    restart: on-failure

  tracking-service:
    build:
      context: ./tracking-service-express
      dockerfile: Dockerfile
    ports:
      - "8002:8002"
    environment:
      - MONGO_URI=mongodb://mongo:27017/warehouse_tracking
      - PORT=8002
      - AUTH_SERVICE_URL=http://auth-service:8000
      - RABBITMQ_URI=amqp://guest:guest@rabbitmq:5672/
      - ETH_NODE_URL=http://ethereum-node:8545
      - ETH_PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
    volumes:
      - contract_data:/usr/src/app/contracts
    depends_on:
      rabbitmq:
        condition: service_healthy
      mongo:
        condition: service_started
      auth-service:
        condition: service_started
      ethereum-node:
        condition: service_started
    networks:
      - warehouse-network
    restart: on-failure

  notification-service:
    build: ./notification-service
    ports:
      - "8003:8003"
    environment:
      - MONGO_URI=mongodb://mongo:27017/warehouse_notifications
      - PORT=8003
      - RABBITMQ_URI=amqp://guest:guest@rabbitmq:5672/
    depends_on:
      rabbitmq:
        condition: service_healthy
      mongo:
        condition: service_started
    networks:
      - warehouse-network
    restart: on-failure

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - AUTH_SERVICE_URL=http://auth-service:8000
      - WAREHOUSE_SERVICE_URL=http://warehouse-service:8001
      - TRACKING_SERVICE_URL=http://tracking-service:8002
      - NOTIFICATION_SERVICE_URL=http://notification-service:8003
      - NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:8000
      - NEXT_PUBLIC_WAREHOUSE_SERVICE_URL=http://localhost:8001
      - NEXT_PUBLIC_TRACKING_SERVICE_URL=http://localhost:8002
      - NEXT_PUBLIC_NOTIFICATION_SERVICE_URL=http://localhost:8003
    depends_on:
      - auth-service
      - warehouse-service
      - tracking-service
      - notification-service
    networks:
      - warehouse-network
    restart: on-failure

  mongo:
    image: mongo:7
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - warehouse-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 3

  rabbitmq:
    image: rabbitmq:3-management
    restart: always
    ports:
      - "5672:5672"
      - "15672:15672"
    networks:
      - warehouse-network
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Простой локальный узел Ethereum для MVP
  ethereum-node:
    environment:
      - MONGO_URI=mongodb://mongo:27017/warehouse_auth
      - JWT_SECRET=your_jwt_secret_key_for_mvp
      - PORT=8000
    depends_on:
      - mongo
    networks:
      - warehouse-network
    restart: on-failure

  warehouse-service:
    build: ./warehouse-service
    ports:
      - "8001:8001"
    environment:
      - MONGO_URI=mongodb://mongo:27017/warehouse_inventory
      - PORT=8001
      - AUTH_SERVICE_URL=http://auth-service:8000
      - RABBITMQ_URI=amqp://guest:guest@rabbitmq:5672/
    depends_on:
      - mongo
      - rabbitmq
      - auth-service
    networks:
      - warehouse-network
    restart: on-failure

  tracking-service:
    build:
      context: ./tracking-service-express
      dockerfile: Dockerfile
    ports:
      - "8002:8002"
    environment:
      - MONGO_URI=mongodb://mongo:27017/warehouse_tracking
      - PORT=8002
      - AUTH_SERVICE_URL=http://auth-service:8000
      - RABBITMQ_URI=amqp://guest:guest@rabbitmq:5672/
      - ETH_NODE_URL=http://ethereum-node:8545
      - ETH_PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
    volumes:
      - ./tracking-service-express/contracts/contract-address.txt:/usr/src/app/contracts/contract-address.txt
    depends_on:
      - mongo
      - rabbitmq
      - auth-service
      - ethereum-node
    networks:
      - warehouse-network
    restart: on-failure

  notification-service:
    build: ./notification-service
    ports:
      - "8003:8003"
    environment:
      - MONGO_URI=mongodb://mongo:27017/warehouse_notifications
      - PORT=8003
      - RABBITMQ_URI=amqp://guest:guest@rabbitmq:5672/
    depends_on:
      - mongo
      - rabbitmq
    networks:
      - warehouse-network
    restart: on-failure

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - auth-service
      - warehouse-service
      - tracking-service
      - notification-service
    networks:
      - warehouse-network
    restart: on-failure

  mongo:
    image: mongo:7
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - warehouse-network

  rabbitmq:
    image: rabbitmq:3-management
    restart: always
    ports:
      - "5672:5672"
      - "15672:15672"
    networks:
      - warehouse-network

  # Простой локальный узел Ethereum для MVP
  ethereum-node:
    image: trufflesuite/ganache-cli:latest
    ports:
      - "8545:8545"
    command: >
      ganache-cli
      --account="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,1000000000000000000000"
      --account="0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890,1000000000000000000000"
      --account="0x90abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678,1000000000000000000000"
      -i 5777
      -h 0.0.0.0
      --gasLimit 12000000
      --allowUnlimitedContractSize
      --db /data
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "8545"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - ethereum_data:/data
    networks:
      - warehouse-network

volumes:
  mongo_data:
  ethereum_data:
  contract_data:

networks:
  warehouse-network:
    driver: bridge
```

## Пример JSON документа в MongoDB

### WarehouseItem

```json
{
  "_id": {
    "$oid": "681303cb8471ae795beb4f9e"
  },
  "name": "Газоанализатор ГА-200",
  "serial_number": "GA200-12345",
  "category": "Измерительное оборудование",
  "description": "Портативный газоанализатор для нефтегазовой промышленности",
  "manufacturer": "ГазТех",
  "price": 125000.0,
  "quantity": 5,
  "min_quantity": 2,
  "location": "Склад А, стеллаж 3",
  "purchase_date": {
    "$date": "2024-12-01T00:00:00Z"
  },
  "warranty_expiry": {
    "$date": "2025-12-01T00:00:00Z"
  },
  "status": "available",
  "last_inventory": {
    "$date": "2025-05-01T05:16:59.338Z"
  },
  "created_at": {
    "$date": "2025-05-01T05:16:59.338Z"
  },
  "updated_at": {
    "$date": "2025-05-01T05:16:59.338Z"
  }
}
```

### Equipment (Tracking Service)

```json
{
  "_id": {
    "$oid": "681303cb8471ae795beb4f9f"
  },
  "name": "Газоанализатор ГА-200",
  "serialNumber": "GA200-12345",
  "category": "Измерительное оборудование",
  "description": "Портативный газоанализатор для нефтегазовой промышленности",
  "manufacturer": "ГазТех",
  "purchaseDate": {
    "$date": "2024-12-01T00:00:00Z"
  },
  "warrantyExpiry": {
    "$date": "2025-12-01T00:00:00Z"
  },
  "status": "active",
  "location": "Склад А, стеллаж 3",
  "currentHolderId": null,
  "blockchainId": "1",
  "createdAt": {
    "$date": "2025-05-01T05:16:59.338Z"
  },
  "updatedAt": {
    "$date": "2025-05-01T05:16:59.338Z"
  }
}
```

### Transfer (Tracking Service)

```json
{
  "_id": {
    "$oid": "681303cb8471ae795beb4fa0"
  },
  "equipmentId": {
    "$oid": "681303cb8471ae795beb4f9f"
  },
  "fromHolderId": null,
  "toHolderId": "user-123",
  "transferDate": {
    "$date": "2025-05-10T15:30:00Z"
  },
  "transferReason": "Выдача для проведения плановых работ",
  "blockchainTxId": "0x8f23e3d53271f8df321598ab8c0eedf1d16589d4",
  "createdAt": {
    "$date": "2025-05-10T15:30:00Z"
  },
  "updatedAt": {
    "$date": "2025-05-10T15:30:00Z"
  }
}
```

### Invoice (Warehouse Service)

```json
{
  "_id": {
    "$oid": "681303cb8471ae795beb4fa1"
  },
  "number": "IN-2024-0315-001",
  "type": "receipt",
  "date": {
    "$date": "2024-03-15T14:30:00Z"
  },
  "transaction_id": {
    "$oid": "681303cb8471ae795beb4f9e"
  },
  "supplier": "ООО Компьютерные Системы",
  "supplier_contact": "+7(495)123-45-67",
  "responsible_person": "admin",
  "total_amount": 625002.5,
  "items": [
    {
      "item_id": {
        "$oid": "681303cb8471ae795beb4f9e"
      },
      "name": "Ноутбук Dell XPS 13",
      "quantity": 5,
      "unit_price": 125000.5,
      "total_price": 625002.5
    }
  ],
  "notes": "Поставка согласно договору №2024-DEL-001",
  "created_at": {
    "$date": "2024-03-15T14:30:00Z"
  }
}
```

## Безопасность и авторизация

Система использует JWT (JSON Web Tokens) для аутентификации и авторизации пользователей. Токен получается при авторизации и должен быть включен в заголовок Authorization для доступа к защищенным ресурсам.

### Жизненный цикл токена:

1. Пользователь авторизуется с логином и паролем
2. Auth Service генерирует JWT token и refresh token
3. Клиент использует JWT token в заголовке Authorization
4. При истечении срока действия токена, клиент использует refresh token для получения нового JWT
5. При выходе из системы, токены инвалидируются

## Асинхронное взаимодействие через RabbitMQ

Система использует RabbitMQ для асинхронного обмена сообщениями между микросервисами. Это обеспечивает слабую связанность компонентов и надежную передачу событий.

### Обмены и маршрутизация сообщений

| Обмен                | Тип    | Ключ маршрутизации      | Описание                                                             |
| -------------------- | ------ | ----------------------- | -------------------------------------------------------------------- |
| `warehouse_exchange` | direct | `equipment.created`     | Используется для отправки уведомлений о создании нового оборудования |
| `tracking_exchange`  | direct | `equipment.transferred` | Используется для отправки уведомлений о передаче оборудования        |

### Очереди

| Название                      | Привязка к обмену    | Ключ маршрутизации      | Потребители          |
| ----------------------------- | -------------------- | ----------------------- | -------------------- |
| `equipment_created_queue`     | `warehouse_exchange` | `equipment.created`     | Tracking Service     |
| `equipment_transferred_queue` | `tracking_exchange`  | `equipment.transferred` | Notification Service |

### Формат сообщений

#### Событие создания оборудования (equipment.created)

```json
{
  "id": "64a1b23c8791ae53cd8f9a12",
  "name": "Газоанализатор ГА-200",
  "serial_number": "GA200-12345",
  "category": "Измерительное оборудование",
  "manufacturer": "ГазТех",
  "purchase_date": "2024-12-01T00:00:00Z",
  "warranty_expiry": "2025-12-01T00:00:00Z",
  "status": "available",
  "created_at": "2025-05-01T05:16:59.338Z"
}
```

#### Событие передачи оборудования (equipment.transferred)

```json
{
  "transfer_id": "64a1b23c8791ae53cd8f9a15",
  "equipment_id": "64a1b23c8791ae53cd8f9a12",
  "equipment_name": "Газоанализатор ГА-200",
  "serial_number": "GA200-12345",
  "from_holder_id": "user-123",
  "to_holder_id": "user-456",
  "transfer_date": "2025-05-10T15:30:00Z",
  "transfer_reason": "Передача для проведения плановых работ",
  "blockchain_tx_id": "0x8f23e3d53271f8df321598ab8c0eedf1d16589d4"
}
```

## Интеграция с блокчейн

Система интегрирована с локальным блокчейном Ethereum (Ganache для MVP) для обеспечения прозрачности и неизменности истории передач оборудования.

### Процесс интеграции с блокчейн:

1. При запуске системы, Tracking Service проверяет наличие развернутого смарт-контракта
2. Если смарт-контракт не найден, сервис автоматически развертывает новый контракт и сохраняет его адрес
3. Tracking Service использует библиотеку ethers.js для взаимодействия с блокчейном
4. Все пользователи связаны с Ethereum адресами через Auth Service
5. При регистрации оборудования в Tracking Service, создается запись в блокчейне с помощью метода `registerEquipment`
6. При передаче оборудования, Tracking Service вызывает методы `issueEquipment` или `transferEquipment` в смарт-контракте в зависимости от текущего держателя
7. История передач в блокчейне может быть просмотрена через API Tracking Service

### Особенности интеграции с блокчейн в MVP:

1. Используется локальный блокчейн Ganache для разработки и тестирования
2. Адрес смарт-контракта сохраняется в файле для персистентности между перезапусками сервиса
3. Реализовано автоматическое развертывание смарт-контракта при первом запуске системы
4. Для пользователей без Ethereum адреса используется нулевой адрес (0x0)
5. Смарт-контракт написан на Solidity 0.8.0
6. Для взаимодействия с блокчейном реализованы специальные утилиты и сервисы

## Технологии Frontend

Фронтенд построен на следующих технологиях:

- **Next.js 15** с App Router - основной React фреймворк
- **Mantine UI** - библиотека компонентов интерфейса
- **Redux Toolkit** и **React Redux** - управление состоянием
- **TanStack React Query** - кэширование и синхронизация данных с сервером
- **React Hook Form** с **Zod** - обработка форм и валидация
- **Axios** - HTTP клиент для API запросов
- **Tailwind CSS** - стилизация
- **ApexCharts** и **React ApexCharts** - графики и диаграммы
- **TypeScript** - статическая типизация

### API Integration

Frontend использует Next.js API Routes для проксирования запросов к микросервисам:

- `/api/auth/*` → Auth Service (8000)
- `/api/warehouse/*` → Warehouse Service (8001)
- `/api/tracking/*` → Tracking Service (8002)
- `/api/notification/*` → Notification Service (8003)

Это обеспечивает единую точку входа для API и решает проблемы CORS при разработке.

## Рекомендации по разработке фронтенда

При разработке фронтенда рекомендуется учитывать следующие аспекты:

1. **Аутентификация и авторизация**:

   - Реализовать форму входа с JWT-авторизацией
   - Сохранять токены доступа и обновления в localStorage
   - Автоматически обновлять токен при истечении срока действия
   - Реализовать защиту роутов на основе ролей пользователей

2. **Интерфейс для работы со складом**:

   - Таблица с возможностью фильтрации и поиска оборудования
   - Формы для добавления и редактирования оборудования
   - Интерфейс для создания транзакций (приход/расход)
   - Визуализация истории транзакций с фильтрацией

3. **Интерфейс для системы отслеживания**:

   - Отображение истории передач оборудования
   - Форма для передачи оборудования между пользователями
   - Интеграция с блокчейном: отображение статуса в блокчейне и истории из блокчейна
   - Визуализация пути перемещения оборудования

4. **Система уведомлений**:

   - Панель уведомлений в верхнем меню
   - Счетчик непрочитанных уведомлений
   - Возможность отметить уведомления как прочитанные
   - Фильтрация уведомлений по типу

5. **Административный интерфейс**:

   - Управление пользователями: создание, редактирование, активация/деактивация
   - Назначение ролей пользователям
   - Назначение Ethereum адресов пользователям
   - Мониторинг активности системы

6. **Общие рекомендации**:
   - Использовать Next.js App Router для навигации (проект настроен на Next.js 15)
   - Управление состоянием реализовано с помощью Redux Toolkit
   - Адаптивная верстка обеспечена с помощью Tailwind CSS
   - Использовать Mantine UI компоненты для единообразного интерфейса
   - HTTP-запросы обрабатываются через Axios с TanStack React Query для кэширования
   - Обеспечить локализацию интерфейса для разных языков

## Известные проблемы конфигурации

### Docker Compose конфигурация Frontend

В файле `docker-compose.yml` есть неточность в переменных окружения для frontend:

```yaml
- NEXT_PUBLIC_TRACKING_SERVICE_URL=http://localhost:8080 # Неверно! Должно быть 8002
```

**Исправление**: изменить на `http://localhost:8002`, так как tracking-service работает на порту 8002.

## Ограничения MVP

### Analytics Service

- Имеет минимальную функциональность (только выводит приветственное сообщение)
- Не включен в docker-compose.yml
- Требует полной реализации для продуктивного использования

### Notification Service

- Использует in-memory хранилище вместо MongoDB
- Данные сбрасываются при перезапуске
- Тестовые данные предзагружены в код

### Общие ограничения MVP

- Отсутствие персистентности данных блокчейна между перезапусками Ganache
- Нет механизма миграций для баз данных
- Упрощенная система ролей и разрешений
- Отсутствие полноценного логирования и мониторинга

## Инструкции по развертыванию

### Системные требования

#### Минимальные требования:

- **CPU**: 2 ядра
- **RAM**: 4 GB
- **Диск**: 10 GB свободного места
- **ОС**: Linux, macOS, или Windows с WSL2

#### Рекомендуемые требования:

- **CPU**: 4 ядра
- **RAM**: 8 GB
- **Диск**: 20 GB свободного места (SSD)

### Необходимое ПО

1. **Docker** (версия 20.10+)
2. **Docker Compose** (версия 2.0+)
3. **Git** для клонирования репозитория

### Пошаговое развертывание

#### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd diplom/mvp
```

#### 2. Сборка и запуск системы

```bash
# Сборка всех сервисов
docker-compose build

# Запуск системы в фоновом режиме
docker-compose up -d

# Просмотр логов
docker-compose logs -f
```

#### 3. Проверка состояния сервисов

```bash
# Проверка статуса контейнеров
docker-compose ps

# Проверка здоровья сервисов
curl http://localhost:8000/ping  # Auth Service
curl http://localhost:8001/ping  # Warehouse Service
curl http://localhost:8002/ping  # Tracking Service
curl http://localhost:8003/ping  # Notification Service
```

#### 4. Первоначальная настройка

При первом запуске Auth Service автоматически создает пользователя-администратора:

- **Логин**: `admin`
- **Пароль**: `admin123`
- **Email**: `admin@example.com`
- **Роль**: `admin`
- **Ethereum адрес**: автоматически генерируется

Используйте эти данные для первого входа в систему через frontend на `http://localhost`.

## Мониторинг и логирование

### Просмотр логов

```bash
# Логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f auth-service
```

### Health Check эндпоинты

- **Auth Service**: `GET /ping`
- **Warehouse Service**: `GET /ping`
- **Notification Service**: `GET /ping`
- **Tracking Service**: `GET /ping` (также предоставляет подробную системную информацию)

## Производительность и оптимизация

### Рекомендуемая индексация MongoDB

#### Auth Service (warehouse_auth)

```javascript
// Коллекция users
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ eth_address: 1 });
db.users.createIndex({ role: 1, is_active: 1 });
db.users.createIndex({ department: 1 });
```

#### Warehouse Service (warehouse_inventory)

```javascript
// Коллекция warehouseitems
db.warehouseitems.createIndex({ serial_number: 1 }, { unique: true });
db.warehouseitems.createIndex({ category: 1, status: 1 });
db.warehouseitems.createIndex({ location: 1 });
db.warehouseitems.createIndex({ warranty_expiry: 1 });
db.warehouseitems.createIndex({ quantity: 1, min_quantity: 1 });

// Коллекция inventorytransactions
db.inventorytransactions.createIndex({ item_id: 1, date: -1 });
db.inventorytransactions.createIndex({ transaction_type: 1, date: -1 });
db.inventorytransactions.createIndex({ responsible_user: 1, date: -1 });
```

#### Tracking Service (warehouse_tracking)

```javascript
// Коллекция equipments
db.equipments.createIndex({ serialNumber: 1 }, { unique: true });
db.equipments.createIndex({ currentHolderId: 1 });
db.equipments.createIndex({ blockchainId: 1 });
db.equipments.createIndex({ status: 1 });

// Коллекция transfers
db.transfers.createIndex({ equipmentId: 1, transferDate: -1 });
db.transfers.createIndex({ fromHolderId: 1, transferDate: -1 });
db.transfers.createIndex({ toHolderId: 1, transferDate: -1 });
db.transfers.createIndex({ blockchainTxId: 1 });
```

#### Notification Service (warehouse_notifications)

```javascript
// Коллекция notifications
db.notifications.createIndex({ user_id: 1 });
db.notifications.createIndex({ is_read: 1 });
db.notifications.createIndex({ type: 1 });
db.notifications.createIndex({ created_at: -1 });
db.notifications.createIndex({ user_id: 1, is_read: 1 });
```

### Оптимизация RabbitMQ

#### Настройки производительности

```bash
# Увеличение лимитов памяти
RABBITMQ_VM_MEMORY_HIGH_WATERMARK=0.6

# Настройка дисковых лимитов
RABBITMQ_DISK_FREE_LIMIT=2GB

# Оптимизация для высокой нагрузки
RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS="+A 128 +P 1048576"
```

#### Настройка очередей

```bash
# Создание очередей с оптимальными параметрами
rabbitmqadmin declare queue name=equipment_created_queue \
  durable=true arguments='{"x-max-length":10000,"x-overflow":"drop-head"}'

rabbitmqadmin declare queue name=equipment_transferred_queue \
  durable=true arguments='{"x-max-length":10000,"x-overflow":"drop-head"}'
```

### Масштабирование сервисов

#### Горизонтальное масштабирование

```yaml
# docker-compose.scale.yml
version: "3.8"
services:
  warehouse-service:
    deploy:
      replicas: 3

  tracking-service:
    deploy:
      replicas: 2

  notification-service:
    deploy:
      replicas: 2
```

#### Использование

```bash
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

### Кэширование

#### Redis для кэширования (рекомендация)

```yaml
# Добавить в docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

#### Примеры кэширования в коде

```go
// Кэширование пользовательских данных (5 минут)
cache.Set("user:"+userID, userData, 5*time.Minute)

// Кэширование списка оборудования (1 минута)
cache.Set("equipment:list:"+params, equipmentList, 1*time.Minute)
```

### Метрики производительности

#### Ожидаемая характеристика MVP

- **Время отклика API**: < 200ms для 95% запросов
- **Пропускная способность**: 100 RPS на сервис
- **Время регистрации в блокчейн**: 1-3 секунды
- **Обработка сообщений RabbitMQ**: < 100ms

#### Мониторинг ключевых метрик

```bash
# Производительность MongoDB
db.runCommand({ serverStatus: 1 }).metrics

# Статистика RabbitMQ
rabbitmqctl list_queues name messages consumers

# Использование ресурсов
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

## Рекомендации по расширению системы

1. **Развитие Analytics Service**: Реализация полноценного сервиса аналитики для генерации отчетов (в настоящее время только выводит приветственное сообщение)
2. **Включение Analytics Service в Docker Compose**: При развитии сервиса аналитики добавить его в docker-compose.yml
3. **Исправление конфигурации Frontend**: Устранить ошибку с портом 8080 в docker-compose.yml
4. Интеграция с внешними системами закупок и поставок
5. Мобильное приложение для сканирования QR-кодов оборудования
6. Система автоматических уведомлений о приближающемся истечении гарантии
7. Модуль планирования технического обслуживания оборудования
8. Интеграция с метамаск для взаимодействия с публичным блокчейном
9. Реализация дополнительных смарт-контрактов для более сложной логики

## Рекомендации для разработчиков

1. Использовать единую документацию API (Swagger/OpenAPI)
2. Следовать принципам RESTful API
3. Реализовать подробное логирование действий пользователей
4. Использовать MongoDB индексы для ускорения запросов
5. Добавить кэширование часто используемых данных
6. Настроить мониторинг системы (Prometheus + Grafana)
7. Реализовать непрерывную интеграцию и развертывание (CI/CD)
