'use client'
import { useEffect, useState, useRef, useCallback } from 'react'

const WATERMARK_TEXT = '风居住的街道 · 数字衣柜'
const FIRST_SCREEN_COUNT = 24
const PAGE_SIZE = 48 // 每次滚动加载的节点数量
const SCROLL_KEY = 'gallery-scroll-top'

type ImageItem = {
  filename: string
  thumbUrl: string
  rawUrl: string
  time: number
}

/* ================= Canvas 渐进式渲染 ================= */
function WatermarkCanvas({ thumbSrc, rawSrc }: { thumbSrc: string; rawSrc: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    let isCancelled = false
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = (img: HTMLImageElement, isThumb: boolean) => {
      if (isCancelled) return
      const maxW = window.innerWidth * 0.95
      const maxH = window.innerHeight * 0.95
      const scale = Math.min(maxW / img.width, maxH / img.height, 1)

      const w = img.width * scale
      const h = img.height * scale

      canvas.width = w
      canvas.height = h
      
      ctx.save()
      ctx.filter = isThumb ? 'blur(8px)' : 'none'
      ctx.drawImage(img, 0, 0, w, h)
      ctx.restore()

      ctx.save()
      ctx.rotate((-20 * Math.PI) / 180)
      ctx.font = '24px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      for (let y = -h; y < h * 2; y += 160) {
        for (let x = -w; x < w * 2; x += 420) {
          ctx.fillText(WATERMARK_TEXT, x, y)
        }
      }
      ctx.restore()

      setOpacity(1)
    }

    const thumbImg = new Image()
    thumbImg.crossOrigin = 'anonymous'
    thumbImg.src = thumbSrc
    thumbImg.onload = () => draw(thumbImg, true)

    const rawImg = new Image()
    rawImg.crossOrigin = 'anonymous'
    rawImg.src = rawSrc
    rawImg.onload = () => draw(rawImg, false)
    
    rawImg.onerror = () => {
      console.warn(`[Image fallback] 原图加载失败, 使用缩略图兜底: ${rawSrc}`)
      if (thumbImg.complete) {
        draw(thumbImg, false) 
      } else {
        thumbImg.onload = () => draw(thumbImg, false)
      }
    }

    return () => { isCancelled = true }
  }, [thumbSrc, rawSrc])

  return (
    <canvas
      ref={ref}
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'block',
        margin: '0 auto',
        pointerEvents: 'none',
        opacity: opacity,
        transition: 'opacity 0.4s ease-out',
      }}
    />
  )
}

/* ================= 高级交互 Modal ================= */
function ImageModal({
  images,
  activeIndex,
  onClose,
  onChangeIndex
}: {
  images: ImageItem[]
  activeIndex: number
  onClose: () => void
  onChangeIndex: (newIndex: number) => void
}) {
  const [visible, setVisible] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  
  // ✅ 核心优化 1：使用 Set 缓存已预加载的 URL，防止重复发请求
  const preloadedUrls = useRef<Set<string>>(new Set())

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => setVisible(true))
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const preload = (index: number) => {
      if (index >= 0 && index < images.length) {
        const url = images[index].rawUrl
        // 只有没预加载过，才去发起请求
        if (!preloadedUrls.current.has(url)) {
          preloadedUrls.current.add(url)
          const img = new Image()
          img.decoding = 'async'
          img.src = url
        }
      }
    }
    preload(activeIndex + 1)
    preload(activeIndex - 1)
  }, [activeIndex, images])

  const triggerClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 300)
  }, [onClose])

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) onChangeIndex(activeIndex - 1)
  }, [activeIndex, onChangeIndex])

  const handleNext = useCallback(() => {
    if (activeIndex < images.length - 1) onChangeIndex(activeIndex + 1)
  }, [activeIndex, images.length, onChangeIndex])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') triggerClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [triggerClose, handlePrev, handleNext])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX
    const distance = touchStart - touchEnd
    if (distance > 50) handleNext()
    else if (distance < -50) handlePrev()
  }

  const currentImage = images[activeIndex]

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) triggerClose() }}
      onContextMenu={e => e.preventDefault()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        opacity: visible ? 1 : 0,
        backdropFilter: visible ? 'blur(12px)' : 'blur(0px)',
        WebkitBackdropFilter: visible ? 'blur(12px)' : 'blur(0px)',
        transition: 'all 0.3s ease',
      }}
    >
      <div 
        style={{ 
          position: 'absolute', top: 24, color: 'rgba(255,255,255,0.6)', 
          fontFamily: 'monospace', fontSize: '14px', letterSpacing: '2px',
          zIndex: 10, pointerEvents: 'none'
        }}
      >
        {activeIndex + 1} / {images.length}
      </div>

      <div
        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '20%', cursor: activeIndex > 0 ? 'w-resize' : 'default', zIndex: 5 }}
      />
      <div
        onClick={(e) => { e.stopPropagation(); handleNext(); }}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '20%', cursor: activeIndex < images.length - 1 ? 'e-resize' : 'default', zIndex: 5 }}
      />

      <WatermarkCanvas 
        key={currentImage.filename} 
        thumbSrc={currentImage.thumbUrl} 
        rawSrc={currentImage.rawUrl} 
      />
    </div>
  )
}

