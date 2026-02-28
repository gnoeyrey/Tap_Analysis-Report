"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Folder } from './types';

interface Props {
  folders: (Folder & { sort_order?: number })[]; // Folder 타입에 sort_order가 있다고 강제로 알려줌
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

  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // --- 1. 폴더 기본 조작 (추가, 수정, 삭제) ---
  const handleAddFolder = async (e: React.MouseEvent, parentId: string) => {
    e.stopPropagation();
    const folderName = prompt("새 폴더 이름을 입력하세요:");
    if (!folderName) return;

    // 현재 폴더 내의 마지막 순서로 지정
    const currentMax = folders.filter(f => f.parent_id === parentId).length;
    const { error } = await supabase
      .from('folders')
      .insert([{ name: folderName, parent_id: parentId, sort_order: currentMax }]);

    if (error) alert("폴더 추가 실패");
    else refreshData();
  };

  const handleRenameFolder = async (e: React.MouseEvent, folder: Folder) => {
    e.stopPropagation();
    const newName = prompt(`'${folder.name}'의 새 이름을 입력하세요:`, folder.name);
    if (!newName || newName === folder.name) return;

    await supabase.from('folders').update({ name: newName }).eq('id', folder.id);
    refreshData();
  };

  const handleDeleteFolder = async (e: React.MouseEvent, folder: Folder) => {
    e.stopPropagation();
    if (!confirm(`'${folder.name}' 폴더를 삭제하시겠습니까?`)) return;

    await supabase.from('folders').delete().eq('id', folder.id);
    if (selectedFolder === folder.id) setSelectedFolder('root');
    refreshData();
  };

  // --- 2. 드래그 앤 드롭 및 순서 변경 로직 ---
  const onDragStart = (e: React.DragEvent, id: string, type: 'folder' | 'startup') => {
    e.dataTransfer.setData("id", id);
    e.dataTransfer.setData("type", type);
    e.dataTransfer.effectAllowed = "move";
    e.stopPropagation();
  };

  const onDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(targetId);
  };

  const onDrop = async (e: React.DragEvent, targetId: string, targetType: 'folder' | 'startup' | 'root') => {
    e.preventDefault();
    setDragOverId(null);

    const draggedId = e.dataTransfer.getData("id");
    const draggedType = e.dataTransfer.getData("type");

    if (draggedId === targetId) return;

    let newParentId = targetId;
    // 파일(startup) 위에 떨어뜨리면 해당 파일의 부모 폴더로 이동
    if (targetType === 'startup') {
      const targetStartup = startups.find(s => s.id === targetId);
      newParentId = targetStartup?.parent_id || 'root';
    }

    try {
      const table = draggedType === 'folder' ? 'folders' : 'startups';
      
      // 타겟 아이템의 순서 바로 뒤로 설정 (간단 정렬)
      let newOrder = 0;
      if (targetType !== 'root') {
        const targetItem = targetType === 'folder' 
          ? folders.find(f => f.id === targetId)
          : startups.find(s => s.id === targetId);
        newOrder = (targetItem?.sort_order ?? 0) + 1;
      }

      await supabase.from(table).update({ 
        parent_id: newParentId,
        sort_order: newOrder
      }).eq('id', draggedId);

      refreshData();
    } catch (err) {
      console.error("Drop Error:", err);
    }
  };

  // --- 3. 트리 구조 렌더링 ---
  const SidebarExplorerTree = ({ parentId }: { parentId: string }) => {
    const childFolders = [...folders]
      .filter(f => f.parent_id === parentId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    const childStartups = [...startups]
      .filter(s => s.parent_id === parentId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    return (
      <div className="flex flex-col ml-2 border-l border-slate-200 pl-2">
        {childFolders.map(folder => (
          <div key={folder.id} className="group relative">
            <div
              draggable
              onDragStart={(e) => onDragStart(e, folder.id, 'folder')}
              onDragOver={(e) => onDragOver(e, folder.id)}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => onDrop(e, folder.id, 'folder')}
              className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-all mb-0.5 text-[14px] 
                ${selectedFolder === folder.id ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-slate-200 text-slate-600'}
                ${dragOverId === folder.id ? 'border-t-2 border-blue-500 bg-blue-50' : ''}`}
              onClick={() => { setSelectedFolder(folder.id); toggleFolder(folder.id); }}
            >
              <div className="flex items-center gap-2 truncate pointer-events-none">
                <span className="text-[10px] w-3">{expandedFolders.has(folder.id) ? '▼' : '▶'}</span>
                <span className="truncate">📁 {folder.name}</span>
              </div>

              {/* [복구] 우측 버튼 그룹 */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                <button onClick={(e) => handleAddFolder(e, folder.id)} className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-400 hover:bg-blue-600 hover:text-white transition-colors text-[12px]">+</button>
                <button onClick={(e) => handleRenameFolder(e, folder)} className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-400 hover:bg-amber-500 hover:text-white transition-colors text-[10px]">✏️</button>
                <button onClick={(e) => handleDeleteFolder(e, folder)} className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-400 hover:bg-red-600 hover:text-white transition-colors text-[12px]">-</button>
              </div>
            </div>
            {expandedFolders.has(folder.id) && <SidebarExplorerTree parentId={folder.id} />}
          </div>
        ))}

        {childStartups.map(startup => (
          <div
            key={startup.id}
            draggable
            onDragStart={(e) => onDragStart(e, startup.id, 'startup')}
            onDragOver={(e) => onDragOver(e, startup.id)}
            onDragLeave={() => setDragOverId(null)}
            onDrop={(e) => onDrop(e, startup.id, 'startup')}
            className={`flex items-center gap-2 py-1.5 px-3 ml-3 rounded-lg cursor-grab active:cursor-grabbing transition-all mb-0.5 text-[13px] 
              ${selectedItemId === startup.id ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-blue-50 text-slate-500'}
              ${dragOverId === startup.id ? 'border-t-2 border-blue-500 bg-blue-50' : ''}`}
            onClick={() => onSelectStartup(startup)}
          >
            <span className="truncate pointer-events-none">📄 {startup.company_name}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="select-none">
      <div 
        onDragOver={(e) => onDragOver(e, 'root')}
        onDragLeave={() => setDragOverId(null)}
        onDrop={(e) => onDrop(e, 'root', 'root')}
        className={`group flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer mb-1 transition-all
          ${selectedFolder === 'root' ? 'bg-slate-200' : 'hover:bg-slate-200'}
          ${dragOverId === 'root' ? 'bg-blue-100 ring-2 ring-blue-400' : ''}`}
        onClick={() => { setSelectedFolder('root'); toggleFolder('root'); }}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <span className="text-[10px] w-3">{expandedFolders.has('root') ? '▼' : '▶'}</span>
          <span className="text-[15px] uppercase font-bold tracking-tight text-slate-600">📂 Root Directory</span>
        </div>
        <button 
          onClick={(e) => handleAddFolder(e, 'root')}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center bg-white border border-slate-300 rounded-md text-slate-600 hover:bg-slate-900 hover:text-white transition-all text-[14px] font-bold"
        >+</button>
      </div>
      {expandedFolders.has('root') && <SidebarExplorerTree parentId="root" />}
    </div>
  );
}