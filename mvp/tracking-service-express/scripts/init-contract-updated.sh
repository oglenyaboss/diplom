#!/bin/sh
set -e

echo "Запуск скрипта инициализации контракта..."

# Путь к файлу с адресом контракта
CONTRACT_ADDRESS_FILE=/usr/src/app/contracts/contract-address.txt
ETH_NODE_URL=${ETH_NODE_URL:-http://ethereum-node:8545}

# Функция для проверки наличия директории контрактов
ensure_contract_dir() {
  echo "Проверка наличия директории для контрактов..."
  mkdir -p /usr/src/app/contracts
  echo "Директория контрактов готова."
}

# Функция для проверки доступности Ethereum ноды
check_ethereum_node() {
  echo "Проверка наличия curl..."
  if ! command -v curl &> /dev/null; then
    echo "curl не найден, устанавливаем..."
    apk add --no-cache curl
  fi

  echo "Проверка доступности Ethereum ноды..."
  # Отправляем запрос на получение номера блока, чтобы проверить доступность ноды
  RETRIES=10
  COUNTER=0
  while [ $COUNTER -lt $RETRIES ]; do
    if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' $ETH_NODE_URL > /dev/null; then
      echo "Ethereum нода доступна!"
      return 0
    else
      echo "Ethereum нода недоступна, попытка $((COUNTER+1))/$RETRIES, ожидание..."
      sleep 5
      COUNTER=$((COUNTER+1))
    fi
  done
  echo "Не удалось подключиться к Ethereum ноде после $RETRIES попыток."
  return 1
}

# Функция для проверки существования и валидности контракта
check_contract() {
  if [ -f "$CONTRACT_ADDRESS_FILE" ]; then
    CONTRACT_ADDRESS=$(cat $CONTRACT_ADDRESS_FILE)
    if [ -z "$CONTRACT_ADDRESS" ] || [ "${CONTRACT_ADDRESS:0:2}" != "0x" ]; then
      echo "Адрес контракта пустой или невалидный. Удаляю файл."
      rm -f "$CONTRACT_ADDRESS_FILE"
      return 1
    fi
    echo "Найден адрес контракта: $CONTRACT_ADDRESS"
    
    # Проверяем, существует ли контракт по этому адресу
    RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"$CONTRACT_ADDRESS\", \"latest\"],\"id\":1}" $ETH_NODE_URL)
    
    CODE=$(echo $RESPONSE | grep -o '"result":"0x[^"]*"' | cut -d ':' -f 2 | tr -d '"')
    
    if [ "$CODE" != "0x" ] && [ "$CODE" != "" ]; then
      echo "Контракт существует и валиден!"
      return 0
    else
      echo "Контракт по адресу $CONTRACT_ADDRESS не существует или недействителен."
      return 1
    fi
  else
    echo "Файл с адресом контракта не найден."
    return 1
  fi
}

# Функция для деплоя контракта
deploy_contract() {
  echo "Запуск деплоя контракта..."
  node /usr/src/app/scripts/deploy-contract.js
}

# Основной блок скрипта
echo "Начало инициализации контракта..."

# Проверяем наличие директории для контрактов
ensure_contract_dir

# Проверяем доступность Ethereum ноды
check_ethereum_node || {
  echo "Ошибка при подключении к Ethereum ноде, продолжаем запуск сервиса, но контракт не будет работать"
  exit 0
}

# Проверяем существующий контракт

# Если контракта нет или невалиден, ждем дополнительно и деплоим
if ! check_contract; then
  echo "Необходимо выполнить деплой контракта."
  echo "Ждем 10 секунд для полной инициализации ноды..."
  sleep 10
  deploy_contract || {
    echo "Ошибка при деплое контракта, продолжаем запуск сервиса, но контракт не будет работать"
    exit 0
  }
else
  echo "Используем существующий контракт."
fi

echo "Инициализация контракта завершена!"
