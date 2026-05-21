import { NextResponse } from 'next/server'
import { r2Client } from '@/lib/r2'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'

export const revalidate = 60

function getR2PublicBaseUrl(request: Request) {
  const envDomain = (process.env.NEXT_PUBLIC_R2_DOMAIN || '').trim().replace(/\/+$/, '')
  const origin = new URL(request.url).origin.replace(/\/+$/, '')

  // 旧的 img 子域名现在解析失败/不可用。即使 Vercel 里还残留旧环境变量，
  // 这里也强制改走当前网站自己的 /api/r2 代理。
  if (!envDomain || envDomain.includes('img.xn--pqqu92a7purjq99ibym.top') || envDomain.includes('img.风居住的街道.top')) {
    return `${origin}/api/r2`
  }

  return envDomain
}

export async function GET(request: Request) {
  try {
    const domain = getR2PublicBaseUrl(request)
    const bucket = process.env.R2_BUCKET_NAME

    if (!bucket) {
      console.error('R2 List Error: R2_BUCKET_NAME is missing')
      return NextResponse.json([], { status: 500 })
    }

    let isTruncated = true
    let continuationToken: string | undefined = undefined
    const allItems: any[] = []

    // 循环拉取，突破 1000 张限制，拿到完整图片列表
    while (isTruncated) {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: 'thumb/',
        ContinuationToken: continuationToken,
      })

      const response = await r2Client.send(command)

      if (response.Contents) {
        allItems.push(...response.Contents)
      }

      isTruncated = response.IsTruncated ?? false
      continuationToken = response.NextContinuationToken
    }

    const images = allItems
      .filter(item => item.Key && item.Key !== 'thumb/')
      .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
      .map(item => {
        // item.Key 长这样: "thumb/图片名字.webp"
        const thumbKey = item.Key!
        const baseName = thumbKey.replace(/^thumb\//, '').replace(/\.webp$/i, '')
        const encodedBaseName = encodeURIComponent(baseName)

        return {
          filename: baseName,
          // 现在统一走同站点 /api/r2 代理，不再吐出坏掉的 img 子域名
          thumbUrl: `${domain}/thumb/${encodedBaseName}.webp`,
          rawUrl: `${domain}/${encodedBaseName}.png`,
          time: item.LastModified?.getTime() || 0,
        }
      })

    return NextResponse.json(images)
  } catch (error) {
    console.error('R2 List Error:', error)
    return NextResponse.json([], { status: 500 })
  }
}
