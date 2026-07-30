import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DURATIONS, isKnownDuration } from '../src/durations'
import { DURATIONS as ALL_DURATIONS, QUICK_DURATIONS } from '../src/durations'
import { buildTrayMenu, parseCraftVersion, supportsTrayIcon, TRAY_GLYPHS, TRAY_ICONS, trayGlyph, trayIcon, trayStatusLabel, trayTooltip } from '../src/tray'
import { bundlePath } from '../src/updates'

const asleep = {
  caffeinated: false,
  remaining: '0:00',
  durationMinutes: -1,
  menuBarCollapsed: false,
  isAutoCollapse: false,
  alwaysHiddenEnabled: false,
}

const awakeForAnHour = { ...asleep, caffeinated: true, remaining: '0:59:12', durationMinutes: 60 }
const awakeIndefinitely = { ...asleep, caffeinated: true, remaining: '∞', durationMinutes: -1 }

describe('durations', () => {
  it('offers indefinite as a real option', () => {
    expect(isKnownDuration(-1)).toBe(true)
    expect(isKnownDuration(60)).toBe(true)
    expect(isKnownDuration(7)).toBe(false)
  })
})

describe('tray icon', () => {
  it('fills the cup only while the Mac is being kept awake', () => {
    expect(trayIcon(true)).toBe(TRAY_ICONS.awake)
    expect(trayIcon(false)).toBe(TRAY_ICONS.asleep)
  })

  it('ships its own mug artwork rather than a system symbol', () => {
    // The system set has no steaming mug, so these are files Craft templates.
    expect(TRAY_ICONS.asleep).toMatch(/tray-idle\.pdf$/)
    expect(TRAY_ICONS.awake).toMatch(/tray-brewing\.pdf$/)
  })
})

describe('tray tooltip and status', () => {
  it('spells out the remaining time only when a session is counting down', () => {
    expect(trayTooltip(awakeForAnHour)).toContain('0:59:12')
    expect(trayTooltip(awakeIndefinitely)).toContain('indefinitely')
    expect(trayTooltip(asleep)).toContain('can sleep')
    // The design language keeps em-dashes out of anything user-facing.
    expect(trayTooltip(awakeForAnHour)).not.toContain('—')
  })

  it('heads the menu with what Barista is doing', () => {
    expect(trayStatusLabel(asleep)).toBe('Barista is off')
    expect(trayStatusLabel(awakeForAnHour)).toBe('Awake for 0:59:12')
    expect(trayStatusLabel(awakeIndefinitely)).toBe('Awake indefinitely')
  })
})

