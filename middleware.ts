import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  // 사용자가 주소창에 직접 /admin을 치고 들어온다면?
  if (url.pathname.startsWith('/admin')) {
    // 메인 페이지나 404 페이지로 돌려보내기
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// 이 미들웨어가 실행될 경로 설정
export const config = {
  matcher: ['/admin/:path*'], // /admin으로 시작하는 모든 경로에 적용
}