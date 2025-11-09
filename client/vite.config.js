import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 9000,
    open: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:4004',
        changeOrigin: true,
        secure: false
      },
      '/deepRemember': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:4004',
        changeOrigin: true,
        secure: false
      },
      '/upload-files': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:4004',
        changeOrigin: true,
        secure: false
      },
      '/files-list': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:4004',
        changeOrigin: true,
        secure: false
      },
      '/files': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:4004',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
