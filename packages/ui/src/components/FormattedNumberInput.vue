<script setup lang="ts">
import { computed, ref } from 'vue'
import { Input } from '@mts241alikhlash/ui/input'

const props = withDefaults(
  defineProps<{
    prefix?: string
    suffix?: string
    thousands?: boolean
    numeric?: boolean
    maxDigits?: number
    disabled?: boolean
  }>(),
  { prefix: '', suffix: '', thousands: false, numeric: false },
)

const model = defineModel<string | number | null>()

const focused = ref(false)

const digits = computed(() => {
  const text = String(model.value ?? '').replace(/\D/g, '')
  return props.numeric && Number(text) === 0 ? '' : text
})

const grouper = new Intl.NumberFormat('id-ID', { useGrouping: true })

function body(value: string) {
  if (!value) return ''
  return props.thousands ? grouper.format(Number(value)) : value
}

const display = computed(() => {
  if (!digits.value) return ''
  if (focused.value) return body(digits.value)
  return `${props.prefix}${body(digits.value)}${props.suffix}`
})

function commit(el: HTMLInputElement, raw: string) {
  const clean = props.maxDigits ? raw.slice(0, props.maxDigits) : raw
  model.value = props.numeric ? (clean ? Number(clean) : 0) : clean
  el.value = body(clean)
}

function onKeydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (event.key.length === 1 && !/\d/.test(event.key)) event.preventDefault()
}

function onPaste(event: ClipboardEvent) {
  event.preventDefault()
  const el = event.target as HTMLInputElement
  const start = el.selectionStart ?? 0
  const end = el.selectionEnd ?? 0
  const pasted = event.clipboardData?.getData('text') ?? ''
  commit(
    el,
    (el.value.slice(0, start) + pasted + el.value.slice(end)).replace(/\D/g, ''),
  )
}

function onInput(event: Event) {
  const el = event.target as HTMLInputElement
  commit(el, el.value.replace(/\D/g, ''))
}
</script>

<template>
  <Input
    :model-value="display"
    inputmode="numeric"
    :disabled="props.disabled"
    @focus="focused = true"
    @blur="focused = false"
    @keydown="onKeydown"
    @paste="onPaste"
    @input="onInput"
  />
</template>
