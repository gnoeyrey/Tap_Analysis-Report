"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// --- 연도 자동 계산 로직 ---
const currentYear = new Date().getFullYear();
const targetYears = [currentYear, currentYear - 1, currentYear - 2]; 

// --- 헬퍼 컴포넌트 ---
const FixedLabel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`w-[140px] bg-[#f1f5f9] p-3 flex items-center justify-center font-bold border-b border-r border-slate-200 text-slate-600 text-[13px] text-center shrink-0 ${className}`}>
    {children}
  </div>
);

const SubLabel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`w-[100px] bg-[#f1f5f9] p-3 flex items-center justify-center font-bold border-b border-r border-slate-200 text-slate-600 text-[13px] text-center shrink-0 ${className}`}>
    {children}
  </div>
);

const Content = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`flex-1 p-3 flex items-center border-b border-r border-slate-200 bg-white text-slate-800 text-[13px] ${className}`}>
    {children}
  </div>
);

const WideContent = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`flex-[1.8] p-3 flex items-center border-b border-r border-slate-200 bg-white text-slate-800 text-[13px] truncate ${className}`}>
    {children}
  </div>
);

function SectionTitle({ title }: { title: string }) {
  return <div className="bg-gray-100 p-2 border-l-8 border-black font-black text-[14px] uppercase mb-3 mt-10 shadow-sm">{title}</div>;
}

interface Props {
  selectedItem: any; 
  onClose: () => void;
}

