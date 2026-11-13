import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from './icons'
import { Photo } from './Photo'

const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.5
const DOUBLE_TAP_MS = 300

/**
 * 照片全螢幕檢視：深色背景、左上 ✕；多張時左右滑動；雙指縮放、點兩下放大／還原。
 * 錯題詳情與今日複習共用。
 */
export function PhotoViewer({ images, start, onClose }: { images: Blob[]; start: number; onClose: () => void }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(start)
  const [zoomed, setZoomed] = useState(false)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  // 只在開啟時執行一次：捲到起始照片、鎖住背後頁面
  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollLeft = start * el.clientWidth
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    // iOS Safari：避免整頁跟著雙指縮放
    const stopGesture = (e: Event) => e.preventDefault()
    window.addEventListener('keydown', onKey)
    document.addEventListener('gesturestart', stopGesture)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('gesturestart', stopGesture)
    }
  }, [start])

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="照片" className="fixed inset-0 z-[60] flex flex-col bg-ink">
      <div className="flex h-14 shrink-0 items-center justify-between px-2 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="flex size-12 items-center justify-center text-on-primary"
        >
          <CloseIcon />
        </button>
        {images.length > 1 && (
          <span className="pr-4 text-small text-on-primary">
            {page + 1}／{images.length}
          </span>
        )}
      </div>
      <div
        ref={scrollerRef}
        className={`flex min-h-0 flex-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          zoomed ? 'overflow-hidden' : 'overflow-x-auto'
        }`}
        onScroll={(e) => {
          const el = e.currentTarget
          setPage(Math.round(el.scrollLeft / el.clientWidth))
        }}
      >
        {images.map((blob, i) => (
          <ZoomablePhoto
            key={i}
            blob={blob}
            alt={images.length > 1 ? `題目照片 ${i + 1}／${images.length}` : '題目照片'}
            active={i === page}
            onZoomChange={setZoomed}
          />
        ))}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] shrink-0" />
    </div>,
    document.body,
  )
}

interface View {
  scale: number
  x: number
  y: number
}
const RESET: View = { scale: 1, x: 0, y: 0 }

/** 單張照片的縮放與拖曳。座標以容器中心為原點。 */
function ZoomablePhoto({
  blob,
  alt,
  active,
  onZoomChange,
}: {
  blob: Blob
  alt: string
  active: boolean
  onZoomChange: (zoomed: boolean) => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>(RESET)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ view: View; mid: { x: number; y: number }; dist: number } | null>(null)
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null)
  const moved = useRef(false)

  // 換到別張照片時還原
  const [wasActive, setWasActive] = useState(active)
  if (wasActive !== active) {
    setWasActive(active)
    if (!active) setView(RESET)
  }

  useEffect(() => {
    if (active) onZoomChange(view.scale > 1)
  }, [active, view.scale, onZoomChange])

  function local(e: { clientX: number; clientY: number }) {
    const r = boxRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 }
  }

  function clamp(v: View): View {
    const r = boxRef.current!.getBoundingClientRect()
    const scale = Math.min(MAX_SCALE, Math.max(1, v.scale))
    if (scale === 1) return RESET
    const mx = ((scale - 1) * r.width) / 2
    const my = ((scale - 1) * r.height) / 2
    return { scale, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) }
  }

  /** 縮放到 scale，並讓 p 底下的內容留在原位 */
  function zoomAt(from: View, scale: number, p: { x: number; y: number }, to = p): View {
    const cx = (p.x - from.x) / from.scale
    const cy = (p.y - from.y) / from.scale
    return clamp({ scale, x: to.x - cx * scale, y: to.y - cy * scale })
  }

  function startGesture() {
    const pts = [...pointers.current.values()]
    if (pts.length === 2) {
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
      gesture.current = { view, mid, dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) }
    } else if (pts.length === 1) {
      gesture.current = { view, mid: pts[0], dist: 0 }
    } else gesture.current = null
  }

  function onPointerDown(e: ReactPointerEvent) {
    pointers.current.set(e.pointerId, local(e))
    if (pointers.current.size === 1) moved.current = false
    startGesture()
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return
    pointers.current.set(e.pointerId, local(e))
    const pts = [...pointers.current.values()]
    const g = gesture.current
    if (pts.length === 2 && g.dist > 0) {
      moved.current = true
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      setView(zoomAt(g.view, g.view.scale * (dist / g.dist), g.mid, mid))
    } else if (pts.length === 1 && g.view.scale > 1) {
      const dx = pts[0].x - g.mid.x
      const dy = pts[0].y - g.mid.y
      if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true
      setView(clamp({ ...g.view, x: g.view.x + dx, y: g.view.y + dy }))
    }
  }

  function onPointerUp(e: ReactPointerEvent) {
    const p = pointers.current.get(e.pointerId)
    pointers.current.delete(e.pointerId)
    startGesture()
    if (e.type !== 'pointerup' || !p || pointers.current.size > 0 || moved.current) return
    // 點兩下：放大到點的位置；已放大則還原
    const now = Date.now()
    const last = lastTap.current
    if (last && now - last.t < DOUBLE_TAP_MS && Math.hypot(last.x - p.x, last.y - p.y) < 30) {
      lastTap.current = null
      setView(view.scale > 1 ? RESET : zoomAt(view, DOUBLE_TAP_SCALE, p))
    } else lastTap.current = { t: now, x: p.x, y: p.y }
  }

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full shrink-0 snap-center overflow-hidden"
      // 沒放大時只讓瀏覽器處理左右滑動（換照片），雙指縮放由這裡處理；放大後全部自己處理
      style={{ touchAction: view.scale > 1 ? 'none' : 'pan-x' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="size-full"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: 'center' }}
      >
        <Photo blob={blob} alt={alt} fit="contain" framed={false} className="size-full" />
      </div>
    </div>
  )
}
