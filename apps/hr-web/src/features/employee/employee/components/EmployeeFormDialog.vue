<script setup lang="ts">
import { computed, toRefs, watch } from 'vue'
import type {
  EmployeeSavePayload,
  EmployeeUpdatePayload,
  EmployeeEditData,
} from '../types'
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
import { Button } from '@mts241alikhlash/ui/button'
import { ScrollArea } from '@mts241alikhlash/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@mts241alikhlash/ui/tabs'
import EmployeeProfileTabFields from './EmployeeProfileTabFields.vue'
import EmployeeEmploymentTabFields from './EmployeeEmploymentTabFields.vue'
import { useEmployee } from '../composables/useEmployee'
import { useEmployeeFormDialog } from '../composables/useEmployeeFormDialog'

const props = defineProps<{
  open: boolean
  formError: string | null
  isSaving: boolean
  editData?: EmployeeEditData | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [data: EmployeeSavePayload | EmployeeUpdatePayload]
  'save-position': [
    employeeId: string,
    positionId: string,
    oldPositionLinkId: string | null,
  ]
}>()

const open = computed({
  get: () => props.open,
  set: (value: boolean) => {
    if (!value) dialog.resetForm()
    emit('update:open', value)
  },
})

const { editData } = toRefs(props)

const { positions, fetchPositions } = useEmployee()
const positionsRef = computed(() => positions.value ?? [])

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && positions.value.length === 0) void fetchPositions()
  },
)

const dialog = useEmployeeFormDialog({
  open,
  editData,
  positions: positionsRef,
  onSave: (data) => emit('save', data),
  onSavePosition: (employeeId, positionId, oldLinkId) =>
    emit('save-position', employeeId, positionId, oldLinkId),
  onClose: () => {
    open.value = false
  },
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-2xl flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>
          {{
            dialog.isEditing.value ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'
          }}
        </DialogTitle>
      </DialogHeader>

      <ScrollArea class="flex-1 min-h-0">
        <form
          id="employee-form"
          class="space-y-4 px-6 py-4"
          @submit.prevent="dialog.handleNext"
        >
          <Tabs
            v-model="dialog.activeTab.value"
            class="w-full"
          >
            <TabsList class="grid w-full grid-cols-2 mb-4">
              <TabsTrigger
                value="profil"
                :disabled="dialog.isEditing.value"
              >
                Informasi Profil
              </TabsTrigger>
              <TabsTrigger value="kepegawaian"> Kepegawaian </TabsTrigger>
            </TabsList>

            <TabsContent
              value="profil"
              class="space-y-4 mt-0"
            >
              <EmployeeProfileTabFields />
            </TabsContent>

            <TabsContent
              value="kepegawaian"
              class="space-y-4 mt-0"
            >
              <EmployeeEmploymentTabFields
                v-model="dialog.kategori.value"
                :employment-types="dialog.employmentTypes.value"
                :category-options="dialog.categoryOptions.value"
                :filtered-positions="dialog.filteredPositions.value"
              />
            </TabsContent>
          </Tabs>
        </form>
      </ScrollArea>

      <DialogFooter
        class="p-6 border-t bg-muted/10 flex items-center justify-between shrink-0"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="isSaving"
          @click="dialog.handleBack"
        >
          {{
            dialog.isEditing.value
              ? 'Batal'
              : dialog.activeTab.value === 'profil'
                ? 'Batal'
                : 'Kembali'
          }}
        </Button>
        <Button
          type="button"
          :disabled="isSaving"
          @click="dialog.handleNext"
        >
          {{
            isSaving
              ? 'Menyimpan...'
              : dialog.isEditing.value
                ? 'Simpan Perubahan'
                : dialog.activeTab.value === 'profil'
                  ? 'Lanjut Kepegawaian'
                  : 'Simpan Pegawai'
          }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <AlertDialog v-model:open="dialog.showConfirmAlert.value">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Konfirmasi Perubahan</AlertDialogTitle>
        <AlertDialogDescription>
          Apakah Anda yakin ingin menyimpan perubahan data guru ini?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Batal</AlertDialogCancel>
        <AlertDialogAction @click="dialog.confirmSave">
          Ya, Simpan
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
