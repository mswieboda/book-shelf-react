type HeaderButtonProps = {
  isActive: boolean
  onClick?: () => void
  children: React.ReactNode
}

const HeaderButton = ({isActive, onClick, children}: HeaderButtonProps) => {
  const base = 'rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-purple-500'
  const active = 'bg-purple-900 text-white'
  const inactive = 'text-purple-300 hover:bg-purple-500'

  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      className={`${base} ${isActive ? active : inactive}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export const HeaderBar = () => {
  return (
    <div className="flex content-center">
      <div className="flex-none">📚 Book Shelf</div>
      <div className="flex-1 flex justify-center gap-4">
        <HeaderButton isActive={true}>
          My Shelf
        </HeaderButton>
        <HeaderButton isActive={false}>
          Search
        </HeaderButton>
      </div>
      <div className="flex-none">☀/🌙</div>
    </div>
  )
}
