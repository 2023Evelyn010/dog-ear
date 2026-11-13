import { useRef } from 'react'
import { Photo } from '../../components/Photo'
import { CloseIcon } from '../../components/icons'

/** 照片縮圖列＋「＋ 照片」。可拍照或從相簿選，可多張。 */
export function PhotoRow({
  images,
  processing,
  error,
  onAddFiles,
  onRemove,
}: {
  images: Blob[]
  processing: number
  error: string | null
  onAddFiles: (files: File[]) => void
  onRemove: (index: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <div className="-mx-6 flex gap-2 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {images.map((blob, i) => (
          <div key={i} className="relative shrink-0">
            <Photo blob={blob} alt={`照片 ${i + 1}`} className="h-[110px] w-[150px]" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`移除照片 ${i + 1}`}
              className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-overlay/60 text-on-primary"
            >
              <CloseIcon size={14} strokeWidth={2.4} />
            </button>
          </div>
        ))}
        {Array.from({ length: processing }, (_, i) => (
          <div key={`p${i}`} className="h-[110px] w-[150px] shrink-0 animate-pulse rounded-card bg-photo" />
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-[110px] w-[90px] shrink-0 items-center justify-center rounded-card border-[1.5px] border-dashed border-line text-small text-sub"
        >
          ＋ 照片
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-small text-ink">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = '' // 讓同一張照片可以再選一次
          if (files.length) onAddFiles(files)
        }}
      />
    </div>
  )
}
