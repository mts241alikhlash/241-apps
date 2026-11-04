<script setup lang="ts">
defineProps<{ name: string; href?: string }>()
defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <a
    v-if="href"
    :href="href"
    class="text-primary text-left font-medium break-words hover:underline"
    @click="$emit('click', $event)"
  >
    {{ name }}
  </a>
  <button
    v-else
    type="button"
    class="text-primary text-left font-medium break-words hover:underline"
    @click="$emit('click', $event)"
  >
    {{ name }}
  </button>
</template>
