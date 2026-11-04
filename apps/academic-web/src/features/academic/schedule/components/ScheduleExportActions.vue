<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import { ImageDown, Printer } from '@lucide/vue'
import { toast } from 'vue-sonner'
import SchedulePrintSheet from './SchedulePrintSheet.vue'
import { drawScheduleImage } from '../logic/drawScheduleImage'
import type { ScheduleSheet } from '../logic/scheduleSheet'

const props = defineProps<{
  sheet: ScheduleSheet
  disabled?: boolean
}>()

const printSheet = ref<InstanceType<typeof SchedulePrintSheet> | null>(null)

const fileName = computed(() => {
  const slug = `${props.sheet.title} ${props.sheet.subtitle}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'jadwal'}.png`
})

function print() {
  void printSheet.value?.print()
}

function saveImage() {
  const dataUrl = drawScheduleImage(props.sheet)
  if (!dataUrl) {
    toast.error('Gagal membuat gambar jadwal di peramban ini.')
    return
  }

  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName.value
  link.click()

  toast.success(`Gambar jadwal disimpan sebagai ${fileName.value}`)
}
</script>

<template>
  <div class="flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      :disabled="props.disabled"
      @click="print"
    >
      <Printer class="size-4" />
      Cetak
    </Button>

    <Button
      variant="outline"
      size="sm"
      :disabled="props.disabled"
      @click="saveImage"
    >
      <ImageDown class="size-4" />
      Simpan Gambar
    </Button>

    <SchedulePrintSheet
      ref="printSheet"
      :sheet="props.sheet"
    />
  </div>
</template>
