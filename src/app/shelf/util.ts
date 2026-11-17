import type { FilterStatus, ShelfBook, SortOrder } from '@/app/shelf/types'

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
