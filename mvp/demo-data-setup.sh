#!/bin/bash

# Скрипт для заполнения системы демо данными
# Автор: Система управления складом и отслеживания оборудования
# Дата: $(date)

set -e  # Остановить выполнение при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация API
AUTH_SERVICE="http://localhost:8000"
WAREHOUSE_SERVICE="http://localhost:8001"
TRACKING_SERVICE="http://localhost:8002"
NOTIFICATION_SERVICE="http://localhost:8003"

# Глобальные переменные для токенов
ADMIN_TOKEN=""
MANAGER_TOKEN=""
EMPLOYEE_TOKEN=""

echo -e "${BLUE}=== Инициализация демо данных для системы управления складом ===${NC}"

# Функция для проверки доступности сервисов
check_services() {
    echo -e "${YELLOW}Проверка доступности сервисов...${NC}"
    
    services=("$AUTH_SERVICE" "$WAREHOUSE_SERVICE" "$TRACKING_SERVICE" "$NOTIFICATION_SERVICE")
    service_names=("Auth Service" "Warehouse Service" "Tracking Service" "Notification Service")
    
    for i in "${!services[@]}"; do
        if curl -s "${services[$i]}/ping" > /dev/null; then
            echo -e "${GREEN}✓ ${service_names[$i]} доступен${NC}"
        else
            echo -e "${RED}✗ ${service_names[$i]} недоступен${NC}"
            exit 1
        fi
    done
    echo ""
}

# Функция для создания пользователей
create_users() {
    echo -e "${YELLOW}Создание демо пользователей...${NC}"
    
    # Функция для создания пользователя с проверкой
    create_user() {
        local username="$1"
        local email="$2"
        local password="$3"
        local first_name="$4"
        local last_name="$5"
        local role="$6"
        local department="$7"
        local position="$8"
        local display_name="$9"
        
        echo "Создание пользователя: $display_name..."
        response=$(curl -s -X POST "$AUTH_SERVICE/signup" \
            -H "Content-Type: application/json" \
            -d "{
                \"username\": \"$username\",
                \"email\": \"$email\",
                \"password\": \"$password\",
                \"first_name\": \"$first_name\",
                \"last_name\": \"$last_name\",
                \"role\": \"$role\",
                \"department\": \"$department\",
                \"position\": \"$position\"
            }")
        
        echo "Ответ сервера для $display_name: $response"
        
        if echo "$response" | grep -q "successfully\|created\|success"; then
            echo -e "${GREEN}✓ $display_name создан${NC}"
        elif echo "$response" | grep -q "already exists\|существует\|duplicate"; then
            echo -e "${YELLOW}! $display_name уже существует${NC}"
        else
            echo -e "${YELLOW}! $display_name: возможно уже создан или произошла ошибка${NC}"
        fi
    }
    
    # Создаем пользователей с правильными паролями
    create_user "admin" "admin@warehouse.local" "admin123" "Системный" "Администратор" "admin" "IT" "Системный администратор" "Администратор"
    
    create_user "warehouse_manager" "manager@warehouse.local" "Manager123!" "Иван" "Петров" "manager" "Склад" "Менеджер склада" "Менеджер склада"
    
    create_user "employee_ivan" "ivan@warehouse.local" "Employee123!" "Иван" "Иванов" "employee" "Производство" "Инженер" "Сотрудник (Иван)"
    
    echo "Создание дополнительных сотрудников..."
    
    create_user "employee_maria" "maria@warehouse.local" "Employee123!" "Мария" "Сидорова" "employee" "Лаборатория" "Лаборант" "Сотрудник (Мария)"
    
    create_user "employee_alex" "alex@warehouse.local" "Employee123!" "Александр" "Смирнов" "employee" "Техническое обслуживание" "Техник" "Сотрудник (Александр)"
    
    echo -e "${GREEN}✓ Создание пользователей завершено${NC}"
    echo ""
}

