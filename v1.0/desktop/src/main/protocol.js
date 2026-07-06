import { net, protocol } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export function registerAppProtocol(webClientDistPath) {
  protocol.handle('app', async (request) => {
    const { pathname } = new URL(request.url)
    const relativePath = pathname === '/' ? '/index.html' : pathname
    const normalizedPath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '')
    const filePath = path.join(webClientDistPath, normalizedPath)

    if (!filePath.startsWith(webClientDistPath)) {
      return new Response('Forbidden', { status: 403 })
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const indexPath = path.join(webClientDistPath, 'index.html')
      return net.fetch(pathToFileURL(indexPath).toString())
    }

    return net.fetch(pathToFileURL(filePath).toString())
  })
}

export function registerPrivilegedScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ])
}
