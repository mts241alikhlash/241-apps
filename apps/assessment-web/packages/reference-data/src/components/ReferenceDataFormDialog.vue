<script setup lang="ts" generic="T extends ReferenceDataEntity">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import { ScrollArea } from '@mts241alikhlash/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Input } from '@mts241alikhlash/ui/input'
import { Switch } from '@mts241alikhlash/ui/switch'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@mts241alikhlash/ui/form'
import { Loader2 } from '@lucide/vue'
import {
  buildFieldSchema,
  buildInitialValues,
  omitReadOnlyOnEditFields,
} from '../schema/buildFieldSchema'
import type { ReferenceDataEntity, ReferenceDataField } from '../types/config'

const props = defineProps<{
  open: boolean
  fields: ReferenceDataField[]
  entityLabel: { singular: string; plural: string }
  isSubmitting?: boolean
  initialData?: T | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [payload: Record<string, unknown>]
}>()

const isEditing = computed(() => !!props.initialData)

const formSchema = computed(() => toTypedSchema(buildFieldSchema(props.fields)))
const initialValues = computed(() => buildInitialValues(props.fields))

const { handleSubmit, setValues, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues,
})

watch(
  () => [props.open, props.initialData] as const,
  ([isOpen]) => {
    if (!isOpen) return
    if (props.initialData) {
      const initialData = props.initialData as Record<string, unknown>
      const values: Record<string, unknown> = {}
      for (const field of props.fields) {
        values[field.key] = initialData[field.key]
      }
      setValues(values)
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

const onSubmit = handleSubmit((values) => {
  const payload = isEditing.value
    ? omitReadOnlyOnEditFields(props.fields, values)
    : values
  emit('save', payload)
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="$emit('update:open', $event)"
  >
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>
          {{ isEditing ? 'Edit' : 'Tambah' }} {{ entityLabel.singular }}
        </DialogTitle>
        <DialogDescription class="sr-only" />
      </DialogHeader>

      <ScrollArea class="flex-1 min-h-0">
        <form
          id="reference-data-form"
          class="space-y-4 px-6 py-4"
          @submit.prevent="onSubmit"
        >
          <FormField
            v-for="field in fields"
            :key="field.key"
            v-slot="{ value, handleChange, componentField }"
            :name="field.key"
          >
            <FormItem v-if="field.kind === 'text'">
              <FormLabel>
                {{ field.label }}
                <span
                  v-if="field.required"
                  class="text-destructive"
                  >*</span
                >
              </FormLabel>
              <FormControl>
                <Input
                  :placeholder="field.placeholder"
                  :disabled="
                    isSubmitting || (isEditing && field.readOnlyOnEdit)
                  "
                  v-bind="componentField"
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            <FormItem v-else-if="field.kind === 'number'">
              <FormLabel>
                {{ field.label }}
                <span
                  v-if="field.required"
                  class="text-destructive"
                  >*</span
                >
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  :min="field.min"
                  :max="field.max"
                  :placeholder="field.placeholder"
                  :disabled="isSubmitting"
                  v-bind="componentField"
                />
              </FormControl>
              <p
                v-if="field.hint"
                class="text-xs text-muted-foreground"
              >
                {{ field.hint }}
              </p>
              <FormMessage />
            </FormItem>

            <FormItem v-else>
              <FormLabel>
                {{ field.label }}
                <span
                  v-if="field.required"
                  class="text-destructive"
                  >*</span
                >
              </FormLabel>
              <FormControl>
                <div
                  role="button"
                  tabindex="0"
                  class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors hover:bg-accent/50 cursor-pointer select-none"
                  :class="{ 'opacity-50 pointer-events-none': isSubmitting }"
                  @click="handleChange(!value)"
                  @keydown.enter.prevent="handleChange(!value)"
                  @keydown.space.prevent="handleChange(!value)"
                >
                  <span class="text-sm font-medium">
                    {{
                      value
                        ? (field.trueLabel ?? 'Aktif')
                        : (field.falseLabel ?? 'Tidak Aktif')
                    }}
                  </span>
                  <Switch
                    :model-value="Boolean(value)"
                    :disabled="isSubmitting"
                    class="pointer-events-none"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </form>
      </ScrollArea>

      <DialogFooter
        class="px-6 py-4 border-t shrink-0 flex sm:justify-between w-full bg-background"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="isSubmitting"
          @click="$emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="reference-data-form"
          :disabled="isSubmitting"
        >
          <Loader2
            v-if="isSubmitting"
            class="mr-2 h-4 w-4 animate-spin"
          />
          {{ isEditing ? 'Simpan' : 'Tambah' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
