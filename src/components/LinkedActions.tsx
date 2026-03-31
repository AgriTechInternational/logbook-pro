import { useState, useEffect } from 'react';
import { Plus, ListTodo, ClipboardCheck, ArrowRight, User } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

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
      created_by: userEmail || 'Unknown',
      [`${parentType}_id`]: parentId
    });

    if (!error) {
      setNewTitle('');
      setNewAssignee('');
      fetchLinkedActions();
    }
    setLoading(false);
  };

  const getNextStatus = (current: string) => {
    const s = current?.toUpperCase();
    switch (s) {
      case 'OPEN': return 'IN_PROGRESS';
      case 'IN_PROGRESS': return 'COMPLETED';
      case 'COMPLETED': return 'CLOSED';
      default: return 'OPEN';
    }
  };

  const updateStatus = async (id: string, currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    await supabase.from(tables.ACTIONS).update({ status: nextStatus }).eq('id', id);
    fetchLinkedActions();
  };

  const getStatusStyle = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'CLOSED': return 'bg-slate-900 border-slate-800 text-slate-500 line-through';
      case 'COMPLETED': return 'bg-emerald-900/20 border-emerald-500/20 text-emerald-400';
      case 'IN_PROGRESS': return 'bg-amber-900/20 border-amber-500/20 text-amber-400';
      case 'OPEN': return 'bg-blue-900/20 border-blue-500/20 text-blue-400';
      default: return 'bg-slate-900 border-slate-800 text-slate-400';
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-slate-800/60">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center">
          <ListTodo size={12} className="mr-2"/> Linked Tactical Objectives
        </h4>
        <div className="flex items-center space-x-2">
           <span className="text-[9px] font-bold text-slate-600 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 uppercase tracking-tighter">Cycle: Open-Progress-Comp-Closed</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {actions.map((action) => (
          <div key={action.id} className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 hover:border-emerald-500/30 transition-all group shadow-sm">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className={`p-1.5 rounded-lg border transition-colors ${getStatusStyle(action.status)}`}>
                 <ClipboardCheck size={14} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-bold truncate ${action.status === 'CLOSED' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{action.title}</span>
                <div className="flex items-center text-[9px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">
                   <User size={10} className="mr-1"/> {action.assigned_to}
                   <span className="mx-1.5 opacity-20">|</span>
                   <span className={action.status === 'CLOSED' ? '' : 'text-emerald-500/80'}>{action.status}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => updateStatus(action.id, action.status)}
              className={`p-1.5 rounded-md transition-all ${action.status === 'CLOSED' ? 'text-slate-600 hover:text-blue-400' : 'text-slate-600 hover:text-emerald-400 hover:bg-emerald-900/20'}`}
              title={`Move to ${getNextStatus(action.status)}`}
            >
              <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleQuickAdd} className="space-y-2 bg-slate-900/40 p-3 rounded-xl border border-slate-800/40">
        <div className="flex gap-2">
          <input 
            className="financial-input flex-1 py-2 text-xs placeholder:text-slate-600" 
            placeholder="New Tactical Objective..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <div className="relative group min-w-[120px]">
             <User size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
             <input 
               className="financial-input w-full pl-7 py-2 text-[10px] placeholder:text-slate-600" 
               placeholder="Actionee..."
               value={newAssignee}
               onChange={(e) => setNewAssignee(e.target.value)}
             />
          </div>
          <button 
            type="submit"
            className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all disabled:opacity-50"
            disabled={!newTitle.trim() || loading}
          >
            <Plus size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
