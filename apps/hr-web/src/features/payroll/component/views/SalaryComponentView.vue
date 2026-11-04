<script setup lang="ts">
import { DataTable } from '@mts241alikhlash/ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mts241alikhlash/ui/alert-dialog'
import { Button, buttonVariants } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { Plus } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import SalaryComponentFormDialog from '../components/SalaryComponentFormDialog.vue'
import { createSalaryComponentColumns } from '../components/salaryComponentColumns'
import {
  components,
  loading,
  salaryComponentService,
} from '../services/salaryComponentService'
import type { SalaryComponent } from '../types'

const dialogOpen = ref(false)
const editing = ref<SalaryComponent | null>(null)
const deleteDialogOpen = ref(false)
const deletingComponent = ref<SalaryComponent | null>(null)

function startNew() {
  editing.value = null
  dialogOpen.value = true
}

function startEdit(component: SalaryComponent) {
  editing.value = component
  dialogOpen.value = true
}

function handleRequestRemove(component: SalaryComponent) {
  deletingComponent.value = component
  deleteDialogOpen.value = true
}

async function confirmDelete() {
  if (!deletingComponent.value) return
  await salaryComponentService.remove(deletingComponent.value.id)
  deleteDialogOpen.value = false
  deletingComponent.value = null
}

const tableColumns = computed(() =>
  createSalaryComponentColumns(
    (item) => startEdit(item),
    (item) => handleRequestRemove(item),
  ),
)

onMounted(() => void salaryComponentService.fetch())
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
        <CardTitle size="lg"> Komponen Gaji </CardTitle>
        <Button @click="startNew">
          <Plus class="mr-2 h-4 w-4" />
          Tambah Komponen
        </Button>
      </CardHeader>

      <CardContent class="space-y-6 p-0 sm:px-0">
        <DataTable
          :columns="tableColumns"
          :data="components"
          :is-loading="loading"
          item-label="komponen gaji"
        />
      </CardContent>
    </Card>

    <SalaryComponentFormDialog
      v-model:open="dialogOpen"
      :initial-data="editing"
      @success="salaryComponentService.fetch()"
    />

    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Komponen Gaji?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus komponen "<span
              class="font-medium text-foreground"
              >{{ deletingComponent?.name }}</span
            >"? Jika sudah dipakai penetapan gaji, pertimbangkan untuk
            menonaktifkannya saja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            :class="buttonVariants({ variant: 'destructive' })"
            @click="confirmDelete"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