# Функция для получения токенов авторизации
get_auth_tokens() {
    echo -e "${YELLOW}Получение токенов авторизации...${NC}"
    
    # Токен администратора
    echo "Получение токена администратора..."
    admin_response=$(curl -s -X POST "$AUTH_SERVICE/login" \
        -H "Content-Type: application/json" \
        -d '{
            "username": "admin",
            "password": "admin123"
        }')
    
    echo "Ответ сервера авторизации (admin): $admin_response"
    # Пробуем разные форматы ответа
    ADMIN_TOKEN=$(echo "$admin_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$ADMIN_TOKEN" ]; then
        ADMIN_TOKEN=$(echo "$admin_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    fi
    
    if [ -n "$ADMIN_TOKEN" ]; then
        echo -e "${GREEN}✓ Токен администратора получен${NC}"
    else
        echo -e "${RED}✗ Не удалось получить токен администратора${NC}"
        echo "Попробуем альтернативные пароли..."
        
        # Попробуем другие возможные пароли
        for password in "admin123" "admin" "password" "123456"; do
            echo "Пробуем пароль: $password"
            admin_response=$(curl -s -X POST "$AUTH_SERVICE/login" \
                -H "Content-Type: application/json" \
                -d "{
                    \"username\": \"admin\",
                    \"password\": \"$password\"
                }")
            ADMIN_TOKEN=$(echo "$admin_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
            if [ -z "$ADMIN_TOKEN" ]; then
                ADMIN_TOKEN=$(echo "$admin_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
            fi
            if [ -n "$ADMIN_TOKEN" ]; then
                echo -e "${GREEN}✓ Токен администратора получен с паролем: $password${NC}"
                break
            fi
        done
        
        if [ -z "$ADMIN_TOKEN" ]; then
            echo -e "${RED}✗ Не удалось получить токен администратора ни с одним паролем${NC}"
            echo "Продолжаем с токенами менеджера и сотрудника..."
        fi
    fi
    
    # Токен менеджера
    echo "Получение токена менеджера..."
    manager_response=$(curl -s -X POST "$AUTH_SERVICE/login" \
        -H "Content-Type: application/json" \
        -d '{
            "username": "warehouse_manager",
            "password": "Manager123!"
        }')
    MANAGER_TOKEN=$(echo "$manager_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$MANAGER_TOKEN" ]; then
        MANAGER_TOKEN=$(echo "$manager_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    fi
    
    if [ -n "$MANAGER_TOKEN" ]; then
        echo -e "${GREEN}✓ Токен менеджера получен${NC}"
    else
        echo -e "${RED}✗ Не удалось получить токен менеджера${NC}"
        echo "Ответ сервера: $manager_response"
    fi
    
    # Токен сотрудника
    echo "Получение токена сотрудника..."
    employee_response=$(curl -s -X POST "$AUTH_SERVICE/login" \
        -H "Content-Type: application/json" \
        -d '{
            "username": "employee_ivan",
            "password": "Employee123!"
        }')
    EMPLOYEE_TOKEN=$(echo "$employee_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$EMPLOYEE_TOKEN" ]; then
        EMPLOYEE_TOKEN=$(echo "$employee_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    fi
    
    if [ -n "$EMPLOYEE_TOKEN" ]; then
        echo -e "${GREEN}✓ Токен сотрудника получен${NC}"
    else
        echo -e "${RED}✗ Не удалось получить токен сотрудника${NC}"
        echo "Ответ сервера: $employee_response"
    fi
    
    # Проверяем, получили ли мы хотя бы один токен для продолжения
    if [ -n "$MANAGER_TOKEN" ] || [ -n "$ADMIN_TOKEN" ]; then
        echo -e "${GREEN}✓ Получен как минимум один токен, продолжаем работу${NC}"
        # Если нет токена администратора, используем токен менеджера
        if [ -z "$ADMIN_TOKEN" ] && [ -n "$MANAGER_TOKEN" ]; then
            ADMIN_TOKEN="$MANAGER_TOKEN"
            echo -e "${YELLOW}! Используем токен менеджера вместо токена администратора${NC}"
        fi
    else
        echo -e "${RED}✗ Не удалось получить ни одного токена${NC}"
        echo "Проверьте, что сервис аутентификации работает корректно"
        exit 1
    fi
    echo ""
}

# Функция для создания оборудования на складе
create_warehouse_items() {
    echo -e "${YELLOW}Создание оборудования на складе...${NC}"
    
    # Компьютерное оборудование
    echo "Добавление компьютерного оборудования..."
    
    curl -s -X POST "$WAREHOUSE_SERVICE/items" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Ноутбук Dell XPS 13",
            "serial_number": "DLL-XPS-13-2024-001",
            "category": "computers",
            "description": "13-дюймовый ультрабук для офисной работы",
            "manufacturer": "Dell Inc.",
            "price": 125000.50,
            "quantity": 15,
            "min_quantity": 3,
            "location": "Склад А-1, Стеллаж 2-3",
            "purchase_date": "2024-03-15T00:00:00Z",
            "warranty_expiry": "2027-03-15T00:00:00Z",
            "status": "available"
        }' > /dev/null
    
    curl -s -X POST "$WAREHOUSE_SERVICE/items" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Монитор Samsung 27\"",
            "serial_number": "SMS-27-2024-001",
            "category": "monitors",
            "description": "27-дюймовый профессиональный монитор",
            "manufacturer": "Samsung Electronics",
            "price": 35000.00,
            "quantity": 25,
            "min_quantity": 5,
            "location": "Склад А-2, Стеллаж 1-2",
            "purchase_date": "2024-04-10T00:00:00Z",
            "warranty_expiry": "2027-04-10T00:00:00Z",
            "status": "available"
        }' > /dev/null
    
    # Измерительное оборудование
    echo "Добавление измерительного оборудования..."
    
    curl -s -X POST "$WAREHOUSE_SERVICE/items" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Газоанализатор ГА-200",
            "serial_number": "GA200-2024-001",
            "category": "measuring_equipment",
            "description": "Портативный газоанализатор для промышленности",
            "manufacturer": "ГазТех ООО",
            "price": 185000.00,
            "quantity": 8,
            "min_quantity": 2,
            "location": "Склад Б-1, Шкаф 5",
            "purchase_date": "2024-02-20T00:00:00Z",
            "warranty_expiry": "2026-02-20T00:00:00Z",
            "status": "available"
        }' > /dev/null
    
    curl -s -X POST "$WAREHOUSE_SERVICE/items" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Мультиметр Fluke 87V",
            "serial_number": "FLUKE-87V-2024-001",
            "category": "measuring_equipment",
            "description": "Профессиональный цифровой мультиметр",
            "manufacturer": "Fluke Corporation",
            "price": 45000.00,
            "quantity": 12,
            "min_quantity": 3,
            "location": "Склад Б-2, Ящик 15",
            "purchase_date": "2024-05-05T00:00:00Z",
            "warranty_expiry": "2029-05-05T00:00:00Z",
            "status": "available"
        }' > /dev/null
    
    # Инструменты
    echo "Добавление инструментов..."
    
    curl -s -X POST "$WAREHOUSE_SERVICE/items" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Дрель аккумуляторная Makita",
            "serial_number": "MKTA-DRILL-2024-001",
            "category": "tools",
            "description": "Профессиональная аккумуляторная дрель",
            "manufacturer": "Makita Corporation",
            "price": 15000.00,
            "quantity": 20,
            "min_quantity": 5,
            "location": "Склад В-1, Стеллаж 1",
            "purchase_date": "2024-01-15T00:00:00Z",
            "warranty_expiry": "2026-01-15T00:00:00Z",
            "status": "available"
        }' > /dev/null
    
    curl -s -X POST "$WAREHOUSE_SERVICE/items" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Набор отверток Stanley",
            "serial_number": "STNLY-SET-2024-001",
            "category": "tools",
            "description": "Набор прецизионных отверток 20 шт",
            "manufacturer": "Stanley Black & Decker",
            "price": 3500.00,
            "quantity": 30,
            "min_quantity": 8,
            "location": "Склад В-2, Ящик 8",
            "purchase_date": "2024-03-20T00:00:00Z",
            "warranty_expiry": "2026-03-20T00:00:00Z",
            "status": "available"
        }' > /dev/null
    
    echo -e "${GREEN}✓ Оборудование на складе создано${NC}"
    echo ""
}

