import { FREE_PERIOD, type ScheduleSheet } from './scheduleSheet'

const SCALE = 2

const PADDING = 24
const TITLE_SIZE = 20
const SUBTITLE_SIZE = 13
const HEADER_HEIGHT = 34
const ROW_HEIGHT = 46
const INTERRUPTION_HEIGHT = 30
const PERIOD_WIDTH = 96
const TIME_WIDTH = 104
const DAY_WIDTH = 150

const INK = '#0f172a'
const MUTED = '#64748b'
const LINE = '#cbd5e1'
const HEADER_FILL = '#f1f5f9'
const BAND_FILL = '#fef3c7'
const BAND_INK = '#92400e'
const FAINT = '#cbd5e1'

const FONT = "'DM Sans', ui-sans-serif, system-ui, sans-serif"

function sheetHeight(sheet: ScheduleSheet): number {
  const body = sheet.rows.reduce(
    (total, row) =>
      total + (row.isInterruption ? INTERRUPTION_HEIGHT : ROW_HEIGHT),
    0,
  )
  return (
    PADDING * 2 + TITLE_SIZE + 10 + SUBTITLE_SIZE + 18 + HEADER_HEIGHT + body
  )
}

function sheetWidth(sheet: ScheduleSheet): number {
  return (
    PADDING * 2 + PERIOD_WIDTH + TIME_WIDTH + DAY_WIDTH * sheet.dayLabels.length
  )
}

function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text

  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1)
  }
  return `${cut}…`
}

export function drawScheduleImage(sheet: ScheduleSheet): string | null {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const width = sheetWidth(sheet)
  const height = sheetHeight(sheet)
  canvas.width = width * SCALE
  canvas.height = height * SCALE
  ctx.scale(SCALE, SCALE)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'center'
  ctx.fillStyle = INK
  ctx.font = `700 ${TITLE_SIZE}px ${FONT}`
  ctx.fillText(sheet.title, width / 2, PADDING + TITLE_SIZE)

  ctx.fillStyle = MUTED
  ctx.font = `400 ${SUBTITLE_SIZE}px ${FONT}`
  ctx.fillText(
    sheet.subtitle,
    width / 2,
    PADDING + TITLE_SIZE + 10 + SUBTITLE_SIZE,
  )

  const gridTop = PADDING + TITLE_SIZE + 10 + SUBTITLE_SIZE + 18
  const gridLeft = PADDING
  const gridWidth = width - PADDING * 2

  const columnX = [
    gridLeft,
    gridLeft + PERIOD_WIDTH,
    ...sheet.dayLabels.map(
      (_, i) => gridLeft + PERIOD_WIDTH + TIME_WIDTH + DAY_WIDTH * i,
    ),
  ]

  ctx.fillStyle = HEADER_FILL
  ctx.fillRect(gridLeft, gridTop, gridWidth, HEADER_HEIGHT)

  ctx.fillStyle = INK
  ctx.font = `600 12px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('Jam', columnX[0] + PERIOD_WIDTH / 2, gridTop + 22)
  ctx.fillText('Waktu', columnX[1] + TIME_WIDTH / 2, gridTop + 22)
  sheet.dayLabels.forEach((label, i) => {
    ctx.fillText(label, columnX[2 + i] + DAY_WIDTH / 2, gridTop + 22)
  })

  const rowTop: number[] = []
  let y = gridTop + HEADER_HEIGHT
  for (const row of sheet.rows) {
    rowTop.push(y)
    y += row.isInterruption ? INTERRUPTION_HEIGHT : ROW_HEIGHT
  }
  const gridBottom = y
  const heightOf = (row: ScheduleSheet['rows'][number]) =>
    row.isInterruption ? INTERRUPTION_HEIGHT : ROW_HEIGHT

  sheet.rows.forEach((row, r) => {
    const top = rowTop[r]

    if (row.isInterruption) {
      ctx.fillStyle = BAND_FILL
      ctx.fillRect(gridLeft, top, gridWidth, heightOf(row))
      return
    }

    row.cells.forEach((cell, i) => {
      if (!cell.isInterruption) return
      ctx.fillStyle = BAND_FILL
      ctx.fillRect(columnX[2 + i], top, DAY_WIDTH, heightOf(row))
    })
  })

  ctx.textAlign = 'center'
  sheet.rows.forEach((row, r) => {
    const top = rowTop[r]
    const middle = top + heightOf(row) / 2 + 4

    ctx.fillStyle = row.isInterruption ? BAND_INK : INK
    ctx.font = `600 11px ${FONT}`
    ctx.fillText(
      fit(ctx, row.period, PERIOD_WIDTH - 12),
      columnX[0] + PERIOD_WIDTH / 2,
      middle,
    )

    ctx.fillStyle = MUTED
    ctx.font = `400 11px ${FONT}`
    ctx.fillText(row.time, columnX[1] + TIME_WIDTH / 2, middle)

    if (row.spansAllDays) {
      const dayArea = DAY_WIDTH * sheet.dayLabels.length
      ctx.fillStyle = BAND_INK
      ctx.font = `600 11px ${FONT}`
      ctx.fillText(
        fit(ctx, row.cells[0]?.title ?? '', dayArea - 12),
        columnX[2] + dayArea / 2,
        middle,
      )
      return
    }

    row.cells.forEach((cell, i) => {
      if (!cell.title) return
      const center = columnX[2 + i] + DAY_WIDTH / 2

      if (row.isInterruption || cell.isInterruption) {
        ctx.fillStyle = BAND_INK
        ctx.font = `600 11px ${FONT}`
        ctx.fillText(fit(ctx, cell.title, DAY_WIDTH - 12), center, middle)
        return
      }

      const isFree = cell.title === FREE_PERIOD
      ctx.fillStyle = isFree ? FAINT : INK
      ctx.font = `${isFree ? 400 : 600} 12px ${FONT}`
      ctx.fillText(
        fit(ctx, cell.title, DAY_WIDTH - 12),
        center,
        cell.subtitle ? middle - 4 : middle,
      )

      if (cell.subtitle) {
        ctx.fillStyle = MUTED
        ctx.font = `400 10px ${FONT}`
        ctx.fillText(
          fit(ctx, cell.subtitle, DAY_WIDTH - 12),
          center,
          middle + 11,
        )
      }
    })
  })

  ctx.strokeStyle = LINE
  ctx.lineWidth = 1

  const rule = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath()
    ctx.moveTo(x1 + 0.5, y1 + 0.5)
    ctx.lineTo(x2 + 0.5, y2 + 0.5)
    ctx.stroke()
  }

  rule(
    gridLeft,
    gridTop + HEADER_HEIGHT,
    gridLeft + gridWidth,
    gridTop + HEADER_HEIGHT,
  )
  sheet.rows.forEach((row, r) => {
    const bottom = rowTop[r] + heightOf(row)
    rule(gridLeft, bottom, gridLeft + gridWidth, bottom)
  })

  rule(columnX[1], gridTop, columnX[1], gridBottom)
  rule(columnX[2], gridTop, columnX[2], gridBottom)

  for (let i = 1; i < sheet.dayLabels.length; i++) {
    const x = columnX[2 + i]
    rule(x, gridTop, x, gridTop + HEADER_HEIGHT)

    sheet.rows.forEach((row, r) => {
      if (row.spansAllDays) return
      rule(x, rowTop[r], x, rowTop[r] + heightOf(row))
    })
  }

  ctx.strokeRect(
    gridLeft + 0.5,
    gridTop + 0.5,
    gridWidth - 1,
    gridBottom - gridTop - 1,
  )

  return canvas.toDataURL('image/png')
}
