import type { FilterStatus, ReadingStatus, ShelfBook, SortOrder } from '@/app/shelf/types'

export const filterBooks = (books: ShelfBook[], filter: FilterStatus) => {
  if (filter !== 'all') {
    return books.filter((book) => {
      return book.status === filter
    })
  }

  return books.slice()
}

export const sortBooks = (books: ShelfBook[], sort: SortOrder) => {
  // sorting
  if (sort === 'newest') {
    return books.toSorted((a, b) => b.publishYear - a.publishYear)
  } else if (sort === 'oldest') {
    return books.toSorted((a, b) => a.publishYear - b.publishYear)
  }

  // back-up is sort by title
  return books.toSorted((a, b) => a.title.localeCompare(b.title))
}

export const updateBookStatus = (id: string, status: ReadingStatus, books: ShelfBook[]) =>
  books.map(b => b.id === id ? {...b, status: status } : b)

// Pure: returns a NEW array without the book; never touches the input.
export const removeBook = (id: string, books: ShelfBook[]): ShelfBook[] =>
  books.filter((b) => b.id !== id)