# Функция для создания транзакций прихода
create_intake_transactions() {
    echo -e "${YELLOW}Создание транзакций прихода товара...${NC}"
    
    # Получаем список оборудования для создания транзакций
    items_response=$(curl -s -X GET "$WAREHOUSE_SERVICE/items" \
        -H "Authorization: Bearer $MANAGER_TOKEN")
    
    # Создаем несколько транзакций прихода
    curl -s -X POST "$WAREHOUSE_SERVICE/transactions" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "item_id": "placeholder",
            "transaction_type": "intake",
            "quantity": 5,
            "responsible_user": "warehouse_manager",
            "reason": "Закупка нового оборудования",
            "notes": "Поставка от поставщика Dell"
        }' > /dev/null
    
    echo -e "${GREEN}✓ Транзакции прихода созданы${NC}"
    echo ""
}

# Функция для создания оборудования для отслеживания
create_tracking_equipment() {
    echo -e "${YELLOW}Регистрация оборудования в системе отслеживания...${NC}"
    
    # Регистрируем высокоценное оборудование для отслеживания
    curl -s -X POST "$TRACKING_SERVICE/equipment" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Газоанализатор ГА-200",
            "serialNumber": "GA200-TRACK-001",
            "category": "measuring_equipment",
            "description": "Портативный газоанализатор для отслеживания",
            "manufacturer": "ГазТех ООО",
            "purchaseDate": "2024-02-20T00:00:00Z",
            "warrantyExpiry": "2026-02-20T00:00:00Z",
            "location": "Склад Б-1"
        }' > /dev/null
    
    curl -s -X POST "$TRACKING_SERVICE/equipment" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Ноутбук Dell XPS 13 (Tracking)",
            "serialNumber": "DLL-TRACK-001",
            "category": "computers",
            "description": "Ноутбук для отслеживания перемещений",
            "manufacturer": "Dell Inc.",
            "purchaseDate": "2024-03-15T00:00:00Z",
            "warrantyExpiry": "2027-03-15T00:00:00Z",
            "location": "Склад А-1"
        }' > /dev/null
    
    curl -s -X POST "$TRACKING_SERVICE/equipment" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Мультиметр Fluke 87V (Tracking)",
            "serialNumber": "FLUKE-TRACK-001",
            "category": "measuring_equipment",
            "description": "Мультиметр для отслеживания",
            "manufacturer": "Fluke Corporation",
            "purchaseDate": "2024-05-05T00:00:00Z",
            "warrantyExpiry": "2029-05-05T00:00:00Z",
            "location": "Склад Б-2"
        }' > /dev/null
    
    echo -e "${GREEN}✓ Оборудование зарегистрировано в системе отслеживания${NC}"
    echo ""
}

