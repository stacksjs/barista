/**
 * The durations Barista offers, in one place. The popup buttons, the tray menu
 * and the preference validation all read from here, so adding a duration is a
 * one-line change.
 */
export interface Duration {
  /** Minutes to stay awake. `-1` means indefinitely. */
  minutes: number
  /** Full label, used in the tray menu */
  label: string
  /** Compact label, used on the popup's duration buttons */
  short: string
}

export const DURATIONS: Duration[] = [
  { minutes: 5, label: '5 minutes', short: '5m' },
  { minutes: 15, label: '15 minutes', short: '15m' },
  { minutes: 30, label: '30 minutes', short: '30m' },
  { minutes: 60, label: '1 hour', short: '1h' },
  { minutes: 120, label: '2 hours', short: '2h' },
  { minutes: 240, label: '4 hours', short: '4h' },
  { minutes: 480, label: '8 hours', short: '8h' },
  { minutes: -1, label: 'Indefinitely', short: '∞' },
]

/**
 * The handful worth putting one click away in the tray menu. The rest stay in
 * the popup, so the menu reads as a shortcut rather than a full settings list.
 */
export const QUICK_DURATIONS: Duration[] = DURATIONS.filter(duration =>
  [15, 60, 240, -1].includes(duration.minutes),
)

/** Delays offered for auto-collapsing the menu bar, in seconds. */
export const COLLAPSE_DELAYS: number[] = [5, 10, 15, 30, 60]

export function isKnownDuration(minutes: number): boolean {
  return DURATIONS.some(duration => duration.minutes === minutes)
}
