import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
const C = { present: 'bg-emerald-100 text-emerald-700', absent: 'bg-red-100 text-red-700', excused: 'bg-amber-100 text-amber-700', late: 'bg-blue-100 text-blue-700', unmarked: 'bg-gray-100 text-gray-500' };
export default function AthleteProfile() {
  const { athleteId } = useParams();
  const [a, setA] = useState(null);
  const [team, setTeam] = useState(null);
  const [att, setAtt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [notes, setNotes] = useState('');
  useEffect(() => {
    (async () => {
      const s = await getDoc(doc(db, 'athletes', athleteId));
      if (!s.exists()) { setLoading(false); return; }
      const d = { id: s.id, ...s.data() };
      setA(d); setNotes(d.notes || '');
      if (d.teamId) { const t = await getDoc(doc(db, 'teams', d.teamId)); if (t.exists()) setTeam({ id: t.id, ...t.data() }); }
      const r = await getDocs(query(collection(db, 'attendance'), where('athleteId', '==', athleteId)));
      setAtt(r.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, [athleteId]);
  const save = async () => { await updateDoc(doc(db, 'athletes', athleteId), { notes }); toast.success('Saved'); setEdit(false); };
  const toggle = async () => { await updateDoc(doc(db, 'athletes', athleteId), { isCleared: !a.isCleared }); setA({ ...a, isCleared: !a.isCleared }); toast.success('Updated'); };
  if (loading) return <LoadingSpinner />;
  if (!a) return <p className="text-center text-gray-500 py-8">Not found</p>;
  const total = att.length;
  const present = att.filter(x => (x.coachStatus || x.athleteStatus) === 'present').length;
  const absent = att.filter(x => (x.coachStatus || x.athleteStatus) === 'absent').length;
  const excused = att.filter(x => (x.coachStatus || x.athleteStatus) === 'excused').length;
  const late = att.filter(x => (x.coachStatus || x.athleteStatus) === 'late').length;
  const recent = [...att].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 20);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-2">
        <div><Link to={team ? `/teams/${team.id}` : '/teams'} className="text-sm text-school-500 hover:underline">&larr; {team?.name || 'Teams'}</Link><h1 className="text-2xl font-extrabold mt-1">{a.name}</h1><p className="text-gray-500">#{a.jerseyNumber || 'N/A'} \u00b7 {a.position || 'No position'}</p></div>
        <button onClick={toggle} className={'btn ' + (a.isCleared !== false ? 'btn-success' : 'btn-danger')}>{a.isCleared !== false ? '\u2705 Cleared' : '\u274c Not Cleared'}</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card p-4 text-center"><p className="text-2xl font-extrabold">{total}</p><p className="text-xs text-gray-500">Days</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-extrabold text-emerald-600">{present}</p><p className="text-xs text-gray-500">Present</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-extrabold text-red-600">{absent}</p><p className="text-xs text-gray-500">Absent</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-extrabold text-amber-600">{excused}</p><p className="text-xs text-gray-500">Excused</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-extrabold text-blue-600">{late}</p><p className="text-xs text-gray-500">Late</p></div>
      </div>
      <div className="card"><div className="flex justify-between items-center mb-3"><h2 className="text-lg font-bold">Notes</h2>{!edit && <button onClick={() => setEdit(true)} className="text-sm text-school-500 hover:underline">Edit</button>}</div>{edit ? <div className="space-y-2"><textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} /><div className="flex gap-2"><button onClick={save} className="btn-primary text-sm">Save</button><button onClick={() => { setNotes(a.notes || ''); setEdit(false); }} className="btn-secondary text-sm">Cancel</button></div></div> : <p className={'text-sm ' + (a.notes ? 'text-gray-700' : 'text-gray-400 italic')}>{a.notes || 'No notes yet.'}</p>}</div>
      <div className="card"><h2 className="text-lg font-bold mb-3">Recent Attendance</h2>{recent.length === 0 ? <p className="text-gray-400 text-sm">None yet.</p> : <table className="w-full text-sm"><thead><tr className="text-left text-gray-500 border-b text-xs uppercase"><th className="pb-2 font-semibold">Date</th><th className="pb-2 font-semibold">Coach</th><th className="pb-2 font-semibold">Self</th><th className="pb-2 font-semibold">Status</th></tr></thead><tbody>{recent.map(r => { const f = r.coachStatus || r.athleteStatus || 'unmarked'; return <tr key={r.id} className="border-b border-gray-50"><td className="py-2 font-medium">{dayjs(r.date).format('MMM D, YYYY')}</td><td className="py-2">{r.coachStatus || '\u2014'}</td><td className="py-2">{r.markedByAthlete ? r.athleteStatus : '\u2014'}</td><td className="py-2"><span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + (C[f] || 'bg-gray-100 text-gray-500')}>{f}</span></td></tr>; })}</tbody></table>}</div>
    </div>
  );
}