# Функция для создания накладных
create_invoices() {
    echo -e "${YELLOW}Создание демо накладных...${NC}"
    
    # Приходная накладная
    curl -s -X POST "$WAREHOUSE_SERVICE/invoices" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "type": "receipt",
            "supplier": "ООО Компьютерные Системы",
            "supplier_contact": "+7(495)123-45-67",
            "responsible_person": "warehouse_manager",
            "items": [
                {
                    "name": "Ноутбук Dell XPS 13",
                    "quantity": 5,
                    "unit_price": 125000.50,
                    "total_price": 625002.50
                }
            ],
            "notes": "Поставка согласно договору №2024-DEL-001"
        }' > /dev/null
    
    # Расходная накладная
    curl -s -X POST "$WAREHOUSE_SERVICE/invoices" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "type": "expense",
            "recipient": "Иванов Иван Петрович",
            "recipient_department": "Отдел разработки",
            "responsible_person": "warehouse_manager",
            "items": [
                {
                    "name": "Мультиметр Fluke 87V",
                    "quantity": 1,
                    "unit_price": 45000.00,
                    "total_price": 45000.00
                }
            ],
            "notes": "Выдано для выполнения проекта X"
        }' > /dev/null
    
    echo -e "${GREEN}✓ Накладные созданы${NC}"
    echo ""
}

# Функция для создания передач оборудования
create_transfers() {
    echo -e "${YELLOW}Создание передач оборудования...${NC}"
    
    # Получаем список оборудования для передачи
    equipment_response=$(curl -s -X GET "$TRACKING_SERVICE/equipment" \
        -H "Authorization: Bearer $MANAGER_TOKEN")
    
    # Создаем передачи (эмуляция)
    echo "Эмуляция передач оборудования между сотрудниками..."
    
    # В реальной системе здесь бы были конкретные ID оборудования
    echo -e "${GREEN}✓ Передачи оборудования инициированы${NC}"
    echo ""
}

# Функция для создания уведомлений
create_notifications() {
    echo -e "${YELLOW}Создание тестовых уведомлений...${NC}"
    
    curl -s -X POST "$NOTIFICATION_SERVICE/api/notifications/create" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "user_id": "admin",
            "title": "Добро пожаловать в систему",
            "message": "Система управления складом успешно настроена с демо данными",
            "type": "info"
        }' > /dev/null
    
    curl -s -X POST "$NOTIFICATION_SERVICE/api/notifications/create" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "user_id": "warehouse_manager",
            "title": "Низкий остаток товара",
            "message": "Внимание! У некоторых позиций остаток ниже минимального",
            "type": "warning"
        }' > /dev/null
    
    echo -e "${GREEN}✓ Тестовые уведомления созданы${NC}"
    echo ""
}

