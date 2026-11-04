<script setup lang="ts">
import { computed } from 'vue'
import { Check, TriangleAlert } from '@lucide/vue'

const props = defineProps<{
  steps: readonly string[]
  currentStep: number
  disabled: boolean
  flagged?: readonly number[]
}>()

defineEmits<{ select: [index: number] }>()

const mobileStart = computed(() =>
  Math.max(0, Math.min(props.currentStep - 1, props.steps.length - 3)),
)

function visibleOnMobile(index: number) {
  return index >= mobileStart.value && index < mobileStart.value + 3
}
</script>

<template>
  <ol
    class="mx-auto flex w-full max-w-xl items-center justify-center py-2"
    aria-label="Langkah formulir"
  >
    <li
      v-for="(step, index) in steps"
      :key="step"
      class="flex min-w-0 flex-none items-center sm:flex-1 sm:last:flex-none"
      :class="!visibleOnMobile(index) ? 'hidden sm:flex' : ''"
    >
      <button
        type="button"
        :disabled="disabled"
        :aria-current="index === currentStep ? 'step' : undefined"
        class="flex size-[var(--control-h-md,1.75rem)] shrink-0 items-center justify-center rounded-full border text-[length:var(--text-control,0.75rem)] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :class="
          flagged?.includes(index)
            ? index === currentStep
              ? 'border-destructive bg-destructive text-white'
              : 'border-destructive text-destructive hover:bg-destructive/10'
            : index === currentStep
              ? 'border-primary bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:border-primary'
        "
        @click="$emit('select', index)"
      >
        <TriangleAlert
          v-if="flagged?.includes(index)"
          class="size-[var(--icon-control,0.875rem)]"
          aria-hidden="true"
        />
        <Check
          v-else-if="index < currentStep"
          class="size-[var(--icon-control,0.875rem)]"
          aria-hidden="true"
        />
        <span v-else>{{ index + 1 }}</span>
        <span class="sr-only"
          >. {{ step
          }}{{ flagged?.includes(index) ? ', perlu diperbaiki' : '' }}</span
        >
      </button>
      <span
        v-if="index < steps.length - 1"
        data-test="step-connector"
        aria-hidden="true"
        class="mx-1 h-0.5 w-3 shrink-0 bg-muted sm:mx-2 sm:w-auto sm:flex-1"
        :class="!visibleOnMobile(index + 1) ? 'hidden sm:block' : ''"
      />
    </li>
  </ol>
</template>
