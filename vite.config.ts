import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          // Main app entry
          main: resolve(__dirname, 'index.html'),
          // Dedicated MSAL popup redirect page (no React)
          'auth-redirect': resolve(__dirname, 'auth-redirect.html'),
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})

