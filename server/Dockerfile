FROM node:22-alpine

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы
COPY . .

# Создаем директорию для загрузок
RUN mkdir -p uploads

# Порт для приложения
EXPOSE 8080

# Запуск приложения через tsx
CMD ["npx", "tsx", "src/index.ts"]
