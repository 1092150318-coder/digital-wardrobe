import { GetObjectCommand } from '@aws-sdk/client-s3'
import { r2Client } from '@/lib/r2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CONTENT_TYPES: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
}

function contentTypeForKey(key: string, fallback?: string) {
  if (fallback) return fallback
  const ext = key.split('.').pop()?.toLowerCase() || ''
  return CONTENT_TYPES[ext] || 'application/octet-stream'
}

export async function GET(
  _request: Request,
  { params }: { params: { key?: string[] } }
) {
  const key = params.key?.join('/') || ''
  const bucket = process.env.R2_BUCKET_NAME

  if (!key || !bucket) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const object = await r2Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    )

    const body: any = object.Body
    const stream = typeof body?.transformToWebStream === 'function'
      ? body.transformToWebStream()
      : body

    if (!stream) {
      return new Response('Not found', { status: 404 })
    }

    const headers = new Headers()
    headers.set('Content-Type', contentTypeForKey(key, object.ContentType))
    headers.set('Cache-Control', 'public, max-age=86400')
    headers.set('Access-Control-Allow-Origin', '*')
    if (object.ContentLength !== undefined) {
      headers.set('Content-Length', String(object.ContentLength))
    }
    if (object.ETag) {
      headers.set('ETag', object.ETag)
    }
    if (object.LastModified) {
      headers.set('Last-Modified', object.LastModified.toUTCString())
    }

    return new Response(stream, { status: 200, headers })
  } catch (error) {
    console.error('R2 Proxy Error:', error)
    return new Response('Not found', {
      status: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    })
  }
}
