import type { ReadingStatus, ShelfBook } from '@/app/shelf/types'
import { ShelfItem } from '@/components/ShelfItem'

type ShelfListProps = {
  books: ShelfBook[],
  onUpdateStatus: (id: string, newStatus: ReadingStatus) => void
  onRemove: (id: string) => void
}

export const ShelfList = ({ books, onUpdateStatus, onRemove }: ShelfListProps) => {
  return (
    <div className="mt-4">
      {books.length === 0 && (
        <ShelfListEmpty />
      )}
      {books.map(book =>
        <ShelfItem
          key={book.id}
          book={book}
          onUpdateStatus={onUpdateStatus}
          onRemove={onRemove}
        />
      )}
    </div>
  )
}

const ShelfListEmpty = () =>
  <div className="text-md text-center">
    No books here...
  </div>
