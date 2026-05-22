import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['almaharat.ngrok.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // ✅ point to local Flask
        changeOrigin: true,
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      },
      '/uploads': {
        target: 'http://localhost:5000', // ✅ for images too
        changeOrigin: true,
      }
    }
  }
})