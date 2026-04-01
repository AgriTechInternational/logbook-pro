import { Routes, Route, NavLink } from 'react-router-dom';
import { BookOpen, Users, ListTodo, AlertTriangle, LayoutDashboard, Target, Settings, CircleDashed } from 'lucide-react';
import { useState, useEffect, createContext } from 'react';
import { User } from '@supabase/supabase-js';
import NotificationManager from './components/NotificationManager';
import { supabase, tables } from './lib/supabase';

export const UserContext = createContext<{ user: User | null; role: string }>({ user: null, role: 'ENGINEER' });

import OverviewPage from './pages/OverviewPage';
import LogsPage from './pages/LogsPage';
import MeetingsPage from './pages/MeetingsPage';
import ActionsPage from './pages/ActionsPage';
import AnomaliesPage from './pages/AnomaliesPage';
import MilestonesPage from './pages/MilestonesPage';
import SettingsPage from './pages/SettingsPage';
import LoginScreen from './pages/LoginScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState('ENGINEER');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial Session Check
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        if (session.user.email?.toLowerCase() === 'agritech-production@hotmail.com') {
          setRole('SUPER_ADMIN');
        } else {
          const { data: profile } = await supabase
            .from(tables.PROFILES)
            .select('role')
            .eq('id', session.user.id)
            .single();
          if (profile?.role) setRole(profile.role);
        }
      }
      setLoading(false);
    };

    checkSession();

    // Listener for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        if (session.user.email?.toLowerCase() === 'agritech-production@hotmail.com') {
          setRole('SUPER_ADMIN');
        } else {
          const { data: profile } = await supabase
            .from(tables.PROFILES)
            .select('role')
            .eq('id', session.user.id)
            .single();
          if (profile?.role) setRole(profile.role);
        }
      } else {
        setRole('ENGINEER');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex items-center text-blue-400 bg-slate-900/40 backdrop-blur-md p-6 rounded-[24px] shadow-2xl border border-slate-800">
          <CircleDashed className="w-6 h-6 animate-spin mr-3" />
          <span className="font-semibold tracking-wide">Secure Sync Initialized...</span>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  if (role === 'PENDING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-rose-600/10 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[24px] shadow-2xl border border-rose-500/30 text-center max-w-sm w-full relative z-10">
          <AlertTriangle className="w-16 h-16 text-rose-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Clearance Pending</h2>
          <p className="text-sm text-slate-400 mb-8 font-medium">Your access request has been securely logged. Please wait for a Super Admin to authorize your credentials to enter the Command Center.</p>
          <button onClick={() => supabase.auth.signOut()} className="text-xs font-bold text-rose-400 border border-rose-500/30 bg-rose-900/20 px-6 py-2.5 rounded-xl hover:bg-rose-900/40 transition-colors shadow-inner">
            Disconnect Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ user, role }}>
    <div className="flex flex-col h-[100dvh] text-slate-100 bg-slate-950 font-sans relative overflow-hidden">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none"></div>

      <header className="p-4 pt-safe sticky top-0 flex justify-between items-center z-50 border-b border-slate-800/60 backdrop-blur-xl bg-slate-950/70">
        <h1 className="text-xl font-extrabold tracking-tight text-white hidden sm:block flex-1 drop-shadow-sm">
          AgriTech <span className="text-blue-500 font-black tracking-widest">Logbook</span> <span className="ml-2 text-[10px] text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">v7.3.12 - TACTICAL OBJECTIVES</span>
        </h1>
        <h1 className="text-lg font-extrabold tracking-tight text-white sm:hidden flex-1 drop-shadow-sm">
          Agri<span className="text-blue-500 font-black">Tech</span> <span className="ml-1 text-[8px] text-slate-500 font-bold text-blue-400">v7.3.12</span>
        </h1>
        
        <div className="flex items-center space-x-3">
          <span className="text-xs font-semibold text-slate-400 hidden sm:block bg-slate-900/80 px-3 py-1.5 rounded-[10px] border border-slate-800 shadow-inner">{user.email}</span>
          <div className="flex items-center space-x-2 bg-emerald-900/30 px-3 py-1.5 rounded-[10px] border border-emerald-500/20 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 drop-shadow-sm">Live</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative p-4 lg:p-6 pb-28 md:pb-8 hide-scrollbar z-10">
        <div className="max-w-4xl mx-auto h-full animate-in fade-in">
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/meetings" element={<MeetingsPage />} />
            <Route path="/actions" element={<ActionsPage />} />
            <Route path="/anomalies" element={<AnomaliesPage />} />
            <Route path="/milestones" element={<MilestonesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>

      <NotificationManager userEmail={user?.email} />
      <nav className="fixed bottom-0 w-full bg-slate-950/80 backdrop-blur-2xl border-t border-slate-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] z-50 pb-8 pt-3 rounded-t-[32px] md:rounded-none">
        <div className="max-w-4xl mx-auto flex justify-between items-center overflow-x-auto px-5 hide-scrollbar gap-1">
          <NavTab to="/" icon={<LayoutDashboard size={24} />} label="Overview" exact />
          <NavTab to="/logs" icon={<BookOpen size={24} />} label="Logs" />
          <NavTab to="/actions" icon={<ListTodo size={24} />} label="Actions" />
          <NavTab to="/meetings" icon={<Users size={24} />} label="Meetings" />
          <NavTab to="/milestones" icon={<Target size={24} />} label="Milestones" />
          <NavTab to="/anomalies" icon={<AlertTriangle size={24} />} label="Anomalies" />
          <NavTab to="/settings" icon={<Settings size={24} />} label="Settings" />
        </div>
      </nav>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-in { animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.98) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
    </UserContext.Provider>
  );
}

function NavTab({ to, icon, label, exact }: { to: string; icon: React.ReactNode; label: string, exact?: boolean }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center min-w-[65px] px-2 py-2.5 space-y-1.5 transition-all duration-300 group relative flex-shrink-0 rounded-[16px] overflow-hidden ${
          isActive ? 'text-blue-400 bg-blue-900/20 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className={`transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-0.5 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : ''}`}>
            {icon}
          </div>
          <span className={`text-[9px] sm:text-[10px] font-bold tracking-wider whitespace-nowrap transition-all duration-300 ${isActive ? 'opacity-100 text-blue-300' : 'opacity-70 group-hover:opacity-100'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
