<script setup lang="ts">
import { Button } from '@mts241alikhlash/ui/button'
import QuestionNumberGrid from './QuestionNumberGrid.vue'
import type { AnswerPayload, PaperQuestion } from '../types'

defineProps<{
  questions: PaperQuestion[]
  answers: Map<string, AnswerPayload>
  doubtful: Set<string>
  currentIndex: number
  remainingLabel: string
  syncLabel: string
  submitLabel: string
  submitDisabled: boolean
}>()

const emit = defineEmits<{
  go: [position: number]
  submit: []
}>()
</script>

<template>
  <aside
    data-testid="question-nav-panel"
    aria-label="Nomor soal"
    class="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-card p-4"
  >
    <dl
      class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-[length:var(--text-control)]"
    >
      <dt class="text-muted-foreground">Sisa waktu</dt>
      <dd class="font-semibold tabular-nums">{{ remainingLabel }}</dd>
      <dt class="text-muted-foreground">Sinkron</dt>
      <dd class="font-medium">{{ syncLabel }}</dd>
    </dl>

    <QuestionNumberGrid
      :questions="questions"
      :answers="answers"
      :doubtful="doubtful"
      :current-index="currentIndex"
      @go="emit('go', $event)"
    />

    <Button
      class="min-h-11 w-full bg-green-700 font-semibold text-white hover:bg-green-800"
      :disabled="submitDisabled"
      @click="emit('submit')"
    >
      {{ submitLabel }}
    </Button>
  </aside>
</template>
