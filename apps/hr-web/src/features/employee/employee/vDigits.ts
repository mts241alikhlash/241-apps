import type { Directive } from 'vue'

export const vDigits: Directive<HTMLInputElement> = {
  mounted(el) {
    el.addEventListener('beforeinput', (event) => {
      if (event.data && /\D/.test(event.data)) {
        event.preventDefault()
      }
    })
    el.addEventListener(
      'input',
      () => {
        const clean = el.value.replace(/\D/g, '')
        if (clean !== el.value) {
          el.value = clean
          el.dispatchEvent(new Event('input', { bubbles: true }))
        }
      },
      { capture: true },
    )
  },
}
