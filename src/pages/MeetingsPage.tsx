import { useState, useEffect, useContext } from 'react';
import { Plus, Users, Calendar, User, Trash2, FileText, ArrowRightCircle, Check, Edit2 } from 'lucide-react';


import { UserContext } from '../App';
import { supabase, tables } from '../lib/supabase';
import AttachmentManager from '../components/AttachmentManager';
import RichEditor from '../components/RichEditor';
import LinkedActions from '../components/LinkedActions';


export default function MeetingsPage() {
  const containsArabic = (text: string) => /[\u0600-\u06FF]/.test(text || '');
  const getLangClass = (text: string) => containsArabic(text) ? 'font-arabic text-right' : '';

  const [meetings, setMeetings] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAgenda, setNewAgenda] = useState('');
  const [newWayForward, setNewWayForward] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newAttendees, setNewAttendees] = useState('');
  
  // Proactive Action states
  const [initialActionTitle, setInitialActionTitle] = useState('');
  const [initialActionee, setInitialActionee] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editDraft, setEditDraft] = useState<any>(null);
  
  const { role, user } = useContext(UserContext);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    const fetchMeetings = async () => {
      const { data } = await supabase.from(tables.MEETINGS).select('*').order('date', { ascending: false });
      if (data) setMeetings(data);
    };
    fetchMeetings();

    const channel = supabase.channel('meetings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: tables.MEETINGS }, () => {
        fetchMeetings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const meetingData = {
      title: newTitle,
      agenda: newAgenda,
      way_forward: newWayForward,
      date: newDate || new Date().toISOString().split('T')[0],
      attendees: newAttendees,
      created_by: user?.email || 'Unknown'
    };

    // INSTANT UI RESET
    setIsAdding(false);
    setNewTitle(''); setNewAgenda(''); setNewWayForward(''); setNewDate(''); setNewAttendees('');

    try {
      const { data: newMeeting, error } = await supabase.from(tables.MEETINGS).insert(meetingData).select().single();
      if (error) {
        console.error("Supabase Insert Error:", error);
        alert("Failed to save meeting: " + error.message);
      } else if (initialActionTitle.trim() && newMeeting) {
        // Proactive Action Creation
        await supabase.from(tables.ACTIONS).insert({
          title: initialActionTitle,
          assigned_to: initialActionee || 'All Participants',
          status: 'OPEN',
          priority: 'NORMAL',
          created_by: user?.email || 'Unknown',
          meeting_id: newMeeting.id
        });
        setInitialActionTitle(''); setInitialActionee('');
      }
    } catch (err) {
      console.error("Critical Save Failure:", err);
    }
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm("Permanently purge this record from memory?")) return;
    const { error } = await supabase.from(tables.MEETINGS).delete().eq('id', id);
    if (error) alert("Failed to delete: " + error.message);
  };

  const startEditing = (meeting: any) => {
    setEditingId(meeting.id);
    setEditDraft({ ...meeting });
    setExpandedIds(prev => new Set(prev).add(meeting.id));
  };

  const commitUpdate = async () => {
    if (!editDraft) return;
    const { id, ...updates } = editDraft;
    // Remove metadata fields that shouldn't be patched directly if they exist
    delete updates.created_at;
    delete updates.id;
    
    const { error } = await supabase.from(tables.MEETINGS).update(updates).eq('id', id);
    if (error) {
      alert("Failed to update: " + error.message);
    } else {
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

  return (
    <div className="pb-12 animate-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center drop-shadow-sm">
          <Users className="mr-3 text-blue-400" size={28} /> Strategic Alignments
        </h2>
        <button onClick={() => setIsAdding(!isAdding)} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-[14px] transition-all shadow-lg active:scale-95 border border-blue-400/30">
          <Plus size={20} />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="financial-card p-6 mb-8 border-blue-500/30 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Alignment Title</label>
              <input required className="financial-input w-full" placeholder="Project Alpha Sync..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Protocol Date</label>
              <input type="date" className="financial-input w-full" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Attendees (CSV)</label>
              <input className="financial-input w-full" placeholder="John, Sarah, Mike..." value={newAttendees} onChange={e => setNewAttendees(e.target.value)} />
            </div>
            <div className="md:col-span-1 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Critical Agenda</label>
              <RichEditor value={newAgenda} onChange={setNewAgenda} placeholder="Primary objectives..." minRows={4} />
            </div>
            <div className="md:col-span-1 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Way Forward</label>
              <RichEditor value={newWayForward} onChange={setNewWayForward} placeholder="Next actionable steps..." minRows={4} />
            </div>

            {/* Proactive Action Row */}
            <div className="md:col-span-2 pt-4 mt-2 border-t border-slate-800/60">
               <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center">
                 <Plus size={10} className="mr-2"/> Initialize High-Impact Action
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Action Title</label>
                    <input className="financial-input w-full py-2 text-xs" placeholder="Draft technical specs..." value={initialActionTitle} onChange={e => setInitialActionTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Assigned Actionee</label>
                    <input className="financial-input w-full py-2 text-xs" placeholder="Lead Architect..." value={initialActionee} onChange={e => setInitialActionee(e.target.value)} />
                  </div>
               </div>
            </div>
          </div>

          <div className="flex space-x-3 mt-8">
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-[12px] transition-all shadow-md active:scale-[0.98]">Create Alignment</button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3.5 bg-slate-800 text-slate-300 font-bold rounded-[12px] hover:bg-slate-700 transition-colors">Abort</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {meetings.length === 0 && <div className="financial-card p-12 text-center text-slate-500 font-medium italic">No strategic alignments detected in vector space.</div>}
        {meetings.map((m) => {
          const isExpanded = expandedIds.has(m.id);
          const isEditing = editingId === m.id;

          return (
            <div key={m.id} className={`financial-card transition-all duration-300 ${isExpanded ? 'border-blue-500/40 shadow-blue-900/10' : 'hover:border-slate-700/80'}`}>
              <div 
                onClick={() => !isEditing && toggleExpand(m.id)}
                className={`p-4 flex justify-between items-center cursor-pointer ${isExpanded ? 'border-b border-slate-800/60' : ''}`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg border transition-colors ${isExpanded ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-slate-900/40 border-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    {isEditing ? (
                       <input 
                         className="financial-input py-1 text-[15px] font-bold w-full bg-slate-900/50" 
                         value={editDraft?.title || ''} 
                         onChange={e => setEditDraft({...editDraft, title: e.target.value})}
                         onClick={e => e.stopPropagation()}
                       />
                    ) : (
                       <h3 className={`text-[15px] font-bold text-white tracking-tight leading-none mb-1 ${getLangClass(m.title)}`}>{m.title}</h3>
                    )}
                    <div className="flex items-center space-x-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                      <span>{m.date}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                      <span className="text-blue-500/80">{m.attendees?.split(',').length || 0} Participants</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!isEditing && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEditing(m); }}
                      className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                      <span className="sr-only">Edit</span>
                    </button>

                  )}
                  {isSuperAdmin && !isEditing && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteMeeting(m.id); }}
                      className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-900/20 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                     <ArrowRightCircle size={18} className="text-slate-700" />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-5 lg:p-6 animate-in slide-in-from-top-2">
                  {isEditing ? (
                    <div className="space-y-5 pb-20">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 font-bold">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Protocol Date</label>
                          <input 
                            type="date" 
                            className="financial-input w-full py-2 text-sm font-bold" 
                            value={editDraft?.date || ''} 
                            onChange={e => setEditDraft({...editDraft, date: e.target.value})}
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Attendees (CSV Protocol)</label>
                          <input 
                            className="financial-input w-full py-2 text-sm font-bold" 
                            value={editDraft?.attendees || ''} 
                            onChange={e => setEditDraft({...editDraft, attendees: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Critical Agenda</label>
                          <RichEditor value={editDraft?.agenda || ""} onChange={(v: string) => setEditDraft({...editDraft, agenda: v})} onEscape={() => { setEditingId(null); setEditDraft(null); }} minRows={4} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest ml-1">Way Forward</label>
                          <RichEditor value={editDraft?.way_forward || ""} onChange={(v: string) => setEditDraft({...editDraft, way_forward: v})} onEscape={() => { setEditingId(null); setEditDraft(null); }} minRows={4} />
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-6 space-x-3 border-t border-slate-800/60 mt-4">
                        <button 
                          onClick={() => { setEditingId(null); setEditDraft(null); }}
                          className="px-6 py-3 bg-slate-800 text-slate-400 text-[10px] font-black rounded-xl hover:bg-slate-700 transition-colors uppercase"
                        >
                          Abort Alignment
                        </button>
                        <button 
                          onClick={commitUpdate}
                          className="flex-1 flex items-center justify-center bg-blue-600 text-white text-[11px] font-black px-6 py-3 rounded-xl shadow-xl hover:bg-blue-500 transition-all border border-blue-400/20 active:scale-95"
                        >
                          <Check size={14} className="mr-2" /> COMMIT ALIGNMENT UPDATES
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center"><FileText size={12} className="mr-2"/> Briefing Agenda</p>
                          <div className={`text-sm text-slate-300 leading-relaxed font-medium bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 shadow-inner rich-content ${getLangClass(m.agenda)}`} dangerouslySetInnerHTML={{ __html: m.agenda }} />
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center"><ArrowRightCircle size={12} className="mr-2"/> Way Forward</p>
                          <div className={`text-sm text-emerald-100/80 leading-relaxed font-medium bg-emerald-900/10 p-4 rounded-xl border border-emerald-500/20 shadow-inner rich-content ${getLangClass(m.way_forward)}`} dangerouslySetInnerHTML={{ __html: m.way_forward }} />
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-slate-800/60 flex flex-wrap gap-4 items-center justify-between">
                         <div className="flex items-center space-x-3">
                            <div className="flex -space-x-2">
                               {m.attendees?.split(',').slice(0,3).map((_item: string, i: number) => (
                                 <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[10px] font-black text-blue-400"><User size={14}/></div>
                               ))}
                            </div>
                            <span className="text-xs font-bold text-slate-400 line-clamp-1">{m.attendees}</span>
                         </div>
                         <div className="flex items-center text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">
                            <User size={12} className="mr-1.5"/> Logger: {m.created_by}
                         </div>
                      </div>
                    </>
                  )}
                  
                  <div className="mt-6 pt-6 border-t border-slate-800/60">
                     <AttachmentManager collectionName="meetings" docId={m.id} attachments={m.attachments} isSuperAdmin={isSuperAdmin} />
                     <LinkedActions parentId={m.id} parentType="meeting" userEmail={user?.email} />
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

