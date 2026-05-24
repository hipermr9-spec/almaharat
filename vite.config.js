import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['almaharat2.com'],
    proxy: {
      '/api': {
        target: 'https://api.almaharat2.com', // ✅ point to local Flask
        changeOrigin: true,
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      },
      '/uploads': {
        target: 'https://api.almaharat2.com', // ✅ for images too
        changeOrigin: true,
      }
    }
  }
})