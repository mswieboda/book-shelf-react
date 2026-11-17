import { type ShelfBook } from '@/app/shelf/types'

type ShelfItemProps = {
  book: ShelfBook
}

export function ShelfItem({ book }: ShelfItemProps) {
  const {title, author, coverId, publishYear, status} = book

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
        {status}
      </div>
      <div className="flex-none">
        <div>🗑️</div>
      </div>
    </div>
  )
}
