import { useState } from 'react'
import { shelfBooks } from '@/app/shelf/fixtures'
import {
  type FilterStatus,
  type SortOrder,
  SORT_LABELS,
} from '@/app/shelf/types'
import { filterBooks, sortBooks, updateBookStatus, removeBook } from '@/app/shelf/util'
import { FilterBar } from '@/components/FilterBar'
import { ShelfList } from '@/components/ShelfList'

type SortSelectProps = { sort: SortOrder, onChange: (sort: string) => void, className: string }
const SortSelect = ({sort, onChange, className}: SortSelectProps) => {
  return (
    <select
      name="sort"
      value={sort}
      onChange={e => onChange(e.target.value)}
      className={className}
    >
      {Object.entries(SORT_LABELS).map(([sort, label]) => {
        return <option key={sort} value={sort}>Sort: {label}</option>
      })}
    </select>
  )
}

export const ShelfPage = () => {
  const [books, setBooks] = useState(shelfBooks)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [sort, setSort] = useState<SortOrder>('newest')

  const visibleBooks = sortBooks(filterBooks(books, filter), sort)
  const onSortChange = (newSort: string) => setSort(newSort as SortOrder)

  return (
    <div>
      <div className="flex justify-center mt-4">
        <div className="flex-1 flex justify-center">
          <FilterBar books={books} filter={filter} onFilterChange={setFilter} />
          <SortSelect key="sort" sort={sort} onChange={onSortChange} className="flex-1" />
        </div>
      </div>

      <ShelfList
        books={visibleBooks}
        onUpdateStatus={(key, newStatus) => setBooks(prev => updateBookStatus(key, newStatus, prev))}
        onRemove={(key) => setBooks(prev => removeBook(key, prev))}
      />
    </div>
  )
}
