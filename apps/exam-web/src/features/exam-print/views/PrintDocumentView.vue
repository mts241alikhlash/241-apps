<script setup lang="ts">
import { computed } from 'vue'
import { usePrintPack } from '../composables/usePrintPack'
import PrintShell from '../components/PrintShell.vue'
import { PRINT_DOCUMENTS } from '../documents'
import type { PrintDocumentKey } from '../types'

const props = defineProps<{ doc: PrintDocumentKey }>()

const definition = computed(() => PRINT_DOCUMENTS[props.doc])
const state = usePrintPack({ withSchedules: props.doc === 'schedule' })
</script>

<template>
  <PrintShell
    :title="definition.title"
    :events="state.events.value"
    :event-id="state.eventId.value"
    :rooms="state.roomOptions.value"
    :room-id="state.roomId.value"
    :loading="state.loading.value"
    :error="state.error.value"
    :warnings="state.warnings.value"
    :has-content="state.hasContent.value"
    :show-room-filter="definition.perRoom"
    @update:event-id="state.changeEvent"
    @update:room-id="state.changeRoom"
    @print="state.print"
    @retry="state.loadPack"
  >
    <template v-if="state.pack.value">
      <component
        :is="definition.component"
        v-if="definition.perRoom"
        :event="state.pack.value.event"
        :rooms="state.visibleRooms.value"
        :school-name="state.schoolName.value"
      />
      <component
        :is="definition.component"
        v-else
        :event="state.pack.value.event"
        :schedules="state.schedules.value"
        :school-name="state.schoolName.value"
      />
    </template>
  </PrintShell>
</template>
