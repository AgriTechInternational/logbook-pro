import { useState, useEffect, useContext } from 'react';
import { Plus, BookOpen, FileText, Trash2, ChevronDown, Calendar, Edit2, Check } from 'lucide-react';

import { UserContext } from '../App';
import { supabase, tables } from '../lib/supabase';
import AttachmentManager from '../components/AttachmentManager';

interface Log { id: string; content: string; created_at: string; date?: string; title?: string; }

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [newLog, setNewLog] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<any>(null);

  const { role } = useContext(UserContext);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase.from(tables.LOGS).select('*').order('created_at', { ascending: false });
      if (data) setLogs(data as Log[]);
    };
    fetchLogs();

    const channel = supabase.channel('logs-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: tables.LOGS }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.trim()) return;
    
    setIsAdding(false);
    const logContent = newLog;
    const logTitle = newTitle || 'Intelligence Entry ' + new Date().toLocaleDateString();
    setNewLog('');
    setNewTitle('');

    try {
      const { error } = await supabase.from(tables.LOGS).insert({ 
        content: logContent, 
        title: logTitle,
        created_at: new Date().toISOString() 
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Failed to add log:", err);
      alert("⚠️ Database Sync Error: " + (err.message || "Unknown error"));
      setIsAdding(true);
      setNewLog(logContent);
    }
  };

  const updateLog = async (id: string) => {
    if (!editDraft) return;
    const { error } = await supabase.from(tables.LOGS).update({
      title: editDraft.title,
      content: editDraft.content
    }).eq('id', id);
    
    if (error) alert("Failed to update log: " + error.message);
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

  const deleteLog = async (id: string) => {
    if(confirm("Erase log forever?")) {
      await supabase.from(tables.LOGS).delete().eq('id', id);
    }
  };

  return (
    <div className="pb-12 animate-in text-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center drop-shadow-sm">
          <BookOpen className="mr-3 text-blue-400" size={28} /> Intelligence Logs
        </h2>
        <button onClick={() => setIsAdding(!isAdding)} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-[14px] transition-all shadow-lg active:scale-95 border border-blue-400/30">
          <Plus size={20} />
        </button>
      </div>

      {isAdding && (
         <form onSubmit={handleAdd} className="financial-card p-6 mb-8 border-blue-500/30 animate-in slide-in-from-top-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Log Entry Title</label>
              <input className="financial-input w-full" placeholder="Project Alpha Sync..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Encrypted Payload</label>
              <textarea className="financial-input w-full resize-none leading-relaxed" rows={5} placeholder="Document operational footprint..." value={newLog} onChange={e=>setNewLog(e.target.value)} required autoFocus />
            </div>
          </div>
          <div className="flex space-x-3 mt-8">
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-[12px] transition-all shadow-md active:scale-[0.98]">Append Log</button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3.5 bg-slate-800 text-slate-300 font-bold rounded-[12px] hover:bg-slate-700 transition-colors">Discard</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {logs.length === 0 && !isAdding && <div className="financial-card p-12 text-center text-slate-500 font-medium italic">System datastore is empty.</div>}
        {logs.map((log) => {
          const isExpanded = expandedIds.has(log.id);
          const isEditing = editingId === log.id;
          return (
            <div key={log.id} className={`financial-card group transition-all duration-300 ${isExpanded ? 'border-blue-500/40 shadow-blue-900/10' : 'hover:border-slate-700/80'}`}>
              <div 
                onClick={() => !isEditing && toggleExpand(log.id)}
                className={`p-4 flex justify-between items-center cursor-pointer ${isExpanded ? 'border-b border-slate-800/60' : ''}`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg border transition-colors ${isExpanded ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    {isEditing ? (
                       <input className="financial-input py-1 text-sm font-bold w-full bg-slate-900/50" value={editDraft?.title} onChange={e => setEditDraft({...editDraft, title: e.target.value})} onClick={e => e.stopPropagation()} autoFocus />
                    ) : (
                       <h3 className="text-[15px] font-bold text-white tracking-tight leading-none mb-1">{log.title || 'Log Entry'}</h3>
                    )}
                    <div className="flex items-center space-x-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                      <span>{log.created_at ? new Date(log.created_at).toLocaleDateString() : (log.date || 'Today')}</span>
                      {!isEditing && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                          <span className="text-blue-500/80 truncate max-w-[200px]">{log.content.substring(0, 50)}...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                   {!isEditing && (
                     <button onClick={(e) => { e.stopPropagation(); setEditingId(log.id); setEditDraft({...log}); setExpandedIds(prev => new Set(prev).add(log.id)); }} className="p-2 text-slate-500 hover:text-blue-400 transition-all">
                       <Edit2 size={16} />
                     </button>
                   )}
                   {isSuperAdmin && !isEditing && (
                     <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }} className="p-2 text-slate-700 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                   )}
                   <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown size={18} className="text-slate-700" />
                   </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-5 lg:p-6 animate-in slide-in-from-top-2">
                  <div className="space-y-5">
                    {isEditing ? (
                       <div className="space-y-4">
                          <div className="space-y-1">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Log Content</label>
                             <textarea rows={6} className="financial-input w-full text-sm leading-relaxed" value={editDraft?.content} onChange={e => setEditDraft({...editDraft, content: e.target.value})} />
                          </div>
                          <div className="flex justify-end pt-2 space-x-3">
                             <button onClick={() => {setEditingId(null); setEditDraft(null);}} className="text-[10px] font-black px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors uppercase">Abort</button>
                             <button onClick={() => updateLog(log.id)} className="flex items-center space-x-2 bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-lg hover:bg-blue-500 shadow-lg"><Check size={12}/> <span>COMMIT LOG UPDATES</span></button>
                          </div>
                       </div>
                    ) : (
                      <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/60 shadow-inner">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center"><FileText size={12} className="mr-2"/> Log Data Stream</p>
                         <p className="text-sm text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">{log.content}</p>
                      </div>
                    )}
                    
                    <AttachmentManager collectionName="logs" docId={log.id} attachments={(log as any).attachments} isSuperAdmin={isSuperAdmin} />
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


