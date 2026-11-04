<script setup lang="ts">
import { onMounted, ref, useId } from 'vue'
import { DatePicker, FormattedNumberInput } from '@mts241alikhlash/ui'
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
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
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

const props = defineProps<{ open: boolean; schedule: MakeupOrigin }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: [id: string]
}>()

const form = useMakeupForm(props.schedule)
const packages = ref<ExamPackageSummary[]>([])
const fieldId = useId()

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

async function create() {
  const created = await form.submit()
  if (created) {
    emit('created', created.id)
    emit('update:open', false)
  }
}
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
      <DialogBody class="min-h-0 flex-1 space-y-4 overflow-y-auto">
        <div
          v-if="form.error.value"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
          role="alert"
        >
          {{ form.error.value }}
        </div>

        <div
          v-if="form.loadError.value"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
          role="alert"
        >
          {{ form.loadError.value }}
        </div>
        <p
          v-else-if="!form.loading.value && form.absentees.value.length === 0"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
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
            <span
              class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
            >
              {{ form.selected.value.size }} siswa dipilih
            </span>
          </div>
          <ul class="max-h-64 divide-y overflow-y-auto rounded-md border">
            <li
              v-for="row in form.absentees.value"
              :key="row.studentId"
              class="flex items-center gap-3 p-3 text-[length:var(--text-control,0.75rem)]"
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

        <div class="grid gap-5 sm:grid-cols-2">
          <FloatingLabelField
            label="Alasan untuk semua"
            :for="`${fieldId}-reason`"
            floating
          >
            <Select v-model="form.reason.value">
              <SelectTrigger
                :id="`${fieldId}-reason`"
                class="w-full"
              >
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
          </FloatingLabelField>
          <FloatingLabelField
            label="Paket"
            :for="`${fieldId}-package`"
            floating
          >
            <Select v-model="form.packageId.value">
              <SelectTrigger
                :id="`${fieldId}-package`"
                class="w-full"
              >
                <SelectValue placeholder="Pilih paket" />
              </SelectTrigger>
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
          </FloatingLabelField>
          <FloatingLabelField
            label="Tanggal"
            :for="`${fieldId}-date`"
            floating
          >
            <DatePicker
              :id="`${fieldId}-date`"
              v-model="form.date.value"
              allow-future-dates
            />
          </FloatingLabelField>
          <FloatingLabelField
            label="Durasi"
            :for="`${fieldId}-duration`"
            floating
          >
            <FormattedNumberInput
              :id="`${fieldId}-duration`"
              v-model="form.durationMinutes.value"
              numeric
              suffix=" menit"
              :max-digits="4"
            />
          </FloatingLabelField>
          <FloatingLabelField
            label="Jam mulai"
            :for="`${fieldId}-start`"
            floating
          >
            <Input
              :id="`${fieldId}-start`"
              v-model="form.startTime.value"
              type="time"
            />
          </FloatingLabelField>
          <FloatingLabelField
            label="Jam selesai"
            :for="`${fieldId}-end`"
            floating
          >
            <Input
              :id="`${fieldId}-end`"
              v-model="form.endTime.value"
              type="time"
            />
          </FloatingLabelField>
        </div>
        <p
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Untuk UTS dan UAS, salin paketnya dan ganti sebagian soal agar soal
          susulan berbeda dari ujian utama.
        </p>
        <p
          v-if="form.problem.value"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          {{ form.problem.value }}
        </p>
      </DialogBody>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          type="button"
          :disabled="form.problem.value !== null || form.saving.value"
          @click="create"
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
