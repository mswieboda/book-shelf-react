import { type ReadingStatus, type ShelfBook, READING_STATUS_LABELS } from '@/app/shelf/types'
import { BaseButton } from '@/components/BaseButton'

type ShelfItemProps = {
  book: ShelfBook,
  onUpdateStatus: (key: string, newStatus: ReadingStatus) => void
  onRemove: (key: string) => void
}

export function ShelfItem({ book, onUpdateStatus, onRemove }: ShelfItemProps) {
  const {key, title, author, coverId, publishYear, status} = book

  const onChangeStatus = (newStatus: string) => onUpdateStatus(key, newStatus as ReadingStatus)
  const onRemoveClick = () => onRemove(key)

  return (
    <div className="flex">
      <div className="flex-none mr-8">
        ({coverId})
      </div>
      <div className="flex-1">
        <div className="text-xl font-bold">{title}</div>
        <div>{author} - {publishYear}</div>
      </div>
      <div className="flex-none mr-4">
        <select name="status" value={status} onChange={e => onChangeStatus(e.target.value)}>
          {Object.entries(READING_STATUS_LABELS).map(([status, label]) => {
            return <option key={status} value={status}>{label}</option>
          })}
        </select>
      </div>
      <div className="flex-none">
        <BaseButton onClick={onRemoveClick}>🗑️</BaseButton>
      </div>
    </div>
  )
}
