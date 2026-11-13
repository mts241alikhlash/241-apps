<script setup lang="ts">
import { isAnswered } from '../logic/exam'
import type { AnswerPayload, PaperQuestion } from '../types'

const props = defineProps<{
  questions: PaperQuestion[]
  answers: Map<string, AnswerPayload>
  doubtful: Set<string>
  currentIndex: number
}>()

const emit = defineEmits<{
  go: [position: number]
}>()

function toneOf(position: number): string {
  const question = props.questions[position]
  if (!question) return 'border-input bg-card text-muted-foreground'
  if (position === props.currentIndex) {
    return 'border-primary bg-primary text-primary-foreground font-bold'
  }
  if (props.doubtful.has(question.id)) {
    return 'border-amber-600 bg-amber-100 text-amber-900 font-medium'
  }
  if (isAnswered(question, props.answers.get(question.id))) {
    return 'border-green-600 bg-green-100 text-green-900 font-medium'
  }
  return 'border-input bg-card text-muted-foreground font-medium'
}
</script>

<template>
  <div class="grid grid-cols-5 gap-2 md:grid-cols-4">
    <button
      v-for="(question, position) in questions"
      :key="question.id"
      type="button"
      class="flex min-h-11 w-full items-center justify-center rounded-md border text-[length:var(--text-control)] tabular-nums transition-colors motion-reduce:transition-none"
      :class="toneOf(position)"
      :aria-label="`Soal ${position + 1}`"
      :aria-current="position === currentIndex ? 'step' : undefined"
      @click="emit('go', position)"
    >
      {{ position + 1 }}
    </button>
  </div>
</template>
