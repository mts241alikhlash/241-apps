<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { QuestionnaireInputType } from './useQuestionnaire'
import { cn } from '@mts241alikhlash/ui/utils'
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import {
  getAnswerKeyShortcuts,
  hasInputValue,
  injectQuestionnaireItemContext,
} from './useQuestionnaire'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  class?: HTMLAttributes['class']
  defaultValue?: string | number
  disabled?: boolean
  modelValue?: string | number
  type?: QuestionnaireInputType
}>(), {
  disabled: false,
  type: 'text',
})

const emits = defineEmits<{
  'update:modelValue': [value: string]
}>()

const item = injectQuestionnaireItemContext()

const answerId = useId()
const inputElement = ref<HTMLInputElement | null>(null)
const initialDefaultFilled = hasInputValue(props.defaultValue)
const uncontrolledValue = ref(String(props.defaultValue ?? ''))

const controlled = computed(() => props.modelValue !== undefined)
const defaultFilled = computed(() => hasInputValue(props.defaultValue))
const disabled = computed(() => item.disabled.value || props.disabled)
const value = computed(() =>
  controlled.value ? String(props.modelValue ?? '') : uncontrolledValue.value)
const filled = computed(() => hasInputValue(value.value))
const selected = computed(() => item.selectedAnswerIds.value.includes(answerId))

function syncValueElement() {
  if (inputElement.value && inputElement.value.value !== value.value) {
    inputElement.value.value = value.value
  }
}

function handleInput(event: Event) {
  const nextValue = (event.target as HTMLInputElement).value

  emits('update:modelValue', nextValue)

  if (controlled.value) {
    nextTick(syncValueElement)
    return
  }

  uncontrolledValue.value = nextValue
  item.setAnswerSelectionFromInteraction(answerId, hasInputValue(nextValue))
}

const unregisterSelection = item.registerAnswerSelection(answerId, initialDefaultFilled)

let unregisterControl: (() => void) | null = null

watch([inputElement, disabled, () => props.disabled], ([element]) => {
  unregisterControl?.()
  unregisterControl = null

  if (!element) {
    return
  }

  unregisterControl = item.registerAnswerControl({
    disabled: disabled.value,
    element,
    id: answerId,
    ownDisabled: props.disabled,
    type: 'input',
    value: '',
  })
}, { flush: 'post' })

watch(defaultFilled, (nextDefaultFilled) => {
  item.setAnswerDefault(answerId, nextDefaultFilled)
})

watch([value, filled], () => {
  if (controlled.value) {
    item.syncControlledAnswerSelection(answerId, filled.value)
  }
}, { immediate: true })

watch(item.resetVersion, () => {
  if (!controlled.value) {
    uncontrolledValue.value = String(props.defaultValue ?? '')
  }
})

watch([value, inputElement], () => {
  if (!inputElement.value) {
    return
  }

  inputElement.value.defaultValue = String(
    (controlled.value ? props.modelValue : props.defaultValue) ?? '',
  )
}, { flush: 'post' })

onBeforeUnmount(() => {
  unregisterControl?.()
  unregisterControl = null
  unregisterSelection()
})
</script>

<template>
  <div
    data-slot="questionnaire-input-wrapper"
    class="w-full group/questionnaire-input relative min-w-0"
  >
    <input
      v-bind="$attrs"
      :id="answerId"
      ref="inputElement"
      data-slot="questionnaire-input"
      :aria-invalid="item.invalid.value || undefined"
      :aria-keyshortcuts="getAnswerKeyShortcuts(null, !disabled && filled && selected)"
      :data-disabled="disabled ? '' : undefined"
      :data-empty="filled ? undefined : ''"
      :data-filled="filled ? '' : undefined"
      :data-invalid="item.invalid.value ? '' : undefined"
      :disabled="disabled"
      :form="selected ? undefined : ''"
      :name="selected ? item.name.value : undefined"
      :type="props.type"
      :value="value"
      :class="cn(
        'bg-transparent dark:bg-input/30 border-input focus-visible:border-ring aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-7 rounded-md border px-2 py-0.5 text-sm md:text-xs/relaxed min-h-11 w-full min-w-0 transition-[color,box-shadow,background-color] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0',
        'selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground',
        props.class,
      )"
      @input="handleInput"
    >
  </div>
</template>
