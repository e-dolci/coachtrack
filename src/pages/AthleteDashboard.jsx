import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
export default function AthleteDashboard() {
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState(null);
  const [team, setTeam] = useState(null);
  const [coach, setCoach] = useState(null);
  const [teamCoaches, setTeamCoaches] = useState([]);
  const [practiceDates, setPracticeDates] = useState([]);
  const [selectedPracticeDate, setSelectedPracticeDate] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(dayjs());
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceSummary, setAttendanceSummary] = useState({ present: 0, absent: 0, excused: 0, late: 0, total: 0 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', school: '', position: '', jerseyNumber: '' });
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [unjoinLoading, setUnjoinLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    const raw = sessionStorage.getItem('athleteSession') || localStorage.getItem('athleteSession');
    if (!raw) { navigate('/athlete-login'); return; }
    const d = JSON.parse(raw);
    setAthlete(d);
    setProfileForm({ name: d.name || '', email: d.email || '', school: d.school || '', position: d.position || '', jerseyNumber: d.jerseyNumber || '' });
    load(d);
  }, []);
  const load = async (a) => {
    if (a.teamId) {
      const t = await getDoc(doc(db, 'teams', a.teamId));
      if (t.exists()) {
        const teamData = { id: t.id, ...t.data() };
        setTeam(teamData);
        const coachIds = teamData.coachIds?.length ? teamData.coachIds : teamData.coachId ? [teamData.coachId] : [];
        const coaches = await Promise.all(coachIds.map(async (coachId) => {
          const c = await getDoc(doc(db, 'coaches', coachId));
          return c.exists() ? { id: c.id, ...c.data() } : null;
        }));
        const validCoaches = coaches.filter(Boolean);
        setTeamCoaches(validCoaches);
        if (validCoaches.length) {
          setCoach(validCoaches[0]);
        }
        if (coachIds.length && !teamData.coachIds && teamData.coachId) {
          await updateDoc(doc(db, 'teams', teamData.id), { coachIds });
        }
        const practiceSnap = await getDocs(query(collection(db, 'practices'), where('teamId', '==', a.teamId)));
        const practiceList = practiceSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.date || '').localeCompare(b.date));
        setPracticeDates(practiceList);
        if (practiceList.length) {
          setSelectedPractice(practiceList[0]);
          setSelectedPracticeDate(practiceList[0].date);
        }
      }
    }
    const td = dayjs().format('YYYY-MM-DD');
    const att = await getDocs(query(collection(db, 'attendance'), where('athleteId', '==', a.id), where('date', '==', td)));
    if (!att.empty) setToday({ id: att.docs[0].id, ...att.docs[0].data() });
    const all = await getDocs(query(collection(db, 'attendance'), where('athleteId', '==', a.id)));
    const allRecords = all.docs.map(d => ({ id: d.id, ...d.data() }));
    setRecent(allRecords.sort((a, b) => (b.date || '').localeCompare(a.date)).slice(0, 10));
    setAttendanceMap(allRecords.reduce((map, rec) => ({ ...map, [rec.date]: rec }), {}));
    setAttendanceSummary({
      total: allRecords.length,
      present: allRecords.filter(r => (r.coachStatus || r.athleteStatus) === 'present').length,
      absent: allRecords.filter(r => (r.coachStatus || r.athleteStatus) === 'absent').length,
      excused: allRecords.filter(r => (r.coachStatus || r.athleteStatus) === 'excused').length,
      late: allRecords.filter(r => (r.coachStatus || r.athleteStatus) === 'late').length,
    });
    setLoading(false);
  };
  const mark = async () => {
    setMarking(true);
    try {
      const td = dayjs().format('YYYY-MM-DD');
      const nextStatus = todayStatus === 'present' ? 'absent' : 'present';
      const p = {
        athleteId: athlete.id,
        teamId: athlete.teamId,
        coachId: athlete.coachId,
        date: td,
        athleteStatus: nextStatus,
        markedByAthlete: true,
        updatedAt: new Date().toISOString(),
      };
      if (today?.id) await updateDoc(doc(db, 'attendance', today.id), p);
      else await addDoc(collection(db, 'attendance'), { ...p, createdAt: new Date().toISOString() });
      toast.success(nextStatus === 'present' ? 'Marked present!' : 'Marked absent');
      load(athlete);
    } catch (err) { toast.error('Failed'); } finally { setMarking(false); }
  };
  const logout = () => {
    sessionStorage.removeItem('athleteSession');
    localStorage.removeItem('athleteSession');
    navigate('/athlete-login');
  };

  const saveProfile = async () => {
    if (!athlete) return;
    setProfileSaving(true);
    try {
      await updateDoc(doc(db, 'athletes', athlete.id), {
        name: profileForm.name,
        email: profileForm.email,
        school: profileForm.school,
        position: profileForm.position,
        jerseyNumber: profileForm.jerseyNumber ? Number(profileForm.jerseyNumber) : null,
      });
      const updatedAthlete = { ...athlete, ...profileForm };
      setAthlete(updatedAthlete);
      sessionStorage.setItem('athleteSession', JSON.stringify(updatedAthlete));
      localStorage.setItem('athleteSession', JSON.stringify(updatedAthlete));
      toast.success('Profile updated');
      setEditingProfile(false);
    } catch (err) {
      toast.error('Unable to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const joinTeamByCode = async () => {
    if (!joinCode.trim()) return toast.error('Enter a team code');
    if (!athlete) return;
    setJoinLoading(true);
    try {
      const teamSnap = await getDocs(query(collection(db, 'teams'), where('teamCode', '==', joinCode.trim().toUpperCase())));
      if (teamSnap.empty) throw new Error('Team not found');
      const teamData = { id: teamSnap.docs[0].id, ...teamSnap.docs[0].data() };
      await updateDoc(doc(db, 'athletes', athlete.id), { teamId: teamData.id });
      const updatedAthlete = { ...athlete, teamId: teamData.id };
      setAthlete(updatedAthlete);
      setTeam(teamData);
      sessionStorage.setItem('athleteSession', JSON.stringify(updatedAthlete));
      localStorage.setItem('athleteSession', JSON.stringify(updatedAthlete));
      setShowJoinInput(false);
      setJoinCode('');
      toast.success(`Joined ${teamData.name}`);
      load(updatedAthlete);
    } catch (err) {
      toast.error(err.message || 'Unable to join team');
    } finally {
      setJoinLoading(false);
    }
  };

  const removeTeam = async () => {
    if (!athlete) return;
    setUnjoinLoading(true);
    try {
      await updateDoc(doc(db, 'athletes', athlete.id), { teamId: null });
      const updatedAthlete = { ...athlete, teamId: null };
      setAthlete(updatedAthlete);
      setTeam(null);
      setCoach(null);
      setPracticeDates([]);
      setSelectedPracticeDate(null);
      setAttendanceMap({});
      sessionStorage.setItem('athleteSession', JSON.stringify(updatedAthlete));
      localStorage.setItem('athleteSession', JSON.stringify(updatedAthlete));
      toast.success('You have left the team');
    } catch (err) {
      toast.error(err.message || 'Unable to leave team');
    } finally {
      setUnjoinLoading(false);
    }
  };
  if (loading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-slate-300 border-t-slate-700 rounded-full" /></div>;
  const todayStatus = today?.athleteStatus || null;
  const isPresentToday = todayStatus === 'present';
  const selectedPracticeItem = selectedPracticeDate ? practiceDates.find((p) => p.date === selectedPracticeDate) : practiceDates[0] || null;
  const selectedStatus = selectedPracticeItem ? attendanceMap[selectedPracticeItem.date] : null;
  const selectedState = selectedStatus ? (selectedStatus.coachStatus || selectedStatus.athleteStatus) : 'Not marked';
  const isPresent = selectedStatus ? (selectedStatus.coachStatus === 'present' || selectedStatus.athleteStatus === 'present') : false;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-sky-100 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="rounded-[2.5rem] border border-slate-200 bg-white shadow-xl p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Athlete zone</p>
              <h1 className="mt-4 text-5xl font-extrabold tracking-[0.02em] font-serif text-slate-900">Hello, {athlete?.name}.</h1>
              <p className="mt-4 max-w-2xl text-slate-500">Your attendance, coach profile, and practice plan are all in one place. Click any scheduled day to see your status.</p>
            </div>
            <div className="relative">
              <button onClick={() => setSettingsOpen((open) => !open)} className="rounded-full border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Settings</button>
              {settingsOpen && (
                <div className="absolute right-0 top-full mt-3 w-80 rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Personal information</p>
                        <button type="button" onClick={() => setEditingProfile((open) => !open)} className="text-xs font-semibold text-school-500 hover:text-school-600">{editingProfile ? 'Cancel' : 'Edit'}</button>
                      </div>
                      {editingProfile ? (
                        <div className="space-y-3 mt-3">
                          <input type="text" className="input w-full" placeholder="Name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                          <input type="email" className="input w-full" placeholder="Email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
                          <input type="text" className="input w-full" placeholder="School" value={profileForm.school} onChange={(e) => setProfileForm({ ...profileForm, school: e.target.value })} />
                          <input type="text" className="input w-full" placeholder="Position" value={profileForm.position} onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })} />
                          <input type="number" className="input w-full" placeholder="Jersey #" value={profileForm.jerseyNumber} onChange={(e) => setProfileForm({ ...profileForm, jerseyNumber: e.target.value })} />
                          <button type="button" onClick={saveProfile} disabled={profileSaving} className="w-full rounded-2xl bg-school-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{profileSaving ? 'Saving...' : 'Save changes'}</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setEditingProfile(true)} className="mt-3 space-y-2 text-left w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-800 hover:bg-slate-100">
                          <p className="text-sm font-semibold">{athlete?.name || 'Athlete name'}</p>
                          <p className="text-sm text-slate-500">{team?.name ? `Team: ${team.name}` : 'No team yet'}</p>
                          <p className="text-sm text-slate-500">{athlete?.email || 'No email set'}</p>
                          <p className="text-sm text-slate-500">{athlete?.position ? `Position: ${athlete.position}` : 'Position: —'}</p>
                          <p className="text-sm text-slate-500">{athlete?.jerseyNumber ? `Jersey #: ${athlete.jerseyNumber}` : 'Jersey #: —'}</p>
                          <p className="text-xs text-slate-400">Click to edit</p>
                        </button>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Teams joined</p>
                        <button type="button" onClick={() => setShowJoinInput((open) => !open)} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100">+</button>
                      </div>
                      <div className="mt-2 max-h-28 overflow-y-auto text-sm text-slate-600">
                        {team ? (
                          <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="truncate">{team.name}</p>
                            <button type="button" onClick={removeTeam} disabled={unjoinLoading} className="rounded-full p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900">
                              <span role="img" aria-label="Leave team">🗑️</span>
                            </button>
                          </div>
                        ) : (
                          <p className="text-slate-400">Not joined yet</p>
                        )}
                      </div>
                      {showJoinInput && (
                        <div className="mt-3 space-y-3">
                          <input type="text" className="input w-full" placeholder="Enter team code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
                          <button type="button" onClick={joinTeamByCode} disabled={joinLoading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{joinLoading ? 'Joining...' : 'Join team'}</button>
                          <button type="button" onClick={() => { setShowJoinInput(false); setJoinCode(''); }} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Cancel</button>
                        </div>
                      )}
                    </div>
                    <button onClick={logout} className="w-full rounded-2xl bg-school-500 px-4 py-3 text-sm font-semibold text-white">Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>
                     
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Today</p>
              <p className="mt-3 text-5xl font-bold text-slate-900">{isPresentToday ? 'Present' : todayStatus === 'absent' ? 'Absent' : 'Ready'}</p>
              <div className="rounded-3xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm mt-6">
                {dayjs().format('dddd, MMMM D')}
              </div>
              <p className="mt-4 text-sm text-slate-500">{todayStatus === 'present' ? `Marked present` : todayStatus === 'absent' ? 'Marked absent' : 'Tap below when you arrive'}</p>
            </div>
            <button type="button" onClick={() => team && navigate(`/teams/${team.id}`)} className="group rounded-[2rem] border border-slate-200 bg-slate-50 p-6 text-left hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-school-500">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Team</p>
              <p className="mt-3 text-4xl font-bold text-slate-900">{team?.name || 'No team yet'}</p>
              <p className="mt-2 text-sm text-slate-500">{team?.sport || 'Sport'} · Season {team?.season || '—'}</p>
            </button>
          </div>

          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-900 p-8 text-center text-white shadow-lg">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Action</p>
            <button onClick={mark} disabled={marking} className="mt-6 inline-flex w-full justify-center rounded-full bg-sky-500 px-12 py-5 text-xl font-semibold text-white shadow-xl shadow-sky-500/30 transition hover:bg-sky-600 disabled:opacity-50">{marking ? 'Marking...' : isPresentToday ? 'Mark Absent' : 'Mark Present'}</button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white shadow-xl p-6"/>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Practice calendar</p>
                <h2 className="mt-3 text-3xl font-extrabold font-serif text-slate-900">Practice schedule</h2>
              </div>
              <div className="rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">{selectedPracticeDate ? dayjs(selectedPracticeDate).format('MMM D') : 'Tap a date'}</div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <button type="button" onClick={() => setCalendarMonth(calendarMonth.subtract(1, 'month'))} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">←</button>
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Month</p>
                <p className="text-lg font-semibold text-slate-900">{calendarMonth.format('MMMM YYYY')}</p>
              </div>
              <button type="button" onClick={() => setCalendarMonth(calendarMonth.add(1, 'month'))} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.3em] text-slate-500">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <div key={day} className="py-1">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-2">
              {Array.from({ length: calendarMonth.startOf('month').day() }).map((_, index) => <div key={`blank-${index}`} className="h-20 rounded-3xl bg-white" />)}
              {Array.from({ length: calendarMonth.daysInMonth() }).map((_, index) => {
                const date = calendarMonth.date(index + 1);
                const dateStr = date.format('YYYY-MM-DD');
                const practice = practiceDates.find((p) => p.date === dateStr);
                const isSelectedPractice = selectedPracticeDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedPracticeDate(dateStr)}
                    className={`min-h-[4.5rem] rounded-3xl border p-2 text-left transition ${practice ? 'border-school-500 bg-sky-50 hover:bg-sky-100' : 'border-slate-200 bg-white hover:bg-slate-100'} ${isSelectedPractice ? 'ring-2 ring-school-500' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-900">{date.date()}</span>
                      {practice && <span className="rounded-full bg-school-500 px-2 py-0.5 text-[10px] font-semibold text-white">Practice</span>}
                    </div>
                    {practice ? (
                      <div className="text-[11px] text-slate-700 space-y-0.5 leading-tight">
                        <p>{practice.name || 'Practice'}</p>
                        <p>{practice.time || 'TBD'}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No practice</p>
                      )}
                    </button>
                  );
                })}
              <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Selected date</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">{dayjs(selectedPracticeDate).format('dddd, MMMM D')}</h3>
                  </div>
                  <button type="button" onClick={() => setSelectedPracticeDate(null)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Clear</button>
                </div>
                <div className="mt-6 space-y-4">
                  {practiceDates.filter((p) => p.date === selectedPracticeDate).map((practice) => (
                    <div key={practice.id} className="rounded-[1.75rem] bg-white p-4 border border-slate-200">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Practice event</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{practice.name || 'Practice'}</p>
                      <p className="mt-2 text-sm text-slate-500">Time: {practice.time || 'TBD'}</p>
                      {practice.notes ? <p className="mt-3 text-sm text-slate-500">{practice.notes}</p> : <p className="mt-3 text-sm text-slate-400">No coach notes for this event.</p>}
                    </div>
                  ))}
                </div>
              </div>
            &rbrace;
          </div>

          <aside className="space-y-6 rounded-[2.5rem] border border-slate-200 bg-slate-950 p-6 shadow-2xl text-white">
            <div className="rounded-[2rem] bg-slate-900/90 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Team</p>
              <h2 className="mt-4 text-3xl font-extrabold font-serif text-white">{team?.name || 'No team yet'}</h2>
              <p className="mt-3 text-sm text-slate-400">{team?.sport || 'Sport'} · Season {team?.season || '—'}</p>
            </div>
            <div className="rounded-[2rem] bg-slate-900/90 p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Coaches</p>
                <span className="text-xs text-slate-500">{teamCoaches.length} on staff</span>
              </div>
              <div className="mt-5 space-y-3">
                {teamCoaches.length ? teamCoaches.map((coachItem) => (
                  <div key={coachItem.id} className="rounded-3xl bg-slate-950/90 border border-slate-800 p-4">
                    <p className="text-lg font-semibold text-white">{coachItem.name || 'Coach name'}</p>
                    <p className="text-sm text-slate-400">{coachItem.schoolName || 'School name'}</p>
                    <p className="text-sm text-slate-300">Email: <a href={`mailto:${coachItem.email}`} className="text-white underline">{coachItem.email || 'n/a'}</a></p>
                    <p className="text-sm text-slate-300">Phone: <a href={`tel:${coachItem.phone}`} className="text-white underline">{coachItem.phone || 'n/a'}</a></p>
                  </div>
                )) : <p className="text-slate-400">No coach connected yet.</p>}
              </div>
            </div>
            <div className="rounded-[2rem] bg-slate-900/90 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Team report</p>
              <div className="mt-5 space-y-4 text-sm text-slate-300">
                <div className="rounded-3xl bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Coaches</p>
                  <div className="mt-3 space-y-2">
                    {teamCoaches.length ? teamCoaches.map((coachItem) => (
                      <div key={coachItem.id} className="rounded-2xl bg-slate-900/70 p-3">
                        <p className="font-semibold text-white">{coachItem.name || 'Coach'}</p>
                        <p className="text-xs text-slate-400">{coachItem.email || 'No email'}</p>
                      </div>
                    )) : <p className="text-slate-400">No coach assigned yet.</p>}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Cleared</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{athlete?.isCleared !== false ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Practices attended</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{attendanceSummary.present}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-3xl bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Total days</p>
                    <p className="mt-2 text-xl font-semibold text-white">{attendanceSummary.total}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Absent</p>
                    <p className="mt-2 text-xl font-semibold text-white">{attendanceSummary.absent}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Late / Excused</p>
                    <p className="mt-2 text-xl font-semibold text-white">{attendanceSummary.late + attendanceSummary.excused}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] bg-slate-900/90 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Join a team</p>
              <p className="mt-4 text-sm text-slate-300">Enter a team code from your coach to join or switch teams.</p>
              {showJoinInput ? (
                <div className="mt-4 space-y-3">
                  <input type="text" className="input w-full" placeholder="Enter team code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
                  <button type="button" onClick={joinTeamByCode} disabled={joinLoading} className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100 disabled:opacity-60">{joinLoading ? 'Joining...' : 'Join team'}</button>
                  <button type="button" onClick={() => { setShowJoinInput(false); setJoinCode(''); }} className="w-full rounded-full border border-slate-700 bg-transparent px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowJoinInput(true)} className="mt-5 w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">Join another team</button>
              )}
              {team && (
                <button type="button" disabled={unjoinLoading} onClick={removeTeam} className="mt-3 w-full rounded-full border border-slate-700 bg-transparent px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{unjoinLoading ? 'Leaving...' : 'Leave current team'}</button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
&rbrace;</div>)}
