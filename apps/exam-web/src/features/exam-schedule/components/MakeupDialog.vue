<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import { DatePicker, FormattedNumberInput } from '@mts241alikhlash/ui'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Button } from '@mts241alikhlash/ui/button'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
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
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import type { ExamPackageSummary } from '@/features/exam-package/types'
import { useMakeupForm } from '../composables/useMakeupForm'
import { examScheduleService } from '../services/examScheduleService'
import type { MakeupOrigin, MakeupReason } from '../types'
import { MAKEUP_REASONS, reasonLabel, refusalLabel } from '../types'
import { toInstant } from '../utils/instant'
import { validateSchedule } from '../utils/validateSchedule'

const props = defineProps<{ open: boolean; schedule: MakeupOrigin }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: [id: string]
}>()

const form = useMakeupForm(props.schedule)
const packages = ref<ExamPackageSummary[]>([])

const formSchema = toTypedSchema(
  z
    .object({
      reason: z.string(),
      packageId: z.string().min(1, 'Paket wajib dipilih'),
      startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
      startTime: z.string().min(1, 'Jam mulai wajib diisi'),
      endDate: z.string().min(1, 'Tanggal selesai wajib diisi'),
      endTime: z.string().min(1, 'Jam selesai wajib diisi'),
      durationMinutes: z
        .number({ invalid_type_error: 'Durasi minimal 1 menit' })
        .int('Durasi minimal 1 menit')
        .min(1, 'Durasi minimal 1 menit')
        .max(1440, 'Durasi maksimal 1440 menit'),
    })
    .superRefine((value, ctx) => {
      if (
        !value.startDate ||
        !value.startTime ||
        !value.endDate ||
        !value.endTime
      ) {
        return
      }
      const problem = validateSchedule({
        startDate: value.startDate,
        startTime: value.startTime,
        endDate: value.endDate,
        endTime: value.endTime,
        durationMinutes: value.durationMinutes,
      })
      if (problem !== null) {
        ctx.addIssue({ code: 'custom', path: ['endTime'], message: problem })
        return
      }
      if (
        new Date(toInstant(value.startDate, value.startTime)).getTime() <
        new Date(props.schedule.endsAt).getTime()
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['startTime'],
          message: 'Susulan harus dimulai setelah ujian utama berakhir',
        })
      }
    }),
)

const { handleSubmit, isSubmitting, values, setFieldValue } = useForm({
  validationSchema: formSchema,
  initialValues: {
    reason: form.reason.value,
    packageId: props.schedule.packageId ?? '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    durationMinutes: props.schedule.durationMinutes,
  },
})

watch(
  values,
  (next) => {
    form.reason.value = (next.reason ?? 'SICK') as MakeupReason
    form.packageId.value = next.packageId ?? ''
    form.startDate.value = next.startDate ?? ''
    form.startTime.value = next.startTime ?? ''
    form.endDate.value = next.endDate ?? ''
    form.endTime.value = next.endTime ?? ''
    form.durationMinutes.value = next.durationMinutes ?? null
  },
  { deep: true, immediate: true },
)

watch(
  () => form.reason.value,
  (next) => setFieldValue('reason', next),
)

onMounted(async () => {
  void form.load()
  const all = await examScheduleService.loadPackages()
  const origin = all.find((item) => item.id === props.schedule.packageId)
  packages.value = origin
    ? all.filter(
        (item) =>
          item.subjectId === origin.subjectId &&
          item.gradeId === origin.gradeId,
      )
    : all
})

