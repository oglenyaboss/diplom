#!/bin/bash
set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Запуск системы с сохранением данных Ethereum...${NC}"

# Путь к корневому каталогу проекта
PROJECT_ROOT=$(cd $(dirname $0) && pwd)
cd $PROJECT_ROOT

echo -e "${YELLOW}Проверка существования volume для Ethereum...${NC}"
VOLUME_EXISTS=$(docker volume ls | grep ethereum_data || true)

if [ -z "$VOLUME_EXISTS" ]; then
  echo -e "${YELLOW}Volume для Ethereum не существует, будет создан автоматически${NC}"
else
  echo -e "${GREEN}Volume для Ethereum уже существует${NC}"
fi

echo -e "${YELLOW}Запуск docker-compose...${NC}"
docker-compose up -d

echo -e "${YELLOW}Ожидание запуска сервисов...${NC}"
sleep 5

# Убедимся, что контейнеры запустились
if ! docker-compose ps | grep -q ethereum-node; then
  echo -e "${RED}Ошибка: контейнер ethereum-node не запустился. Проверьте логи: docker-compose logs ethereum-node${NC}"
fi

if ! docker-compose ps | grep -q tracking-service; then
  echo -e "${RED}Ошибка: контейнер tracking-service не запустился. Проверьте логи: docker-compose logs tracking-service${NC}"
fi

echo -e "${YELLOW}Ожидание запуска Ethereum ноды...${NC}"
sleep 20

echo -e "${YELLOW}Проверка статуса Ethereum контракта...${NC}"
if docker-compose exec -T tracking-service test -f /usr/src/app/scripts/check-contract-updated.js 2>/dev/null; then
  if ! docker-compose exec -T tracking-service node /usr/src/app/scripts/check-contract-updated.js; then
    echo -e "${RED}Проблема с контрактом, запускаем инициализацию...${NC}"
    docker-compose exec tracking-service /usr/src/app/scripts/init-contract-updated.sh || {
      echo -e "${RED}Ошибка при инициализации контракта через обновленный скрипт.${NC}"
    }
  fi
elif docker-compose exec -T tracking-service test -f /usr/src/app/scripts/check-contract.js 2>/dev/null; then
  if ! docker-compose exec -T tracking-service node /usr/src/app/scripts/check-contract.js; then
    echo -e "${RED}Проблема с контрактом, запускаем инициализацию...${NC}"
    docker-compose exec tracking-service /usr/src/app/scripts/init-contract.sh || {
      echo -e "${RED}Ошибка при инициализации контракта.${NC}"
    }
  fi
else
  echo -e "${RED}Скрипты проверки и инициализации контракта не найдены.${NC}"
  echo -e "${RED}Возможно, они не были успешно скопированы в контейнер.${NC}"
  echo -e "${RED}Попробуйте пересобрать образ: docker-compose build tracking-service${NC}"
fi

echo -e "${GREEN}Система успешно запущена!${NC}"
echo -e "${YELLOW}Проверка адреса используемого контракта:${NC}"
CONTRACT_ADDRESS_LOG=$(docker-compose logs tracking-service | grep -i "Using contract at address" | tail -1 || echo "Информация об адресе контракта не найдена в логах")
echo -e "${GREEN}$CONTRACT_ADDRESS_LOG${NC}"

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}Доступные сервисы:${NC}"
echo -e "${YELLOW}Auth Service:${NC} http://localhost:8000"
echo -e "${YELLOW}Warehouse Service:${NC} http://localhost:8001"
echo -e "${YELLOW}Tracking Service:${NC} http://localhost:8002"
echo -e "${YELLOW}Notification Service:${NC} http://localhost:8003"
echo -e "${YELLOW}Frontend:${NC} http://localhost:80"
echo -e "${YELLOW}RabbitMQ Management:${NC} http://localhost:15672"
echo -e "${YELLOW}Ethereum JSON-RPC:${NC} http://localhost:8545"
echo -e "${GREEN}==================================================${NC}"
