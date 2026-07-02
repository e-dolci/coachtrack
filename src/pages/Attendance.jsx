import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, updateDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import LoadingSpinner from '../components/LoadingSpinner';
const S = [
  { k: 'present', l: 'Present', c: 'bg-emerald-100 text-emerald-800', i: '\u2705' },
  { k: 'absent', l: 'Absent', c: 'bg-red-100 text-red-800', i: '\u274c' },
  { k: 'excused', l: 'Excused', c: 'bg-amber-100 text-amber-800', i: '\ud83d\udcdd' },
  { k: 'late', l: 'Late', c: 'bg-blue-100 text-blue-800', i: '\u23f0' },
];
export default function Attendance() {
  const { teamId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(searchParams.get('date') || dayjs().format('YYYY-MM-DD'));
  const [search, setSearch] = useState('');
  const [changed, setChanged] = useState(0);
  const mode = searchParams.get('mode') || 'take';
  const getSelfStatus = (id) => records[id]?.markedByAthlete ? records[id]?.athleteStatus : null;
  const getEffectiveStatus = (id) => records[id]?.coachStatus || getSelfStatus(id);
  const getStatusMeta = (status) => S.find((item) => item.k === status) || { l: 'Not marked', c: 'bg-slate-100 text-slate-600', i: '' };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await getDoc(doc(db, 'teams', teamId));
      if (!t.exists()) { setLoading(false); return; }
      setTeam({ id: t.id, ...t.data() });
      const a = await getDocs(query(collection(db, 'athletes'), where('teamId', '==', teamId)));
      setAthletes(a.docs.map(d => ({ id: d.id, ...d.data() })));
      const r = await getDocs(query(collection(db, 'attendance'), where('teamId', '==', teamId), where('date', '==', date)));
      const m = {}; r.docs.forEach(d => { const x = d.data(); m[x.athleteId] = { id: d.id, ...x }; });
      setRecords(m);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [teamId, date]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const paramDate = searchParams.get('date');
    if (paramDate && paramDate !== date) {
      setDate(paramDate);
    }
  }, [searchParams]);
  const setStatus = (id, s) => {
    if (records[id]?.coachStatus === s) return;
    setRecords(p => ({ ...p, [id]: { ...p[id], athleteId: id, teamId, coachId: user.uid, date, coachStatus: s, updatedAt: new Date().toISOString() } }));
    setChanged(c => c + 1);
  };
  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(athletes.map(async (a) => {
        const r = records[a.id];
        if (!r) return;
        if (r.id) await updateDoc(doc(db, 'attendance', r.id), { coachStatus: r.coachStatus, updatedAt: new Date().toISOString() });
        else await addDoc(collection(db, 'attendance'), { athleteId: a.id, teamId, coachId: user.uid, date, athleteStatus: r.athleteStatus || null, coachStatus: r.coachStatus, markedByAthlete: r.markedByAthlete || false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }));
      toast.success('Saved');
      setChanged(0);
    } catch (err) { toast.error('Failed'); } finally { setSaving(false); }
  };
  if (loading) return <LoadingSpinner />;
  if (!team) return <p className="text-center text-gray-500 py-8">Not found</p>;
  const filteredAthletes = athletes.filter(a => {
    if (mode === 'view') {
      const effective = getEffectiveStatus(a.id);
      if (!['present', 'late', 'excused'].includes(effective)) return false;
    }
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return a.name.toLowerCase().includes(q) || String(a.jerseyNumber || '').includes(q) || (a.position || '').toLowerCase().includes(q);
  });
  const pageTitle = mode === 'view' ? 'Review Attendance' : 'Take Attendance';
  const pageDescription = mode === 'view'
    ? 'Review the final attendance list for this practice. Only present, excused, or late athletes are shown.'
    : 'Review self-reported attendance and mark or override status for each athlete.';
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link to={`/teams/${teamId}`} className="text-sm text-school-500 hover:underline">&larr; {team?.name}</Link>
          <h1 className="text-2xl font-extrabold mt-1">{pageTitle}</h1>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">{pageDescription}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="text" className="input" placeholder="Search players" value={search} onChange={e => setSearch(e.target.value)} />
          <input type="date" className="input w-auto" value={date} onChange={e => { setDate(e.target.value); setSearchParams({ date: e.target.value, mode }); }} />
          {mode === 'take' ? (
            <button onClick={saveAll} disabled={saving || changed === 0} className="btn-primary">{saving ? 'Saving...' : changed > 0 ? 'Save (' + changed + ')' : 'Saved'}</button>
          ) : null}
        </div>
      </div>
      {athletes.length === 0 ? <div className="card text-center py-12"><p className="text-gray-500">No athletes.</p></div> : (
        <div className="space-y-2">{athletes.map(a => {
          const athleteStatus = getSelfStatus(a.id);
          const coachStatus = records[a.id]?.coachStatus || null;
          const effective = getEffectiveStatus(a.id);
          const meta = getStatusMeta(effective);
          const borderColor = effective === 'present' ? '#059669' : effective === 'excused' ? '#d97706' : effective === 'late' ? '#2563eb' : '#d1d5db';
          return <div key={a.id} className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={effective ? { borderLeft: '4px solid ' + borderColor } : {}}>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-400 min-w-[2rem]">{a.jerseyNumber || '\u2014'}</span>
              <div>
                <Link to={`/athletes/${a.id}`} className="font-semibold text-school-600 hover:underline">{a.name}</Link>
                <p className="text-xs text-gray-400">{a.position || ''}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-start sm:items-end">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${meta.c}`}>{meta.i} {meta.l}</span>
              {mode === 'take' ? (
                <div className="flex flex-wrap gap-1">
                  {S.map(st => <button key={st.k} onClick={() => setStatus(a.id, st.k)} className={'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ' + (effective === st.k ? st.c + ' border-2' : 'bg-white text-gray-500 border-gray-200')}>{st.i} {st.l}</button>)}
                </div>
              ) : null}
            </div>
          </div>;
        })}</div>
      )}
      {changed > 0 && <div className="text-center"><button onClick={saveAll} disabled={saving} className="btn-primary text-base px-8 py-3">{saving ? 'Saving...' : 'Save All'}</button></div>}
    </div>
  );
}
