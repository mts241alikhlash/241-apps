import type { Directive } from 'vue'

const NOT_DIGIT = /\D/g
const NOT_PHONE = /[^\d+\s-]/g

function pattern(phone: boolean) {
  return phone ? NOT_PHONE : NOT_DIGIT
}

export const vDigits: Directive<HTMLInputElement> = {
  mounted(el, binding) {
    const invalid = pattern(Boolean(binding.modifiers.phone))
    el.addEventListener('beforeinput', (event) => {
      if (event.data && event.data.replace(invalid, '') !== event.data) {
        event.preventDefault()
        const kept = event.data.replace(invalid, '')
        if (event.inputType === 'insertFromPaste' && kept) {
          el.setRangeText(
            kept,
            el.selectionStart ?? el.value.length,
            el.selectionEnd ?? el.value.length,
            'end',
          )
          el.dispatchEvent(new Event('input', { bubbles: true }))
        }
      }
    })
    el.addEventListener(
      'input',
      () => {
        const clean = el.value.replace(invalid, '')
        if (clean !== el.value) el.value = clean
      },
      { capture: true },
    )
  },
}
