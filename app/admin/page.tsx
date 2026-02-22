// app/admin/page.tsx
export default function AdminPage() {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <h1>后台管理</h1>
      <p style={{ color: '#666', marginTop: 16 }}>
        存储已全面迁移至 Cloudflare R2。前端已实现自动拉取并使用 Canvas 渐进式渲染。
      </p>
      <p style={{ color: '#666' }}>
        🖼️ <strong>图片更新说明：</strong><br />
        请直接登录 Cloudflare 控制台，将 WebP 缩略图放入 <code>thumb</code> 文件夹，将对应的 PNG 原图放在根目录即可，前端会自动同步。
      </p>
    </div>
  )
}