import type { RouteRecordRaw } from 'vue-router'

export const assessmentItemRoutes: RouteRecordRaw[] = [
  {
    path: '/assessment/tasks',
    name: 'AssessmentItems',
    component: () => import('./views/AssessmentItemListView.vue'),
    meta: {
      title: 'Daftar Tugas',
      category: 'CLASSWORK',
      requiresAuth: true,
      requiredPermission: 'assessment-items.read',
      breadcrumbs: [
        { title: 'Penilaian', href: '#' },
        { title: 'Harian & Tugas', href: '#' },
        { title: 'Daftar Tugas', href: '/assessment/tasks' },
      ],
    },
  },
  {
    path: '/assessment/items',
    name: 'AssessmentGrading',
    component: () => import('./views/AssessmentGradingListView.vue'),
    meta: {
      title: 'Butir Penilaian',
      category: 'CLASSWORK',
      requiresAuth: true,
      requiredPermission: 'student-scores.read',
      breadcrumbs: [
        { title: 'Penilaian', href: '#' },
        { title: 'Harian & Tugas', href: '#' },
        { title: 'Butir Penilaian', href: '/assessment/items' },
      ],
    },
  },
  {
    path: '/assessment/exam-tasks',
    name: 'ExamAssessmentItems',
    component: () => import('./views/AssessmentItemListView.vue'),
    meta: {
      title: 'Daftar Ujian',
      category: 'EXAM',
      requiresAuth: true,
      requiredPermission: 'assessment-items.read',
      breadcrumbs: [
        { title: 'Penilaian', href: '#' },
        { title: 'Ujian', href: '#' },
        { title: 'Daftar Ujian', href: '/assessment/exam-tasks' },
      ],
    },
  },
  {
    path: '/assessment/exam-items',
    name: 'ExamAssessmentGrading',
    component: () => import('./views/AssessmentGradingListView.vue'),
    meta: {
      title: 'Butir Ujian',
      category: 'EXAM',
      requiresAuth: true,
      requiredPermission: 'student-scores.read',
      breadcrumbs: [
        { title: 'Penilaian', href: '#' },
        { title: 'Ujian', href: '#' },
        { title: 'Butir Ujian', href: '/assessment/exam-items' },
      ],
    },
  },
]
