import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:4004'
  
  return {
    plugins: [react()],
    server: {
      port: 9000,
      open: true,
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false
        },
      '/deepRemember': {
        target: apiBaseUrl,
        changeOrigin: true,
        secure: false
      },
      '/upload-files': {
        target: apiBaseUrl,
        changeOrigin: true,
        secure: false
      },
      '/files-list': {
        target: apiBaseUrl,
        changeOrigin: true,
        secure: false
      },
      '/files': {
        target: apiBaseUrl,
        changeOrigin: true,
        secure: false
      },
      '/voice': {
        target: apiBaseUrl,
        changeOrigin: true,
        secure: false
      }
    }
  }
  }
})
