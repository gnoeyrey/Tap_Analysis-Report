'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link' // 페이지 이동을 위한 Link 컴포넌트 추가

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isMount, setIsMount] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    setIsMount(true)
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('로그인 실패: ' + error.message)
    } else {
      // 로그인 성공 시 관리자 페이지로 이동
      router.push('/admin')
      router.refresh()
    }
    setLoading(false)
  }

  if (!isMount) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f6f7] p-4">
      <div className="w-full max-w-[400px] bg-white p-10 rounded-lg shadow-md border border-gray-200">
        <h1 className="text-3xl font-black text-[#3b82f6] mb-8 text-center tracking-tighter">
          LOGIN
        </h1>
        
        <form onSubmit={handleSignIn} className="flex flex-col gap-3">
          <input 
            type="email" 
            placeholder="아이디(이메일)" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-sm outline-none focus:border-[#3b82f6]" 
            required 
          />
          <input 
            type="password" 
            placeholder="비밀번호" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-sm outline-none focus:border-[#3b82f6]" 
            required 
          />
          
          <button 
            type="submit" 
            disabled={loading}
            className="bg-[#60a5fa] text-white p-4 rounded-sm font-bold text-xl hover:bg-[#3b82f6] transition-all mt-2 disabled:bg-gray-400"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 하단 회원가입 링크 추가 */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-gray-500 text-sm">
            아직 계정이 없으신가요?{' '}
            <Link href="/signup" className="text-[#3b82f6] font-bold hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}