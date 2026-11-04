<script setup lang="ts">
import { computed } from 'vue'
import type {
  MultipleChoiceContent,
  MultipleResponseContent,
  QuestionContent,
  QuestionType,
} from '../types'
import QuestionHtml from './QuestionHtml.vue'

const props = defineProps<{
  type: QuestionType
  bodyHtml: string
  content: QuestionContent
  points: number
}>()

const choices = computed(() =>
  props.type === 'MULTIPLE_CHOICE' || props.type === 'MULTIPLE_RESPONSE'
    ? (props.content as MultipleChoiceContent | MultipleResponseContent).choices
    : [],
)
</script>

<template>
  <div
    class="space-y-3 rounded-md border bg-background p-4"
    data-testid="question-preview"
  >
    <p class="text-[length:var(--text-control,0.75rem)] text-muted-foreground">
      Pratinjau seperti yang dilihat siswa · {{ points }} poin
    </p>
    <QuestionHtml :html="bodyHtml" />
    <ol
      v-if="choices.length > 0"
      class="space-y-2"
    >
      <li
        v-for="choice in choices"
        :key="choice.key"
        class="flex items-start gap-2 rounded-md border px-3 py-2"
      >
        <span class="font-medium">{{ choice.key }}.</span>
        <QuestionHtml
          class="min-w-0 flex-1"
          :html="choice.html"
        />
      </li>
    </ol>
    <div
      v-else-if="type === 'TRUE_FALSE'"
      class="flex gap-2"
    >
      <span class="rounded-md border px-4 py-2">Benar</span>
      <span class="rounded-md border px-4 py-2">Salah</span>
    </div>
    <div
      v-else-if="type === 'SHORT_ANSWER'"
      class="rounded-md border px-3 py-2 text-muted-foreground"
    >
      Jawaban singkat siswa…
    </div>
    <div
      v-else
      class="min-h-20 rounded-md border px-3 py-2 text-muted-foreground"
    >
      Jawaban uraian siswa…
    </div>
  </div>
</template>
