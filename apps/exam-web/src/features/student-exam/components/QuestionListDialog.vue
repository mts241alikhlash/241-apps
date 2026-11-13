<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import QuestionNumberGrid from './QuestionNumberGrid.vue'
import type { AnswerPayload, PaperQuestion } from '../types'

defineProps<{
  open: boolean
  questions: PaperQuestion[]
  answers: Map<string, AnswerPayload>
  doubtful: Set<string>
  currentIndex: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  go: [position: number]
}>()

function pick(position: number) {
  emit('go', position)
  emit('update:open', false)
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Daftar Soal</DialogTitle>
      </DialogHeader>

      <div class="max-h-[70svh] overflow-y-auto px-4 py-3">
        <QuestionNumberGrid
          :questions="questions"
          :answers="answers"
          :doubtful="doubtful"
          :current-index="currentIndex"
          @go="pick"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