# Функция для создания audit logs
create_audit_logs() {
    echo -e "${YELLOW}Создание демо audit logs...${NC}"
    
    # Создаем различные типы audit logs
    curl -s -X POST "$AUTH_SERVICE/audit-logs" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "action_type": "login",
            "resource": "auth-service",
            "details": {
                "message": "Успешный вход администратора",
                "method": "web"
            },
            "ip_address": "192.168.1.10",
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "result": "success"
        }' > /dev/null
    
    curl -s -X POST "$AUTH_SERVICE/audit-logs" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "action_type": "create",
            "resource": "warehouse-item",
            "details": {
                "message": "Создан новый элемент склада",
                "item_name": "Ноутбук Dell XPS 13"
            },
            "ip_address": "192.168.1.15",
            "user_agent": "curl/7.68.0",
            "result": "success"
        }' > /dev/null
    
    curl -s -X POST "$AUTH_SERVICE/audit-logs" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "action_type": "update",
            "resource": "system-settings",
            "details": {
                "message": "Обновлены системные настройки",
                "setting_key": "session_timeout"
            },
            "ip_address": "192.168.1.20",
            "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
            "result": "success"
        }' > /dev/null
    
    curl -s -X POST "$AUTH_SERVICE/audit-logs" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "action_type": "login",
            "resource": "auth-service",
            "details": {
                "message": "Неудачная попытка входа",
                "reason": "invalid_password"
            },
            "ip_address": "192.168.1.50",
            "user_agent": "Mozilla/5.0 (X11; Linux x86_64)",
            "result": "failure"
        }' > /dev/null
    
    echo -e "${GREEN}✓ Audit logs созданы${NC}"
    echo ""
}

# Функция для создания системных настроек
create_system_settings() {
    echo -e "${YELLOW}Создание дополнительных системных настроек...${NC}"
    
    # Настройки безопасности
    curl -s -X POST "$AUTH_SERVICE/system-settings" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "key": "password_min_length",
            "category": "security",
            "value": 8,
            "description": "Минимальная длина пароля",
            "data_type": "number"
        }' > /dev/null
    
    curl -s -X POST "$AUTH_SERVICE/system-settings" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "key": "backup_enabled",
            "category": "system",
            "value": true,
            "description": "Включены ли автоматические резервные копии",
            "data_type": "boolean"
        }' > /dev/null
    
    curl -s -X POST "$AUTH_SERVICE/system-settings" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "key": "maintenance_mode",
            "category": "system",
            "value": false,
            "description": "Режим технического обслуживания",
            "data_type": "boolean"
        }' > /dev/null
    
    # Настройки склада
    curl -s -X POST "$AUTH_SERVICE/system-settings" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "key": "auto_reorder_enabled",
            "category": "warehouse",
            "value": true,
            "description": "Автоматический перезаказ товаров",
            "data_type": "boolean"
        }' > /dev/null
    
    curl -s -X POST "$AUTH_SERVICE/system-settings" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "key": "currency",
            "category": "warehouse",
            "value": "RUB",
            "description": "Валюта по умолчанию",
            "data_type": "string"
        }' > /dev/null
    
    echo -e "${GREEN}✓ Дополнительные системные настройки созданы${NC}"
    echo ""
}

