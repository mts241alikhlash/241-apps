<script setup lang="ts">
import type { Classroom, Semester } from '../types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import { Pencil } from '@lucide/vue'

defineProps<{
  currentClassroom: Classroom | null
  activeSemester: Semester | null
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  manage: []
}>()
</script>

<template>
  <Card gap="none">
    <CardHeader standard>
      <CardTitle size="md">Informasi Kelas</CardTitle>
      <Button
        v-if="isAdmin"
        variant="outline"
        size="sm"
        @click="emit('manage')"
      >
        <Pencil class="h-3.5 w-3.5 mr-1.5" />
        Edit
      </Button>
    </CardHeader>
    <CardContent
      variant="standard"
      class="space-y-3 text-sm"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-muted-foreground">Nama</span>
          <span class="font-medium text-right">{{
            currentClassroom?.displayName ?? '-'
          }}</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-muted-foreground">Alias</span>
          <span class="font-medium text-right">{{
            currentClassroom?.name || '-'
          }}</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-muted-foreground">Tingkat</span>
          <Badge
            variant="outline"
            class="text-right"
            >{{
              currentClassroom?.grade?.name ??
              currentClassroom?.classroomLevel?.name ??
              '-'
            }}</Badge
          >
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-muted-foreground">Kapasitas</span>
          <span class="font-medium text-right">{{
            currentClassroom?.capacity ?? '-'
          }}</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-muted-foreground">Tahun Ajaran</span>
          <span class="font-medium text-right">{{
            currentClassroom?.academicYear?.name ?? '-'
          }}</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-muted-foreground">Semester</span>
          <span class="font-medium text-right">{{
            activeSemester?.type?.name === 'ODD'
              ? 'Ganjil'
              : activeSemester?.type?.name === 'EVEN'
                ? 'Genap'
                : '-'
          }}</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-muted-foreground">Status</span>
          <Badge
            :variant="currentClassroom?.isActive ? 'default' : 'secondary'"
            class="text-right"
          >
            {{ currentClassroom?.isActive ? 'Aktif' : 'Nonaktif' }}
          </Badge>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
