import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import LoadingSpinner from '../components/LoadingSpinner';
export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [att, setAtt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState('all');
  useEffect(() => {
    (async () => {
      let t = await getDocs(query(collection(db, 'teams'), where('coachIds', 'array-contains', user.uid)));
      let teamsData = t.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!teamsData.length) {
        const fallback = await getDocs(query(collection(db, 'teams'), where('coachId', '==', user.uid)));
        teamsData = fallback.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setTeams(teamsData);
      const teamIds = teamsData.map((team) => team.id);
      const athleteResults = [];
      const attendanceResults = [];
      if (teamIds.length) {
        const chunked = [];
        for (let i = 0; i < teamIds.length; i += 10) {
          chunked.push(teamIds.slice(i, i + 10));
        }
        for (const chunk of chunked) {
          const aSnap = await getDocs(query(collection(db, 'athletes'), where('teamId', 'in', chunk)));
          athleteResults.push(...aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          const rSnap = await getDocs(query(collection(db, 'attendance'), where('teamId', 'in', chunk)));
          attendanceResults.push(...rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      }
      setAthletes(athleteResults);
      setAtt(attendanceResults);
      setLoading(false);
    })();
  }, [user.uid]);
  const fa = sel === 'all' ? athletes : athletes.filter(a => a.teamId === sel);
  const am = {}; fa.forEach(a => { am[a.id] = a; });
  const fAtt = att.filter(r => { if (sel !== 'all' && r.teamId !== sel) return false; return am[r.athleteId]; });
  const summary = fa.map(a => {
    const rs = fAtt.filter(r => r.athleteId === a.id);
    const total = rs.length;
    const p = rs.filter(r => (r.coachStatus || r.athleteStatus) === 'present').length;
    const ab = rs.filter(r => (r.coachStatus || r.athleteStatus) === 'absent').length;
    const e = rs.filter(r => (r.coachStatus || r.athleteStatus) === 'excused').length;
    const l = rs.filter(r => (r.coachStatus || r.athleteStatus) === 'late').length;
    return { id: a.id, Name: a.name, '#': a.jerseyNumber || '', Team: teams.find(t => t.id === a.teamId)?.name || '', Cleared: a.isCleared !== false ? 'Yes' : 'No', Days: total, Present: p, Absent: ab, Excused: e, Late: l };
  });
  const expCSV = () => { if (!summary.length) return toast.error('No data'); const h = Object.keys(summary[0]).join(','); const rows = summary.map(r => Object.values(r).map(v => '\"'+v+'\"').join(',')); const b = new Blob([h+'\n'+rows.join('\n')], { type: 'text/csv' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'ct-'+dayjs().format('YYYY-MM-DD')+'.csv'; a.click(); toast.success('CSV done'); };
  const expXLSX = () => { if (!summary.length) return toast.error('No data'); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary'); XLSX.writeFile(wb, 'ct-'+dayjs().format('YYYY-MM-DD')+'.xlsx'); toast.success('Excel done'); };
  if (loading) return <LoadingSpinner />;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">← Back</button>
          <h1 className="text-2xl font-extrabold">Reports</h1>
        </div>
        <div className="flex gap-2"><button onClick={expCSV} disabled={!summary.length} className="btn-secondary">CSV</button><button onClick={expXLSX} disabled={!summary.length} className="btn-gold">Excel</button></div>
      </div>
      <div className="card grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div><label className="label">Team</label><select className="input" value={sel} onChange={e => { setSel(e.target.value); }}><option value="all">All</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div className="sm:col-span-2">
              <div className="mt-2 text-sm text-slate-500">
            Practice totals are shown across the selected team, without per-date filtering.
          </div>
        </div>
        <div className="flex items-end text-sm text-gray-500"><p>{summary.length} athletes</p></div>
      </div>
      {!summary.length ? <div className="card text-center py-12"><p className="text-gray-500">No data</p></div> : <div className="card p-0 overflow-x-auto"><table className="min-w-[680px] w-full text-sm"><thead><tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase"><th className="px-3 py-3">Name</th><th className="px-3 py-3">Team</th><th className="px-3 py-3">Cleared</th><th className="px-3 py-3">Days</th><th className="px-3 py-3">Present</th><th className="px-3 py-3">Absent</th><th className="px-3 py-3">Excused</th><th className="px-3 py-3">Late</th></tr></thead><tbody className="divide-y divide-gray-100">{summary.map((r) => <tr key={r.id} className="hover:bg-gray-50"><td className="px-3 py-2 font-medium"><button type="button" onClick={() => navigate(`/athletes/${r.id}`)} className="text-left text-school-600 hover:underline">{r.Name}</button></td><td className="px-3 py-2 text-gray-500">{r.Team}</td><td className="px-3 py-2"><span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + (r.Cleared === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>{r.Cleared}</span></td><td className="px-3 py-2">{r.Days}</td><td className="px-3 py-2 text-emerald-600 font-semibold">{r.Present}</td><td className="px-3 py-2 text-red-600">{r.Absent}</td><td className="px-3 py-2 text-amber-600">{r.Excused}</td><td className="px-3 py-2 text-blue-600">{r.Late}</td></tr>)}</tbody></table></div>}
    </div>
  );
}
