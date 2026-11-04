import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useInView(threshold = 0.3) {
  const element = ref<HTMLElement | null>(null)
  const visible = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (typeof IntersectionObserver === 'undefined' || !element.value) {
      visible.value = true
      return
    }
    observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        visible.value = true
        observer?.disconnect()
      },
      { threshold },
    )
    observer.observe(element.value)
  })

  onBeforeUnmount(() => observer?.disconnect())

  function target(node: unknown) {
    element.value = node instanceof HTMLElement ? node : null
  }

  return { target, visible }
}
