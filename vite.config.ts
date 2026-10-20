import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: { host: "0.0.0.0", allowedHosts: [".e2b.app"], port: 3000 },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
