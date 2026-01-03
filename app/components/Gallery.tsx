'use client'

import { useEffect, useState, useRef } from 'react'
import { SUPABASE_SOURCES } from '@/lib/supabaseClients'

const WATERMARK_TEXT = '风居住的街道 · 数字衣柜'
const FIRST_SCREEN_COUNT = 24

/* ================= 工具：缩略图（强制不裁） ================= */
function getThumb(url: string) {
  return (
    url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    ) + '?width=480&quality=60&resize=contain'
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
        background: 'rgba(0,0,0,0.9)',
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

/* ================= 读取 bucket ================= */
async function listImages(client: any, bucket: string) {
  const results: { url: string; time: number }[] = []
  let offset = 0
  const LIMIT = 100

  while (true) {
    const { data } = await client.storage.from(bucket).list('', {
      limit: LIMIT,
      offset,
      sortBy: { column: 'created_at', order: 'desc' },
    })

    if (!data || data.length === 0) break

    for (const file of data) {
      if (/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
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
    offset += LIMIT
  }

  return results
}

/* ================= 主 Gallery ================= */
export default function Gallery() {
  const [images, setImages] = useState<
    { url: string; time: number }[]
  >([])
  const [active, setActive] = useState<string | null>(null)

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
      setImages(unique)
    }

    load()
  }, [])

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

          /* ✅ 关键：列可以多，但永远不会压成细条 */
          gridTemplateColumns:
            'repeat(auto-fill, minmax(180px, 1fr))',

          gap: 12,
        }}
      >
        {images.map((img, i) => (
          <div
            key={i}
            onClick={() => setActive(img.url)}
            style={{
              width: '100%',
              aspectRatio: '2 / 3', // ✅ 统一立绘比例
              borderRadius: 12,
              background: '#fff',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            <img
              src={getThumb(img.url)}
              loading={i < FIRST_SCREEN_COUNT ? 'eager' : 'lazy'}
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain', // ❗永不裁
                display: 'block',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </div>
        ))}
      </div>
    </>
  )
}