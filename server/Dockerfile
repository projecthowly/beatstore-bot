FROM node:22-alpine

WORKDIR /app

# Устанавливаем FFmpeg для конвертации аудио
RUN apk add --no-cache ffmpeg

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы
COPY . .

# Создаем директорию для загрузок
RUN mkdir -p uploads

# Создаем директорию для клиентских файлов (будет монтироваться volume)
RUN mkdir -p /client/dist

# Компилируем TypeScript
RUN npm run build

# Порт для приложения
EXPOSE 8080

# Запуск скомпилированного приложения
CMD ["npm", "start"]
