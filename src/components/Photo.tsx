import { useEffect, useRef } from 'react'

/**
 * Photo：photo 底色、圓角 12；有照片時 object-fit: cover。
 * 顯示時用 URL.createObjectURL，Blob 改變或元件卸載時 revokeObjectURL。
 */
export function Photo({
  blob,
  alt,
  className = '',
  fit = 'cover',
  framed = true,
}: {
  blob?: Blob
  alt: string
  className?: string
  /** contain：要看清整張題目時（複習作答） */
  fit?: 'cover' | 'contain'
  /** false：不要底色與圓角（全螢幕檢視） */
  framed?: boolean
}) {
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img || !blob) return
    const url = URL.createObjectURL(blob)
    img.src = url
    return () => {
      img.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
  }, [blob])

  return (
    <div className={`overflow-hidden ${framed ? 'rounded-card bg-photo' : ''} ${className}`}>
      {blob && <img ref={imgRef} alt={alt} className={`size-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`} draggable={false} />}
    </div>
  )
}
