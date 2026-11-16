<script lang="ts" setup>
import type { ToasterProps } from 'vue-sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from '@lucide/vue'
import { Toaster as Sonner } from 'vue-sonner'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<ToasterProps>()
</script>

<template>
  <Sonner
    :class="cn('toaster group', props.class)"
    :style="{
      fontFamily: 'var(--font-sans)',
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius-md)',
    }"
    v-bind="props"
  >
    <template #success-icon>
      <CircleCheckIcon class="size-[var(--icon-control,0.875rem)]" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-[var(--icon-control,0.875rem)]" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-[var(--icon-control,0.875rem)]" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="size-[var(--icon-control,0.875rem)]" />
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon class="size-[var(--icon-control,0.875rem)] animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-[var(--icon-control,0.875rem)]" />
    </template>
  </Sonner>
</template>

<style>
.toaster [data-sonner-toast] {
  gap: 0.5rem !important;
  padding: 0.625rem 0.75rem !important;
  font-size: var(--text-control, 0.75rem) !important;
}

.toaster [data-sonner-toast] [data-title] {
  font-size: var(--text-control, 0.75rem) !important;
  font-weight: 500 !important;
}

.toaster [data-sonner-toast] [data-description] {
  font-size: var(--text-control, 0.75rem) !important;
}

.toaster [data-sonner-toast] [data-button] {
  height: var(--control-h-sm, 1.5rem) !important;
  font-size: var(--text-control, 0.75rem) !important;
}
</style>
