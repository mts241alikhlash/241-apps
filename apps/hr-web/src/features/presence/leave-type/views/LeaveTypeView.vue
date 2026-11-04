<script setup lang="ts">
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { Plus } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import LeaveTypeFormDialog from '../components/LeaveTypeFormDialog.vue'
import { createLeaveTypeColumns } from '../components/leaveTypeColumns'
import {
  leaveTypeService,
  leaveTypes,
  loading,
} from '../services/leaveTypeService'
import type { LeaveType } from '../types'

const dialogOpen = ref(false)
const editing = ref<LeaveType | null>(null)

function startNew() {
  editing.value = null
  dialogOpen.value = true
}

function startEdit(type: LeaveType) {
  editing.value = type
  dialogOpen.value = true
}

async function remove(type: LeaveType) {
  const confirmed = window.confirm(
    `Hapus "${type.name}"? Jika sudah dipakai pengajuan, nonaktifkan saja.`,
  )
  if (confirmed) await leaveTypeService.remove(type.id)
}

const tableColumns = computed(() =>
  createLeaveTypeColumns(startEdit, (type) => void remove(type)),
)

onMounted(() => void leaveTypeService.fetch())
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
        <CardTitle size="lg"> Jenis Izin & Cuti </CardTitle>
        <Button @click="startNew">
          <Plus class="mr-2 h-4 w-4" />
          Tambah
        </Button>
      </CardHeader>

      <CardContent class="space-y-4 p-0 sm:px-0">
        <DataTable
          :columns="tableColumns"
          :data="leaveTypes"
          :is-loading="loading"
          item-label="jenis izin/cuti"
        />

        <LeaveTypeFormDialog
          v-model:open="dialogOpen"
          :initial-data="editing"
          @success="leaveTypeService.fetch()"
        />
      </CardContent>
    </Card>
  </div>
</template>