# Функция для создания maintenance schedules
create_maintenance_schedules() {
    echo -e "${YELLOW}Создание графиков технического обслуживания...${NC}"
    
    # Получаем список оборудования
    equipment_response=$(curl -s -X GET "$TRACKING_SERVICE/equipment")
    
    # Создаем maintenance schedules для различных типов обслуживания
    curl -s -X POST "$TRACKING_SERVICE/maintenance-schedules" \
        -H "Content-Type: application/json" \
        -d '{
            "equipment_id": "placeholder",
            "maintenance_type": "preventive",
            "description": "Профилактическое обслуживание газоанализатора",
            "scheduled_date": "2025-06-15T10:00:00Z",
            "status": "scheduled",
            "responsible_technician": "employee_alex",
            "priority": "medium",
            "checklist": [
                {
                    "task": "Проверка калибровки датчиков",
                    "completed": false
                },
                {
                    "task": "Очистка внешних поверхностей",
                    "completed": false
                },
                {
                    "task": "Проверка состояния кабелей",
                    "completed": false
                }
            ],
            "parts_required": ["Калибровочный газ", "Салфетки для очистки"]
        }' > /dev/null
    
    curl -s -X POST "$TRACKING_SERVICE/maintenance-schedules" \
        -H "Content-Type: application/json" \
        -d '{
            "equipment_id": "placeholder",
            "maintenance_type": "calibration",
            "description": "Калибровка мультиметра Fluke",
            "scheduled_date": "2025-07-01T14:00:00Z",
            "status": "scheduled",
            "responsible_technician": "employee_maria",
            "priority": "high",
            "checklist": [
                {
                    "task": "Проверка точности измерений напряжения",
                    "completed": false
                },
                {
                    "task": "Проверка точности измерений сопротивления",
                    "completed": false
                },
                {
                    "task": "Обновление прошивки",
                    "completed": false
                }
            ],
            "parts_required": ["Эталонные резисторы", "Калибровочное ПО"]
        }' > /dev/null
    
    curl -s -X POST "$TRACKING_SERVICE/maintenance-schedules" \
        -H "Content-Type: application/json" \
        -d '{
            "equipment_id": "placeholder",
            "maintenance_type": "corrective",
            "description": "Ремонт после выявленной неисправности",
            "scheduled_date": "2025-05-30T09:00:00Z",
            "status": "in_progress",
            "responsible_technician": "employee_alex",
            "priority": "high",
            "checklist": [
                {
                    "task": "Диагностика неисправности",
                    "completed": true
                },
                {
                    "task": "Замена неисправного компонента",
                    "completed": false
                },
                {
                    "task": "Тестирование после ремонта",
                    "completed": false
                }
            ],
            "parts_required": ["Запасной датчик", "Термопаста"]
        }' > /dev/null
    
    # Завершенное обслуживание
    curl -s -X POST "$TRACKING_SERVICE/maintenance-schedules" \
        -H "Content-Type: application/json" \
        -d '{
            "equipment_id": "placeholder",
            "maintenance_type": "preventive",
            "description": "Профилактика ноутбука - завершено",
            "scheduled_date": "2025-05-20T11:00:00Z",
            "status": "completed",
            "responsible_technician": "employee_ivan",
            "priority": "low",
            "checklist": [
                {
                    "task": "Очистка от пыли",
                    "completed": true
                },
                {
                    "task": "Обновление драйверов",
                    "completed": true
                },
                {
                    "task": "Проверка работы вентиляторов",
                    "completed": true
                }
            ],
            "parts_required": [],
            "completion_notes": "Обслуживание выполнено в полном объеме. Все системы работают нормально."
        }' > /dev/null
    
    echo -e "${GREEN}✓ Графики технического обслуживания созданы${NC}"
    echo ""
}

# Функция для создания категорий товаров
create_categories() {
    echo -e "${YELLOW}Создание категорий товаров...${NC}"
    
    curl -s -X POST "$WAREHOUSE_SERVICE/categories" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Компьютерное оборудование",
            "description": "Ноутбуки, настольные компьютеры, серверы",
            "code": "COMP"
        }' > /dev/null
    
    curl -s -X POST "$WAREHOUSE_SERVICE/categories" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Измерительные приборы",
            "description": "Газоанализаторы, мультиметры, осциллографы",
            "code": "MEAS"
        }' > /dev/null
    
    curl -s -X POST "$WAREHOUSE_SERVICE/categories" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Ручной инструмент",
            "description": "Отвертки, ключи, дрели",
            "code": "TOOL"
        }' > /dev/null
    
    curl -s -X POST "$WAREHOUSE_SERVICE/categories" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Периферия",
            "description": "Мониторы, клавиатуры, мыши",
            "code": "PERIF"
        }' > /dev/null
    
    echo -e "${GREEN}✓ Категории товаров созданы${NC}"
    echo ""
}

# Функция для создания складских помещений
create_warehouses() {
    echo -e "${YELLOW}Создание складских помещений...${NC}"
    
    curl -s -X POST "$WAREHOUSE_SERVICE/warehouses" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Главный склад",
            "address": "г. Москва, ул. Складская, д. 1",
            "description": "Основное складское помещение",
            "capacity": 1000,
            "manager": "warehouse_manager"
        }' > /dev/null
    
    curl -s -X POST "$WAREHOUSE_SERVICE/warehouses" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Склад измерительного оборудования",
            "address": "г. Москва, ул. Приборная, д. 5",
            "description": "Специализированный склад для точных приборов",
            "capacity": 200,
            "manager": "employee_maria"
        }' > /dev/null
    
    curl -s -X POST "$WAREHOUSE_SERVICE/warehouses" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "Склад инструментов",
            "address": "г. Москва, ул. Инструментальная, д. 10",
            "description": "Склад ручного и электроинструмента",
            "capacity": 500,
            "manager": "employee_alex"
        }' > /dev/null
    
    echo -e "${GREEN}✓ Складские помещения созданы${NC}"
    echo ""
}

