<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { FloatingField, FormControl } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { examActivityApi } from '../api/examActivityApi'
import {
  ACTIVITY_STATUSES,
  activityStatusLabel,
  type ActivityStatus,
  type ExamActivityRecord,
} from '../types'

const props = defineProps<{
  open: boolean
  activity: ExamActivityRecord | null
  presetStatus?: ActivityStatus
}>()

const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [] }>()

const PACKAGE_REQUIRED: ActivityStatus[] = ['ACTIVE']

const formSchema = toTypedSchema(
  z.object({
    status: z.enum(ACTIVITY_STATUSES, {
      errorMap: () => ({ message: 'Status wajib dipilih' }),
    }),
  }),
)

const endedAndOpen = (item: ExamActivityRecord | null): boolean =>
  item !== null &&
  item.status !== 'CLOSED' &&
  Date.now() >= new Date(item.endsAt).getTime()

const initialStatus = (item: ExamActivityRecord | null): ActivityStatus =>
  endedAndOpen(item)
    ? 'CLOSED'
    : (props.presetStatus ?? item?.status ?? 'DRAFT')

const { handleSubmit, isSubmitting, values, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: { status: initialStatus(props.activity) },
})

const saveError = ref<string | null>(null)

watch(
  () => [props.open, props.activity?.id] as const,
  () => {
    saveError.value = null
    resetForm({ values: { status: initialStatus(props.activity) } })
  },
)

const isOffline = computed(() => props.activity?.deliveryMode === 'OFFLINE')

const needsPackage = computed(
  () => !isOffline.value && props.activity?.packageId === null,
)

const sharesWithoutPackage = computed(
  () => needsPackage.value && values.status === 'SCHEDULED',
)

const windowState = computed<'before' | 'during' | 'after'>(() => {
  const item = props.activity
  if (item === null) return 'during'
  const now = Date.now()
  if (now < new Date(item.startsAt).getTime()) return 'before'
  return now >= new Date(item.endsAt).getTime() ? 'after' : 'during'
})

const stopsRunning = computed(
  () =>
    props.activity?.status === 'ACTIVE' &&
    values.status !== undefined &&
    values.status !== 'ACTIVE',
)

const opensBefore = computed(
  () =>
    !isOffline.value &&
    values.status === 'ACTIVE' &&
    windowState.value === 'before',
)

const opensAfter = computed(
  () =>
    !isOffline.value &&
    values.status !== 'CLOSED' &&
    windowState.value === 'after',
)

const onSubmit = handleSubmit(async (form) => {
  const item = props.activity
  if (item === null) return
  saveError.value = null
  try {
    await examActivityApi.updateStatus(item.id, form.status)
  } catch (err: unknown) {
    saveError.value = messageOf(err, 'Status kegiatan gagal disimpan.')
    return
  }
  toast.success('Status kegiatan disimpan.')
  emit('saved')
  emit('update:open', false)
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent
      size="md"
      @open-auto-focus.prevent
    >
      <DialogHeader standard>
        <DialogTitle>Ubah Status Kegiatan</DialogTitle>
        <DialogDescription>
          Pilih status kegiatan {{ activity?.subjectName ?? '' }}.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <Alert
          v-if="saveError"
          variant="destructive"
        >
          <AlertDescription>{{ saveError }}</AlertDescription>
        </Alert>
        <Alert v-if="isOffline">
          <AlertDescription>
            Ujian offline tidak dibuka di aplikasi. Status hanya menandai jadwal
            terbagi, berlangsung, atau selesai.
          </AlertDescription>
        </Alert>
        <Alert v-else-if="sharesWithoutPackage">
          <AlertDescription>
            Jadwal dibagikan tanpa paket soal; ujian baru bisa dibuka setelah
            paket dipasang.
          </AlertDescription>
        </Alert>
        <Alert
          v-if="stopsRunning"
          variant="destructive"
        >
          <AlertDescription>
            Menghentikan kegiatan aktif akan mengumpulkan sesi yang masih
            berjalan.
          </AlertDescription>
        </Alert>
        <Alert v-else-if="opensAfter">
          <AlertDescription>
            Jendela waktu kegiatan ini sudah berakhir, jadi siswa tidak bisa
            masuk. Kegiatan yang sudah selesai sebaiknya berstatus Ditutup.
          </AlertDescription>
        </Alert>
        <Alert v-else-if="opensBefore">
          <AlertDescription>
            Kegiatan belum waktunya. Siswa baru bisa masuk saat jendela waktu
            dibuka.
          </AlertDescription>
        </Alert>

        <form
          id="activity-status-form"
          class="grid gap-4"
          @submit.prevent="onSubmit"
        >
          <FloatingField
            v-slot="{ value, handleChange }"
            name="status"
            label="Status"
            required
          >
            <div class="content-start">
              <Select
                :model-value="value"
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger
                    class="w-full"
                    :title="needsPackage ? 'Pasang paket soal dulu' : undefined"
                  >
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="option in ACTIVITY_STATUSES"
                    :key="option"
                    :value="option"
                    :disabled="
                      needsPackage && PACKAGE_REQUIRED.includes(option)
                    "
                  >
                    {{ activityStatusLabel(option) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>
          <p
            v-if="needsPackage"
            class="text-control text-muted-foreground"
          >
            Pasang paket soal dulu untuk memakai status Berlangsung.
          </p>
        </form>
      </DialogBody>
      <DialogFooter standard>
        <Button
          type="button"
          variant="outline"
          :disabled="isSubmitting"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="activity-status-form"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Menyimpan…' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
