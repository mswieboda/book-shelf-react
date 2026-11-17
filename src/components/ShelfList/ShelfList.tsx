import type { ReadingStatus, ShelfBook } from '@/app/shelf/types'
import { ShelfItem } from '@/components/ShelfItem'

type ShelfListProps = {
  books: ShelfBook[],
  onUpdateStatus: (key: string, newStatus: ReadingStatus) => void
  onRemove: (key: string) => void
}

export const ShelfList = ({ books, onUpdateStatus, onRemove }: ShelfListProps) => {
  return (
    <div>
      {books.map(book =>
        <ShelfItem
          key={book.key}
          book={book}
          onUpdateStatus={onUpdateStatus}
          onRemove={onRemove}
        />
      )}
    </div>
  )
}
