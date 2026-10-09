import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { defineConfig } from 'vite'
import { institutionApi } from './server/apiPlugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), institutionApi()],
  css: {
    postcss: {
      plugins: [],
    },
  },
  server: {
    watch: {
      ignored: ['**/data/**'],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
