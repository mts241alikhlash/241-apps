import { ref } from 'vue'
import type { PreviewFile } from '../types'

export function useFilePreview() {
  const open = ref(false)
  const file = ref<PreviewFile | null>(null)

  function show(next: PreviewFile) {
    file.value = next
    open.value = true
  }

  return { open, file, show }
}
