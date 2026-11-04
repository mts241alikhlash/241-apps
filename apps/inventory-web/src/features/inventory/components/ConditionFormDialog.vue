<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import {
  Button,
  Input,
  ScrollArea,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormControl,
  FloatingField,
  FormField,
} from '@mts241alikhlash/ui'
import { Switch } from '@mts241alikhlash/ui/switch'
import type { InventoryReferenceItem } from '../types'

const props = defineProps<{
  open: boolean
  item: InventoryReferenceItem | null
  isSaving: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'save', payload: Omit<InventoryReferenceItem, 'id'>): void
}>()

const isEdit = computed(() => !!props.item)

const formSchema = toTypedSchema(
  z.object({
    code: z.string().min(1, 'Kode wajib diisi'),
    name: z.string().min(1, 'Nama kondisi wajib diisi'),
    isUsable: z.boolean().default(true),
  }),
)

interface ConditionFormValues {
  code: string
  name: string
  isUsable: boolean
}

const { handleSubmit, resetForm } = useForm<ConditionFormValues>({
  validationSchema: formSchema,
})

watch(
  () => [props.open, props.item],
  () => {
    if (props.open) {
      if (props.item) {
        resetForm({
          values: {
            code: props.item.code || '',
            name: props.item.name || '',
            isUsable: props.item.isUsable ?? true,
          },
        })
      } else {
        resetForm({
          values: {
            code: '',
            name: '',
            isUsable: true,
          },
        })
      }
    }
  },
  { immediate: true },
)

const onSubmit = handleSubmit((values) => {
  emit('save', values)
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle class="text-xl font-semibold tracking-tight">
          {{ isEdit ? 'Ubah Kondisi Aset' : 'Tambah Kondisi Aset' }}
        </DialogTitle>
      </DialogHeader>

      <form
        class="flex flex-col flex-1 min-h-0"
        @submit="onSubmit"
      >
        <ScrollArea class="flex-1 min-h-0 px-1 py-4">
          <div class="space-y-4">
            <FloatingField
              v-slot="{ componentField }"
              name="code"
              label="Kode Kondisi"
            >
              <div class="content-start">
                <FormControl>
                  <Input
                    v-bind="componentField"
                    :disabled="isSaving || isEdit"
                  />
                </FormControl>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ componentField }"
              name="name"
              label="Nama Kondisi"
            >
              <div class="content-start">
                <FormControl>
                  <Input
                    v-bind="componentField"
                    :disabled="isSaving"
                  />
                </FormControl>
              </div>
            </FloatingField>

            <FormField
              v-slot="{ value, handleChange }"
              name="isUsable"
            >
              <FormItem
                class="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"
              >
                <div class="space-y-0.5">
                  <FormLabel class="text-sm font-medium"
                    >Bisa Digunakan</FormLabel
                  >
                  <p class="text-xs text-muted-foreground">
                    Aktifkan jika aset dengan kondisi ini masih layak pakai.
                  </p>
                </div>
                <FormControl>
                  <Switch
                    :model-value="value"
                    :disabled="isSaving"
                    @update:model-value="handleChange"
                  />
                </FormControl>
              </FormItem>
            </FormField>
          </div>
        </ScrollArea>

        <DialogFooter
          class="px-6 py-4 border-t shrink-0 flex sm:justify-between w-full bg-background"
        >
          <Button
            type="button"
            variant="outline"
            :disabled="isSaving"
            @click="emit('update:open', false)"
          >
            Batal
          </Button>
          <Button
            type="submit"
            :disabled="isSaving"
          >
            {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
