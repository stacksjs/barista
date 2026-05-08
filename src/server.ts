import { resolve } from 'node:path'
import { renderTemplate } from '@stacksjs/stx'
import pkg from '../package.json' with { type: 'json' }
import { enableCaffeinate, disableCaffeinate, toggleCaffeinate, getStatus, isCaffeinated } from './caffeinate'
import { prefs } from './preferences'
import { buildBaristaMenu } from './menu'
import { isMenubarCollapsed, setMenubarCollapsed } from './menubar'

export interface ServerOptions {
  port?: number
}

export function startServer(options: ServerOptions = {}) {
  const templatePath = resolve(import.meta.dir, 'barista.stx')

  const server = Bun.serve({
    port: options.port || 0,
    hostname: '127.0.0.1',

    async fetch(req) {
      const url = new URL(req.url)

      // CORS headers for local requests
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }

      if (req.method === 'OPTIONS') {
        return new Response(null, { headers })
      }

      // Serve the rendered template
      if (url.pathname === '/' || url.pathname === '/index.html') {
        try {
          const status = getStatus()
          const html = await renderTemplate(templatePath, {
            context: {
              caffeinated: status.active,
              remainingTime: status.remainingFormatted,
              durationFormatted: status.durationFormatted,
              durationMinutes: prefs.get('caffeinateDurationMinutes'),
              isAutoCollapse: prefs.get('isAutoCollapse'),
              autoCollapseDelay: prefs.get('autoCollapseDelay'),
              autoLaunch: prefs.get('autoLaunch'),
              caffeinateOnStartup: prefs.get('caffeinateOnStartup'),
              alwaysHiddenEnabled: prefs.get('alwaysHiddenEnabled'),
              separatorHidden: prefs.get('separatorHidden'),
              globalHotkey: prefs.get('globalHotkey'),
              version: pkg.version,
            },
            wrapInDocument: true,
            title: 'Barista',
          })
          return new Response(html, {
            headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
          })
        }
        catch (err) {
          console.error('Template render error:', err)
          return new Response(`<h1>Render Error</h1><pre>${err}</pre>`, {
            status: 500,
            headers: { ...headers, 'Content-Type': 'text/html' },
          })
        }
      }

      // API: Get caffeinate status
      if (url.pathname === '/api/status' && req.method === 'GET') {
        const status = getStatus()
        return Response.json({
          ...status,
          durationMinutes: status.durationMinutes ?? prefs.get('caffeinateDurationMinutes'),
          isAutoCollapse: prefs.get('isAutoCollapse'),
          autoCollapseDelay: prefs.get('autoCollapseDelay'),
          autoLaunch: prefs.get('autoLaunch'),
          caffeinateOnStartup: prefs.get('caffeinateOnStartup'),
          alwaysHiddenEnabled: prefs.get('alwaysHiddenEnabled'),
          separatorHidden: prefs.get('separatorHidden'),
          globalHotkey: prefs.get('globalHotkey'),
        }, { headers })
      }

      // API: Toggle caffeinate
      if (url.pathname === '/api/caffeinate/toggle' && req.method === 'POST') {
        const nowActive = toggleCaffeinate()
        return Response.json({ ...getStatus(), active: nowActive }, { headers })
      }

      // API: Enable caffeinate with specific duration
      if (url.pathname === '/api/caffeinate/enable' && req.method === 'POST') {
        const body = await req.json() as { duration?: number }
        enableCaffeinate(body.duration)
        return Response.json(getStatus(), { headers })
      }

      // API: Disable caffeinate
      if (url.pathname === '/api/caffeinate/disable' && req.method === 'POST') {
        disableCaffeinate()
        return Response.json(getStatus(), { headers })
      }

      // API: Set duration and enable
      if (url.pathname === '/api/caffeinate/duration' && req.method === 'POST') {
        const body = await req.json() as { minutes: number }
        enableCaffeinate(body.minutes)
        return Response.json(getStatus(), { headers })
      }

      // API: Get preferences
      if (url.pathname === '/api/preferences' && req.method === 'GET') {
        return Response.json(prefs.getAll(), { headers })
      }

      // API: Update preferences
      if (url.pathname === '/api/preferences' && req.method === 'POST') {
        const body = await req.json() as Record<string, unknown>
        for (const [key, value] of Object.entries(body)) {
          if (key in prefs.getAll()) {
            prefs.set(key as any, value as any)
          }
        }
        return Response.json(prefs.getAll(), { headers })
      }

      // API: Get tray menu
      if (url.pathname === '/api/menu' && req.method === 'GET') {
        const menu = buildBaristaMenu({
          caffeinated: isCaffeinated(),
          isAutoCollapse: prefs.get('isAutoCollapse'),
          isMenubarCollapsed: isMenubarCollapsed(),
          durationMinutes: prefs.get('caffeinateDurationMinutes'),
          alwaysHiddenEnabled: prefs.get('alwaysHiddenEnabled'),
        })
        return Response.json(menu, { headers })
      }

      // API: Update menubar collapsed state (called by webview on craft:menubar:stateChange)
      if (url.pathname === '/api/menubar/state' && req.method === 'POST') {
        const body = await req.json() as { collapsed?: boolean }
        if (typeof body.collapsed === 'boolean') {
          setMenubarCollapsed(body.collapsed)
        }
        return Response.json({ collapsed: isMenubarCollapsed() }, { headers })
      }

      return new Response('Not Found', { status: 404, headers })
    },
  })

  console.log(`Barista server running on http://127.0.0.1:${server.port}`)
  return server
}
