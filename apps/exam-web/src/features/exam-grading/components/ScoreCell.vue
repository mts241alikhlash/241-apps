<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Input } from '@mts241alikhlash/ui/input'
import { examGradingService } from '../services/examGradingService'
import type { GradingItem } from '../types'
import { formatScore } from '../types'

const props = defineProps<{
  sessionId: string
  item: GradingItem
  canGrade: boolean
}>()
const emit = defineEmits<{ graded: [item: GradingItem] }>()

const score = ref<number | undefined>(props.item.score ?? undefined)
const busy = ref(false)

const maxDigits = computed(() => String(Math.ceil(props.item.points)).length)

function onInput(event: Event) {
  const field = event.target as HTMLInputElement
  const digits = field.value.replace(/\D/g, '').slice(0, maxDigits.value)
  field.value = digits
  score.value =
    digits === '' ? undefined : Math.min(Number(digits), props.item.points)
  if (digits !== '' && Number(digits) > props.item.points) {
    field.value = String(score.value)
  }
}

watch(
  () => props.item.score,
  (next) => {
    score.value = next ?? undefined
  },
)

const answered = computed(() => {
  const answer = props.item.answer
  if (answer === null) return false
  return (
    !('text' in answer) ||
    (typeof answer.text === 'string' ? answer.text : '').trim() !== ''
  )
})

const editable = computed(
  () => props.item.manual && props.canGrade && answered.value,
)

const valid = computed(
  () =>
    score.value !== undefined &&
    Number.isFinite(score.value) &&
    score.value >= 0 &&
    score.value <= props.item.points,
)

const changed = computed(() => score.value !== (props.item.score ?? undefined))

async function save() {
  if (!valid.value || !changed.value || busy.value) return
  if (score.value === undefined) return
  busy.value = true
  const graded = await examGradingService.grade(
    props.sessionId,
    props.item.questionId,
    { score: score.value, note: props.item.note ?? undefined },
  )
  busy.value = false
  if (graded) emit('graded', graded)
}
</script>

<template>
  <span
    v-if="editable"
    class="inline-flex items-center justify-center gap-1.5"
  >
    <Input
      :model-value="score === undefined ? '' : String(score)"
      type="text"
      inputmode="numeric"
      :maxlength="maxDigits"
      :disabled="busy"
      :aria-invalid="score !== undefined && !valid"
      :class="[
        'h-[var(--control-h-sm,1.5rem)] px-0 text-center',
        maxDigits > 1 ? 'w-9' : 'w-7',
      ]"
      @input="onInput"
      @blur="save"
      @keydown.enter.prevent="save"
    />
    <span class="text-muted-foreground">/ {{ item.points }}</span>
  </span>
  <span
    v-else
    class="whitespace-nowrap"
  >
    {{
      item.manual && item.score === null && answered
        ? '-'
        : formatScore(item.score ?? 0)
    }}
    / {{ item.points }}
  </span>
</template>
