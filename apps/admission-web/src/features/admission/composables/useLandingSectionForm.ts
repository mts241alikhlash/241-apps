import { computed, ref, type Ref } from 'vue'
import { landingDefaults } from '../data/landingDefaults'
import type { LandingSectionConfig } from '../data/landingFormConfig'
import {
  addItem,
  moveItem,
  removeItem,
  setAt,
  toFormContent,
  toServerContent,
  validateSection,
} from '../landingForm'
import { landingService } from '../services/landingService'
import type { LandingDraftOverview } from '../types/landing'

export function useLandingSectionForm<T extends object>(
  config: LandingSectionConfig,
  initial: T,
) {
  const values = ref(toFormContent(config.fields, initial)) as Ref<T>
  const baseline = ref(JSON.stringify(values.value))
  const errors = ref<Record<string, string>>({})
  const saving = ref(false)

  const dirty = computed(() => JSON.stringify(values.value) !== baseline.value)

  function setField(path: string, value: unknown) {
    values.value = setAt(values.value, path, value)
    delete errors.value[path]
  }

  function add(path: string, blank: unknown) {
    values.value = addItem(values.value, path, blank)
  }

  function remove(path: string, index: number) {
    values.value = removeItem(values.value, path, index)
    errors.value = {}
  }

  function move(path: string, index: number, step: number) {
    values.value = moveItem(values.value, path, index, step)
    errors.value = {}
  }

  function fillBuiltIn() {
    values.value = toFormContent(
      config.fields,
      landingDefaults[config.key] as unknown as T,
    )
    errors.value = {}
  }

  function reset(content: T) {
    values.value = toFormContent(config.fields, content)
    baseline.value = JSON.stringify(values.value)
    errors.value = {}
  }

  async function save(): Promise<LandingDraftOverview | null> {
    errors.value = validateSection(config.fields, values.value)
    if (Object.keys(errors.value).length > 0) return null
    saving.value = true
    const result = await landingService.saveSection(
      config.key,
      toServerContent(config.fields, values.value),
    )
    saving.value = false
    if ('error' in result) return null
    baseline.value = JSON.stringify(values.value)
    return result.overview
  }

  return {
    values,
    errors,
    dirty,
    saving,
    setField,
    add,
    remove,
    move,
    fillBuiltIn,
    reset,
    save,
  }
}
