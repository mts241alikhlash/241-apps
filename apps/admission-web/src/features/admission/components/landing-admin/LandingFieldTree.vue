<script setup lang="ts">
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import type { LandingField } from '../../data/landingFormConfig'
import type { LandingImageRef } from '../../types/landing'
import LandingImageField from './LandingImageField.vue'

defineOptions({ name: 'LandingFieldTree' })

const props = withDefaults(
  defineProps<{
    fields: LandingField[]
    model: Record<string, unknown>
    path?: string
    errors: Record<string, string>
    disabled?: boolean
  }>(),
  { path: '', disabled: false },
)

const emit = defineEmits<{
  change: [path: string, value: unknown]
  add: [path: string, blank: unknown]
  remove: [path: string, index: number]
  move: [path: string, index: number, step: number]
}>()

const at = (name: string) => (props.path ? `${props.path}.${name}` : name)
const text = (name: string) => (props.model[name] as string | null) ?? ''
const list = (name: string) => (props.model[name] as unknown[]) ?? []
const strings = (name: string) => (props.model[name] as string[]) ?? []
const record = (name: string) => props.model[name] as Record<string, unknown>

function setLine(name: string, index: number, value: string) {
  const next = [...strings(name)]
  next[index] = value
  emit('change', at(name), next)
}

function addLine(name: string) {
  emit('change', at(name), [...strings(name), ''])
}

function removeLine(name: string, index: number) {
  emit(
    'change',
    at(name),
    strings(name).filter((_, position) => position !== index),
  )
}

function itemTitle(
  field: Extract<LandingField, { kind: 'list' }>,
  item: unknown,
) {
  const value = (item as Record<string, unknown>)[field.titleField]
  return typeof value === 'string' && value.trim() ? value : 'Belum diisi'
}
</script>

