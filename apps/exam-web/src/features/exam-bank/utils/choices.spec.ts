import { describe, expect, it } from 'vitest'
import type { MultipleChoiceContent, MultipleResponseContent } from '../types'
import {
  MAX_CHOICES,
  addChoice,
  removeChoice,
  setSingleKey,
  toggleKey,
} from './choices'

const choice = (key: 'A' | 'B' | 'C' | 'D' | 'E') => ({
  key,
  html: `<p>${key}</p>`,
})

const single = (
  keys: ('A' | 'B' | 'C' | 'D' | 'E')[],
  answer: 'A' | 'B' | 'C' | 'D' | 'E',
): MultipleChoiceContent => ({
  choices: keys.map(choice),
  answer: { key: answer },
})

const multiple = (
  keys: ('A' | 'B' | 'C' | 'D' | 'E')[],
  answers: ('A' | 'B' | 'C' | 'D' | 'E')[],
): MultipleResponseContent => ({
  choices: keys.map(choice),
  answer: { keys: answers },
})

describe('choices', () => {
  it('adds the next letter and refuses a sixth choice', () => {
    const four = single(['A', 'B', 'C', 'D'], 'A')

    const five = addChoice(four)
    expect(five.choices.map((c) => c.key)).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(five.choices[4]?.html).toBe('')

    expect(MAX_CHOICES).toBe(5)
    expect(addChoice(five)).toBe(five)
  })

  it('chooses one key for multiple choice and toggles keys for multiple response', () => {
    expect(setSingleKey(single(['A', 'B'], 'A'), 'B').answer).toEqual({
      key: 'B',
    })

    const content = multiple(['A', 'B', 'C'], ['A'])
    expect(toggleKey(content, 'C').answer.keys).toEqual(['A', 'C'])
    expect(toggleKey(toggleKey(content, 'C'), 'A').answer.keys).toEqual(['C'])
  })

  it('removes a choice, re-letters the rest and follows the key', () => {
    const removed = removeChoice(single(['A', 'B', 'C'], 'C'), 'A')

    expect(removed.choices.map((c) => [c.key, c.html])).toEqual([
      ['A', '<p>B</p>'],
      ['B', '<p>C</p>'],
    ])
    expect(removed.answer.key).toBe('B')
  })

  it('moves the key to the first choice when the right one is removed', () => {
    const removed = removeChoice(single(['A', 'B', 'C'], 'B'), 'B')

    expect(removed.answer.key).toBe('A')
  })

  it('remaps and drops keys for multiple response', () => {
    const removed = removeChoice(
      multiple(['A', 'B', 'C', 'D'], ['A', 'C', 'D']),
      'C',
    )

    expect(removed.answer.keys).toEqual(['A', 'C'])
  })

  it('keeps at least two choices', () => {
    const two = single(['A', 'B'], 'A')

    expect(removeChoice(two, 'B')).toBe(two)
  })
})
