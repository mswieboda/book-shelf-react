export type ShelfBook = {
  key: string
  title: string
  author: string
  coverId: number | null
  publishYear: number | null
  status: ReadingStatus
}

export const READING_STATUSES = ['want', 'reading', 'done'] as const
export type ReadingStatus = (typeof READING_STATUSES)[number]

export const FILTER_STATUSES = ['all', ...READING_STATUSES] as const
export type FilterStatus = (typeof FILTER_STATUSES)[number]

export const STATUS_LABELS = {
  all: 'All', want: 'Want', reading: 'Reading', done: 'Done',
} satisfies Record<ReadingStatus | FilterStatus, string>

export const SORT_STATUSES = ['newest', 'title', 'published'] as const
export type SortStatus = (typeof SORT_STATUSES)[number]

export const SORT_LABELS = {
  newest: 'Newest', oldest: 'Oldest', title: 'Title'
} satisfies Record<SortStatus, string>

export const NEXT_SORT = {
  newest: 'oldest', oldest: 'title', title: 'newest'
} satisfies Record<SortStatus, SortStatus>
