<script setup lang="ts">
import { computed } from 'vue'
import { presentValue } from '../utils'

const props = withDefaults(
  defineProps<{
    label: string
    value?: string | number | null
    wrap?: 'words' | 'all'
  }>(),
  { value: null, wrap: 'words' },
)

const text = computed(() => presentValue(props.value))
const empty = computed(() => text.value === presentValue(null))
</script>

<template>
  <div
    class="grid grid-cols-[minmax(0,40%)_minmax(0,1fr)] items-start gap-x-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-2"
  >
    <dt
      class="min-w-0 break-words text-muted-foreground sm:flex sm:justify-between sm:gap-2 sm:after:content-[':']"
    >
      {{ label }}
    </dt>
    <dd
      class="min-w-0 text-right sm:text-left"
      :class="[
        wrap === 'all' ? 'break-all' : 'break-words',
        empty && !$slots.default ? 'text-muted-foreground' : '',
      ]"
    >
      <slot>{{ text }}</slot>
    </dd>
  </div>
</template>
