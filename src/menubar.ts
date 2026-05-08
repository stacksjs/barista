let collapsed = false

export function isMenubarCollapsed(): boolean {
  return collapsed
}

export function setMenubarCollapsed(value: boolean): void {
  collapsed = value
}
