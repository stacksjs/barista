import { createPreferences } from '@stacksjs/desktop'

export interface BaristaPreferences extends Record<string, unknown> {
  autoLaunch: boolean
  caffeinateOnStartup: boolean
  caffeinateDurationMinutes: number
  isAutoCollapse: boolean
  autoCollapseDelay: number
  showInDock: boolean
  alwaysHiddenEnabled: boolean
  separatorHidden: boolean
  globalHotkey: string
}

export const prefs = createPreferences<BaristaPreferences>({
  name: 'barista',
  defaults: {
    autoLaunch: false,
    caffeinateOnStartup: false,
    caffeinateDurationMinutes: -1,
    isAutoCollapse: false,
    autoCollapseDelay: 10,
    showInDock: false,
    alwaysHiddenEnabled: false,
    separatorHidden: false,
    globalHotkey: 'Cmd+Shift+B',
  },
})
