'use client'

import { useEffect, useState, useRef } from 'react'
import { SUPABASE_SOURCES } from '@/lib/supabaseClients'

const WATERMARK_TEXT = '风居住的街道 · 数字衣柜'

/* ================= 渲染控制参数 ================= */
const FIRST_RENDER_COUNT = 36     // 首屏渲染数量
const BATCH_RENDER_COUNT = 36     // 每次追加渲染数量
const SCROLL_KEY = 'gallery_scroll_y'

/* ================= 缩略图（自适应 DPR） ================= */
function getThumb(url: string) {
  const dpr =
    typeof window !== 'undefined'
      ? Math.min(window.devicePixelRatio || 1, 3)
      : 1

  const width = Math.round(360 * dpr)

  return (
    url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    ) +
    `?width=${width}&quality=72&resize=contain`
  )
}

/* ================= Canvas 原图（水印 + 等比） ================= */
function WatermarkCanvas({ src }: { src: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src

    img.onload = () => {
      const canvas = ref.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const maxW = window.innerWidth * 0.95
      const maxH = window.innerHeight * 0.95
      const scale = Math.min(maxW / img.width, maxH / img.height, 1)

      const w = img.width * scale
      const h = img.height * scale

      canvas.width = w
      canvas.height = h
      ctx.drawImage(img, 0, 0, w, h)

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
    }
  }, [src])

  return (
    <canvas
      ref={ref}
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'block',
        margin: '0 auto',
        pointerEvents: 'none',
      }}
    />
  )
}

/* ================= 原图 Modal ================= */
function ImageModal({
  src,
  onClose,
}: {
  src: string
  onClose: () => void
}) {
  return (
    <div
      onClick={onClose}
      onContextMenu={e => e.preventDefault()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
      }}
    >
      <WatermarkCanvas src={src} />
    </div>
  )
}

/* ================= 读取 bucket（稳定分页） ================= */
async function listImages(client: any, bucket: string) {
  const results: { url: string; time: number }[] = []
  const LIMIT = 100
  let page = 0

  while (true) {
    const { data, error } = await client.storage
      .from(bucket)
      .list('', {
        limit: LIMIT,
        offset: page * LIMIT,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (error || !data || data.length === 0) break

    for (const file of data) {
      if (
        /\.(jpg|jpeg|png|webp)$/i.test(file.name) &&
        file.created_at
      ) {
        const { data: url } = client.storage
          .from(bucket)
          .getPublicUrl(file.name)

        if (url?.publicUrl) {
          results.push({
            url: url.publicUrl,
            time: new Date(file.created_at).getTime(),
          })
        }
      }
    }

    if (data.length < LIMIT) break
    page++
  }

  return results
}

/* ================= 主 Gallery ================= */
export default function Gallery() {
  const [allImages, setAllImages] = useState<
    { url: string; time: number }[]
  >([])
  const [visibleCount, setVisibleCount] = useState(FIRST_RENDER_COUNT)
  const [active, setActive] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)

  /* 记住滚动位置 */
  useEffect(() => {
    const y = sessionStorage.getItem(SCROLL_KEY)
    if (y) window.scrollTo(0, Number(y))

    return () => {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
    }
  }, [])

  /* 拉取所有图片（只一次） */
  useEffect(() => {
    async function load() {
      const all: { url: string; time: number }[] = []

      for (const src of SUPABASE_SOURCES) {
        if (!src.client) continue
        for (const bucket of src.buckets) {
          all.push(...(await listImages(src.client, bucket)))
        }
      }

      const unique = Array.from(
        new Map(all.map(i => [i.url, i])).values()
      )

      unique.sort((a, b) => b.time - a.time)
      setAllImages(unique)
    }

    load()
  }, [])

  /* 无限滚动：观察哨兵 */
  useEffect(() => {
    if (!sentinelRef.current) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(v =>
            Math.min(v + BATCH_RENDER_COUNT, allImages.length)
          )
        }
      },
      {
        rootMargin: '200px',
      }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [allImages.length])

  return (
    <>
      {active && (
        <ImageModal src={active} onClose={() => setActive(null)} />
      )}

      <div
        onContextMenu={e => e.preventDefault()}
        style={{
          padding: 12,
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(min(45vw, 180px), 1fr))',
          gap: 12,
        }}
      >
        {allImages.slice(0, visibleCount).map(img => (
          <div
            key={img.url}
            onClick={() => setActive(img.url)}
            style={{
              width: '100%',
              aspectRatio: '3 / 4',
              borderRadius: 12,
              background: '#fff',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            <img
              src={getThumb(img.url)}
              loading="lazy"
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

      {/* 无限滚动哨兵 */}
      <div ref={sentinelRef} style={{ height: 1 }} />
    </>
  )
}