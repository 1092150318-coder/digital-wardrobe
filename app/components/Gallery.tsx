'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

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

      // 动态水印
      ctx.font = '20px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.rotate(-Math.PI / 6)
      for (let y = -canvas.height; y < canvas.height * 2; y += 120) {
        for (let x = -canvas.width; x < canvas.width * 2; x += 300) {
          ctx.fillText('风居住的街道', x, y)
        }
      }
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

export default function Gallery() {
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    loadImages()
  }, [])

  async function loadImages() {
    const { data, error } = await supabase.storage
      .from('wardrobe')
      .list('', { limit: 1000 })

    if (error) return

    const urls = data
      .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f.name))
      .map(f =>
        supabase.storage.from('wardrobe').getPublicUrl(f.name).data.publicUrl
      )

    setImages(urls)
  }

  return (
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
            overflow: 'hidden',
            borderRadius: 12,
            background: '#000',
            filter: 'blur(1.5px)',
            transition: 'filter .3s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.filter = 'blur(0)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.filter = 'blur(1.5px)'
          }}
        >
          {/* Canvas 转绘图片 */}
          <CanvasImage src={src} />

          {/* 防操作遮罩 */}
          <div
            onContextMenu={e => e.preventDefault()}
            onTouchStart={e => e.preventDefault()}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
            }}
          />

          {/* 可视水印 */}
          <span
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              fontSize: 12,
              color: 'rgba(255,255,255,0.75)',
              background: 'rgba(0,0,0,0.45)',
              padding: '3px 8px',
              borderRadius: 6,
              zIndex: 3,
              pointerEvents: 'none',
            }}
          >
            风居住的街道·数字衣柜
          </span>
        </div>
      ))}
    </div>
  )
}