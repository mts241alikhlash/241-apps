import {
  build,
  essaySpec,
  paperWithManual,
  shortSpec,
} from '../../exam-grading/application/exam-grading.test-support.js'
import { choiceSpec } from './exam-session.test-support.js'
import { loadPaperSources } from './load-paper-sources.js'
import { buildPaper } from '../domain/policies/build-paper.policy.js'

describe('loadPaperSources', () => {
  const scrambled = async () => {
    const w = build()
    const { schedule, questionIds } = await paperWithManual(w, [
      choiceSpec('A'),
      shortSpec,
      essaySpec,
    ])
    const original = w.questions.findPinned.bind(w.questions)
    w.questions.findPinned = async (pins) => (await original(pins)).reverse()
    const sources = await loadPaperSources(
      w.schedules,
      w.packages,
      w.questions,
      schedule.id,
    )
    return { sources, questionIds }
  }

  it('keeps the order of the pinned questions and adds the package position', async () => {
    const { sources, questionIds } = await scrambled()

    expect(sources.map((source) => source.questionId)).toEqual(
      [...questionIds].reverse(),
    )
    expect(sources.map((source) => source.position)).toEqual([3, 2, 1])
  })

  it('builds the same student paper whether or not positions are present', async () => {
    const { sources } = await scrambled()
    const bare = sources.map(({ position: _position, ...rest }) => rest)
    const options = { shuffleQuestions: true, shuffleChoices: true }

    expect(buildPaper(sources, 'seed', options)).toEqual(
      buildPaper(bare, 'seed', options),
    )
  })
})
