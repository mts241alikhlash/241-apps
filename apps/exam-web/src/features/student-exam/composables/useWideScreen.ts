import { onScopeDispose, ref } from 'vue'

const WIDE_QUERY = '(min-width: 768px)'

export function useWideScreen() {
  const media =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(WIDE_QUERY)
      : null
  const wide = ref(media?.matches ?? false)
  const onChange = (event: MediaQueryListEvent) => {
    wide.value = event.matches
  }
  media?.addEventListener('change', onChange)
  onScopeDispose(() => media?.removeEventListener('change', onChange))
  return wide
}
