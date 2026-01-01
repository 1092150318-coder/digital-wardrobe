'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 24
const WATERMARK_TEXT = '风居住的街道 · 数字衣柜'
const COS_BASE = process.env.NEXT_PUBLIC_COS_BASE_URL!

/* ================= Canvas 图片渲染（防下载核心） ================= */
function CanvasImage({ src, fallback }: { src: string; fallback?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src

    img.onerror = () => {
      if (!fallback || cancelled) return
      img.src = fallback
    }

    img.onload = () => {
      if (cancelled) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // 动态水印
      ctx.save()
      ctx.rotate((-20 * Math.PI) / 180)
      ctx.font = '22px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.1)'

      for (let y = -canvas.height; y < canvas.height * 2; y += 140) {
        for (let x = -canvas.width; x < canvas.width * 2; x += 360) {
          ctx.fillText(WATERMARK_TEXT, x, y)
        }
      }
      ctx.restore()
    }

    return () => {
      cancelled = true
    }
  }, [src, fallback])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        display: 'block',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    />
  )
}

/* ================= 主 Gallery ================= */
export default function Gallery() {
  const [images, setImages] = useState<
    { cos: string; supa?: string }[]
  >([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const loaderRef = useRef<HTMLDivElement>(null)

  const loadImages = useCallback(async () => {
    if (loading) return
    setLoading(true)

    // 1️⃣ 从 Supabase 读取「文件清单」
    const { data } = await supabase.storage
      .from('wardrobe')
      .list('', {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sortBy: { column: 'created_at', order },
      })

    if (data) {
      const list = data
        .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f.name))
        .map(f => ({
          cos: `${COS_BASE}/${f.name}`,
          supa: supabase.storage
            .from('wardrobe')
            .getPublicUrl(f.name).data.publicUrl,
        }))

      setImages(prev => [...prev, ...list])
      setPage(p => p + 1)
    }

    setLoading(false)
  }, [page, order, loading])

  useEffect(() => {
    setImages([])
    setPage(0)
  }, [order])

  useEffect(() => {
    loadImages()
  }, [loadImages])

  useEffect(() => {
    const observer = new IntersectionObserver(
      e => e[0].isIntersecting && loadImages(),
      { rootMargin: '200px' }
    )
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [loadImages])

  return (
    <>
      {/* 时间排序 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button onClick={() => setOrder('desc')}>最新</button>
        <button onClick={() => setOrder('asc')}>最早</button>
      </div>

      {/* 图片 */}
      <div
        onContextMenu={e => e.preventDefault()}
        style={{
          padding: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
          gap: 18,
        }}
      >
        {images.map((img, i) => (
          <div
            key={i}
            style={{
              borderRadius: 14,
              overflow: 'hidden',
              background: '#000',
            }}
          >
            <CanvasImage src={img.cos} fallback={img.supa} />
          </div>
        ))}

        <div ref={loaderRef} />
      </div>
    </>
  )
}
