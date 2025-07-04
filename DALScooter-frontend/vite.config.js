import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Serve a blank response for favicon to avoid 404
    fs: {
      allow: ['.'],
    },
  },
})