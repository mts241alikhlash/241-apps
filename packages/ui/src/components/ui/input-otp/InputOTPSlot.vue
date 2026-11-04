<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from '@mts241alikhlash/ui/utils'
import { useForwardProps } from 'reka-ui'
import { computed } from 'vue'
import { useVueOTPContext } from 'vue-input-otp'

const props = defineProps<{ index: number, class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardProps(delegatedProps)

const context = useVueOTPContext()

const slot = computed(() => context?.value.slots[props.index])
</script>

<template>
  <div
    v-bind="forwarded"
    data-slot="input-otp-slot"
    :data-active="slot?.isActive"
    :class="cn('bg-transparent dark:bg-input/30 border-input data-[active=true]:border-ring aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive size-7 border-y border-r text-[length:var(--text-control,0.75rem)] leading-relaxed transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md relative flex items-center justify-center data-[active=true]:z-10', props.class)"
  >
    {{ slot?.char }}
    <div v-if="slot?.hasFakeCaret" class="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div class="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
    </div>
  </div>
</template>
