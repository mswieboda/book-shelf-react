import { createHttpClient } from '@/lib/http'

export const searchApi = createHttpClient({ baseURL: 'https://openlibrary.org', timeout: 10_000 })

// TODO: will use the `searchApi` to search for books on Open Library, to add
