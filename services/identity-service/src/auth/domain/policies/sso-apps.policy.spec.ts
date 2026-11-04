import {
  canOpenApp,
  isApplicant,
  isStaff,
  parseSsoApps,
  safeRelativePath,
  SSO_APP_KEYS,
} from './sso-apps.policy.js'

const callbacks =
  'account=https://accounts.test/oauth/callback,hr=https://hr.test/oauth/callback'

describe('parseSsoApps', () => {
  it('reads app=callback pairs', () => {
    const apps = parseSsoApps(callbacks)
    expect(apps.get('account')).toBe('https://accounts.test/oauth/callback')
    expect(apps.get('hr')).toBe('https://hr.test/oauth/callback')
  })

  it('refuses an unknown app', () => {
    expect(() =>
      parseSsoApps(`${callbacks},payroll=https://p.test/oauth/callback`),
    ).toThrow('payroll')
  })

  it('refuses a value that is not an absolute URL', () => {
    expect(() => parseSsoApps('account=/oauth/callback')).toThrow('account')
  })

  it('refuses a list without account', () => {
    expect(() => parseSsoApps('hr=https://hr.test/oauth/callback')).toThrow(
      'account',
    )
  })

  it('refuses the same app twice', () => {
    expect(() =>
      parseSsoApps(`${callbacks},hr=https://hr2.test/oauth/callback`),
    ).toThrow('hr')
  })
})

describe('realms', () => {
  it('treats any role other than APPLICANT as staff', () => {
    expect(isStaff(['APPLICANT', 'TEACHER'])).toBe(true)
    expect(isStaff(['EMPLOYEE'])).toBe(true)
    expect(isStaff(['APPLICANT'])).toBe(false)
    expect(isStaff([])).toBe(false)
  })

  it('treats the APPLICANT role as an applicant', () => {
    expect(isApplicant(['APPLICANT'])).toBe(true)
    expect(isApplicant(['TEACHER'])).toBe(false)
  })
})

describe('canOpenApp', () => {
  it('opens every app for an account holding a permission of each', () => {
    const grants = {
      roles: ['SUPER_ADMIN'],
      permissions: [
        'students.read',
        'users.read',
        'admissions.read',
        'presence-scans.read',
        'inventory-assets.read',
        'portal-albums.read',
        'exam-packages.read',
      ],
    }

    for (const app of SSO_APP_KEYS) {
      expect(canOpenApp(app, grants)).toBe(true)
    }
  })

  it('keeps every app but account closed to a role with no permissions', () => {
    const grants = { roles: ['SUPER_ADMIN'], permissions: [] }

    expect(canOpenApp('hr', grants)).toBe(false)
    expect(canOpenApp('account', grants)).toBe(true)
  })

  it('lets any staff account open account', () => {
    expect(canOpenApp('account', { roles: ['TEACHER'], permissions: [] })).toBe(
      true,
    )
  })

  it('opens hr for a presence permission', () => {
    expect(
      canOpenApp('hr', {
        roles: ['STAFF'],
        permissions: ['presence-scans.read'],
      }),
    ).toBe(true)
  })

  it('opens hr for employee self-service access', () => {
    expect(
      canOpenApp('hr', {
        roles: ['EMPLOYEE'],
        permissions: ['employees.read-own'],
      }),
    ).toBe(true)
  })

  it('opens assessment for an academic permission', () => {
    expect(
      canOpenApp('assessment', {
        roles: ['TEACHER'],
        permissions: ['students.read'],
      }),
    ).toBe(true)
  })

  it('keeps hr closed to someone with only academic permissions', () => {
    expect(
      canOpenApp('hr', { roles: ['TEACHER'], permissions: ['students.read'] }),
    ).toBe(false)
  })

  it('allows exam-only staff and students with exam-sessions.take to open exam app only', () => {
    expect(
      canOpenApp('exam', {
        roles: ['OPERATOR'],
        permissions: ['exam-sessions.read'],
      }),
    ).toBe(true)
    expect(
      canOpenApp('assessment', {
        roles: ['OPERATOR'],
        permissions: ['exam-sessions.read'],
      }),
    ).toBe(false)
    expect(
      canOpenApp('exam', {
        roles: ['STUDENT'],
        permissions: ['exam-sessions.take'],
      }),
    ).toBe(true)
    expect(
      canOpenApp('assessment', {
        roles: ['STUDENT'],
        permissions: ['exam-sessions.take'],
      }),
    ).toBe(false)
  })

  it('keeps exam scores on the assessment app', () => {
    expect(
      canOpenApp('assessment', {
        roles: ['TEACHER'],
        permissions: ['exam-scores.read'],
      }),
    ).toBe(true)
  })

  it('opens exam and not assessment for a room technician holding only its room code', () => {
    const grants = {
      roles: ['EXAM_TECHNICIAN'],
      permissions: ['exam-rooms.technician'],
    }

    expect(canOpenApp('exam', grants)).toBe(true)
    expect(canOpenApp('assessment', grants)).toBe(false)
  })

  it('opens nothing for an applicant', () => {
    expect(
      canOpenApp('admission', {
        roles: ['APPLICANT'],
        permissions: ['admissions.read'],
      }),
    ).toBe(false)
  })
})

describe('safeRelativePath', () => {
  it.each(['/', '/profile?from=hr', '/sso/authorize?app=hr'])(
    'keeps %s',
    (value) => {
      expect(safeRelativePath(value)).toBe(value)
    },
  )

  it.each([
    '//evil.example',
    'https://evil.example',
    '/\\evil.example',
    'profile',
    '',
    undefined,
    ['/'],
  ])('refuses %p', (value) => {
    expect(safeRelativePath(value)).toBeNull()
  })
})
