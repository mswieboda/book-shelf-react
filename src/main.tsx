import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import * as shelfApi from '@/app/shelf/api'

// Dev-only: poke the API layer from the browser console, e.g. `await shelfApi.getShelf('reading')`.
if (import.meta.env.DEV) Object.assign(window, { shelfApi })

// Start the fake backend (MSW) before the app renders, in dev only.
// Requests to /api/* are answered by src/mocks/handlers.ts; everything else
// (e.g. openlibrary.org) passes through to the real network.
async function enableMocking() {
  if (!import.meta.env.DEV) return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
