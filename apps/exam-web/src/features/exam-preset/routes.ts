import type { RouteRecordRaw } from 'vue-router'

export const examPresetRoutes: RouteRecordRaw[] = [
  {
    path: '/settings/presets',
    name: 'ExamPresets',
    component: () => import('./views/PresetSettingsView.vue'),
    meta: {
      title: 'Preset Kebijakan',
      requiresAuth: true,
      requiredPermission: 'exam-schedules.manage-all',
      breadcrumbs: [
        { title: 'Pengaturan', href: '#' },
        { title: 'Preset', href: '/settings/presets' },
      ],
    },
  },
]
