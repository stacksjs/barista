/**
 * Keeping the Mac awake.
 *
 * A thin, named layer over the desktop power API so the rest of the app talks
 * about caffeinating rather than about `caffeinate(1)` flags.
 */
import type { CaffeinateInstance } from '@stacksjs/stx/desktop'
import {
  caffeinate,
  decaffeinate,
  formatDuration,
  formatRemainingTime,
  getCaffeinateStatus,
  isCaffeinated,
} from '@stacksjs/stx/desktop'

/** A snapshot of the caffeinate state, ready to render or serialize. */
export interface CaffeinateSnapshot {
  active: boolean
  /** Minutes the current session runs for. `null` means indefinitely. */
  durationMinutes: number | null
  /** Countdown to wake, e.g. "1:23:45" */
  remainingFormatted: string
  /** Human-readable duration, e.g. "4 hours" */
  durationFormatted: string
  endsAt: Date | null
}

/**
 * Stay awake for `durationMinutes`, or indefinitely when it is `-1`.
 *
 * Display, idle and system sleep are all held off — a Mac that dims its screen
 * mid-presentation has not really stayed awake.
 */
export function enableCaffeinate(durationMinutes: number): CaffeinateInstance {
  return caffeinate({
    duration: durationMinutes > 0 ? durationMinutes : undefined,
    preventDisplaySleep: true,
    preventIdleSleep: true,
    preventSystemSleep: true,
    assertUserActivity: true,
  })
}

export function disableCaffeinate(): void {
  decaffeinate()
}

/** Flip the current state, and report what it became. */
export function toggleCaffeinate(durationMinutes: number): boolean {
  if (isCaffeinated()) {
    disableCaffeinate()
    return false
  }

  enableCaffeinate(durationMinutes)
  return true
}

export function caffeinateSnapshot(): CaffeinateSnapshot {
  const status = getCaffeinateStatus()

  return {
    active: status.active,
    durationMinutes: status.durationMinutes,
    remainingFormatted: formatRemainingTime(status.instance),
    durationFormatted: status.durationMinutes ? formatDuration(status.durationMinutes) : 'Off',
    endsAt: status.endsAt,
  }
}

export { isCaffeinated }
