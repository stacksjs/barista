export interface MenuItem {
  label?: string
  type?: 'normal' | 'separator' | 'checkbox' | 'radio' | 'submenu'
  checked?: boolean
  enabled?: boolean
  icon?: string
  shortcut?: string
  action?: string
  submenu?: MenuItem[]
}

export interface AppState {
  caffeinated: boolean
  isAutoCollapse: boolean
  durationMinutes: number
}

export function buildBaristaMenu(state: AppState): MenuItem[] {
  return [
    {
      label: state.caffeinated ? 'Disable Caffeinate' : 'Enable Caffeinate',
      action: 'toggleCaffeinate',
      shortcut: 'Cmd+Shift+C',
    },
    {
      label: 'Duration',
      type: 'submenu',
      submenu: [
        { label: '15 minutes', action: 'duration:15', type: 'radio', checked: state.durationMinutes === 15 },
        { label: '30 minutes', action: 'duration:30', type: 'radio', checked: state.durationMinutes === 30 },
        { label: '45 minutes', action: 'duration:45', type: 'radio', checked: state.durationMinutes === 45 },
        { label: '1 hour', action: 'duration:60', type: 'radio', checked: state.durationMinutes === 60 },
        { label: '4 hours', action: 'duration:240', type: 'radio', checked: state.durationMinutes === 240 },
        { label: '8 hours', action: 'duration:480', type: 'radio', checked: state.durationMinutes === 480 },
        { label: '12 hours', action: 'duration:720', type: 'radio', checked: state.durationMinutes === 720 },
        { type: 'separator' },
        { label: 'Indefinitely', action: 'duration:-1', type: 'radio', checked: state.durationMinutes === -1 },
      ],
    },
    { type: 'separator' },
    {
      label: state.isAutoCollapse ? 'Disable Auto Collapse' : 'Enable Auto Collapse',
      action: 'toggleAutoCollapse',
    },
    { type: 'separator' },
    { label: 'Preferences...', action: 'preferences', shortcut: 'Cmd+,' },
    { label: 'About Barista', action: 'about' },
    { type: 'separator' },
    { label: 'Quit', action: 'quit', shortcut: 'Cmd+Q' },
  ]
}
