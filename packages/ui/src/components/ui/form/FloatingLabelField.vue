<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useId, provide } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'
import { FORM_ITEM_INJECTION_KEY } from './injectionKeys'

const props = withDefaults(
  defineProps<{
    label: string
    required?: boolean
    floating?: boolean
    hideLabel?: boolean
    error?: string
    for?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    required: false,
    floating: false,
    hideLabel: false,
  },
)

const id = useId()
provide(FORM_ITEM_INJECTION_KEY, id)
</script>

<template>
  <div
    data-slot="form-item"
    :class="
      cn(
        'ff relative grid gap-1 pt-3',
        !props.floating && 'ff-empty',
        props.error && 'ff-error',
        props.class,
      )
    "
  >
    <label
      v-if="!props.hideLabel"
      data-slot="ff-label"
      :for="props.for ?? `${id}-form-item`"
      :title="props.error || undefined"
    >
      {{ props.error || props.label }}
      <span
        v-if="props.required && !props.error"
        class="text-destructive"
        >*</span
      >
    </label>
    <slot />
  </div>
</template>

<style scoped>
.ff :deep([data-slot='ff-label']) {
  position: absolute;
  left: calc(0.375rem + 1px);
  top: 0.75rem;
  z-index: 1;
  transform: translateY(-50%);
  padding-inline: 0.125rem;
  background-color: var(--ff-label-bg, var(--background));
  font-size: 0.625rem;
  line-height: 0.5rem;
  font-weight: 400;
  color: color-mix(in oklab, var(--foreground) 70%, transparent);
  pointer-events: none;
  transition:
    left 150ms ease,
    top 150ms ease,
    font-size 150ms ease,
    color 150ms ease;
}

.ff:not(.ff-empty) :deep(input),
.ff:not(.ff-empty) :deep([role='combobox']),
.ff:not(.ff-empty) :deep(button[aria-haspopup='dialog']),
.ff:focus-within :deep(input),
.ff:focus-within :deep([role='combobox']),
.ff:focus-within :deep(button[aria-haspopup='dialog']) {
  padding-top: 0.1875rem;
  padding-bottom: 0;
}

.ff.ff-empty:not(.ff-error):not(:focus-within):not(:has(button[aria-expanded='true'])) :deep([data-slot='ff-label']) {
  left: calc(0.375rem + 1px);
  top: calc(0.75rem + var(--control-h-md, 1.75rem) / 2 + 0.75px);
  font-size: var(--text-control, 0.75rem);
  color: var(--muted-foreground);
}

.ff.ff-empty :deep(button[aria-haspopup='dialog']) {
  color: transparent;
}

.ff:focus-within :deep([data-slot='ff-label']) {
  color: var(--primary);
}

.ff.ff-empty:not(.ff-error):has(button[aria-haspopup='dialog']:not([aria-expanded='true'])) :deep([data-slot='ff-label']) {
  left: calc(0.375rem + 1px);
  top: calc(0.75rem + var(--control-h-md, 1.75rem) / 2 + 0.75px);
  font-size: var(--text-control, 0.75rem);
  color: var(--muted-foreground);
}

.ff:has(button[aria-haspopup='dialog'][aria-expanded='true']) :deep([data-slot='ff-label']) {
  color: var(--primary);
}

.ff:has([aria-invalid='true']) :deep([data-slot='ff-label']),
.ff.ff-error :deep([data-slot='ff-label']) {
  color: var(--destructive);
}

.ff.ff-error :deep([data-slot='ff-label']) {
  line-height: 0.875rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ff.ff-error :deep(input),
.ff.ff-error :deep(textarea),
.ff.ff-error :deep([role='combobox']),
.ff.ff-error :deep(button[aria-haspopup='dialog']) {
  border-color: var(--destructive);
}
</style>
