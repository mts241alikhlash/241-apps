<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import EventWorkspacePage from '../components/EventWorkspacePage.vue'
import SupervisorSchedulePanel from '../components/SupervisorSchedulePanel.vue'
import { useEventWorkspace } from '../composables/useEventWorkspace'

const {
  events,
  event,
  visibleRooms,
  loading,
  loadFailed,
  canManageAll,
  canSupervise,
  load,
  select,
} = useEventWorkspace()

const router = useRouter()

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Persiapan', href: '#' },
  { title: 'Jadwal Pengawas', href: '/exam/supervisor-schedule' },
  ...(event.value ? [{ title: event.value.name }] : []),
])
</script>

<template>
  <EventWorkspacePage
    :title="event?.name ?? 'Jadwal Pengawas'"
    hide-event-meta
    :events="events"
    :event="event"
    :loading="loading"
    :load-failed="loadFailed"
    back-label="Kembali ke Jadwal Pengawas"
    @select="select"
    @retry="load()"
    @back="router.push('/exam/supervisor-schedule')"
  >
    <SupervisorSchedulePanel
      :rooms="visibleRooms"
      :can-substitute="canManageAll"
      :can-supervise="canSupervise"
    />
  </EventWorkspacePage>
</template>
