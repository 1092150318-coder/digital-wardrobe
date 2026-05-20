import { GetObjectCommand } from '@aws-sdk/client-s3'
import { r2Client } from '@/lib/r2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getContentType(key: string) {
  const lower = key.toLowerCase()

  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'

  return 'application/octet-stream'
}

export async function GET(
  request: Request,
  { params }: { params: { key: string[] } }
) {
  try {
    const key = params.key.join('/')

    const result = await r2Client.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    )

    const body = result.Body as any

    if (!body) {
      return new Response('Not found', { status: 404 })
    }

    const bytes = await body.transformToByteArray()

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type':
          result.ContentType || getContentType(key),
        'Cache-Control':
          'public, max-age=86400, s-maxage=31536000',
      },
    })
  } catch (error) {
    console.error(error)
    return new Response('Not found', { status: 404 })
  }
}
