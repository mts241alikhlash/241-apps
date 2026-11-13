<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import type {
  EssayContent,
  QuestionDraft,
  MultipleChoiceContent,
  MultipleResponseContent,
  QuestionContent,
  QuestionType,
  ShortAnswerContent,
  TrueFalseContent,
} from '../types'
import ChoiceAnswer from './answer/ChoiceAnswer.vue'
import EssayGuide from './answer/EssayGuide.vue'
import ShortAnswer from './answer/ShortAnswer.vue'
import TrueFalseAnswer from './answer/TrueFalseAnswer.vue'
import { MAX_CHOICES } from '../utils/choices'
import RichQuestionText from './RichQuestionText.vue'

const props = defineProps<{ type: QuestionType }>()
const draft = defineModel<QuestionDraft>({ required: true })

const answers = ref<InstanceType<typeof ChoiceAnswer> | null>(null)
const shortAnswers = ref<InstanceType<typeof ShortAnswer> | null>(null)
const isChoice = computed(
  () => props.type === 'MULTIPLE_CHOICE' || props.type === 'MULTIPLE_RESPONSE',
)
const isShortAnswer = computed(() => props.type === 'SHORT_ANSWER')
const canAdd = computed(
  () =>
    isShortAnswer.value ||
    (isChoice.value &&
      (content.value as MultipleChoiceContent | MultipleResponseContent).choices
        .length < MAX_CHOICES),
)

function addAnswer() {
  if (isShortAnswer.value) {
    shortAnswers.value?.add()
    return
  }
  answers.value?.add()
}

const bodyHtml = computed({
  get: () => draft.value.bodyHtml,
  set: (value: string) => (draft.value = { ...draft.value, bodyHtml: value }),
})
const content = computed({
  get: () => draft.value.content,
  set: (value: QuestionContent) =>
    (draft.value = { ...draft.value, content: value }),
})
</script>

<template>
  <div class="grid items-stretch gap-2 sm:grid-cols-2">
    <Card
      gap="none"
      class="min-w-0"
    >
      <CardHeader
        variant="muted"
        class="px-2"
      >
        <CardTitle>Soal</CardTitle>
        <div
          v-if="$slots['soal-actions']"
          class="flex min-w-0 flex-wrap items-center gap-2"
        >
          <slot name="soal-actions" />
        </div>
      </CardHeader>
      <CardContent class="flex-1 p-2">
        <RichQuestionText
          v-model="bodyHtml"
          label="Soal"
        />
      </CardContent>
    </Card>
    <Card
      gap="none"
      class="min-w-0"
    >
      <CardHeader
        variant="muted"
        class="px-2"
      >
        <CardTitle>Jawaban</CardTitle>
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <slot name="answer-actions" />
          <Button
            v-if="isChoice || isShortAnswer"
            :disabled="!canAdd"
            @click="addAnswer()"
          >
            <Plus class="size-4" />
            Tambah
          </Button>
        </div>
      </CardHeader>
      <CardContent class="flex-1 p-2">
        <ChoiceAnswer
          v-if="isChoice"
          ref="answers"
          :key="type"
          v-model="content as MultipleChoiceContent | MultipleResponseContent"
        />
        <TrueFalseAnswer
          v-else-if="type === 'TRUE_FALSE'"
          v-model="content as TrueFalseContent"
        />
        <ShortAnswer
          v-else-if="type === 'SHORT_ANSWER'"
          ref="shortAnswers"
          v-model="content as ShortAnswerContent"
        />
        <EssayGuide
          v-else
          v-model="content as EssayContent"
        />
      </CardContent>
    </Card>
  </div>
</template>
