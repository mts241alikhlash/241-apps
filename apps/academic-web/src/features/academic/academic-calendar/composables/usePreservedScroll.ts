import { nextTick, watch, type Ref } from 'vue'

function scrollableAncestor(from: HTMLElement | null): HTMLElement | null {
  let node = from?.parentElement ?? null
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight
    ) {
      return node
    }
    node = node.parentElement
  }
  return null
}

export function usePreservedScroll(
  isOpen: Ref<boolean>,
  anchor: Ref<HTMLElement | null>,
) {
  let container: HTMLElement | null = null
  let offset = 0

  watch(isOpen, async (open) => {
    if (open) {
      container = scrollableAncestor(anchor.value)
      offset = container?.scrollTop ?? 0
      return
    }

    if (!container) return

    await nextTick()
    requestAnimationFrame(() => {
      if (container) container.scrollTop = offset
    })
  })
}
