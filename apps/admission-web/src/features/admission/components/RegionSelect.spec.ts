// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { admissionApi } from '../api/admissionApi'
import RegionSelect from './RegionSelect.vue'

vi.mock('../api/admissionApi', () => ({
  admissionApi: { getProvinces: vi.fn(), getRegionChildren: vi.fn() },
}))

vi.mock('vue-sonner', () => ({ toast: { error: vi.fn() } }))

const OptionSelect = {
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template:
    '<button class="level" @click="$emit(\'update:modelValue\', options[0]?.id ?? \'\')">{{ options.length }}</button>',
}

const EMPTY = {
  provinceCode: '',
  regencyCode: '',
  districtCode: '',
  villageCode: '',
}

const node = (code: string, level: string, parentCode: string | null) => ({
  code,
  name: `N ${code}`,
  level,
  parentCode,
})

async function mountSelect(modelValue = EMPTY) {
  const wrapper = mount(RegionSelect, {
    props: { modelValue },
    global: { stubs: { OptionSelect } },
  })
  await flushPromises()
  return wrapper
}

describe('RegionSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(admissionApi.getProvinces).mockResolvedValue({
      data: {
        data: [node('32', 'PROVINCE', null), node('31', 'PROVINCE', null)],
      },
    } as never)
    vi.mocked(admissionApi.getRegionChildren).mockImplementation(((
      code: string,
    ) =>
      Promise.resolve({
        data: { data: [node(`${code}.04`, 'REGENCY', code)] },
      })) as never)
  })

  it('offers the provinces and four levels', async () => {
    const wrapper = await mountSelect()

    const levels = wrapper.findAll('.level')
    expect(levels).toHaveLength(4)
    expect(levels[0].text()).toBe('2')
    expect(levels[1].text()).toBe('0')
  })

  it('gives every real region trigger a distinct accessible name', async () => {
    const wrapper = mount(RegionSelect, { props: { modelValue: EMPTY } })
    await flushPromises()
    expect(
      wrapper
        .findAll('[data-slot="select-trigger"]')
        .map((trigger) => trigger.attributes('aria-label')),
    ).toEqual(['Provinsi', 'Kabupaten/Kota', 'Kecamatan', 'Desa/Kelurahan'])
  })

  it('emits the new province with the three lower codes cleared', async () => {
    const wrapper = await mountSelect({
      provinceCode: '31',
      regencyCode: '31.04',
      districtCode: '31.04.10',
      villageCode: '31.04.10.2001',
    })

    await wrapper.findAll('.level')[0].trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      {
        provinceCode: '32',
        regencyCode: '',
        districtCode: '',
        villageCode: '',
      },
    ])
  })

  it('loads the regencies of a chosen province', async () => {
    const wrapper = await mountSelect()

    await wrapper.findAll('.level')[0].trigger('click')
    await flushPromises()

    expect(admissionApi.getRegionChildren).toHaveBeenCalledWith('32')
    expect(wrapper.findAll('.level')[1].text()).toBe('1')
  })

  it('loads the saved chain on mount so every level shows its options', async () => {
    const wrapper = await mountSelect({
      provinceCode: '32',
      regencyCode: '32.04',
      districtCode: '',
      villageCode: '',
    })

    expect(admissionApi.getRegionChildren).toHaveBeenCalledWith('32')
    expect(admissionApi.getRegionChildren).toHaveBeenCalledWith('32.04')
    expect(wrapper.findAll('.level')[1].text()).toBe('1')
    expect(wrapper.findAll('.level')[2].text()).toBe('1')
  })

  it('clears the levels below one that is changed', async () => {
    const wrapper = await mountSelect({
      provinceCode: '32',
      regencyCode: '32.04',
      districtCode: '32.04.10',
      villageCode: '',
    })

    await wrapper.findAll('.level')[1].trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      {
        provinceCode: '32',
        regencyCode: '32.04',
        districtCode: '',
        villageCode: '',
      },
    ])
  })

  it('keeps the regencies of the last province chosen when an earlier answer arrives late', async () => {
    let releaseFirst: (() => void) | undefined
    vi.mocked(admissionApi.getRegionChildren).mockImplementation(((
      code: string,
    ) =>
      code === '32'
        ? new Promise((resolve) => {
            releaseFirst = () =>
              resolve({
                data: {
                  data: [
                    node('32.04', 'REGENCY', '32'),
                    node('32.05', 'REGENCY', '32'),
                  ],
                },
              })
          })
        : Promise.resolve({
            data: { data: [node('31.71', 'REGENCY', '31')] },
          })) as never)
    const wrapper = await mountSelect()
    const province = wrapper.findAllComponents(OptionSelect)[0].vm as {
      $emit: (event: string, value: string) => void
    }

    province.$emit('update:modelValue', '32')
    province.$emit('update:modelValue', '31')
    await flushPromises()
    releaseFirst?.()
    await flushPromises()

    expect(wrapper.findAll('.level')[1].text()).toBe('1')
  })

  it('labels each level with a floating label', async () => {
    const wrapper = await mountSelect()

    const labels = wrapper
      .findAll('[data-slot="ff-label"]')
      .map((l) => l.text())
    expect(labels).toEqual([
      'Provinsi *',
      'Kabupaten/Kota *',
      'Kecamatan *',
      'Desa/Kelurahan *',
    ])
  })

  it('shows no error before the form was validated', async () => {
    const wrapper = await mountSelect()

    expect(wrapper.find('.ff-error').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('wajib dipilih')
  })

  it('names every empty level once the form is invalid', async () => {
    const wrapper = await mountSelect()
    await wrapper.setProps({ invalid: true })

    const labels = wrapper
      .findAll('[data-slot="ff-label"]')
      .map((l) => l.text())
    expect(labels).toEqual([
      'Provinsi wajib dipilih',
      'Kabupaten/Kota wajib dipilih',
      'Kecamatan wajib dipilih',
      'Desa/Kelurahan wajib dipilih',
    ])
    expect(wrapper.findAll('.ff-error')).toHaveLength(4)
  })

  it('keeps a filled level normal while the others are invalid', async () => {
    const wrapper = await mountSelect({ ...EMPTY, provinceCode: '32' })
    await wrapper.setProps({ invalid: true })

    const labels = wrapper
      .findAll('[data-slot="ff-label"]')
      .map((l) => l.text())
    expect(labels[0]).toBe('Provinsi *')
    expect(labels[1]).toBe('Kabupaten/Kota wajib dipilih')
  })
})
