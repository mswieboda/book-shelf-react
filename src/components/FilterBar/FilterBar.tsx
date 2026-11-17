import {
  type FilterStatus,
  type ShelfBook,
  FILTER_STATUS_LABELS
} from '@/app/shelf/types'
import { filterBooks } from '@/app/shelf/util'
import { BaseButton } from '@/components/BaseButton'

type FilterBarProps = {
  books: ShelfBook[]
  filter: FilterStatus
  onFilterChange: (status: FilterStatus) => void
}

export const FilterBar = ({ books, filter, onFilterChange }: FilterBarProps) => {
  const onFilterSelected = (status: FilterStatus) => {
    if (status !== filter) {
      onFilterChange(status)
    }
  }

  return (
    <>
      {Object.entries(FILTER_STATUS_LABELS).map(([status, label]) => {
        const onClick = () => onFilterSelected(status as FilterStatus)
        const count = filterBooks(books, status as FilterStatus).length

        return (
          <BaseButton
            key={status}
            isActive={status === filter}
            className="flex-1"
            onClick={onClick}
          >
            {`${label} (${count})`}
          </BaseButton>
        )
      })}
    </>
  )
}
