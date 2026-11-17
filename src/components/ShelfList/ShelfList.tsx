import { ShelfItem } from '@/components/ShelfItem'

export const ShelfList = ({ books }) => {
  return (
    <div>
      {books.map(book => <ShelfItem key={book.key} book={book} />)}
    </div>
  )
}
