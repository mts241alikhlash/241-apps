// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { addressApi } from '../api/addressApi'
import type { RegionCodes } from '../types'
import RegionSelect from './RegionSelect.vue'

vi.mock('../api/addressApi', () => ({
  addressApi: { getProvinces: vi.fn(), getRegionChildren: vi.fn() },
}))

const LevelStub = {
  props: ['modelValue', 'options', 'disabled', 'label', 'loading'],
  emits: ['update:modelValue'],
  template: `<div class="level" :data-label="label" :data-count="options.length" :data-disabled="String(!!disabled)">
    <button v-for="option in options" :key="option.id" type="button" :data-id="option.id" @click="$emit('update:modelValue', option.id)">{{ option.name }}</button>
  </div>`,
}

const EMPTY: RegionCodes = {
  provinceCode: '',
  regencyCode: '',
  districtCode: '',
  villageCode: '',
}
const FULL: RegionCodes = {
  provinceCode: '32',
  regencyCode: '32.04',
  districtCode: '32.04.01',
  villageCode: '32.04.01.2001',
}

const node = (code: string, level: string, parentCode: string | null) => ({
  code,
  name: `N ${code}`,
  level,
  parentCode,
})
const reply = (nodes: unknown[]) => ({ data: { data: nodes } }) as never
function childrenOf(code: string) {
  const children: Record<string, [string, 'REGENCY' | 'DISTRICT' | 'VILLAGE']> =
    {
      '32': ['32.04', 'REGENCY'],
      '31': ['31.71', 'REGENCY'],
      '32.04': ['32.04.01', 'DISTRICT'],
      '32.04.01': ['32.04.01.2001', 'VILLAGE'],
    }
  const child = children[code]
  return child ? [node(child[0], child[1], code)] : []
}

async function mountSelect(modelValue: RegionCodes = EMPTY) {
  const wrapper = mount(RegionSelect, {
    props: { modelValue },
    global: { stubs: { RegionLevelSelect: LevelStub } },
  })
  await flushPromises()
  return wrapper
}

const level = (wrapper: unknown, label: string) =>
  (wrapper as VueWrapper).get(`.level[data-label="${label}"]`)
const pick = (wrapper: unknown, label: string, id: string) =>
  level(wrapper, label).get(`button[data-id="${id}"]`).trigger('click')

describe('RegionSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(addressApi.getProvinces).mockResolvedValue(
      reply([node('32', 'PROVINCE', null), node('31', 'PROVINCE', null)]),
    )
    vi.mocked(addressApi.getRegionChildren).mockImplementation(((
      code: string,
    ) => Promise.resolve(reply(childrenOf(code)))) as never)
  })

  it('offers the provinces and four levels, with lower levels disabled', async () => {
    const wrapper = await mountSelect()
    const levels = wrapper.findAll('.level')
    expect(levels).toHaveLength(4)
    expect(level(wrapper, 'Provinsi').attributes('data-count')).toBe('2')
    expect(level(wrapper, 'Provinsi').attributes('data-disabled')).toBe('false')
    for (const label of ['Kabupaten/Kota', 'Kecamatan', 'Desa/Kelurahan']) {
      expect(level(wrapper, label).attributes('data-disabled')).toBe('true')
      expect(level(wrapper, label).attributes('data-count')).toBe('0')
    }
  })

  it('loads the next level and emits chosen code and official name', async () => {
    const wrapper = await mountSelect()
    await pick(wrapper, 'Provinsi', '32')
    await flushPromises()

    expect(addressApi.getRegionChildren).toHaveBeenCalledWith('32')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      { ...EMPTY, provinceCode: '32' },
    ])
    expect(wrapper.emitted('update:names')?.at(-1)).toEqual([
      { province: 'N 32', city: '', district: '', village: '' },
    ])
  })

  it('restores a saved chain by loading all child options', async () => {
    const wrapper = await mountSelect(FULL)
    expect(addressApi.getRegionChildren).toHaveBeenCalledWith('32')
    expect(addressApi.getRegionChildren).toHaveBeenCalledWith('32.04')
    expect(addressApi.getRegionChildren).toHaveBeenCalledWith('32.04.01')
    expect(level(wrapper, 'Desa/Kelurahan').attributes('data-count')).toBe('1')
    expect(level(wrapper, 'Desa/Kelurahan').attributes('data-disabled')).toBe(
      'false',
    )
  })

  it('clears descendants and their options when an ancestor changes', async () => {
    const wrapper = await mountSelect(FULL)
    await pick(wrapper, 'Provinsi', '31')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      { ...EMPTY, provinceCode: '31' },
    ])
    expect(wrapper.emitted('update:names')?.at(-1)).toEqual([
      { province: 'N 31', city: '', district: '', village: '' },
    ])
    expect(level(wrapper, 'Kecamatan').attributes('data-count')).toBe('0')
    expect(level(wrapper, 'Desa/Kelurahan').attributes('data-count')).toBe('0')
  })

  it('ignores a late child response from an earlier selection', async () => {
    const resolvers: Record<string, (value: unknown) => void> = {}
    vi.mocked(addressApi.getRegionChildren).mockImplementation(
      ((code: string) =>
        new Promise((resolve) => {
          resolvers[code] = resolve
        })) as never,
    )
    const wrapper = mount(
      defineComponent({
        components: { RegionSelect },
        setup: () => ({ model: ref({ ...EMPTY }) }),
        template: '<RegionSelect v-model="model" />',
      }),
      { global: { stubs: { RegionLevelSelect: LevelStub } } },
    )
    await flushPromises()

    await pick(wrapper, 'Provinsi', '31')
    await pick(wrapper, 'Provinsi', '32')
    resolvers['32'](reply([node('32.9', 'REGENCY', '32')]))
    await flushPromises()
    resolvers['31'](reply([node('31.1', 'REGENCY', '31')]))
    await flushPromises()

    expect(level(wrapper, 'Kabupaten/Kota').attributes('data-count')).toBe('1')
    expect(
      level(wrapper, 'Kabupaten/Kota').find('button[data-id="32.9"]').exists(),
    ).toBe(true)
  })

  it('shows an error and retry after province loading fails', async () => {
    vi.mocked(addressApi.getProvinces).mockRejectedValueOnce(
      new Error('offline'),
    )
    const wrapper = await mountSelect()
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Gagal memuat wilayah.',
    )
    expect(level(wrapper, 'Provinsi').attributes('data-count')).toBe('0')

    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(level(wrapper, 'Provinsi').attributes('data-count')).toBe('2')
  })

  it('shows the validation message for a selected level', async () => {
    const wrapper = mount(RegionSelect, {
      props: {
        modelValue: EMPTY,
        errors: { provinceCode: 'Provinsi wajib dipilih' },
      },
      global: { stubs: { RegionLevelSelect: LevelStub } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Provinsi wajib dipilih')
  })

  it('disables all levels when the parent form is disabled', async () => {
    const wrapper = mount(RegionSelect, {
      props: { modelValue: FULL, disabled: true },
      global: { stubs: { RegionLevelSelect: LevelStub } },
    })
    await flushPromises()
    for (const element of wrapper.findAll('.level')) {
      expect(element.attributes('data-disabled')).toBe('true')
    }
  })
})
