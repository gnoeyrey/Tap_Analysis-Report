"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Tooltip, LabelList, ResponsiveContainer
} from 'recharts';
import { useReactToPrint } from 'react-to-print';

interface ResultViewProps {
  startupId: string;
  refreshTrigger?: number;
}

const QUESTION_LABELS: Record<string, string> = {
  biz_1: 'BM 고도화', biz_2: '수익성', biz_3: '매출 성장성', biz_4: '판매처 확보', biz_5: '생산 능력',
  team_1: '대표자 경력', team_2: '팀워크', team_3: '핵심 개발인력', team_4: '경영진 역량', team_5: '전문성',
  tech_1: '기술 완성도', tech_2: '대체 가능성', tech_3: '기술 경쟁력', tech_4: '모방 난이도', tech_5: '기술 확장성',
  mkt_1: '시장 성장성', mkt_2: '시장 경쟁도', mkt_3: '국내 규모', mkt_4: '글로벌 규모', mkt_5: '진입 장벽',
  fin_1: '국내 특허', fin_2: '해외 특허', fin_3: '사업 유관성', fin_4: 'IP 보호전략', fin_5: '사업화 전략'
};

const INVESTMENT_STAGES = [
  { key: 'Seed', label: 'Seed', color: '#93c5fd' },
  { key: 'Pre-A', label: 'Pre-A', color: '#60a5fa' },
  { key: 'Series A', label: 'Series A', color: '#3b82f6' },
  { key: 'Series B', label: 'Series B', color: '#2563eb' },
  { key: 'Series C', label: 'Series C', color: '#1d4ed8' },
];

