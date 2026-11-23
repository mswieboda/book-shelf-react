import { type ReadingStatus, type ShelfBook, READING_STATUS_LABELS } from '@/app/shelf/types'
import { BaseButton } from '@/components/BaseButton'

type ShelfItemProps = {
  book: ShelfBook,
  onUpdateStatus: (key: string, newStatus: ReadingStatus) => void
  onRemove: (key: string) => void
}

export const ShelfItem = ({ book, onUpdateStatus, onRemove }: ShelfItemProps) => {
  const {key, title, author, coverId, publishYear, status} = book

  const onChangeStatus = (newStatus: string) => onUpdateStatus(key, newStatus as ReadingStatus)
  const onRemoveClick = () => onRemove(key)

  return (
    <div className="flex my-4 p-4 rounded-md bg-mauve-900">
      <Cover coverId={coverId} title={title} />

      <div className="flex-3">
        <div className="text-xl font-bold text-purple-300">{title}</div>
        <div>{author} - {publishYear}</div>
      </div>

      <div className="flex-none flex justify-end items-center">
        <div className="w-full max-w-sm min-w-[100px]">
          <div className="relative">
            <select
              name="status" value={status} onChange={e => onChangeStatus(e.target.value)}
              className="w-full bg-transparent text-purple-300 text-sm border border-purple-300 rounded pl-3 pr-8 py-2 transition duration-300 ease focus:outline-none focus:border-purple-600 hover:border-purple-600 shadow-sm focus:shadow-md appearance-none cursor-pointer"
            >
                {Object.entries(READING_STATUS_LABELS).map(([status, label]) =>
                  <option key={status} value={status}>{label}</option>
                )}
            </select>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-5 w-5 ml-1 absolute top-2.5 right-1.5 text-purple-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
            </svg>
          </div>
        </div>

        <BaseButton onClick={onRemoveClick}>🗑️</BaseButton>
      </div>
    </div>
  )
}

type CoverProps = {
  coverId: number | null,
  title: string
}


const Cover = ({coverId, title}: CoverProps) => {
  return (
    <div className="flex-none mr-8 min-w-[75px] flex justify-center items-center">
      {coverId === null ? (
        <div className="w-10 h-15 flex justify-center items-center">N/A</div>
      ) : (
        <img
          alt={title}
          loading="lazy"
          src={`https://covers.openlibrary.org/b/id/${coverId}-S.jpg`}
          className="w-10 h-15 object-cover rounded"
        />
      )}
    </div>
  )
}
