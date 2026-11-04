<script setup lang="ts">
import type { ClassroomStructure } from '../types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Button } from '@mts241alikhlash/ui/button'
import { Settings } from '@lucide/vue'
import { formatEntityName } from '@mts241alikhlash/web-shared/utils/utils'

const props = defineProps<{
  classroomSupervisorLabel: string
  classroomStructure: ClassroomStructure | null
}>()

const emit = defineEmits<{
  manage: []
}>()

function structureOfficerName(
  field: 'president' | 'vicePresident' | 'secretary' | 'treasurer',
): string {
  const officer = props.classroomStructure?.[field]
  if (!officer) return ''
  return formatEntityName(officer.user?.profile?.name ?? '')
}
</script>

<template>
  <Card gap="none">
    <CardHeader standard>
      <CardTitle size="md">Struktur Kelas</CardTitle>
      <Button
        variant="outline"
        size="sm"
        @click="emit('manage')"
      >
        <Settings class="h-3.5 w-3.5 mr-1.5" />
        Kelola
      </Button>
    </CardHeader>
    <CardContent
      variant="standard"
      class="space-y-3 text-sm"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        <div
          class="flex items-center justify-between gap-2 col-span-1 sm:col-span-2 border-b pb-2 mb-1"
        >
          <span class="text-muted-foreground">Wali Kelas</span>
          <span class="font-medium text-right">{{
            classroomSupervisorLabel !== 'Pilih guru...'
              ? classroomSupervisorLabel
              : '-'
          }}</span>
        </div>
        <div
          v-for="item in [
            { label: 'Ketua Kelas', field: 'president' as const },
            { label: 'Wakil Ketua', field: 'vicePresident' as const },
            { label: 'Sekretaris', field: 'secretary' as const },
            { label: 'Bendahara', field: 'treasurer' as const },
          ]"
          :key="item.field"
          class="flex items-center justify-between gap-2"
        >
          <span class="text-muted-foreground">{{ item.label }}</span>
          <span
            :class="[
              'text-right',
              structureOfficerName(item.field)
                ? 'font-medium'
                : 'font-medium text-muted-foreground italic',
            ]"
          >
            {{ structureOfficerName(item.field) || 'Belum diatur' }}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
