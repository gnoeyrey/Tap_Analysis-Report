"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface StartupMetricsProps {
  startupId: string;
}

export default function StartupMetrics({ startupId }: StartupMetricsProps) {
  const [metrics, setMetrics] = useState<any>({ sales: [], investments: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActualData = async () => {
      if (!startupId || startupId === 'undefined') return;

      setLoading(true);
      try {
        // 1. 매출 및 고용 데이터 조회
        const { data: salesData } = await supabase
          .from('startup_sales')
          .select('year, dom_sales, emp_count')
          .eq('startup_id', startupId)
          .order('year', { ascending: true });

        // 2. 투자 데이터 조회
        const { data: investData } = await supabase
          .from('startup_investments')
          .select('period, amount, round')
          .eq('startup_id', startupId)
          .order('period', { ascending: true });

        setMetrics({
          sales: salesData || [],
          investments: investData || []
        });
      } catch (err) {
        console.error("데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActualData();
  }, [startupId]);

  if (loading) return <div className="p-10 text-center">지표 로딩 중...</div>;
  if (!metrics.sales.length && !metrics.investments.length) {
    return <div className="p-10 text-center text-slate-400">등록된 경영 데이터가 없습니다.</div>;
  }

  return (
    <div className="space-y-10 p-6 bg-white border border-slate-200 shadow-sm rounded-md">
      <h2 className="text-xl font-bold text-slate-800 border-b pb-4">기업 경영 지표 분석</h2>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* 매출 성장 추이 (Bar Chart) */}
        <div className="h-[400px] p-4 border border-slate-100 rounded-lg">
          <h3 className="text-sm font-semibold mb-6 text-slate-500">연도별 매출 추이 (단위: 백만원)</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={metrics.sales}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="dom_sales" name="국내매출" fill="#009a9a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 고용 인원 변동 (Line Chart) */}
        <div className="h-[400px] p-4 border border-slate-100 rounded-lg">
          <h3 className="text-sm font-semibold mb-6 text-slate-500">고용 인원 변동 현황</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={metrics.sales}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="emp_count" name="임직원 수" stroke="#4f46e5" strokeWidth={3} dot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}