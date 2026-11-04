<script setup lang="ts">
import { ref } from 'vue'
import TimeSlotManageTable from '../components/TimeSlotManageTable.vue'
import { Card, CardHeader, CardTitle } from '@mts241alikhlash/ui/card'
import { Button } from '@mts241alikhlash/ui/button'
import { Loader2, Plus, Save } from '@lucide/vue'
import { useRoleGuard } from '@/features/platform/auth'

const { can } = useRoleGuard()
const tableRef = ref<InstanceType<typeof TimeSlotManageTable> | null>(null)
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle size="lg"> Jam Pelajaran </CardTitle>
        <Button
          v-if="can('time-slots.create')"
          @click="tableRef?.addRow"
        >
          <Plus class="size-4 mr-2" />
          Tambah Baris
        </Button>
      </CardHeader>

      <div class="px-6 py-6 md:py-8">
        <TimeSlotManageTable
          ref="tableRef"
          :can-edit="can('time-slots.update')"
        />
      </div>

      <div
        v-if="can('time-slots.update')"
        class="flex justify-end items-center gap-2 border-t px-6 py-4 bg-background"
      >
        <Button
          :disabled="!tableRef?.hasChanges || tableRef?.loading"
          @click="tableRef?.saveAll"
        >
          <Loader2
            v-if="tableRef?.loading"
            class="size-4 mr-2 animate-spin"
          />
          <Save
            v-else
            class="size-4 mr-2"
          />
          Simpan
        </Button>
      </div>
    </Card>
  </div>
</template>
