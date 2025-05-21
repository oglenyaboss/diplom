FROM node:16-alpine

# Установка зависимостей для сборки
RUN apk add --no-cache python3 make g++ curl

# Рабочая директория
WORKDIR /usr/src/app

# Копирование package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm ci

# Копирование файлов проекта
COPY . .

# Создание директории для логов и контрактов
RUN mkdir -p logs contracts

# Явно копируем скрипты и устанавливаем права
COPY scripts/* ./scripts/
RUN chmod +x scripts/*.js scripts/*.sh

# Проброс портов
EXPOSE 8080

# Создаем стартовый скрипт
RUN echo '#!/bin/sh' > /usr/src/app/entrypoint.sh && \
    echo 'echo "Запуск entrypoint скрипта..."' >> /usr/src/app/entrypoint.sh && \
    echo '' >> /usr/src/app/entrypoint.sh && \
    echo '# Проверка наличия директорий и файлов' >> /usr/src/app/entrypoint.sh && \
    echo 'mkdir -p /usr/src/app/contracts' >> /usr/src/app/entrypoint.sh && \
    echo 'mkdir -p /usr/src/app/logs' >> /usr/src/app/entrypoint.sh && \
    echo '' >> /usr/src/app/entrypoint.sh && \
    echo '# Установка прав на запуск скриптов' >> /usr/src/app/entrypoint.sh && \
    echo 'chmod +x /usr/src/app/scripts/*.js /usr/src/app/scripts/*.sh' >> /usr/src/app/entrypoint.sh && \
    echo '' >> /usr/src/app/entrypoint.sh && \
    echo '# Инициализация контракта' >> /usr/src/app/entrypoint.sh && \
    echo 'if [ -f "/usr/src/app/scripts/init-contract-updated.sh" ]; then' >> /usr/src/app/entrypoint.sh && \
    echo '  echo "Запуск обновленного скрипта инициализации контракта"' >> /usr/src/app/entrypoint.sh && \
    echo '  /usr/src/app/scripts/init-contract-updated.sh || echo "Ошибка в скрипте инициализации, но продолжаем запуск"' >> /usr/src/app/entrypoint.sh && \
    echo 'elif [ -f "/usr/src/app/scripts/init-contract.sh" ]; then' >> /usr/src/app/entrypoint.sh && \
    echo '  echo "Запуск стандартного скрипта инициализации контракта"' >> /usr/src/app/entrypoint.sh && \
    echo '  /usr/src/app/scripts/init-contract.sh || echo "Ошибка в скрипте инициализации, но продолжаем запуск"' >> /usr/src/app/entrypoint.sh && \
    echo 'else' >> /usr/src/app/entrypoint.sh && \
    echo '  echo "Скрипт инициализации контракта не найден! Контракт не будет инициализирован."' >> /usr/src/app/entrypoint.sh && \
    echo 'fi' >> /usr/src/app/entrypoint.sh && \
    echo '' >> /usr/src/app/entrypoint.sh && \
    echo '# Запуск сервера' >> /usr/src/app/entrypoint.sh && \
    echo 'echo "Запуск основного сервера..."' >> /usr/src/app/entrypoint.sh && \
    echo 'exec node server.js' >> /usr/src/app/entrypoint.sh && \
    chmod +x /usr/src/app/entrypoint.sh

# Скрипт запуска
CMD ["/usr/src/app/entrypoint.sh"]