import { NextResponse } from 'next/server'
import { r2Client } from '@/lib/r2'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'

export const revalidate = 60

export async function GET() {
  try {
    const domain = process.env.NEXT_PUBLIC_R2_DOMAIN
    const bucket = process.env.R2_BUCKET_NAME // 你的桶 "123"

    let isTruncated = true
    let continuationToken: string | undefined = undefined
    const allItems: any[] = []

    // 循环拉取，突破 1000 张限制，拿到你完整的 1892 张图
    while (isTruncated) {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: 'thumb/', // 精准匹配前缀：去掉了s
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
      .filter(item => item.Key && item.Key !== 'thumb/') // 排除前缀本身
      .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
      .map(item => {
        // item.Key 长这样: "thumb/图片名字.webp"
        const thumbKey = item.Key!
        
        // 1. 剥离前缀和后缀，只保留纯图片名
        // 例如变成: "1.9__artist_fuzichoco__"
        const baseName = thumbKey.replace('thumb/', '').replace('.webp', '')

        // 2. 对含有空格、逗号的复杂文件名进行 URL 编码，防止图片裂开
        const encodedBaseName = encodeURIComponent(baseName)

        return {
          filename: baseName,
          // 缩略图：拼接 thumb/ 和 .webp
          thumbUrl: `${domain}/thumb/${encodedBaseName}.webp`,
          // 原图：直接在根目录，拼接 .png
          rawUrl: `${domain}/${encodedBaseName}.png`,
          time: item.LastModified?.getTime() || 0
        }
      })

    return NextResponse.json(images)
  } catch (error) {
    console.error('R2 List Error:', error)
    return NextResponse.json([], { status: 500 })
  }
}