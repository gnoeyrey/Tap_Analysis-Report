"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import SidebarExplorer from '@/components/admin/SidebarExplorer';
import StartupReport from '@/components/admin/StartupReport';
import AnalysisSystem from '@/components/admin/AnalysisSystem';
import ResultView from '@/components/admin/ResultView';
import Dashboard from '@/components/admin/Dashboard';
import { Folder, StartupDetail } from '@/components/admin/types';

export default function AdminDashboard() {
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'folder'>('folder');
  const [viewMode, setViewMode] = useState<'empty' | 'report' | 'analysis' | 'result'>('empty');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [startups, setStartups] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<StartupDetail | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('root');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  // --- [추가] 사이드바 너비 조절 및 개폐 상태 ---
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 데이터 로드
  const fetchData = async () => {
    const { data: fData } = await supabase.from('folders').select('*').order('name');
    const { data: sData } = await supabase.from('startups').select('*').order('company_name');
    setFolders(fData || []);
    setStartups(sData || []);
  };

  useEffect(() => { fetchData(); }, []);

  // 리사이징 핸들러
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        // 최소 200px, 최대 600px 제한
        if (newWidth > 200 && newWidth < 600) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // 기업 상세 정보 로드
  const loadStartupDetail = async (item: any) => {
    const sId = item.id;
    const [edu, car, inv, svc, sal, ip, hist, awd] = await Promise.all([
      supabase.from('startup_education').select('*').eq('startup_id', sId),
      supabase.from('startup_careers').select('*').eq('startup_id', sId),
      supabase.from('startup_investments').select('*').eq('startup_id', sId),
      supabase.from('startup_services').select('*').eq('startup_id', sId),
      supabase.from('startup_sales').select('*').eq('startup_id', sId).order('year', { ascending: false }),
      supabase.from('startup_ips').select('*').eq('startup_id', sId),
      supabase.from('startup_biz_history').select('*').eq('startup_id', sId),
      supabase.from('startup_awards').select('*').eq('startup_id', sId),
    ]);

    setSelectedItem({
      ...item,
      education: edu.data || [], careers: car.data || [], investments: inv.data || [],
      services: svc.data || [], sales: sal.data || [], ips: ip.data || [],
      biz_history: hist.data || [], awards: awd.data || [],
    });
    setActiveMenu('folder');
    setViewMode('report');
  };

  const toggleFolder = (folderId: string) => {
    const newSet = new Set(expandedFolders);
    newSet.has(folderId) ? newSet.delete(folderId) : newSet.add(folderId);
    setExpandedFolders(newSet);
  };

  const copyShareLink = () => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/startup-form?folderId=${selectedFolder}`;
    navigator.clipboard.writeText(shareUrl);
    alert(`현재 폴더의 배포 링크가 복사되었습니다.`);
  };

  const getPath = () => {
    if (!selectedFolder || selectedFolder === 'root') return 'ROOT';
    const pathNames: string[] = [];
    let currentId = selectedFolder;
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        pathNames.unshift(folder.name);
        if (folder.parent_id === 'root' || !folder.parent_id) break;
        currentId = folder.parent_id;
      } else break;
    }
    return `ROOT / ${pathNames.join(' / ')}`;
  };

  return (
    <div className={`flex h-screen bg-white text-slate-900 overflow-hidden font-sans relative ${isResizing ? 'select-none cursor-col-resize' : ''}`}>
      
      {/* --- 사이드바 --- */}
      <aside 
        style={{ width: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
        className={`border-r border-slate-200 flex flex-col bg-slate-50 shrink-0 transition-[width,opacity] duration-300 ease-in-out relative
          ${!isSidebarOpen ? 'opacity-0' : 'opacity-100'}`}
      >
        <div style={{ minWidth: `${sidebarWidth}px` }} className="flex flex-col h-full overflow-hidden">
          <div className="p-8 pb-4">
            <h1 className="text-[27px] font-black tracking-tight text-slate-800 mb-8 uppercase italic text-left">TAP</h1>
            <nav className="space-y-2 mb-8 text-[15px]">
              <button 
                onClick={() => setActiveMenu('dashboard')} 
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all ${activeMenu === 'dashboard' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                📊 대시보드
              </button>
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-10 custom-scrollbar border-t border-slate-100 pt-4">
            <SidebarExplorer
              folders={folders}
              startups={startups}
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              selectedItemId={selectedItem?.id}
              onSelectStartup={loadStartupDetail}
              refreshData={fetchData}
            />
          </div>
        </div>

        {/* --- 너비 조절 핸들 (우측 경계선) --- */}
        {isSidebarOpen && (
          <div
            onMouseDown={startResizing}
            className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400/30 transition-colors z-50 ${isResizing ? 'bg-blue-500 w-1' : ''}`}
          />
        )}
      </aside>

      {/* --- 사이드바 토글 버튼 (중앙 화살표) --- */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute top-1/2 -translate-y-1/2 z-[60] w-5 h-12 bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all rounded-r-lg border-l-0"
        style={{ left: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
      >
        {isSidebarOpen ? '◀' : '▶'}
      </button>

      {/* --- 메인 영역 --- */}
      <main className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden">
        <header className="h-20 border-b border-slate-100 flex items-center px-10 bg-white shadow-sm shrink-0">
          <div className="flex-1 flex items-center gap-3 overflow-hidden">
            <span className="text-[15px] font-black text-blue-600 uppercase italic truncate">/ {getPath()}</span>
          </div>
          
          <div className="flex-1 flex justify-center gap-10">
            {['report', 'analysis', 'result'].map((mode) => (
              <button 
                key={mode} 
                onClick={() => {
                  if (selectedItem) {
                    setActiveMenu('folder');
                    setViewMode(mode as any);
                  }
                }} 
                className={`text-[14px] font-black uppercase tracking-widest transition-all ${viewMode === mode && activeMenu === 'folder' ? 'text-blue-600 underline underline-offset-8 decoration-2' : selectedItem ? 'text-slate-500 hover:text-slate-800' : 'text-slate-300 cursor-not-allowed'}`}
              >
                {mode === 'report' ? '원문 보기' : mode === 'analysis' ? '진단하기' : '진단결과'}
              </button>
            ))}
          </div>
          <div className="flex-1 flex justify-end">
             <button onClick={copyShareLink} className="px-6 py-3 bg-slate-900 text-white text-[13px] font-black rounded-xl shadow-md uppercase hover:bg-blue-600 transition-all active:scale-95">Copy Link 🔗</button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-12 custom-scrollbar">
          {activeMenu === 'dashboard' ? (
            <Dashboard folderId={selectedFolder} onSelectFolder={(id) => setSelectedFolder(id)} />
          ) : (
            <div className="h-full">
              {viewMode === 'empty' ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-200 uppercase font-black italic tracking-widest text-center">
                  <span className="text-[80px] mb-4 opacity-50">📄</span>
                  <p>기업명을 선택해주세요</p>
                </div>
              ) : viewMode === 'report' && selectedItem ? (
                <StartupReport selectedItem={selectedItem} onClose={() => setViewMode('empty')} />
              ) : viewMode === 'analysis' && selectedItem ? (
                <AnalysisSystem selectedItem={selectedItem} onClose={() => setViewMode('empty')} onSave={async (data: any) => await supabase.from('startup_analyses').insert(data)} />
              ) : viewMode === 'result' && selectedItem ? (
                <ResultView startupId={selectedItem.id} />
              ) : (
                <div className="max-w-4xl mx-auto bg-white p-12 rounded-[40px] shadow-xl text-center">
                  <h2 className="text-2xl font-black mb-4 uppercase italic">Feature Under Development</h2>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}