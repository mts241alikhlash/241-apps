<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import EventWorkspacePage from '../components/EventWorkspacePage.vue'
import SupervisorSchedulePanel from '../components/SupervisorSchedulePanel.vue'
import { useEventWorkspace } from '../composables/useEventWorkspace'

const { events, event, loading, loadFailed, canManageAll, load, select } =
  useEventWorkspace()

const route = useRoute()
const router = useRouter()

const paramValue = (name: string): string | null => {
  const value = route.params[name]
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
}

const eventId = computed(() => paramValue('id') ?? event.value?.id ?? '')
const dayId = computed(() => paramValue('dayId'))
const subjectId = computed(() => paramValue('subjectId'))
const levelTitle = ref<string | null>(null)
const panel = ref<InstanceType<typeof SupervisorSchedulePanel> | null>(null)

const backLabel = computed(() =>
  subjectId.value
    ? 'Kembali ke daftar mapel'
    : dayId.value
      ? 'Kembali ke semua hari'
      : 'Kembali ke Jadwal Pengawas',
)

function goTo(day: string | null, subject: string | null = null) {
  const params: Record<string, string> = { id: eventId.value }
  if (day !== null) params.dayId = day
  if (day !== null && subject !== null) params.subjectId = subject
  void router.push({ name: 'ExamSupervisorScheduleDetail', params })
}

function goBack() {
  if (subjectId.value) goTo(dayId.value)
  else if (dayId.value) goTo(null)
  else void router.push('/exam/supervisor-schedule')
}

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Persiapan', href: '#' },
  { title: 'Jadwal Pengawas', href: '/exam/supervisor-schedule' },
  ...(event.value ? [{ title: event.value.name }] : []),
  ...(levelTitle.value ? [{ title: levelTitle.value }] : []),
])
</script>

<template>
  <EventWorkspacePage
    :title="levelTitle ?? event?.name ?? 'Jadwal Pengawas'"
    hide-event-meta
    :events="events"
    :event="event"
    :loading="loading"
    :load-failed="loadFailed"
    :back-label="backLabel"
    @select="select"
    @retry="load()"
    @back="goBack"
  >
    <template #actions>
      <Button
        v-if="canManageAll && !dayId"
        class="shrink-0"
        :disabled="panel?.generating"
        @click="panel?.generateSlots()"
      >
        Buat Slot Ruangan
      </Button>
      <Button
        v-if="canManageAll && subjectId"
        class="shrink-0"
        @click="panel?.openAdd()"
      >
        <Plus class="size-4" />
        Tambah
      </Button>
    </template>
    <SupervisorSchedulePanel
      ref="panel"
      :event-id="event?.id ?? ''"
      :day-id="dayId"
      :subject-id="subjectId"
      :can-substitute="canManageAll"
      @navigate="goTo"
      @level-change="levelTitle = $event"
    />
  </EventWorkspacePage>
</template>
