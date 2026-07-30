import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DURATIONS, isKnownDuration } from '../src/durations'
import { buildTrayMenu, TRAY_ICONS, trayIcon, trayStatusLabel, trayTooltip } from '../src/tray'
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

  it('uses SF Symbols, which Craft renders as tintable template images', () => {
    expect(TRAY_ICONS.asleep).toBe('cup.and.saucer')
    expect(TRAY_ICONS.awake).toBe('cup.and.saucer.fill')
  })
})

describe('tray tooltip and status', () => {
  it('spells out the remaining time only when a session is counting down', () => {
    expect(trayTooltip(awakeForAnHour)).toContain('0:59:12')
    expect(trayTooltip(awakeIndefinitely)).toContain('indefinitely')
    expect(trayTooltip(asleep)).toContain('can sleep')
  })

  it('heads the menu with what Barista is doing', () => {
    expect(trayStatusLabel(asleep)).toBe('Barista is off')
    expect(trayStatusLabel(awakeForAnHour)).toBe('Awake — 0:59:12 left')
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

  it('names the duration submenu for what it will do', () => {
    expect(buildTrayMenu(asleep).find(i => i.type === 'submenu')?.label).toBe('Activate for')
    expect(buildTrayMenu(awakeForAnHour).find(i => i.type === 'submenu')?.label).toBe('Change to')
  })

  it('offers every duration and checks the running one', () => {
    const submenu = buildTrayMenu(awakeForAnHour).find(i => i.type === 'submenu')?.submenu ?? []
    expect(submenu).toHaveLength(DURATIONS.length)
    expect(submenu.filter(i => i.checked)).toHaveLength(1)
    expect(submenu.find(i => i.checked)?.action).toBe('duration:60')
  })

  it('checks no duration while asleep, since none is running', () => {
    const submenu = buildTrayMenu(asleep).find(i => i.type === 'submenu')?.submenu ?? []
    expect(submenu.filter(i => i.checked)).toHaveLength(0)
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
