import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { supabase, tables } from '../lib/supabase';

interface ActionAlert {
  id: string;
  title: string;
  due_date: string;
  assigned_to: string;
  status: string;
}

export default function NotificationManager({ userEmail }: { userEmail: string | undefined }) {
  const [alerts, setAlerts] = useState<ActionAlert[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    if (userEmail) {
      checkDeadlines();
      const interval = setInterval(checkDeadlines, 1000 * 60 * 30); // Check every 30 mins
      
      const channel = supabase.channel('global-alerts')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: tables.ACTIONS 
        }, () => {
          checkDeadlines();
        })
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [userEmail]);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
  };

  const checkDeadlines = async () => {
    if (!userEmail) return;

    const { data } = await supabase
      .from(tables.ACTIONS)
      .select('*')
      .neq('status', 'CLOSED')
      .neq('status', 'COMPLETED');

    if (!data) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const urgentActions = data.filter(action => {
      // Check if assigned to user or 'All Engineers'
      const isAssigned = action.assigned_to === userEmail || action.assigned_to === 'All Engineers';
      if (!isAssigned || !action.due_date) return false;

      const due = new Date(action.due_date);
      due.setHours(0, 0, 0, 0);
      
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Trigger if today is within the reminder window
      return diffDays <= (action.reminder_days || 0);
    });

    setAlerts(urgentActions);

    // Trigger system notification for new urgent items
    if (urgentActions.length > alerts.length && Notification.permission === 'granted') {
      const latest = urgentActions[urgentActions.length - 1];
      new Notification('AgriTech Tactical Alert', {
        body: `Objective Due: ${latest.title} (Due in ${latest.due_date})`,
        icon: '/pwa-192x192.png'
      });
    }
  };

  if (alerts.length === 0) {
    if (permission === 'default') {
      return (
        <div className="bg-blue-600/10 border-b border-blue-500/20 px-4 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center space-x-2">
            <Bell size={14} className="text-blue-400" />
            <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Enable Tactical Phone Pop-ups?</span>
          </div>
          <button 
            onClick={requestPermission}
            className="text-[9px] font-black bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-500 transition-colors uppercase"
          >
            Authorize
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] space-y-2 pointer-events-none">
      {alerts.map((alert) => (
        <div key={alert.id} className="bg-slate-900 border-2 border-rose-500/50 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 pointer-events-auto flex items-start space-x-4">
          <div className="bg-rose-500/20 p-2 rounded-xl border border-rose-500/30">
            <AlertTriangle className="text-rose-500" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-0.5">Tactical Reminder</h4>
            <p className="text-sm font-bold text-white truncate">{alert.title}</p>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mt-1">
              Due Date: <span className="text-rose-400">{alert.due_date}</span>
            </p>
          </div>
          <div className="flex flex-col space-y-2">
             <button 
               onClick={() => {
                 supabase.from(tables.ACTIONS).update({ status: 'COMPLETED' }).eq('id', alert.id).then(() => checkDeadlines());
               }}
               className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all border border-emerald-400/20"
               title="Mark Completed"
             >
               <CheckCircle2 size={16} />
             </button>
             <button 
               onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
               className="p-2 bg-slate-850 text-slate-400 rounded-lg hover:bg-slate-800 transition-all border border-slate-700"
             >
               <X size={16} />
             </button>
          </div>
        </div>
      ))}
    </div>
  );
}
