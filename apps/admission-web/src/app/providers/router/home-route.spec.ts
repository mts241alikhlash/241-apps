import { describe, expect, it } from 'vitest'
import {
  deniedRedirect,
  effectivePermissions,
  resolveHomeRoute,
} from './home-route'

describe('admission home route', () => {
  it('sends PPDB staff to the admin pages', () => {
    expect(resolveHomeRoute(['admissions.read'])).toBe('/admin')
  })

  it('sends applicants to their registration', () => {
    expect(resolveHomeRoute(['admissions.apply'])).toBe('/registration')
  })

  it('never loops for someone who may open neither', () => {
    expect(deniedRedirect('/registration', [])).toEqual({ name: 'not-found' })
    expect(deniedRedirect('/admin', [])).toBe('/registration')
  })

  it('keeps staff, the super admin included, out of the applicant area', () => {
    const staff = effectivePermissions(['admissions.read', 'admissions.apply'])
    expect(staff).toEqual(['admissions.read'])
    expect(deniedRedirect('/registration', staff)).toBe('/admin')
  })

  it('leaves an applicant able to apply', () => {
    expect(effectivePermissions(['admissions.apply'])).toEqual([
      'admissions.apply',
    ])
  })
})
