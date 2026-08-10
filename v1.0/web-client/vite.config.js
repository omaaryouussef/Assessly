import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Default `/` for Vercel/web. Desktop builds override with `--base ./`.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
