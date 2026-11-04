// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { FormControl } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import AdmissionField from './AdmissionField.vue'

it('replaces the field label with the error, connected to its input', async () => {
  const Host = defineComponent({
    components: { AdmissionField, FormControl, TextInput: Input },
    setup() {
      const { handleSubmit } = useForm({
        validationSchema: toTypedSchema(
          z.object({ name: z.string().min(1, 'Nama wajib diisi') }),
        ),
        initialValues: { name: '' },
      })
      return { submit: handleSubmit(() => undefined) }
    },
    template: `<form @submit.prevent="submit"><AdmissionField v-slot="{ componentField }" name="name" label="Nama Lengkap"><FormControl><TextInput v-bind="componentField" /></FormControl></AdmissionField><button type="submit">Kirim</button></form>`,
  })
  const wrapper = mount(Host)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  await vi.waitFor(() =>
    expect(wrapper.find('[data-slot="form-message"]').exists()).toBe(true),
  )
  expect(wrapper.get('label').text()).toBe('Nama wajib diisi')
  const message = wrapper.get('[data-slot="form-message"]')
  expect(message.text()).toBe('Nama wajib diisi')
  expect(wrapper.get('input').attributes('aria-describedby')).toContain(
    message.attributes('id'),
  )
})
