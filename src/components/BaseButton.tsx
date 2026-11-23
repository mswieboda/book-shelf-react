type BaseButtonProps = {
  isActive?: boolean
  className?: string
  onClick?: () => void
  children?: React.ReactNode
}


export const BaseButton = ({isActive, className, onClick, children}: BaseButtonProps) => {
  const base = 'rounded-md p-2 text-sm font-medium cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-purple-500'
  const active = 'bg-purple-900 text-white'
  const inactive = 'text-purple-300 hover:bg-purple-500'

  return (
    <button
      type="button"
      className={`${className} ${base} ${isActive ? active : inactive}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
