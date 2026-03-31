import { useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import { supabase, tables } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('engineer@agritech.com');
  const [password, setPassword] = useState('Admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error('Sign up failed');

        const defaultRole = email.toLowerCase() === 'agritech-production@hotmail.com' ? 'SUPER_ADMIN' : 'PENDING';
        
        const { error: profileError } = await supabase
          .from(tables.PROFILES)
          .upsert({ id: data.user.id, email, role: defaultRole });

        if (profileError) throw profileError;
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (!data.user) throw new Error('Sign in failed');

        const { data: profile } = await supabase
          .from(tables.PROFILES)
          .select('role')
          .eq('id', data.user.id)
          .single();
        
        if (email.toLowerCase() === 'agritech-production@hotmail.com' && profile?.role !== 'SUPER_ADMIN') {
          await supabase.from(tables.PROFILES).update({ role: 'SUPER_ADMIN' }).eq('id', data.user.id);
        } else if (!profile) {
          await supabase.from(tables.PROFILES).insert({ id: data.user.id, email, role: 'PENDING' });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication Failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(to right, rgba(30, 41, 59, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 41, 59, 0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-600/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="bg-blue-900/30 p-4 rounded-[20px] shadow-[0_0_30px_rgba(59,130,246,0.2)] border border-blue-500/30 backdrop-blur-md">
            <ShieldCheck className="h-12 w-12 text-blue-400" />
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">{isSignUp ? 'Request Clearance' : 'System Authentication'}</h2>
        <p className="mt-3 text-center text-sm font-medium text-slate-400">AgriTech Master Command Center</p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/60 backdrop-blur-xl py-10 px-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-[24px] sm:px-10 border border-slate-800/80">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-rose-900/20 border border-rose-500/30 p-4 rounded-[12px] flex items-center shadow-inner">
                <Lock className="text-rose-400 w-5 h-5 mr-3 shrink-0" />
                <p className="text-xs font-bold text-rose-300">{error}</p>
              </div>
            )}
            
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Clearance Ident</label>
              <input type="email" required className="block w-full px-5 py-3.5 bg-slate-900/80 border border-slate-700/80 rounded-[14px] text-white font-medium focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner" placeholder="engineer@agritech.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Access Protocol</label>
              <input type="password" required className="block w-full px-5 py-3.5 bg-slate-900/80 border border-slate-700/80 rounded-[14px] text-white font-medium focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="pt-2 space-y-4 border-t border-slate-700/50 mt-6 pt-6">
              <button type="submit" disabled={loading} className="w-full flex justify-center py-4 px-4 border border-blue-500/50 rounded-[14px] shadow-[0_0_20px_rgba(37,99,235,0.2)] text-sm font-bold text-white bg-blue-600/90 hover:bg-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.3)] transition-all disabled:opacity-50 tracking-wide backdrop-blur-sm">
                {loading ? 'Decrypting Payload...' : isSignUp ? 'Submit Request (Sign Up)' : 'Authorize Login'}
              </button>
              
              <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="w-full text-center text-[13px] font-black tracking-widest uppercase py-3 border border-emerald-500/30 rounded-[14px] bg-emerald-900/10 text-emerald-400 hover:bg-emerald-900/30 transition-all outline-none">
                {isSignUp ? 'Already Registered? Login' : 'Don\'t have access? Sign Up Here'}
              </button>
            </div>
          </form>
        </div>
        
        <p className="text-center text-[10px] font-black text-slate-600 mt-8 uppercase tracking-widest">Secure Cloud Proxy Subsystem</p>
      </div>
    </div>
  );
}
