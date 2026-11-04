<script setup lang="ts">
import { useAddressForm } from '../composables/useAddressForm'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { FloatingField, FormControl } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import { ScrollArea } from '@mts241alikhlash/ui/scroll-area'
import { Loader2 } from '@lucide/vue'
import RegionSelect from './RegionSelect.vue'
import { useAddress } from '../composables/useAddress'
import type { EditAddressProps } from '../types'

const props = defineProps<EditAddressProps>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  reload: []
}>()

const { isSaving, saveAddress } = useAddress()

const {
  open,
  existingAddress,
  onSubmit,
  regionCodes,
  regionErrors,
  setRegionCodes,
  setRegionNames,
} = useAddressForm({
  props,
  emit,
  saveAddress,
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="open = $event"
  >
    <DialogContent class="sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>
          {{ existingAddress ? 'Ubah Alamat' : 'Tambah Alamat' }}
        </DialogTitle>
        <DialogDescription class="sr-only"> </DialogDescription>
      </DialogHeader>

      <ScrollArea class="flex-1 min-h-0">
        <form
          id="address-form"
          class="space-y-2 px-6 py-4"
          @submit.prevent="onSubmit"
        >
          <div
            class="grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-2"
          >
            <FloatingField
              v-slot="{ componentField }"
              name="street"
              label="Jalan / Dusun"
              required
              class="sm:col-span-2"
            >
              <FormControl>
                <Input v-bind="componentField" />
              </FormControl>
            </FloatingField>

            <FloatingField
              v-slot="{ componentField }"
              name="rt"
              label="RT"
            >
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="5"
                  :disabled="isSaving"
                />
              </FormControl>
            </FloatingField>

            <FloatingField
              v-slot="{ componentField }"
              name="rw"
              label="RW"
            >
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="5"
                  :disabled="isSaving"
                />
              </FormControl>
            </FloatingField>

            <div class="sm:col-span-2">
              <RegionSelect
                :model-value="regionCodes"
                :errors="regionErrors"
                @update:model-value="setRegionCodes"
                @update:names="setRegionNames"
              />
            </div>

            <FloatingField
              v-slot="{ componentField }"
              name="country"
              label="Negara"
              required
            >
              <FormControl>
                <Input
                  v-bind="componentField"
                  disabled
                />
              </FormControl>
            </FloatingField>

            <FloatingField
              v-slot="{ componentField }"
              name="postalCode"
              label="Kode Pos"
            >
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="10"
                  :disabled="isSaving"
                />
              </FormControl>
            </FloatingField>
          </div>
        </form>
      </ScrollArea>

      <DialogFooter
        class="px-6 py-4 border-t shrink-0 flex sm:justify-between w-full bg-background"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="isSaving"
          @click="open = false"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="address-form"
          variant="default"
          :disabled="isSaving"
        >
          <Loader2
            v-if="isSaving"
            class="size-4 mr-1.5 animate-spin"
          />
          {{
            isSaving
              ? 'Menyimpan...'
              : existingAddress
                ? 'Simpan Perubahan'
                : 'Tambah Alamat'
          }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
