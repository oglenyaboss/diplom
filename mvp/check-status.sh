#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}                СТАТУС СИСТЕМЫ КОНТЕЙНЕРОВ                           ${NC}"
echo -e "${BLUE}=====================================================================${NC}"

# Проверка запущенных контейнеров
echo -e "${YELLOW}Статус контейнеров:${NC}"
docker-compose ps

# Проверка наличия файла адреса контракта
echo -e "\n${YELLOW}Проверка файла адреса контракта:${NC}"
# Файл теперь находится в Docker volume, проверяем его через контейнер
if docker-compose exec -T tracking-service test -f /usr/src/app/contracts/contract-address.txt 2>/dev/null; then
    CONTRACT_ADDRESS=$(docker-compose exec -T tracking-service cat /usr/src/app/contracts/contract-address.txt)
    echo -e "${GREEN}Файл с адресом контракта найден в контейнере${NC}"
    echo -e "${GREEN}Адрес контракта: $CONTRACT_ADDRESS${NC}"
else
    echo -e "${RED}Файл с адресом контракта не найден в контейнере!${NC}"
fi

# Проверка доступности Ethereum ноды
echo -e "\n${YELLOW}Проверка доступности Ethereum ноды:${NC}"
if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null; then
    BLOCK_INFO=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 | grep result | cut -d '"' -f 4)
    BLOCK_NUM=$((16#${BLOCK_INFO:2}))
    echo -e "${GREEN}Ethereum нода доступна. Текущий блок: $BLOCK_NUM${NC}"
else
    echo -e "${RED}Ethereum нода недоступна!${NC}"
fi

# Проверка статуса MongoDB
echo -e "\n${YELLOW}Проверка доступности MongoDB:${NC}"
if docker-compose exec -T mongo mongosh --quiet --eval "db.version()" > /dev/null 2>&1; then
    MONGO_VERSION=$(docker-compose exec -T mongo mongosh --quiet --eval "db.version()")
    echo -e "${GREEN}MongoDB доступна. Версия: $MONGO_VERSION${NC}"
else
    echo -e "${RED}MongoDB недоступна!${NC}"
fi

# Проверка статуса RabbitMQ
echo -e "\n${YELLOW}Проверка доступности RabbitMQ:${NC}"
if curl -s -u guest:guest http://localhost:15672/api/overview > /dev/null 2>&1; then
    RABBIT_VERSION=$(curl -s -u guest:guest http://localhost:15672/api/overview | grep -o '"rabbitmq_version":"[^"]*"' | cut -d '"' -f 4)
    echo -e "${GREEN}RabbitMQ доступен. Версия: $RABBIT_VERSION${NC}"
else
    echo -e "${RED}RabbitMQ недоступен!${NC}"
fi

# Проверка статуса контракта
echo -e "\n${YELLOW}Проверка статуса Ethereum контракта:${NC}"
if docker-compose exec -T tracking-service test -f /usr/src/app/scripts/check-contract-updated.js 2>/dev/null; then
    if docker-compose exec -T tracking-service node /usr/src/app/scripts/check-contract-updated.js > /dev/null 2>&1; then
        echo -e "${GREEN}Контракт валиден и функционирует корректно${NC}"
    else
        echo -e "${RED}Проблема с контрактом. Подробности:${NC}"
        docker-compose exec tracking-service node /usr/src/app/scripts/check-contract-updated.js
    fi
elif docker-compose exec -T tracking-service test -f /usr/src/app/scripts/check-contract.js 2>/dev/null; then
    if docker-compose exec -T tracking-service node /usr/src/app/scripts/check-contract.js > /dev/null 2>&1; then
        echo -e "${GREEN}Контракт валиден и функционирует корректно${NC}"
    else
        echo -e "${RED}Проблема с контрактом. Подробности:${NC}"
        docker-compose exec tracking-service node /usr/src/app/scripts/check-contract.js
    fi
else
    echo -e "${RED}Скрипт проверки контракта не найден!${NC}"
fi

echo -e "\n${BLUE}=====================================================================${NC}"
echo -e "${BLUE}                       КОМАНДЫ УПРАВЛЕНИЯ                             ${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo -e "${YELLOW}Полная очистка и перезапуск:${NC} ./clean-and-restart.sh"
echo -e "${YELLOW}Обновление контракта:${NC} ./update-contract.sh"
echo -e "${YELLOW}Логи tracking-service:${NC} docker-compose logs -f tracking-service"
echo -e "${YELLOW}Логи ethereum-node:${NC} docker-compose logs -f ethereum-node"
echo -e "${BLUE}=====================================================================${NC}"
