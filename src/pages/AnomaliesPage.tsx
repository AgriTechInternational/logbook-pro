import { useState, useEffect, useContext } from 'react';
import { Plus, AlertTriangle, ShieldAlert, Trash2, ChevronDown, Check, Edit2 } from 'lucide-react';



import { UserContext } from '../App';
import { supabase, tables } from '../lib/supabase';
import AttachmentManager from '../components/AttachmentManager';
import RichEditor from '../components/RichEditor';
import LinkedActions from '../components/LinkedActions';


export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState('MEDIUM');
  const [newDescription, setNewDescription] = useState('');
  
  // Proactive Action states
  const [initialActionTitle, setInitialActionTitle] = useState('');
  const [initialActionee, setInitialActionee] = useState('');

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<any>(null);
  
  const { role, user } = useContext(UserContext);

  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    const fetchAnomalies = async () => {
      const { data } = await supabase.from(tables.ANOMALIES).select('*').order('created_at', { ascending: false });
      if (data) setAnomalies(data);
    };
    fetchAnomalies();

    const channel = supabase.channel('anomalies-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: tables.ANOMALIES }, () => {
        fetchAnomalies();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Optimistic UI
    setIsAdding(false);
    const title = newTitle;
    const desc = newDescription;
    const sev = newSeverity;
    const actTitle = initialActionTitle;
    const actee = initialActionee;

    setNewTitle(''); setNewDescription(''); setNewSeverity('MEDIUM');
    setInitialActionTitle(''); setInitialActionee('');

    const { data: newAnomaly, error } = await supabase.from(tables.ANOMALIES).insert({
      title,
      description: desc,
      severity: sev,
      status: 'OPEN',
      reported_by: user?.email || 'Unknown'
    }).select().single();

    if (error) {
      alert("Failed to save anomaly: " + error.message);
      return;
    }

    // Proactive Action Creation
    if (actTitle.trim() && newAnomaly) {
      await supabase.from(tables.ACTIONS).insert({
        title: actTitle,
        assigned_to: actee || 'All Engineers',
        status: 'OPEN',
        priority: sev,
        created_by: user?.email || 'Unknown',
        anomaly_id: newAnomaly.id
      });
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedIds(newExpanded);
  };

  const updateStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'OPEN' ? 'INVESTIGATING' : currentStatus === 'INVESTIGATING' ? 'RESOLVED' : 'OPEN';
    await supabase.from(tables.ANOMALIES).update({ status: nextStatus }).eq('id', id);
  };

  const updateAnomaly = async (id: string, updates: any) => {
    const { error } = await supabase.from(tables.ANOMALIES).update(updates).eq('id', id);
    if (error) alert("Failed to update: " + error.message);
    else setEditingId(null);
  };

  const deleteAnomaly = async (id: string) => {
    if (!confirm("Permanently wipe this anomaly record?")) return;
    await supabase.from(tables.ANOMALIES).delete().eq('id', id);
  };

  const getSeverityColor = (severity: string) => {
    const s = severity?.toUpperCase();
    if (s === 'HIGH' || s === 'CRITICAL') return { bg: 'bg-rose-900/30', border: 'border-rose-500/30', text: 'text-rose-400', glow: 'shadow-rose-900/20' };
    if (s === 'MEDIUM' || s === 'NORMAL') return { bg: 'bg-amber-900/30', border: 'border-amber-500/30', text: 'text-amber-400', glow: 'shadow-amber-900/20' };
    if (s === 'LOW') return { bg: 'bg-sky-900/30', border: 'border-sky-500/30', text: 'text-sky-400', glow: 'shadow-sky-900/20' };
    return { bg: 'bg-slate-900/30', border: 'border-slate-800', text: 'text-slate-400', glow: '' };
  };


  return (
    <div className="pb-12 animate-in text-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center drop-shadow-sm">
          <AlertTriangle className="mr-3 text-rose-400" size={28} /> Thread Vectors
        </h2>
        <button onClick={() => setIsAdding(!isAdding)} className="p-3 bg-rose-600 hover:bg-rose-500 text-white rounded-[14px] transition-all shadow-lg active:scale-95 border border-rose-400/30">
          <Plus size={20} />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="financial-card p-6 mb-8 border-rose-500/30 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Anomaly Signature</label>
              <input required className="financial-input w-full" placeholder="Sensor array malfunction..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Severity Vector</label>
              <select className="financial-input w-full" value={newSeverity} onChange={e => setNewSeverity(e.target.value)}>
                <option value="HIGH">HIGH THREAT (CRITICAL)</option>
                <option value="MEDIUM">MEDIUM ANOMALY</option>
                <option value="LOW">LOW CLEARANCE</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Intelligence Report</label>
              <RichEditor value={newDescription} onChange={setNewDescription} placeholder="Detailed observations..." minRows={2} />
            </div>

            {/* Proactive Action Row */}
            <div className="md:col-span-2 pt-4 mt-2 border-t border-slate-800/60">
               <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center">
                 <Plus size={10} className="mr-2"/> Initiate Proactive Tactical Objective
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Objective Title</label>
                    <input className="financial-input w-full py-2 text-xs" placeholder="Immediate containment audit..." value={initialActionTitle} onChange={e => setInitialActionTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Primary Actionee</label>
                    <input className="financial-input w-full py-2 text-xs" placeholder="Engineer A..." value={initialActionee} onChange={e => setInitialActionee(e.target.value)} />
                  </div>
               </div>
            </div>
          </div>
          <div className="flex space-x-3 mt-8">
            <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-[12px] transition-all shadow-md active:scale-[0.98]">Broadcast Alert & Link Action</button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3.5 bg-slate-800 text-slate-300 font-bold rounded-[12px] hover:bg-slate-700 transition-colors">Abort</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {anomalies.length === 0 && <div className="financial-card p-12 text-center text-slate-500 font-medium">No detected anomalies in secure zone.</div>}
        {anomalies.map((a) => {
          const isExpanded = expandedIds.has(a.id);
          const isEditing = editingId === a.id;
          const colors = getSeverityColor(a.severity);

          return (
            <div key={a.id} className={`financial-card group transition-all duration-300 ${isExpanded ? `${colors.border} ${colors.glow}` : 'hover:border-slate-700/80'}`}>
              <div 
                onClick={() => !isEditing && toggleExpand(a.id)}
                className={`p-4 flex justify-between items-center cursor-pointer ${isExpanded ? 'border-b border-slate-800/60' : ''}`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2.5 rounded-xl border shadow-sm transition-colors ${a.status === 'RESOLVED' ? 'bg-emerald-900/30 border-emerald-500/20 text-emerald-400' : `${colors.bg} ${colors.border} ${colors.text}`}`}>
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    {isEditing ? (
                       <input 
                         className="financial-input py-1 text-sm font-bold w-full bg-slate-900/50" 
                         value={editDraft?.title} 
                         onChange={e => setEditDraft({...editDraft, title: e.target.value})} 
                         onClick={e => e.stopPropagation()}
                         autoFocus 
                       />
                    ) : (
                       <h3 className={`text-[15px] font-bold tracking-tight drop-shadow-sm leading-none mb-1 ${a.status === 'RESOLVED' ? 'text-slate-500' : 'text-white'}`}>{a.title}</h3>
                    )}
                    <div className="flex items-center space-x-3 mt-0.5">
                       <span className={`text-[9px] font-black uppercase tracking-widest ${colors.text}`}>{a.severity} CLEARANCE</span>
                       <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest truncate max-w-[120px]">{a.reported_by}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                   {!isEditing && (
                     <button onClick={(e) => { e.stopPropagation(); setEditingId(a.id); setEditDraft({...a}); setExpandedIds(prev => new Set(prev).add(a.id)); }} className="p-2 text-slate-600 hover:text-blue-400 transition-all">
                       <Edit2 size={16} />
                     </button>
                   )}
                   <button onClick={(e) => { e.stopPropagation(); updateStatus(a.id, a.status); }} className={`flex items-center px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${a.status === 'RESOLVED' ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-rose-500/50 hover:text-rose-300'}`}>
                      {a.status.replace('_', ' ')}
                   </button>
                   {isSuperAdmin && !isEditing && (
                     <button onClick={(e) => { e.stopPropagation(); deleteAnomaly(a.id); }} className="p-2 text-slate-700 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                   )}

                   <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown size={18} className="text-slate-700" />
                   </div>
                </div>
              </div>
              
              {isExpanded && (
                <div className="p-5 lg:p-6 animate-in slide-in-from-top-2">
                  <div className="space-y-4">
                    {isEditing ? (
                      <div className="space-y-4 pb-20">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Severity</label>
                               <select className="financial-input w-full py-1.5 text-xs font-bold" value={editDraft?.severity} onChange={e => setEditDraft({...editDraft, severity: e.target.value})}>
                                  <option value="HIGH">HIGH THREAT (CRITICAL)</option>
                                  <option value="MEDIUM">MEDIUM ANOMALY</option>
                                  <option value="LOW">LOW CLEARANCE</option>
                               </select>
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Status</label>
                               <select className="financial-input w-full py-1.5 text-xs font-bold" value={editDraft?.status} onChange={e => setEditDraft({...editDraft, status: e.target.value})}>
                                  <option value="OPEN">OPEN / PENDING</option>
                                  <option value="INVESTIGATING">UNDER INVESTIGATION</option>
                                  <option value="RESOLVED">RESOLVED / ARCHIVE</option>
                                </select>
                            </div>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Report Details</label>
                            <RichEditor value={editDraft?.description || ""} onChange={(v: string) => setEditDraft({...editDraft, description: v})} onEscape={() => { setEditingId(null); setEditDraft(null); }} minRows={4} />
                         </div>
                         <div className="flex justify-between items-center pt-6 space-x-3 border-t border-slate-800/60 mt-4">
                            <button onClick={() => {setEditingId(null); setEditDraft(null);}} className="text-[10px] font-black px-6 py-3 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors uppercase">Abort</button>
                            <button onClick={() => updateAnomaly(a.id, editDraft)} className="flex-1 flex items-center justify-center space-x-2 bg-rose-600 text-white text-[11px] font-black px-6 py-3 rounded-xl hover:bg-rose-500 shadow-xl border border-rose-400/20 active:scale-95 transition-all"><Check size={14}/> <span>COMMIT ANOMALY UPDATES</span></button>
                         </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 shadow-inner">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center">Intelligence Summary</p>
                         <div className="text-sm text-slate-300 leading-relaxed font-medium rich-content" dangerouslySetInnerHTML={{ __html: a.description }} />
                      </div>
                    )}

                    <div className="mt-4">
                      <AttachmentManager collectionName="anomalies" docId={a.id} attachments={a.attachments} isSuperAdmin={isSuperAdmin} />
                    </div>
                    {!isEditing && <LinkedActions parentId={a.id} parentType="anomaly" userEmail={user?.email} />}
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
