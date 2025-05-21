# Архитектура системы учета складских запасов с использованием блокчейн-технологии

## Содержание

- [1. Введение](#1-введение)
- [2. Обзор системы](#2-обзор-системы)
- [3. Архитектура системы](#3-архитектура-системы)
  - [3.1. Общая архитектура](#31-общая-архитектура)
  - [3.2. Микросервисная архитектура](#32-микросервисная-архитектура)
- [4. Блокчейн-компонент](#4-блокчейн-компонент)
  - [4.1. Смарт-контракты](#41-смарт-контракты)
  - [4.2. Интеграция с традиционными системами](#42-интеграция-с-традиционными-системами)
- [5. Модель данных](#5-модель-данных)
  - [5.1. Схема базы данных MongoDB](#51-схема-базы-данных-mongodb)
  - [5.2. Связь между блокчейном и БД](#52-связь-между-блокчейном-и-бд)
- [6. Потоки данных](#6-потоки-данных)
- [7. Технологический стек](#7-технологический-стек)
- [8. Безопасность системы](#8-безопасность-системы)
- [9. Масштабируемость и отказоустойчивость](#9-масштабируемость-и-отказоустойчивость)
- [10. Процесс разработки и развертывания](#10-процесс-разработки-и-развертывания)
- [11. Потенциальные улучшения](#11-потенциальные-улучшения)

## 1. Введение

Данный документ описывает архитектуру системы автоматизации учета складских запасов нефтегазового предприятия с использованием блокчейн-технологии и смарт-контрактов. Система предназначена для точного отслеживания движения оборудования, обеспечения прозрачности и неизменности истории передач между сотрудниками после выдачи со склада.

Ключевыми особенностями системы являются:

- Использование блокчейна Ethereum для отслеживания передачи оборудования
- Микросервисная архитектура, обеспечивающая гибкость и масштабируемость
- Интеграция современных технологий: Go, Docker, RabbitMQ, MongoDB, React
- Высокий уровень безопасности и аудита операций

## 2. Обзор системы

Система учета складских запасов решает следующие задачи:

1. Регистрация оборудования в системе с уникальной идентификацией
2. Отслеживание выдачи оборудования со склада сотрудникам
3. Запись и контроль передач оборудования между сотрудниками
4. Учет возврата оборудования на склад
5. Аудит и формирование отчетов по движению оборудования
6. Уведомление сотрудников о связанных с ними операциях

Применение блокчейн-технологии обеспечивает:

- Неизменяемую историю всех операций с оборудованием
- Предотвращение несанкционированных изменений данных
- Прозрачность и отслеживаемость всего жизненного цикла оборудования
- Однозначную идентификацию текущего владельца оборудования

## 3. Архитектура системы

### 3.1. Общая архитектура

Система построена на основе микросервисной архитектуры с использованием контейнеризации Docker. Это обеспечивает изоляцию компонентов, упрощает масштабирование и развертывание.

![Общая архитектура системы](data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHN0eWxlPnRleHR7Zm9udC1zaXplOjE0cHg7Zm9udC1mYW1pbHk6QXJpYWwsc2Fucy1zZXJpZjt9cmVjdHtmaWxsOndoaXRlO3N0cm9rZTojMzMzO3N0cm9rZS13aWR0aDoxLjV9LmNsdXN0ZXJ7ZmlsbDojZjVmNWY1O3N0cm9rZTojYWFhO3N0cm9rZS13aWR0aDoxLjV9LmFycm93e3N0cm9rZTojMzMzO3N0cm9rZS13aWR0aDoxLjV9PC9zdHlsZT48ZGVmcz48bWFya2VyIGlkPSJhcnJvd2hlYWQiIG1hcmtlcldpZHRoPSIxMCIgbWFya2VySGVpZ2h0PSI3IiByZWZYPSIwIiByZWZZPSIzLjUiIG9yaWVudD0iYXV0byI+PHBvbHlnb24gcG9pbnRzPSIwIDAsIDEwIDMuNSwgMCA3IiBmaWxsPSIjMzMzIi8+PC9tYXJrZXI+PC9kZWZzPjxyZWN0IGNsYXNzPSJjbHVzdGVyIiB4PSI1MCIgeT0iNTAiIHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiIHJ4PSI1Ii8+PHRleHQgeD0iMTUwIiB5PSI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RnJvbnRlbmQ8L3RleHQ+PHJlY3QgY2xhc3M9ImNsdXN0ZXIiIHg9IjUwIiB5PSIxNTAiIHdpZHRoPSI2MDAiIGhlaWdodD0iMTAwIiByeD0iNSIvPjx0ZXh0IHg9IjM1MCIgeT0iMTcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5CYWNrZW5kIE1pY3Jvc2VydmljZXM8L3RleHQ+PHJlY3QgeD0iODAiIHk9IjE4MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSI1MCIgcng9IjUiLz48dGV4dCB4PSIxMzAiIHk9IjIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QXV0aCBTZXJ2aWNlPC90ZXh0PjxyZWN0IHg9IjIwMCIgeT0iMTgwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiByeD0iNSIvPjx0ZXh0IHg9IjI1MCIgeT0iMjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5XYXJlaG91c2U8L3RleHQ+PHJlY3QgeD0iMzIwIiB5PSIxODAiIHdpZHRoPSIxMDAiIGhlaWdodD0iNTAiIHJ4PSI1Ii8+PHRleHQgeD0iMzcwIiB5PSIyMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlRyYWNraW5nPC90ZXh0PjxyZWN0IHg9IjQ0MCIgeT0iMTgwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiByeD0iNSIvPjx0ZXh0IHg9IjQ5MCIgeT0iMjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Ob3RpZmljYXRpb248L3RleHQ+PHJlY3QgeD0iNTYwIiB5PSIxODAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI1MCIgcng9IjUiLz48dGV4dCB4PSI1OTAiIHk9IjIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QW5hbHl0aWNzPC90ZXh0PjxyZWN0IGNsYXNzPSJjbHVzdGVyIiB4PSI3MDAiIHk9IjE1MCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1Ii8+PHRleHQgeD0iODAwIiB5PSIxNzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkJsb2NrY2hhaW48L3RleHQ+PHJlY3QgeD0iNzIwIiB5PSIxODAiIHdpZHRoPSI3NSIgaGVpZ2h0PSI1MCIgcng9IjUiLz48dGV4dCB4PSI3NTcuNSIgeT0iMjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TbWFydDwvdGV4dD48dGV4dCB4PSI3NTcuNSIgeT0iMjI1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Db250cmFjdHM8L3RleHQ+PHJlY3QgeD0iODEwIiB5PSIxODAiIHdpZHRoPSI3NSIgaGVpZ2h0PSI1MCIgcng9IjUiLz48dGV4dCB4PSI4NDcuNSIgeT0iMjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FdGhlcmV1bTwvdGV4dD48cmVjdCBjbGFzcz0iY2x1c3RlciIgeD0iNTAiIHk9IjI4MCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSI2MCIgcng9IjUiLz48dGV4dCB4PSIxNTAiIHk9IjMxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TWVzc2FnZSBCcm9rZXI8L3RleHQ+PHJlY3QgY2xhc3M9ImNsdXN0ZXIiIHg9IjMwMCIgeT0iMjgwIiB3aWR0aD0iNDUwIiBoZWlnaHQ9IjYwIiByeD0iNSIvPjx0ZXh0IHg9IjUyNSIgeT0iMzEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5EYXRhYmFzZXM8L3RleHQ+PHJlY3QgeD0iMzIwIiB5PSIyOTAiIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIHJ4PSI1Ii8+PHRleHQgeD0iMzcwIiB5PSIzMTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk1vbmdvREI8L3RleHQ+PHJlY3QgeD0iNDgwIiB5PSIyOTAiIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIHJ4PSI1Ii8+PHRleHQgeD0iNTMwIiB5PSIzMTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlJlZGlzPC90ZXh0PjxyZWN0IHg9IjYwIiB5PSIyOTAiIHdpZHRoPSIxODAiIGhlaWdodD0iNDAiIHJ4PSI1Ii8+PHRleHQgeD0iMTUwIiB5PSIzMTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlJhYmJpdE1RPC90ZXh0PjxsaW5lIHgxPSIxNTAiIHkxPSIxMTAiIHgyPSIxNTAiIHkyPSIxNTAiIGNsYXNzPSJhcnJvdyIgbWFya2VyLWVuZD0idXJsKCNhcnJvd2hlYWQpIi8+PGxpbmUgeDE9IjQ1MCIgeTE9IjI1MCIgeDI9IjQ1MCIgeTI9IjI4MCIgY2xhc3M9ImFycm93IiBtYXJrZXItZW5kPSJ1cmwoI2Fycm93aGVhZCkiLz48bGluZSB4MT0iMTUwIiB5MT0iMjUwIiB4Mj0iMTUwIiB5Mj0iMjgwIiBjbGFzcz0iYXJyb3ciIG1hcmtlci1lbmQ9InVybCgjYXJyb3doZWFkKSIvPjxsaW5lIHgxPSI2MDAiIHkxPSIyMDAiIHgyPSI3MDAiIHkyPSIyMDAiIGNsYXNzPSJhcnJvdyIgbWFya2VyLWVuZD0idXJsKCNhcnJvd2hlYWQpIi8+PGxpbmUgeDE9IjM3MCIgeTE9IjIzMCIgeDI9IjQ0MCIgeTI9IjI4MCIgY2xhc3M9ImFycm93IiBtYXJrZXItZW5kPSJ1cmwoI2Fycm93aGVhZCkiLz48L3N2Zz4=)

Основные компоненты системы:

1. **Frontend** - React приложение, предоставляющее интерфейс пользователя
2. **Backend Microservices** - Набор микросервисов на Go, реализующих бизнес-логику
3. **Message Broker** - RabbitMQ для асинхронного обмена сообщениями между сервисами
4. **Databases** - MongoDB для хранения данных и Redis для кэширования
5. **Blockchain** - Локальная сеть Ethereum на базе Hardhat со смарт-контрактами

### 3.2. Микросервисная архитектура

Система состоит из следующих микросервисов:

#### 3.2.1. Сервис аутентификации (Authentication Service)

- **Назначение**: Управление пользователями, аутентификация и авторизация
- **Основные функции**:
  - Регистрация новых пользователей
  - Аутентификация пользователей (логин/пароль, JWT)
  - Управление ролями и разрешениями
  - Обновление токенов доступа
- **API**:
  - `POST /auth/login` - аутентификация пользователя
  - `POST /auth/register` - регистрация нового пользователя
  - `POST /auth/refresh` - обновление токена
  - `GET /users/roles` - получение информации о ролях

#### 3.2.2. Сервис склада (Warehouse Service)

- **Назначение**: Управление складскими операциями и оборудованием
- **Основные функции**:
  - Регистрация нового оборудования
  - Выдача оборудования со склада
  - Прием оборудования на склад
  - Управление инвентаризацией
- **API**:
  - `GET /inventory/items` - получение списка оборудования
  - `POST /inventory/items` - добавление нового оборудования
  - `POST /inventory/issue` - выдача оборудования
  - `POST /inventory/receive` - прием оборудования
  - `POST /inventory/audit` - проведение инвентаризации

#### 3.2.3. Сервис отслеживания (Tracking Service)

- **Назначение**: Отслеживание движения оборудования и взаимодействие с блокчейном
- **Основные функции**:
  - Регистрация передач оборудования между сотрудниками
  - Запись операций в блокчейн через смарт-контракты
  - Получение истории движения оборудования
  - Определение текущего владельца
- **API**:
  - `GET /tracking/transfers` - получение списка передач
  - `POST /tracking/transfers` - регистрация новой передачи
  - `GET /tracking/history/{itemId}` - получение истории передач
  - `GET /tracking/location/{itemId}` - получение текущего местоположения

#### 3.2.4. Сервис уведомлений (Notification Service)

- **Назначение**: Управление оповещениями пользователей
- **Основные функции**:
  - Отправка уведомлений о передачах оборудования
  - Оповещение о необходимости возврата оборудования
  - Уведомления об изменениях статуса оборудования
  - Управление подписками на уведомления
- **API**:
  - `POST /notifications/send` - отправка уведомления
  - `GET /notifications/user/{userId}` - получение уведомлений пользователя
  - `PUT /notifications/{id}/read` - пометка уведомления как прочитанного
  - `POST /notifications/subscribe` - подписка на уведомления

#### 3.2.5. Сервис аналитики (Analytics Service)

- **Назначение**: Формирование отчетов и аналитических данных
- **Основные функции**:
  - Генерация отчетов об использовании оборудования
  - Анализ эффективности использования ресурсов
  - Прогнозирование потребностей в оборудовании
  - Статистика по сотрудникам и отделам
- **API**:
  - `GET /analytics/usage` - статистика использования оборудования
  - `GET /analytics/reports` - формирование отчетов
  - `GET /analytics/forecasts` - прогнозы потребностей
  - `GET /analytics/departments` - отчеты по отделам

## 4. Блокчейн-компонент

### 4.1. Смарт-контракты

Ключевым элементом системы является смарт-контракт `EquipmentTracking`, который обеспечивает отслеживание движения оборудования. Контракт разработан на языке Solidity и развертывается в локальной сети Ethereum.

Основные структуры данных в смарт-контракте:

```solidity
// Структура для хранения информации об оборудовании
struct Equipment {
    uint256 id;
    string name;
    string serialNumber;
    address currentHolder;
    uint256 issueDate;
    uint256 lastTransferDate;
    bool isActive;
}

// Структура для хранения информации о передаче
struct Transfer {
    uint256 equipmentId;
    address from;
    address to;
    uint256 transferDate;
    string transferNotes;
}
```
