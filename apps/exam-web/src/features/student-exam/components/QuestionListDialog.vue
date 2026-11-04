<script setup lang="ts">
import { computed } from 'vue'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { groupByType } from '../logic/questionType'
import { isAnswered } from '../logic/exam'
import type { AnswerPayload, PaperQuestion } from '../types'

const props = defineProps<{
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

const groups = computed(() => groupByType(props.questions))

const answeredCount = computed(
  () =>
    props.questions.filter((question) =>
      isAnswered(question, props.answers.get(question.id)),
    ).length,
)

function answeredIn(entries: { item: PaperQuestion }[]): number {
  return entries.filter((entry) =>
    isAnswered(entry.item, props.answers.get(entry.item.id)),
  ).length
}

function toneOf(position: number): string {
  const question = props.questions[position]
  if (!question) return 'border-input bg-card text-muted-foreground'
  if (position === props.currentIndex) {
    return 'border-[#1A365D] bg-[#1A365D] text-white font-bold'
  }
  if (props.doubtful.has(question.id)) {
    return 'border-[#F59E0B] bg-[#F59E0B] text-white font-medium'
  }
  if (isAnswered(question, props.answers.get(question.id))) {
    return 'border-[#16A34A] bg-[#16A34A] text-white font-medium'
  }
  return 'border-input bg-card text-muted-foreground font-medium'
}

function padCount(total: number): number[] {
  const remainder = total % 10
  return Array.from(
    { length: remainder === 0 ? 0 : 10 - remainder },
    (_, i) => i,
  )
}

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
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>Daftar Soal</DialogTitle>
      </DialogHeader>

      <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <Card
          v-for="group in groups"
          :key="group.type"
          gap="none"
          class="overflow-hidden"
        >
          <CardHeader standard>
            <CardTitle>{{ group.label }}</CardTitle>
            <span
              class="text-[length:var(--text-control)] text-muted-foreground"
            >
              {{ answeredIn(group.entries) }} dari {{ group.entries.length }}
            </span>
          </CardHeader>

          <CardContent
            variant="flush"
            class="grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1 p-2 md:grid-cols-[repeat(20,minmax(0,1fr))]"
          >
            <button
              v-for="entry in group.entries"
              :key="entry.item.id"
              type="button"
              class="flex h-7 w-full items-center justify-center rounded border text-[length:var(--text-control)]"
              :class="toneOf(entry.position)"
              :aria-label="`Soal ${entry.position + 1}`"
              @click="pick(entry.position)"
            >
              {{ entry.position + 1 }}
            </button>
            <span
              v-for="pad in padCount(group.entries.length)"
              :key="`pad-${pad}`"
              aria-hidden="true"
            />
          </CardContent>
        </Card>
      </div>

      <DialogFooter
        standard
        class="justify-between"
      >
        <span
          class="flex items-center gap-1.5 text-[length:var(--text-control)] text-muted-foreground"
        >
          <span class="size-2.5 rounded-sm bg-[#1A365D]" />
          Sekarang
        </span>
        <span
          class="flex items-center gap-1.5 text-[length:var(--text-control)] text-muted-foreground"
        >
          <span class="size-2.5 rounded-sm bg-[#16A34A]" />
          Terjawab {{ answeredCount }}
        </span>
        <span
          class="flex items-center gap-1.5 text-[length:var(--text-control)] text-muted-foreground"
        >
          <span class="size-2.5 rounded-sm bg-[#F59E0B]" />
          Ragu-ragu {{ doubtful.size }}
        </span>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
