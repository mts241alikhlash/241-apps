import type { RouteRecordRaw } from 'vue-router'

export const examPresetRoutes: RouteRecordRaw[] = [
  {
    path: '/settings/presets',
    name: 'ExamPresets',
    component: () => import('./views/PresetSettingsView.vue'),
    meta: {
      title: 'Preset Kebijakan',
      requiresAuth: true,
      requiredPermission: 'exam-settings.manage',
      breadcrumbs: [
        { title: 'Pengaturan', href: '#' },
        { title: 'Preset', href: '/settings/presets' },
      ],
    },
  },
]