const onSubmit = handleSubmit(async () => {
  if (form.selected.value.size === 0) {
    form.error.value = 'Pilih minimal satu siswa'
    return
  }
  const created = await form.submit()
  if (created) {
    toast.success('Ujian susulan dibuat.')
    emit('created', created.id)
    emit('update:open', false)
  }
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>Buat Ujian Susulan</DialogTitle>
        <DialogDescription>
          {{ schedule.packageTitle }} · {{ schedule.classroomName ?? '-' }}
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <Alert
          v-if="form.error.value"
          variant="destructive"
        >
          <AlertDescription>{{ form.error.value }}</AlertDescription>
        </Alert>

        <Alert
          v-if="form.loadError.value"
          variant="destructive"
        >
          <AlertDescription>{{ form.loadError.value }}</AlertDescription>
        </Alert>
        <p
          v-else-if="!form.loading.value && form.absentees.value.length === 0"
          class="text-control text-muted-foreground"
        >
          Tidak ada siswa di kelas ini.
        </p>
        <template v-else>
          <div class="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              @click="form.selectAll()"
            >
              Pilih semua
            </Button>
            <Button
              type="button"
              variant="outline"
              @click="form.clear()"
            >
              Kosongkan
            </Button>
            <span class="text-control text-muted-foreground">
              {{ form.selected.value.size }} siswa dipilih
            </span>
          </div>
          <ul class="max-h-64 divide-y overflow-y-auto rounded-md border">
            <li
              v-for="row in form.absentees.value"
              :key="row.studentId"
              class="flex items-center gap-3 p-3 text-control"
            >
              <Checkbox
                :model-value="form.selected.value.has(row.studentId)"
                :disabled="!row.eligible"
                :aria-label="`Pilih ${row.name ?? row.nis ?? 'siswa'}`"
                @update:model-value="form.toggle(row.studentId)"
              />
              <span class="min-w-0 flex-1">
                {{ row.name ?? 'Siswa tidak ditemukan' }}
                <span
                  v-if="row.nis"
                  class="text-muted-foreground"
                >
                  · {{ row.nis }}
                </span>
              </span>
              <span
                v-if="!row.eligible && row.reason"
                class="text-muted-foreground"
              >
                {{ refusalLabel(row.reason) }}
              </span>
              <template v-if="form.selected.value.has(row.studentId)">
                <Select
                  :model-value="form.reasonOf(row.studentId)"
                  @update:model-value="
                    form.setReason(row.studentId, $event as MakeupReason)
                  "
                >
                  <SelectTrigger class="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="option in MAKEUP_REASONS"
                      :key="option"
                      :value="option"
                    >
                      {{ reasonLabel(option) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  :model-value="form.notes.value[row.studentId] ?? ''"
                  class="w-40"
                  maxlength="200"
                  placeholder="Catatan (opsional)"
                  @update:model-value="
                    form.setNote(row.studentId, String($event ?? ''))
                  "
                />
              </template>
            </li>
          </ul>
        </template>

        <form
          id="makeup-form"
          class="grid gap-4 sm:grid-cols-2"
          @submit.prevent="onSubmit"
        >
          <FloatingField
            v-slot="{ value, handleChange }"
            name="reason"
            label="Alasan untuk semua"
          >
            <div class="content-start">
              <Select
                :model-value="value"
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="option in MAKEUP_REASONS"
                    :key="option"
                    :value="option"
                  >
                    {{ reasonLabel(option) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>
          <FloatingField
            v-slot="{ value, handleChange }"
            name="packageId"
            label="Paket"
            required
          >
            <div class="content-start">
              <Select
                :model-value="value || undefined"
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="item in packages"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.title }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>
          <FloatingField
            v-slot="{ value, handleChange }"
            name="startDate"
            label="Tanggal mulai"
            required
          >
            <div class="content-start">
              <FormControl>
                <DatePicker
                  :model-value="value"
                  allow-future-dates
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>
          <FloatingField
            v-slot="{ componentField }"
            name="startTime"
            label="Jam mulai"
            required
            always-float
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  type="time"
                />
              </FormControl>
            </div>
          </FloatingField>
          <FloatingField
            v-slot="{ value, handleChange }"
            name="endDate"
            label="Tanggal selesai"
            required
          >
            <div class="content-start">
              <FormControl>
                <DatePicker
                  :model-value="value"
                  allow-future-dates
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>
          <FloatingField
            v-slot="{ componentField }"
            name="endTime"
            label="Jam selesai"
            required
            always-float
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  type="time"
                />
              </FormControl>
            </div>
          </FloatingField>
          <FloatingField
            v-slot="{ value, handleChange }"
            name="durationMinutes"
            label="Durasi"
            required
          >
            <div class="content-start">
              <FormControl>
                <FormattedNumberInput
                  :model-value="value"
                  numeric
                  suffix=" menit"
                  :max-digits="4"
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>
        </form>
        <p class="text-control text-muted-foreground">
          Untuk UTS dan UAS, salin paketnya dan ganti sebagian soal agar soal
          susulan berbeda dari ujian utama.
        </p>
      </DialogBody>
      <DialogFooter standard>
        <Button
          type="button"
          variant="outline"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="makeup-form"
          :disabled="isSubmitting || form.saving.value"
        >
          {{
            form.selected.value.size > 0
              ? `Buat susulan (${form.selected.value.size})`
              : 'Buat susulan'
          }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
