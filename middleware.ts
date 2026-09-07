import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // If not logged in and trying to access admin routes, redirect to login
  if (!user && pathname.startsWith('/dashboard') || 
      !user && pathname.startsWith('/users') ||
      !user && pathname.startsWith('/campaigns') ||
      !user && pathname.startsWith('/verification') ||
      !user && pathname.startsWith('/reports') ||
      !user && pathname.startsWith('/disputes') ||
      !user && pathname.startsWith('/emails') ||
      !user && pathname.startsWith('/audit-logs') ||
      !user && pathname.startsWith('/user-logs') ||
      !user && pathname.startsWith('/deletions') ||
      !user && pathname.startsWith('/notifications') ||
      !user && pathname.startsWith('/settings') ||
      !user && pathname.startsWith('/analytics') ||
      !user && pathname.startsWith('/help-articles')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // If logged in and on login page, redirect to dashboard
  if (user && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
