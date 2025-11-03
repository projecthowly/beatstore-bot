FROM node:22-alpine

WORKDIR /app

# Устанавливаем FFmpeg для конвертации аудио
RUN apk add --no-cache ffmpeg

# Копируем package files серверной части
COPY server/package*.json ./

# Устанавливаем только production зависимости
RUN npm install --only=production

# Копируем уже скомпилированный серверный код
COPY server/dist ./dist

# Копируем собранные клиентские файлы
COPY client/dist /client/dist

# Создаем директорию для загрузок
RUN mkdir -p uploads

# Порт для приложения
EXPOSE 8080

# Запуск скомпилированного приложения
CMD ["npm", "start"]
