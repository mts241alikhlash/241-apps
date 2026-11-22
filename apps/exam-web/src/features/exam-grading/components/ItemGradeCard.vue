<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import QuestionHtml from '@/features/exam-bank/components/QuestionHtml.vue'
import { examGradingService } from '../services/examGradingService'
import type { GradingItem } from '../types'
import { answerText, booleanLabel, chosenKeys, itemTypeLabel } from '../types'

const props = defineProps<{
  sessionId: string
  item: GradingItem
  canGrade: boolean
}>()
const emit = defineEmits<{ graded: [item: GradingItem] }>()

const fieldId = useId()
const score = ref<number | undefined>(props.item.score ?? undefined)
const note = ref(props.item.note ?? '')
const busy = ref(false)

watch(
  [() => props.item.score, () => props.item.note],
  ([nextScore, nextNote]) => {
    score.value = nextScore ?? undefined
    note.value = nextNote ?? ''
  },
)

const answer = computed(() => answerText(props.item.answer))
const chosen = computed(() => new Set(chosenKeys(props.item.answer)))
const correct = computed(() => new Set(props.item.correctKeys ?? []))
const autoState = computed(() => {
  const score = props.item.score ?? 0
  if (!hasAnswer.value)
    return { label: 'Tidak dijawab (0)', variant: 'outline' as const }
  if (score >= props.item.points) {
    return { label: `Benar (${score})`, variant: 'success' as const }
  }
  if (score <= 0) return { label: 'Salah (0)', variant: 'destructive' as const }
  return { label: `Sebagian (${score})`, variant: 'warning' as const }
})
const hasAnswer = computed(
  () =>
    props.item.answer !== null &&
    (!('text' in props.item.answer) || answer.value.trim() !== ''),
)
const valid = computed(
  () =>
    score.value !== undefined &&
    Number.isFinite(score.value) &&
    score.value >= 0 &&
    score.value <= props.item.points,
)
const changed = computed(
  () =>
    score.value !== (props.item.score ?? undefined) ||
    note.value.trim() !== (props.item.note ?? ''),
)
const canSave = computed(
  () =>
    props.canGrade &&
    hasAnswer.value &&
    valid.value &&
    changed.value &&
    !busy.value,
)

async function save() {
  if (!canSave.value || score.value === undefined) return
  busy.value = true
  const graded = await examGradingService.grade(
    props.sessionId,
    props.item.questionId,
    {
      score: score.value,
      note: note.value.trim() || undefined,
    },
  )
  busy.value = false
  if (graded) emit('graded', graded)
}
</script>

<template>
  <Card gap="none">
    <CardHeader standard>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <CardTitle size="md">
          Soal {{ item.number }} · {{ itemTypeLabel(item.type) }} ·
          {{ item.points }} poin
        </CardTitle>
        <Badge
          v-if="!item.manual"
          :variant="autoState.variant"
        >
          {{ autoState.label }}
        </Badge>
        <Badge
          v-else
          :variant="item.needsGrading ? 'destructive' : 'outline'"
        >
          {{
            !hasAnswer
              ? 'Tidak dijawab (0)'
              : item.score === null
                ? 'Belum dinilai'
                : 'Sudah dinilai'
          }}
        </Badge>
      </div>
    </CardHeader>
    <CardContent variant="standard">
      <div class="space-y-4">
        <QuestionHtml :html="item.bodyHtml" />

        <div
          v-if="item.guideHtml"
          class="rounded-md border p-3"
        >
          <p class="mb-1 font-medium">Pedoman penilaian</p>
          <QuestionHtml :html="item.guideHtml" />
        </div>
        <div
          v-if="item.acceptedAnswers && item.acceptedAnswers.length > 0"
          class="rounded-md border p-3"
        >
          <p class="mb-1 font-medium">Jawaban yang diterima</p>
          <p>{{ item.acceptedAnswers.join(', ') }}</p>
        </div>

        <ul
          v-if="item.choices"
          class="space-y-1.5"
        >
          <li
            v-for="choice in item.choices"
            :key="choice.key"
            :class="[
              'flex items-start gap-2 rounded-md border p-2',
              correct.has(choice.key) && 'border-success/50 bg-success/5',
              chosen.has(choice.key) &&
                !correct.has(choice.key) &&
                'border-destructive/50 bg-destructive/5',
            ]"
          >
            <span class="w-5 shrink-0 font-medium">{{ choice.key }}.</span>
            <QuestionHtml
              class="min-w-0 flex-1"
              :html="choice.html"
            />
            <span
              v-if="correct.has(choice.key)"
              class="shrink-0 text-control text-success"
            >
              Kunci
            </span>
            <span
              v-if="chosen.has(choice.key)"
              :class="[
                'shrink-0 text-control',
                correct.has(choice.key) ? 'text-success' : 'text-destructive',
              ]"
            >
              Dipilih
            </span>
          </li>
        </ul>
        <div
          v-else-if="item.type === 'TRUE_FALSE'"
          class="rounded-md bg-muted/40 p-3"
        >
          <p>Kunci: {{ booleanLabel(item.correctValue) }}</p>
          <p>
            Jawaban siswa:
            {{
              hasAnswer ? booleanLabel(item.answer?.value) : 'Tidak dijawab.'
            }}
          </p>
        </div>
        <div
          v-else
          class="rounded-md bg-muted/40 p-3"
        >
          <p class="mb-1 font-medium">Jawaban siswa</p>
          <p
            v-if="hasAnswer"
            class="whitespace-pre-wrap"
            dir="auto"
          >
            {{ answer }}
          </p>
          <p
            v-else
            class="text-muted-foreground"
          >
            Tidak dijawab.
          </p>
        </div>

        <div
          v-if="item.manual && hasAnswer && canGrade"
          class="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-start"
        >
          <FloatingLabelField
            :label="`Nilai (0–${item.points})`"
            :for="`${fieldId}-score`"
            floating
          >
            <Input
              :id="`${fieldId}-score`"
              v-model.number="score"
              type="number"
              inputmode="decimal"
              step="0.25"
              min="0"
              :max="item.points"
            />
          </FloatingLabelField>
          <FloatingLabelField
            label="Catatan"
            :for="`${fieldId}-note`"
            floating
          >
            <Input
              :id="`${fieldId}-note`"
              v-model="note"
              maxlength="500"
            />
          </FloatingLabelField>
          <Button
            :disabled="!canSave"
            @click="save"
          >
            {{ busy ? 'Menyimpan…' : 'Simpan' }}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
