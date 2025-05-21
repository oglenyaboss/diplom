#!/bin/bash

# Переходим в директорию фронтенда
cd "$(dirname "$0")/mvp/frontend"

# Проверяем наличие node_modules
if [ ! -d "node_modules" ]; then
  echo "Node modules не найдены. Устанавливаем зависимости..."
  npm install
fi

# Запускаем фронтенд в режиме разработки
echo "Запускаем фронтенд на порту 3000..."
npm run start:dev
