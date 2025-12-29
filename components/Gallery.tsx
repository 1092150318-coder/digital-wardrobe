'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Gallery() {
  const [images, setImages] = useState<any[]>([])

  useEffect(() => {
    loadImages()

    const channel = supabase
      .channel('realtime-images')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'images' },
        () => loadImages()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadImages() {
    const { data } = await supabase
      .from('images')
      .select('*')
      .order('id', { ascending: false })

    setImages(data || [])
  }

  return (
    <div className="grid">
      {images.map(img => (
        <div className="img-wrap" key={img.id}>
          <img
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${img.path}`}
            draggable={false}
            onContextMenu={e => e.preventDefault()}
          />
          <span className="watermark">风居住街道 · 数字衣柜</span>
        </div>
      ))}
    </div>
  )
}