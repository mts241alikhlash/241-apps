<script setup lang="ts">
import { computed } from 'vue'
import { RadioGroup, RadioGroupItem } from '@mts241alikhlash/ui/radio-group'
import type { TrueFalseContent } from '../../types'

const content = defineModel<TrueFalseContent>({ required: true })

const value = computed(() => (content.value.answer.value ? 'true' : 'false'))

function pick(next: unknown) {
  content.value = { answer: { value: next === 'true' } }
}
</script>

<template>
  <div class="space-y-2">
    <p class="text-[length:var(--text-control,0.75rem)] text-muted-foreground">
      Pilih kunci jawaban.
    </p>
    <RadioGroup
      :model-value="value"
      class="gap-2"
      @update:model-value="pick"
    >
      <label class="flex items-center gap-2">
        <RadioGroupItem
          value="true"
          aria-label="Kunci jawaban Benar"
        />
        Benar
      </label>
      <label class="flex items-center gap-2">
        <RadioGroupItem
          value="false"
          aria-label="Kunci jawaban Salah"
        />
        Salah
      </label>
    </RadioGroup>
  </div>
</template>
