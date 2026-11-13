<script setup lang="ts">
import { computed } from 'vue'
import { Trash2 } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
} from '@mts241alikhlash/ui/item'
import { RadioGroup, RadioGroupItem } from '@mts241alikhlash/ui/radio-group'
import type {
  ChoiceKey,
  MultipleChoiceContent,
  MultipleResponseContent,
} from '../../types'
import {
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

defineExpose({ add })
</script>

<template>
  <div class="flex flex-col gap-2">
    <RadioGroup
      v-if="!isMultiple(content)"
      :model-value="selectedKey"
      class="gap-2"
      @update:model-value="pickSingle"
    >
      <Item
        v-for="choice in content.choices"
        :key="choice.key"
        class="gap-2 border-0 px-1 py-0"
        data-testid="choice-row"
      >
        <RadioGroupItem
          :id="`kunci-${choice.key}`"
          :value="choice.key"
          :aria-label="`Kunci jawaban pilihan ${choice.key}`"
        />
        <span class="w-5 shrink-0 font-medium">{{ choice.key }}</span>
        <ItemContent class="min-w-0 flex-1 flex-row items-center">
          <div class="min-w-0 flex-1">
            <RichQuestionText
              :model-value="choice.html"
              :label="`Pilihan ${choice.key}`"
              compact
              single-line
              @update:model-value="setHtml(choice.key, $event)"
            />
          </div>
        </ItemContent>
        <ItemActions>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            :disabled="!canRemove"
            :aria-label="`Hapus pilihan ${choice.key}`"
            @click="remove(choice.key)"
          >
            <Trash2 />
          </Button>
        </ItemActions>
      </Item>
    </RadioGroup>

    <ItemGroup
      v-else
      class="gap-2"
    >
      <Item
        v-for="choice in content.choices"
        :key="choice.key"
        class="gap-2 border-0 px-1 py-0"
        data-testid="choice-row"
      >
        <Checkbox
          :id="`kunci-${choice.key}`"
          :model-value="isCorrect(choice.key)"
          :aria-label="`Kunci jawaban pilihan ${choice.key}`"
          @update:model-value="toggle(choice.key)"
        />
        <span class="w-5 shrink-0 font-medium">{{ choice.key }}</span>
        <ItemContent class="min-w-0 flex-1 flex-row items-center">
          <div class="min-w-0 flex-1">
            <RichQuestionText
              :model-value="choice.html"
              :label="`Pilihan ${choice.key}`"
              compact
              single-line
              @update:model-value="setHtml(choice.key, $event)"
            />
          </div>
        </ItemContent>
        <ItemActions>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            :disabled="!canRemove"
            :aria-label="`Hapus pilihan ${choice.key}`"
            @click="remove(choice.key)"
          >
            <Trash2 />
          </Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  </div>
</template>
