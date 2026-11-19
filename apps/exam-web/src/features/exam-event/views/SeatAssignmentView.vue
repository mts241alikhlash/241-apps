<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import EventWorkspacePage from '../components/EventWorkspacePage.vue'
import SeatAssignmentPanel from '../components/SeatAssignmentPanel.vue'
import { useEventWorkspace } from '../composables/useEventWorkspace'

const {
  events,
  event,
  visibleRooms,
  loading,
  loadFailed,
  canManage,
  canSupervise,
  canActOnRoom,
  load,
  select,
} = useEventWorkspace()

const router = useRouter()

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Persiapan', href: '#' },
  { title: 'Pembagian Kursi', href: '/exam/seat-assignment' },
  ...(event.value ? [{ title: event.value.name }] : []),
])
</script>

<template>
  <EventWorkspacePage
    :title="event?.name ?? 'Pembagian Kursi'"
    hide-event-meta
    :events="events"
    :event="event"
    :loading="loading"
    :load-failed="loadFailed"
    back-label="Kembali ke Pembagian Kursi"
    @select="select"
    @retry="load()"
    @back="router.push('/exam/seat-assignment')"
  >
    <SeatAssignmentPanel
      v-if="event"
      :rooms="visibleRooms"
      :semester-id="event.semesterId"
      :can-supervise="canSupervise"
      :can-assign="canManage"
      :can-act-on-room="canActOnRoom"
    />
  </EventWorkspacePage>
</template>
