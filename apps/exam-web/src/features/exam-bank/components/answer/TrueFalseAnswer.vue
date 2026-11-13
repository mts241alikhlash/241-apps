<script setup lang="ts">
import { computed } from 'vue'
import { RadioGroup, RadioGroupItem } from '@mts241alikhlash/ui/radio-group'
import type { AcceptableValue } from '@mts241alikhlash/ui/select'
import type { TrueFalseContent } from '../../types'

const content = defineModel<TrueFalseContent>({ required: true })

const value = computed(() => (content.value.answer.value ? 'true' : 'false'))

const options = [
  { value: 'true', label: 'Benar' },
  { value: 'false', label: 'Salah' },
] as const

function pick(next: AcceptableValue) {
  if (next !== 'true' && next !== 'false') return
  content.value = { answer: { value: next === 'true' } }
}
</script>

<template>
  <RadioGroup
    :model-value="value"
    aria-label="Kunci jawaban"
    class="grid grid-cols-2 gap-2"
    @update:model-value="pick"
  >
    <label
      v-for="option in options"
      :key="option.value"
      class="flex min-h-[var(--control-h,2.25rem)] cursor-pointer items-center gap-2 rounded-md border px-3 text-[length:var(--text-control,0.75rem)] font-medium has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/10 has-data-[state=checked]:text-primary"
    >
      <RadioGroupItem
        :value="option.value"
        :aria-label="`Kunci jawaban ${option.label}`"
      />
      {{ option.label }}
    </label>
  </RadioGroup>
</template>
