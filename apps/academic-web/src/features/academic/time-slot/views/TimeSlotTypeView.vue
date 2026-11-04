<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Plus } from '@lucide/vue'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { useRoleGuard } from '@/features/platform/auth'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { timeSlotApi } from '../api/timeSlotApi'
import { createTimeSlotTypeColumns } from '../components/timeSlotTypeColumns'
import TimeSlotTypeFormDialog from '../components/TimeSlotTypeFormDialog.vue'
import type { TimeSlotType } from '../types'

const { can } = useRoleGuard()

const data = ref<TimeSlotType[]>([])
const isLoading = ref(false)
const isAddOpen = ref(false)
const isEditOpen = ref(false)
const selectedItem = ref<TimeSlotType | null>(null)

async function fetchTypes() {
  isLoading.value = true
  try {
    const res = await timeSlotApi.getTimeSlotTypes()
    data.value = res.data.data ?? []
  } catch (error: unknown) {
    toast.error(getIndonesianErrorMessage(error, 'Gagal memuat tipe jam.'))
  } finally {
    isLoading.value = false
  }
}

function openEdit(item: TimeSlotType) {
  selectedItem.value = { ...item }
  isEditOpen.value = true
}

async function handleDelete(
  item: TimeSlotType,
  callbacks: { closeAlert: () => void; setLoading: (state: boolean) => void },
) {
  callbacks.setLoading(true)
  try {
    await timeSlotApi.deleteTimeSlotType(item.id)
    toast.success('Tipe jam berhasil dihapus')
    callbacks.closeAlert()
    await fetchTypes()
  } catch (error: unknown) {
    toast.error(getIndonesianErrorMessage(error, 'Gagal menghapus tipe jam.'))
  } finally {
    callbacks.setLoading(false)
  }
}

const columns = createTimeSlotTypeColumns(
  openEdit,
  (item, callbacks) => {
    void handleDelete(item, callbacks)
  },
  can('time-slots.update') || can('time-slots.delete'),
)

onMounted(fetchTypes)
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader
        standard
        class="min-h-0 border-b-0 bg-transparent px-0 pt-0 pb-3 sm:px-0"
      >
        <CardTitle size="lg"> Tipe Jam </CardTitle>
        <Button
          v-if="can('time-slots.create')"
          @click="isAddOpen = true"
        >
          <Plus class="size-4 mr-2" />
          Tambah Tipe
        </Button>
      </CardHeader>

      <CardContent class="p-0 sm:px-0">
        <DataTable
          :columns="columns"
          :data="data"
          :is-loading="isLoading"
          item-label="tipe jam"
          filter-column="name"
          filter-placeholder="Cari tipe jam..."
        />
      </CardContent>
    </Card>

    <TimeSlotTypeFormDialog
      v-if="can('time-slots.create')"
      v-model:open="isAddOpen"
      @success="fetchTypes"
    />

    <TimeSlotTypeFormDialog
      v-if="can('time-slots.update')"
      v-model:open="isEditOpen"
      :initial-data="selectedItem"
      @success="fetchTypes"
    />
  </div>
</template>
