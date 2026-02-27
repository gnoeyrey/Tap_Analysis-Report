'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 모든 필드가 채워졌는지 다시 한번 확인 (HTML5 validation 외 추가 방어)
    if (!companyName || !email || !password) {
      return alert('모든 항목을 입력해주세요.')
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          company_name: companyName 
        },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      alert('회원가입 실패: ' + error.message)
    } else {
      alert('회원가입 신청이 완료되었습니다! 이메일 인증 후 로그인해 주세요.')
      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f6f7] p-4">
      <div className="w-full max-w-[400px] bg-white p-10 rounded-lg shadow-md border border-gray-200">
        <h1 className="text-3xl font-black text-[#3b82f6] mb-8 text-center tracking-tighter uppercase">
           SIGNUP
        </h1>
        
        <form onSubmit={handleSignUp} className="flex flex-col gap-3">
          {/* 회사명 입력 (필수) */}
          <div className="mb-2">
            <label className="text-sm font-bold text-gray-700 mb-1 ml-1 block">
              회사명 <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              placeholder="법인명" 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-sm outline-none focus:border-[#3b82f6] placeholder-gray-400" 
              required 
            />
          </div>

          {/* 계정 정보 입력 (필수) */}
          <div className="mb-4">
            <label className="text-sm font-bold text-gray-700 mb-1 ml-1 block">
              계정 정보 <span className="text-red-500">*</span>
            </label>
            <input 
              type="email" 
              placeholder="이메일 주소" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-sm outline-none focus:border-[#3b82f6] mb-2 placeholder-gray-400" 
              required 
            />
            <input 
              type="password" 
              placeholder="비밀번호 (8자 이상)" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-sm outline-none focus:border-[#3b82f6] placeholder-gray-400" 
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="bg-[#60a5fa] text-white p-4 rounded-sm font-bold text-xl hover:bg-[#3b82f6] transition-all mt-2 disabled:bg-gray-400"
          >
            {loading ? '가입 처리 중...' : '회원가입'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-gray-500 text-sm">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-[#3b82f6] font-bold hover:underline">
              로그인하기
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}