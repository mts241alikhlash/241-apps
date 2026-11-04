<script setup lang="ts">
import { computed } from 'vue'
import type {
  EssayContent,
  MultipleChoiceContent,
  MultipleResponseContent,
  QuestionContent,
  QuestionType,
  ShortAnswerContent,
  TrueFalseContent,
} from '../types'
import QuestionHtml from './QuestionHtml.vue'

const props = defineProps<{ type: QuestionType; content: QuestionContent }>()

const keys = computed(() => {
  if (props.type === 'MULTIPLE_CHOICE') {
    return [(props.content as MultipleChoiceContent).answer.key]
  }
  if (props.type === 'MULTIPLE_RESPONSE') {
    return (props.content as MultipleResponseContent).answer.keys
  }
  return []
})
const accepted = computed(() =>
  props.type === 'SHORT_ANSWER'
    ? (props.content as ShortAnswerContent).answer.accepted
    : [],
)
</script>

<template>
  <div
    class="space-y-1 rounded-md border bg-muted/30 p-3 text-[length:var(--text-control,0.75rem)]"
    data-testid="answer-key"
  >
    <p class="font-medium">Kunci jawaban</p>
    <p v-if="keys.length > 0">{{ keys.join(', ') }}</p>
    <p v-else-if="type === 'TRUE_FALSE'">
      {{ (content as TrueFalseContent).answer.value ? 'Benar' : 'Salah' }}
    </p>
    <ul
      v-else-if="type === 'SHORT_ANSWER'"
      class="list-disc pl-5"
      dir="auto"
    >
      <li
        v-for="answer in accepted"
        :key="answer"
      >
        {{ answer }}
      </li>
    </ul>
    <QuestionHtml
      v-else-if="(content as EssayContent).guideHtml"
      :html="(content as EssayContent).guideHtml ?? ''"
    />
    <p
      v-else
      class="text-muted-foreground"
    >
      Tidak ada pedoman penilaian.
    </p>
  </div>
</template>
