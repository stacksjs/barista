import {
  caffeinate,
  decaffeinate,
  formatDuration,
  formatRemainingTime,
  getCaffeinateStatus,
  isCaffeinated,
} from '@stacksjs/desktop'
import type { CaffeinateInstance } from '@stacksjs/desktop'
import { prefs } from './preferences'

let onChangeCallbacks: Array<() => void> = []

function notifyChange(): void {
  for (const cb of onChangeCallbacks) {
    try {
      cb()
    }
    catch {}
  }
}

export function enableCaffeinate(durationMinutes?: number): CaffeinateInstance {
  const duration = durationMinutes ?? prefs.get('caffeinateDurationMinutes')

  const instance = caffeinate({
    duration: duration > 0 ? duration : undefined,
    preventDisplaySleep: true,
    preventIdleSleep: true,
    preventSystemSleep: true,
    assertUserActivity: true,
  })

  // Save duration preference
  if (durationMinutes !== undefined) {
    prefs.set('caffeinateDurationMinutes', durationMinutes)
  }

  // Notify on expiration
  instance.onExpire(() => {
    notifyChange()
  })

  notifyChange()
  return instance
}

export function disableCaffeinate(): void {
  decaffeinate()
  notifyChange()
}

export function toggleCaffeinate(): boolean {
  if (isCaffeinated()) {
    disableCaffeinate()
    return false
  }

  enableCaffeinate()
  return true
}

export function getStatus(): {
  active: boolean
  durationMinutes: number | null
  remainingFormatted: string
  durationFormatted: string
  startedAt: Date | null
  endsAt: Date | null
} {
  const status = getCaffeinateStatus()

  return {
    active: status.active,
    durationMinutes: status.durationMinutes,
    remainingFormatted: formatRemainingTime(status.instance),
    durationFormatted: status.durationMinutes
      ? formatDuration(status.durationMinutes)
      : 'Off',
    startedAt: status.startedAt,
    endsAt: status.endsAt,
  }
}

export function onChange(callback: () => void): () => void {
  onChangeCallbacks.push(callback)
  return () => {
    onChangeCallbacks = onChangeCallbacks.filter(cb => cb !== callback)
  }
}

export { isCaffeinated, formatDuration, formatRemainingTime }
