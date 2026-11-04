<script setup lang="ts">
import { Card, CardHeader, CardTitle } from '@mts241alikhlash/ui/card'
import { AppCombobox } from '@mts241alikhlash/ui'
import type { ComboboxOption } from '@mts241alikhlash/ui'

defineProps<{
  isAdmin: boolean
  isPersonal: boolean
  selectedClassroomId: string
  options: ComboboxOption[]
}>()

const emit = defineEmits<{
  classroomChange: [classroomId: string]
}>()

function onClassroomChange(val: string | null) {
  if (val) {
    emit('classroomChange', val)
  }
}
</script>

<template>
  <Card
    gap="none"
    class="overflow-hidden"
  >
    <CardHeader standard>
      <div>
        <CardTitle size="lg">
          {{ isPersonal ? 'Jadwal Mengajar' : 'Jadwal Pelajaran' }}
        </CardTitle>
        <p class="text-sm text-muted-foreground mt-0.5">
          {{
            isPersonal
              ? 'Jadwal mengajar Anda selama seminggu'
              : 'Jadwal pelajaran per kelas selama seminggu'
          }}
        </p>
      </div>
      <div
        v-if="isAdmin"
        class="w-full sm:w-auto sm:min-w-[240px]"
      >
        <AppCombobox
          :model-value="selectedClassroomId"
          :options="options"
          placeholder="Pilih kelas..."
          search-placeholder="Cari kelas..."
          empty-text="Kelas tidak ditemukan."
          @update:model-value="onClassroomChange"
        />
      </div>
    </CardHeader>
  </Card>
</template>