/* ================= 主 Gallery ================= */
export default function Gallery() {
  const [allImages, setAllImages] = useState<ImageItem[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE) // ✅ 核心优化 2：按批次渲染
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/images')
        const data = await res.json()
        setAllImages(data)
      } catch (err) {
        console.error('Failed to load images:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ✅ 核心优化 2：IntersectionObserver 监听底部，触底自动追加渲染节点
  useEffect(() => {
    if (loading || allImages.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, allImages.length))
        }
      },
      { rootMargin: '400px' } // 提前 400px 触发加载，让用户无感知
    )
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [loading, allImages.length])

  // 保留滚动记忆 (由于懒加载，刷新页面时只能定位到已渲染区域)
  useEffect(() => {
    if (loading) return
    const saved = sessionStorage.getItem(SCROLL_KEY)
    if (saved) {
      requestAnimationFrame(() => window.scrollTo(0, Number(saved)))
    }
    const onScroll = () => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [loading])

  if (loading) {
    return (
      <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} style={{ width: '100%', aspectRatio: '2 / 3', borderRadius: 10, background: '#e0e0e0', animation: 'pulse 1.5s infinite ease-in-out' }} />
        ))}
        <style dangerouslySetInnerHTML={{ __html: `@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }` }} />
      </div>
    )
  }

  // 计算当前应该渲染的列表
  const visibleImages = allImages.slice(0, visibleCount)

  return (
    <>
      {activeIndex !== null && (
        <ImageModal 
          images={allImages} // ⚠️ 注意：传给 Modal 的依然是完整的全量数据！
          activeIndex={activeIndex} 
          onClose={() => setActiveIndex(null)}
          onChangeIndex={(newIndex) => setActiveIndex(newIndex)}
        />
      )}
      
      <div
        onContextMenu={e => e.preventDefault()}
        style={{
          padding: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
        }}
      >
        {visibleImages.map((img, i) => (
          <div
            key={img.filename}
            onClick={() => setActiveIndex(i)}
            style={{
              width: '100%',
              aspectRatio: '2 / 3',
              borderRadius: 10,
              background: '#f0f0f0',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            <img
              src={img.thumbUrl}
              loading={i < FIRST_SCREEN_COUNT ? 'eager' : 'lazy'}
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                userSelect: 'none',
                pointerEvents: 'none', 
              }}
            />
          </div>
        ))}
      </div>
      
      {/* 底部哨兵节点：用于触发 IntersectionObserver */}
      {visibleCount < allImages.length && (
        <div ref={loadMoreRef} style={{ height: 20, width: '100%' }} />
      )}
    </>
  )
}