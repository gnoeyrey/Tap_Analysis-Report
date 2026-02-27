"use client";

import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Folder } from './types';

interface Props {
  folders: Folder[];
  startups: any[];
  selectedFolder: string;
  setSelectedFolder: (id: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
  selectedItemId?: string | null;
  onSelectStartup: (s: any) => void;
  refreshData: () => void;
}

export default function SidebarExplorer({ 
  folders, startups, selectedFolder, setSelectedFolder, 
  expandedFolders, toggleFolder, selectedItemId, 
  onSelectStartup, refreshData 
}: Props) {

  // --- 1. 폴더 추가 핸들러 ---
  const handleAddFolder = async (e: React.MouseEvent, parentId: string) => {
    e.stopPropagation();
    const folderName = prompt("새 폴더 이름을 입력하세요:");
    if (!folderName) return;

    const { error } = await supabase
      .from('folders')
      .insert([{ name: folderName, parent_id: parentId }]);

    if (error) alert("폴더 추가 실패: " + error.message);
    else refreshData();
  };

  // --- 2. 폴더 이름 수정 핸들러 (추가된 기능) ---
  const handleRenameFolder = async (e: React.MouseEvent, folder: Folder) => {
    e.stopPropagation();
    const newName = prompt(`'${folder.name}'의 새 이름을 입력하세요:`, folder.name);
    if (!newName || newName === folder.name) return;

    const { error } = await supabase
      .from('folders')
      .update({ name: newName })
      .eq('id', folder.id);

    if (error) alert("이름 수정 실패: " + error.message);
    else refreshData();
  };

  // --- 3. 폴더 삭제 핸들러 ---
  const handleDeleteFolder = async (e: React.MouseEvent, folder: Folder) => {
    e.stopPropagation();
    if (!confirm(`'${folder.name}' 폴더를 삭제하시겠습니까? 하위 항목이 모두 삭제될 수 있습니다.`)) return;

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folder.id);

    if (error) alert("폴더 삭제 실패: " + error.message);
    else {
      if (selectedFolder === folder.id) setSelectedFolder('root');
      refreshData();
    }
  };

  const SidebarExplorerTree = ({ parentId }: { parentId: string }) => {
    const childFolders = folders.filter(f => f.parent_id === parentId);
    const childStartups = startups.filter(s => s.parent_id === parentId);

    return (
      <div className="flex flex-col ml-2 border-l border-slate-200 pl-2">
        {childFolders.map(folder => (
          <div key={folder.id} className="group relative">
            <div
              className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-all mb-0.5 text-[14px] ${selectedFolder === folder.id ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-slate-200 text-slate-600'}`}
              onClick={() => { setSelectedFolder(folder.id); toggleFolder(folder.id); }}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-[10px] w-3">{expandedFolders.has(folder.id) ? '▼' : '▶'}</span>
                <span className="truncate text-slate-700">📁 {folder.name}</span>
              </div>

              {/* 버튼 그룹: 마우스 호버 시 표시 */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                <button 
                  onClick={(e) => handleAddFolder(e, folder.id)}
                  title="하위 폴더 추가"
                  className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-400 hover:bg-blue-600 hover:text-white transition-colors text-[12px]"
                >
                  +
                </button>
                {/* 수정 버튼 추가 */}
                <button 
                  onClick={(e) => handleRenameFolder(e, folder)}
                  title="폴더 이름 수정"
                  className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-400 hover:bg-amber-500 hover:text-white transition-colors text-[10px]"
                >
                  ✏️
                </button>
                <button 
                  onClick={(e) => handleDeleteFolder(e, folder)}
                  title="폴더 삭제"
                  className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-400 hover:bg-red-600 hover:text-white transition-colors text-[12px]"
                >
                  -
                </button>
              </div>
            </div>
            {expandedFolders.has(folder.id) && <SidebarExplorerTree parentId={folder.id} />}
          </div>
        ))}
        {childStartups.map(startup => (
          <div
            key={startup.id}
            className={`flex items-center gap-2 py-1.5 px-3 ml-3 rounded-lg cursor-pointer transition-all mb-0.5 text-[13px] ${selectedItemId === startup.id ? 'border-2 border-blue-600 text-black font-semibold bg-blue-50' : 'hover:bg-blue-50 text-slate-500'}`}
            onClick={() => onSelectStartup(startup)}
          >
            <span className="truncate font-medium text-slate-600">📄 {startup.company_name}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="select-none">
      {/* Root Directory: 수정/삭제 버튼 제외, 추가 버튼만 유지 */}
      <div className="group flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer mb-1 hover:bg-slate-200 text-slate-600 transition-all" onClick={() => { setSelectedFolder('root'); toggleFolder('root'); }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-3">{expandedFolders.has('root') ? '▼' : '▶'}</span>
          <span className="text-[15px] uppercase font-bold tracking-tight">📂 Root Directory</span>
        </div>
        <button 
          onClick={(e) => handleAddFolder(e, 'root')}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center bg-white border border-slate-300 rounded-md text-slate-600 hover:bg-slate-900 hover:text-white transition-all text-[14px] font-bold"
        >
          +
        </button>
      </div>
      {expandedFolders.has('root') && <SidebarExplorerTree parentId="root" />}
    </div>
  );
}