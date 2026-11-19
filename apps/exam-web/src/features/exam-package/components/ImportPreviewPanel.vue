<script setup lang="ts">
import { computed } from 'vue'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import type { ImportPreview } from '@/features/exam-bank/types'

const props = defineProps<{
  preview: ImportPreview
  confirmDuplicates: boolean
}>()

const emit = defineEmits<{ 'update:confirmDuplicates': [value: boolean] }>()

const typeLabels = [
  { key: 'MULTIPLE_CHOICE', label: 'Pilihan ganda' },
  { key: 'MULTIPLE_RESPONSE', label: 'Pilihan ganda kompleks' },
  { key: 'TRUE_FALSE', label: 'Benar atau salah' },
  { key: 'SHORT_ANSWER', label: 'Isian singkat' },
  { key: 'ESSAY', label: 'Uraian' },
] as const

const counts = computed(() =>
  typeLabels.map(({ key, label }) => ({
    label,
    count: props.preview.counts[key],
    points: props.preview.points[key],
  })),
)

const rowText = (row: number, reason: string) =>
  row > 0 ? `Baris ${row}: ${reason}` : reason

const identity = computed(() => [
  { label: 'Guru', value: props.preview.identity.teacherName },
  { label: 'NIK', value: props.preview.identity.nik },
  { label: 'Mapel', value: props.preview.identity.subjectName },
  {
    label: 'Tingkat',
    value: props.preview.identity.gradeLevel ?? '-',
  },
])
</script>

<template>
  <div
    class="space-y-3"
    data-testid="import-preview"
  >
    <Card gap="none">
      <CardHeader standard>
        <CardTitle size="md">Identitas berkas</CardTitle>
      </CardHeader>
      <CardContent variant="standard">
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2">
          <div
            v-for="item in identity"
            :key="item.label"
            class="flex min-w-0 flex-col gap-0.5"
          >
            <dt class="text-muted-foreground">{{ item.label }}</dt>
            <dd class="truncate font-medium">{{ item.value }}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>

    <Card gap="none">
      <CardHeader standard>
        <CardTitle size="md">Jenis soal</CardTitle>
      </CardHeader>
      <CardContent variant="standard">
        <div
          class="flex items-baseline justify-between gap-4 pb-1 text-muted-foreground"
          aria-hidden="true"
        >
          <span>Jenis</span>
          <span class="flex items-baseline gap-4">
            <span class="w-8 text-right">Soal</span>
            <span class="w-8 text-right">Nilai</span>
          </span>
        </div>
        <dl
          class="space-y-1"
          role="status"
        >
          <div
            v-for="item in counts"
            :key="item.label"
            class="flex items-baseline justify-between gap-4"
          >
            <dt class="text-muted-foreground">{{ item.label }}</dt>
            <dd class="flex items-baseline gap-4">
              <span class="w-8 text-right">{{ item.count }}</span>
              <span class="w-8 text-right text-muted-foreground">
                {{ item.points }}
              </span>
            </dd>
          </div>
          <div
            class="flex items-baseline justify-between gap-4 border-t pt-1 font-medium"
          >
            <dt>Total</dt>
            <dd class="flex items-baseline gap-4">
              <span class="w-8 text-right">{{ preview.total }}</span>
              <span class="w-8 text-right">{{ preview.totalPoints }}</span>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>

    <Card
      v-if="preview.errors.length > 0"
      gap="none"
    >
      <CardHeader standard>
        <CardTitle size="md">Baris bermasalah</CardTitle>
      </CardHeader>
      <CardContent variant="standard">
        <Alert variant="destructive">
          <AlertDescription>
            <ul class="space-y-1">
              <li
                v-for="error in preview.errors"
                :key="`${error.row}-${error.reason}`"
              >
                {{ rowText(error.row, error.reason) }}
              </li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>

    <Card
      v-if="preview.warnings.length > 0"
      gap="none"
    >
      <CardHeader standard>
        <CardTitle size="md">Peringatan</CardTitle>
      </CardHeader>
      <CardContent variant="standard">
        <ul class="space-y-1 text-muted-foreground">
          <li
            v-for="warning in preview.warnings"
            :key="warning"
          >
            {{ warning }}
          </li>
        </ul>
      </CardContent>
    </Card>

    <Card
      v-if="preview.duplicateRows.length > 0"
      gap="none"
    >
      <CardHeader standard>
        <CardTitle size="md">Soal ganda</CardTitle>
      </CardHeader>
      <CardContent
        variant="standard"
        class="space-y-2"
      >
        <p>
          Baris {{ preview.duplicateRows.join(', ') }} berisi soal yang sama.
        </p>
        <label class="flex items-center gap-2">
          <Checkbox
            :model-value="confirmDuplicates"
            aria-label="Simpan walau ada soal ganda"
            @update:model-value="
              emit('update:confirmDuplicates', Boolean($event))
            "
          />
          Simpan walau ada soal ganda
        </label>
      </CardContent>
    </Card>
  </div>
</template>