<template>
  <div class="space-y-5">
    <template
      v-for="field in fields"
      :key="field.name"
    >
      <div
        v-if="field.kind === 'text'"
        class="space-y-1.5"
      >
        <label
          :for="`f-${at(field.name)}`"
          class="text-[length:var(--text-control,0.75rem)] font-medium"
          >{{ field.label }}</label
        >
        <Textarea
          v-if="field.multiline"
          :id="`f-${at(field.name)}`"
          :name="at(field.name)"
          :model-value="text(field.name)"
          :maxlength="field.max"
          :disabled="disabled"
          :aria-invalid="errors[at(field.name)] ? 'true' : undefined"
          :aria-describedby="
            errors[at(field.name)] ? `e-${at(field.name)}` : undefined
          "
          rows="3"
          @update:model-value="emit('change', at(field.name), $event)"
        />
        <Input
          v-else
          :id="`f-${at(field.name)}`"
          :name="at(field.name)"
          :model-value="text(field.name)"
          :maxlength="field.max"
          :disabled="disabled"
          :aria-invalid="errors[at(field.name)] ? 'true' : undefined"
          :aria-describedby="
            errors[at(field.name)] ? `e-${at(field.name)}` : undefined
          "
          @update:model-value="emit('change', at(field.name), $event)"
        />
        <p
          v-if="errors[at(field.name)]"
          :id="`e-${at(field.name)}`"
          role="alert"
          class="text-xs text-destructive"
        >
          {{ errors[at(field.name)] }}
        </p>
      </div>

      <div
        v-else-if="field.kind === 'lines' || field.kind === 'tags'"
        class="space-y-1.5"
      >
        <p class="text-[length:var(--text-control,0.75rem)] font-medium">
          {{ field.label }}
        </p>
        <div
          v-for="(line, index) in strings(field.name)"
          :key="index"
          class="flex gap-2"
        >
          <Input
            :name="`${at(field.name)}.${index}`"
            :aria-label="`${field.label} ${index + 1}`"
            :model-value="line"
            :maxlength="field.max"
            :disabled="disabled"
            @update:model-value="setLine(field.name, index, $event as string)"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            class="shrink-0"
            :aria-label="`Hapus baris ${index + 1} ${field.label}`"
            :disabled="disabled"
            @click="removeLine(field.name, index)"
          >
            <Trash2
              class="size-4"
              aria-hidden="true"
            />
          </Button>
        </div>
        <p
          v-for="(message, key) in errors"
          v-show="String(key).startsWith(`${at(field.name)}`)"
          :key="String(key)"
          role="alert"
          class="text-xs text-destructive"
        >
          {{ message }}
        </p>
        <Button
          type="button"
          variant="outline"
          :data-test="`add-line-${at(field.name)}`"
          :disabled="
            disabled ||
            strings(field.name).length >=
              (field.kind === 'lines' ? field.maxLines : field.maxItems)
          "
          @click="addLine(field.name)"
        >
          <Plus
            class="mr-1.5 size-4"
            aria-hidden="true"
          />
          {{ field.kind === 'lines' ? 'Tambah baris' : 'Tambah label' }}
        </Button>
      </div>

      <LandingImageField
        v-else-if="field.kind === 'image'"
        :model-value="(model[field.name] as LandingImageRef | null) ?? null"
        :purpose="field.purpose"
        :label="field.label"
        :optional="field.optional"
        :built-in="field.builtIn"
        :disabled="disabled"
        :error="errors[at(field.name)]"
        @update:model-value="emit('change', at(field.name), $event)"
      />

      <fieldset
        v-else-if="field.kind === 'group'"
        class="space-y-4 rounded-lg border p-4"
      >
        <legend
          class="px-1 text-[length:var(--text-control,0.75rem)] font-medium"
        >
          {{ field.label }}
        </legend>
        <LandingFieldTree
          :fields="field.fields"
          :model="record(field.name)"
          :path="at(field.name)"
          :errors="errors"
          :disabled="disabled"
          @change="(p, v) => emit('change', p, v)"
          @add="(p, b) => emit('add', p, b)"
          @remove="(p, i) => emit('remove', p, i)"
          @move="(p, i, s) => emit('move', p, i, s)"
        />
      </fieldset>

      <div
        v-else
        class="space-y-3"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="text-[length:var(--text-control,0.75rem)] font-medium">
            {{ field.label }}
            <span class="font-normal text-muted-foreground"
              >({{ list(field.name).length }} dari maks. {{ field.max }})</span
            >
          </p>
        </div>
        <p
          v-if="errors[at(field.name)]"
          role="alert"
          class="text-xs text-destructive"
        >
          {{ errors[at(field.name)] }}
        </p>
        <div
          v-for="(item, index) in list(field.name)"
          :key="index"
          data-test="list-item"
          class="space-y-4 rounded-lg border p-4"
        >
          <div class="flex items-center justify-between gap-2">
            <p
              class="min-w-0 break-words text-[length:var(--text-control,0.75rem)] font-medium"
            >
              {{ field.itemLabel }} {{ index + 1 }}:
              {{ itemTitle(field, item) }}
            </p>
            <div class="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                :aria-label="`Naikkan ${field.itemLabel} ${index + 1}`"
                :disabled="disabled || index === 0"
                @click="emit('move', at(field.name), index, -1)"
              >
                <ArrowUp
                  class="size-4"
                  aria-hidden="true"
                />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                :aria-label="`Turunkan ${field.itemLabel} ${index + 1}`"
                :disabled="disabled || index === list(field.name).length - 1"
                @click="emit('move', at(field.name), index, 1)"
              >
                <ArrowDown
                  class="size-4"
                  aria-hidden="true"
                />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                :aria-label="`Hapus ${field.itemLabel} ${index + 1}`"
                :disabled="disabled || list(field.name).length <= field.min"
                @click="emit('remove', at(field.name), index)"
              >
                <Trash2
                  class="size-4"
                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>
          <LandingFieldTree
            :fields="field.fields"
            :model="item as Record<string, unknown>"
            :path="`${at(field.name)}.${index}`"
            :errors="errors"
            :disabled="disabled"
            @change="(p, v) => emit('change', p, v)"
            @add="(p, b) => emit('add', p, b)"
            @remove="(p, i) => emit('remove', p, i)"
            @move="(p, i, s) => emit('move', p, i, s)"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          data-test="add-item"
          :disabled="disabled || list(field.name).length >= field.max"
          @click="emit('add', at(field.name), field.blank())"
        >
          <Plus
            class="mr-1.5 size-4"
            aria-hidden="true"
          />
          Tambah {{ field.itemNoun }}
        </Button>
      </div>
    </template>
  </div>
</template>
