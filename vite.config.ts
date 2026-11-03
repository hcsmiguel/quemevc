import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor'
          }
          if (id.includes('@supabase')) {
            return 'supabase'
          }
          if (id.includes('lucide-react')) {
            return 'icons'
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
