export type ShelfBook = {
  key: string
  title: string
  author: string
  coverId: number
  publishYear: number
  status: ReadingStatus
}

// reading
export const READING_STATUSES = ['want', 'reading', 'done'] as const
export type ReadingStatus = (typeof READING_STATUSES)[number]

export const READING_STATUS_LABELS = {
  want: 'Want', reading: 'Reading', done: 'Done',
} satisfies Record<ReadingStatus, string>

// filter
export const FILTER_STATUSES = ['all', ...READING_STATUSES] as const
export type FilterStatus = (typeof FILTER_STATUSES)[number]

export const FILTER_STATUS_LABELS = {
  all: 'All', want: 'Want', reading: 'Reading', done: 'Done',
} satisfies Record<FilterStatus, string>

// sort
export const SORT_ORDERS = ['newest', 'title', 'oldest'] as const
export type SortOrder = (typeof SORT_ORDERS)[number]

export const SORT_LABELS = {
  newest: 'Newest', oldest: 'Oldest', title: 'Title'
} satisfies Record<SortOrder, string>
