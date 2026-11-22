import { computed, defineComponent } from 'vue'
import { useField } from 'vee-validate'

export const floatingFieldStub = defineComponent({
  props: {
    name: { type: String, required: true },
    label: String,
  },
  setup(props) {
    const { value, handleChange, errorMessage } = useField(() => props.name)
    const componentField = computed(() => ({
      modelValue: value.value,
      'onUpdate:modelValue': handleChange,
    }))
    return { value, handleChange, errorMessage, componentField }
  },
  template:
    '<div :data-field="name"><label>{{ label }}</label><slot :value="value" :handleChange="handleChange" :componentField="componentField" /><p v-if="errorMessage">{{ errorMessage }}</p></div>',
})
