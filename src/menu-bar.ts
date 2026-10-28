/** Native state mirrored into the popup and tray, never inferred from clicks. */
export interface MenuBarState {
  initialized: boolean
  collapsed: boolean
  backend?: string
  busy?: boolean
}

export function menuBarMessage(menuBar: MenuBarState): string {
  if (menuBar.busy) return 'Applying your menu bar group…'
  if (!menuBar.initialized) return 'Preparing your menu bar control…'
  if (menuBar.collapsed) return 'Your group is hidden. Click < to reveal it.'
  return 'Hold ⌘ and drag menu bar icons left of > to hide them as a group.'
}
