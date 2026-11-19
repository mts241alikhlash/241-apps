<script setup lang="ts">
import { lookupService } from '@/features/lookup'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { DataTable, DatePicker } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Label } from '@mts241alikhlash/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Plus } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import {
  createCurrentAssignmentColumns,
  createHistoryAssignmentColumns,
} from '../components/workPatternAssignmentColumns'
import {
  assignments,
  loading,
  patterns,
  workPatternService,
} from '../services/workPatternService'

import type { EmployeeOption } from '../types'

const employees = ref<EmployeeOption[]>([])
const dialogOpen = ref(false)
const saving = ref(false)

const form = ref({
  userId: '',
  workPatternId: '',
  effectiveFrom: new Date().toISOString().slice(0, 10),
})

const current = computed(() =>
  assignments.value.filter((assignment) => assignment.effectiveTo === null),
)
const superseded = computed(() =>
  assignments.value.filter((assignment) => assignment.effectiveTo !== null),
)

const currentColumns = computed(() => createCurrentAssignmentColumns())
const historyColumns = computed(() => createHistoryAssignmentColumns())

async function loadEmployees() {
  try {
    employees.value = await lookupService.listEmployees()
  } catch (error: unknown) {
    toast.error(getIndonesianErrorMessage(error, 'Gagal memuat data pegawai.'))
  }
}

async function submit() {
  if (!form.value.userId || !form.value.workPatternId) return

  saving.value = true
  const ok = await workPatternService.assign({ ...form.value })
  saving.value = false
  if (ok) dialogOpen.value = false
}

onMounted(async () => {
  await Promise.all([
    loadEmployees(),
    workPatternService.fetchPatterns(),
    workPatternService.fetchAssignments(),
  ])
})
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader plain>
        <CardTitle size="lg"> Penugasan Pola Kerja </CardTitle>
        <Button @click="dialogOpen = true">
          <Plus class="h-4 w-4" />
          Tugaskan
        </Button>
      </CardHeader>

      <CardContent class="space-y-6 p-0 sm:px-0">
        <div>
          <DataTable
            :columns="currentColumns"
            :data="current"
            :is-loading="loading"
            item-label="penugasan pola kerja"
          />
        </div>

        <div
          v-if="superseded.length > 0"
          class="pt-4 border-t"
        >
          <h3 class="mb-3 text-base font-semibold">Riwayat Penugasan</h3>
          <DataTable
            :columns="historyColumns"
            :data="superseded"
            :is-loading="loading"
            item-label="riwayat penugasan"
          />
        </div>
      </CardContent>
    </Card>

    <Dialog v-model:open="dialogOpen">
      <DialogContent
        class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden"
      >
        <DialogHeader standard>
          <DialogTitle>Tugaskan Pola Kerja</DialogTitle>
          <DialogDescription />
        </DialogHeader>

        <DialogBody class="space-y-4">
          <div class="space-y-1.5">
            <Label>Pegawai</Label>
            <Select v-model="form.userId">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Pilih pegawai" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="employee in employees"
                  :key="employee.userId"
                  :value="employee.userId"
                >
                  {{ employee.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label>Pola kerja</Label>
            <Select v-model="form.workPatternId">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Pilih pola kerja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="pattern in patterns"
                  :key="pattern.id"
                  :value="pattern.id"
                >
                  {{ pattern.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label>Berlaku mulai</Label>
            <DatePicker v-model="form.effectiveFrom" />
          </div>
        </DialogBody>

        <DialogFooter standard>
          <Button
            variant="outline"
            @click="dialogOpen = false"
          >
            Batal
          </Button>
          <Button
            :disabled="saving || !form.userId || !form.workPatternId"
            @click="submit"
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
