<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@mts241alikhlash/ui/radio-group'
import type {
  ChoiceKey,
  MultipleChoiceContent,
  MultipleResponseContent,
} from '../../types'
import {
  MAX_CHOICES,
  MIN_CHOICES,
  addChoice,
  isMultiple,
  removeChoice,
  setSingleKey,
  toggleKey,
} from '../../utils/choices'
import RichQuestionText from '../RichQuestionText.vue'

const content = defineModel<MultipleChoiceContent | MultipleResponseContent>({
  required: true,
})

const canAdd = computed(() => content.value.choices.length < MAX_CHOICES)
const canRemove = computed(() => content.value.choices.length > MIN_CHOICES)
const selectedKey = computed(() =>
  isMultiple(content.value) ? '' : content.value.answer.key,
)

function isCorrect(key: ChoiceKey): boolean {
  return isMultiple(content.value)
    ? content.value.answer.keys.includes(key)
    : content.value.answer.key === key
}

function setHtml(key: ChoiceKey, html: string) {
  content.value = {
    ...content.value,
    choices: content.value.choices.map((choice) =>
      choice.key === key ? { ...choice, html } : choice,
    ),
  }
}

function pickSingle(key: unknown) {
  if (!isMultiple(content.value)) {
    content.value = setSingleKey(content.value, key as ChoiceKey)
  }
}

function toggle(key: ChoiceKey) {
  if (isMultiple(content.value)) content.value = toggleKey(content.value, key)
}

function add() {
  content.value = addChoice(content.value)
}

function remove(key: ChoiceKey) {
  content.value = removeChoice(content.value, key)
}
</script>

<template>
  <div class="space-y-3">
    <p class="text-[length:var(--text-control,0.75rem)] text-muted-foreground">
      {{
        isMultiple(content)
          ? 'Centang semua pilihan yang benar.'
          : 'Pilih satu kunci jawaban.'
      }}
    </p>
    <RadioGroup
      v-if="!isMultiple(content)"
      :model-value="selectedKey"
      class="gap-3"
      @update:model-value="pickSingle"
    >
      <div
        v-for="choice in content.choices"
        :key="choice.key"
        class="flex items-start gap-3"
        data-testid="choice-row"
      >
        <RadioGroupItem
          :id="`kunci-${choice.key}`"
          :value="choice.key"
          :aria-label="`Kunci jawaban pilihan ${choice.key}`"
          class="mt-2.5"
        />
        <span class="mt-2 w-5 shrink-0 font-medium">{{ choice.key }}</span>
        <div class="min-w-0 flex-1">
          <RichQuestionText
            :model-value="choice.html"
            :label="`Pilihan ${choice.key}`"
            compact
            @update:model-value="setHtml(choice.key, $event)"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          :disabled="!canRemove"
          :aria-label="`Hapus pilihan ${choice.key}`"
          @click="remove(choice.key)"
        >
          <Trash2 />
        </Button>
      </div>
    </RadioGroup>
    <template v-else>
      <div
        v-for="choice in content.choices"
        :key="choice.key"
        class="flex items-start gap-3"
        data-testid="choice-row"
      >
        <Checkbox
          :id="`kunci-${choice.key}`"
          :model-value="isCorrect(choice.key)"
          :aria-label="`Kunci jawaban pilihan ${choice.key}`"
          class="mt-2.5"
          @update:model-value="toggle(choice.key)"
        />
        <span class="mt-2 w-5 shrink-0 font-medium">{{ choice.key }}</span>
        <div class="min-w-0 flex-1">
          <RichQuestionText
            :model-value="choice.html"
            :label="`Pilihan ${choice.key}`"
            compact
            @update:model-value="setHtml(choice.key, $event)"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          :disabled="!canRemove"
          :aria-label="`Hapus pilihan ${choice.key}`"
          @click="remove(choice.key)"
        >
          <Trash2 />
        </Button>
      </div>
    </template>
    <Button
      type="button"
      variant="outline"
      :disabled="!canAdd"
      @click="add"
    >
      <Plus class="mr-1.5 size-4" />
      Tambah pilihan
    </Button>
  </div>
</template>
