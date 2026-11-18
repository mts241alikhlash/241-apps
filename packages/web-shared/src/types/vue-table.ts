export interface ColumnMetaAlign {
  align?: 'left' | 'center' | 'right'
  truncate?: boolean
  title?: (row: never) => string | null | undefined
}