export default function ResultView({ startupId, refreshTrigger }: ResultViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<any>(null);
  const [financials, setFinancials] = useState<any[]>([]);
  const [detailedScores, setDetailedScores] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  const [investComment, setInvestComment] = useState("");
  const [futurePlans, setFuturePlans] = useState([
    { title: "주제명 1", content: "" },
    { title: "주제명 2", content: "" },
    { title: "주제명 3", content: "" }
  ]);

  // [중요] 독립된 저장 버튼용 함수
  const handleDataSave = async () => {
    try {
      const { error } = await supabase.from('startup_report_details').upsert({
        startup_id: startupId,
        invest_comment: investComment,
        plan_title_1: futurePlans[0].title,
        plan_content_1: futurePlans[0].content,
        plan_title_2: futurePlans[1].title,
        plan_content_2: futurePlans[1].content,
        plan_title_3: futurePlans[2].title,
        plan_content_3: futurePlans[2].content,
        updated_at: new Date()
      });
      if (error) throw error;
      alert("데이터가 성공적으로 저장되었습니다.");
    } catch (e) { console.error(e); alert("저장 실패"); }
  };

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `${data?.company_name || '기업진단보고서'}`,
  });

  
  const handlePlanChange = (index: number, field: 'title' | 'content', value: string) => {
    const newPlans = [...futurePlans];
    newPlans[index][field] = value;
    setFuturePlans(newPlans);
  };

  const groupedInvestors = useMemo(() => {
    const map: Record<string, string[]> = {};
    investments.forEach((inv) => {
      const round = inv.round;
      if (!round) return;
      if (!map[round]) map[round] = [];
      if (inv.investor && !map[round].includes(inv.investor)) {
        map[round].push(inv.investor);
      }
    });
    return map;
  }, [investments]);

  const currentStageIndex = useMemo(() => {
    if (!investments.length) return -1;
    const lastRound = investments[investments.length - 1].round;
    return INVESTMENT_STAGES.findIndex(s => s.key === lastRound);
  }, [investments]);

  const processedFinancials = useMemo(() => {
    return financials.map(item => ({
      ...item,
      total_revenue: (item.revenue_domestic || 0) + (item.revenue_overseas || 0)
    }));
  }, [financials]);

  const totalInvestAmount = useMemo(() => {
    return investments.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
  }, [investments]);

  const latestValue = useMemo(() => {
    if (investments.length === 0) return { pre_share: 0, post_share: 0 };
    return investments[investments.length - 1];
  }, [investments]);

  useEffect(() => {
    const fetchData = async () => {
      if (!startupId || startupId === 'undefined') return;
      setLoading(true);
      try {
        const { data: startupInfo } = await supabase.from('startups').select('*').eq('id', startupId).maybeSingle();
        const { data: investData } = await supabase.from('startup_investments').select('period, investor, round, amount, pre_share, post_share').eq('startup_id', startupId).order('period', { ascending: true });
        const { data: stats } = await supabase.from('startup_financials').select('*').eq('startup_id', startupId).order('year');
        const { data: myAnalysis } = await supabase.from('startup_analysis').select('*').eq('startup_id', startupId);
        
        if (startupInfo) {
          const { data: folderAnalysis } = await supabase.from('startup_analysis').select('*').in('startup_id', (await supabase.from('startups').select('id').eq('parent_id', startupInfo.parent_id)).data?.map(s => s.id) || []);
          const avgMap: any = {};
          folderAnalysis?.forEach(item => {
            if (!avgMap[item.category]) avgMap[item.category] = { sum: 0, count: 0 };
            avgMap[item.category].sum += item.total_score;
            avgMap[item.category].count += 1;
          });
          const combinedRadar = myAnalysis?.map(item => ({
            subject: item.category,
            score: item.total_score,
            avgScore: avgMap[item.category] ? Math.round((avgMap[item.category].sum / avgMap[item.category].count) * 10) / 10 : 0,
            db_comment: item.comment // comments 필드가 아닌 comment 필드를 사용하는지 확인 필요
          })) || [];

          setData(startupInfo);
          setInvestments(investData || []);
          setFinancials(stats || []);
          setDetailedScores(myAnalysis || []);
          setRadarData(combinedRadar);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [startupId, refreshTrigger]);

  if (loading) return null;

  return (
    <div className="flex flex-col items-center py-10 bg-slate-100 min-h-screen font-sans text-slate-900">
      
      {/* 상단 컨트롤 바: 저장 버튼과 인쇄 버튼 분리 */}
      <div className="w-[794px] flex justify-between items-center bg-white/90 backdrop-blur-sm p-5 rounded-2xl shadow-xl no-print border border-slate-200 mb-8">
        <div><h2 className="text-xl font-black italic uppercase tracking-tighter text-black-600">기업진단보고서 미리보기</h2></div>
        <div className="flex gap-3">
          {/* [추가] 독립된 저장 버튼 */}
          <button onClick={handleDataSave} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md active:scale-95 flex items-center gap-2">
            <span>💾</span> 데이터 저장
          </button>
          
          <button 
            onClick={() => handlePrint()} 
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <span>🖨️</span> PDF 인쇄 / 다운로드
          </button>
        </div>
      </div>

      <div ref={contentRef} className="report-paper-container">
        
        {/* ================= 0. 보고서 표지 ================= */}
        <div className="report-cover-page">
          <div className="cover-border-design"></div>
          <div className="cover-content">
            <p className="cover-subtitle font-black text-blue-600 mb-2 tracking-[0.3em]">TAP ANGEL PARTNERS</p><br></br>
            <div className="w-20 h-1 bg-slate-800 mx-auto mb-10"></div>
            <h1 className="cover-title">기업 역량 진단 결과 보고서</h1>
            <div className="cover-info-box">
              <span className="text-slate-400 text-4xl font-light">{data?.company_name}</span><br />
            </div>
          </div>
          <div className="cover-footer">
            <div className="cover-logo-wrapper">
              <img src="/logo.png" alt="Company Logo" className="cover-footer-logo" />
            </div>
          </div>
        </div>

        {/* ================= 1. 리포트 본문 ================= */}
        <div className="report-content-page">

          
          <div id="first-section-label" className="section-label">□ 기업 기본 정보</div>
          <table className="info-table">
            <tbody>
              <tr><th>기업명</th><td>{data?.company_name || '-'}</td><th>설립일</th><td>{data?.founding_date || '-'}</td></tr>
              <tr><th>대표자명</th><td>{data?.ceo_name || '-'}</td><th>업종</th><td>{data?.biz_type || '-'}</td></tr>
              <tr><th>사업자번호</th><td>{data?.biz_number || '-'}</td><th>법인번호</th><td>{data?.corp_number || '-'}</td></tr>
              <tr><th>주소</th><td colSpan={3}>{data?.company_address || '-'}</td></tr>
              <tr><th>회사전화</th><td>{data?.company_tel || '-'}</td><th>담당자명</th><td>{data?.manager_name || '-'}</td></tr>
              <tr><th>담당자 번호</th><td>{data?.manager_tel || '-'}</td><th>담당자 이메일</th><td>{data?.manager_email || '-'}</td></tr>
            </tbody>
          </table>

          <div className="charts-row mt-4">
            <div className="chart-container">
              <div className="chart-inner-title">매출액 추이 (KRW)</div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedFinancials} margin={{ top: 35, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <Legend verticalAlign="top" align="right" iconSize={9} wrapperStyle={{ fontSize: '9px', top: 5 }} />
                    <Bar name="국내" dataKey="revenue_domestic" fill="#1e293b" radius={[2, 2, 0, 0]} barSize={10}>
                      <LabelList dataKey="revenue_domestic" position="top" style={{ fontSize: '7px', fill: '#64748b', fontWeight: 'bold' }} />
                    </Bar>
                    <Bar name="해외" dataKey="revenue_overseas" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={10}>
                      <LabelList dataKey="revenue_overseas" position="top" style={{ fontSize: '7px', fill: '#64748b', fontWeight: 'bold' }} />
                    </Bar>
                    <Bar name="합계" dataKey="total_revenue" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={10}>
                      <LabelList dataKey="total_revenue" position="top" style={{ fontSize: '7px', fill: '#1e293b', fontWeight: 900 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="chart-container">
              <div className="chart-inner-title">임직원 현황 (명)</div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financials} margin={{ top: 35, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <Bar name="직원수" dataKey="employees" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={20}>
                      <LabelList dataKey="employees" position="top" style={{ fontSize: '8px', fill: '#1e293b', fontWeight: 'bold' }} />
                    </Bar>
                    <Legend verticalAlign="top" align="right" iconSize={8} wrapperStyle={{ fontSize: '9px', top: 5 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="section-label">□ 투자 현황</div>
          <table className="invest-table">
            <thead><tr><th>시기</th><th>투자사</th><th>단계</th><th className="text-blue-700">투자금</th><th>Pre</th><th>Post</th></tr></thead>
            <tbody>
              {investments.map((inv, i) => (
                <tr key={i}>
                  <td>{inv.period}</td><td className="font-bold">{inv.investor}</td><td>{inv.round}</td>
                  <td className="font-black">{(Number(inv.amount) || 0).toLocaleString()}</td>
                  <td>{(Number(inv.pre_share) || 0).toLocaleString()}</td>
                  <td className="font-bold text-red-600">{(Number(inv.post_share) || 0).toLocaleString()}</td>
                </tr>
              ))}
              {investments.length === 0 && (<tr><td colSpan={6} className="py-4 text-slate-400 italic text-center">등록된 투자 데이터가 없습니다.</td></tr>)}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="footer-title">투자 합계 / 최신 밸류</td>
                <td className="text-blue-700 font-black">{totalInvestAmount.toLocaleString()}</td>
                <td className="text-red-600 font-black">{(Number(latestValue.pre_share) || 0).toLocaleString()}</td>
                <td className="text-red-600 font-black">{(Number(latestValue.post_share) || 0).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          <div className="investment-unified-box mt-4">
            <div className="visual-container">
              {INVESTMENT_STAGES.map((stage, idx) => {
                const isPassedOrCurrent = idx <= currentStageIndex;
                const isActive = idx === currentStageIndex;
                const stageInvestors = groupedInvestors[stage.key] || [];
                return (
                  <div key={stage.key} className={`stage-item ${isActive ? 'active' : ''} ${!isPassedOrCurrent ? 'future' : ''}`}>
                    <div className="arrow-box" style={{ backgroundColor: isPassedOrCurrent ? stage.color : '#e2e8f0' }}>
                      <span className="stage-label" style={{ color: isPassedOrCurrent ? 'white' : '#94a3b8' }}>{stage.label}</span>
                      {isActive && <div className="active-dot"></div>}
                    </div>
                    <div className="stage-investors-list">
                      {stageInvestors.map((name, i) => (
                        <div key={i} className="investor-name-visual">· {name}</div>
                      ))}
                      {stageInvestors.length === 0 && <div className="no-data">-</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>

            <div className="section-label">□ 투자 로드맵</div>
            <div className="invest-opinion-box mt-2">
              <textarea 
                className="invest-opinion-textarea"
                value={investComment}
                onChange={(e) => setInvestComment(e.target.value)}
                placeholder="해당 기업의 투자 현황 및 라운드에 대한 종합 의견을 입력하세요"
                rows={1}
              />
            </div>
        

          <div className="section-label">□ 역량 진단 통합 분석</div>
          <div className="radar-layout">
            <div className="radar-visual">
              <RadarChart cx={140} cy={130} outerRadius={85} width={280} height={260} data={radarData}>
                <PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                <PolarRadiusAxis domain={[0, 50]} tick={false} axisLine={false} />
                <Radar name="내 점수" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={3} />
                <Radar name="평균" dataKey="avgScore" stroke="#e15633" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
                <Legend verticalAlign="top" align="right" wrapperStyle={{fontSize: '9px', fontWeight: 700}} />
              </RadarChart>
            </div>
            <div className="radar-table-wrapper">
              <table className="radar-score-table">
                <thead>
                  <tr><th style={{ width: '17%' }}>항목</th><th style={{ width: '14%' }}>점수</th><th style={{ width: '69%' }}>세부 의견</th></tr>
                </thead>
                <tbody>
                  {radarData.map((r, i) => (
                    <tr key={i}>
                      <td className="font-bold">{r.subject}</td>
                      <td className="text-blue-600 font-black"><span className="text-sm">{r.score}</span><span className="text-slate-400 font-normal ml-1">/ 50</span></td>
                      <td className="text-left text-slate-500 text-[9px] leading-snug whitespace-pre-wrap px-2">{r.db_comment || '의견 없음'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================= 2단 레이아웃 (세부 진단 6:4 향후 전략) ================= */}
          <div className="dual-layout-grid">
            <div className="left-section">
              <div className="section-label-minimal">□ 항목별 세부 진단 결과</div>
              <div className="analysis-grid">
                {detailedScores.slice(0, 6).map((cat, idx) => (
                  <div key={idx} className="analysis-card">
                    <div className="analysis-card-header">
                      <span>{cat.category}</span>
                      <span className="header-score">{cat.total_score} / 50</span>
                    </div>
                    <div className="analysis-card-body">
                      {Object.entries(cat.scores || {}).map(([k, v]: any) => (
                        <div key={k} className="score-row">
                          <div className="score-info"><span>{QUESTION_LABELS[k] || k}</span><b>{v}</b></div>
                          <div className="score-bar-bg"><div className="score-bar-fill" style={{ width: `${(Number(v)/10)*100}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="right-section">
              <div className="section-label-minimal">□ 향후 전략</div>
              <div className="future-input-container">
                {futurePlans.map((plan, idx) => (
                  <div key={idx} className="future-input-group">
                    <input className="future-title-input" value={plan.title} onChange={(e) => handlePlanChange(idx, 'title', e.target.value)} />
                    <textarea className="future-content-textarea" value={plan.content} onChange={(e) => handlePlanChange(idx, 'content', e.target.value)} placeholder="향후 전략 및 방향을 입력하세요..." />
                  </div>
                ))}
              </div>
            </div>
          </div>


        </div>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .report-paper-container {
          width: 794px; background: white; box-shadow: 0 0 40px rgba(0,0,0,0.1);
          display: flex; flex-direction: column; border: 1px solid #e2e8f0;
        }

        /* 표지 스타일 */
        .report-cover-page {
          width: 100%; height: 1123px; position: relative; background: white;
          display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 100px;
          break-after: page;
        }
        .cover-border-design { position: absolute; top: 20px; left: 20px; right: 20px; bottom: 20px; border: 1px solid #f1f5f9; border-left: 12px solid #2563eb; }
        .cover-content { position: relative; z-index: 1; text-align: center; width: 100%; }
        .cover-title { font-size: 42px; font-weight: 900; line-height: 1.3; color: #1e293b; margin-bottom: 60px; }
        .cover-info-box { width: 400px; border-top: 3px solid #1e293b; padding-top: 40px; margin: 80px auto 0; text-align: center; }
        .cover-footer { 
          position: absolute; 
          bottom: 80px; 
          width: 100%; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center;
        }
        .cover-logo-wrapper { margin-bottom: 15px; }
        .cover-footer-logo { 
          height: 150px; /* 높이는 적절히 조정 가능 */
          width: 400px; 
          object-fit: contain; 
        }

        /* 본문 섹션 */
        .report-content-page { width: 100%; padding: 0 50px 40px 50px; min-height: 1123px; }
        #first-section-label { margin-top: 20px !important; }

        .section-label { 
          font-size: 15px; font-weight: 900; color: #1e293b; 
          border-bottom: 1.5px solid #1e293b; padding-bottom: 4px; 
          margin-top: 40px; margin-bottom: 15px; break-after: avoid; 
        }

        .info-table, .invest-table, .radar-score-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .info-table th { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; width: 90px; text-align: center; color: #475569; font-size: 12px; }
        .info-table td { border: 1px solid #e2e8f0; padding: 6px; color: #1e293b; font-size: 11px; word-break: break-all; }

        .invest-table { font-size: 9.5px; text-align: center; border-top: 1.5px solid #334155; }
        .invest-table th { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 7px; font-weight: 900; }
        .invest-table td { border: 1px solid #e2e8f0; padding: 7px; }
        .invest-table tfoot { border-top: 2px solid #1e293b; background: #f8fafc; font-weight: 900; }

        .charts-row { display: flex; gap: 15px; width: 100%; margin-top: 5px; }
        .chart-container { flex: 1; border: 1px solid #f1f5f9; padding: 10px; border-radius: 10px; background: #fcfdfe; break-inside: avoid; }
        .chart-wrapper { width: 100%; height: 210px; }
        .chart-inner-title { text-align: center; font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 5px; }

        /* 투자 시각화 */
        .investment-unified-box {
          background: #f8fafc; /* 연한 배경색으로 전체를 묶어줌 */
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 15px;
        }

        .visual-container { display: flex; gap: 4px; align-items: flex-start; margin : 0px; }
        .stage-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
        .arrow-box { 
          width: 100%; height: 35px; display: flex; justify-content: center; align-items: center; position: relative;
          clip-path: polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%, 10% 50%); 
          margin-bottom: 8px;
        }
        .stage-item:first-child .arrow-box { clip-path: polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%); }
        .stage-label { font-weight: 900; font-size: 9px; letter-spacing: -0.5px; }
        .stage-investors-list { width: 100%; font-size: 8.5px; padding: 0 5px; color: #475569; min-height: 40px; }
        .investor-name-visual { font-weight: 700; color: #1e293b; line-height: 1.3; }

        /* 내부 의견 박스 스타일 */
        .opinion-box-inner {
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          margin-top: 5px;
        }
        .invest-opinion-textarea-simple {
          width: 100%; border: none; background: transparent; resize: none; outline: none;
          font-size: 11px; color: #334155; line-height: 1.6; font-style: italic;
        }

        @keyframes pulse { 0% {opacity: 1} 50% {opacity: 0.4} 100% {opacity: 1} }

        .radar-layout { display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid #f1f5f9; border-radius: 15px; break-inside: avoid; }
        .radar-visual { width: 280px; height: 260px; }
        .radar-score-table { font-size: 10px; text-align: center; }
        .radar-score-table th { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 8px; font-weight: 800; }
        .radar-score-table td { border-bottom: 1px solid #f1f5f9; padding: 7px; vertical-align: top; }

        /* 2단 그리드 (6:4 비율) */
        .dual-layout-grid { display: grid; grid-template-columns: 6fr 4fr; gap: 20px; flex-grow: 1; align-items: stretch; margin-top: 30px; }
        .section-label-minimal { font-size: 14px; font-weight: 900; color: #1e293b; border-bottom: 2px solid #1e293b; padding-bottom: 6px; margin-bottom: 10px; }

        .analysis-grid { display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(3, 1fr); gap: 10px; }
        .analysis-card { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff; display: flex; flex-direction: column; }
        .analysis-card-body { padding: 8px 8px; flex-grow: 1; display: flex; flex-direction: column; justify-content: center; }
        
        .analysis-card-header { 
            background: #2563eb; 
            color: white; 
            font-size: 10px; 
            font-weight: 900; 
            padding: 6px 10px; 
            display: flex; 
            justify-content: space-between; /* 카테고리는 왼쪽, 점수는 오른쪽 끝으로 밀어냄 */
            align-items: center;
          }

          .header-score { 
            font-size: 10px;   
            color: #d1d1d1;    
            font-weight: 900; 
            margin-left: auto;  
          }

        .score-row { margin-bottom: 4px; }
        .score-info { display: flex; justify-content: space-between; font-size: 8.5px; font-weight: 700; color: #475569; margin-bottom: 2px; }
        .score-bar-bg { width: 100%; height: 4px; background: #f1f5f9; border-radius: 2px; }
        .score-bar-fill { height: 100%; background: #3b82f6; }
        .analysis-card-footer { font-size: 9px; font-weight: 900; text-align: right; color: #1e293b; margin-top: 6px; border-top: 1px solid #f1f5f9; padding-top: 4px; }

        .future-input-container { display: flex; flex-direction: column; gap: 10px; }
        .future-input-group { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; height: 150px; display: flex; flex-direction: column; }
        .future-title-input { font-size: 13px; font-weight: 900; color: #2563eb; border: none; border-bottom: 1px solid #f1f5f9; background: #f8fafc; padding: 10px; }
        .future-content-textarea { width: 100%; flex-grow: 1; border: none; background: transparent; resize: none; outline: none; font-size: 9px; color: #334155; padding: 10px 12px; }

        .invest-opinion-textarea { 
          width: 100%; 
          height: 60px; 
          display: flex; 
          flex-grow: 1; 
          border: 1px solid #66768b; /* 영역 구분을 위한 얇은 테두리 */
          background: #f1f5f9; /* 연한 회색 배경 */
          border-radius: 3px; 
          resize: none; 
          outline: none; 
          font-size: 11px; 
          padding: 8px; 
          margin: 0 !important; 
        }


        @media print {
          @page { size: A4; margin: 10mm !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .report-paper-container { box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; }
          .report-cover-page { height: 100vh !important; margin: 0 !important; padding: 0 !important; display: flex !important; justify-content: center !important; break-after: page !important; }
          .report-content-page { padding: 0 !important; }
          .section-label { margin-top: 10px !important; }
          .invest-opinion-textarea {
              background: #ffffff !important;
              border: 1px solid #cbd5e1 !important;
            }
          #first-section-label { margin-top: 0 !important; }
          .future-input-group { border: 1.5px solid #cbd5e1 !important; }
          tr, .analysis-card, .future-input-group, .radar-layout, .chart-container, .section-label, .investment-visual-section, .dual-layout-grid { 
            break-inside: avoid !important; page-break-inside: avoid !important; 
          }
        }
      `}</style>
    </div>
  );
}