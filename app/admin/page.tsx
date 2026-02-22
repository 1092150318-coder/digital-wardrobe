export default function AdminPage() {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <h1>后台管理</h1>
      <p style={{ color: '#666', marginTop: 16 }}>
        存储已全面迁移至 Cloudflare R2。前端已实现自动拉取并使用 Canvas 渐进式渲染。
      </p>
    </div>
  )
}