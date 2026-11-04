<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mts241alikhlash/ui/alert-dialog'

defineProps<{
  disabled: boolean
  submitting: boolean
  size?: 'default' | 'sm'
}>()

const emit = defineEmits<{ confirm: [] }>()

const open = ref(false)
</script>

<template>
  <Button
    :size="size"
    :disabled="disabled || submitting"
    @click="open = true"
  >
    {{ submitting ? 'Mengirim…' : 'Kirim Formulir' }}
  </Button>
  <AlertDialog v-model:open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Kirim formulir?</AlertDialogTitle>
        <AlertDialogDescription>
          Setelah dikirim, formulir tidak dapat diubah kecuali admin meminta
          revisi.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Periksa lagi</AlertDialogCancel>
        <AlertDialogAction
          data-test="confirm-submit"
          @click="emit('confirm')"
        >
          Kirim
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
