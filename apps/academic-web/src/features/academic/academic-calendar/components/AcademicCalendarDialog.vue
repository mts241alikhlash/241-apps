<script setup lang="ts">
import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { ref, onMounted } from 'vue'
import type { CalendarEventData, CalendarSavePayload } from '../types'
import { useCalendarDialogForm } from '../composables/useCalendarDialogForm'
import { Button } from '@mts241alikhlash/ui/button'
import { FormControl, FormField, FloatingField } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@mts241alikhlash/ui/popover'
import { RangeCalendar } from '@mts241alikhlash/ui/range-calendar'
import { ScrollArea } from '@mts241alikhlash/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { cn } from '@mts241alikhlash/web-shared/utils/utils'
import { CalendarIcon } from '@lucide/vue'
import { academicCalendarTypeApi } from '@/features/academic/academic-calendar-type/api/academicCalendarTypeApi'

const props = defineProps<{
  open?: boolean
  eventData?: CalendarEventData | null
  selectedDate?: string
  isSaving?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: [payload: CalendarSavePayload, id?: string]
  deleted: [id: string]
}>()

const {
  dateRangeOpen,
  dateRangeValue,
  dateRangeLabel,
  isEditMode,
  onSubmit,
  onDelete,
  onOpenChange,
  handleRangeUpdate,
} = useCalendarDialogForm({
  get open() {
    return props.open
  },
  get eventData() {
    return props.eventData
  },
  get selectedDate() {
    return props.selectedDate
  },
  emit,
})

const calendarTypes = ref<{ id: string; name: string }[]>([])

onMounted(async () => {
  try {
    const res = await academicCalendarTypeApi.getAcademicCalendarTypes({
      limit: PAGINATION.REFERENCE_LIMIT,
      isActive: true,
    })
    calendarTypes.value = res.data?.data ?? []
  } catch (error: unknown) {
    toast.error(
      getIndonesianErrorMessage(error, 'Gagal memuat tipe kalender akademik.'),
    )
  }
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="onOpenChange"
  >
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>{{
          isEditMode ? 'Edit Agenda Kalender' : 'Tambah Agenda Kalender'
        }}</DialogTitle>
        <DialogDescription>
          {{
            isEditMode
              ? 'Ubah informasi agenda kalender di sini.'
              : 'Tambahkan agenda kalender baru.'
          }}
        </DialogDescription>
      </DialogHeader>

      <form
        class="flex-1 flex flex-col min-h-0"
        @submit="onSubmit"
      >
        <ScrollArea class="flex-1 min-h-0">
          <div class="flex flex-col gap-5 p-6">
            <FloatingField
              v-slot="{ componentField }"
              name="title"
              label="Nama Agenda"
            >
              <div class="content-start">
                <FormControl>
                  <Input v-bind="componentField" />
                </FormControl>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ value, handleChange }"
              name="typeId"
              label="Kategori"
            >
              <div class="content-start">
                <Select
                  :model-value="value"
                  @update:model-value="handleChange"
                >
                  <FormControl>
                    <SelectTrigger class="w-full">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem
                      v-for="ct in calendarTypes"
                      :key="ct.id"
                      :value="ct.id"
                    >
                      {{ ct.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FloatingField>

            <FormField name="startDate">
              <FormItem class="flex flex-col">
                <FormLabel>Rentang Tanggal</FormLabel>
                <Popover v-model:open="dateRangeOpen">
                  <PopoverTrigger as-child>
                    <FormControl>
                      <Button
                        variant="outline"
                        :class="
                          cn(
                            'w-full justify-start text-left font-normal',
                            !dateRangeLabel && 'text-muted-foreground',
                          )
                        "
                      >
                        <CalendarIcon class="mr-2 h-4 w-4 shrink-0" />
                        {{ dateRangeLabel || 'Pilih rentang tanggal' }}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    class="w-auto p-0"
                    align="start"
                  >
                    <RangeCalendar
                      :model-value="dateRangeValue"
                      locale="id-ID"
                      initial-focus
                      @update:model-value="handleRangeUpdate"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="endDate">
              <FormItem class="hidden">
                <FormMessage />
              </FormItem>
            </FormField>

            <div class="grid grid-cols-2 gap-3">
              <FloatingField
                v-slot="{ componentField }"
                name="startTime"
                label="Jam mulai (Opsional)"
                always-float
              >
                <div class="content-start">
                  <FormControl>
                    <Input
                      v-bind="componentField"
                      type="time"
                    />
                  </FormControl>
                </div>
              </FloatingField>

              <FloatingField
                v-slot="{ componentField }"
                name="endTime"
                label="Jam selesai (Opsional)"
                always-float
              >
                <div class="content-start">
                  <FormControl>
                    <Input
                      v-bind="componentField"
                      type="time"
                    />
                  </FormControl>
                </div>
              </FloatingField>
            </div>

            <FloatingField
              v-slot="{ componentField }"
              name="description"
              label="Deskripsi (Opsional)"
            >
              <div class="content-start">
                <FormControl>
                  <Textarea
                    v-bind="componentField"
                    class="resize-none min-h-[80px]"
                  />
                </FormControl>
              </div>
            </FloatingField>
          </div>
        </ScrollArea>

        <DialogFooter
          class="px-6 py-4 border-t shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full bg-background"
        >
          <Button
            v-if="isEditMode"
            type="button"
            variant="destructive"
            :disabled="isSaving"
            class="sm:mr-auto"
            @click="onDelete"
          >
            Hapus
          </Button>
          <Button
            type="button"
            variant="outline"
            :disabled="isSaving"
            @click="onOpenChange(false)"
          >
            Batal
          </Button>
          <Button
            type="submit"
            :disabled="isSaving"
            class="flex-1 sm:flex-none"
          >
            {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
