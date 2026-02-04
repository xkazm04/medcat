import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

/**
 * API Route: POST /api/categories/revalidate
 *
 * Invalidates the server-side category cache.
 * Call this after product mutations that affect category counts.
 *
 * Headers:
 *   x-revalidate-token: Optional token for security (configure in env)
 */
export async function POST(request: Request) {
  // Optional: Add security token check
  const token = request.headers.get('x-revalidate-token')
  const expectedToken = process.env.REVALIDATE_TOKEN

  if (expectedToken && token !== expectedToken) {
    return NextResponse.json(
      { error: 'Invalid revalidation token' },
      { status: 401 }
    )
  }

  try {
    // Invalidate the server-side cache for categories
    revalidateTag('categories', 'default')

    return NextResponse.json({
      revalidated: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[revalidate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to revalidate cache' },
      { status: 500 }
    )
  }
}
