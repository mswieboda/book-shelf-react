import { type ShelfBook } from '@/app/shelf/types'

export const shelfBooks: ShelfBook[] = [
  {
    key: '/works/OL15692462W',
    title: 'A Song of Ice and Fire (1-4)',
    author: "George R.R. Martin",
    coverId: 11300908,
    publishYear: 2011,
    status: 'reading',
  },
  {
    key: '/works/OL893414W',
    title: 'Dune',
    author: 'Frank Herbert',
    coverId: 11481354,
    publishYear: 1965,
    status: 'want',
  },
  {
    key: '/works/OL21745884W',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    coverId: 11200092,
    publishYear: 2021,
    status: 'done',
  },
  {
    key: '/works/OL5748544W',
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt',
    coverId: 10143650,
    publishYear: 1999,
    status: 'want',
  },
  {
    key: '/works/OL20893680W',
    title: 'Piranesi',
    author: 'Susanna Clarke',
    coverId: 10226290,
    publishYear: 2020,
    status: 'want',
  },
  {
    key: '/works/OL555666999',
    title: 'Some Unknown Book',
    author: 'John Doe',
    coverId: null,
    publishYear: 1975,
    status: 'want',
  },
]
