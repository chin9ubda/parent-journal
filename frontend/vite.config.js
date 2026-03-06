import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// server 블록은 npm run dev 전용 — npm run build(Docker)에 영향 없음
const DEV_BACKEND_PORT = process.env.DEV_BACKEND_PORT || 8001

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': `http://localhost:${DEV_BACKEND_PORT}`,
      '/uploads': `http://localhost:${DEV_BACKEND_PORT}`,
    },
  },
})