describe('tray menu', () => {
  it('opens with a status line that cannot be clicked', () => {
    const [first] = buildTrayMenu(asleep)
    expect(first.label).toBe('Barista is off')
    expect(first.enabled).toBe(false)
    expect(first.action).toBeUndefined()
  })

  it('offers Turn Off only while awake', () => {
    expect(buildTrayMenu(asleep).some(i => i.action === 'disableCaffeinate')).toBe(false)
    expect(buildTrayMenu(awakeForAnHour).some(i => i.action === 'disableCaffeinate')).toBe(true)
  })

  it('puts the common durations one click away, not behind a submenu', () => {
    const menu = buildTrayMenu(asleep)
    for (const duration of QUICK_DURATIONS)
      expect(menu.some(i => i.action === `duration:${duration.minutes}`)).toBe(true)
  })

  it('says what a quick start will do before anything is running', () => {
    const menu = buildTrayMenu(asleep)
    expect(menu.find(i => i.action === 'duration:60')?.label).toBe('Keep awake for 1 hour')
    expect(menu.find(i => i.action === 'duration:-1')?.label).toBe('Keep awake indefinitely')
  })

  it('keeps the rest under More durations, with no duplicates', () => {
    const submenu = buildTrayMenu(asleep).find(i => i.type === 'submenu')?.submenu ?? []
    expect(submenu).toHaveLength(ALL_DURATIONS.length - QUICK_DURATIONS.length)
    const quick = new Set(QUICK_DURATIONS.map(d => `duration:${d.minutes}`))
    expect(submenu.some(i => quick.has(i.action ?? ''))).toBe(false)
  })

  it('checks the running duration exactly once across the whole menu', () => {
    const menu = buildTrayMenu(awakeForAnHour)
    const all = [...menu, ...(menu.find(i => i.type === 'submenu')?.submenu ?? [])]
    const checked = all.filter(i => i.checked)
    expect(checked).toHaveLength(1)
    expect(checked[0].action).toBe('duration:60')
  })

  it('checks no duration while asleep, since none is running', () => {
    const menu = buildTrayMenu(asleep)
    const all = [...menu, ...(menu.find(i => i.type === 'submenu')?.submenu ?? [])]
    expect(all.filter(i => i.checked)).toHaveLength(0)
  })

  it('labels the menu bar toggle by the collapse state', () => {
    expect(buildTrayMenu({ ...asleep, menuBarCollapsed: true }).find(i => i.action === 'toggleMenuBar')?.label)
      .toBe('Show Menu Bar Items')
    expect(buildTrayMenu(asleep).find(i => i.action === 'toggleMenuBar')?.label)
      .toBe('Hide Menu Bar Items')
  })

  it('carries the standard app items, including a way to update', () => {
    const actions = buildTrayMenu(asleep).map(i => i.action)
    expect(actions).toContain('preferences')
    expect(actions).toContain('about')
    expect(actions).toContain('checkForUpdates')
    expect(actions).toContain('quit')
  })

  it('reflects the checkbox preferences', () => {
    const menu = buildTrayMenu({ ...asleep, isAutoCollapse: true, alwaysHiddenEnabled: true })
    expect(menu.find(i => i.action === 'toggleAutoCollapse')?.checked).toBe(true)
    expect(menu.find(i => i.action === 'toggleAlwaysHidden')?.checked).toBe(true)
  })
})

describe('tray icon capability', () => {
  it('reads the version out of craft --version output', () => {
    expect(parseCraftVersion('craft version 0.0.55\nBuilt with Zig 0.17.0-dev')).toBe('0.0.55')
    expect(parseCraftVersion('nonsense')).toBeNull()
  })

  it('needs the release that made setIcon draw', () => {
    expect(supportsTrayIcon('0.0.55')).toBe(true)
    expect(supportsTrayIcon('0.0.56')).toBe(true)
    expect(supportsTrayIcon('0.1.0')).toBe(true)
    expect(supportsTrayIcon('0.0.54')).toBe(false)
    expect(supportsTrayIcon('0.0.37')).toBe(false)
  })

  it('treats a local development build as capable, since it is built from source', () => {
    expect(supportsTrayIcon('0.0.0')).toBe(true)
  })

  it('falls back when the version cannot be determined', () => {
    expect(supportsTrayIcon(null)).toBe(false)
  })

  it('offers a visible cup either way', () => {
    expect(trayIcon(true)).toBe(TRAY_ICONS.awake)
    expect(trayGlyph(true)).toBe(TRAY_GLYPHS.awake)
    expect(trayGlyph(false)).toBe(TRAY_GLYPHS.asleep)
    expect(trayGlyph(true)).not.toBe(trayGlyph(false))
  })
})

describe('update target', () => {
  it('finds the enclosing .app bundle for a packaged binary', () => {
    const dir = mkdtempSync(join(tmpdir(), 'barista-bundle-'))
    try {
      const bundle = join(dir, 'Barista.app')
      mkdirSync(join(bundle, 'Contents', 'MacOS'), { recursive: true })
      const binary = join(bundle, 'Contents', 'MacOS', 'Barista')
      writeFileSync(binary, '')

      expect(bundlePath(binary)).toBe(bundle)
    }
    finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('reports no bundle when running from source', () => {
    expect(bundlePath('/usr/local/bin/bun')).toBeNull()
  })

  it('reports no bundle when the path looks packaged but nothing is there', () => {
    // Better to say "not supported" than to hand the updater a bundle it
    // cannot replace.
    expect(bundlePath('/nope/Ghost.app/Contents/MacOS/Ghost')).toBeNull()
  })
})
