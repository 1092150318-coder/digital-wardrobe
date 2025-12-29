'use client'
import { supabase } from '../../lib/supabase'

export default function AdminPage() {
  async function upload(e: any) {
    const files = e.target.files
    for (const file of files) {
      const fileName = `${Date.now()}-${file.name}`
      await supabase.storage.from('images').upload(fileName, file)
      await supabase.from('images').insert({ path: fileName })
    }
  }

  return (
    <main style={{ padding: 20 }}>
      <h2>发布者后台</h2>
      <input type="file" multiple onChange={upload} />
    </main>
  )
}