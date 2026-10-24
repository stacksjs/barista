/** Native state mirrored into the popup and tray, never inferred from clicks. */
export interface MenuBarState {
  initialized: boolean
  collapsed: boolean
  backend?: string
  available?: boolean
  authorized?: boolean
  busy?: boolean
  hiddenAppCount?: number
  hiddenSystemItemCount?: number
  preserveSystemItems?: boolean
  markerWidth?: number
  error?: string | null
}

export function menuBarMessage(menuBar: MenuBarState): string {
  if (menuBar.available === false) return 'Icon hiding needs macOS 27 and the direct Barista build.'
  if (menuBar.authorized === false) return 'Enable Barista in System Settings → Privacy & Security → Device Control and Data Access.'
  if (menuBar.busy) return 'Reading your menu bar arrangement…'
  if (menuBar.error === 'layoutUnavailable') return 'Could not read the menu bar layout. Make Barista’s arrow visible, then try again.'
  if (menuBar.error === 'emptyGroup') return 'Your group is empty. Hold ⌘ and drag menu bar icons left of Barista’s arrow.'
  if (menuBar.error === 'visibilityMismatch') return 'macOS hid an app outside your group. All icons were restored.'
  if (menuBar.error) return 'Could not hide icons. Your icons remain visible; try again.'
  if (menuBar.collapsed) return 'Your group is hidden. Click the arrow to reveal it.'
  return 'Hold ⌘ and drag menu bar icons left of Barista’s arrow to hide them as a group.'
}
