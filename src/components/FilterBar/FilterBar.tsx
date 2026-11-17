import {
  type FilterStatus,
  type ShelfBook,
  STATUS_LABELS
} from '@/app/shelf/types'
import { filterBooks } from '@/app/shelf/util'
import { BaseButton } from '@/components/BaseButton'

type FilterBarProps = {
  books: ShelfBook[]
  value: FilterStatus
  onChange: (status: FilterStatus) => void
}

export const FilterBar = ({ books, filter, onFilterChange }: FilterBarProps) => {
  const onFilterSelected = (status) => {
    if (status !== filter) {
      onFilterChange(status)
    }
  }

  return (
    <>
      {Object.entries(STATUS_LABELS).map(([status, label]) => {
        const onClick = () => onFilterSelected(status)
        const count = filterBooks(books, status).length

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
