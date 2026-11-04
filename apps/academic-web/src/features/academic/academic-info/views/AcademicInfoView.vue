<script setup lang="ts">
import { onMounted } from 'vue'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import { CalendarDays, BookOpen } from '@lucide/vue'
import { useAcademicInfo } from '../composables/useAcademicInfo'

const {
  todayLabel,
  todayLessons,
  upcomingEvents,
  isLoadingSchedule,
  isLoadingEvents,
  init,
} = useAcademicInfo()

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

onMounted(init)
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <BookOpen class="size-5 text-primary" />
          <div>
            <CardTitle size="md"> Jadwal Hari Ini </CardTitle>
            <p class="text-sm text-muted-foreground mt-0.5">{{ todayLabel }}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent variant="standard">
        <div
          v-if="isLoadingSchedule"
          class="space-y-3"
        >
          <Skeleton
            v-for="i in 4"
            :key="i"
            class="h-14 w-full rounded-xl"
          />
        </div>
        <div
          v-else-if="todayLessons.length === 0"
          class="text-center text-sm text-muted-foreground py-10 border border-dashed rounded-xl"
        >
          Tidak ada pelajaran hari ini.
        </div>
        <div
          v-else
          class="space-y-3"
        >
          <div
            v-for="row in todayLessons"
            :key="row.timeSlot.id"
            class="flex items-center gap-4 rounded-xl border bg-muted/30 px-4 py-3"
          >
            <div
              class="flex flex-col items-center justify-center min-w-[56px] text-center"
            >
              <span class="text-xs font-semibold text-primary">{{
                row.timeSlot.startTime
              }}</span>
              <span class="text-[10px] text-muted-foreground">{{
                row.timeSlot.endTime
              }}</span>
            </div>
            <div class="h-8 w-px bg-border" />
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-sm truncate">
                {{ row.lesson?.subject?.name ?? '-' }}
              </p>
              <p class="text-xs text-muted-foreground truncate">
                {{
                  row.lesson?.employee?.user?.profile?.name ??
                  'Guru belum diatur'
                }}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="grid gap-6">
      <Card
        gap="none"
        class="overflow-hidden"
      >
        <CardHeader standard>
          <div class="flex items-center gap-3">
            <CalendarDays class="size-5 text-primary" />
            <CardTitle size="md"> Kegiatan Mendatang </CardTitle>
          </div>
        </CardHeader>
        <CardContent variant="standard">
          <div
            v-if="isLoadingEvents"
            class="space-y-3"
          >
            <Skeleton
              v-for="i in 3"
              :key="i"
              class="h-14 w-full rounded-xl"
            />
          </div>
          <div
            v-else-if="upcomingEvents.length === 0"
            class="text-center text-sm text-muted-foreground py-10 border border-dashed rounded-xl"
          >
            Tidak ada kegiatan mendatang.
          </div>
          <div
            v-else
            class="space-y-3"
          >
            <div
              v-for="event in upcomingEvents"
              :key="event.id"
              class="rounded-xl border bg-muted/30 px-4 py-3"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="font-semibold text-sm line-clamp-1">
                  {{ event.title }}
                </p>
                <Badge
                  variant="secondary"
                  class="shrink-0 text-xs"
                >
                  {{ formatDate(event.startDate) }}
                </Badge>
              </div>
              <p
                v-if="event.description"
                class="text-xs text-muted-foreground mt-1 line-clamp-2"
              >
                {{ event.description }}
              </p>
              <div
                v-if="event.endDate !== event.startDate || event.startTime"
                class="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground"
              >
                <CalendarDays class="size-3" />
                <span v-if="event.endDate !== event.startDate">
                  {{ formatDate(event.startDate) }} –
                  {{ formatDate(event.endDate) }}
                </span>
                <span v-if="event.startTime && event.endTime">
                  {{ event.startTime.slice(11, 16) }} –
                  {{ event.endTime.slice(11, 16) }}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
