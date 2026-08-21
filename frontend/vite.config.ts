import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      'localhost',
      '192.168.1.42',
      'specifically-prices-classic-competitions.trycloudflare.com',
      '.trycloudflare.com',
    ],
  },
})