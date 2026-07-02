import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
const navLinks = [
  { to: '/teams', label: 'Teams', icon: '👥' },
];
export default function Layout() {
  const { coachData, logout, updateCoachProfile } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', schoolName: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [teamList, setTeamList] = useState([]);
  const handleLogout = async () => { await logout(); navigate('/login'); };
  useEffect(() => {
    if (!coachData) return;
    setProfileForm({
      name: coachData.name || '',
      email: coachData.email || '',
      schoolName: coachData.schoolName || '',
      phone: coachData.phone || '',
    });
  }, [coachData]);
  const saveProfile = async () => {
    if (!coachData) return;
    setProfileSaving(true);
    try {
      await updateCoachProfile({
        name: profileForm.name,
        email: profileForm.email,
        schoolName: profileForm.schoolName,
        phone: profileForm.phone,
      });
      toast.success('Profile saved');
      setEditingProfile(false);
    } catch (err) {
      toast.error(err.message || 'Unable to save profile');
    } finally {
      setProfileSaving(false);
    }
  };
  useEffect(() => {
    if (!coachData?.uid) return;
    const loadTeams = async () => {
      let snap = await getDocs(query(collection(db, 'teams'), where('coachIds', 'array-contains', coachData.uid)));
      let teams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!teams.length) {
        snap = await getDocs(query(collection(db, 'teams'), where('coachId', '==', coachData.uid)));
        teams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        teams.forEach(async (team) => {
          if (!team.coachIds) {
            await updateDoc(doc(db, 'teams', team.id), { coachIds: [coachData.uid] });
          }
        });
      }
      setTeamList(teams);
    };
    loadTeams();
  }, [coachData]);
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-school-500 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 font-extrabold text-xl tracking-tight"><span className="text-gold-400 text-2xl">🏈</span><span>CoachTrack</span></Link>
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(l => <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>{l.icon} {l.label}</NavLink>)}
              <div className="ml-4 pl-4 border-l border-white/20 flex items-center gap-3 relative">
                <button onClick={() => setSettingsOpen((open) => !open)} className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg">Settings</button>
                {settingsOpen && (
                  <div className="absolute right-0 top-full mt-3 w-80 rounded-3xl border border-white/10 bg-white text-slate-900 shadow-2xl p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Personal information</p>
                          <button type="button" onClick={() => setEditingProfile((open) => !open)} className="text-xs font-semibold text-school-500 hover:text-school-600">{editingProfile ? 'Cancel' : 'Edit'}</button>
                        </div>
                        {editingProfile ? (
                          <div className="space-y-3 mt-3">
                            <input type="text" className="input w-full" placeholder="Name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                            <input type="email" className="input w-full" placeholder="Email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
                            <input type="text" className="input w-full" placeholder="School" value={profileForm.schoolName} onChange={(e) => setProfileForm({ ...profileForm, schoolName: e.target.value })} />
                            <input type="text" className="input w-full" placeholder="Phone" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                            <button type="button" onClick={saveProfile} disabled={profileSaving} className="w-full rounded-2xl bg-school-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{profileSaving ? 'Saving...' : 'Save changes'}</button>
                          </div>
                        ) : (
                          <div className="mt-3 space-y-1">
                            <p className="text-sm font-semibold">{coachData?.name || 'Coach name'}</p>
                            <p className="text-sm text-slate-500">{coachData?.schoolName || 'School'}</p>
                            <p className="mt-2 text-sm text-slate-500">{coachData?.email || 'Email not set'}</p>
                            <p className="mt-1 text-sm text-slate-500">{coachData?.phone || 'Phone not set'}</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Teams joined</p>
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto text-sm text-slate-600">
                          {teamList.length ? teamList.map((team) => <p key={team.id} className="truncate">{team.name}</p>) : <p className="text-slate-400">No teams yet</p>}
                        </div>
                      </div>
                      <button onClick={handleLogout} className="mt-3 w-full rounded-2xl bg-school-500 px-4 py-3 text-sm font-semibold text-white">Logout</button>
                    </div>
                  </div>
                )}
              </div>
            </nav>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/10"><span className="text-2xl">{mobileOpen ? '✕' : '☰'}</span></button>
          </div>
        </div>
        {mobileOpen && <div className="md:hidden border-t border-white/10 bg-school-600 px-4 py-3 space-y-1">{navLinks.map(l => <NavLink key={l.to} to={l.to} end={l.to === '/'} onClick={() => setMobileOpen(false)} className={({ isActive }) => `block px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>{l.icon} {l.label}</NavLink>)}<div className="pt-3 border-t border-white/10 mt-3"><p className="text-sm text-white/60 px-3 mb-2">{coachData?.name}</p><button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10">Logout</button></div></div>}
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8"><Outlet /></main>
      <footer className="bg-school-900 text-white/60 text-center text-xs py-4">CoachTrack &copy; {new Date().getFullYear()}</footer>
    </div>
  );
}
