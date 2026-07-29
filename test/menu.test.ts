import { describe, expect, it } from 'bun:test'
import { DURATIONS, isKnownDuration } from '../src/durations'
import { buildTrayMenu } from '../src/menu'

describe('durations', () => {
  it('offers indefinite as a real option', () => {
    expect(isKnownDuration(-1)).toBe(true)
    expect(isKnownDuration(60)).toBe(true)
    expect(isKnownDuration(7)).toBe(false)
  })
})

describe('tray menu', () => {
  const baseState = {
    caffeinated: false,
    menuBarCollapsed: false,
    isAutoCollapse: false,
    alwaysHiddenEnabled: false,
    durationMinutes: -1,
  }

  it('labels the toggle by the current caffeinate state', () => {
    expect(buildTrayMenu({ ...baseState, caffeinated: false })[0].label).toBe('Enable Caffeinate')
    expect(buildTrayMenu({ ...baseState, caffeinated: true })[0].label).toBe('Disable Caffeinate')
  })

  it('checks exactly the selected duration, and offers every one', () => {
    const submenu = buildTrayMenu({ ...baseState, durationMinutes: 60 })
      .find(item => item.type === 'submenu')?.submenu ?? []

    expect(submenu).toHaveLength(DURATIONS.length)
    expect(submenu.filter(item => item.checked)).toHaveLength(1)
    expect(submenu.find(item => item.checked)?.action).toBe('duration:60')
  })

  it('labels the menu bar toggle by the collapse state', () => {
    const collapsed = buildTrayMenu({ ...baseState, menuBarCollapsed: true })
    const expanded = buildTrayMenu({ ...baseState, menuBarCollapsed: false })
    expect(collapsed.find(item => item.action === 'toggleMenuBar')?.label).toBe('Show Menu Bar Items')
    expect(expanded.find(item => item.action === 'toggleMenuBar')?.label).toBe('Hide Menu Bar Items')
  })

  it('reflects the checkbox preferences', () => {
    const menu = buildTrayMenu({ ...baseState, isAutoCollapse: true, alwaysHiddenEnabled: true })
    expect(menu.find(item => item.action === 'toggleAutoCollapse')?.checked).toBe(true)
    expect(menu.find(item => item.action === 'toggleAlwaysHidden')?.checked).toBe(true)
  })
})
