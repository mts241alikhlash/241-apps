import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { Form as VeeForm } from 'vee-validate'
import { describe, expect, it } from 'vitest'
import EmployeeProfileTabFields from './EmployeeProfileTabFields.vue'

describe('EmployeeProfileTabFields', () => {
  it('connects floating labels to editable fields', async () => {
    const wrapper = mount(
      defineComponent({
        components: { VeeForm, EmployeeProfileTabFields },
        setup() {
          return {
            initialValues: {
              name: '',
              nik: '',
              gender: '',
              birthPlace: '',
              birthDate: '',
              email: '',
              phone: '',
            },
          }
        },
        template:
          '<VeeForm :initial-values="initialValues"><EmployeeProfileTabFields /></VeeForm>',
      }),
    )

    const name = wrapper.get('input[name="name"]')
    const label = wrapper.find('label[data-slot="ff-label"]')
    const labels = wrapper.findAll('label[data-slot="ff-label"]')

    expect(label.exists()).toBe(true)
    expect(label.attributes('for')).toBe(name.attributes('id'))
    expect(labels.map((fieldLabel) => fieldLabel.text())).toEqual([
      'Nama Lengkap *',
      'NIK (16 digit) *',
      'Jenis Kelamin *',
      'Tempat Lahir *',
      'Tanggal Lahir *',
      'Email',
      'No. HP',
    ])

    await name.setValue('Budi Santoso')
    await flushPromises()

    expect((name.element as HTMLInputElement).value).toBe('Budi Santoso')
    expect(label.classes()).not.toContain('ff-empty')

    const nik = wrapper.get('input[name="nik"]')
    const letterInput = new InputEvent('beforeinput', {
      data: 'a',
      inputType: 'insertText',
      cancelable: true,
    })
    nik.element.dispatchEvent(letterInput)
    expect(letterInput.defaultPrevented).toBe(true)

    const digitInput = new InputEvent('beforeinput', {
      data: '7',
      inputType: 'insertText',
      cancelable: true,
    })
    nik.element.dispatchEvent(digitInput)
    expect(digitInput.defaultPrevented).toBe(false)

    await nik.setValue('32 05-01ab')
    await flushPromises()

    expect((nik.element as HTMLInputElement).value).toBe('320501')
  })
})
