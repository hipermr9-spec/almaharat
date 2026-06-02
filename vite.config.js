import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['almaharat2.com', 'almaharat.ngrok.app', 'localhost'], // ✅ allow both the domain and localhost
    proxy: {
      '/api': {
        // access the localhost too
        target: 'http://localhost:5000', // ✅ point to local Flask
        target: 'https://api.almaharat2.com', // ✅ point to local Flask domain too
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://api.almaharat2.com', // ✅ for images too
        changeOrigin: true,
      }
    }
  }
})