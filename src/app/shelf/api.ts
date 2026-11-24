import { serverApi } from '@/lib/http'
import {
  type AddShelfBook,
  type ReadingStatus,
  type ShelfBook,
  type UpdateBookData,
} from '@/app/shelf/types'

export const getShelf = (
  status?: ReadingStatus,
  options?: { signal?: AbortSignal }
): Promise<ShelfBook[]> => {
  const url = `/shelf`
  const config = { params: { status }, signal: options?.signal }

  return serverApi.get<ShelfBook[]>(url, config).then(response => {
    return response.data
  })
}

export const getBook = (
  id: string,
  options?: { signal?: AbortSignal }
): Promise<ShelfBook> => {
  const url = `/shelf/${id}`
  const config = { signal: options?.signal }

  return serverApi.get<ShelfBook>(url, config).then(response => response.data)
}

export const addBook = (
  book: AddShelfBook,
  options?: { signal?: AbortSignal }
): Promise<ShelfBook> => {
  const url = `/shelf`
  const config = { signal: options?.signal }
  const data = book

  return serverApi.post<ShelfBook>(url, data, config).then(response => response.data)
}

export const updateBook = (
  id: string,
  book: Partial<Pick<ShelfBook, UpdateBookData>>,
  options?: { signal?: AbortSignal }
): Promise<ShelfBook> => {
  const url = `/shelf/${id}`
  const config = { signal: options?.signal }
  const data = book

  return serverApi.patch<ShelfBook>(url, data, config).then(response => response.data)
}

export const removeBook = (
  id: string,
  options?: { signal?: AbortSignal }
): Promise<void> => {
  const url = `/shelf/${id}`
  const config = { signal: options?.signal }

  return serverApi.delete(url, config).then(() => undefined)
}
