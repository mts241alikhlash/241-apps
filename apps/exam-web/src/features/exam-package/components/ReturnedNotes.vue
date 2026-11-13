<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from '@mts241alikhlash/ui/alert'
import type { PackageReview } from '../types'

defineProps<{ review: PackageReview | null }>()
</script>

<template>
  <Alert
    v-if="review"
    variant="destructive"
    class="grid-cols-1"
  >
    <AlertTitle>Dikembalikan oleh penyetuju</AlertTitle>
    <AlertDescription class="space-y-1">
      <p>{{ review.note }}</p>
      <p
        v-if="review.questionNotes.length > 0"
        class="text-muted-foreground"
      >
        {{ review.questionNotes.length }} soal diberi catatan, lihat di daftar
        soal.
      </p>
    </AlertDescription>
  </Alert>
</template>
