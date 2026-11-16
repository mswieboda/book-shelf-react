// Used by tests (Milestone 8). Same handlers as the browser, different transport.
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
