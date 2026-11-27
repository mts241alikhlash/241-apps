// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import RecordAbsenceDialog from './RecordAbsenceDialog.vue'

const { recordAbsence } = vi.hoisted(() => ({
  recordAbsence: vi.fn(),
}))

vi.mock('../services/examRoomService', () => ({
  examRoomService: { recordAbsence },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { disabled: Boolean },
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})

const stubs = {
  Dialog: passthrough,
  DialogBody: passthrough,
  DialogContent: passthrough,
  DialogDescription: passthrough,
  DialogFooter: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  FloatingLabelField: passthrough,
  Select: passthrough,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  Textarea: passthrough,
  Button: button,
}

describe('RecordAbsenceDialog', () => {
  it('shows a clear message instead of calling API when slotId is empty', async () => {
    const wrapper = mount(RecordAbsenceDialog, {
      props: {
        open: true,
        roomId: 'r1',
        slotId: '',
        participant: {
          seatNumber: 1,
          participantNumber: '001',
          studentId: 's1',
          studentName: 'Budi',
          nis: '101',
          classroomName: 'VII-A',
          subjectName: 'IPA',
          packageTitle: 'UAS',
          scheduleId: 'sch1',
          totalQuestions: 10,
          offline: false,
          session: null,
          absence: null,
        },
      },
      global: { stubs },
    })

    const saveBtn = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Simpan'))!
    await saveBtn.trigger('click')
    await flushPromises()

    expect(recordAbsence).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Slot pengawas ruangan belum tersedia.')
  })
})
