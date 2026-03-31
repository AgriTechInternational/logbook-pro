import { useState, useEffect, useContext } from 'react';
import { Plus, Target, Check, Trash2, TrendingUp, ChevronDown, Calendar, Edit2 } from 'lucide-react';

import { UserContext } from '../App';
import { supabase, tables } from '../lib/supabase';
import AttachmentManager from '../components/AttachmentManager';

interface Milestone { id: string; title: string; progress: number; deadline: string; created_at: string; attachments?: any[]; }

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProgress, setNewProgress] = useState(0);
  const [newDeadline, setNewDeadline] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<any>(null);

  const { role } = useContext(UserContext);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    const fetchMilestones = async () => {
      const { data } = await supabase.from(tables.MILESTONES).select('*').order('created_at', { ascending: false });
      if (data) setMilestones(data as Milestone[]);
    };
    fetchMilestones();

    const channel = supabase.channel('milestones-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: tables.MILESTONES }, () => {
        fetchMilestones();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const curDate = newDeadline || new Date().toISOString().split('T')[0];
    
    setIsAdding(false);
    const milestoneData = { title: newTitle, progress: newProgress, deadline: curDate, created_at: new Date().toISOString() };
    setNewTitle(''); setNewDeadline(''); setNewProgress(0);

    try {
      const { error } = await supabase.from(tables.MILESTONES).insert(milestoneData);
      if (error) throw error;
    } catch (err: any) {
      console.error("Failed to add milestone:", err);
      alert("⚠️ Database Sync Error: " + (err.message || "Unknown error"));
      setIsAdding(true);
    }
  };

  const commitUpdate = async (id: string) => {
    if (!editDraft) return;
    const { error } = await supabase.from(tables.MILESTONES).update({
      title: editDraft.title,
      deadline: editDraft.deadline,
      progress: editDraft.progress
    }).eq('id', id);
    
    if (error) alert("Failed to update milestone: " + error.message);
    else {
      setEditingId(null);
      setEditDraft(null);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedIds(newExpanded);
  };

  const deleteMilestone = async (id: string) => {
    if(confirm("Permanently destruct tracking metric?")) {
        await supabase.from(tables.MILESTONES).delete().eq('id', id);
    }
  };

  const updateMilestoneImmediate = async (id: string, updates: any) => {
    const { error } = await supabase.from(tables.MILESTONES).update(updates).eq('id', id);
    if (error) alert("Failed to update: " + error.message);
  };

  return (
    <div className="pb-12 animate-in text-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center drop-shadow-sm">
          <Target className="mr-3 text-violet-400" size={28} /> Strategic Milestones
        </h2>
        <button onClick={() => setIsAdding(!isAdding)} className="p-3 bg-violet-600 hover:bg-violet-500 text-white rounded-[14px] transition-all shadow-lg active:scale-95 border border-violet-400/30">
          <Plus size={20} />
        </button>
      </div>

      {isAdding && (
         <form onSubmit={handleAdd} className="financial-card p-6 mb-8 border-violet-500/30 animate-in slide-in-from-top-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tracking Vector</label>
              <input className="financial-input w-full" placeholder="E.g. Core Deployment Phase 1..." value={newTitle} onChange={e=>setNewTitle(e.target.value)} required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Protocol Deadline</label>
                <input type="date" className="financial-input w-full [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" value={newDeadline} onChange={e=>setNewDeadline(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Current Sync: {newProgress}%</label>
                <div className="financial-input flex items-center bg-slate-900 shadow-inner h-[42px]">
                  <input type="range" min="0" max="100" className="w-full accent-violet-500" value={newProgress} onChange={e=>setNewProgress(parseInt(e.target.value))} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex space-x-3 mt-8">
            <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-[12px] transition-all shadow-md active:scale-[0.98]">Establish Vector</button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3.5 bg-slate-800 text-slate-300 font-bold rounded-[12px] hover:bg-slate-700 transition-colors">Abort Sync</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {milestones.length === 0 && !isAdding && <div className="financial-card p-12 text-center text-slate-500 font-medium italic">No tracking vectors established.</div>}
        {milestones.map((m) => {
          const isExpanded = expandedIds.has(m.id);
          const isEditing = editingId === m.id;
          const isComplete = m.progress === 100;

          return (
            <div key={m.id} className={`financial-card group transition-all duration-300 ${isExpanded ? 'border-violet-500/40 shadow-violet-900/10' : 'hover:border-slate-700/80'}`}>
              <div 
                onClick={() => !isEditing && toggleExpand(m.id)}
                className={`p-4 flex justify-between items-center cursor-pointer ${isExpanded ? 'border-b border-slate-800/60' : ''}`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg border transition-colors ${isExpanded ? 'bg-violet-600/20 border-violet-500/30 text-violet-400' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>
                    <TrendingUp size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                       <input className="financial-input py-1 text-sm font-bold w-full bg-slate-900/50" value={editDraft?.title} onChange={e => setEditDraft({...editDraft, title: e.target.value})} onClick={e => e.stopPropagation()} autoFocus />
                    ) : (
                       <h3 className={`text-[15px] font-bold tracking-tight leading-none mb-2 ${isComplete ? 'text-emerald-400' : 'text-white'}`}>{m.title}</h3>
                    )}
                    <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden shadow-inner mt-1">
                      <div className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${(isEditing ? editDraft?.progress : m.progress)}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                   {!isEditing && (
                     <span className={`text-[10px] font-black uppercase tracking-widest hidden sm:block ${isComplete ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {m.progress}% Trace
                     </span>
                   )}
                   <div className="flex items-center space-x-2">
                     {!isEditing && (
                       <button onClick={(e) => { e.stopPropagation(); setEditingId(m.id); setEditDraft({...m}); setExpandedIds(prev => new Set(prev).add(m.id)); }} className="p-2 text-slate-500 hover:text-violet-400 transition-all">
                         <Edit2 size={16} />
                       </button>
                     )}
                     {isSuperAdmin && !isEditing && (
                       <button onClick={(e) => { e.stopPropagation(); deleteMilestone(m.id); }} className="p-2 text-slate-700 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                     )}
                     <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown size={18} className="text-slate-700" />
                     </div>
                   </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-5 lg:p-6 animate-in slide-in-from-top-2">
                  <div className="space-y-6">
                    {isEditing ? (
                       <div className="space-y-6">
                          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/60 shadow-inner">
                            <div className="flex justify-between items-center mb-3">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Sync Controls</span>
                               <span className="text-xs font-black text-white">{editDraft?.progress}% Vector Finalized</span>
                            </div>
                            <input type="range" min="0" max="100" className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-slate-800 border border-slate-700/50 outline-none accent-violet-500 shadow-inner" value={editDraft?.progress} onChange={e => setEditDraft({...editDraft, progress: parseInt(e.target.value)})} />
                          </div>
                          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/60 shadow-inner">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Objective Deadline</label>
                             <input type="date" className="financial-input w-full text-sm [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" value={editDraft?.deadline} onChange={e => setEditDraft({...editDraft, deadline: e.target.value})} />
                          </div>
                          <div className="flex justify-end pt-2 space-x-3">
                             <button onClick={() => {setEditingId(null); setEditDraft(null);}} className="text-[10px] font-black px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors uppercase">Abort</button>
                             <button onClick={() => commitUpdate(m.id)} className="flex items-center space-x-2 bg-violet-600 text-white text-[10px] font-black px-4 py-2 rounded-lg hover:bg-violet-500 shadow-lg"><Check size={12}/> <span>COMMIT VECTOR UPDATES</span></button>
                          </div>
                       </div>
                    ) : (
                      <>
                        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/60 shadow-inner backdrop-blur-md">
                          <div className="flex justify-between items-center mb-3">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Sync Controls</span>
                             <span className={`text-xs font-black drop-shadow-sm ${isComplete ? 'text-emerald-400' : 'text-white'}`}>{m.progress}% Vector Finalized</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" max="100" 
                            className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-slate-800 border border-slate-700/50 outline-none transition-all shadow-inner relative z-10 accent-violet-500" 
                            value={m.progress} 
                            onChange={e => updateMilestoneImmediate(m.id, { progress: parseInt(e.target.value) })}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 shadow-inner flex items-center justify-between">
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center"><Calendar size={12} className="mr-2"/> Objective Deadline</span>
                             <span className="text-xs font-bold text-white">{m.deadline}</span>
                          </div>
                          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 shadow-inner flex items-center justify-between">
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center"><Check size={12} className="mr-2"/> Status Vector</span>
                             <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${isComplete ? 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                               {isComplete ? 'FINALIZED' : 'IN TRANSIT'}
                             </span>
                          </div>
                        </div>
                      </>
                    )}

                    <AttachmentManager collectionName="milestones" docId={m.id} attachments={m.attachments} isSuperAdmin={isSuperAdmin} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


