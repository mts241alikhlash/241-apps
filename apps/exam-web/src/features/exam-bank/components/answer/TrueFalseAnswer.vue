<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import type { TrueFalseContent } from '../../types'

const content = defineModel<TrueFalseContent>({ required: true })

const value = computed(() => (content.value.answer.value ? 'true' : 'false'))

function pick(next: 'true' | 'false') {
  content.value = { answer: { value: next === 'true' } }
}
</script>

<template>
  <div
    class="grid grid-cols-2 gap-2"
    role="radiogroup"
    aria-label="Kunci jawaban"
  >
    <Button
      type="button"
      role="radio"
      class="h-10"
      :variant="value === 'true' ? 'default' : 'outline'"
      :aria-checked="value === 'true'"
      @click="pick('true')"
    >
      Benar
    </Button>
    <Button
      type="button"
      role="radio"
      class="h-10"
      :variant="value === 'false' ? 'default' : 'outline'"
      :aria-checked="value === 'false'"
      @click="pick('false')"
    >
      Salah
    </Button>
  </div>
</template>
