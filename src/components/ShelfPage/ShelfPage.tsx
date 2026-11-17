import { useState } from 'react'
import { shelfBooks } from '@/app/shelf/fixtures'
import {
  type FilterStatus,
  type SortOrder,
  NEXT_SORT,
  SORT_LABELS,
} from '@/app/shelf/types'
import { filterBooks, sortBooks } from '@/app/shelf/util'
import { BaseButton } from '@/components/BaseButton'
import { FilterBar } from '@/components/FilterBar'
import { ShelfList } from '@/components/ShelfList'

// TODO: temporary
type SortSelectProps = { className: string; label: string; onClick: () => void }
const SortSelect = ({className, label, onClick}: SortSelectProps) => {
  return (
    <BaseButton className={className} onClick={onClick}>
      {label}
    </BaseButton>
  )
}

export const ShelfPage = () => {
  const [filter, setFilter] = useState<FilterStatus>('want')
  const [sort, setSort] = useState<SortOrder>('newest')

  const books = sortBooks(filterBooks(shelfBooks, filter), sort)
  const cycleNextSort = () => {
    setSort(NEXT_SORT[sort])
  }

  return (
    <div>
      <div className="flex justify-center">
        <div className="flex-1 flex justify-center">
          <FilterBar books={shelfBooks} filter={filter} onFilterChange={setFilter} />
          <SortSelect key="sort" className="flex-1" label={`Sort: ${SORT_LABELS[sort]}`} onClick={cycleNextSort} />
        </div>
      </div>

      <ShelfList books={books} />
    </div>
  )
}
