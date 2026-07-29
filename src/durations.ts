/**
 * The durations Barista offers, in one place — the popup buttons, the tray
 * submenu and the preference validation all read from here, so adding a
 * duration is a one-line change.
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
  { minutes: 15, label: '15 minutes', short: '15m' },
  { minutes: 30, label: '30 minutes', short: '30m' },
  { minutes: 60, label: '1 hour', short: '1h' },
  { minutes: 240, label: '4 hours', short: '4h' },
  { minutes: 480, label: '8 hours', short: '8h' },
  { minutes: 720, label: '12 hours', short: '12h' },
  { minutes: -1, label: 'Indefinitely', short: '∞' },
]

/** Delays offered for auto-collapsing the menu bar, in seconds. */
export const COLLAPSE_DELAYS: number[] = [5, 10, 15, 30, 60]

export function isKnownDuration(minutes: number): boolean {
  return DURATIONS.some(duration => duration.minutes === minutes)
}
