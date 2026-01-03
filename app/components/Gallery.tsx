'use client'

import { useEffect, useState, useRef } from 'react'
import { supabaseA, supabaseB } from '@/lib/supabaseClients'

const WATERMARK_TEXT = '风居住的街道 · 数字衣柜'

/* ================= Canvas 水印 ================= */
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
      style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
    />
  )
}

/* ================= 递归读取 bucket ================= */
async function listAllImages(
  client: any,
  bucket: string
): Promise<string[]> {
  if (!client) return []

  const LIMIT = 100
  let offset = 0
  const results: string[] = []

  while (true) {
    const { data, error } = await client.storage.from(bucket).list('', {
      limit: LIMIT,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error || !data || data.length === 0) break

    for (const item of data) {
      if (/\.(png|jpg|jpeg|webp)$/i.test(item.name)) {
        const { data: url } = client.storage
          .from(bucket)
          .getPublicUrl(item.name)

        if (url?.publicUrl) results.push(url.publicUrl)
      }
    }

    if (data.length < LIMIT) break
    offset += LIMIT
  }

  return results
}
/* ================= 主 Gallery ================= */
export default function Gallery() {
  const [images, setImages] = useState<string[]>([])
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    async function load() {
      console.log('supabaseA:', supabaseA)
      console.log('supabaseB:', supabaseB)

      const all: string[] = []

      // 老账号
      if (supabaseA) {
        console.log('loading supabaseA')
        all.push(...(await listAllImages(supabaseA, 'wardrobe')))
      }

      // 新账号（3 个桶）
      if (supabaseB) {
        console.log('loading supabaseB')
        all.push(...(await listAllImages(supabaseB, '1')))
        all.push(...(await listAllImages(supabaseB, '2')))
        all.push(...(await listAllImages(supabaseB, '3')))
      }

      console.log('total images:', all.length)

      const unique = Array.from(new Set(all))
      setImages(order === 'asc' ? unique.reverse() : unique)
    }

    load()
  }, [order])

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <button onClick={() => setOrder('desc')}>最新</button>
        <button onClick={() => setOrder('asc')}>最早</button>
      </div>

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
          <div key={i} style={{ borderRadius: 12, overflow: 'hidden' }}>
            <CanvasImage src={src} />
          </div>
        ))}
      </div>
    </>
  )
}