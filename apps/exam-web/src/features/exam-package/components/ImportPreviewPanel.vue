<script setup lang="ts">
import { computed } from 'vue'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import type { ImportPreview } from '@/features/exam-bank/types'

const props = defineProps<{
  preview: ImportPreview
  confirmDuplicates: boolean
}>()

const emit = defineEmits<{
  'update:confirmDuplicates': [value: boolean]
}>()

const typeLabels = [
  { key: 'MULTIPLE_CHOICE', label: 'PG' },
  { key: 'MULTIPLE_RESPONSE', label: 'PG Kompleks' },
  { key: 'TRUE_FALSE', label: 'Benar/Salah' },
  { key: 'SHORT_ANSWER', label: 'Isian' },
  { key: 'ESSAY', label: 'Uraian' },
] as const

const counts = computed(() =>
  typeLabels.map(({ key, label }) => ({
    label,
    count: props.preview.counts[key],
  })),
)

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
    class="space-y-3 rounded-md border p-4 text-[length:var(--text-control,0.75rem)]"
    role="status"
    data-testid="import-preview"
  >
    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      <template
        v-for="item in identity"
        :key="item.label"
      >
        <dt class="text-muted-foreground">{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </template>
    </dl>

    <ul class="flex flex-wrap gap-x-4 gap-y-1">
      <li
        v-for="item in counts"
        :key="item.label"
      >
        {{ item.label }} {{ item.count }}
      </li>
    </ul>
    <p class="font-medium">
      Total soal {{ preview.total }} · Total poin {{ preview.totalPoints }}
    </p>

    <ul
      v-if="preview.errors.length > 0"
      class="space-y-1 text-destructive"
    >
      <li
        v-for="error in preview.errors"
        :key="`${error.row}-${error.reason}`"
      >
        {{ error.row > 0 ? `Baris ${error.row}: ` : '' }}{{ error.reason }}
      </li>
    </ul>

    <ul
      v-if="preview.warnings.length > 0"
      class="space-y-1 text-muted-foreground"
    >
      <li
        v-for="warning in preview.warnings"
        :key="warning"
      >
        {{ warning }}
      </li>
    </ul>

    <div
      v-if="preview.duplicateRows.length > 0"
      class="space-y-2"
    >
      <p>Soal ganda di baris {{ preview.duplicateRows.join(', ') }}</p>
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
    </div>
  </div>
</template>
