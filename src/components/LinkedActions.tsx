import { useState, useEffect } from 'react';
import { Plus, ListTodo, ClipboardCheck, ArrowRight, User, Calendar, Bell, Clock, Edit2, Check } from 'lucide-react';
import { supabase, tables } from '../lib/supabase';

interface LinkedActionsProps {
  parentId: string;
  parentType: 'meeting' | 'anomaly';
  userEmail: string | undefined;
}

export default function LinkedActions({ parentId, parentType, userEmail }: LinkedActionsProps) {
  const [actions, setActions] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newReminderDays, setNewReminderDays] = useState(0);
  const [loading, setLoading] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<any>(null);

  useEffect(() => {
    fetchLinkedActions();
    const channel = supabase.channel(`linked-actions-${parentId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: tables.ACTIONS,
        filter: `${parentType}_id=eq.${parentId}`
      }, () => {
        fetchLinkedActions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [parentId]);

  const fetchLinkedActions = async () => {
    const { data } = await supabase
      .from(tables.ACTIONS)
      .select('*')
      .eq(`${parentType}_id`, parentId)
      .order('created_at', { ascending: true });
    if (data) setActions(data);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || loading) return;

    setLoading(true);
    const { error } = await supabase.from(tables.ACTIONS).insert({
      title: newTitle,
      status: 'OPEN',
      priority: 'NORMAL',
      assigned_to: newAssignee || 'All Engineers',
      due_date: newDueDate || null,
      reminder_days: newReminderDays,
      created_by: userEmail || 'Unknown',
      [`${parentType}_id`]: parentId
    });

    if (!error) {
      setNewTitle('');
      setNewAssignee('');
      setNewDueDate('');
      setNewReminderDays(0);
      fetchLinkedActions();
    } else {
      console.error('Tactical Injection Error:', error);
      alert(`Initialization Failed: ${error.message}. Ensure you have run the migration_v737.sql script in Supabase!`);
    }
    setLoading(false);
  };

  const getNextStatus = (current: string) => {
    const s = current?.toUpperCase();
    switch (s) {
      case 'OPEN': return 'RESPONDED';
      case 'RESPONDED': return 'COMPLETED';
      case 'COMPLETED': return 'CLOSED';
      case 'CLOSED':
      case 'REJECTED': return 'OPEN';
      default: return 'OPEN';
    }
  };

  const updateStatus = async (id: string, currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    const { error } = await supabase.from(tables.ACTIONS).update({ status: nextStatus }).eq('id', id);
    if (error) console.error('Status Update Error:', error);
    fetchLinkedActions();
  };

  const startEditing = (action: any) => {
    setEditingId(action.id);
    setEditDraft({ ...action });
  };

  const abortEditing = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const commitUpdate = async () => {
    if (!editDraft) return;
    const { id, title, assigned_to, due_date, reminder_days, status } = editDraft;
    const { error } = await supabase.from(tables.ACTIONS).update({
      title, assigned_to, due_date, reminder_days, status
    }).eq('id', id);
    if (error) {
      console.error('Update Error:', error);
      alert('Failed to update action: ' + error.message);
    } else {
      abortEditing();
      fetchLinkedActions();
    }
  };

  const getStatusStyle = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'CLOSED':
      case 'REJECTED': return 'bg-slate-900 border-slate-800 text-slate-500 line-through';
      case 'COMPLETED': return 'bg-emerald-900/20 border-emerald-500/20 text-emerald-400';
      case 'RESPONDED': return 'bg-amber-900/20 border-amber-500/20 text-amber-400';
      case 'OPEN': return 'bg-blue-900/20 border-blue-500/20 text-blue-400';
      default: return 'bg-slate-900 border-slate-800 text-slate-400';
    }
  };

  const getUrgencyInfo = (dueDate: string | null) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Overdue', color: 'text-rose-500', icon: <Clock size={10} className="mr-1 text-rose-500" /> };
    if (diffDays === 0) return { label: 'Due Today', color: 'text-rose-400', icon: <Clock size={10} className="mr-1 text-rose-400 animate-pulse" /> };
    if (diffDays <= 2) return { label: `${diffDays}d left`, color: 'text-amber-400', icon: <Clock size={10} className="mr-1 text-amber-400" /> };
    return { label: `${diffDays}d left`, color: 'text-slate-500', icon: <Clock size={10} className="mr-1 text-slate-500" /> };
  };

  return (
    <div className="mt-6 pt-6 border-t border-slate-800/60">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center">
          <ListTodo size={12} className="mr-2"/> Linked Actions
        </h4>
      </div>

      <div className="space-y-2 mb-6">
        {actions.length === 0 && <div className="text-[10px] font-bold text-slate-600 italic py-4 text-center border border-dashed border-slate-800 rounded-xl">No active actions linked to this protocol.</div>}
        {actions.map((action) => {
          const urgency = getUrgencyInfo(action.due_date);
          const isEditing = editingId === action.id;

          return (
            <div key={action.id} className="flex flex-col bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 hover:border-emerald-500/30 transition-all shadow-sm">
              {isEditing ? (
                <div className="space-y-3">
                  <input 
                    className="financial-input w-full py-1.5 text-xs font-bold" 
                    value={editDraft.title} 
                    onChange={e => setEditDraft({...editDraft, title: e.target.value})}
                  />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input 
                      placeholder="Assignee"
                      className="financial-input w-full py-1 text-[10px] md:col-span-2 text-xs" 
                      value={editDraft.assigned_to} 
                      onChange={e => setEditDraft({...editDraft, assigned_to: e.target.value})}
                    />
                    <input 
                      type="date"
                      className="financial-input w-full py-1 text-[10px] text-xs" 
                      value={editDraft.due_date || ''} 
                      onChange={e => setEditDraft({...editDraft, due_date: e.target.value})}
                    />
                    <select 
                      className="financial-input w-full py-1 text-[10px] text-xs"
                      value={editDraft.status}
                      onChange={e => setEditDraft({...editDraft, status: e.target.value})}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="RESPONDED">RESPONDED</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2 pt-1">
                    <button onClick={abortEditing} className="px-3 py-1 bg-slate-800 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-700 text-slate-400">Abort</button>
                    <button onClick={commitUpdate} className="px-3 py-1 bg-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500 text-white flex items-center shadow-lg"><Check size={10} className="mr-1"/> Commit</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className={`p-1.5 rounded-lg border transition-colors ${getStatusStyle(action.status)}`}>
                       <ClipboardCheck size={14} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-bold truncate ${(action.status === 'CLOSED' || action.status === 'REJECTED') ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{action.title}</span>
                      <div className="flex items-center flex-wrap gap-x-2 text-[9px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">
                         <span className="flex items-center"><User size={10} className="mr-1 text-slate-600"/> {action.assigned_to}</span>
                         {action.due_date && (
                            <>
                              <span className="opacity-20">|</span>
                              <span className="flex items-center"><Calendar size={10} className="mr-1 text-slate-600"/> {action.due_date}</span>
                            </>
                         )}
                         {urgency && action.status !== 'CLOSED' && action.status !== 'REJECTED' && (
                            <>
                              <span className="opacity-20">|</span>
                              <span className={`flex items-center ${urgency.color}`}>{urgency.icon} {urgency.label}</span>
                            </>
                         )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                    <button 
                      onClick={() => startEditing(action)}
                      className="p-1.5 rounded-md text-slate-600 hover:text-emerald-400 hover:bg-emerald-900/20 transition-all"
                      title="Edit action"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => updateStatus(action.id, action.status)}
                      className={`p-1.5 rounded-md transition-all ${(action.status === 'CLOSED' || action.status === 'REJECTED') ? 'text-slate-600 hover:text-blue-400' : 'text-slate-600 hover:text-emerald-400 hover:bg-emerald-900/20'}`}
                      title={`Move to ${getNextStatus(action.status)}`}
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleQuickAdd} className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/40">
        <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">New Action Injection</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input 
            className="financial-input w-full py-2 text-xs font-bold placeholder:text-slate-600" 
            placeholder="Operational Action Title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />
          <div className="relative group">
             <User size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
             <input 
               className="financial-input w-full pl-8 py-2 text-xs font-bold placeholder:text-slate-600" 
               placeholder="Primary Actionee..."
               value={newAssignee}
               onChange={(e) => setNewAssignee(e.target.value)}
             />
          </div>
          <div className="relative group">
             <Calendar size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
             <input 
               type="date"
               className="financial-input w-full pl-8 py-2 text-xs font-bold" 
               value={newDueDate}
               onChange={(e) => setNewDueDate(e.target.value)}
             />
          </div>
          <div className="relative group">
             <Bell size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
             <select 
               className="financial-input w-full pl-8 py-2 text-xs font-bold" 
               value={newReminderDays}
               onChange={(e) => setNewReminderDays(parseInt(e.target.value))}
             >
                <option value={0}>Same Day Alert</option>
                <option value={1}>1 Day Lead-time</option>
                <option value={2}>2 Days Lead-time</option>
                <option value={3}>3 Days Lead-time</option>
                <option value={7}>1 Week Lead-time</option>
             </select>
          </div>
        </div>
        <button 
          type="submit"
          className="w-full flex items-center justify-center space-x-2 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 shadow-xl transition-all disabled:opacity-50 border border-emerald-400/20 active:scale-95"
          disabled={!newTitle.trim() || loading}
        >
          <Plus size={14} /> <span>Initialize Action</span>
        </button>
      </form>
    </div>
  );
}
