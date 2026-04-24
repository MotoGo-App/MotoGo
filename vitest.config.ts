import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    // Esto es para que Vitest entienda tus alias como "@/components"
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})