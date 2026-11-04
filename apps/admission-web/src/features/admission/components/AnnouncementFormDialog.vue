<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { FormControl } from '@mts241alikhlash/ui/form'
import FloatingField from './AdmissionField.vue'
import { Loader2 } from '@lucide/vue'
import type {
  AdmissionAnnouncement,
  AdmissionWaveSummary,
  AnnouncementSavePayload,
} from '../types'

const ALL_WAVES = 'ALL'

const props = defineProps<{
  open: boolean
  announcement: AdmissionAnnouncement | null
  isSaving: boolean
  waves: AdmissionWaveSummary[]
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'save', payload: AnnouncementSavePayload): void
}>()

const isEdit = computed(() => !!props.announcement)

const formSchema = toTypedSchema(
  z.object({
    title: z.string().min(1, 'Judul wajib diisi'),
    content: z.string().min(1, 'Isi pengumuman wajib diisi'),
    waveId: z.string().default(ALL_WAVES),
  }),
)

interface AnnouncementFormValues {
  title: string
  content: string
  waveId: string
}

const { handleSubmit, resetForm } = useForm<AnnouncementFormValues>({
  validationSchema: formSchema,
})

watch(
  () => [props.open, props.announcement],
  () => {
    if (!props.open) return
    resetForm({
      values: {
        title: props.announcement?.title ?? '',
        content: props.announcement?.content ?? '',
        waveId: props.announcement?.waveId ?? ALL_WAVES,
      },
    })
  },
  { immediate: true },
)

const onSubmit = handleSubmit((values) => {
  emit('save', {
    title: values.title.trim(),
    content: values.content.trim(),
    waveId: values.waveId === ALL_WAVES ? undefined : values.waveId,
  })
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>
          {{ isEdit ? 'Ubah Pengumuman' : 'Buat Pengumuman' }}
        </DialogTitle>
        <DialogDescription class="sr-only"> </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <form
          id="announcement-form"
          class="space-y-2 dialog-body"
          @submit.prevent="onSubmit"
        >
          <FloatingField
            v-slot="{ componentField }"
            name="title"
            label="Judul"
            required
          >
            <FormControl>
              <Input
                v-bind="componentField"
                :disabled="isSaving"
              />
            </FormControl>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="content"
            label="Isi"
            required
          >
            <FormControl>
              <Textarea
                v-bind="componentField"
                class="resize-none"
                :disabled="isSaving"
              />
            </FormControl>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="waveId"
            label="Gelombang"
          >
            <Select
              :model-value="value"
              :disabled="isSaving"
              @update:model-value="handleChange"
            >
              <FormControl>
                <SelectTrigger class="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem :value="ALL_WAVES">Semua Gelombang</SelectItem>
                <SelectItem
                  v-for="wave in waves"
                  :key="wave.id"
                  :value="wave.id"
                >
                  {{ wave.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingField>
        </form>
      </div>

      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="isSaving"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="announcement-form"
          variant="default"
          :disabled="isSaving"
        >
          <Loader2
            v-if="isSaving"
            class="size-4 mr-1.5 animate-spin"
          />
          {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
