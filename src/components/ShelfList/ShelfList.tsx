import { type ShelfBook } from '@/app/shelf/types'
import { ShelfItem } from '@/components/ShelfItem'

type ShelfListProps = {
  books: ShelfBook[]
}

export const ShelfList = ({ books }: ShelfListProps) => {
  return (
    <div>
      {books.map(book => <ShelfItem key={book.key} book={book} />)}
    </div>
  )
}