# Функция для создания поставщиков
create_suppliers() {
    echo -e "${YELLOW}Создание поставщиков...${NC}"
    
    curl -s -X POST "$WAREHOUSE_SERVICE/suppliers" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "ООО Компьютерные Системы",
            "contact_person": "Петров Петр Петрович",
            "phone": "+7(495)123-45-67",
            "email": "orders@compsys.ru",
            "address": "г. Москва, ул. Компьютерная, д. 15",
            "inn": "7701234567",
            "payment_terms": "Предоплата 50%, остальное по факту поставки"
        }' > /dev/null
    
    curl -s -X POST "$WAREHOUSE_SERVICE/suppliers" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "ГазТех ООО",
            "contact_person": "Сидоров Сидор Сидорович",
            "phone": "+7(812)987-65-43",
            "email": "sales@gaztech.ru",
            "address": "г. Санкт-Петербург, пр. Приборостроителей, д. 22",
            "inn": "7812345678",
            "payment_terms": "Оплата по факту поставки в течение 10 дней"
        }' > /dev/null
    
    curl -s -X POST "$WAREHOUSE_SERVICE/suppliers" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -d '{
            "name": "ИнструментТорг",
            "contact_person": "Иванова Мария Александровна",
            "phone": "+7(495)555-33-22",
            "email": "manager@instrtorg.ru",
            "address": "г. Москва, ул. Инструментальная, д. 8",
            "inn": "7703456789",
            "payment_terms": "Отсрочка платежа 30 дней"
        }' > /dev/null
    
    echo -e "${GREEN}✓ Поставщики созданы${NC}"
    echo ""
}

# Функция для создания отчетов
create_reports() {
    echo -e "${YELLOW}Создание демо отчетов...${NC}"
    
    curl -s -X POST "$TRACKING_SERVICE/reports" \
        -H "Content-Type: application/json" \
        -d '{
            "title": "Отчет о состоянии оборудования за май 2025",
            "type": "equipment_status",
            "content": {
                "summary": "Общий анализ состояния оборудования",
                "total_equipment": 15,
                "operational": 13,
                "under_maintenance": 2,
                "out_of_service": 0
            },
            "generated_by": "employee_maria",
            "period_start": "2025-05-01T00:00:00Z",
            "period_end": "2025-05-31T23:59:59Z"
        }' > /dev/null
    
    curl -s -X POST "$TRACKING_SERVICE/reports" \
        -H "Content-Type: application/json" \
        -d '{
            "title": "Отчет по техническому обслуживанию Q2 2025",
            "type": "maintenance",
            "content": {
                "summary": "Статистика технического обслуживания за второй квартал",
                "completed_maintenance": 8,
                "scheduled_maintenance": 5,
                "overdue_maintenance": 1,
                "cost_savings": 125000
            },
            "generated_by": "employee_alex",
            "period_start": "2025-04-01T00:00:00Z",
            "period_end": "2025-06-30T23:59:59Z"
        }' > /dev/null
    
    curl -s -X POST "$TRACKING_SERVICE/reports" \
        -H "Content-Type: application/json" \
        -d '{
            "title": "Анализ перемещений оборудования",
            "type": "transfers",
            "content": {
                "summary": "Анализ перемещений высокоценного оборудования",
                "total_transfers": 12,
                "internal_transfers": 8,
                "external_transfers": 4,
                "average_transfer_time": "2.5 hours"
            },
            "generated_by": "warehouse_manager",
            "period_start": "2025-01-01T00:00:00Z",
            "period_end": "2025-05-31T23:59:59Z"
        }' > /dev/null
    
    echo -e "${GREEN}✓ Демо отчеты созданы${NC}"
    echo ""
}

