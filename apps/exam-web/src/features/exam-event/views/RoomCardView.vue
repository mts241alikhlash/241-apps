<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import EventWorkspacePage from '../components/EventWorkspacePage.vue'
import ExamCardPanel from '../components/ExamCardPanel.vue'
import { useEventWorkspace } from '../composables/useEventWorkspace'

const { events, event, visibleRooms, loading, loadFailed, load, select } =
  useEventWorkspace()

const router = useRouter()

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Persiapan', href: '#' },
  { title: 'Kartu per Ruangan', href: '/exam/room-cards' },
  ...(event.value ? [{ title: event.value.name }] : []),
])
</script>

<template>
  <EventWorkspacePage
    :title="event?.name ?? 'Kartu per Ruangan'"
    hide-event-meta
    :events="events"
    :event="event"
    :loading="loading"
    :load-failed="loadFailed"
    back-label="Kembali ke Kartu per Ruangan"
    @select="select"
    @retry="load()"
    @back="router.push('/exam/room-cards')"
  >
    <ExamCardPanel
      v-if="event"
      :event="event"
      :rooms="visibleRooms"
      :semester-id="event.semesterId"
      :active="true"
    />
  </EventWorkspacePage>
</template>
