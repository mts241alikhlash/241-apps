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
import { createWorkPatternColumns } from '../components/workPatternColumns'
import WorkPatternFormDialog from '../components/WorkPatternFormDialog.vue'
import {
  loading,
  patterns,
  workPatternService,
} from '../services/workPatternService'
import type { WorkPattern } from '../types'

const showForm = ref(false)
const editing = ref<WorkPattern | null>(null)

function startNew() {
  editing.value = null
  showForm.value = true
}

function startEdit(pattern: WorkPattern) {
  editing.value = pattern
  showForm.value = true
}

async function remove(pattern: WorkPattern) {
  const confirmed = window.confirm(`Hapus pola kerja "${pattern.name}"?`)
  if (confirmed) {
    await workPatternService.deletePattern(pattern.id)
    await workPatternService.fetchPatterns()
  }
}

const tableColumns = computed(() =>
  createWorkPatternColumns(startEdit, (pattern) => void remove(pattern)),
)

onMounted(() => void workPatternService.fetchPatterns())
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
        <CardTitle size="lg"> Pola Kerja </CardTitle>
        <Button @click="startNew">
          <Plus class="mr-2 h-4 w-4" />
          Pola Baru
        </Button>
      </CardHeader>

      <CardContent class="space-y-6 p-0 sm:px-0">
        <DataTable
          :columns="tableColumns"
          :data="patterns"
          :is-loading="loading"
          item-label="pola kerja"
        />

        <WorkPatternFormDialog
          v-model:open="showForm"
          :editing="editing"
          @success="workPatternService.fetchPatterns()"
        />
      </CardContent>
    </Card>
  </div>
</template>