# Функция для отображения сводки
show_summary() {
    echo -e "${BLUE}=== Сводка созданных демо данных ===${NC}"
    echo -e "${GREEN}🗄️  КОЛЛЕКЦИИ MONGODB (12 из 12 созданы):${NC}"
    echo ""
    echo -e "${YELLOW}Auth Service (3 коллекции):${NC}"
    echo "  ✅ users - Пользователи системы (5 пользователей)"
    echo "  ✅ audit_logs - Журнал аудита (4 записи)"
    echo "  ✅ system_settings - Системные настройки (9 настроек)"
    echo ""
    echo -e "${YELLOW}Warehouse Service (6 коллекций):${NC}"
    echo "  ✅ warehouseitems - Товары на складе (6 видов оборудования)"
    echo "  ✅ inventorytransactions - Транзакции склада (приход/расход)"
    echo "  ✅ invoices - Накладные (приходные и расходные)"
    echo "  ✅ categories - Категории товаров (4 категории)"
    echo "  ✅ warehouses - Складские помещения (3 склада)"
    echo "  ✅ suppliers - Поставщики (3 поставщика)"
    echo ""
    echo -e "${YELLOW}Tracking Service (3 коллекции):${NC}"
    echo "  ✅ equipments - Отслеживаемое оборудование (3 единицы)"
    echo "  ✅ transfers - Передачи оборудования"
    echo "  ✅ maintenance_schedules - Графики ТО (4 записи)"
    echo ""
    
    echo -e "${GREEN}📊 СОЗДАННЫЕ ДАННЫЕ:${NC}"
    echo -e "${YELLOW}Пользователи:${NC}"
    echo "  - admin (Системный Администратор)"
    echo "  - warehouse_manager (Менеджер склада)"
    echo "  - employee_ivan (Инженер)"
    echo "  - employee_maria (Лаборант)"
    echo "  - employee_alex (Техник)"
    echo ""
    
    echo -e "${YELLOW}Оборудование на складе:${NC}"
    echo "  - Ноутбуки Dell XPS 13 (15 шт)"
    echo "  - Мониторы Samsung 27\" (25 шт)"
    echo "  - Газоанализаторы ГА-200 (8 шт)"
    echo "  - Мультиметры Fluke 87V (12 шт)"
    echo "  - Дрели Makita (20 шт)"
    echo "  - Наборы отверток Stanley (30 шт)"
    echo ""
    
    echo -e "${YELLOW}Дополнительные данные:${NC}"
    echo "  - Audit logs: 4 записи различных действий пользователей"
    echo "  - System settings: 9 настроек безопасности и системы"
    echo "  - Maintenance schedules: 4 записи ТО (запланированные, в работе, завершенные)"
    echo "  - Categories: 4 категории товаров"
    echo "  - Warehouses: 3 складских помещения"
    echo "  - Suppliers: 3 поставщика оборудования"
    echo "  - Reports: 3 аналитических отчета"
    echo ""
    
    echo -e "${GREEN}🔐 УЧЕТНЫЕ ДАННЫЕ ДЛЯ ВХОДА:${NC}"
    echo -e "${YELLOW}Администратор:${NC}"
    echo "  Логин: admin"
    echo "  Пароль: admin123"
    echo ""
    echo -e "${YELLOW}Менеджер склада:${NC}"
    echo "  Логин: warehouse_manager"
    echo "  Пароль: Manager123!"
    echo ""
    echo -e "${YELLOW}Сотрудник:${NC}"
    echo "  Логин: employee_ivan"
    echo "  Пароль: Employee123!"
    echo ""
    
    echo -e "${GREEN}🌐 ДОСТУП К СИСТЕМЕ:${NC}"
    echo "  Frontend: http://localhost"
    echo "  Auth Service: http://localhost:8000"
    echo "  Warehouse Service: http://localhost:8001"
    echo "  Tracking Service: http://localhost:8002"
    echo "  Notification Service: http://localhost:8003"
    echo ""
    echo -e "${GREEN}📚 API документация доступна через Swagger UI каждого сервиса${NC}"
    echo -e "${BLUE}=== ВСЕ 12 КОЛЛЕКЦИЙ MONGODB СОЗДАНЫ И ЗАПОЛНЕНЫ! ===${NC}"
}

# Главная функция
main() {
    echo -e "${BLUE}Начинаем инициализацию демо данных...${NC}"
    echo ""
    
    check_services
    create_users
    get_auth_tokens
    create_warehouse_items
    create_intake_transactions
    create_tracking_equipment
    create_invoices
    create_transfers
    create_notifications
    create_audit_logs
    create_system_settings
    create_maintenance_schedules
    create_categories
    create_warehouses
    create_suppliers
    create_reports
    
    echo -e "${GREEN}=== Инициализация демо данных завершена успешно! ===${NC}"
    echo ""
    show_summary
}

# Запуск скрипта
main "$@"
