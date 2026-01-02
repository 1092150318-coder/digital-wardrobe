'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabaseA, supabaseB, supabaseC } from '@/lib/supabaseClients'

function Skeleton() {
  return (
    <div
      style={{
        width: '100%',
        height: 240,
        borderRadius: 12,
        background: 'linear-gradient(90deg, #eee, #f5f5f5, #eee)',
        animation: 'pulse 1.5s infinite'
      }}
    />
  )
}

const PAGE_SIZE = 24
const WATERMARK_TEXT = '风居住的街道 · 数字衣柜'

/* ================= Canvas 图片渲染（防下载核心） ================= */
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
      ctx.drawImage(img, 0, 0)

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
  }, [src])

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

/* ================= Supabase 源定义（分桶规则核心） ================= */
const SOURCES = [
  { client: supabaseA, label: 'A' }, // 旧：107 张，只读
  { client: supabaseB, label: 'B' }, // 新

/* ================= 主 Gallery ================= */
export default function Gallery() {
  const [images, setImages] = useState<string[]>([])
  const [pageMap, setPageMap] = useState<number[]>(SOURCES.map(() => 0))
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const loaderRef = useRef<HTMLDivElement>(null)

  const loadImages = useCallback(async () => {
    if (loading) return
    setLoading(true)

    const results: string[] = []

    for (let i = 0; i < SOURCES.length; i++) {
      const { client } = SOURCES[i]
      const page = pageMap[i]

      const { data } = await client.storage
        .from('wardrobe')
        .list('', {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          sortBy: { column: 'created_at', order },
        })

      if (data) {
        const urls = data
          .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f.name))
          .map(
            f =>
              client.storage
                .from('wardrobe')
                .getPublicUrl(f.name).data.publicUrl
          )

        results.push(...urls)
      }
    }

    setImages(prev => [...prev, ...results])
    setPageMap(pages => pages.map(p => p + 1))
    setLoading(false)
  }, [pageMap, order, loading])

  /* 顺序切换时重置 */
  useEffect(() => {
    setImages([])
    setPageMap(SOURCES.map(() => 0))
  }, [order])

  /* 首次加载 */
  useEffect(() => {
    loadImages()
  }, [loadImages])

  /* 懒加载 */
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries[0].isIntersecting && loadImages(),
      { rootMargin: '200px' }
    )

    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [loadImages])

  return (
    <>
      {/* 顺序切换 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button onClick={() => setOrder('desc')}>最新</button>
        <button onClick={() => setOrder('asc')}>最早</button>
      </div>

      {/* 图片网格 */}
      <div
        onContextMenu={e => e.preventDefault()}
        style={{
          padding: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 18,
        }}
      >
        {images.map((src, i) => (
          <div key={i} style={{ borderRadius: 14, overflow: 'hidden' }}>
            <CanvasImage src={src} />
          </div>
        ))}

        {loading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
        <div ref={loaderRef} style={{ height: 1 }} />
      </div>
    </>
  )
}