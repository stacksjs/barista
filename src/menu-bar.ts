/** Native state mirrored into the popup and tray, never inferred from clicks. */
export interface MenuBarState {
  initialized: boolean
  collapsed: boolean
  backend?: string
  available?: boolean
  authorized?: boolean
  busy?: boolean
  hiddenAppCount?: number
  markerWidth?: number
  error?: string | null
}

export function menuBarMessage(menuBar: MenuBarState): string {
  if (menuBar.available === false) return 'Icon hiding needs macOS 27 and the direct Barista build.'
  if (menuBar.authorized === false) return 'Enable Barista in System Settings → Privacy & Security → Device Control and Data Access.'
  if (menuBar.busy) return 'Reading your menu bar arrangement…'
  if (menuBar.error) return 'Could not hide icons. Your icons remain visible; try again.'
  if (menuBar.collapsed) return 'Your group is hidden. Click the arrow to reveal it.'
  return 'Hold ⌘ and drag app icons left of Barista’s arrow to hide them as a group.'
}
