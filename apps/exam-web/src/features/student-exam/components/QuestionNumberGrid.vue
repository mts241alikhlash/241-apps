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
    return 'border-primary bg-primary text-primary-foreground font-semibold'
  }
  if (props.doubtful.has(question.id)) {
    return 'border-warning bg-warning/10 text-warning font-medium'
  }
  if (isAnswered(question, props.answers.get(question.id))) {
    return 'border-success bg-success/10 text-success font-medium'
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
      class="flex min-h-[var(--control-h-lg,2rem)] w-full items-center justify-center rounded-md border text-control tabular-nums transition-colors motion-reduce:transition-none"
      :class="toneOf(position)"
      :aria-label="`Soal ${position + 1}`"
      :aria-current="position === currentIndex ? 'step' : undefined"
      @click="emit('go', position)"
    >
      {{ position + 1 }}
    </button>
  </div>
</template>
