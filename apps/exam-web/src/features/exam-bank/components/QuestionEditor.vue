<script setup lang="ts">
import { computed, useId } from 'vue'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
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
import QuestionPreview from './QuestionPreview.vue'
import RichQuestionText from './RichQuestionText.vue'

defineProps<{ type: QuestionType }>()
const draft = defineModel<QuestionDraft>({ required: true })

const pointsId = useId()

const bodyHtml = computed({
  get: () => draft.value.bodyHtml,
  set: (value: string) => (draft.value = { ...draft.value, bodyHtml: value }),
})
const content = computed({
  get: () => draft.value.content,
  set: (value: QuestionContent) =>
    (draft.value = { ...draft.value, content: value }),
})
const points = computed({
  get: () => String(draft.value.points),
  set: (value: string) =>
    (draft.value = {
      ...draft.value,
      points: value === '' ? Number.NaN : Number(value.replace(',', '.')),
    }),
})
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-2">
    <div class="space-y-5">
      <section class="space-y-2">
        <h3 class="font-medium">Soal</h3>
        <RichQuestionText
          v-model="bodyHtml"
          label="Soal"
        />
      </section>
      <section class="space-y-2">
        <h3 class="font-medium">Jawaban</h3>
        <ChoiceAnswer
          v-if="type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_RESPONSE'"
          :key="type"
          v-model="content as MultipleChoiceContent | MultipleResponseContent"
        />
        <TrueFalseAnswer
          v-else-if="type === 'TRUE_FALSE'"
          v-model="content as TrueFalseContent"
        />
        <ShortAnswer
          v-else-if="type === 'SHORT_ANSWER'"
          v-model="content as ShortAnswerContent"
        />
        <EssayGuide
          v-else
          v-model="content as EssayContent"
        />
      </section>
      <FloatingLabelField
        label="Poin"
        :for="pointsId"
        class="max-w-40"
        floating
      >
        <Input
          :id="pointsId"
          v-model="points"
          type="number"
          inputmode="decimal"
          min="0.25"
          max="100"
          step="0.25"
        />
      </FloatingLabelField>
    </div>
    <div class="lg:sticky lg:top-4 lg:self-start">
      <QuestionPreview
        :type="type"
        :body-html="draft.bodyHtml"
        :content="draft.content"
        :points="draft.points"
      />
    </div>
  </div>
</template>
