import { useState, useEffect, useContext } from 'react';
import { Plus, ListTodo, ClipboardCheck, Trash2, ArrowRight } from 'lucide-react';
import { UserContext } from '../App';
import { supabase, tables } from '../lib/supabase';
import AttachmentManager from '../components/AttachmentManager';

export default function ActionsPage() {
  const [actions, setActions] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('NORMAL');
  const [newDescription, setNewDescription] = useState('');
  const { role, user } = useContext(UserContext);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    const fetchActions = async () => {
      const { data } = await supabase.from(tables.ACTIONS).select('*').order('created_at', { ascending: false });
      if (data) setActions(data);
    };
    fetchActions();

    const channel = supabase.channel('actions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: tables.ACTIONS }, () => {
        fetchActions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Optimistic UI
    setIsAdding(false);
    setNewTitle(''); setNewDescription(''); setNewPriority('NORMAL');

    const { error } = await supabase.from(tables.ACTIONS).insert({
      title: newTitle,
      description: newDescription,
      priority: newPriority,
      status: 'TODO',
      assigned_to: 'All Engineers',
      created_by: user?.email || 'Unknown'
    });
    if (error) alert("Failed to save action: " + error.message);
  };

  const updateStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'TODO' ? 'IN_PROGRESS' : currentStatus === 'IN_PROGRESS' ? 'DONE' : 'TODO';
    await supabase.from(tables.ACTIONS).update({ status: nextStatus }).eq('id', id);
  };

  const deleteAction = async (id: string) => {
    if (!confirm("Permanently archive this mission objective?")) return;
    await supabase.from(tables.ACTIONS).delete().eq('id', id);
  };

  return (
    <div className="pb-12 animate-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center drop-shadow-sm">
          <ListTodo className="mr-3 text-emerald-400" size={28} /> Mission Objectives
        </h2>
        <button onClick={() => setIsAdding(!isAdding)} className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[14px] transition-all shadow-lg active:scale-95 border border-emerald-400/30">
          <Plus size={20} />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="financial-card p-6 mb-8 border-emerald-500/30 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Directive Title</label>
              <input required className="financial-input w-full" placeholder="Deploy security patch..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Priority Vector</label>
              <select className="financial-input w-full" value={newPriority} onChange={e => setNewPriority(e.target.value)}>
                <option value="LOW">LOW CLEARANCE</option>
                <option value="NORMAL">STANDARD PROTOCOL</option>
                <option value="HIGH">CRITICAL URGENCY</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Objective Parameters</label>
              <textarea rows={3} className="financial-input w-full resize-none" placeholder="Detailed instructions..." value={newDescription} onChange={e => setNewDescription(e.target.value)} />
            </div>
          </div>
          <div className="flex space-x-3 mt-8">
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-[12px] transition-all shadow-md active:scale-[0.98]">Deploy Directive</button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3.5 bg-slate-800 text-slate-300 font-bold rounded-[12px] hover:bg-slate-700 transition-colors">Abort</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {actions.length === 0 && <div className="financial-card p-12 text-center text-slate-500 font-medium">No active directives found in stream.</div>}
        {actions.map((a) => (
          <div key={a.id} className="financial-card group">
            <div className="p-5 lg:p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-4">
                  <div className={`p-2.5 rounded-xl border shadow-sm ${a.status === 'DONE' ? 'bg-emerald-900/30 border-emerald-500/20 text-emerald-400' : 'bg-blue-900/30 border-blue-500/20 text-blue-400'}`}>
                    <ClipboardCheck size={20} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-extrabold tracking-tight drop-shadow-sm ${a.status === 'DONE' ? 'text-slate-500 line-through' : 'text-white'}`}>{a.title}</h3>
                    <div className="flex items-center space-x-3 mt-0.5">
                       <span className={`text-[9px] font-black uppercase tracking-widest ${a.priority === 'HIGH' ? 'text-rose-400' : a.priority === 'NORMAL' ? 'text-blue-400' : 'text-slate-500'}`}>{a.priority} Priority</span>
                       <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{a.assigned_to}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                   <button onClick={() => updateStatus(a.id, a.status)} className={`flex items-center px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${a.status === 'DONE' ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-emerald-500/50 hover:text-emerald-300'}`}>
                      {a.status.replace('_', ' ')} <ArrowRight size={12} className="ml-2"/>
                   </button>
                   {isSuperAdmin && (
                     <button onClick={() => deleteAction(a.id)} className="p-2 text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                   )}
                </div>
              </div>
              
              <p className="text-sm text-slate-400 leading-relaxed font-medium bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 shadow-inner mt-4">{a.description}</p>

              <AttachmentManager collectionName="actions" docId={a.id} attachments={a.attachments} isSuperAdmin={isSuperAdmin} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
