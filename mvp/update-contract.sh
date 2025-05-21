#!/bin/bash
set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Запуск процедуры обновления контракта...${NC}"

# Проверка, запущены ли контейнеры
if ! docker-compose ps | grep -q tracking-service; then
  echo -e "${RED}Сервисы не запущены. Сначала запустите систему с помощью start-system.sh${NC}"
  exit 1
fi

echo -e "${YELLOW}Компиляция смарт-контракта...${NC}"
docker-compose exec tracking-service node /usr/src/app/scripts/compile-contract.js

echo -e "${YELLOW}Удаление существующего файла с адресом контракта...${NC}"
# Используем путь внутри контейнера
docker-compose exec tracking-service rm -f /usr/src/app/contracts/contract-address.txt

echo -e "${YELLOW}Деплой нового контракта...${NC}"
docker-compose exec tracking-service node /usr/src/app/scripts/deploy-contract.js

echo -e "${YELLOW}Перезапуск tracking-service для применения нового контракта...${NC}"
docker-compose restart tracking-service

echo -e "${YELLOW}Ожидание запуска сервиса...${NC}"
sleep 10

echo -e "${GREEN}Контракт успешно обновлен!${NC}"
echo -e "${YELLOW}Проверка адреса нового контракта:${NC}"

CONTRACT_ADDRESS_LOG=$(docker-compose logs tracking-service | grep -i "Using contract at address" | tail -1 || echo "Информация об адресе контракта не найдена в логах")
echo -e "${GREEN}$CONTRACT_ADDRESS_LOG${NC}"

echo -e "${YELLOW}Проверка работоспособности контракта...${NC}"
docker-compose exec tracking-service node scripts/check-contract.js || {
  echo -e "${RED}Проблема с новым контрактом, пожалуйста, проверьте логи${NC}"
  exit 1
}

echo -e "${GREEN}Обновление контракта успешно завершено!${NC}"
