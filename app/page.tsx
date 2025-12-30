import Gallery from './components/Gallery'

export default function HomePage() {
  return (
    <main style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* 网站标题 */}
      <header style={{ padding: '48px 24px 24px' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '8px' }}>
          风居住的街道-数字衣柜
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          致力于最好的 AI 创作
        </p>
      </header>

      {/* 图片画廊 */}
      <Gallery />
    </main>
  )
}