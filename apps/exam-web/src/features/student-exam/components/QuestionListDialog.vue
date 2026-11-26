<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@mts241alikhlash/ui/dialog'
import { isAnswered } from '../logic/exam'
import type { AnswerPayload, PaperQuestion } from '../types'

const props = defineProps<{
  open: boolean
  questions: PaperQuestion[]
  answers: Map<string, AnswerPayload>
  doubtful: Set<string>
  currentIndex: number
  submitLabel?: string
  submitDisabled?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  go: [position: number]
  submit: []
}>()

const TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: 'Pilihan Ganda',
  MULTIPLE_RESPONSE: 'Pilihan Ganda Kompleks',
  TRUE_FALSE: 'Benar / Salah',
  ESSAY: 'Uraian',
  SHORT_ANSWER: 'Jawaban Singkat',
}

function answered(question: PaperQuestion): boolean {
  return isAnswered(question, props.answers.get(question.id))
}

const groups = computed(() => {
  const byType = new Map<
    string,
    { position: number; question: PaperQuestion }[]
  >()
  props.questions.forEach((question, position) => {
    const list = byType.get(question.type) ?? []
    list.push({ position, question })
    byType.set(question.type, list)
  })
  return [...byType].map(([type, items]) => ({
    type,
    label: TYPE_LABELS[type] ?? type,
    items,
    answeredCount: items.filter((item) => answered(item.question)).length,
  }))
})

const answeredTotal = computed(
  () => props.questions.filter((question) => answered(question)).length,
)
const doubtTotal = computed(
  () =>
    props.questions.filter((question) => props.doubtful.has(question.id))
      .length,
)

function toneOf(position: number, question: PaperQuestion): string {
  if (position === props.currentIndex) {
    return 'border-primary bg-primary font-bold text-white'
  }
  if (props.doubtful.has(question.id)) {
    return 'border-warning bg-warning font-medium text-white'
  }
  if (answered(question)) {
    return 'border-success bg-success font-medium text-white'
  }
  return 'border-border bg-card font-medium text-foreground/80'
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
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Daftar Soal</DialogTitle>
        <DialogDescription
          >Pilih nomor soal yang ingin dibuka.</DialogDescription
        >
      </DialogHeader>

      <div class="max-h-[62svh] space-y-3 overflow-y-auto px-4 py-3">
        <section
          v-for="group in groups"
          :key="group.type"
          class="overflow-hidden rounded-[10px] border border-border bg-card"
        >
          <div
            class="flex min-h-10 items-center justify-between bg-foreground/[0.03] px-4 py-0.5"
          >
            <span class="text-sm font-semibold">{{ group.label }}</span>
            <span class="text-xs text-muted-foreground">
              {{ group.answeredCount }} dari {{ group.items.length }}
            </span>
          </div>
          <div class="border-t border-border" />
          <div class="grid grid-cols-10 gap-1 p-2.5">
            <button
              v-for="item in group.items"
              :key="item.question.id"
              type="button"
              class="flex aspect-square w-full items-center justify-center rounded-md border text-xs"
              :class="toneOf(item.position, item.question)"
              :aria-label="`Soal ${item.position + 1}`"
              :aria-current="
                item.position === currentIndex ? 'step' : undefined
              "
              @click="pick(item.position)"
            >
              {{ item.position + 1 }}
            </button>
          </div>
        </section>

        <Button
          variant="outline"
          class="h-11 w-full text-[13px] font-medium"
          :disabled="submitDisabled"
          @click="emit('submit')"
        >
          {{ submitLabel ?? 'Selesai & Kumpulkan' }}
        </Button>
      </div>

      <div
        class="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground"
      >
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-[3px] bg-primary" />Sekarang
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-[3px] bg-success" />Terjawab
          {{ answeredTotal }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-[3px] bg-warning" />Ragu-ragu
          {{ doubtTotal }}
        </span>
      </div>
    </DialogContent>
  </Dialog>
</template>
