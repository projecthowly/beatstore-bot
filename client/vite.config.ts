import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ОБЯЗАТЕЛЬНО: base = '/beatstore-bot/'
export default defineConfig({
  plugins: [react()],
  base: '/beatstore-bot/'
})
