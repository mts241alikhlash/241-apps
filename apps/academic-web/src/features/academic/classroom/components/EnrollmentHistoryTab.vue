<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@mts241alikhlash/ui/table'
import { History } from '@lucide/vue'
import { ServiceUnavailable } from '@mts241alikhlash/ui'
import {
  isServiceUnavailable,
  serviceUnavailableMessage,
} from '@mts241alikhlash/web-shared/utils/service-error'
import { studentEnrollmentApi } from '../api/studentEnrollmentApi'
import { enrollmentOutcome } from '../logic/enrollmentOutcome'
import type { StudentEnrollment } from '../types'

const props = defineProps<{
  studentId?: string
}>()

const enrollments = ref<StudentEnrollment[]>([])
const isLoading = ref(false)

const outage = ref<string | null>(null)

async function load() {
  if (!props.studentId) {
    enrollments.value = []
    return
  }

  isLoading.value = true
  outage.value = null
  try {
    const res = await studentEnrollmentApi.getEnrollments({
      studentId: props.studentId,
      limit: 100,
    })
    enrollments.value = res.data.data ?? []
  } catch (err) {
    enrollments.value = []
    if (isServiceUnavailable(err)) {
      outage.value = serviceUnavailableMessage(err)
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
watch(() => props.studentId, load)

function semesterLabel(name?: string) {
  if (name === 'ODD') return 'Ganjil'
  if (name === 'EVEN') return 'Genap'
  return name ?? ''
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
</script>

<template>
  <div class="py-4">
    <div
      v-if="isLoading"
      class="space-y-2"
    >
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>

    <ServiceUnavailable
      v-else-if="outage"
      :message="outage"
      subject="Riwayat kelas"
      :retry="load"
    />

    <div
      v-else-if="enrollments.length === 0"
      class="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground"
    >
      <History class="size-8 opacity-40" />
      <p class="text-sm font-medium text-foreground">Belum ada riwayat kelas</p>
      <p class="max-w-sm text-xs">
        Riwayat muncul setelah siswa didaftarkan ke sebuah kelas.
      </p>
    </div>

    <div
      v-else
      class="overflow-x-auto rounded-xl border bg-background shadow-xs"
    >
      <Table class="min-w-[640px]">
        <TableHeader class="bg-muted/50">
          <TableRow>
            <TableHead class="text-xs font-semibold w-[140px]">
              Tahun Ajaran
            </TableHead>
            <TableHead class="text-xs font-semibold w-[110px]">Kelas</TableHead>
            <TableHead class="text-center text-xs font-semibold w-[140px]">
              Status
            </TableHead>
            <TableHead class="text-center text-xs font-semibold w-[120px]">
              Berakhir
            </TableHead>
            <TableHead class="text-xs font-semibold">Catatan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="row in enrollments"
            :key="row.id"
            class="hover:bg-muted/30"
          >
            <TableCell class="py-2.5 text-xs font-medium">
              {{ row.semester?.academicYear?.name ?? '-' }}
              <span class="block text-[11px] text-muted-foreground">
                {{ semesterLabel(row.semester?.type?.name) }}
              </span>
            </TableCell>
            <TableCell class="py-2.5 text-xs">
              {{ row.classroom?.displayName ?? '-' }}
            </TableCell>
            <TableCell class="text-center py-2.5">
              <Badge
                :variant="enrollmentOutcome(row.status).variant"
                class="text-[11px] shadow-none"
              >
                {{ enrollmentOutcome(row.status).label }}
              </Badge>
            </TableCell>
            <TableCell
              class="text-center py-2.5 text-xs text-muted-foreground tabular-nums"
            >
              {{ formatDate(row.endedAt) }}
            </TableCell>
            <TableCell class="py-2.5 text-xs">
              <span
                v-if="row.note"
                :class="
                  enrollmentOutcome(row.status).noteIsAReason
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                "
              >
                {{ row.note }}
              </span>
              <span
                v-else
                class="text-muted-foreground/50"
              >
                -
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
