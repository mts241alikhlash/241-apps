<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Field as FormField } from 'vee-validate'
import FormMessage from './FormMessage.vue'
import FloatingLabelField from './FloatingLabelField.vue'

const props = withDefaults(
  defineProps<{
    name: string
    label: string
    required?: boolean
    alwaysFloat?: boolean
    hideLabel?: boolean
    class?: HTMLAttributes['class']
  }>(),
  { required: false, alwaysFloat: false, hideLabel: false },
)

function isEmpty(value: unknown) {
  return value === null || value === undefined || value === ''
}
</script>

<template>
  <FormField
    v-slot="field"
    :name="props.name"
  >
    <FloatingLabelField
      :label="props.label"
      :required="props.required"
      :floating="props.alwaysFloat || !isEmpty(field.value)"
      :hide-label="props.hideLabel"
      :error="field.errorMessage"
      :class="props.class"
    >
      <slot v-bind="field" />
      <FormMessage class="sr-only" />
    </FloatingLabelField>
  </FormField>
</template>
