import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const desktopEnv = path.join(__dirname, '../.env.desktop')
const webClientEnv = path.join(__dirname, '../../web-client/.env.desktop')

if (fs.existsSync(desktopEnv)) {
  fs.copyFileSync(desktopEnv, webClientEnv)
  console.log('Synced desktop/.env.desktop → web-client/.env.desktop')
} else if (!fs.existsSync(webClientEnv)) {
  console.error(
    'Missing API URL for desktop build. Create v1.0/desktop/.env.desktop or v1.0/web-client/.env.desktop with VITE_API_BASE_URL=https://your-app.up.railway.app',
  )
  process.exit(1)
}
