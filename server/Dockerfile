FROM node:22-alpine

WORKDIR /app

# Устанавливаем FFmpeg для конвертации аудио
RUN apk add --no-cache ffmpeg

# Копируем package files серверной части
COPY server/package*.json ./

# Устанавливаем зависимости (включая devDependencies для компиляции)
RUN npm install

# Копируем серверные исходники
COPY server/src ./src
COPY server/tsconfig.json ./tsconfig.json

# Создаем директорию для загрузок
RUN mkdir -p uploads

# Компилируем TypeScript
RUN npm run build

# Копируем собранные клиентские файлы
COPY client/dist /client/dist

# Порт для приложения
EXPOSE 8080

# Запуск скомпилированного приложения
CMD ["npm", "start"]
