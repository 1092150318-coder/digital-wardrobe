'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

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

      // 动态水印（截图可追溯）
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

/* ================= 骨架占位 ================= */
function Skeleton() {
  return (
    <div
      style={{
        width: '100%',
        paddingBottom: '130%',
        background:
          'linear-gradient(90deg, #222 25%, #333 37%, #222 63%)',
        backgroundSize: '400% 100%',
        animation: 'skeleton 1.4s ease infinite',
        borderRadius: 12,
      }}
    />
  )
}

/* ================= 主 Gallery ================= */
export default function Gallery() {
  const [images, setImages] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const loaderRef = useRef<HTMLDivElement>(null)

  const loadImages = useCallback(async () => {
    if (loading) return
    setLoading(true)

    const { data, error } = await supabase.storage
      .from('wardrobe')
      .list('', {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sortBy: { column: 'created_at', order },
      })

    if (!error && data) {
      const urls = data
        .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f.name))
        .map(f =>
          supabase.storage.from('wardrobe').getPublicUrl(f.name).data.publicUrl
        )

      setImages(prev => [...prev, ...urls])
      setPage(p => p + 1)
    }

    setLoading(false)
  }, [page, order, loading])

  /* 顺序切换时重置 */
  useEffect(() => {
    setImages([])
    setPage(0)
  }, [order])

  /* 首次 + 顺序变更加载 */
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
      {/* 时间顺序切换 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 20,
          gap: 12,
        }}
      >
        <button
          onClick={() => setOrder('desc')}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            background: order === 'desc' ? '#fff' : '#333',
            color: order === 'desc' ? '#000' : '#aaa',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          最新
        </button>
        <button
          onClick={() => setOrder('asc')}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            background: order === 'asc' ? '#fff' : '#333',
            color: order === 'asc' ? '#000' : '#aaa',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          最早
        </button>
      </div>

      {/* 图片网格 */}
      <div
        onContextMenu={e => e.preventDefault()}
        onDragStart={e => e.preventDefault()}
        onSelect={e => e.preventDefault()}
        style={{
          padding: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 18,
        }}
      >
        {images.map((src, i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              borderRadius: 14,
              overflow: 'hidden',
              background: '#000',
            }}
          >
            <CanvasImage src={src} />

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
                pointerEvents: 'none',
              }}
            >
              风居住的街道
            </span>
          </div>
        ))}

        {/* Skeleton */}
        {loading &&
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}

        <div ref={loaderRef} style={{ height: 1 }} />
      </div>

      {/* Skeleton 动画 */}
      <style jsx>{`
        @keyframes skeleton {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }
      `}</style>
    </>
  )
}