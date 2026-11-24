import { SYSTEM_PERMISSIONS } from '../../permission/constants/permission-codes.constants.js'
import {
  DEFAULT_ROLES,
  isExplicitOnly,
  resolveGrants,
} from './default-roles.js'
import { STRUCTURAL_ROLES } from './policies/structural-roles.policy.js'

const codesOf = (role: string) => new Set(resolveGrants(role))
const contains = (outer: string, inner: string) =>
  [...codesOf(inner)].every((code) => codesOf(outer).has(code))

describe('default roles', () => {
  it('resolves every role against the catalog', () => {
    for (const role of DEFAULT_ROLES) {
      expect(() => resolveGrants(role.code)).not.toThrow()
    }
  })

  it('defines the default roles without ASSESSMENT_ADMIN and includes EXAM_ADMIN', () => {
    const codes = DEFAULT_ROLES.map((role) => role.code)
    expect(codes).toContain('EXAM_ADMIN')
    expect(codes).not.toContain('ASSESSMENT_ADMIN')
    expect(DEFAULT_ROLES.filter((role) => !role.structural)).toHaveLength(23)
    expect(
      DEFAULT_ROLES.filter((role) => role.structural)
        .map((role) => role.code)
        .sort(),
    ).toEqual(['APPLICANT', 'EMPLOYEE', 'STUDENT', 'TEACHER'])
  })

  it('uses unique English codes', () => {
    const codes = DEFAULT_ROLES.map((role) => role.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) expect(code).toMatch(/^[A-Z][A-Z_]+$/)
  })

  it('gives each superior every permission of the staff below it', () => {
    expect(contains('TREASURER', 'FINANCE_STAFF')).toBe(true)
    expect(contains('VICE_PRINCIPAL_CURRICULUM', 'CURRICULUM_STAFF')).toBe(true)
    expect(
      contains('VICE_PRINCIPAL_STUDENT_AFFAIRS', 'STUDENT_AFFAIRS_STAFF'),
    ).toBe(true)
  })

  it('limits EMPLOYEE to self-service permissions', () => {
    expect(resolveGrants('EMPLOYEE')).toEqual([
      'employees.read-own',
      'leave-requests.create',
      'leave-requests.read-own',
      'payroll-payslips.read-own',
      'presence-records.read-own',
    ])
  })

  it('includes employee self-service grants in TEACHER defaults', () => {
    expect(contains('TEACHER', 'EMPLOYEE')).toBe(true)
  })

  it('keeps the operator out of portal and payroll', () => {
    expect(
      [...codesOf('OPERATOR')].filter(
        (code) => code.startsWith('portal-') || code.startsWith('payroll-'),
      ),
    ).toEqual([])
  })

  it('lets the principal read and approve but never change data', () => {
    const changing = [...codesOf('PRINCIPAL')].filter((code) =>
      /\.(create|update|delete)$/.test(code),
    )
    expect(changing).toEqual(['inventory-approvals.update'])
    expect(codesOf('PRINCIPAL').has('payroll-runs.approve')).toBe(true)
  })

  it('lets TU Kesantrian and the deputy for student affairs enroll and number students, and others only read the queue', () => {
    for (const role of [
      'STUDENT_AFFAIRS_STAFF',
      'VICE_PRINCIPAL_STUDENT_AFFAIRS',
    ]) {
      for (const action of ['read', 'process', 'nis']) {
        expect(codesOf(role)).toContain(`admission-enrollments.${action}`)
      }
    }
    for (const role of ['ADMISSION_ADMIN', 'OPERATOR']) {
      expect(codesOf(role)).toContain('admission-enrollments.read')
      expect(codesOf(role)).not.toContain('admission-enrollments.process')
      expect(codesOf(role)).not.toContain('admission-enrollments.nis')
    }
    for (const role of ['TREASURER']) {
      expect(codesOf(role)).not.toContain('admission-enrollments.process')
      expect(codesOf(role)).not.toContain('admission-enrollments.nis')
    }
    expect(codesOf('PRINCIPAL')).toContain('admission-enrollments.read')
    expect(codesOf('PRINCIPAL')).not.toContain('admission-enrollments.process')
  })

  it('lets TU Kesantrian and the deputy for student affairs read, upload and check late documents, and others only read them', () => {
    for (const role of [
      'STUDENT_AFFAIRS_STAFF',
      'VICE_PRINCIPAL_STUDENT_AFFAIRS',
    ]) {
      for (const action of ['read', 'upload', 'verify']) {
        expect(codesOf(role)).toContain(`admission-late-documents.${action}`)
      }
    }
    for (const role of [
      'ADMISSION_ADMIN',
      'OPERATOR',
      'PRINCIPAL',
      'VICE_PRINCIPAL_CURRICULUM',
    ]) {
      expect(codesOf(role)).toContain('admission-late-documents.read')
      expect(codesOf(role)).not.toContain('admission-late-documents.upload')
      expect(codesOf(role)).not.toContain('admission-late-documents.verify')
    }
    for (const role of ['TREASURER', 'VICE_PRINCIPAL_CURRICULUM']) {
      expect(codesOf(role)).not.toContain('admission-late-documents.upload')
      expect(codesOf(role)).not.toContain('admission-late-documents.verify')
    }
  })

  it('lets applicants apply and nothing else', () => {
    expect(resolveGrants('APPLICANT')).toEqual(['admissions.apply'])
  })

  it('keeps applying for admission out of every staff role', () => {
    const staffWithApply = DEFAULT_ROLES.filter(
      (role) => role.code !== 'APPLICANT',
    )
      .map((role) => role.code)
      .filter((code) => resolveGrants(code).includes('admissions.apply'))
    expect(staffWithApply).toEqual([])
  })

  it('gives the parent role no permissions', () => {
    expect(resolveGrants('PARENT')).toEqual([])
  })

  it('refuses a code missing from the catalog', () => {
    const withoutApply = SYSTEM_PERMISSIONS.filter(
      (p) => p.code !== 'admissions.apply',
    )
    expect(() => resolveGrants('APPLICANT', withoutApply)).toThrow(
      'admissions.apply',
    )
  })

  it('refuses an unknown role', () => {
    expect(() => resolveGrants('NOT_A_ROLE')).toThrow('NOT_A_ROLE')
  })

  it('keeps the structural list to roles the code depends on', () => {
    expect(STRUCTURAL_ROLES.map((r) => r.code).sort()).toEqual([
      'APPLICANT',
      'EMPLOYEE',
      'STUDENT',
      'SUPER_ADMIN',
      'TEACHER',
    ])
  })

  it('lets admission staff read document types and admins manage them', () => {
    expect(codesOf('STUDENT_AFFAIRS_STAFF')).toContain(
      'admission-document-types.read',
    )
    expect(codesOf('STUDENT_AFFAIRS_STAFF')).not.toContain(
      'admission-document-types.delete',
    )
    for (const action of ['read', 'create', 'update', 'delete']) {
      expect(codesOf('OPERATOR')).toContain(
        `admission-document-types.${action}`,
      )
      expect(codesOf('ADMISSION_ADMIN')).toContain(
        `admission-document-types.${action}`,
      )
    }
  })

  it('lets admission staff read downloads and admins manage them', () => {
    expect(codesOf('STUDENT_AFFAIRS_STAFF')).toContain(
      'admission-downloads.read',
    )
    for (const action of ['create', 'update', 'delete']) {
      expect(codesOf('STUDENT_AFFAIRS_STAFF')).not.toContain(
        `admission-downloads.${action}`,
      )
      expect(codesOf('TREASURER')).not.toContain(
        `admission-downloads.${action}`,
      )
    }
    for (const action of ['read', 'create', 'update', 'delete']) {
      expect(codesOf('OPERATOR')).toContain(`admission-downloads.${action}`)
      expect(codesOf('ADMISSION_ADMIN')).toContain(
        `admission-downloads.${action}`,
      )
    }
  })

  it('lets admission staff read the landing settings and admins edit and publish them', () => {
    expect(codesOf('STUDENT_AFFAIRS_STAFF')).toContain('admission-landing.read')
    for (const action of ['update', 'publish']) {
      expect(codesOf('STUDENT_AFFAIRS_STAFF')).not.toContain(
        `admission-landing.${action}`,
      )
      expect(codesOf('TREASURER')).not.toContain(`admission-landing.${action}`)
    }
    for (const action of ['read', 'update', 'publish']) {
      expect(codesOf('OPERATOR')).toContain(`admission-landing.${action}`)
      expect(codesOf('ADMISSION_ADMIN')).toContain(
        `admission-landing.${action}`,
      )
    }
  })

  it('lets only the three leaders decide admissions, and staff read the queue', () => {
    for (const leader of [
      'PRINCIPAL',
      'VICE_PRINCIPAL_CURRICULUM',
      'VICE_PRINCIPAL_STUDENT_AFFAIRS',
    ]) {
      expect(codesOf(leader)).toContain('admission-decisions.read')
      expect(codesOf(leader)).toContain('admission-decisions.decide')
    }
    for (const other of [
      'ADMISSION_ADMIN',
      'OPERATOR',
      'TREASURER',
      'STUDENT_AFFAIRS_STAFF',
      'SYSTEM_ADMIN',
    ]) {
      expect(codesOf(other)).not.toContain('admission-decisions.decide')
    }
    expect(codesOf('ADMISSION_ADMIN')).toContain('admission-decisions.read')
    expect(codesOf('OPERATOR')).toContain('admission-decisions.read')
    expect(codesOf('TREASURER')).not.toContain('admission-decisions.read')
  })

  it('lets the curriculum deputy open an applicant and a file when deciding', () => {
    expect(codesOf('VICE_PRINCIPAL_CURRICULUM')).toContain('admissions.read')
  })

  it('lets admission staff review documents and keeps the treasurer out', () => {
    for (const code of [
      'admission-documents.read',
      'admission-documents.verify',
    ]) {
      expect(codesOf('STUDENT_AFFAIRS_STAFF')).toContain(code)
      expect(codesOf('ADMISSION_ADMIN')).toContain(code)
      expect(codesOf('OPERATOR')).toContain(code)
      expect(codesOf('TREASURER')).not.toContain(code)
    }
  })

  it('lets the treasurer work payments but not documents, and staff only read them', () => {
    for (const action of ['read', 'verify', 'create']) {
      expect(codesOf('TREASURER')).toContain(`admission-payments.${action}`)
      expect(codesOf('ADMISSION_ADMIN')).toContain(
        `admission-payments.${action}`,
      )
      expect(codesOf('OPERATOR')).toContain(`admission-payments.${action}`)
    }
    expect(codesOf('TREASURER')).not.toContain('admissions.verify')
    expect(codesOf('STUDENT_AFFAIRS_STAFF')).toContain(
      'admission-payments.read',
    )
    expect(codesOf('STUDENT_AFFAIRS_STAFF')).not.toContain(
      'admission-payments.verify',
    )
  })

  it('lets the treasurer read waves for the payment queue filter', () => {
    expect(codesOf('TREASURER')).toContain('admission-waves.read')
  })

  it('merges ASSESSMENT_ADMIN academic permissions into ACADEMIC_ADMIN without operational exam grants', () => {
    for (const code of [
      'assessment-items.create',
      'student-scores.read',
      'report-cards.publish',
      'attendances.manage',
      'exam-scores.read',
      'exam-scores.read-all',
    ]) {
      expect(codesOf('ACADEMIC_ADMIN')).toContain(code)
    }

    const operationalExam = [...codesOf('ACADEMIC_ADMIN')].filter(
      (code) =>
        code.startsWith('exam-') &&
        code !== 'exam-scores.read' &&
        code !== 'exam-scores.read-all',
    )
    expect(operationalExam).toEqual([])
  })

  describe('exam questions', () => {
    const teacherCodes = ['read', 'create', 'update', 'delete'].map(
      (action) => `exam-questions.${action}`,
    )

    it('lets a teacher read, write and delete questions but never approve or manage others', () => {
      for (const code of teacherCodes)
        expect(codesOf('TEACHER')).toContain(code)
      expect(codesOf('TEACHER')).not.toContain('exam-questions.approve')
      expect(codesOf('TEACHER')).not.toContain('exam-questions.manage-all')
    })

    it('gives full question management including approve and manage-all to EXAM_ADMIN, OPERATOR and the curriculum deputy', () => {
      for (const role of [
        'EXAM_ADMIN',
        'OPERATOR',
        'VICE_PRINCIPAL_CURRICULUM',
      ]) {
        for (const action of [
          'read',
          'create',
          'update',
          'delete',
          'approve',
          'manage-all',
        ]) {
          expect(codesOf(role)).toContain(`exam-questions.${action}`)
        }
      }
    })

    it('lets curriculum staff read questions only without approve or manage-all', () => {
      expect(codesOf('CURRICULUM_STAFF')).toContain('exam-questions.read')
      for (const action of [
        'create',
        'update',
        'delete',
        'approve',
        'manage-all',
      ]) {
        expect(codesOf('CURRICULUM_STAFF')).not.toContain(
          `exam-questions.${action}`,
        )
      }
    })

    it('keeps every exam question code away from academic admin, students and applicants', () => {
      for (const role of [
        'ACADEMIC_ADMIN',
        'STUDENT',
        'APPLICANT',
        'EMPLOYEE',
      ]) {
        expect(
          [...codesOf(role)].filter((code) =>
            code.startsWith('exam-questions.'),
          ),
        ).toEqual([])
      }
    })

    it('never gives approve or manage-all through a broad grant', () => {
      const holders = DEFAULT_ROLES.filter(
        (role) =>
          codesOf(role.code).has('exam-questions.approve') ||
          codesOf(role.code).has('exam-questions.manage-all'),
      ).map((role) => role.code)

      expect(holders.sort()).toEqual([
        'EXAM_ADMIN',
        'OPERATOR',
        'VICE_PRINCIPAL_CURRICULUM',
      ])
    })
  })

  describe('exam packages, schedules and settings', () => {
    const teacherScheduleCodes = [
      'read',
      'create',
      'update',
      'cancel',
      'manage',
      'access-code',
    ].map((action) => `exam-schedules.${action}`)

    it('gives full Istiqra management including exam-schedules.manage-all and exam-settings.manage to EXAM_ADMIN, OPERATOR and VICE_PRINCIPAL_CURRICULUM', () => {
      for (const role of [
        'EXAM_ADMIN',
        'OPERATOR',
        'VICE_PRINCIPAL_CURRICULUM',
      ]) {
        expect(contains(role, 'EXAM_ADMIN')).toBe(true)
        for (const code of [
          ...teacherScheduleCodes,
          'exam-schedules.manage-all',
          'exam-settings.manage',
          'exam-packages.read',
          'exam-packages.create',
          'exam-packages.update',
          'exam-packages.delete',
          'exam-packages.adjust-key',
        ]) {
          expect(codesOf(role)).toContain(code)
        }
      }
    })

    it('gives curriculum staff and student affairs deputy schedule management without settings or adjust-key', () => {
      for (const code of teacherScheduleCodes) {
        expect(codesOf('CURRICULUM_STAFF')).toContain(code)
        expect(codesOf('VICE_PRINCIPAL_STUDENT_AFFAIRS')).toContain(code)
      }
      expect(codesOf('CURRICULUM_STAFF')).not.toContain(
        'exam-schedules.manage-all',
      )
      expect(codesOf('VICE_PRINCIPAL_STUDENT_AFFAIRS')).toContain(
        'exam-schedules.manage-all',
      )
      for (const role of [
        'CURRICULUM_STAFF',
        'VICE_PRINCIPAL_STUDENT_AFFAIRS',
      ]) {
        expect(codesOf(role)).toContain('exam-packages.read')
        expect(codesOf(role)).not.toContain('exam-packages.adjust-key')
        expect(codesOf(role)).not.toContain('exam-settings.manage')
      }
    })

    it('lets a teacher manage packages and non-exam schedules without manage-all or exam-settings', () => {
      for (const action of ['read', 'create', 'update', 'delete']) {
        expect(codesOf('TEACHER')).toContain(`exam-packages.${action}`)
      }
      for (const code of teacherScheduleCodes) {
        expect(codesOf('TEACHER')).toContain(code)
      }
      expect(codesOf('TEACHER')).not.toContain('exam-schedules.manage-all')
      expect(codesOf('TEACHER')).not.toContain('exam-packages.adjust-key')
      expect(codesOf('TEACHER')).not.toContain('exam-settings.manage')
    })

    it('keeps package and schedule codes away from academic admin, students, applicants and employees', () => {
      for (const role of [
        'ACADEMIC_ADMIN',
        'STUDENT',
        'APPLICANT',
        'EMPLOYEE',
      ]) {
        expect(
          [...codesOf(role)].filter(
            (code) =>
              code.startsWith('exam-packages.') ||
              code.startsWith('exam-schedules.') ||
              code.startsWith('exam-settings.'),
          ),
        ).toEqual([])
      }
    })

    it('lets the principal read packages and schedules but not see the access code or settings', () => {
      expect(codesOf('PRINCIPAL')).toContain('exam-packages.read')
      expect(codesOf('PRINCIPAL')).toContain('exam-schedules.read')
      expect(codesOf('PRINCIPAL')).not.toContain('exam-schedules.access-code')
      expect(codesOf('PRINCIPAL')).not.toContain('exam-settings.manage')
    })
  })

  describe('exam sessions', () => {
    const holders = (code: string) =>
      DEFAULT_ROLES.filter((role) => codesOf(role.code).has(code))
        .map((role) => role.code)
        .sort()

    it('gives exam-sessions.take to students and to no other role', () => {
      expect(holders('exam-sessions.take')).toEqual(['STUDENT'])
    })

    it('gives release to the exam operations and committee roles', () => {
      expect(holders('exam-sessions.release')).toEqual([
        'CURRICULUM_STAFF',
        'EXAM_ADMIN',
        'EXAM_SUPERVISOR',
        'EXAM_TECHNICIAN',
        'OPERATOR',
        'VICE_PRINCIPAL_CURRICULUM',
        'VICE_PRINCIPAL_STUDENT_AFFAIRS',
      ])
    })

    it('gives read to those roles plus teachers and the principal', () => {
      expect(holders('exam-sessions.read')).toEqual([
        'CURRICULUM_STAFF',
        'EXAM_ADMIN',
        'EXAM_TECHNICIAN',
        'OPERATOR',
        'PRINCIPAL',
        'TEACHER',
        'VICE_PRINCIPAL_CURRICULUM',
        'VICE_PRINCIPAL_STUDENT_AFFAIRS',
      ])
    })

    it('keeps academic admin, applicants and employees away from every session code', () => {
      for (const role of ['ACADEMIC_ADMIN', 'APPLICANT', 'EMPLOYEE']) {
        expect(
          [...codesOf(role)].filter((code) =>
            code.startsWith('exam-sessions.'),
          ),
        ).toEqual([])
      }
    })
  })

  describe('exam grading and exam scores', () => {
    const holders = (code: string) =>
      DEFAULT_ROLES.filter((role) => codesOf(role.code).has(code))
        .map((role) => role.code)
        .sort()

    it('lets only teachers grade exam answers and leaves exam-grading.manage-all unassigned', () => {
      expect(holders('exam-grading.grade')).toEqual(['TEACHER'])
      expect(holders('exam-grading.manage-all')).toEqual([])
    })

    it('gives exam-grading.read-all to committee, admins and principal without grade', () => {
      expect(holders('exam-grading.read-all')).toEqual([
        'CURRICULUM_STAFF',
        'EXAM_ADMIN',
        'OPERATOR',
        'PRINCIPAL',
        'VICE_PRINCIPAL_CURRICULUM',
        'VICE_PRINCIPAL_STUDENT_AFFAIRS',
      ])
      expect(codesOf('TEACHER')).toContain('exam-grading.read')
      expect(codesOf('TEACHER')).not.toContain('exam-grading.read-all')
    })

    it('gives exam-scores.read and exam-scores.read-all to academic admin, committee, exam admins and principal', () => {
      expect(holders('exam-scores.read-all')).toEqual([
        'ACADEMIC_ADMIN',
        'CURRICULUM_STAFF',
        'EXAM_ADMIN',
        'OPERATOR',
        'PRINCIPAL',
        'VICE_PRINCIPAL_CURRICULUM',
        'VICE_PRINCIPAL_STUDENT_AFFAIRS',
      ])
      expect(codesOf('TEACHER')).toContain('exam-scores.read')
      expect(codesOf('TEACHER')).not.toContain('exam-scores.read-all')
    })

    it('keeps students, applicants and employees away from both', () => {
      for (const role of ['STUDENT', 'APPLICANT', 'EMPLOYEE']) {
        expect(
          [...codesOf(role)].filter(
            (code) =>
              code.startsWith('exam-grading.') ||
              code.startsWith('exam-scores.'),
          ),
        ).toEqual([])
      }
    })
  })

  describe('exam rooms and events', () => {
    const holders = (code: string) =>
      DEFAULT_ROLES.filter((role) => codesOf(role.code).has(code))
        .map((role) => role.code)
        .sort()
    const examCommittee = [
      'CURRICULUM_STAFF',
      'EXAM_ADMIN',
      'OPERATOR',
      'VICE_PRINCIPAL_CURRICULUM',
      'VICE_PRINCIPAL_STUDENT_AFFAIRS',
    ]

    it('gives exam event management and manage-all rooms to the exam committee and admins', () => {
      for (const code of ['exam-events.manage', 'exam-rooms.manage-all']) {
        expect(holders(code)).toEqual([...examCommittee].sort())
      }
      expect(holders('exam-packages.adjust-key')).toEqual([
        'EXAM_ADMIN',
        'OPERATOR',
        'VICE_PRINCIPAL_CURRICULUM',
      ])
    })

    it('lets the principal read events and all rooms without manage or write codes', () => {
      expect(holders('exam-events.read')).toEqual(
        [...examCommittee, 'PRINCIPAL'].sort(),
      )
      expect(holders('exam-rooms.read-all')).toEqual(['PRINCIPAL'])
      expect(codesOf('PRINCIPAL')).not.toContain('exam-events.manage')
      expect(codesOf('PRINCIPAL')).not.toContain('exam-rooms.manage-all')
      expect(codesOf('PRINCIPAL')).not.toContain('exam-rooms.supervise')
      expect(codesOf('PRINCIPAL')).not.toContain('exam-rooms.technician')
      expect(codesOf('PRINCIPAL')).not.toContain('exam-sessions.release')
      expect(codesOf('PRINCIPAL')).not.toContain('exam-grading.grade')
      expect(codesOf('PRINCIPAL')).not.toContain('exam-packages.adjust-key')
      expect(codesOf('PRINCIPAL')).not.toContain('exam-questions.approve')
    })

    it('lets every room managing role read the staff list the room forms need', () => {
      for (const role of examCommittee) {
        expect(codesOf(role).has('users.read')).toBe(true)
      }
      expect(codesOf('EXAM_TECHNICIAN')).not.toContain('users.read')
    })

    it('gives supervise strictly to EXAM_SUPERVISOR', () => {
      expect(holders('exam-rooms.supervise')).toEqual(['EXAM_SUPERVISOR'])
      expect(resolveGrants('EXAM_SUPERVISOR')).toEqual([
        'exam-rooms.supervise',
        'exam-sessions.release',
      ])
    })

    it('gives technician strictly to EXAM_TECHNICIAN without supervise, events or users.read', () => {
      expect(holders('exam-rooms.technician')).toEqual(['EXAM_TECHNICIAN'])
      expect(resolveGrants('EXAM_TECHNICIAN')).toEqual([
        'exam-rooms.technician',
        'exam-schedules.access-code',
        'exam-schedules.read',
        'exam-sessions.read',
        'exam-sessions.release',
      ])
    })

    it('keeps every exam-* permission in EXPLICIT_ONLY', () => {
      const examCodes = SYSTEM_PERMISSIONS.map((p) => p.code).filter((code) =>
        code.startsWith('exam-'),
      )
      for (const code of examCodes) {
        expect(isExplicitOnly(code)).toBe(true)
      }
      expect(
        [...codesOf('OPERATOR')].filter((code) =>
          code.startsWith('exam-rooms.'),
        ),
      ).toEqual(['exam-rooms.manage-all'])
    })

    it('keeps every event and room code away from academic admin, teachers, students, applicants and employees', () => {
      for (const role of [
        'ACADEMIC_ADMIN',
        'TEACHER',
        'STUDENT',
        'APPLICANT',
        'EMPLOYEE',
      ]) {
        expect(
          [...codesOf(role)].filter(
            (code) =>
              code.startsWith('exam-events.') ||
              code.startsWith('exam-rooms.') ||
              code === 'exam-packages.adjust-key',
          ),
        ).toEqual([])
      }
    })
  })
})
