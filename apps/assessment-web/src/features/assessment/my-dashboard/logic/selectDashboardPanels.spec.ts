import { describe, expect, it } from 'vitest'
import { selectDashboardPanels } from './selectDashboardPanels'
import type {
  MyDashboard,
  MyStudentDashboard,
  MyEmployeeDashboard,
} from '../types'

const studentHalf: MyStudentDashboard = {
  classroom: { id: 'c1', code: 'VIII-A', name: null },
  todayLessons: [],
  attendance: { present: 0, absent: 0, late: 0, excused: 0, sick: 0 },
  latestScores: [],
  latestReportCard: null,
}

const employeeHalf: MyEmployeeDashboard = {
  todayLessons: [],
  load: { classroomCount: 0, subjectCount: 0 },
  supervisedClassrooms: [],
  ungradedAssessments: [],
  ungradedTotal: 0,
}

function payload(
  student: MyStudentDashboard | null,
  employee: MyEmployeeDashboard | null,
): MyDashboard {
  return {
    semester: { id: 's1', name: 'Ganjil' },
    today: { date: '2026-08-21', isWeeklyHoliday: false },
    student,
    employee,
  }
}

const values = (panels: { value: string }[]) => panels.map((p) => p.value)

describe('selectDashboardPanels', () => {
  it('gives a student their own dashboard and nothing else', () => {
    const panels = selectDashboardPanels(payload(studentHalf, null), false)
    expect(values(panels)).toEqual(['student'])
  })

  it('gives an employee their own dashboard and nothing else', () => {
    const panels = selectDashboardPanels(payload(null, employeeHalf), false)
    expect(values(panels)).toEqual(['employee'])
  })

  it('gives both to someone who both teaches and studies', () => {
    const panels = selectDashboardPanels(
      payload(studentHalf, employeeHalf),
      false,
    )
    expect(values(panels)).toEqual(['student', 'employee'])
  })

  it('gives only the school view to someone who may read it, records or not', () => {
    expect(
      values(selectDashboardPanels(payload(null, employeeHalf), true)),
    ).toEqual(['institution'])
    expect(
      values(selectDashboardPanels(payload(studentHalf, employeeHalf), true)),
    ).toEqual(['institution'])
  })

  it('gives an administrator with no records the school dashboard', () => {
    const panels = selectDashboardPanels(payload(null, null), true)
    expect(values(panels)).toEqual(['institution'])
  })

  it('gives nothing to someone with neither a record nor the permission', () => {
    expect(selectDashboardPanels(payload(null, null), false)).toEqual([])
  })

  it('treats a payload that never loaded as no personal dashboard', () => {
    expect(values(selectDashboardPanels(null, true))).toEqual(['institution'])
    expect(selectDashboardPanels(null, false)).toEqual([])
  })

  it('does not depend on what the role is called', () => {
    const asSarpras = selectDashboardPanels(payload(null, employeeHalf), false)
    const asEmployee = selectDashboardPanels(payload(null, employeeHalf), false)
    expect(asSarpras).toEqual(asEmployee)
  })
})
