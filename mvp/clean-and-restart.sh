#!/bin/bash
set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}=====================================================================${NC}"
echo -e "${RED}               ПОЛНАЯ ОЧИСТКА DOCKER-ОКРУЖЕНИЯ                        ${NC}"
echo -e "${RED}=====================================================================${NC}"
echo
echo -e "${RED}ВНИМАНИЕ: Этот скрипт удалит ВСЕ контейнеры, образы, тома и сети,${NC}"
echo -e "${RED}связанные с вашим проектом. Все данные будут потеряны!${NC}"
echo
echo -e "${YELLOW}Вы уверены, что хотите продолжить? (y/n)${NC}"
read -p " " confirm

if [[ $confirm != "y" && $confirm != "Y" ]]; then
    echo -e "${GREEN}Операция отменена.${NC}"
    exit 0
fi

# Путь к корневому каталогу проекта
PROJECT_ROOT=$(cd $(dirname $0) && pwd)
cd $PROJECT_ROOT

echo -e "${BLUE}[1/7]${NC} ${YELLOW}Останавливаем все контейнеры...${NC}"
docker-compose down || true

echo -e "${BLUE}[2/7]${NC} ${YELLOW}Удаляем все контейнеры проекта...${NC}"
# Найти и удалить контейнеры, связанные с проектом (даже остановленные)
CONTAINERS=$(docker ps -a | grep -E 'mvp_|mvp-' | awk '{print $1}' || true)
if [ ! -z "$CONTAINERS" ]; then
    docker rm -f $CONTAINERS || true
    echo -e "   ${GREEN}Контейнеры проекта удалены.${NC}"
else
    echo -e "   ${GREEN}Контейнеры проекта не найдены.${NC}"
fi

echo -e "${BLUE}[3/7]${NC} ${YELLOW}Удаляем тома Docker...${NC}"
# Удаляем тома, связанные с проектом
for volume in $(docker volume ls -q | grep -E 'mvp_|ethereum_data|mongo_data|contract_data' || true); do
    echo -e "   ${RED}Удаление тома: ${volume}${NC}"
    docker volume rm -f $volume || true
done
echo -e "   ${GREEN}Тома удалены.${NC}"

echo -e "${BLUE}[4/7]${NC} ${YELLOW}Удаляем сети Docker...${NC}"
# Удаляем сети, связанные с проектом
for network in $(docker network ls | grep -E 'mvp_|warehouse-network' | awk '{print $1}' || true); do
    echo -e "   ${RED}Удаление сети: ${network}${NC}"
    docker network rm $network || true
done
echo -e "   ${GREEN}Сети удалены.${NC}"

echo -e "${BLUE}[5/7]${NC} ${YELLOW}Удаляем неиспользуемые образы и кэш...${NC}"
docker system prune -f || true
echo -e "   ${GREEN}Неиспользуемые ресурсы Docker удалены.${NC}"

echo -e "${BLUE}[6/7]${NC} ${YELLOW}Удаляем файл с адресом контракта...${NC}"
# Теперь файл находится в Docker volume, не нужно удалять его напрямую
echo -e "   ${GREEN}Файл с адресом контракта будет удален вместе с Docker volume.${NC}"

echo -e "${BLUE}[7/7]${NC} ${YELLOW}Удаляем файлы логов...${NC}"
find . -path "*/logs/*.log" -delete || true
echo -e "   ${GREEN}Файлы логов удалены.${NC}"

echo -e "${GREEN}=====================================================================${NC}"
echo -e "${GREEN}                      ОЧИСТКА ЗАВЕРШЕНА                              ${NC}"
echo -e "${GREEN}=====================================================================${NC}"

echo
echo -e "${YELLOW}Хотите запустить систему заново? (y/n)${NC}"
read -p " " restart

if [[ $restart == "y" || $restart == "Y" ]]; then
    echo -e "${YELLOW}Запуск системы...${NC}"
    ./start-system.sh
else
    echo -e "${GREEN}Чтобы запустить систему вручную, выполните:${NC}"
    echo -e "${BLUE}   cd $PROJECT_ROOT${NC}"
    echo -e "${BLUE}   ./start-system.sh${NC}"
fi
