import '@mts241alikhlash/web-shared/types/router'
import { academicCalendarRoutes } from '@/features/academic/academic-calendar'
import { academicSettingRoutes } from '@/features/academic/academic-setting'
import { academicYearRoutes } from '@/features/academic/academic-year'
import { ssoAuthRoutes } from '@/features/platform/auth'
import { classroomRoutes } from '@/features/academic/classroom'
import { gradeRoutes } from '@/features/academic/grade'
import { curriculumRoutes } from '@/features/academic/curriculum'
import { curriculumSubjectRoutes } from '@/features/academic/curriculum-subject'
import { lessonRoutes } from '@/features/academic/lesson'
import { referenceListRoutes } from '@/features/academic/reference-list'
import { parentRoutes } from '@/features/academic/parent'
import { studentRoutes } from '@/features/academic/student'
import { studentGraduationRoutes } from '@/features/academic/student-graduation'
import { studentParentRoutes } from '@/features/academic/student-parent'
import { scheduleRoutes } from '@/features/academic/schedule'
import { semesterRoutes } from '@/features/academic/semester'
import { subjectRoutes } from '@/features/academic/subject'
import { teachingAssignmentRoutes } from '@/features/academic/teaching-assignment'
import { timeSlotRoutes } from '@/features/academic/time-slot'
import { academicInfoRoutes } from '@/features/academic/academic-info'
import { academicCalendarTypeRoutes } from '@/features/academic/academic-calendar-type'
import { semesterTypeRoutes } from '@/features/academic/semester-type'
import { createRouter, createWebHistory } from 'vue-router'
import { profileRoutes } from '@/features/platform/profile'
import { authSessionService, useAuthStore } from '@/features/platform/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/academic/info',
    },
    ...ssoAuthRoutes,
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        ...subjectRoutes,
        ...teachingAssignmentRoutes,
        ...timeSlotRoutes,
        ...lessonRoutes,
        ...scheduleRoutes,
        ...academicCalendarRoutes,
        ...academicSettingRoutes,
        ...profileRoutes,
        ...academicYearRoutes,
        ...semesterRoutes,
        ...curriculumRoutes,
        ...curriculumSubjectRoutes,
        ...classroomRoutes,
        ...gradeRoutes,
        ...referenceListRoutes,
        ...studentRoutes,
        ...studentParentRoutes,
        ...parentRoutes,
        ...studentGraduationRoutes,
        ...academicInfoRoutes,
        ...academicCalendarTypeRoutes,
        ...semesterTypeRoutes,
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/layouts/NotFoundPage.vue'),
      meta: { title: 'Halaman Tidak Ditemukan' },
    },
  ],
})

router.beforeEach((to) => {
  const store = useAuthStore()
  if (!store.user) {
    const user = authSessionService.hydrateUser()
    if (user) {
      store.setUser(user)
    }
  }

  const hasSession = Boolean(store.user)

  if (to.meta.requiresAuth && !hasSession) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && hasSession) {
    return { name: 'academic-info' }
  }

  const requiredPermission = to.meta.requiredPermission
  const requiredAnyPermission = to.meta.requiredAnyPermission
  if (requiredPermission || requiredAnyPermission?.length) {
    const user = store.user
    if (!user) return { name: 'login' }
    const userPermissions = user.permissions ?? []

    const allowed = requiredPermission
      ? userPermissions.includes(requiredPermission)
      : (requiredAnyPermission ?? []).some((code) =>
          userPermissions.includes(code),
        )

    if (!allowed) return { name: 'academic-info' }
  }

  return true
})

router.afterEach((to) => {
  const title = to.meta.title
  if (typeof title === 'string') document.title = title
})

export default router
