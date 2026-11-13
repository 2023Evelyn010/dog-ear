import { useState } from 'react'
import { Photo } from './Photo'

/** 題目照片：多張時左右滑動（scroll-snap），下方小圓點標示目前第幾張 */
export function PhotoPager({ images, className = '' }: { images: Blob[]; className?: string }) {
  const [page, setPage] = useState(0)
  return (
    <div className={`relative flex flex-col ${className}`}>
      <div
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget
          setPage(Math.round(el.scrollLeft / el.clientWidth))
        }}
      >
        {images.map((blob, i) => (
          <Photo
            key={i}
            blob={blob}
            alt={images.length > 1 ? `題目照片 ${i + 1}／${images.length}` : '題目照片'}
            fit="contain"
            className="h-full w-full shrink-0 snap-center"
          />
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5" aria-hidden="true">
          {images.map((_, i) => (
            <span key={i} className={`size-1.5 rounded-full ${i === page ? 'bg-primary' : 'bg-line'}`} />
          ))}
        </div>
      )}
    </div>
  )
}
