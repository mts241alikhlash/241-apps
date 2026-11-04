<script setup lang="ts">
import { Check, X } from '@lucide/vue'
import { cn } from '@mts241alikhlash/ui/utils'

export interface StepperStep {
  key: string
  label: string
  caption?: string | null
  status: 'done' | 'current' | 'rejected' | 'upcoming'
}

defineProps<{ steps: StepperStep[] }>()

const dotClass = {
  done: 'bg-primary text-primary-foreground border-primary',
  current:
    'bg-card text-primary border-2 border-primary ring-4 ring-primary/15',
  rejected: 'bg-destructive text-white border-destructive',
  upcoming: 'bg-muted text-muted-foreground border',
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div role="list" class="flex overflow-x-auto pb-2 [scrollbar-width:thin]">
      <div
        v-for="(step, index) in steps"
        :key="step.key"
        role="listitem"
        :data-status="step.status"
        :aria-current="step.status === 'current' ? 'step' : undefined"
        class="relative flex min-w-[108px] flex-1 flex-col items-center gap-2 text-center"
      >
        <span
          v-if="index > 0"
          :class="
            cn(
              'absolute top-[15px] left-[-50%] h-0.5 w-full',
              step.status === 'upcoming' ? 'bg-muted' : 'bg-primary',
            )
          "
        />
        <span
          :class="
            cn(
              'relative z-10 grid size-8 place-items-center rounded-full text-xs font-medium',
              dotClass[step.status],
            )
          "
        >
          <Check v-if="step.status === 'done'" class="size-4" />
          <X v-else-if="step.status === 'rejected'" class="size-4" />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span
          :class="
            cn('px-1 text-xs font-medium', step.status === 'current' && 'font-semibold')
          "
        >
          {{ step.label }}
        </span>
        <span v-if="step.caption" class="text-muted-foreground text-[11px]">
          {{ step.caption }}
        </span>
      </div>
    </div>
    <slot name="note" />
  </div>
</template>
