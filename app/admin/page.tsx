'use client'

export default function AdminPage() {
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return

    // ⚠️ 只在浏览器事件里再 import
    const { supabaseA } = await import('@/lib/supabaseClients')

    for (const file of Array.from(files)) {
      const fileName = `${Date.now()}-${file.name}`
      await supabaseA.storage.from('images').upload(fileName, file)
      await supabaseA.from('images').insert({ path: fileName })
    }
  }

  return (
    <main style={{ padding: 20 }}>
      <h2>发布者后台</h2>
      <input type="file" multiple onChange={upload} />
    </main>
  )
}