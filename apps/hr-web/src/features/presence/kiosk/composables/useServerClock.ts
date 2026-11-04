import { ref } from 'vue'
import type { ClockAnchor } from '../types'

export function useServerClock() {
  const anchorId = ref<string | null>(null)
  const anchorServerTime = ref<number | null>(null)
  const anchorMonotonic = ref<number | null>(null)
  const maxOfflineWindowHours = ref(8)

  function setAnchor(anchor: ClockAnchor) {
    anchorId.value = anchor.anchorId
    anchorServerTime.value = new Date(anchor.serverTime).getTime()
    anchorMonotonic.value = performance.now()
    maxOfflineWindowHours.value = anchor.maxOfflineWindowHours
  }

  function deriveOccurredAt(): string | null {
    if (anchorServerTime.value === null || anchorMonotonic.value === null) {
      return null
    }

    const elapsed = performance.now() - anchorMonotonic.value
    return new Date(anchorServerTime.value + elapsed).toISOString()
  }

  function isAnchorStale(): boolean {
    if (anchorMonotonic.value === null) return true

    const elapsedHours = (performance.now() - anchorMonotonic.value) / 3_600_000
    return elapsedHours > maxOfflineWindowHours.value
  }

  return {
    anchorId,
    maxOfflineWindowHours,
    setAnchor,
    deriveOccurredAt,
    isAnchorStale,
  }
}
