import { HeaderBar } from './components/HeaderBar'
import { ShelfPage } from './components/ShelfPage'

function App() {
  return (
    <div className="min-h-screen px-6 py-16 text-neutral-300 dark:bg-neutral-950">
      <div className="mx-auto max-w-3xl">
        <HeaderBar />
        <ShelfPage />
      </div>
    </div>
  )
}

export default App
