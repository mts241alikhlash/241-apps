<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useRoleGuard } from '@mts241alikhlash/platform/auth'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Separator } from '@mts241alikhlash/ui/separator'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import {
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  UserCheck,
  UserX,
} from '@lucide/vue'
import TodayLessonsCard from './TodayLessonsCard.vue'
import type { MyStudentDashboard } from '../types'

const props = defineProps<{
  data: MyStudentDashboard
  isWeeklyHoliday: boolean
  loading?: boolean
}>()

const { can } = useRoleGuard()
const canOpenOwnReportCard = computed(() => can('report-cards.read-own'))
const canOpenOwnScores = computed(() => can('student-scores.read-own'))

const classroomLabel = computed(() => {
  const classroom = props.data.classroom
  if (!classroom) return null
  return classroom.name
    ? `${classroom.code} – ${classroom.name}`
    : classroom.code
})

const attendanceItems = computed(() => {
  const recap = props.data.attendance
  return [
    {
      key: 'present',
      label: 'Hadir',
      value: recap.present,
      icon: UserCheck,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      valueColor: 'text-success',
    },
    {
      key: 'absent',
      label: 'Alpha',
      value: recap.absent,
      icon: UserX,
      iconColor: 'text-destructive',
      bgColor: 'bg-destructive/10',
      valueColor: 'text-destructive',
    },
    {
      key: 'late',
      label: 'Terlambat',
      value: recap.late,
      icon: Clock,
      iconColor: 'text-warning',
      bgColor: 'bg-warning/10',
      valueColor: 'text-warning',
    },
    {
      key: 'excused',
      label: 'Izin',
      value: recap.excused,
      icon: FileText,
      iconColor: 'text-info',
      bgColor: 'bg-info/10',
      valueColor: 'text-info',
    },
    {
      key: 'sick',
      label: 'Sakit',
      value: recap.sick,
      icon: FileText,
      iconColor: 'text-muted-foreground',
      bgColor: 'bg-muted/30',
      valueColor: 'text-muted-foreground',
    },
  ]
})

const totalAttendance = computed(() =>
  attendanceItems.value.reduce((sum, item) => sum + item.value, 0),
)
</script>

<template>
  <div class="space-y-4">
    <Card class="shadow-none">
      <CardContent variant="standard">
        <div
          v-if="loading"
          class="space-y-3"
        >
          <Skeleton class="h-4 w-20" />
          <Skeleton class="h-6 w-48" />
        </div>
        <div
          v-else
          class="flex items-center gap-3"
        >
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"
          >
            <GraduationCap class="size-4 text-primary" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-muted-foreground">Kelas Anda</p>
            <p class="truncate text-base font-semibold">
              {{ classroomLabel ?? 'Belum terdaftar di kelas' }}
            </p>
          </div>
          <Button
            v-if="data.latestReportCard && canOpenOwnReportCard"
            as-child
            variant="outline"
          >
            <RouterLink :to="{ name: 'my-rapor' }">
              <FileText class="size-4" />
              Rapor {{ data.latestReportCard.semesterName }}
            </RouterLink>
          </Button>
        </div>
      </CardContent>
    </Card>

    <Separator />

    <div class="grid gap-4 lg:grid-cols-2">
      <TodayLessonsCard
        :lessons="data.todayLessons"
        :is-weekly-holiday="isWeeklyHoliday"
        :loading="loading"
      />

      <div class="space-y-4">
        <Card
          gap="none"
          class="shadow-none"
        >
          <CardHeader standard>
            <div class="flex items-center gap-2">
              <UserCheck class="size-4 text-muted-foreground" />
              <CardTitle size="md">Rekap Kehadiran</CardTitle>
            </div>
          </CardHeader>
          <CardContent variant="standard">
            <div
              v-if="loading"
              class="grid grid-cols-2 gap-3 sm:grid-cols-5"
            >
              <Skeleton
                v-for="i in 5"
                :key="i"
                class="h-16 w-full rounded-lg"
              />
            </div>
            <p
              v-else-if="totalAttendance === 0"
              class="py-6 text-center text-control text-muted-foreground"
            >
              Belum ada catatan kehadiran semester ini.
            </p>
            <div
              v-else
              class="grid grid-cols-2 gap-3 sm:grid-cols-5"
            >
              <div
                v-for="item in attendanceItems"
                :key="item.key"
                class="flex flex-col items-center rounded-lg border px-3 py-3"
                :class="item.bgColor"
              >
                <component
                  :is="item.icon"
                  class="mb-1 size-4"
                  :class="item.iconColor"
                />
                <p
                  class="text-xl font-semibold tabular-nums"
                  :class="item.valueColor"
                >
                  {{ item.value }}
                </p>
                <p class="text-xs font-medium text-muted-foreground">
                  {{ item.label }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          gap="none"
          class="shadow-none"
        >
          <CardHeader standard>
            <div class="flex w-full items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <ClipboardList class="size-4 text-muted-foreground" />
                <CardTitle size="md">Nilai Terbaru</CardTitle>
              </div>
              <RouterLink
                v-if="canOpenOwnScores"
                :to="{ name: 'my-scores' }"
                class="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Lihat Semua
                <ChevronRight class="size-3.5" />
              </RouterLink>
            </div>
          </CardHeader>
          <CardContent variant="standard">
            <div
              v-if="loading"
              class="space-y-2"
            >
              <Skeleton
                v-for="i in 3"
                :key="i"
                class="h-[var(--control-h-lg,2.25rem)] w-full rounded-lg"
              />
            </div>
            <p
              v-else-if="data.latestScores.length === 0"
              class="py-6 text-center text-control text-muted-foreground"
            >
              Belum ada nilai yang masuk.
            </p>
            <ul
              v-else
              class="space-y-2"
            >
              <li
                v-for="score in data.latestScores"
                :key="score.id"
                class="flex items-center gap-3 rounded-lg border px-4 py-2"
              >
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">
                    {{ score.subjectName }}
                  </p>
                  <p class="truncate text-xs text-muted-foreground">
                    {{ score.assessmentName }}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  class="shrink-0"
                >
                  {{ score.score ?? '-' }} / {{ score.maxScore }}
                </Badge>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
