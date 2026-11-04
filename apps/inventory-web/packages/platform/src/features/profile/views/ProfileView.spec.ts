// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { ref } from 'vue'
import { expect, it, vi } from 'vitest'
import ProfileView from './ProfileView.vue'
import AddressInfoTab from '../../address/components/AddressInfoTab.vue'

vi.mock('../composables/useProfileView', () => ({
  useProfileView: () => ({
    activeTab: ref('address'),
    showEditAddress: ref(false),
    loading: ref(false),
    profileData: ref({ fullName: 'Administrator', roles: ['SUPER_ADMIN'] }),
    rawProfile: ref(null),
    isAdmin: ref(true),
    isEditable: ref(true),
    initials: ref('A'),
    profileSubtitle: ref('Super Admin'),
    avatarUrl: ref(''),
    isOwnProfile: ref(false),
    isUploadingPhoto: ref(false),
    getUserId: ref('admin-id'),
    actionConfig: ref({ text: 'Ubah Alamat' }),
    reloadProfile: vi.fn(),
    handleActionClick: vi.fn(),
    handlePhotoChange: vi.fn(),
    handlePhotoDelete: vi.fn(),
  }),
}))

it('keeps the address summary read-only and exposes only the existing edit action', () => {
  const wrapper = mount(ProfileView, {
    global: {
      plugins: [createPinia()],
      stubs: {
        PersonalInfoTab: true,
        SchoolIdentityCard: true,
        ChangePasswordSection: true,
        EditAddressDialog: true,
      },
    },
  })
  const summary = wrapper.findComponent(AddressInfoTab)
  expect(summary.findAll('input').length).toBeGreaterThan(0)
  expect(
    summary.findAll('input').every((input) => input.element.disabled),
  ).toBe(true)
  expect(summary.find('button[type="submit"]').exists()).toBe(false)
  expect(
    wrapper.findAll('button').some((button) => button.text() === 'Ubah Alamat'),
  ).toBe(true)
  wrapper.unmount()
})
