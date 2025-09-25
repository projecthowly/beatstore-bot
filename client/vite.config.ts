import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ВАЖНО: base = '/имя-репозитория/'
export default defineConfig({
  plugins: [react()],
  base: '/beatstore-bot/'
})
