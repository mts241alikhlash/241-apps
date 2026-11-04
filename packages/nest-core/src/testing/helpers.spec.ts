import { ignoredCallers } from './no-ignored-caller.js'
import { routeMatcher } from './route-collisions.js'

describe('architecture test helpers', () => {
  it('matches a parameter segment but not a different literal', () => {
    expect(routeMatcher('/students/:id').test('/students/a-value')).toBe(true)
    expect(routeMatcher('/students/me').test('/students/a-value')).toBe(false)
  })

  it('finds a caller a handler injects and never reads', () => {
    const ignored = `
      async findAll(
        @CurrentUser() user: AuthenticatedUser,
        @Query() query: StudentQueryDto,
      ) {
        return this.getStudentsUseCase.execute(query);
      }`
    const used = `
      async findMine(@CurrentUser() user: AuthenticatedUser) {
        return this.useCase.execute(user.id);
      }`

    expect(ignoredCallers(ignored)).toEqual(['user'])
    expect(ignoredCallers(used)).toEqual([])
  })
})
