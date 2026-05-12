import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5006',
        changeOrigin: true,
      },
      '/images': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      }
    }
  },
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable', 'sweetalert2', 'recharts', 'react-leaflet', 'leaflet', 'react-quill-new']
  }
})

