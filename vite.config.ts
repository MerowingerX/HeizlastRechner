/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import fs from 'node:fs/promises'
import path from 'node:path'
import { defineConfig, type Connect, type Plugin } from 'vite'

/**
 * Projektdateien im Ordner `projekte/` für die App bereitstellen.
 * Die Daten erfasst Claude Code (Skill heizlast-aufnahme) als JSON-Dateien;
 * die App listet, lädt und speichert sie über diese kleine Dev-API.
 *
 *   GET  /api/projekte          → ["haus-mueller.json", …]
 *   GET  /api/projekte/<datei>  → Dateiinhalt
 *   PUT  /api/projekte/<datei>  → Datei schreiben
 */
function projekteOrdner(): Plugin {
  const ordner = path.resolve(import.meta.dirname, 'projekte')
  const gueltig = (name: string) => /^[\w.-]+\.json$/.test(name)
  const api: Connect.NextHandleFunction = async (req, res) => {
    try {
      await fs.mkdir(ordner, { recursive: true })
      const name = decodeURIComponent((req.url ?? '/').replace(/^\//, '').split('?')[0])
      if (!name) {
        const dateien = (await fs.readdir(ordner)).filter(gueltig).sort()
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify(dateien))
      }
      if (!gueltig(name)) {
        res.statusCode = 400
        return res.end('Ungültiger Dateiname')
      }
      const datei = path.join(ordner, name)
      if (req.method === 'PUT') {
        let body = ''
        for await (const teil of req) body += teil
        JSON.parse(body) // nur gültiges JSON speichern
        await fs.writeFile(datei, body)
        return res.end('ok')
      }
      res.setHeader('Content-Type', 'application/json')
      res.end(await fs.readFile(datei, 'utf8'))
    } catch (e) {
      res.statusCode = 500
      res.end(String(e))
    }
  }
  return {
    name: 'projekte-ordner',
    configureServer(server) {
      server.watcher.add(ordner)
      server.watcher.on('change', (f) => {
        if (f.startsWith(ordner)) server.ws.send({ type: 'custom', event: 'projekt-geaendert', data: path.basename(f) })
      })
      server.middlewares.use('/api/projekte', api)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/projekte', api)
    },
  }
}

export default defineConfig({
  plugins: [react(), projekteOrdner()],
  build: { chunkSizeWarningLimit: 800 },
  test: { include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'] },
})
