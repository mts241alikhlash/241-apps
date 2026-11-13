<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
}>()
</script>

<template>
  <header
    class="flex h-44 flex-col items-center justify-center gap-2 bg-primary px-6 text-center text-primary-foreground"
  >
    <p
      class="text-[length:var(--text-control)] font-medium uppercase tracking-wider"
    >
      {{ eyebrow }}
    </p>
    <h1 class="line-clamp-2 text-lg font-semibold">
      {{ title }}
    </h1>
    <span
      class="mt-1 h-0.5 w-8 bg-amber-400"
      aria-hidden="true"
    />
  </header>
</template>
