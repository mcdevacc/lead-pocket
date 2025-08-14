import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  // Extract tenant slug from URL
  const tenantMatch = req.nextUrl.pathname.match(/^\/([^\/]+)\//)
  const tenantSlug = tenantMatch?.[1]
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/signin',
    '/signup',
    '/api/public',
    '/lead-form',
    '/embed'
  ]
  
  // Check if this is a public route
  const isPublicRoute = publicRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route) || 
    req.nextUrl.pathname === '/'
  )
  
  // Skip auth for public routes and static files
  if (isPublicRoute || 
      req.nextUrl.pathname.startsWith('/_next') ||
      req.nextUrl.pathname.startsWith('/api/webhooks') ||
      req.nextUrl.pathname.includes('.')) {
    return res
  }
  
  // For tenant routes, check authentication
  if (tenantSlug) {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      const redirectUrl = new URL('/signin', req.url)
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
    
    // Add tenant slug to headers for API routes to use
    res.headers.set('x-tenant-slug', tenantSlug)
    res.headers.set('x-user-id', user.id)
  }
  
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
