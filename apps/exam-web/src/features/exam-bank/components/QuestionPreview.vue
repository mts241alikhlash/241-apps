<script setup lang="ts">
import { computed } from 'vue'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Item, ItemContent, ItemGroup } from '@mts241alikhlash/ui/item'
import type {
  ChoiceKey,
  EssayContent,
  MultipleChoiceContent,
  MultipleResponseContent,
  QuestionContent,
  QuestionType,
  ShortAnswerContent,
  TrueFalseContent,
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

function isCorrect(key: ChoiceKey): boolean {
  if (props.type === 'MULTIPLE_CHOICE') {
    return (props.content as MultipleChoiceContent).answer.key === key
  }
  if (props.type === 'MULTIPLE_RESPONSE') {
    return (props.content as MultipleResponseContent).answer.keys.includes(key)
  }
  return false
}

const acceptedAnswers = computed(() =>
  props.type === 'SHORT_ANSWER'
    ? (props.content as ShortAnswerContent).answer.accepted.filter(
        (answer) => answer.trim() !== '',
      )
    : [],
)

const guideHtml = computed(() =>
  props.type === 'ESSAY'
    ? ((props.content as EssayContent).guideHtml ?? '')
    : '',
)

const trueValue = computed(() =>
  props.type === 'TRUE_FALSE'
    ? (props.content as TrueFalseContent).answer.value
    : null,
)
</script>

<template>
  <Card
    gap="none"
    class="min-w-0"
    data-testid="question-preview"
  >
    <CardHeader
      variant="muted"
      class="px-2"
    >
      <CardTitle>Pratinjau</CardTitle>
      <span
        class="shrink-0 text-[length:var(--text-control,0.75rem)] text-muted-foreground tabular-nums"
      >
        {{ points }} poin
      </span>
    </CardHeader>

    <CardContent class="flex min-w-0 flex-col gap-2 p-2">
      <QuestionHtml :html="bodyHtml" />

      <ItemGroup
        v-if="choices.length > 0"
        class="gap-2"
      >
        <Item
          v-for="choice in choices"
          :key="choice.key"
          variant="outline"
          class="min-h-8 min-w-0 gap-2 px-2 py-[1px]"
          :class="isCorrect(choice.key) ? 'bg-primary/10' : undefined"
        >
          <span
            class="shrink-0 text-[length:var(--text-control,0.75rem)] font-medium"
            :class="isCorrect(choice.key) ? 'text-primary' : undefined"
          >
            {{ choice.key }}.
          </span>
          <ItemContent class="min-w-0">
            <QuestionHtml :html="choice.html" />
          </ItemContent>
        </Item>
      </ItemGroup>

      <div
        v-else-if="type === 'TRUE_FALSE'"
        class="flex gap-2"
      >
        <span
          class="rounded-md border px-4 py-2"
          :class="
            trueValue === true
              ? 'bg-primary/10 font-medium text-primary'
              : undefined
          "
        >
          Benar
        </span>
        <span
          class="rounded-md border px-4 py-2"
          :class="
            trueValue === false
              ? 'bg-primary/10 font-medium text-primary'
              : undefined
          "
        >
          Salah
        </span>
      </div>

      <div
        v-else-if="type === 'SHORT_ANSWER'"
        class="flex flex-col gap-1 text-[length:var(--text-control,0.75rem)]"
      >
        <span class="text-muted-foreground">Jawaban benar</span>
        <div
          v-if="acceptedAnswers.length > 0"
          class="flex flex-wrap gap-1"
        >
          <span
            v-for="answer in acceptedAnswers"
            :key="answer"
            class="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary"
          >
            {{ answer }}
          </span>
        </div>
        <span
          v-else
          class="text-muted-foreground"
        >
          Belum diisi.
        </span>
      </div>

      <div
        v-else
        class="flex flex-col gap-1 text-[length:var(--text-control,0.75rem)]"
      >
        <span class="text-muted-foreground">Pedoman penilaian</span>
        <QuestionHtml
          v-if="guideHtml"
          :html="guideHtml"
        />
        <span
          v-else
          class="text-muted-foreground"
        >
          Belum diisi.
        </span>
      </div>
    </CardContent>
  </Card>
</template>
