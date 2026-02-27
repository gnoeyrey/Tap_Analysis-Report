"use client";

import React from "react";

/**
 * Admin 레이아웃 컴포넌트
 * Next.js의 레이아웃은 반드시 export default로 선언되어야 하며,
 * children을 인자로 받아 적절한 위치에 렌더링해야 합니다.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* 관리자 상단 바 (헤더) */}
      <header className="h-16 bg-black text-white flex items-center px-8 shadow-md">
        <div className="flex items-center gap-4">
          <span className="text-2xl">📑</span>
          <h1 className="text-xl font-black tracking-tighter uppercase">
            Management System <span className="text-gray-400"></span>
          </h1>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 메인 콘텐츠 영역 (page.tsx가 여기에 들어갑니다) */}
        <main className="flex-1 overflow-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
      
      {/* 하단 푸터 (필요 시) */}
      <footer className="h-10 bg-white border-t border-gray-200 flex items-center justify-end px-8 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
        © 2026 Admin Control Center
      </footer>
    </div>
  );
}