export default function StartupReport({ selectedItem: initialItem, onClose }: Props) {
  // 모든 데이터 참조를 'data' 하나로 통일하여 ReferenceError 방지
  const [data, setData] = useState<any>(initialItem);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!initialItem?.id) return;
      setLoading(true);
      try {
        const { data: fullData, error } = await supabase
          .from('startups')
          .select(`
            *,
            education:startup_education(*),
            careers:startup_careers(*),
            investments:startup_investments(*),
            ips:startup_ips(*),
            awards:startup_awards(*),
            financials:startup_financials(*), 
            services:startup_services(*)
          `)
          .eq('id', initialItem.id)
          .single();

        if (fullData) {
          setData(fullData);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [initialItem?.id]);

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">REPORT GENERATING...</div>;

  // --- 데이터 계산 로직 (반드시 data 변수 사용) ---
  const totalInvestAmount = data?.investments?.reduce((sum: number, row: any) => sum + (Number(row.amount) || 0), 0) || 0;
  const latestValue = [...(data?.investments || [])]
    .filter((r: any) => r.period)
    .sort((a: any, b: any) => b.period.localeCompare(a.period))[0] || { pre_share: 0, post_share: 0 };

  const awardRows = (data?.awards || []).map((a: any, i: number) => ({
    id: a.id ?? i,
    year: a.year ?? '-',
    name: a.award_name || a.name || '-',
    agency: a.agency ?? '-',
  }));

  return (
    <div className="max-w-5xl mx-auto bg-white p-12 rounded-[40px] shadow-2xl border border-slate-100 text-[13px] animate-in fade-in duration-500">
      
      {/* 닫기 버튼 */}
      <div className="flex justify-end mb-6">
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-medium border border-slate-200 px-4 py-1.5 rounded-full transition-all hover:bg-slate-50">
          [ 닫기 ]
        </button>
      </div>

      {/* □ 1. 개요 섹션 */}
      <section className="mb-10">
        <div className="flex items-center gap-2 bg-[#f8fafc] p-3 border-l-4 border-slate-800 mb-4 shadow-sm">
          <span className="text-slate-800 font-bold tracking-tight">□ 개요</span>
        </div>
        
        <div className="border-t-2 border-slate-800 border-x border-slate-200 border-b shadow-sm">
          <div className="flex w-full">
            <div className="flex-1 flex flex-col border-r border-slate-200">
              <div className="flex border-b border-slate-200">
                <FixedLabel>기업명</FixedLabel>
                <Content className="font-black text-slate-900 text-[15px] flex-[2.5]">{data.company_name}</Content>
                <SubLabel>설립일</SubLabel>
                <Content className="flex-1">{data.founding_date || '-'}</Content>
              </div>
              <div className="flex border-b border-slate-200">
                <FixedLabel>회사전화</FixedLabel>
                <Content className="flex-1">{data.company_tel || '-'}</Content>
                <SubLabel>회사이메일</SubLabel>
                <WideContent>{data.company_email || '-'}</WideContent>
              </div>
            </div>
            <div className="w-[180px] flex items-center justify-center p-3 bg-white border-b border-slate-200">
              {data.logo_url ? (
                <img src={data.logo_url} alt="Logo" className="max-w-full max-h-[80px] object-contain" />
              ) : (
                <div className="text-[10px] text-slate-300 font-bold uppercase text-center leading-tight">NO LOGO</div>
              )}
            </div>
          </div>
          <div className="flex flex-col border-b border-slate-200">
            <div className="flex">
              <FixedLabel>회사주소</FixedLabel>
              <Content className="border-r-0">{data.company_address || '-'}</Content>
            </div>
          </div>
          <div className="flex border-b border-slate-200">
            <FixedLabel>홈페이지</FixedLabel>
            <Content className="text-blue-600 underline truncate flex-1">
              {data.homepage ? <a href={data.homepage} target="_blank" rel="noreferrer">{data.homepage}</a> : '-'}
            </Content>
            <SubLabel>업종</SubLabel>
            <Content className="flex-1 border-r-0">{data.biz_type || '-'}</Content>
          </div>
          <div className="flex border-b border-slate-200">
            <FixedLabel>사업자번호</FixedLabel>
            <Content className="flex-1">{data.biz_number || '-'}</Content>
            <SubLabel>법인번호</SubLabel>
            <Content className="flex-1 border-r-0">{data.corp_number || '-'}</Content>
          </div>
          <div className="flex border-b border-slate-200">
            <FixedLabel>대표자명</FixedLabel>
            <Content className="flex-1">{data.ceo_name || '-'}</Content>
            <SubLabel>대표전화</SubLabel>
            <Content className="flex-1">{data.ceo_tel || '-'}</Content>
            <SubLabel>대표이메일</SubLabel>
            <WideContent className="border-r-0">{data.ceo_email || '-'}</WideContent>
          </div>
          <div className="flex border-b border-slate-200 bg-slate-50/30">
            <FixedLabel>담당자명</FixedLabel>
            <Content className="flex-1">{data.manager_name || '-'}</Content>
            <SubLabel>담당전화</SubLabel>
            <Content className="flex-1">{data.manager_tel || '-'}</Content>
            <SubLabel>담당이메일</SubLabel>
            <WideContent className="border-r-0">{data.manager_email || '-'}</WideContent>
          </div>
          <div className="flex border-b border-slate-200">
            <FixedLabel>제품/서비스 요약</FixedLabel>
            <Content className="border-r-0">{data.service_summary || '-'}</Content>
          </div>
          <div className="flex">
            <FixedLabel className="border-b-0">TIPS 정보</FixedLabel>
            <Content className="border-b-0 border-r-0 italic text-slate-600 font-medium">{data.tips_info || '-'}</Content>
          </div>
        </div>
      </section>

      {/* □ 2. 학력 및 경력 */}
      <SectionTitle title="□ 대표자 학력 및 경력" />
      <div className="grid grid-cols-2 gap-6 mb-10">
        <table className="w-full border-collapse border-t border-slate-400 text-center">
          <thead className="bg-slate-50 font-bold"><tr><th className="border p-2">학력</th><th className="border p-2">학교/학과</th></tr></thead>
          <tbody>{(data.education || []).map((e: any, i: number) => (
            <tr key={i}>
              <td className="border p-1 bg-slate-50/50 font-bold">{e.degree_type}</td>
              <td className="border p-1">{e.school_name} {e.department}</td>
            </tr>
          ))}</tbody>
        </table>
        <table className="w-full border-collapse border-t border-slate-400 text-center">
          <thead className="bg-slate-50 font-bold"><tr><th className="border p-2">경력</th><th className="border p-2">회사/업무</th></tr></thead>
          <tbody>{(data.careers || []).map((c: any, i: number) => (
            <tr key={i}>
              <td className="border p-1 bg-slate-50/50 font-bold">{c.period}</td>
              <td className="border p-1">{c.company_name} ({c.task})</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* □ 3. 매출 및 고용 (신규 테이블 financials 연동) */}
      <SectionTitle title="□ 매출 및 고용" />
      <table className="w-full border-collapse border-t border-slate-400 text-center mb-10">
        <thead className="bg-slate-100 font-bold border-b">
          <tr>
            <th rowSpan={2} className="border p-2 bg-slate-50">구분</th>
            {targetYears.map(year => <th key={year} colSpan={2} className="border p-2">{year}년</th>)}
          </tr>
          <tr className="bg-slate-50 text-[11px]">
            {targetYears.map(year => (
              <React.Fragment key={year}>
                <th className="border p-1">국내</th>
                <th className="border p-1">해외</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border p-2 font-bold bg-slate-50">매출액</td>
            {targetYears.map(year => {
              const fin = data.financials?.find((f: any) => String(f.year) === String(year));
              return (
                <React.Fragment key={year}>
                  <td className="border p-1 font-bold text-blue-600">{fin?.revenue_domestic?.toLocaleString() || '-'}</td>
                  <td className="border p-1 font-bold text-blue-600">{fin?.revenue_overseas?.toLocaleString() || '-'}</td>
                </React.Fragment>
              );
            })}
          </tr>
          <tr>
            <td className="border p-2 font-bold bg-slate-50">고용</td>
            {targetYears.map(year => (
              <td key={year} colSpan={2} className="border p-1 font-bold text-slate-700">
                {data.financials?.find((f: any) => String(f.year) === String(year))?.employees || '-'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* □ 4. 투자 현황 */}
      <SectionTitle title="□ 투자 현황" />
      <table className="w-full border-collapse border-t border-slate-400 text-center mb-10">
        <thead className="bg-slate-100 font-black border-b border-slate-300">
          <tr><th className="border p-2">시기</th><th className="border p-2">투자사</th><th className="border p-2">단계</th><th className="border p-2 text-blue-700">투자금</th><th className="border p-2">Pre</th><th className="border p-2">Post</th></tr>
        </thead>
        <tbody>{(data.investments || []).map((inv: any, i: number) => (
          <tr key={i}>
            <td className="border p-2">{inv.period}</td>
            <td className="border p-2 font-bold">{inv.investor}</td>
            <td className="border p-2">{inv.round}</td>
            <td className="border p-2 font-black">{inv.amount?.toLocaleString()}</td>
            <td className="border p-2">{inv.pre_share?.toLocaleString()}</td>
            <td className="border p-2 font-bold text-red-600">{inv.post_share?.toLocaleString()}</td>
          </tr>
        ))}</tbody>
        <tfoot className="bg-slate-50 font-black border-t-2 border-slate-800">
          <tr>
            <td colSpan={3} className="border p-2 bg-slate-100 text-center">투자 합계 / 최신 밸류</td>
            <td className="border p-2 text-blue-700">{totalInvestAmount.toLocaleString()}</td>
            <td className="border p-2 text-red-600">{Number(latestValue.pre_share).toLocaleString()}</td>
            <td className="border p-2 text-red-600">{Number(latestValue.post_share).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      {/* □ 5. IP 및 수상 */}
      <div className="grid grid-cols-2 gap-8 mb-10 items-start">
        <section>
          <SectionTitle title="□ 지식재산권 (건)" />
          <table className="w-full border-collapse border-t border-slate-400 text-center">
            <thead className="bg-[#f1f5f9] font-bold border-b border-slate-400">
              <tr><th className="p-2 border-r border-slate-300">국내</th><th className="p-2">해외</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-r border-slate-300 p-3 font-black text-[15px]">{data.ips?.[0]?.domestic || '0'}</td>
                <td className="p-3 font-black text-[15px]">{data.ips?.[0]?.overseas || '0'}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <section>
          <SectionTitle title="□ 참여 및 수상" />
          <table className="w-full border-collapse border-t border-slate-400 text-center text-[11px]">
            <thead className="bg-[#f1f5f9] font-bold border-b border-slate-400">
              <tr><th className="p-2 border-r border-slate-300">연도</th><th className="p-2 border-r border-slate-300">행사명</th><th className="p-2">주최</th></tr>
            </thead>
            <tbody>
              {awardRows.length > 0 ? awardRows.map((row: any) => (
                <tr key={row.id} className="border-b border-slate-200">
                  <td className="border-r border-slate-300 p-2">{row.year}</td>
                  <td className="border-r border-slate-300 p-2 text-left pl-2 truncate">{row.name}</td>
                  <td className="p-2 text-left pl-2 text-slate-600">{row.agency}</td>
                </tr>
              )) : <tr><td colSpan={3} className="p-4 text-slate-400">데이터가 없습니다.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      {/* □ 6. 제품 상세 소개 (startup_services 데이터 출력) */}
      <SectionTitle title="□ 제품 및 기술 상세 소개" />
      <div className="space-y-4 mb-10">
        {(data.services || []).length > 0 ? (data.services || []).map((svc: any, i: number) => (
          <div key={i} className="border-2 border-slate-800 p-6 bg-slate-50/30 rounded-2xl shadow-sm">
            <p className="font-black text-[16px] mb-2 text-slate-900"><span className="text-blue-600 mr-2">●</span>{svc.title}</p>
            <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{svc.content}</p>
          </div>
        )) : (
          <div className="p-10 text-center text-slate-400 border border-dashed rounded-2xl">등록된 정보가 없습니다.</div>
        )}
      </div>

      {/* □ 7. 필요 지원사항 */}
      <SectionTitle title="□ 기업 필요 지원사항" />
      <div className="border-2 border-slate-800 p-6 mb-10 rounded-2xl">
        <div className="flex flex-wrap gap-2 mb-4">
          {(data.support_needs || []).map((n: string, i: number) => (
            <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-md border border-blue-100 text-[11px]"># {n}</span>
          ))}
        </div>
        <div className="p-3 bg-slate-50 rounded-lg italic text-slate-500 text-[12px] border border-slate-100">
          기타 의견: {data.support_needs_other || "없음"}
        </div>
      </div>
    </div>
  );
}