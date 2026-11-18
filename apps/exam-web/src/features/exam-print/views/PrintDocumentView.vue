<script setup lang="ts">
import { computed } from 'vue'
import { usePrintPack } from '../composables/usePrintPack'
import {
  usePrintScope,
  type PrintScopeGroup,
  type PrintScopeOption,
} from '../composables/usePrintScope'
import PrintShell from '../components/PrintShell.vue'
import { PRINT_DOCUMENTS } from '../documents'
import { gradeOf } from '../format'
import { ALL_SCOPES } from '../composables/usePrintScope'
import type { PrintDocumentKey } from '../types'

const props = defineProps<{ doc: PrintDocumentKey }>()

const definition = computed(() => PRINT_DOCUMENTS[props.doc])
const state = usePrintPack({ withSchedules: props.doc === 'schedule' })
const { scope, printWith } = usePrintScope()

const scopeGroups = computed<PrintScopeGroup[]>(
  () => definition.value.scopeGroups ?? ['room', 'class', 'grade'],
)

const scopes = computed<PrintScopeOption[]>(() => {
  const rooms = state.pack.value?.rooms ?? []
  if (!definition.value.perRoom) return []
  const classes = [
    ...new Set(
      rooms.flatMap((room) =>
        room.students
          .map((student) => student.classroomName)
          .filter((name): name is string => name !== null),
      ),
    ),
  ]
  const grades = [
    ...new Set(
      classes.map((name) => gradeOf(name)).filter((grade) => grade !== null),
    ),
  ].sort((a, b) => Number(a) - Number(b))
  return [
    ...(scopeGroups.value.includes('room')
      ? rooms.map((room) => ({
          key: `room:${room.id}`,
          label: `${room.code} · ${room.name}`,
          group: 'room' as const,
        }))
      : []),
    ...(scopeGroups.value.includes('class')
      ? classes.map((name) => ({
          key: `class:${name}`,
          label: name,
          group: 'class' as const,
        }))
      : []),
    ...(scopeGroups.value.includes('grade')
      ? grades.map((grade) => ({
          key: `grade:${grade}`,
          label: `Tingkat ${grade}`,
          group: 'grade' as const,
        }))
      : []),
  ]
})

const documentBindings = computed(() => ({
  ...definition.value.componentProps,
  ...(props.doc === 'cards'
    ? {
        resetting: state.resetting.value,
        onResetCredentials: state.resetCredentials,
      }
    : {}),
}))

const showShellFilters = computed(
  () => definition.value.inlineFilters !== true || state.error.value !== null,
)

const printedRooms = computed(() => {
  const rooms = state.visibleRooms.value
  if (scope.value === ALL_SCOPES) return rooms
  if (scope.value.startsWith('room:')) {
    const id = scope.value.slice('room:'.length)
    return rooms.filter((room) => room.id === id)
  }
  if (scope.value.startsWith('one:')) {
    const studentId = scope.value.slice('one:'.length)
    return rooms
      .map((room) => ({
        ...room,
        students: room.students.filter(
          (student) => student.studentId === studentId,
        ),
      }))
      .filter((room) => room.students.length > 0)
  }
  const isGrade = scope.value.startsWith('grade:')
  const value = scope.value.slice(isGrade ? 'grade:'.length : 'class:'.length)
  return rooms
    .map((room) => ({
      ...room,
      students: room.students.filter((student) =>
        isGrade
          ? gradeOf(student.classroomName) === value
          : student.classroomName === value,
      ),
    }))
    .filter((room) => room.students.length > 0)
})
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
    :show-filters="showShellFilters"
    :scopes="scopes"
    @update:event-id="state.changeEvent"
    @update:room-id="state.changeRoom"
    @print="printWith"
    @retry="state.loadPack"
  >
    <template v-if="state.pack.value">
      <component
        :is="definition.component"
        v-if="definition.perRoom"
        v-bind="documentBindings"
        :event="state.pack.value.event"
        :rooms="printedRooms"
        :events="state.events.value"
        :event-id="state.eventId.value"
        :room-id="state.roomId.value"
        :room-options="state.roomOptions.value"
        :show-room-filter="definition.perRoom"
        :schedules="state.schedules.value"
        @update:event-id="state.changeEvent"
        @update:room-id="state.changeRoom"
        @print-one="printWith(`one:${$event}`)"
      />
      <component
        :is="definition.component"
        v-else
        :event="state.pack.value.event"
        :schedules="state.schedules.value"
      />
    </template>
  </PrintShell>
</template>
