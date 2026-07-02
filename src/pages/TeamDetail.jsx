import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
export default function TeamDetail() {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [teamCoaches, setTeamCoaches] = useState([]);
  const [coachEmail, setCoachEmail] = useState('');
  const [addingCoach, setAddingCoach] = useState(false);
  const [athletes, setAthletes] = useState([]);
  const [practiceDates, setPracticeDates] = useState([]);
  const [newPracticeDate, setNewPracticeDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [practiceTime, setPracticeTime] = useState('18:00');
  const [newPracticeName, setNewPracticeName] = useState('Practice');
  const [calendarMonth, setCalendarMonth] = useState(dayjs());
  const [practiceSaving, setPracticeSaving] = useState(false);
  const [selectedPracticeDate, setSelectedPracticeDate] = useState(null);
  const [selectedPracticeDates, setSelectedPracticeDates] = useState([]);
  const [editPracticeDate, setEditPracticeDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [editPracticeTime, setEditPracticeTime] = useState('18:00');
  const [editPracticeName, setEditPracticeName] = useState('Practice');
  const [editPracticeNotes, setEditPracticeNotes] = useState('');
  const [editingPractice, setEditingPractice] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const teamSnap = await getDoc(doc(db, 'teams', teamId));
      if (!teamSnap.exists()) { setLoading(false); return; }
      const teamData = { id: teamSnap.id, ...teamSnap.data() };
      const coachIds = teamData.coachIds?.length ? teamData.coachIds : teamData.coachId ? [teamData.coachId] : [];
      if (!teamData.coachIds && teamData.coachId) {
        await updateDoc(doc(db, 'teams', teamId), { coachIds });
      }
      setTeam({ ...teamData, coachIds });
      const coachDocs = await Promise.all(coachIds.map(async (coachId) => {
        const snap = await getDoc(doc(db, 'coaches', coachId));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
      }));
      setTeamCoaches(coachDocs.filter(Boolean));
      const aSnap = await getDocs(query(collection(db, 'athletes'), where('teamId', '==', teamId)));
      setAthletes(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const pSnap = await getDocs(query(collection(db, 'practices'), where('teamId', '==', teamId)));
      setPracticeDates(pSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.date.localeCompare(b.date)));
      setLoading(false);
    })();
  }, [teamId]);
  const selectedPractice = practiceDates.find((p) => p.date === selectedPracticeDate);
  useEffect(() => {
    if (selectedPractice) {
      setEditPracticeDate(selectedPractice.date);
      setEditPracticeTime(selectedPractice.time || '18:00');
      setEditPracticeName(selectedPractice.name || 'Practice');
      setEditPracticeNotes(selectedPractice.notes || '');
    }
  }, [selectedPractice]);
  const addPracticeDate = async (e) => {
    e.preventDefault();
    const selectedDates = selectedPracticeDates.length ? selectedPracticeDates : newPracticeDate ? [newPracticeDate] : [];
    if (!selectedDates.length) return;
    setPracticeSaving(true);
    try {
      await Promise.all(selectedDates.map((date) =>
        addDoc(collection(db, 'practices'), {
          teamId,
          date,
          time: practiceTime,
          name: newPracticeName,
          createdAt: new Date().toISOString(),
        })
      ));
      setNewPracticeDate(dayjs().format('YYYY-MM-DD'));
      setPracticeTime('18:00');
      setNewPracticeName('Practice');
      setSelectedPracticeDates([]);
      const pSnap = await getDocs(query(collection(db, 'practices'), where('teamId', '==', teamId)));
      setPracticeDates(pSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.date.localeCompare(b.date)));
      toast.success('Practice added');
    } catch (err) {
      toast.error('Failed to add practice date');
    } finally {
      setPracticeSaving(false);
    }
  };

  const updatePractice = async () => {
    if (!selectedPractice) return;
    setEditingPractice(true);
    try {
      await updateDoc(doc(db, 'practices', selectedPractice.id), { date: editPracticeDate, time: editPracticeTime, name: editPracticeName, notes: editPracticeNotes, updatedAt: new Date().toISOString() });
      const pSnap = await getDocs(query(collection(db, 'practices'), where('teamId', '==', teamId)));
      const refreshed = pSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.date.localeCompare(b.date));
      setPracticeDates(refreshed);
      setSelectedPracticeDate(editPracticeDate);
      toast.success('Practice updated');
    } catch (err) {
      toast.error('Unable to update practice');
    } finally {
      setEditingPractice(false);
    }
  };

  const removePracticeDate = async (id) => {
    if (!confirm('Remove this practice date?')) return;
    try {
      await deleteDoc(doc(db, 'practices', id));
      setPracticeDates(practiceDates.filter((p) => p.id !== id));
      if (selectedPractice?.id === id) setSelectedPracticeDate(null);
      toast.success('Practice removed');
    } catch (err) {
      toast.error('Unable to remove practice');
    }
  };

  const addCoachToTeam = async () => {
    if (!coachEmail.trim()) return toast.error('Enter a coach email');
    setAddingCoach(true);
    try {
      const coachSnap = await getDocs(query(collection(db, 'coaches'), where('email', '==', coachEmail.trim().toLowerCase())));
      if (coachSnap.empty) throw new Error('Coach not found');
      const coachDoc = coachSnap.docs[0];
      const coachId = coachDoc.id;
      if (team?.coachIds?.includes(coachId)) throw new Error('Coach already added');
      await updateDoc(doc(db, 'teams', teamId), { coachIds: arrayUnion(coachId) });
      const updatedTeam = { ...team, coachIds: [...(team.coachIds || []), coachId] };
      setTeam(updatedTeam);
      setTeamCoaches([...teamCoaches, { id: coachId, ...coachDoc.data() }]);
      setCoachEmail('');
      toast.success('Coach added to the team');
    } catch (err) {
      toast.error(err.message || 'Unable to add coach');
    } finally {
      setAddingCoach(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!team) return <p className="text-center text-gray-500 py-8">Not found</p>;
  return (
    <div className="space-y-6">
      <div><Link to="/teams" className="text-sm text-school-500 hover:underline">&larr; All Teams</Link><h1 className="text-2xl sm:text-3xl font-extrabold mt-1">{team.name}</h1><p className="text-gray-500">{team.sport} · Season {team.season} · Code: <span className="font-mono font-bold">{team.teamCode}</span></p></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center"><p className="text-3xl font-extrabold">{athletes.length}</p><p className="text-xs text-gray-500">Athletes</p></div>
        <Link to={`/teams/${teamId}/roster?status=cleared`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center hover:shadow-md transition">
          <p className="text-3xl font-extrabold text-emerald-600">{athletes.filter(a => a.isCleared !== false).length}</p>
          <p className="text-xs text-gray-500">Cleared</p>
        </Link>
        <Link to={`/teams/${teamId}/roster?status=not-cleared`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center hover:shadow-md transition">
          <p className="text-3xl font-extrabold text-red-600">{athletes.filter(a => a.isCleared === false).length}</p>
          <p className="text-xs text-gray-500">Not Cleared</p>
        </Link>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center"><p className="text-3xl font-extrabold">{team.season}</p><p className="text-xs text-gray-500">Season</p></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Team coaches</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {teamCoaches.length ? teamCoaches.map((coach) => (
              <div key={coach.id} className="rounded-2xl bg-slate-50 p-3 border border-slate-200">
                <p className="font-semibold">{coach.name}</p>
                <p className="text-xs text-slate-500">{coach.email}</p>
              </div>
            )) : <p className="text-slate-500">No coaches added yet.</p>}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Add coach</p>
          <div className="mt-3 space-y-3">
            <input type="email" className="input w-full" placeholder="Coach email" value={coachEmail} onChange={(e) => setCoachEmail(e.target.value)} />
            <button type="button" onClick={addCoachToTeam} disabled={addingCoach} className="btn-primary w-full">{addingCoach ? 'Adding...' : 'Add coach'}</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to={`/teams/${teamId}/roster`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center hover:shadow-md"><span className="text-2xl">📋</span><p className="text-sm font-semibold mt-1">Roster</p></Link>
        <Link to={`/teams/${teamId}/attendance?mode=take`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center hover:shadow-md"><span className="text-2xl">✅</span><p className="text-sm font-semibold mt-1">Attendance</p></Link>
        <Link to={`/teams/${teamId}/attendance-history`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center hover:shadow-md"><span className="text-2xl">📅</span><p className="text-sm font-semibold mt-1">History</p></Link>
        <Link to="/reports" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center hover:shadow-md"><span className="text-2xl">📊</span><p className="text-sm font-semibold mt-1">Reports</p></Link>
      </div>

      <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-gray-500">Practice schedule</p>
            <h2 className="text-2xl font-bold text-slate-900">Coach calendar</h2>
          </div>
          <form onSubmit={addPracticeDate} className="grid gap-3 sm:grid-flow-col sm:auto-cols-max sm:items-center">
            <input type="date" className="input w-full sm:w-auto" value={newPracticeDate} onChange={e => setNewPracticeDate(e.target.value)} />
            <input type="time" className="input w-full sm:w-auto" value={practiceTime} onChange={e => setPracticeTime(e.target.value)} />
            <input type="text" className="input w-full sm:w-auto" placeholder="Practice name" value={newPracticeName} onChange={e => setNewPracticeName(e.target.value)} />
            <button type="submit" disabled={practiceSaving} className="btn-primary whitespace-nowrap">{practiceSaving ? 'Saving...' : 'Add practice'}</button>
          </form>
          {selectedPracticeDates.length > 0 && (
            <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {selectedPracticeDates.length === 1 ? '1 date selected for practice creation.' : `${selectedPracticeDates.length} dates selected for practice creation.`}
              <button type="button" onClick={() => setSelectedPracticeDates([])} className="ml-3 text-school-500 font-semibold hover:text-school-600">Clear selection</button>
            </div>
          )}
        </div>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <button type="button" onClick={() => setCalendarMonth(calendarMonth.subtract(1, 'month'))} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">←</button>
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Month</p>
              <p className="text-lg font-semibold text-slate-900">{calendarMonth.format('MMMM YYYY')}</p>
            </div>
            <button type="button" onClick={() => setCalendarMonth(calendarMonth.add(1, 'month'))} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">→</button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.25em] text-slate-500">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <div key={day} className="py-1">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2 mt-2">
            {Array.from({ length: calendarMonth.startOf('month').day() }).map((_, index) => <div key={`blank-${index}`} className="h-20 rounded-3xl bg-white" />)}
            {Array.from({ length: calendarMonth.daysInMonth() }).map((_, index) => {
              const date = calendarMonth.date(index + 1);
              const dateStr = date.format('YYYY-MM-DD');
              const practice = practiceDates.find((p) => p.date === dateStr);
              const isMultiSelected = selectedPracticeDates.includes(dateStr);
              const isSelectedPractice = selectedPracticeDate === dateStr;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => {
                    if (practice) {
                      setSelectedPracticeDate(dateStr);
                      return;
                    }
                    setSelectedPracticeDates((current) =>
                      current.includes(dateStr)
                        ? current.filter((d) => d !== dateStr)
                        : [...current, dateStr]
                    );
                  }}
                  className={`min-h-[5rem] rounded-3xl border p-3 text-left transition ${practice ? 'border-school-500 bg-sky-50 hover:bg-sky-100' : 'border-slate-200 bg-white hover:bg-slate-100'} ${isMultiSelected ? 'ring-2 ring-school-500 bg-sky-100' : ''} ${isSelectedPractice ? 'ring-2 ring-school-500' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-900">{date.date()}</span>
                    {practice && <span className="rounded-full bg-school-500 px-2 py-0.5 text-[10px] font-semibold text-white">Practice</span>}
                  </div>
                  {practice ? (
                    <div className="text-xs text-slate-700 space-y-1">
                      <p>{dayjs(practice.date).format('MMM D')}</p>
                      <p>Time: {practice.time || 'TBD'}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No practice</p>
                  )}
                </button>
              );
            })}
          </div>
          {selectedPracticeDate && (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-gray-500">Practice selected</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{dayjs(selectedPracticeDate).format('dddd, MMMM D, YYYY')}</p>
                </div>
                <button type="button" onClick={() => setSelectedPracticeDate(null)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Clear selection</button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => navigate(`/teams/${teamId}/attendance?date=${selectedPracticeDate}&mode=take`)} className="rounded-3xl bg-school-500 px-4 py-3 text-sm font-semibold text-white hover:bg-school-600">Take attendance</button>
                <button type="button" onClick={() => navigate(`/teams/${teamId}/attendance?date=${selectedPracticeDate}&mode=view`)} className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50">View who was there</button>
              </div>
              {selectedPractice && (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-gray-500">Edit practice</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">Change date, name, or notes</p>
                    </div>
                    <button type="button" onClick={() => removePracticeDate(selectedPractice.id)} className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">Delete practice</button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Practice date</label>
                      <input type="date" className="input w-full" value={editPracticeDate} onChange={(e) => setEditPracticeDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Practice time</label>
                      <input type="time" className="input w-full" value={editPracticeTime} onChange={(e) => setEditPracticeTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div>
                      <label className="label">Practice name</label>
                      <input type="text" className="input w-full" value={editPracticeName} onChange={(e) => setEditPracticeName(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Notes (visible to athletes)</label>
                      <textarea rows={3} className="input w-full" value={editPracticeNotes} onChange={(e) => setEditPracticeNotes(e.target.value)} />
                    </div>
                  </div>
                  <button type="button" onClick={updatePractice} disabled={editingPractice} className="mt-4 rounded-3xl bg-school-500 px-4 py-3 text-sm font-semibold text-white hover:bg-school-600 disabled:opacity-60">{editingPractice ? 'Saving...' : 'Save practice changes'}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
