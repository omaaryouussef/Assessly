import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const CONFIG_FILE = 'assessly-config.json'

function getConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE)
}

function readConfigFile() {
  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) {
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch {
    return null
  }
}

function writeConfigFile(config) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf8')
}

function encryptValue(value) {
  if (safeStorage.isEncryptionAvailable()) {
    return {
      encrypted: true,
      value: safeStorage.encryptString(value).toString('base64'),
    }
  }

  return {
    encrypted: false,
    value,
  }
}

function decryptValue(stored) {
  if (!stored) {
    return ''
  }

  if (stored.encrypted) {
    if (!safeStorage.isEncryptionAvailable()) {
      return ''
    }

    return safeStorage.decryptString(Buffer.from(stored.value, 'base64'))
  }

  return stored.value || ''
}

export function getApiBaseUrl() {
  const config = readConfigFile()
  if (!config?.apiBaseUrl) {
    return ''
  }

  return decryptValue(config.apiBaseUrl).replace(/\/$/, '')
}

export function setApiBaseUrl(url) {
  const trimmed = String(url || '').trim().replace(/\/$/, '')

  if (!trimmed) {
    throw new Error('API base URL is required')
  }

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('API base URL must be a valid URL')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('API base URL must use http or https')
  }

  writeConfigFile({
    apiBaseUrl: encryptValue(trimmed),
    updatedAt: new Date().toISOString(),
  })

  return trimmed
}
