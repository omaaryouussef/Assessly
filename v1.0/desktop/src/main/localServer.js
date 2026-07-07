import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app } from 'electron'
import EmbeddedPostgres from 'embedded-postgres'
import fs from 'node:fs'
import pg from 'pg'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_PORT = 3011
const DB_PORT = 5433

let postgresInstance = null
let serverProcess = null
let status = {
  running: false,
  databaseReady: false,
  serverReady: false,
  port: DEFAULT_PORT,
  error: null,
}

function getDataDir() {
  return path.join(app.getPath('userData'), 'local-server')
}

function getServerDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'server')
  }
  return path.resolve(__dirname, '../../../../server')
}

async function applySchemaIfNeeded() {
  const dataDir = getDataDir()
  const marker = path.join(dataDir, '.db-initialized')
  if (fs.existsSync(marker)) {
    return
  }

  const client = new Client({
    user: 'assessly',
    password: 'assessly',
    host: '127.0.0.1',
    port: DB_PORT,
    database: 'postgres',
  })

  await client.connect()

  const schemaPath = path.join(getServerDir(), 'db', 'schema.sql')
  const migrationPath = path.join(
    getServerDir(),
    'db',
    'migrations',
    '001_desktop_proctoring.sql',
  )

  await client.query(fs.readFileSync(schemaPath, 'utf8'))
  if (fs.existsSync(migrationPath)) {
    await client.query(fs.readFileSync(migrationPath, 'utf8'))
  }

  await client.end()
  fs.writeFileSync(marker, new Date().toISOString(), 'utf8')
}

async function startDatabase() {
  const dataDir = getDataDir()
  fs.mkdirSync(dataDir, { recursive: true })

  postgresInstance = new EmbeddedPostgres({
    databaseDir: path.join(dataDir, 'postgres'),
    user: 'assessly',
    password: 'assessly',
    port: DB_PORT,
    persistent: true,
  })

  await postgresInstance.initialise()
  await postgresInstance.start()
  await applySchemaIfNeeded()
  status.databaseReady = true
}

function waitForServerReady(port, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()

    const check = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/`)
        if (response.ok) {
          resolve()
          return
        }
      } catch {
        // retry
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error('Local Assessly server did not start in time'))
        return
      }

      setTimeout(check, 500)
    }

    check()
  })
}

export async function startLocalServer() {
  if (status.running) {
    return getLocalServerStatus()
  }

  status = {
    running: false,
    databaseReady: false,
    serverReady: false,
    port: DEFAULT_PORT,
    error: null,
  }

  try {
    await startDatabase()

    const serverDir = getServerDir()
    const env = {
      ...process.env,
      PORT: String(DEFAULT_PORT),
      DB_USER: 'assessly',
      DB_HOST: '127.0.0.1',
      DB_DATABASE: 'postgres',
      DB_PASSWORD: 'assessly',
      DB_PORT: String(DB_PORT),
      JWT_SECRET: process.env.JWT_SECRET || 'assessly-local-dev-secret',
      CORS_ORIGINS: 'http://localhost:5173,app://assessly',
    }

    serverProcess = spawn('node', ['src/index.js'], {
      cwd: serverDir,
      env,
      stdio: 'pipe',
      windowsHide: true,
    })

    serverProcess.stdout?.on('data', (chunk) => {
      console.log(`[local-server] ${chunk.toString()}`)
    })
    serverProcess.stderr?.on('data', (chunk) => {
      console.error(`[local-server] ${chunk.toString()}`)
    })
    serverProcess.on('exit', (code) => {
      status.running = false
      status.serverReady = false
      status.error = `Local server exited with code ${code}`
    })

    await waitForServerReady(DEFAULT_PORT)
    status.running = true
    status.serverReady = true
    return getLocalServerStatus()
  } catch (error) {
    status.error = error.message
    await stopLocalServer()
    throw error
  }
}

export async function stopLocalServer() {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }

  if (postgresInstance) {
    try {
      await postgresInstance.stop()
    } catch {
      // ignore stop errors
    }
    postgresInstance = null
  }

  status = {
    running: false,
    databaseReady: false,
    serverReady: false,
    port: DEFAULT_PORT,
    error: null,
  }
}

export function getLocalServerStatus() {
  return { ...status, url: `http://localhost:${DEFAULT_PORT}` }
}
