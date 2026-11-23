<script setup lang="ts">
import { Button } from '@mts241alikhlash/ui/button'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main
    class="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 p-6"
  >
    <h1 class="text-xl font-semibold">Ujian selesai</h1>
    <p class="text-control text-muted-foreground">
      Jawabanmu sudah tersimpan. Tutup Safe Exam Browser lewat menu keluar atau
      minta pengawas membantumu keluar.
    </p>
    <Button
      variant="outline"
      @click="router.replace({ name: 'student-exam-list' })"
    >
      Kembali ke daftar ujian
    </Button>
  </main>
</template>
