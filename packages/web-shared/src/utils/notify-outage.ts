import { toast } from 'vue-sonner'
import {
  isServiceUnavailable,
  serviceUnavailableMessage,
} from './service-error'

const recentlyReported = new Map<string, number>()
const DEDUPE_WINDOW_MS = 5000

export function notifyIfOutage(err: unknown): boolean {
  if (!isServiceUnavailable(err)) return false

  const message = serviceUnavailableMessage(err)
  const now = Date.now()
  const last = recentlyReported.get(message)

  if (last === undefined || now - last > DEDUPE_WINDOW_MS) {
    recentlyReported.set(message, now)
    toast.error('Layanan sedang tidak tersedia', {
      description: message,
      duration: 6000,
    })
  }

  return true
}

export function resetOutageNotifications(): void {
  recentlyReported.clear()
}
