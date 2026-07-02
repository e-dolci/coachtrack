import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import LoadingSpinner from '../components/LoadingSpinner';
const L = { present: 'bg-emerald-100 text-emerald-700', absent: 'bg-red-100 text-red-700', excused: 'bg-amber-100 text-amber-700', late: 'bg-blue-100 text-blue-700' };
export default function AttendanceHistory() {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [att, setAtt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('all');
  const [fA, setFA] = useState('all');
  const [fS, setFS] = useState('all');
  useEffect(() => {
    (async () => {
      const t = await getDoc(doc(db, 'teams', teamId));
      setTeam({ id: t.id, ...t.data() });
      const a = await getDocs(query(collection(db, 'athletes'), where('teamId', '==', teamId)));
      setAthletes(a.docs.map(d => ({ id: d.id, ...d.data() })));
      const r = await getDocs(query(collection(db, 'attendance'), where('teamId', '==', teamId)));
      setAtt(r.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
      setLoading(false);
    })();
  }, [teamId]);
  const am = {}; athletes.forEach(a => { am[a.id] = a; });
  const dateOptions = Array.from(new Set(att.map((r) => r.date))).sort((a, b) => b.localeCompare(a));
  const fl = att.filter(r => { if (selectedDate !== 'all' && r.date !== selectedDate) return false; if (fA !== 'all' && r.athleteId !== fA) return false; if (fS !== 'all') { const f = r.coachStatus || r.athleteStatus; if (f !== fS) return false; } return true; });
  if (loading) return <LoadingSpinner />;
  return (
    <div className="space-y-6">
      <div><Link to={`/teams/${teamId}`} className="text-sm text-school-500 hover:underline">&larr; {team?.name}</Link><h1 className="text-2xl font-extrabold mt-1">Attendance History</h1></div>
      <div className="card grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <label className="label">Date</label>
          <select className="input mt-2" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
            <option value="all">All dates</option>
            {dateOptions.map((date) => (
              <option key={date} value={date}>{dayjs(date).format('dddd, MMM D')}</option>
            ))}
          </select>
        </div>
        <div><label className="label">Athlete</label><select className="input" value={fA} onChange={e => setFA(e.target.value)}><option value="all">All</option>{athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        <div><label className="label">Status</label><select className="input" value={fS} onChange={e => setFS(e.target.value)}><option value="all">All</option><option value="present">Present</option><option value="absent">Absent</option><option value="excused">Excused</option><option value="late">Late</option></select></div>
      </div>
      {fl.length === 0 ? <div className="card text-center py-12"><p className="text-gray-500">No records</p></div> : <div className="space-y-4">{Object.entries(fl.reduce((g, r) => { if (!g[r.date]) g[r.date] = []; g[r.date].push(r); return g; }, {})).sort(([a], [b]) => b.localeCompare(a)).map(([date, rs]) => {
        const sortedRows = rs.sort((a, b) => (am[a.athleteId]?.name || '').localeCompare(am[b.athleteId]?.name || ''));
        return (
          <div key={date} className="card p-4">
            <h3 className="font-bold mb-3">{dayjs(date).format('dddd, MMMM D, YYYY')}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase">
                  <th className="pb-2 font-semibold">Athlete</th>
                  <th className="pb-2 font-semibold">Coach</th>
                  <th className="pb-2 font-semibold">Self</th>
                  <th className="pb-2 font-semibold">Final</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(r => {
                  const f = r.coachStatus || r.athleteStatus;
                  return (
                    <tr key={r.id} className="border-b border-gray-50">
                      <td className="py-2 font-medium"><Link to={`/athletes/${r.athleteId}`} className="text-school-600 hover:underline">{am[r.athleteId]?.name || '?'}</Link></td>
                      <td className="py-2">{r.coachStatus || '—'}</td>
                      <td className="py-2">{r.markedByAthlete ? r.athleteStatus : '—'}</td>
                      <td className="py-2"><span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + (L[f] || 'bg-gray-100 text-gray-500')}>{f || '—'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}</div>}
    </div>
  );
}
