import { useState, useEffect, useContext } from 'react';
import { Plus, ListTodo, ClipboardCheck, Trash2, ArrowRight, Edit2, Check, User } from 'lucide-react';
import { UserContext } from '../App';
import { supabase, tables } from '../lib/supabase';
import AttachmentManager from '../components/AttachmentManager';
import RichEditor from '../components/RichEditor';

export default function ActionsPage() {
  const [actions, setActions]         = useState<any[]>([]);
  const [isAdding, setIsAdding]       = useState(false);
  const [newTitle, setNewTitle]       = useState('');
  const [newPriority, setNewPriority] = useState('NORMAL');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Edit state
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editDraft, setEditDraft]   = useState<any>(null);

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
    setIsAdding(false);
    const title = newTitle; const desc = newDescription; const pri = newPriority; const assignee = newAssignedTo;
    setNewTitle(''); setNewDescription(''); setNewPriority('NORMAL'); setNewAssignedTo('');

    const { error } = await supabase.from(tables.ACTIONS).insert({
      title, description: desc, priority: pri, status: 'TODO',
      assigned_to: assignee || 'All Engineers',
      created_by: user?.email || 'Unknown'
    });
    if (error) alert('Failed to save action: ' + error.message);
  };

  const startEditing = (a: any) => {
    setEditingId(a.id);
    setEditDraft({ ...a });
  };

  const abortEditing = () => { setEditingId(null); setEditDraft(null); };

  const commitUpdate = async () => {
    if (!editDraft) return;
    const { id, created_at, ...updates } = editDraft;
    const { error } = await supabase.from(tables.ACTIONS).update(updates).eq('id', id);
    if (error) alert('Failed to update: ' + error.message);
    else { setEditingId(null); setEditDraft(null); }
  };

  const updateStatus = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'TODO' ? 'IN_PROGRESS' : currentStatus === 'IN_PROGRESS' ? 'DONE' : 'TODO';
    await supabase.from(tables.ACTIONS).update({ status: next }).eq('id', id);
  };

  const deleteAction = async (id: string) => {
    if (!confirm('Permanently archive this mission objective?')) return;
    await supabase.from(tables.ACTIONS).delete().eq('id', id);
  };

  const priorityColor = (p: string) =>
    p === 'HIGH' ? 'text-rose-400' : p === 'NORMAL' ? 'text-blue-400' : 'text-slate-500';

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

      {/* ── Add form ──────────────────────────────────────────────────────── */}
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
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned To</label>
              <input className="financial-input w-full" placeholder="Engineer, Team Lead..." value={newAssignedTo} onChange={e => setNewAssignedTo(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Objective Parameters</label>
              <RichEditor value={newDescription} onChange={setNewDescription} placeholder="Detailed instructions..." minRows={3} />
            </div>
          </div>
          <div className="flex space-x-3 mt-8">
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-[12px] transition-all shadow-md active:scale-[0.98]">Deploy Directive</button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3.5 bg-slate-800 text-slate-300 font-bold rounded-[12px] hover:bg-slate-700 transition-colors">Abort</button>
          </div>
        </form>
      )}

      {/* ── Actions list ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {actions.length === 0 && <div className="financial-card p-12 text-center text-slate-500 font-medium">No active directives found in stream.</div>}
        {actions.map((a) => {
          const isEditing = editingId === a.id;
          return (
            <div key={a.id} className={`financial-card group transition-all duration-300 ${isEditing ? 'border-emerald-500/40' : 'hover:border-slate-700/80'}`}>
              <div className="p-5 lg:p-6">

                {/* ── Header row ──────────────────────────────────────────── */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-xl border shadow-sm flex-shrink-0 ${a.status === 'DONE' ? 'bg-emerald-900/30 border-emerald-500/20 text-emerald-400' : 'bg-blue-900/30 border-blue-500/20 text-blue-400'}`}>
                      <ClipboardCheck size={20} />
                    </div>
                    <div className="min-w-0">
                      {isEditing ? (
                        <input
                          className="financial-input py-1 text-base font-bold w-full bg-slate-900/50"
                          value={editDraft?.title || ''}
                          onChange={e => setEditDraft({ ...editDraft, title: e.target.value })}
                          onKeyDown={e => e.key === 'Escape' && abortEditing()}
                          autoFocus
                        />
                      ) : (
                        <h3 className={`text-lg font-extrabold tracking-tight drop-shadow-sm truncate ${a.status === 'DONE' ? 'text-slate-500 line-through' : 'text-white'}`}>{a.title}</h3>
                      )}
                      <div className="flex items-center space-x-3 mt-0.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${priorityColor(isEditing ? editDraft?.priority : a.priority)}`}>
                          {(isEditing ? editDraft?.priority : a.priority)} Priority
                        </span>
                        <span className="w-1 h-1 bg-slate-800 rounded-full" />
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest truncate">
                          <User size={9} className="inline mr-1" />{isEditing ? editDraft?.assigned_to : a.assigned_to}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                    {!isEditing && (
                      <button
                        onClick={() => startEditing(a)}
                        className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-all"
                        title="Edit action"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {!isEditing && (
                      <button
                        onClick={() => updateStatus(a.id, a.status)}
                        className={`flex items-center px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          a.status === 'DONE'
                            ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-emerald-500/50 hover:text-emerald-300'
                        }`}
                      >
                        {a.status.replace('_', ' ')} <ArrowRight size={12} className="ml-2" />
                      </button>
                    )}
                    {isSuperAdmin && !isEditing && (
                      <button onClick={() => deleteAction(a.id)} className="p-2 text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Edit form ─────────────────────────────────────────── */}
                {isEditing ? (
                  <div className="space-y-4 pt-2 border-t border-slate-800/60">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Priority</label>
                        <select
                          className="financial-input w-full py-2 text-sm font-bold"
                          value={editDraft?.priority || 'NORMAL'}
                          onChange={e => setEditDraft({ ...editDraft, priority: e.target.value })}
                        >
                          <option value="LOW">LOW CLEARANCE</option>
                          <option value="NORMAL">STANDARD PROTOCOL</option>
                          <option value="HIGH">CRITICAL URGENCY</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Status</label>
                        <select
                          className="financial-input w-full py-2 text-sm font-bold"
                          value={editDraft?.status || 'TODO'}
                          onChange={e => setEditDraft({ ...editDraft, status: e.target.value })}
                        >
                          <option value="TODO">TODO / PENDING</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="DONE">DONE / COMPLETE</option>
                          <option value="OPEN">OPEN</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </div>
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned To</label>
                        <input
                          className="financial-input w-full py-2 text-sm font-bold"
                          value={editDraft?.assigned_to || ''}
                          onChange={e => setEditDraft({ ...editDraft, assigned_to: e.target.value })}
                          onKeyDown={e => e.key === 'Escape' && abortEditing()}
                          placeholder="Engineer, Team Lead..."
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                        <RichEditor
                          value={editDraft?.description || ''}
                          onChange={(v: string) => setEditDraft({ ...editDraft, description: v })}
                          onEscape={abortEditing}
                          minRows={4}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 space-x-3 border-t border-slate-800/60">
                      <button
                        onClick={abortEditing}
                        className="px-6 py-3 bg-slate-800 text-slate-400 text-[10px] font-black rounded-xl hover:bg-slate-700 transition-colors uppercase"
                      >
                        Abort
                      </button>
                      <button
                        onClick={commitUpdate}
                        className="flex-1 flex items-center justify-center bg-emerald-600 text-white text-[11px] font-black px-6 py-3 rounded-xl shadow-xl hover:bg-emerald-500 transition-all border border-emerald-400/20 active:scale-95"
                      >
                        <Check size={14} className="mr-2" /> COMMIT OBJECTIVE UPDATES
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Read-only description ──────────────────────────── */
                  a.description ? (
                    <div
                      className="text-sm text-slate-400 leading-relaxed font-medium bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 shadow-inner rich-content"
                      dangerouslySetInnerHTML={{ __html: a.description }}
                    />
                  ) : null
                )}

                <AttachmentManager collectionName="actions" docId={a.id} attachments={a.attachments} isSuperAdmin={isSuperAdmin} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
