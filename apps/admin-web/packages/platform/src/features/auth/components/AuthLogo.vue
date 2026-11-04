<script setup lang="ts">
import { computed } from 'vue'

import { authConfig } from '../config'

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    wordmark?: boolean
  }>(),
  {
    size: 'md',
    wordmark: false,
  },
)

const logoSrc = computed(() =>
  props.wordmark ? '/logo-name.webp' : '/logo.webp',
)

const sizeClasses = computed(() => {
  if (props.wordmark) return 'h-14 w-auto object-contain'
  switch (props.size) {
    case 'sm':
      return 'h-9 w-auto object-contain'
    case 'lg':
      return 'h-48 w-auto object-contain drop-shadow-xl'
    case 'md':
    default:
      return 'h-20 w-auto object-contain'
  }
})
</script>

<template>
  <img
    :src="logoSrc"
    :alt="authConfig.logoAlt"
    :class="sizeClasses"
  />
</template>
