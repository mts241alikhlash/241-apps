import { computed } from 'vue'

export function useDateTimeParts(
  read: () => string,
  write: (value: string) => void,
  defaultTime: string,
) {
  function split(value: string) {
    const [date = '', time = ''] = value.split('T')
    return { date, time }
  }

  function join(date: string, time: string) {
    if (date.length === 0) {
      write('')
      return
    }
    write(`${date}T${time.length > 0 ? time : defaultTime}`)
  }

  const date = computed({
    get: () => split(read()).date,
    set: (next: string) => join(next, split(read()).time),
  })

  const time = computed({
    get: () => {
      const current = split(read()).time
      return current.length > 0 ? current : defaultTime
    },
    set: (next: string) => join(split(read()).date, next),
  })

  return { date, time }
}
