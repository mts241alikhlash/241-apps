<script setup lang="ts">
import { BackButton } from '@mts241alikhlash/ui'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AcademicCalendarTableView from '../components/AcademicCalendarTableView.vue'
import { useAcademicCalendarManageView } from '../composables/useAcademicCalendarManageView'
import { Button } from '@mts241alikhlash/ui/button'
import { Card, CardHeader, CardTitle } from '@mts241alikhlash/ui/card'
import { Plus } from '@lucide/vue'
import type { CalendarEventData } from '../types'

const router = useRouter()

const {
  tableEvents,
  tableLoading,
  isDeletingBulk,
  fetchTableEvents,
  onUpdateFilters,
  tableViewRef,
  handleDeleteBulk,
  handleSavedOrDeleted,
} = useAcademicCalendarManageView()

function navigateToCreate() {
  void router.push({ name: 'academic-calendar-create' })
}

function navigateToEdit(eventObj: CalendarEventData) {
  void router.push({
    name: 'academic-calendar-edit',
    params: { id: eventObj.id },
    state: { eventData: { ...eventObj } },
  })
}

onMounted(() => {
  void tableViewRef
  void fetchTableEvents()
})
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke kalender pendidikan"
            @click="router.push('/academic/education-calendar')"
          />
          <CardTitle size="lg"> Manajemen Kalender </CardTitle>
        </div>
        <div class="flex gap-2">
          <Button @click="navigateToCreate">
            <Plus class="size-4 mr-2" />
            Tambah Agenda
          </Button>
        </div>
      </CardHeader>

      <AcademicCalendarTableView
        ref="tableViewRef"
        :table-events="tableEvents"
        :is-loading="tableLoading"
        :is-deleting-bulk="isDeletingBulk"
        :show-actions="true"
        @update-filters="onUpdateFilters"
        @delete-bulk="handleDeleteBulk"
        @edit="navigateToEdit"
        @deleted="handleSavedOrDeleted"
      />
    </Card>
  </div>
</template>
