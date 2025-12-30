'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Gallery() {
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    loadImages()
  }, [])

  async function loadImages() {
    const { data, error } = await supabase.storage
      .from('wardrobe')
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (error) {
      console.error('load images error:', error)
      return
    }

    // 只保留图片文件
    const imageFiles = data.filter(file =>
      /\.(png|jpg|jpeg|webp)$/i.test(file.name)
    )

    const urls = imageFiles.map(file => {
      return supabase.storage
        .from('wardrobe')
        .getPublicUrl(file.name).data.publicUrl
    })

    setImages(urls)
  }

  return (
    <div
      style={{
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
      }}
    >
      {images.map((src, i) => (
        <div
          key={i}
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '10px',
            background: '#000',
          }}
        >
          <img
            src={src}
            draggable={false}
            onContextMenu={e => e.preventDefault()}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              userSelect: 'none',
            }}
          />

          {/* 水印 */}
          <span
            style={{
              position: 'absolute',
              right: '8px',
              bottom: '8px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.75)',
              background: 'rgba(0,0,0,0.45)',
              padding: '3px 8px',
              borderRadius: '6px',
              pointerEvents: 'none',
            }}
          >
            风居住街道 · 数字衣柜
          </span>
        </div>
      ))}
    </div>
  )
}