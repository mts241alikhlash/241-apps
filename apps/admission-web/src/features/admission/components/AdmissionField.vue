<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { FloatingField } from '@mts241alikhlash/ui/form'

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
</script>

<template>
  <FloatingField
    v-slot="field"
    :name="name"
    :label="label"
    :required="required"
    :always-float="alwaysFloat"
    :hide-label="hideLabel"
    :class="['admission-field', props.class]"
  >
    <slot v-bind="field" />
  </FloatingField>
</template>

<style scoped>
:global(.admission-field.ff-error .birth-date-picker button) {
  border-color: var(--destructive);
  color: var(--destructive);
}

:global(
  .admission-field.ff-error:has(.birth-date-picker) [data-slot='ff-label']
) {
  color: var(--destructive);
}
</style>
