<script setup lang="ts">
import { computed } from 'vue'
import { Input } from '@mts241alikhlash/ui/input'
import { formatThousands } from '../utils'

const props = defineProps<{
  disabled?: boolean
}>()

const model = defineModel<number>({ required: true })

const display = computed(() => formatThousands(model.value))

function commit(el: HTMLInputElement, digits: string) {
  model.value = digits ? Number(digits) : 0
  el.value = formatThousands(digits)
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
  const digits = (
    el.value.slice(0, start) +
    pasted +
    el.value.slice(end)
  ).replace(/\D/g, '')
  commit(el, digits)
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
    @keydown="onKeydown"
    @paste="onPaste"
    @input="onInput"
  />
</template>
