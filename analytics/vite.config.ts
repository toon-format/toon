import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const config: ReturnType<typeof defineConfig> = defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
})

export default config
