# Система управления складом и отслеживания оборудования - Документация архитектуры

## Общая архитектура системы

Система построена на основе микросервисной архитектуры, где каждый сервис выполняет свою определенную функцию и обменивается данными с другими сервисами через REST API и сообщения в RabbitMQ. Данные хранятся в MongoDB, а для отслеживания передачи оборудования используется блокчейн Ethereum (Ganache для MVP).

![Общая архитектура системы](https://placeholder.com/architecture-diagram)

### Основные компоненты

1. **Auth Service (Go)**: Аутентификация и авторизация пользователей, управление Ethereum адресами для пользователей
2. **Warehouse Service (Go)**: Управление складом и учет оборудования
3. **Tracking Service (Node.js/Express)**: Отслеживание перемещений оборудования с интеграцией блокчейн, включая развертывание и взаимодействие со смарт-контрактами
4. **Notification Service (Go)**: Отправка и управление уведомлениями
5. **Analytics Service (Go)**: Аналитика и отчеты (в разработке)
6. **Frontend (React.js)**: Пользовательский интерфейс системы с компонентами для всех сервисов
7. **MongoDB**: Хранение данных для всех сервисов
8. **RabbitMQ**: Обмен сообщениями между сервисами
9. **Ethereum Node (Ganache)**: Локальный блокчейн для отслеживания передачи оборудования

## Модели данных

### Auth Service

#### User

```go
type User struct {
    ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    Username     string             `bson:"username" json:"username"`
    Email        string             `bson:"email" json:"email"`
    PasswordHash string             `bson:"password_hash" json:"-"` // Хеш пароля не отправляется клиенту
    FirstName    string             `bson:"first_name" json:"first_name"`
    LastName     string             `bson:"last_name" json:"last_name"`
    Role         string             `bson:"role" json:"role"`
    Department   string             `bson:"department" json:"department"`
    Position     string             `bson:"position" json:"position"`
    EthAddress   string             `bson:"eth_address" json:"eth_address"` // Ethereum адрес пользователя
    IsActive     bool               `bson:"is_active" json:"is_active"`
    LastLogin    time.Time          `bson:"last_login,omitempty" json:"last_login,omitempty"`
    CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
    UpdatedAt    time.Time          `bson:"updated_at" json:"updated_at"`
}
```

#### Роли пользователей

- `admin`: Администратор системы
- `manager`: Менеджер склада
- `warehouse`: Кладовщик
- `employee`: Обычный сотрудник

### Warehouse Service

#### WarehouseItem

```go
type WarehouseItem struct {
    ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    Name            string             `bson:"name" json:"name"`
    SerialNumber    string             `bson:"serial_number" json:"serial_number"`
    Category        string             `bson:"category" json:"category"`
    Description     string             `bson:"description" json:"description"`
    Manufacturer    string             `bson:"manufacturer" json:"manufacturer"`
    Quantity        int                `bson:"quantity" json:"quantity"`
    MinQuantity     int                `bson:"min_quantity" json:"min_quantity"`
    Location        string             `bson:"location" json:"location"`
    PurchaseDate    time.Time          `bson:"purchase_date" json:"purchase_date"`
    WarrantyExpiry  time.Time          `bson:"warranty_expiry" json:"warranty_expiry"`
    Status          string             `bson:"status" json:"status"` // available, reserved, unavailable
    LastInventory   time.Time          `bson:"last_inventory" json:"last_inventory"`
    CreatedAt       time.Time          `bson:"created_at" json:"created_at"`
    UpdatedAt       time.Time          `bson:"updated_at" json:"updated_at"`
}
```

#### InventoryTransaction

```go
type InventoryTransaction struct {
    ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    ItemID          primitive.ObjectID `bson:"item_id" json:"item_id"`
    TransactionType string             `bson:"transaction_type" json:"transaction_type"` // intake, issue, return, adjustment
    Quantity        int                `bson:"quantity" json:"quantity"`
    ResponsibleUser string             `bson:"responsible_user" json:"responsible_user"`
    DestinationUser string             `bson:"destination_user,omitempty" json:"destination_user,omitempty"`
    Reason          string             `bson:"reason" json:"reason"`
    Date            time.Time          `bson:"date" json:"date"`
    Notes           string             `bson:"notes,omitempty" json:"notes,omitempty"`
}
```

### Tracking Service

#### Equipment

```javascript
const equipmentSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },
    serialNumber: {
      type: String,
      required: [true, "Please add a serial number"],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Please add a category"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    manufacturer: {
      type: String,
      required: [true, "Please add a manufacturer"],
      trim: true,
    },
    purchaseDate: {
      type: Date,
      required: [true, "Please add a purchase date"],
    },
    warrantyExpiry: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "maintenance", "decommissioned"],
      default: "active",
    },
    location: {
      type: String,
      required: [true, "Please add a location"],
      trim: true,
    },
    currentHolderId: {
      type: String,
      default: null,
    },
    blockchainId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);
```

#### Transfer

```javascript
const transferSchema = mongoose.Schema(
  {
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Equipment",
    },
    fromHolderId: {
      type: String,
    },
    toHolderId: {
      type: String,
      required: true,
    },
    transferDate: {
      type: Date,
      default: Date.now,
    },
    transferReason: {
      type: String,
      required: true,
    },
    blockchainTxId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);
```

### Notification Service

#### Notification

```go
type Notification struct {
    ID        string    `json:"id"`
    UserID    string    `json:"user_id"`
    Type      string    `json:"type"`
    Message   string    `json:"message"`
    RelatedTo string    `json:"related_to,omitempty"`
    IsRead    bool      `json:"is_read"`
    CreatedAt time.Time `json:"created_at"`
}
```

### Блокчейн (Умный контракт Ethereum)

#### Equipment (структура смарт-контракта)

```solidity
struct Equipment {
    uint256 id;
    string name;
    string serialNumber;
    address currentHolder;
    bool exists;
}
```

#### Transfer (структура смарт-контракта)

```solidity
struct Transfer {
    uint256 equipmentId;
    address from;
    address to;
    uint256 timestamp;
    string notes;
}
```

## API Endpoints

### Auth Service (8000)

| Endpoint                 | Метод | Описание                                 | Права доступа   |
| ------------------------ | ----- | ---------------------------------------- | --------------- |
| `/ping`                  | GET   | Проверка работоспособности сервиса       | Публичный       |
| `/signup`                | POST  | Регистрация нового пользователя          | Публичный       |
| `/login`                 | POST  | Авторизация пользователя                 | Публичный       |
| `/refresh`               | POST  | Обновление JWT токена                    | Публичный       |
| `/profile`               | GET   | Получение профиля текущего пользователя  | Авторизованный  |
| `/profile`               | PUT   | Обновление профиля текущего пользователя | Авторизованный  |
| `/users`                 | GET   | Получение списка всех пользователей      | Админ           |
| `/users/:id`             | GET   | Получение информации о пользователе      | Админ, Менеджер |
| `/users/:id/role`        | PUT   | Изменение роли пользователя              | Админ           |
| `/users/:id/status`      | PUT   | Изменение статуса пользователя           | Админ           |
| `/users`                 | POST  | Создание нового пользователя             | Админ           |
| `/users/:id/eth-address` | PUT   | Установка Ethereum адреса пользователя   | Админ           |
| `/eth-address/:user_id`  | GET   | Получение Ethereum адреса пользователя   | Авторизованный  |

### Warehouse Service (8001)

| Endpoint                      | Метод  | Описание                                      | Права доступа  |
| ----------------------------- | ------ | --------------------------------------------- | -------------- |
| `/ping`                       | GET    | Проверка работоспособности сервиса            | Публичный      |
| `/items`                      | POST   | Создание нового оборудования на складе        | Авторизованный |
| `/items/:id`                  | GET    | Получение информации об оборудовании          | Авторизованный |
| `/items`                      | GET    | Получение списка оборудования с фильтрацией   | Авторизованный |
| `/items/:id`                  | PUT    | Обновление информации об оборудовании         | Авторизованный |
| `/items/:id`                  | DELETE | Удаление оборудования со склада               | Авторизованный |
| `/transactions`               | POST   | Создание новой транзакции (приход/расход)     | Авторизованный |
| `/transactions`               | GET    | Получение списка транзакций с фильтрацией     | Авторизованный |
| `/transactions/item/:item_id` | GET    | Получение истории транзакций для оборудования | Авторизованный |

### Tracking Service (8002)

| Endpoint                            | Метод  | Описание                                            | Права доступа  |
| ----------------------------------- | ------ | --------------------------------------------------- | -------------- |
| `/equipment`                        | POST   | Регистрация нового оборудования для отслеживания    | Авторизованный |
| `/equipment/:id`                    | GET    | Получение информации об оборудовании                | Авторизованный |
| `/equipment`                        | GET    | Получение списка оборудования с фильтрацией         | Авторизованный |
| `/equipment/:id`                    | PUT    | Обновление информации об оборудовании               | Авторизованный |
| `/equipment/:id`                    | DELETE | Удаление оборудования из системы отслеживания       | Авторизованный |
| `/transfer`                         | POST   | Передача оборудования от одного держателя к другому | Авторизованный |
| `/transfer/history/:equipment_id`   | GET    | Получение истории передач оборудования              | Авторизованный |
| `/blockchain/register`              | POST   | Регистрация оборудования в блокчейн                 | Авторизованный |
| `/blockchain/history/:equipment_id` | GET    | Получение истории передач из блокчейна              | Авторизованный |

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
      - "8002:8080"
    environment:
      - MONGO_URI=mongodb://mongo:27017/warehouse_tracking
      - PORT=8080
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
      --debug
    networks:
      - warehouse-network

volumes:
  mongo_data:

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
6. При передаче оборудования, Tracking Service вызывает методы `issueEquipment` или `transferEquipment` в зависимости от текущего держателя
7. История передач в блокчейне может быть просмотрена через API Tracking Service

### Особенности интеграции с блокчейн в MVP:

1. Используется локальный блокчейн Ganache для разработки и тестирования
2. Адрес смарт-контракта сохраняется в файле для персистентности между перезапусками сервиса
3. Реализовано автоматическое развертывание смарт-контракта при первом запуске системы
4. Для пользователей без Ethereum адреса используется нулевой адрес (0x0)
5. Смарт-контракт написан на Solidity 0.8.0
6. Для взаимодействия с блокчейном реализованы специальные утилиты и сервисы

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
   - Использовать React Router для навигации
   - Реализовать управление состоянием с помощью Redux или Context API
   - Обеспечить адаптивную верстку для разных устройств
   - Использовать Material-UI или другую библиотеку компонентов
   - Реализовать интерцепторы для HTTP-запросов с обработкой ошибок
   - Обеспечить локализацию интерфейса для разных языков

## Рекомендации по расширению системы

1. Реализация полноценного сервиса аналитики для генерации отчетов
2. Интеграция с внешними системами закупок и поставок
3. Мобильное приложение для сканирования QR-кодов оборудования
4. Система автоматических уведомлений о приближающемся истечении гарантии
5. Модуль планирования технического обслуживания оборудования
6. Интеграция с метамаск для взаимодействия с публичным блокчейном
7. Реализация дополнительных смарт-контрактов для более сложной логики

## Рекомендации для разработчиков

1. Использовать единую документацию API (Swagger/OpenAPI)
2. Следовать принципам RESTful API
3. Реализовать подробное логирование действий пользователей
4. Использовать MongoDB индексы для ускорения запросов
5. Добавить кэширование часто используемых данных
6. Настроить мониторинг системы (Prometheus + Grafana)
7. Реализовать непрерывную интеграцию и развертывание (CI/CD)
