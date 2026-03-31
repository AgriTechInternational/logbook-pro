import { useState, useEffect } from 'react';
import { BookOpen, ListTodo, ShieldAlert, Users, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, tables } from '../lib/supabase';

export default function OverviewPage() {
  const [counts, setCounts] = useState({ logs: 0, actions: 0, anomalies: 0, meetings: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      const [logs, actions, anomalies, meetings] = await Promise.all([
        supabase.from(tables.LOGS).select('*', { count: 'exact', head: true }),
        supabase.from(tables.ACTIONS).select('*', { count: 'exact', head: true }).eq('status', 'IN_PROGRESS'),
        supabase.from(tables.ANOMALIES).select('*', { count: 'exact', head: true }),
        supabase.from(tables.MEETINGS).select('*', { count: 'exact', head: true })
      ]);

      setCounts({
        logs: logs.count || 0,
        actions: actions.count || 0,
        anomalies: anomalies.count || 0,
        meetings: meetings.count || 0
      });
    };

    fetchCounts();

    const channel = supabase.channel('overview-counts')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchCounts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const navigate = useNavigate();

  const cards = [
    { title: 'Intelligence Logs', route: '/logs', value: counts.logs, icon: <BookOpen className="text-blue-400" size={24} />, glow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]', border: 'border-blue-500/30', bg: 'bg-blue-900/20' },
    { title: 'Open Directives', route: '/actions', value: counts.actions, icon: <ListTodo className="text-emerald-400" size={24} />, glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]', border: 'border-emerald-500/30', bg: 'bg-emerald-900/20' },
    { title: 'Active Threat Vectors', route: '/anomalies', value: counts.anomalies, icon: <ShieldAlert className="text-rose-400" size={24} />, glow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]', border: 'border-rose-500/30', bg: 'bg-rose-900/20' },
    { title: 'Upcoming Alignments', route: '/meetings', value: counts.meetings, icon: <Users className="text-violet-400" size={24} />, glow: 'group-hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]', border: 'border-violet-500/30', bg: 'bg-violet-900/20' }
  ];

  return (
    <div className="pb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-sm">Enterprise Overview</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {cards.map((card, i) => (
          <div key={i} onClick={() => navigate(card.route)} className={`financial-card p-5 group cursor-pointer transition-all hover:-translate-y-1 ${card.glow}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-[12px] shadow-sm border ${card.border} ${card.bg}`}>{card.icon}</div>
              <TrendingUp size={20} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
            <p className="text-4xl font-extrabold text-white mt-2 tracking-tighter drop-shadow-sm tabular-nums">{card.value}</p>
            <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest leading-tight">{card.title}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 financial-card p-8 border-l-4 border-l-emerald-500 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-400/20 transition-all duration-700 pointer-events-none -mr-10 -mt-10"></div>
        <h3 className="text-lg font-bold text-white mb-2 relative z-10 drop-shadow-sm">System Architecture Online</h3>
        <p className="text-[15px] text-slate-400 font-medium relative z-10 leading-relaxed max-w-lg">The live-sync operations command center is running perfectly via Supabase. All connected nodes are verified and encrypted.</p>
        <div className="mt-6 flex items-center space-x-3 relative z-10 bg-slate-900/60 w-max px-4 py-2.5 rounded-[12px] shadow-sm border border-slate-700/50 backdrop-blur-sm">
          <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
          </span>
          <span className="font-extrabold text-emerald-400 tracking-widest text-[11px] uppercase drop-shadow-sm">Telemetry 100% Operational</span>
        </div>
      </div>
    </div>
  );
}
