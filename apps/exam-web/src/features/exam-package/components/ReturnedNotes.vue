<script setup lang="ts">
import type { PackageReview } from '../types'

defineProps<{ review: PackageReview | null }>()
</script>

<template>
  <div
    v-if="review"
    class="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
    role="alert"
  >
    <p>Dikembalikan oleh penyetuju</p>
    <p>{{ review.note }}</p>
    <p
      v-if="review.questionNotes.length > 0"
      class="text-muted-foreground"
    >
      {{ review.questionNotes.length }} soal diberi catatan, lihat di daftar
      soal.
    </p>
  </div>
</template>
