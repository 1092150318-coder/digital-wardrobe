'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 24
const WATERMARK_TEXT = '风居住的街道 · 数字衣柜'

/* ================= Canvas 图片渲染（核心防下载） ================= */
function CanvasImage({ src }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src

    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = img.width
      canvas.height = img.height

      // 绘制图片
      ctx.drawImage(img, 0, 0)

      // 动态水印（截图可识别）
      const angle = (-20 + Math.random() * 10) * (Math.PI / 180)
      ctx.rotate(angle)
      ctx.font = '22px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.1)'

      for (let y = -canvas.height; y < canvas.height * 2; y += 140) {
        for (let x = -canvas.width; x < canvas.width * 2; x += 360) {
          ctx.fillText(WATERMARK_TEXT, x, y)
        }
      }

      ctx.rotate(-angle)
    }
  }, [src])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    />
  )
}

/* ================= 主 Gallery ================= */
export default function Gallery() {
  const [images, setImages] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  /* 拉取一页图片 */
  const loadImages = useCallback(async () => {
    if (loading) return
    setLoading(true)

    const { data, error } = await supabase.storage
      .from('wardrobe')
      .list('', {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (!error && data) {
      const urls = data
        .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f.name))
        .map(f =>
          supabase.storage.from('wardrobe').getPublicUrl(f.name).data.publicUrl
        )

      setImages(prev => [...prev, ...urls])
      setPage(prev => prev + 1)
    }

    setLoading(false)
  }, [page, loading])

  /* 首次加载 */
  useEffect(() => {
    loadImages()
  }, [])

  /* 懒加载监听 */
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) loadImages()
      },
      { rootMargin: '200px' }
    )

    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [loadImages])

  return (
    <div
      onContextMenu={e => e.preventDefault()}
      onDragStart={e => e.preventDefault()}
      onSelect={e => e.preventDefault()}
      style={{
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '18px',
      }}
    >
      {images.map((src, i) => (
        <div
          key={i}
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '14px',
            background: '#000',
          }}
        >
          <CanvasImage src={src} />

          {/* 防操作遮罩 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
            }}
          />

          {/* 可视水印（弱存在感） */}
          <span
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              fontSize: 12,
              color: 'rgba(255,255,255,0.7)',
              background: 'rgba(0,0,0,0.4)',
              padding: '3px 8px',
              borderRadius: 6,
              zIndex: 3,
              pointerEvents: 'none',
            }}
          >
            风居住的街道
          </span>
        </div>
      ))}

      {/* 懒加载触发器 */}
      <div ref={loaderRef} style={{ height: 1 }} />

      {loading && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.6 }}>
          加载中…
        </div>
      )}
    </div>
  )
}